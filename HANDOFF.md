# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev` rastreando `origin/dev`; frontend `dev` rastreando `origin/dev`.
- Última sessão: 2026-05-31
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api` (alias dispatch: `/workspace/projects/itrainhealthy-api`).
- Frontend/Web: `/Users/irene/projects/itrainhealthy` (alias dispatch: `/workspace/projects/itrainhealthy`).
- Último push backend `dev`: `5f0c3830fcc97e6fa25e59d49d46bf2e0ed4f259` (`feat: add sequential ids and lgpd consents`).
- Último push frontend `dev`: `0dc6c240d5cdb3ce54a8e6bccdea926fbf77744c` (`feat: add lgpd consent gate`).

## O que foi feito
- Lido este `HANDOFF.md` antes/ao longo da execução e feito discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Mantido Auth mínimo já existente:
  - `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
  - JWT HS256 via `JWT_SECRET`; `sub` segue como identificador público do usuário.
- Migração estrutural Prisma/PostgreSQL criada para o projeto ainda inicial:
  - Migration: `prisma/migrations/20260531190000_add_sequential_ids_and_lgpd_consents/migration.sql`.
  - Todas as models/tabelas passam a usar `id Int @id @default(autoincrement())` como PK interna sequencial.
  - O antigo identificador string `cuid` foi preservado como `uuid String @unique @default(cuid())`.
  - FKs/relações foram ajustadas para IDs internos inteiros: `Profile`, `Consent`, `Integration`, `ReadinessSnapshot`, `GarminConnection`, `GarminSyncLog`, `GarminMetric`.
  - Migration tenta preservar dados existentes renomeando `id` antigo para `uuid`, criando novo `id` inteiro e remapeando FKs por join contra `User.uuid`/`GarminConnection.uuid`.
- Compatibilidade de API pública preservada:
  - Backend auth retorna `user.id` como `uuid` público, não o `id` inteiro interno.
  - JWT `sub` continua usando `uuid` público.
  - Garmin recebe usuário público (`uuid`) via JWT/fallback, resolve internamente para `User.id` inteiro e grava relações com FK interna.
  - Fallback temporário `x-user-id`/query `userId` foi mantido para testes antigos, criando usuário MVP com `uuid=<userId>` se necessário.
- Implementado Consentimento LGPD básico no backend:
  - `GET /api/consents/status` protegido por Bearer JWT.
  - `GET /api/consents` alias protegido por Bearer JWT.
  - `POST /api/consents/accept` protegido por Bearer JWT.
  - Registra `type`, `version`, `accepted`, `acceptedAt`, `ipAddress`, `userAgent`.
  - Consentimento obrigatório inicial: `TERMS_OF_USE`, versão `2026-05-31`.
- Implementado gate LGPD básico no frontend:
  - Após login/cadastro, o app consulta `GET /api/consents/status`.
  - Se ainda não aceito, exibe tela de aceite com texto mínimo antes do dashboard.
  - Aceite chama `POST /api/consents/accept` com Bearer JWT.
  - Logout no gate limpa sessão local.
- Documentação atualizada:
  - Backend `README.md`: endpoints LGPD e decisão de identificadores internos/públicos.
  - Frontend `README.md`: gate LGPD após auth.
- Validações executadas com sucesso:
  - Backend: `npx prisma generate`, `npm run build`, `npm run lint`.
  - Frontend: `npm run build`, `npm run lint`.
- Commits/push concluídos em `origin/dev`:
  - Backend: `5f0c3830fcc97e6fa25e59d49d46bf2e0ed4f259` (`feat: add sequential ids and lgpd consents`).
  - Frontend: `0dc6c240d5cdb3ce54a8e6bccdea926fbf77744c` (`feat: add lgpd consent gate`).

## Pendente / próximos passos
- Deploy backend `origin/dev` e aplicar migrations Prisma no banco de produção/staging:
  - `npx prisma migrate deploy` no ambiente alvo.
- Antes de aplicar em produção, fazer backup/snapshot do banco e preferencialmente testar a migration em clone/staging, pois ela altera PKs/FKs de todas as tabelas.
- Deploy frontend `origin/dev`.
- Testar fluxo completo:
  1. abrir app;
  2. criar conta ou login;
  3. aceitar consentimento LGPD;
  4. acessar dashboard;
  5. conectar Garmin;
  6. confirmar que status Garmin e consentimento ficam vinculados ao usuário autenticado.
- Tornar JWT obrigatório nas rotas Garmin quando testes legados com `demo-user` não forem mais necessários.
- Considerar refresh token/cookie httpOnly em etapa posterior; `localStorage` foi escolhido apenas para MVP/teste.
- Aplicar auth/consent aos demais módulos (`profile`, `readiness`) quando saírem de stub.
- Confirmar/revisar endpoints de dados Wellness reais e mapeamentos antes de habilitar sync real.

## Decisões tomadas
- Usar `id Int` autoincremental como PK interna em todas as tabelas para facilitar inspeção/ordenação e relações eficientes.
- Manter `uuid/cuid` como identificador público único para não expor sequenciais e preservar contrato público/JWT.
- Remapear FKs para inteiros no banco, mas traduzir `uuid` público para `id` interno nos serviços.
- Consentimento LGPD mínimo usa `TERMS_OF_USE` versão `2026-05-31` como primeira versão unificada de termos/política do MVP.
- Registrar IP e user-agent no aceite quando disponíveis via Nest (`@Ip`, header `user-agent`).
- Manter fallback `x-user-id`/`userId` no Garmin temporariamente para não quebrar validações MVP antigas.
- Continuar com token em `localStorage` no frontend por simplicidade de MVP; documentado como temporário.

## Riscos e bloqueios conhecidos
- Migration estrutural troca PKs/FKs de todas as tabelas; apesar de tentar preservar dados, deve ser validada em staging/clone antes de produção.
- Se existirem registros órfãos em FKs antigas (`userId` sem `User.uuid` correspondente ou `connectionId` sem `GarminConnection.uuid`), a migration pode falhar ao aplicar `NOT NULL`; limpar dados órfãos antes se necessário.
- Sequências/identity novas serão criadas no momento da migration; após restore/import manual, validar `id` e constraints.
- Sem `npx prisma migrate deploy`, backend novo não roda corretamente contra banco antigo.
- `JWT_SECRET` precisa ser forte e configurado antes de produção; não usar default local.
- `localStorage` é vulnerável a XSS; reforçar CSP/sanitização e migrar para cookie httpOnly/refresh token posteriormente.
- Enquanto fallback `userId` existir, rotas Garmin ainda aceitam fluxo antigo; remover quando JWT for obrigatório.
- Usuários temporários existentes não têm senha e não conseguem login até cadastro/conta real ser criada.
