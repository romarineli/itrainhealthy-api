import { Controller, Get } from '@nestjs/common';
import { GarminService } from './garmin.service';

@Controller('api/garmin')
export class GarminController {
  constructor(private readonly garminService: GarminService) {}

  @Get('status')
  getStatus() {
    return this.garminService.getStatus('demo-user');
  }

  @Get('connect')
  getConnectUrl() {
    return this.garminService.getConnectUrl('demo-user');
  }
}
