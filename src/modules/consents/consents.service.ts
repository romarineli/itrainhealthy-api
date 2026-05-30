import { Injectable } from '@nestjs/common';

@Injectable()
export class ConsentsService {
  list() {
    return { items: [] };
  }
}
