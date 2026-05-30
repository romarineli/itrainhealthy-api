import { Injectable } from '@nestjs/common';
import { StubGarminAdapter } from './garmin.adapter';

@Injectable()
export class GarminService {
  constructor(private readonly garminAdapter: StubGarminAdapter) {}

  getStatus(userId: string) {
    return this.garminAdapter.getConnectionStatus(userId);
  }

  async getConnectUrl(userId: string) {
    return { authorizationUrl: await this.garminAdapter.getAuthorizationUrl(userId), implemented: false };
  }
}
