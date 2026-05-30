import { Controller, Get } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller('api/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMe() {
    return this.profileService.getCurrentProfile();
  }
}
