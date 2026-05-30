import { Module } from '@nestjs/common';
import { GarminController } from './garmin.controller';
import { StubGarminAdapter } from './garmin.adapter';
import { GarminService } from './garmin.service';

@Module({ controllers: [GarminController], providers: [GarminService, StubGarminAdapter] })
export class GarminModule {}
