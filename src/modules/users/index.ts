import { Router } from 'express';
import type { ApiModule } from '../../shared/http/types.js';

const router = Router();

router.get('/me', (_req, res) => {
  res.json({ id: 'demo-user', email: 'demo@itrainhealthy.local', name: 'Demo User' });
});

export const usersModule: ApiModule = { basePath: '/api/users', router };
