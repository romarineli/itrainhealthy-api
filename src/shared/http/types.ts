import type { Router } from 'express';

export interface ApiModule {
  basePath: string;
  router: Router;
}
