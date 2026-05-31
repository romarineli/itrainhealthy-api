import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GarminMetricKindDto, GarminNormalizedMetricInput } from './garmin.dto';

export interface GarminTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  tokenType?: string;
  externalUserId?: string;
}

export interface GarminAuthorizationRequest {
  authorizationUrl: string;
  state: string;
  configured: boolean;
}

export interface GarminSyncWindow {
  from: Date;
  to: Date;
  metrics: GarminMetricKindDto[];
}

interface GarminEndpointCandidate {
  metric: GarminMetricKindDto;
  path: string;
}

interface GarminFetchAttempt {
  path: string;
  status: number;
  ok: boolean;
  message?: string;
  records: number;
}

export interface GarminFetchResult {
  metrics: GarminNormalizedMetricInput[];
  attempts: GarminFetchAttempt[];
}

@Injectable()
export class GarminAdapter {
  private readonly logger = new Logger(GarminAdapter.name);
  private readonly baseUrl: string;
  private readonly authorizationUrl: string;
  private readonly tokenUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('GARMIN_API_BASE_URL') ?? 'https://apis.garmin.com';
    this.authorizationUrl = this.config.get<string>('GARMIN_AUTHORIZATION_URL') ?? 'https://connect.garmin.com/oauth2Confirm';
    this.tokenUrl = this.config.get<string>('GARMIN_TOKEN_URL') ?? 'https://connectapi.garmin.com/di-oauth2-service/oauth/token';
    this.clientId = this.config.get<string>('GARMIN_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('GARMIN_CLIENT_SECRET') ?? '';
    this.redirectUri = this.resolveRedirectUri();
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri && this.authorizationUrl && this.tokenUrl && this.baseUrl);
  }

  buildAuthorizationRequest(state: string, codeChallenge: string): GarminAuthorizationRequest {
    const url = new URL(this.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: url.toString(), state, configured: this.isConfigured() };
  }

  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<GarminTokenSet> {
    this.assertConfigured();
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    return this.requestToken(payload, 'token_exchange');
  }

  async refreshAccessToken(refreshToken: string): Promise<GarminTokenSet> {
    this.assertConfigured();
    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    return this.requestToken(payload, 'token_refresh');
  }

  async revokeToken(_accessToken: string): Promise<void> {
    // Garmin endpoint/contract must be confirmed in the approved app portal.
    // Keep this as a safe no-op foundation instead of sending tokens to an unverified URL.
    this.logger.log('Garmin remote revoke skipped: provider endpoint pending confirmation.');
  }

  async fetchNormalizedMetrics(accessToken: string, window: GarminSyncWindow): Promise<GarminFetchResult> {
    this.assertConfigured();
    const endpoints = this.resolveEndpointCandidates(window.metrics);
    const attempts: GarminFetchAttempt[] = [];
    const normalized: GarminNormalizedMetricInput[] = [];

    for (const endpoint of endpoints) {
      const result = await this.fetchEndpoint(accessToken, endpoint, window);
      attempts.push(result.attempt);
      normalized.push(...result.metrics);
    }

    const okAttempts = attempts.filter((attempt) => attempt.ok);
    if (okAttempts.length === 0 && attempts.length > 0) {
      const statuses = attempts.map((attempt) => `${attempt.path}:${attempt.status}`).join(', ');
      throw new Error(
        `Garmin Wellness pull did not return enabled endpoints (${statuses}). Confirm Health/Activity API permissions, summary types and whether this app requires webhook/backfill enablement in Garmin portal.`,
      );
    }

    return { metrics: normalized, attempts };
  }

  private async fetchEndpoint(accessToken: string, endpoint: GarminEndpointCandidate, window: GarminSyncWindow) {
    const url = new URL(endpoint.path, this.baseUrl.replace(/\/$/, '') + '/');
    const startSeconds = Math.floor(window.from.getTime() / 1000).toString();
    const endSeconds = Math.floor(window.to.getTime() / 1000).toString();
    // Garmin Health API summary pulls/backfills commonly use upload time windows. Keep a small, explicit set of params
    // and store provider response raw for later mapping refinement when the approved portal exposes exact contracts.
    url.searchParams.set('uploadStartTimeInSeconds', startSeconds);
    url.searchParams.set('uploadEndTimeInSeconds', endSeconds);

    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json', authorization: `Bearer ${accessToken}` },
      });
      const contentType = response.headers.get('content-type') ?? '';
      const body = contentType.includes('application/json') ? ((await response.json()) as unknown) : await response.text();

      if (!response.ok) {
        const message = typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200);
        this.logger.warn(`Garmin sync endpoint ${endpoint.path} failed with status ${response.status}: ${message}`);
        return { attempt: { path: endpoint.path, status: response.status, ok: false, message, records: 0 }, metrics: [] };
      }

      const records = this.extractRecords(body);
      return {
        attempt: { path: endpoint.path, status: response.status, ok: true, records: records.length },
        metrics: records.map((record, index) => this.normalizeRecord(endpoint.metric, record, index, window)),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Garmin fetch error';
      this.logger.warn(`Garmin sync endpoint ${endpoint.path} request failed: ${message}`);
      return { attempt: { path: endpoint.path, status: 0, ok: false, message, records: 0 }, metrics: [] };
    }
  }

  private resolveEndpointCandidates(metrics: GarminMetricKindDto[]): GarminEndpointCandidate[] {
    const configured = this.config.get<string>('GARMIN_SYNC_ENDPOINTS');
    if (configured) {
      return configured
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [metric, configuredPath] = entry.split(':');
          return { metric: this.toMetricKind(metric), path: configuredPath || metric || '/wellness-api/rest/activities' };
        });
    }

    const defaults: GarminEndpointCandidate[] = [
      { metric: GarminMetricKindDto.ACTIVITY, path: '/wellness-api/rest/activities' },
      { metric: GarminMetricKindDto.ACTIVITY, path: '/wellness-api/rest/activityDetails' },
      { metric: GarminMetricKindDto.SLEEP, path: '/wellness-api/rest/sleeps' },
      { metric: GarminMetricKindDto.HRV, path: '/wellness-api/rest/hrv' },
      { metric: GarminMetricKindDto.VO2_MAX, path: '/wellness-api/rest/userMetrics' },
      { metric: GarminMetricKindDto.TRAINING_LOAD, path: '/wellness-api/rest/trainingLoad' },
    ];

    const wanted = new Set(metrics);
    return defaults.filter((endpoint) => wanted.has(endpoint.metric));
  }

  private toMetricKind(value: string | undefined): GarminMetricKindDto {
    if (value && Object.values(GarminMetricKindDto).includes(value as GarminMetricKindDto)) {
      return value as GarminMetricKindDto;
    }
    return GarminMetricKindDto.ACTIVITY;
  }

  private extractRecords(body: unknown): Record<string, unknown>[] {
    if (Array.isArray(body)) {
      return body.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
    }
    if (body && typeof body === 'object') {
      const objectBody = body as Record<string, unknown>;
      for (const key of ['activities', 'activityDetails', 'dailies', 'dailySummaries', 'sleeps', 'hrv', 'userMetrics', 'trainingLoad', 'summaries']) {
        const value = objectBody[key];
        if (Array.isArray(value)) {
          return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
        }
      }
      return [objectBody];
    }
    return [];
  }

  private normalizeRecord(metric: GarminMetricKindDto, record: Record<string, unknown>, index: number, window: GarminSyncWindow): GarminNormalizedMetricInput {
    const startAt = this.parseDate(record.startTimeInSeconds ?? record.startTimeOffsetInSeconds ?? record.startTimeLocal ?? record.startTimeGmt);
    const measuredAt =
      this.parseDate(record.summaryDate ?? record.calendarDate ?? record.startTimeInSeconds ?? record.uploadStartTimeInSeconds ?? record.startTimeLocal ?? record.startTimeGmt) ??
      startAt ??
      window.to;
    const endAt = this.parseDate(record.endTimeInSeconds ?? record.endTimeLocal) ?? undefined;
    const value = this.extractPrimaryValue(metric, record);
    const sourceId = this.extractSourceId(record) ?? `${metric}-${measuredAt.toISOString()}-${index}`;

    return {
      type: metric,
      sourceId,
      measuredAt,
      startAt: startAt ?? undefined,
      endAt,
      value,
      unit: this.extractUnit(metric),
      summary: this.pickSummary(record),
      raw: record,
    };
  }

  private parseDate(value: unknown): Date | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value * 1000);
    }
    if (typeof value === 'string' && value.trim()) {
      if (/^\d+$/.test(value)) {
        return new Date(Number(value) * 1000);
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private extractSourceId(record: Record<string, unknown>): string | undefined {
    for (const key of ['summaryId', 'activityId', 'activityUuid', 'samplePk', 'uuid', 'id']) {
      const value = record[key];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }
    return undefined;
  }

  private extractPrimaryValue(metric: GarminMetricKindDto, record: Record<string, unknown>): number | undefined {
    const keysByMetric: Record<GarminMetricKindDto, string[]> = {
      [GarminMetricKindDto.HRV]: ['lastNightAvg', 'weeklyAvg', 'hrvValue', 'value'],
      [GarminMetricKindDto.SLEEP]: ['durationInSeconds', 'sleepTimeSeconds', 'totalSleepSeconds'],
      [GarminMetricKindDto.VO2_MAX]: ['vo2Max', 'genericVo2Max', 'cyclingVo2Max', 'runningVo2Max'],
      [GarminMetricKindDto.ACTIVITY]: ['durationInSeconds', 'steps', 'distanceInMeters', 'activeKilocalories'],
      [GarminMetricKindDto.TRAINING_LOAD]: ['trainingLoad', 'acuteTrainingLoad', 'load'],
    };
    for (const key of keysByMetric[metric]) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  }

  private extractUnit(metric: GarminMetricKindDto): string | undefined {
    const units: Record<GarminMetricKindDto, string | undefined> = {
      [GarminMetricKindDto.HRV]: 'ms',
      [GarminMetricKindDto.SLEEP]: 'seconds',
      [GarminMetricKindDto.VO2_MAX]: 'ml/kg/min',
      [GarminMetricKindDto.ACTIVITY]: undefined,
      [GarminMetricKindDto.TRAINING_LOAD]: undefined,
    };
    return units[metric];
  }

  private pickSummary(record: Record<string, unknown>): Record<string, unknown> {
    return {
      summaryId: this.extractSourceId(record),
      startTime: record.startTimeLocal ?? record.startTimeGmt ?? record.startTimeInSeconds,
      durationInSeconds: record.durationInSeconds,
      steps: record.steps,
      distanceInMeters: record.distanceInMeters,
      activeKilocalories: record.activeKilocalories,
      averageHeartRateInBeatsPerMinute: record.averageHeartRateInBeatsPerMinute,
      maxHeartRateInBeatsPerMinute: record.maxHeartRateInBeatsPerMinute,
      vo2Max: record.vo2Max ?? record.genericVo2Max ?? record.runningVo2Max ?? record.cyclingVo2Max,
      trainingLoad: record.trainingLoad ?? record.acuteTrainingLoad,
    };
  }

  private async requestToken(payload: URLSearchParams, operation: string): Promise<GarminTokenSet> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: payload,
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(`Garmin ${operation} failed with status ${response.status}: ${body.slice(0, 200)}`);
      throw new Error(`Garmin ${operation} failed.`);
    }

    const data = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      token_type?: string;
      user_id?: string;
    };

    if (!data.access_token) {
      throw new Error(`Garmin ${operation} response did not include access_token.`);
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scope: data.scope,
      tokenType: data.token_type,
      externalUserId: data.user_id,
    };
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new Error('Garmin OAuth is not configured. Set GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET, GARMIN_REDIRECT_URI, GARMIN_AUTHORIZATION_URL and GARMIN_TOKEN_URL.');
    }
  }

  private resolveRedirectUri(): string {
    const explicitRedirectUri = this.config.get<string>('GARMIN_REDIRECT_URI');
    if (explicitRedirectUri) {
      return explicitRedirectUri;
    }

    const apiUrl = this.config.get<string>('API_URL') ?? this.config.get<string>('APP_URL');
    return apiUrl ? `${apiUrl.replace(/\/$/, '')}/api/garmin/callback` : '';
  }
}
