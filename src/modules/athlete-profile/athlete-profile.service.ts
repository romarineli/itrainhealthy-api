import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AthleteProfile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertAthleteProfileDto } from './athlete-profile.dto';

@Injectable()
export class AthleteProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userUuid: string) {
    const user = await this.getUser(userUuid);
    const profile = await this.prisma.athleteProfile.findUnique({ where: { userId: user.id } });
    return profile ? this.toPublicProfile(profile) : null;
  }

  async upsertMe(userUuid: string, dto: UpsertAthleteProfileDto) {
    const user = await this.getUser(userUuid);
    const data = this.toPrismaData(dto);
    const profile = await this.prisma.athleteProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
    return this.toPublicProfile(profile);
  }

  private async getUser(userUuid: string) {
    const user = await this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true, uuid: true } });
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found.');
    }
    return user;
  }

  private toPrismaData(dto: UpsertAthleteProfileDto) {
    return {
      ...(dto.displayName !== undefined ? { displayName: this.cleanString(dto.displayName) } : {}),
      ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null } : {}),
      ...(dto.gender !== undefined ? { gender: this.cleanString(dto.gender) } : {}),
      ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}),
      ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
      ...(dto.primarySport !== undefined ? { primarySport: this.cleanString(dto.primarySport) } : {}),
      ...(dto.trainingGoal !== undefined ? { trainingGoal: this.cleanString(dto.trainingGoal) } : {}),
      ...(dto.experienceLevel !== undefined ? { experienceLevel: this.cleanString(dto.experienceLevel) } : {}),
      ...(dto.weeklyTrainingDays !== undefined ? { weeklyTrainingDays: dto.weeklyTrainingDays } : {}),
      ...(dto.timezone !== undefined ? { timezone: this.cleanString(dto.timezone) ?? 'America/Sao_Paulo' } : {}),
    };
  }

  private cleanString(value?: string): string | null {
    const clean = value?.trim();
    return clean ? clean : null;
  }

  private toPublicProfile(profile: AthleteProfile) {
    return {
      id: profile.uuid,
      displayName: profile.displayName,
      birthDate: profile.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
      gender: profile.gender,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      primarySport: profile.primarySport,
      trainingGoal: profile.trainingGoal,
      experienceLevel: profile.experienceLevel,
      weeklyTrainingDays: profile.weeklyTrainingDays,
      timezone: profile.timezone,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
