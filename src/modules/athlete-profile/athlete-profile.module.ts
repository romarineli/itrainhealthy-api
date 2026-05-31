import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AthleteProfileController } from './athlete-profile.controller';
import { AthleteProfileService } from './athlete-profile.service';

@Module({ imports: [AuthModule], controllers: [AthleteProfileController], providers: [AthleteProfileService] })
export class AthleteProfileModule {}
