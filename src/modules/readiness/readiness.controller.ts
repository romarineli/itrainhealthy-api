import { Controller, Get } from '@nestjs/common';
import { ReadinessService } from './readiness.service';

@Controller('api/readiness')
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get('today')
  getToday() {
    return this.readinessService.getToday();
  }
}
