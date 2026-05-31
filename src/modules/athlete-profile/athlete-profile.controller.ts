import { Body, Controller, Get, Patch, Put, Req, UseGuards } from '@nestjs/common';
import { RequestWithUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertAthleteProfileDto } from './athlete-profile.dto';
import { AthleteProfileService } from './athlete-profile.service';

@Controller('api/athlete-profile')
@UseGuards(JwtAuthGuard)
export class AthleteProfileController {
  constructor(private readonly athleteProfileService: AthleteProfileService) {}

  @Get('me')
  getMe(@Req() request: RequestWithUser) {
    return this.athleteProfileService.getMe(request.user!.id);
  }

  @Put('me')
  putMe(@Req() request: RequestWithUser, @Body() dto: UpsertAthleteProfileDto) {
    return this.athleteProfileService.upsertMe(request.user!.id, dto);
  }

  @Patch('me')
  patchMe(@Req() request: RequestWithUser, @Body() dto: UpsertAthleteProfileDto) {
    return this.athleteProfileService.upsertMe(request.user!.id, dto);
  }
}
