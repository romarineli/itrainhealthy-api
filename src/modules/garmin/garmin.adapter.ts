import { Injectable } from '@nestjs/common';

export interface GarminConnectionStatus {
  provider: 'garmin';
  connected: boolean;
  status: 'stub' | 'connected' | 'error';
}

export interface GarminAdapter {
  getConnectionStatus(userId: string): Promise<GarminConnectionStatus>;
  getAuthorizationUrl(userId: string): Promise<string>;
}

@Injectable()
export class StubGarminAdapter implements GarminAdapter {
  async getConnectionStatus(_userId: string): Promise<GarminConnectionStatus> {
    return { provider: 'garmin', connected: false, status: 'stub' };
  }

  async getAuthorizationUrl(_userId: string): Promise<string> {
    return '/api/garmin/connect/not-implemented';
  }
}
