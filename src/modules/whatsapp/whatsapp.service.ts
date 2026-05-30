import { Injectable } from '@nestjs/common';

@Injectable()
export class WhatsappService {
  getStatus() {
    return { provider: 'stub', enabled: false };
  }
}
