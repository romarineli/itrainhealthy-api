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
- `GET /api/garmin/authorize/start`
- `GET /api/garmin/callback`
- `GET /api/garmin/status`
- `DELETE /api/garmin/disconnect`
- `POST /api/garmin/disconnect`
- `POST /api/garmin/sync`
- `GET /api/whatsapp/status`
- `GET /api/readiness/today`

## Integração Garmin MVP v1

A base de integração Garmin está preparada no backend, sem credenciais reais no repositório.

Fluxo disponível:

1. Configure `.env` a partir de `.env.example`.
2. Enquanto não há auth real, envie o usuário temporariamente via header `x-user-id` ou query `userId`.
   - Ex.: `curl -H 'x-user-id: demo-user' http://localhost:3000/api/garmin/status`
   - Em ambiente não-produção, o start OAuth cria um usuário placeholder para permitir o FK do Prisma no MVP.
   - TODO controlado: substituir por subject autenticado via middleware/JWT e remover criação temporária.
3. Inicie OAuth em `GET /api/garmin/authorize/start`.
4. A Garmin deve redirecionar para `GET /api/garmin/callback?code=...&state=...`.
5. Execute sync manual inicial de até 90 dias por padrão: `POST /api/garmin/sync`.

Variáveis Garmin:

- `GARMIN_CLIENT_ID`
- `GARMIN_CLIENT_SECRET`
- `GARMIN_REDIRECT_URI`
- `GARMIN_API_BASE_URL`
- `GARMIN_STATE_SECRET` — segredo de assinatura de `state` OAuth.
- `GARMIN_TOKEN_ENCRYPTION_KEY` — chave para criptografar tokens em repouso; obrigatória antes de produção.

Persistência Prisma criada:

- `GarminConnection` — conexão por usuário/provedor com tokens criptografados.
- `GarminSyncLog` — logs de sync sem expor tokens.
- `GarminMetric` — métricas normalizadas iniciais: HRV, sono, VO2, atividades e carga quando disponível.

Pendências externas:

- Confirmar endpoints/contratos reais da API Garmin aprovada para o app, especialmente token, refresh, revoke e payloads de dados.
- Substituir os stubs seguros de coleta de dados por chamadas reais e mapeamentos validados.
- Não há diagnóstico médico; os dados importados devem alimentar apenas features de bem-estar/prontidão definidas pelo produto.

## Integrações externas

Garmin possui foundation OAuth/sync segura para MVP v1 com adapter ainda parcialmente stubado para endpoints de dados reais. WhatsApp real ainda **não** está implementado neste scaffold.

Variáveis WhatsApp planejadas:

- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

Não commitar `.env`, tokens ou segredos.
