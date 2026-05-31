import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GarminAdapter } from './garmin.adapter';
import { GarminController } from './garmin.controller';
import { GarminService } from './garmin.service';

@Module({ imports: [AuthModule], controllers: [GarminController], providers: [GarminService, GarminAdapter] })
export class GarminModule {}
