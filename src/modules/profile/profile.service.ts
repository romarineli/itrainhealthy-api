import { Injectable } from '@nestjs/common';

@Injectable()
export class ProfileService {
  getCurrentProfile() {
    return { userId: 'demo-user', timezone: 'America/Sao_Paulo' };
  }
}
