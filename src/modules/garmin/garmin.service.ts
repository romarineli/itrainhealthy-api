import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { GarminAdapter } from './garmin.adapter';
import { decryptSecret, encryptSecret } from './garmin.crypto';
import { GarminConnectionStatusDto, GarminManualSyncDto, GarminMetricKindDto } from './garmin.dto';
import { PrismaService } from '../../prisma/prisma.service';

const GARMIN_PROVIDER = 'garmin';
const DEFAULT_SYNC_DAYS = 90;

interface GarminStatePayload {
  userId: string; // public User.uuid
  nonce: string;
  exp: number;
  codeVerifierEncrypted: string;
}

interface GarminUserRef {
  id: number;
  uuid: string;
}

@Injectable()
export class GarminService {
  private readonly logger = new Logger(GarminService.name);
  private readonly stateSecret: string;
  private readonly tokenSecret: string;

  constructor(
    private readonly garminAdapter: GarminAdapter,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stateSecret = this.config.get<string>('GARMIN_STATE_SECRET') || this.config.get<string>('GARMIN_CLIENT_SECRET') || 'dev-state-secret-change-me';
    this.tokenSecret = this.config.get<string>('GARMIN_TOKEN_ENCRYPTION_KEY') || '';
  }

  async startAuthorization(userId: string) {
    this.assertUserId(userId);
    const user = await this.ensureTemporaryUserForMvp(userId);
    const codeVerifier = this.generatePkceCodeVerifier();
    const codeChallenge = this.generatePkceCodeChallenge(codeVerifier);
    const state = this.signState({
      userId: user.uuid,
      nonce: randomBytes(16).toString('base64url'),
      exp: Date.now() + 10 * 60 * 1000,
      codeVerifierEncrypted: encryptSecret(codeVerifier, this.stateSecret),
    });
    const request = this.garminAdapter.buildAuthorizationRequest(state, codeChallenge);

    await this.prisma.garminConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: GARMIN_PROVIDER } },
      create: { userId: user.id, provider: GARMIN_PROVIDER, status: request.configured ? 'CONNECTING' : 'ERROR' },
      update: { status: request.configured ? 'CONNECTING' : 'ERROR', lastError: request.configured ? null : 'Garmin OAuth is not configured.' },
    });

    return {
      provider: GARMIN_PROVIDER,
      authorizationUrl: request.authorizationUrl,
      configured: request.configured,
      state,
      expiresInSeconds: 600,
      note: 'MVP flow: authenticated JWT subject is preferred; userId query/header remains as temporary fallback.',
    };
  }

  async handleCallback(code: string | undefined, state: string | undefined) {
    if (!code || !state) {
      throw new BadRequestException('Garmin callback requires code and state.');
    }

    const payload = this.verifyState(state);
    const user = await this.ensureTemporaryUserForMvp(payload.userId);
    const codeVerifier = decryptSecret(payload.codeVerifierEncrypted, this.stateSecret);
    const tokenSet = await this.garminAdapter.exchangeCodeForToken(code, codeVerifier);
    const encryptedAccessToken = this.encryptToken(tokenSet.accessToken);
    const encryptedRefreshToken = tokenSet.refreshToken ? this.encryptToken(tokenSet.refreshToken) : null;

    const connection = await this.prisma.garminConnection.upsert({
      where: { userId_provider: { userId: user.id, provider: GARMIN_PROVIDER } },
      create: {
        userId: user.id,
        provider: GARMIN_PROVIDER,
        status: 'CONNECTED',
        externalUserId: tokenSet.externalUserId,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokenSet.expiresAt,
        scopes: tokenSet.scope ? tokenSet.scope.split(' ') : [],
        connectedAt: new Date(),
        lastError: null,
      },
      update: {
        status: 'CONNECTED',
        externalUserId: tokenSet.externalUserId,
        accessTokenEncrypted: encryptedAccessToken,
        refreshTokenEncrypted: encryptedRefreshToken,
        tokenExpiresAt: tokenSet.expiresAt,
        scopes: tokenSet.scope ? tokenSet.scope.split(' ') : [],
        connectedAt: new Date(),
        lastError: null,
      },
    });

    this.logger.log(`Garmin connected for user ${user.uuid}.`);
    return this.toStatus(connection);
  }

  async getStatus(userId: string): Promise<GarminConnectionStatusDto> {
    this.assertUserId(userId);
    const user = await this.ensureTemporaryUserForMvp(userId);
    const connection = await this.prisma.garminConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: GARMIN_PROVIDER } } });
    if (!connection) {
      return { provider: GARMIN_PROVIDER, connected: false, status: this.garminAdapter.isConfigured() ? 'disconnected' : 'needs_configuration' };
    }
    return this.toStatusWithRecentMetrics(connection);
  }

  async disconnect(userId: string, revokeRemote = false) {
    this.assertUserId(userId);
    const user = await this.ensureTemporaryUserForMvp(userId);
    const connection = await this.prisma.garminConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: GARMIN_PROVIDER } } });
    if (!connection) {
      return { provider: GARMIN_PROVIDER, disconnected: true };
    }

    if (revokeRemote && connection.accessTokenEncrypted) {
      const accessToken = this.decryptToken(connection.accessTokenEncrypted);
      await this.garminAdapter.revokeToken(accessToken);
    }

    await this.prisma.garminConnection.update({
      where: { id: connection.id },
      data: {
        status: 'DISCONNECTED',
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        lastError: null,
      },
    });

    return { provider: GARMIN_PROVIDER, disconnected: true, revokeRemoteAttempted: revokeRemote };
  }

  async sync(userId: string, dto: GarminManualSyncDto) {
    this.assertUserId(userId);
    const user = await this.ensureTemporaryUserForMvp(userId);
    const connection = await this.prisma.garminConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: GARMIN_PROVIDER } } });
    if (!connection || connection.status !== 'CONNECTED' || !connection.accessTokenEncrypted) {
      throw new NotFoundException('Garmin connection not found or not connected.');
    }

    const to = dto.to ? new Date(dto.to) : new Date();
    const from = dto.from ? new Date(dto.from) : new Date(to.getTime() - DEFAULT_SYNC_DAYS * 24 * 60 * 60 * 1000);
    if (from > to) {
      throw new BadRequestException('from must be before to.');
    }

    const metrics = dto.metrics?.length
      ? dto.metrics
      : [GarminMetricKindDto.HRV, GarminMetricKindDto.SLEEP, GarminMetricKindDto.VO2_MAX, GarminMetricKindDto.ACTIVITY, GarminMetricKindDto.TRAINING_LOAD];

    const syncLog = await this.prisma.garminSyncLog.create({
      data: { userId: user.id, connectionId: connection.id, status: 'RUNNING', startedAt: new Date(), from, to, metricsRequested: metrics },
    });

    try {
      const accessToken = await this.getUsableAccessToken(connection);
      const fetchResult = await this.garminAdapter.fetchNormalizedMetrics(accessToken, { from, to, metrics });
      const normalizedMetrics = fetchResult.metrics;

      if (normalizedMetrics.length > 0) {
        await this.prisma.garminMetric.createMany({
          data: normalizedMetrics.map((metric) => ({
            userId: user.id,
            connectionId: connection.id,
            type: metric.type,
            sourceId: metric.sourceId,
            measuredAt: metric.measuredAt,
            startAt: metric.startAt,
            endAt: metric.endAt,
            value: metric.value,
            unit: metric.unit,
            summary: (metric.summary ?? {}) as Prisma.InputJsonValue,
            raw: (metric.raw ?? {}) as Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        });
      }

      const finishedAt = new Date();
      const status = fetchResult.partialFailure ? 'PARTIAL_FAILURE' : 'SUCCESS';
      await this.prisma.garminSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: fetchResult.partialFailure ? 'ERROR' : 'SUCCESS',
          finishedAt,
          recordsImported: normalizedMetrics.length,
          errorMessage: fetchResult.partialFailure ? fetchResult.diagnostic : null,
        },
      });
      await this.prisma.garminConnection.update({
        where: { id: connection.id },
        data: { status: 'CONNECTED', lastSyncAt: fetchResult.partialFailure ? connection.lastSyncAt : finishedAt, lastError: fetchResult.partialFailure ? fetchResult.diagnostic : null },
      });

      return {
        provider: GARMIN_PROVIDER,
        status,
        recordsImported: normalizedMetrics.length,
        from,
        to,
        metrics,
        attempts: fetchResult.attempts,
        backfillRequested: fetchResult.backfillRequested ?? false,
        partialFailure: fetchResult.partialFailure ?? false,
        diagnostic: fetchResult.diagnostic,
        lastSyncAt: fetchResult.partialFailure ? connection.lastSyncAt : finishedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Garmin sync error';
      await this.prisma.garminSyncLog.update({ where: { id: syncLog.id }, data: { status: 'ERROR', finishedAt: new Date(), errorMessage: message } });
      await this.prisma.garminConnection.update({ where: { id: connection.id }, data: { status: 'CONNECTED', lastError: message } });
      throw error;
    }
  }

  async debugUserPermissions(userId: string) {
    if (this.config.get<string>('GARMIN_DEBUG_ENABLED') !== 'true') {
      throw new ForbiddenException('Garmin debug endpoints are disabled. Set GARMIN_DEBUG_ENABLED=true only in controlled dev/hml environments.');
    }

    this.assertUserId(userId);
    const user = await this.ensureTemporaryUserForMvp(userId);
    const connection = await this.prisma.garminConnection.findUnique({ where: { userId_provider: { userId: user.id, provider: GARMIN_PROVIDER } } });
    if (!connection || connection.status !== 'CONNECTED' || !connection.accessTokenEncrypted) {
      throw new NotFoundException('Garmin connection not found or not connected.');
    }

    const accessToken = await this.getUsableAccessToken(connection);
    const result = await this.garminAdapter.fetchUserPermissions(accessToken);

    return {
      provider: GARMIN_PROVIDER,
      endpoint: '/user/permissions',
      baseUrl: this.config.get<string>('GARMIN_API_BASE_URL') ?? 'https://apis.garmin.com/wellness-api/rest',
      connected: true,
      tokenExpiresAt: connection.tokenExpiresAt,
      status: result.status,
      ok: result.ok,
      statusText: result.statusText,
      body: result.body,
      note: 'Debug response is sanitized; Garmin access token is decrypted only in memory and is never returned.',
    };
  }

  async handleWebhook(summaryType: string | undefined, payload: unknown, providedSecret?: string) {
    const expectedSecret = this.config.get<string>('GARMIN_WEBHOOK_SECRET');
    if (expectedSecret && providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid Garmin webhook secret.');
    }

    const metricType = this.toMetricKind(summaryType);
    const records = this.extractWebhookRecords(payload);
    let imported = 0;
    let unmatched = 0;

    for (const record of records) {
      const externalUserId = this.extractExternalUserId(record);
      if (!externalUserId) {
        unmatched += 1;
        continue;
      }
      const connection = await this.prisma.garminConnection.findFirst({ where: { externalUserId, provider: GARMIN_PROVIDER } });
      if (!connection) {
        unmatched += 1;
        continue;
      }
      const normalized = this.garminAdapter.normalizeWebhookRecords(metricType, [record]);
      if (normalized.length === 0) {
        continue;
      }
      await this.prisma.garminMetric.createMany({
        data: normalized.map((metric) => ({
          userId: connection.userId,
          connectionId: connection.id,
          type: metric.type,
          sourceId: metric.sourceId,
          measuredAt: metric.measuredAt,
          startAt: metric.startAt,
          endAt: metric.endAt,
          value: metric.value,
          unit: metric.unit,
          summary: (metric.summary ?? {}) as Prisma.InputJsonValue,
          raw: (metric.raw ?? {}) as Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
      imported += normalized.length;
      await this.prisma.garminConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date(), lastError: null } });
    }

    return { provider: GARMIN_PROVIDER, received: records.length, imported, unmatched, summaryType: metricType };
  }

  private async getUsableAccessToken(connection: { id: number; accessTokenEncrypted: string | null; refreshTokenEncrypted: string | null; tokenExpiresAt: Date | null }) {
    if (!connection.accessTokenEncrypted) {
      throw new UnauthorizedException('Garmin access token missing.');
    }

    if (!connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() > Date.now() + 60_000 || !connection.refreshTokenEncrypted) {
      return this.decryptToken(connection.accessTokenEncrypted);
    }

    const refreshed = await this.garminAdapter.refreshAccessToken(this.decryptToken(connection.refreshTokenEncrypted));
    await this.prisma.garminConnection.update({
      where: { id: connection.id },
      data: {
        accessTokenEncrypted: this.encryptToken(refreshed.accessToken),
        refreshTokenEncrypted: refreshed.refreshToken ? this.encryptToken(refreshed.refreshToken) : connection.refreshTokenEncrypted,
        tokenExpiresAt: refreshed.expiresAt,
        status: 'CONNECTED',
        lastError: null,
      },
    });

    return refreshed.accessToken;
  }

  private async toStatusWithRecentMetrics(connection: { id: number; status: string; externalUserId: string | null; scopes: string[]; connectedAt: Date | null; lastSyncAt: Date | null; lastError: string | null }): Promise<GarminConnectionStatusDto> {
    const metrics = await this.prisma.garminMetric.findMany({
      where: { connectionId: connection.id },
      orderBy: { measuredAt: 'desc' },
      take: 5,
    });
    return { ...this.toStatus(connection), recentMetrics: metrics.map((metric) => ({
      id: metric.uuid,
      type: metric.type,
      sourceId: metric.sourceId,
      measuredAt: metric.measuredAt,
      value: metric.value,
      unit: metric.unit,
      summary: metric.summary as Record<string, unknown> | null,
    })) };
  }

  private toStatus(connection: { status: string; externalUserId: string | null; scopes: string[]; connectedAt: Date | null; lastSyncAt: Date | null; lastError?: string | null }): GarminConnectionStatusDto {
    return {
      provider: GARMIN_PROVIDER,
      connected: connection.status === 'CONNECTED',
      status: connection.status === 'CONNECTED' ? 'connected' : connection.status === 'ERROR' ? 'error' : 'disconnected',
      externalUserId: connection.externalUserId,
      scopes: connection.scopes,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      lastError: connection.lastError,
    };
  }

  private encryptToken(token: string): string {
    const secret = this.getTokenSecret();
    return encryptSecret(token, secret);
  }

  private decryptToken(token: string): string {
    const secret = this.getTokenSecret();
    return decryptSecret(token, secret);
  }

  private getTokenSecret(): string {
    if (this.tokenSecret) {
      return this.tokenSecret;
    }
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new Error('GARMIN_TOKEN_ENCRYPTION_KEY is required in production.');
    }
    return 'local-dev-only-garmin-token-key-change-me';
  }

  private generatePkceCodeVerifier(): string {
    return randomBytes(64).toString('base64url');
  }

  private generatePkceCodeChallenge(codeVerifier: string): string {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  private signState(payload: GarminStatePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  private verifyState(state: string): GarminStatePayload {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new BadRequestException('Invalid Garmin state.');
    }

    const expected = createHmac('sha256', this.stateSecret).update(encodedPayload).digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      throw new BadRequestException('Invalid Garmin state signature.');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as GarminStatePayload;
    if (!payload.userId || !payload.codeVerifierEncrypted || payload.exp < Date.now()) {
      throw new BadRequestException('Expired Garmin state.');
    }

    return payload;
  }

  private extractWebhookRecords(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
      return payload.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
    }
    if (payload && typeof payload === 'object') {
      const body = payload as Record<string, unknown>;
      for (const key of ['activities', 'activityDetails', 'dailies', 'dailySummaries', 'sleeps', 'userMetrics', 'hrv', 'summaries']) {
        const value = body[key];
        if (Array.isArray(value)) {
          return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
        }
      }
      return [body];
    }
    return [];
  }

  private extractExternalUserId(record: Record<string, unknown>): string | null {
    for (const key of ['userId', 'userAccessToken', 'garminUserId']) {
      const value = record[key];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }
    return null;
  }

  private toMetricKind(summaryType: string | undefined): GarminMetricKindDto {
    const normalized = summaryType?.toLowerCase() ?? '';
    if (normalized.includes('sleep')) {
      return GarminMetricKindDto.SLEEP;
    }
    if (normalized.includes('hrv')) {
      return GarminMetricKindDto.HRV;
    }
    if (normalized.includes('metric') || normalized.includes('vo2')) {
      return GarminMetricKindDto.VO2_MAX;
    }
    if (normalized.includes('training')) {
      return GarminMetricKindDto.TRAINING_LOAD;
    }
    return GarminMetricKindDto.ACTIVITY;
  }

  private async ensureTemporaryUserForMvp(userId: string): Promise<GarminUserRef> {
    // TODO(auth): remove fallback creation when JWT becomes mandatory.
    const existing = await this.prisma.user.findUnique({ where: { uuid: userId }, select: { id: true, uuid: true } });
    if (existing) {
      return existing;
    }

    return this.prisma.user.upsert({
      where: { email: `${userId}@mvp.local` },
      create: { uuid: userId, email: `${userId}@mvp.local`, name: 'MVP temporary user' },
      update: {},
      select: { id: true, uuid: true },
    });
  }

  private assertUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('Authenticated JWT subject or temporary MVP userId is required.');
    }
  }
}
