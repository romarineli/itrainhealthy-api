import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertAthleteProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(80)
  @Max(260)
  heightCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(25)
  @Max(350)
  weightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  primarySport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  trainingGoal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  experienceLevel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(14)
  weeklyTrainingDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}
