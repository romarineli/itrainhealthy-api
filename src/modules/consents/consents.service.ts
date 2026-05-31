import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConsentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AcceptConsentDto } from './consents.dto';

const REQUIRED_CONSENTS: Array<{ type: ConsentType; version: string; label: string }> = [
  { type: ConsentType.TERMS_OF_USE, version: '2026-05-31', label: 'Termos de uso e política de privacidade MVP' },
];

@Injectable()
export class ConsentsService {
  constructor(private readonly prisma: PrismaService) {}

  async status(userUuid: string) {
    const user = await this.getUser(userUuid);
    const consents = await this.prisma.consent.findMany({
      where: { userId: user.id },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });

    const required = REQUIRED_CONSENTS.map((requiredConsent) => {
      const accepted = consents.find(
        (consent) => consent.type === requiredConsent.type && consent.version === requiredConsent.version && consent.accepted,
      );
      return { ...requiredConsent, accepted: Boolean(accepted), acceptedAt: accepted?.acceptedAt ?? null };
    });

    return { required, allAccepted: required.every((consent) => consent.accepted) };
  }

  async accept(userUuid: string, dto: AcceptConsentDto, ipAddress?: string, userAgent?: string) {
    const user = await this.getUser(userUuid);
    const accepted = dto.accepted ?? true;
    const consent = await this.prisma.consent.upsert({
      where: { userId_type_version: { userId: user.id, type: dto.type, version: dto.version } },
      create: {
        userId: user.id,
        type: dto.type,
        version: dto.version,
        accepted,
        acceptedAt: accepted ? new Date() : null,
        ipAddress,
        userAgent,
      },
      update: {
        accepted,
        acceptedAt: accepted ? new Date() : null,
        ipAddress,
        userAgent,
      },
    });

    return {
      uuid: consent.uuid,
      type: consent.type,
      version: consent.version,
      accepted: consent.accepted,
      acceptedAt: consent.acceptedAt,
    };
  }

  private async getUser(userUuid: string) {
    const user = await this.prisma.user.findUnique({ where: { uuid: userUuid }, select: { id: true, uuid: true } });
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found.');
    }
    return user;
  }
}
