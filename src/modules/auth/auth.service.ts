import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getStatus() {
    return { authenticated: false, strategy: 'stub' };
  }
}
