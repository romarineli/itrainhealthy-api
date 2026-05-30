import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { StubWhatsappAdapter } from './whatsapp.adapter';
import { WhatsappService } from './whatsapp.service';

@Module({ controllers: [WhatsappController], providers: [WhatsappService, StubWhatsappAdapter] })
export class WhatsappModule {}
