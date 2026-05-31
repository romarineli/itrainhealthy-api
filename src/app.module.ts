import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AthleteProfileModule } from './modules/athlete-profile/athlete-profile.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { GarminModule } from './modules/garmin/garmin.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ReadinessModule } from './modules/readiness/readiness.module';
import { UsersModule } from './modules/users/users.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { env } from './config/env';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => env] }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AthleteProfileModule,
    UsersModule,
    ProfileModule,
    ConsentsModule,
    GarminModule,
    WhatsappModule,
    ReadinessModule,
  ],
})
export class AppModule {}
