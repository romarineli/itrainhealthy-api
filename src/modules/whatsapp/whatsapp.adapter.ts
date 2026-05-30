import { Injectable } from '@nestjs/common';

export interface WhatsappMessage {
  to: string;
  body: string;
}

export interface WhatsappAdapter {
  sendMessage(message: WhatsappMessage): Promise<{ queued: boolean; provider: string }>;
}

@Injectable()
export class StubWhatsappAdapter implements WhatsappAdapter {
  async sendMessage(_message: WhatsappMessage): Promise<{ queued: boolean; provider: string }> {
    return { queued: false, provider: 'stub' };
  }
}
