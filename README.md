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
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` — protegido por Bearer JWT.
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

## Auth mínimo MVP

Fluxo disponível para teste:

1. `POST /api/auth/register` com `{ "email", "password", "name" }` cria usuário com senha hasheada via `scrypt` e retorna JWT.
2. `POST /api/auth/login` com `{ "email", "password" }` retorna JWT.
3. `GET /api/auth/me` exige `Authorization: Bearer <token>`.
4. Rotas Garmin aceitam JWT e usam o `sub` do token como usuário; `x-user-id`/`userId` seguem apenas como fallback temporário para testes antigos.

Variáveis Auth:

- `JWT_SECRET` — segredo interno para assinar JWT; obrigatório em produção e não fornecido por terceiros.
- `JWT_EXPIRES_IN_SECONDS` — TTL do access token; default local/MVP `604800`.

## Integração Garmin MVP v1

A base de integração Garmin está preparada no backend, sem credenciais reais no repositório.

Fluxo disponível:

1. Configure `.env` a partir de `.env.example`.
2. Preferencialmente envie `Authorization: Bearer <token>` obtido em `/api/auth/login` ou `/api/auth/register`.
   - Fallback temporário: `x-user-id` ou query `userId` ainda funcionam para não quebrar testes antigos.
   - TODO controlado: tornar JWT obrigatório e remover fallback temporário.
3. Inicie OAuth em `GET /api/garmin/authorize/start`.
4. A Garmin deve redirecionar para o backend em `GET /api/garmin/callback?code=...&state=...` para troca segura do code por tokens.
5. Após processar o callback, o backend redireciona o navegador para o frontend em `GARMIN_SUCCESS_REDIRECT_URL` ou `GARMIN_ERROR_REDIRECT_URL`, sem expor `code`, `state` ou tokens. Para teste/API, envie `Accept: application/json` ou `?format=json` para receber JSON.
6. Execute sync manual inicial de até 90 dias por padrão: `POST /api/garmin/sync`.

Variáveis Garmin:

- `GARMIN_CLIENT_ID`
- `GARMIN_CLIENT_SECRET`
- `GARMIN_REDIRECT_URI`
- `GARMIN_AUTHORIZATION_URL` — endpoint OAuth 2.0 PKCE de autorização (`https://connect.garmin.com/oauth2Confirm`).
- `GARMIN_TOKEN_URL` — endpoint OAuth 2.0 PKCE de token (`https://connectapi.garmin.com/di-oauth2-service/oauth/token`).
- `GARMIN_API_BASE_URL` — host das Wellness REST APIs (`https://apis.garmin.com`), não deve ser usado como endpoint de authorize.
- `GARMIN_SUCCESS_REDIRECT_URL` — destino frontend após conexão concluída; default derivado de `FRONTEND_URL`/`APP_URL` + `/integrations/garmin/success`.
- `GARMIN_ERROR_REDIRECT_URL` — destino frontend após falha no callback; default derivado de `FRONTEND_URL`/`APP_URL` + `/integrations/garmin/error`.
- `GARMIN_STATE_SECRET` — segredo interno da aplicação para assinatura de `state` OAuth; não é fornecido pela Garmin.
- `GARMIN_TOKEN_ENCRYPTION_KEY` — segredo interno da aplicação para criptografar tokens em repouso; não é fornecido pela Garmin e é obrigatório antes de produção.

Persistência Prisma criada:

- `GarminConnection` — conexão por usuário/provedor com tokens criptografados.
- `GarminSyncLog` — logs de sync sem expor tokens.
- `GarminMetric` — métricas normalizadas iniciais: HRV, sono, VO2, atividades e carga quando disponível.

Pendências externas:

- Confirmar no portal Garmin se o app está habilitado no ambiente correto (evaluation/sandbox ou production) para OAuth 2.0 PKCE e se o redirect URI bate exatamente com `GARMIN_REDIRECT_URI`.
- Implementar/ajustar no frontend páginas ou fallback SPA para `/integrations/garmin/success` e `/integrations/garmin/error`, lendo query params seguros (`provider`, `status`, `message`).
- Substituir os stubs seguros de coleta de dados por chamadas reais e mapeamentos validados.
- Não há diagnóstico médico; os dados importados devem alimentar apenas features de bem-estar/prontidão definidas pelo produto.

## Integrações externas

Garmin possui foundation OAuth/sync segura para MVP v1 com adapter ainda parcialmente stubado para endpoints de dados reais. WhatsApp real ainda **não** está implementado neste scaffold.

Variáveis WhatsApp planejadas:

- `WHATSAPP_PROVIDER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

Não commitar `.env`, tokens ou segredos.
