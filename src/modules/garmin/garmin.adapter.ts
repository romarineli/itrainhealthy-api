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

@Injectable()
export class GarminAdapter {
  private readonly logger = new Logger(GarminAdapter.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('GARMIN_API_BASE_URL') ?? 'https://apis.garmin.com';
    this.clientId = this.config.get<string>('GARMIN_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('GARMIN_CLIENT_SECRET') ?? '';
    this.redirectUri = this.config.get<string>('GARMIN_REDIRECT_URI') ?? '';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri && this.baseUrl);
  }

  buildAuthorizationRequest(state: string): GarminAuthorizationRequest {
    const url = new URL('/oauth/authorize', this.baseUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'read');

    return { authorizationUrl: url.toString(), state, configured: this.isConfigured() };
  }

  async exchangeCodeForToken(code: string): Promise<GarminTokenSet> {
    this.assertConfigured();
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
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

  async fetchNormalizedMetrics(_accessToken: string, window: GarminSyncWindow): Promise<GarminNormalizedMetricInput[]> {
    // TODO: Replace with Garmin Health API endpoints once credentials/app approval expose the exact contracts.
    // The MVP foundation intentionally does not invent medical diagnosis or unverified Garmin payload mapping.
    this.logger.log(
      `Garmin data fetch stub executed for ${window.metrics.join(',')} from ${window.from.toISOString()} to ${window.to.toISOString()}`,
    );
    return [];
  }

  private async requestToken(payload: URLSearchParams, operation: string): Promise<GarminTokenSet> {
    const tokenUrl = new URL('/oauth/token', this.baseUrl);
    const response = await fetch(tokenUrl, {
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
      throw new Error('Garmin OAuth is not configured. Set GARMIN_CLIENT_ID, GARMIN_CLIENT_SECRET and GARMIN_REDIRECT_URI.');
    }
  }
}
