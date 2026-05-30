import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  getCurrentUser() {
    return { id: 'demo-user', email: 'demo@itrainhealthy.local', name: 'Demo User' };
  }
}
