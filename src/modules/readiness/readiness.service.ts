import { Injectable } from '@nestjs/common';

@Injectable()
export class ReadinessService {
  getToday() {
    return { score: null, status: 'pending_garmin_connection', source: 'stub' };
  }
}
