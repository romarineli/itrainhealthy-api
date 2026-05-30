# iTrain Healthy API

Backend inicial do MVP v1 do iTrain Healthy: web + Garmin + WhatsApp.

## Stack

- Node.js 20+
- TypeScript
- Express
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

## Scripts

- `npm run dev` — servidor em modo watch
- `npm run build` — compila TypeScript para `dist/`
- `npm run lint` — executa ESLint
- `npm run prisma:generate` — gera Prisma Client
- `npm run prisma:migrate` — cria/aplica migration local
- `npm run prisma:studio` — abre Prisma Studio

## Arquitetura inicial

```text
src/
  config/             # env e configurações
  modules/            # módulos de domínio/API
    auth/
    users/
    profile/
    consents/
    garmin/
    whatsapp/
    readiness/
  shared/             # HTTP, Prisma e utilitários compartilhados
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

Garmin OAuth real e WhatsApp real ainda **não** estão implementados neste scaffold. Existem interfaces/adapters stubs para manter o contrato e permitir evolução segura.

Variáveis planejadas:

- `GARMIN_CLIENT_ID`
- `GARMIN_CLIENT_SECRET`
- `GARMIN_REDIRECT_URI`
- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

Não commitar `.env`, tokens ou segredos.
