import { Controller, Get } from '@nestjs/common';
import { ConsentsService } from './consents.service';

@Controller('api/consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  list() {
    return this.consentsService.list();
  }
}
