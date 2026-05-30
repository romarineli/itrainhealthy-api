import { Router } from 'express';
import type { ApiModule } from '../../shared/http/types.js';

const router = Router();

router.get('/status', (_req, res) => {
  res.json({ provider: 'stub', enabled: false });
});

export const whatsappModule: ApiModule = { basePath: '/api/whatsapp', router };
