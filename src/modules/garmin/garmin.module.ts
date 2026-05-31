import { Module } from '@nestjs/common';
import { GarminAdapter } from './garmin.adapter';
import { GarminController } from './garmin.controller';
import { GarminService } from './garmin.service';

@Module({ controllers: [GarminController], providers: [GarminService, GarminAdapter] })
export class GarminModule {}
