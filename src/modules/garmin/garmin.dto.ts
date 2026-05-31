import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export enum GarminMetricKindDto {
  HRV = 'HRV',
  SLEEP = 'SLEEP',
  VO2_MAX = 'VO2_MAX',
  ACTIVITY = 'ACTIVITY',
  TRAINING_LOAD = 'TRAINING_LOAD',
}

export class GarminTokenExchangeDto {
  @IsString()
  code!: string;

  @IsString()
  redirectUri!: string;
}

export class GarminRefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class GarminConnectionStatusDto {
  provider = 'garmin' as const;
  connected!: boolean;
  status!: 'disconnected' | 'connected' | 'error' | 'needs_configuration';
  externalUserId?: string | null;
  scopes?: string[];
  connectedAt?: Date | null;
  lastSyncAt?: Date | null;
  lastError?: string | null;
  recentMetrics?: GarminMetricSummaryDto[];
}

export class GarminMetricSummaryDto {
  id!: string;
  type!: string;
  sourceId?: string | null;
  measuredAt!: Date;
  value?: number | null;
  unit?: string | null;
  summary?: Record<string, unknown> | null;
}

export class GarminDisconnectDto {
  @IsOptional()
  @IsBoolean()
  revokeRemote?: boolean;
}

export class GarminManualSyncDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(GarminMetricKindDto, { each: true })
  metrics?: GarminMetricKindDto[];
}

export interface GarminNormalizedMetricInput {
  type: GarminMetricKindDto;
  sourceId?: string;
  measuredAt: Date;
  startAt?: Date;
  endAt?: Date;
  value?: number;
  unit?: string;
  summary?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}
