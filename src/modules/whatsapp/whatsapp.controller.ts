import { Controller, Get } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('api/whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }
}
