import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authModule } from './modules/auth/index.js';
import { consentsModule } from './modules/consents/index.js';
import { garminModule } from './modules/garmin/index.js';
import { profileModule } from './modules/profile/index.js';
import { readinessModule } from './modules/readiness/index.js';
import { usersModule } from './modules/users/index.js';
import { whatsappModule } from './modules/whatsapp/index.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'itrainhealthy-api' });
  });

  const modules = [authModule, usersModule, profileModule, consentsModule, garminModule, whatsappModule, readinessModule];
  for (const module of modules) {
    app.use(module.basePath, module.router);
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}
