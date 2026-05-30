import { Router } from 'express';
import type { ApiModule } from '../../shared/http/types.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ items: [] });
});

export const consentsModule: ApiModule = { basePath: '/api/consents', router };
