import { Router } from 'express';
import type { ApiModule } from '../../shared/http/types.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ authenticated: false, strategy: 'stub' });
});

export const authModule: ApiModule = { basePath: '/api/auth', router };
