export interface WhatsAppMessage {
  to: string;
  body: string;
}

export interface WhatsAppAdapter {
  sendMessage(message: WhatsAppMessage): Promise<{ queued: boolean; provider: string }>;
}

export class StubWhatsAppAdapter implements WhatsAppAdapter {
  async sendMessage(_message: WhatsAppMessage): Promise<{ queued: boolean; provider: string }> {
    return { queued: false, provider: 'stub' };
  }
}
