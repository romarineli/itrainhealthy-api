import { BadRequestException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
  userId: string;
  nonce: string;
  exp: number;
  codeVerifierEncrypted: string;
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
    const codeVerifier = this.generatePkceCodeVerifier();
    const codeChallenge = this.generatePkceCodeChallenge(codeVerifier);
    const state = this.signState({
      userId,
      nonce: randomBytes(16).toString('base64url'),
      exp: Date.now() + 10 * 60 * 1000,
      codeVerifierEncrypted: encryptSecret(codeVerifier, this.stateSecret),
    });
    const request = this.garminAdapter.buildAuthorizationRequest(state, codeChallenge);
    await this.ensureTemporaryUserForMvp(userId);

    await this.prisma.garminConnection.upsert({
      where: { userId_provider: { userId, provider: GARMIN_PROVIDER } },
      create: { userId, provider: GARMIN_PROVIDER, status: request.configured ? 'CONNECTING' : 'ERROR' },
      update: { status: request.configured ? 'CONNECTING' : 'ERROR', lastError: request.configured ? null : 'Garmin OAuth is not configured.' },
    });

    return {
      provider: GARMIN_PROVIDER,
      authorizationUrl: request.authorizationUrl,
      configured: request.configured,
      state,
      expiresInSeconds: 600,
      note: 'Temporary MVP flow: pass userId via x-user-id header or userId query until real auth middleware is added.',
    };
  }

  async handleCallback(code: string | undefined, state: string | undefined) {
    if (!code || !state) {
      throw new BadRequestException('Garmin callback requires code and state.');
    }

    const payload = this.verifyState(state);
    const codeVerifier = decryptSecret(payload.codeVerifierEncrypted, this.stateSecret);
    const tokenSet = await this.garminAdapter.exchangeCodeForToken(code, codeVerifier);
    const encryptedAccessToken = this.encryptToken(tokenSet.accessToken);
    const encryptedRefreshToken = tokenSet.refreshToken ? this.encryptToken(tokenSet.refreshToken) : null;

    const connection = await this.prisma.garminConnection.upsert({
      where: { userId_provider: { userId: payload.userId, provider: GARMIN_PROVIDER } },
      create: {
        userId: payload.userId,
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

    this.logger.log(`Garmin connected for user ${payload.userId}.`);
    return this.toStatus(connection);
  }

  async getStatus(userId: string): Promise<GarminConnectionStatusDto> {
    this.assertUserId(userId);
    const connection = await this.prisma.garminConnection.findUnique({ where: { userId_provider: { userId, provider: GARMIN_PROVIDER } } });
    if (!connection) {
      return { provider: GARMIN_PROVIDER, connected: false, status: this.garminAdapter.isConfigured() ? 'disconnected' : 'needs_configuration' };
    }
    return this.toStatus(connection);
  }

  async disconnect(userId: string, revokeRemote = false) {
    this.assertUserId(userId);
    const connection = await this.prisma.garminConnection.findUnique({ where: { userId_provider: { userId, provider: GARMIN_PROVIDER } } });
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
    const connection = await this.prisma.garminConnection.findUnique({ where: { userId_provider: { userId, provider: GARMIN_PROVIDER } } });
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
      data: { userId, connectionId: connection.id, status: 'RUNNING', startedAt: new Date(), from, to, metricsRequested: metrics },
    });

    try {
      const accessToken = await this.getUsableAccessToken(connection);
      const normalizedMetrics = await this.garminAdapter.fetchNormalizedMetrics(accessToken, { from, to, metrics });

      if (normalizedMetrics.length > 0) {
        await this.prisma.garminMetric.createMany({
          data: normalizedMetrics.map((metric) => ({
            userId: metric.userId,
            connectionId: metric.connectionId,
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

      await this.prisma.garminSyncLog.update({
        where: { id: syncLog.id },
        data: { status: 'SUCCESS', finishedAt: new Date(), recordsImported: normalizedMetrics.length },
      });
      await this.prisma.garminConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date(), lastError: null } });

      return { provider: GARMIN_PROVIDER, status: 'SUCCESS', recordsImported: normalizedMetrics.length, from, to, metrics };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Garmin sync error';
      await this.prisma.garminSyncLog.update({ where: { id: syncLog.id }, data: { status: 'ERROR', finishedAt: new Date(), errorMessage: message } });
      await this.prisma.garminConnection.update({ where: { id: connection.id }, data: { status: 'ERROR', lastError: message } });
      throw error;
    }
  }

  private async getUsableAccessToken(connection: { id: string; accessTokenEncrypted: string | null; refreshTokenEncrypted: string | null; tokenExpiresAt: Date | null }) {
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

  private toStatus(connection: { status: string; externalUserId: string | null; scopes: string[]; connectedAt: Date | null; lastSyncAt: Date | null }): GarminConnectionStatusDto {
    return {
      provider: GARMIN_PROVIDER,
      connected: connection.status === 'CONNECTED',
      status: connection.status === 'CONNECTED' ? 'connected' : connection.status === 'ERROR' ? 'error' : 'disconnected',
      externalUserId: connection.externalUserId,
      scopes: connection.scopes,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
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

  private async ensureTemporaryUserForMvp(userId: string): Promise<void> {
    // TODO(auth): remove this helper when real signup/auth owns user creation.
    // The public MVP Garmin endpoint still receives a temporary userId, including in production demos.
    // Keep the bootstrap idempotent so the GarminConnection FK does not fail with a generic 500.
    await this.prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: `${userId}@mvp.local`, name: 'MVP temporary user' },
      update: {},
    });
  }

  private assertUserId(userId: string): void {
    if (!userId) {
      throw new BadRequestException('Temporary MVP userId is required via x-user-id header or userId query.');
    }
  }
}
