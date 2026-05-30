# iTrain Healthy API

Backend inicial do MVP v1 do iTrain Healthy: web + Garmin + WhatsApp.

## Stack

- Node.js 20+
- TypeScript
- NestJS
- Prisma
- PostgreSQL

## Setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Resposta esperada:

```json
{ "status": "ok", "service": "itrainhealthy-api" }
```

## Scripts

- `npm run dev` / `npm run start:dev` — servidor NestJS em modo watch
- `npm run build` — compila a aplicação NestJS para `dist/`
- `npm run start` — executa `dist/main.js`
- `npm run lint` — executa ESLint
- `npm run prisma:generate` — gera Prisma Client
- `npm run prisma:migrate` — cria/aplica migration local
- `npm run prisma:studio` — abre Prisma Studio

## Arquitetura inicial

```text
src/
  app.module.ts       # módulo raiz NestJS
  main.ts             # bootstrap HTTP, CORS, helmet e ValidationPipe
  config/             # env e configurações
  health/             # GET /health
  prisma/             # PrismaModule e PrismaService
  modules/            # módulos de domínio/API
    auth/
    users/
    profile/
    consents/
    garmin/
    whatsapp/
    readiness/
prisma/schema.prisma  # schema inicial PostgreSQL
```

## Endpoints iniciais

- `GET /health`
- `GET /api/auth/status`
- `GET /api/users/me`
- `GET /api/profile/me`
- `GET /api/consents`
- `GET /api/garmin/status`
- `GET /api/garmin/connect`
- `GET /api/whatsapp/status`
- `GET /api/readiness/today`

## Integrações externas

Garmin OAuth real e WhatsApp real ainda **não** estão implementados neste scaffold. Existem adapters stubs injetáveis via módulos NestJS para manter o contrato e permitir evolução segura.

Variáveis planejadas:

- `GARMIN_CLIENT_ID`
- `GARMIN_CLIENT_SECRET`
- `GARMIN_REDIRECT_URI`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

Não commitar `.env`, tokens ou segredos.
