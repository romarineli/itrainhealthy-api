import { Router } from 'express';
import type { ApiModule } from '../../shared/http/types.js';

const router = Router();

router.get('/me', (_req, res) => {
  res.json({ userId: 'demo-user', timezone: 'America/Sao_Paulo' });
});

export const profileModule: ApiModule = { basePath: '/api/profile', router };
