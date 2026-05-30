import { Router } from 'express';
import type { ApiModule } from '../../shared/http/types.js';

const router = Router();

router.get('/today', (_req, res) => {
  res.json({ score: null, status: 'pending_garmin_connection', source: 'stub' });
});

export const readinessModule: ApiModule = { basePath: '/api/readiness', router };
