import { Router } from 'express';
import type { ApiModule } from '../../shared/http/types.js';
import { StubGarminAdapter } from './garmin.adapter.js';

const router = Router();
const garminAdapter = new StubGarminAdapter();

router.get('/status', async (_req, res, next) => {
  try {
    res.json(await garminAdapter.getConnectionStatus('demo-user'));
  } catch (error) {
    next(error);
  }
});

router.get('/connect', async (_req, res, next) => {
  try {
    res.json({ authorizationUrl: await garminAdapter.getAuthorizationUrl('demo-user'), implemented: false });
  } catch (error) {
    next(error);
  }
});

export const garminModule: ApiModule = { basePath: '/api/garmin', router };
