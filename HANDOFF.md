# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev` rastreando `origin/dev`; frontend `dev` rastreando `origin/dev`.
- Última sessão: 2026-05-31
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api` (alias dispatch: `/workspace/projects/itrainhealthy-api`).
- Frontend/Web: `/Users/irene/projects/itrainhealthy` (alias dispatch: `/workspace/projects/itrainhealthy`).
- Último push backend `dev`: `7cae647cb1e81d94a438920666343db16d9f4bf0` (`feat: add jwt auth foundation`).
- Último push frontend `dev`: `9f8522282b18da8b85cd2b0e1cc7559d0dfb5318` (`feat: add auth screens and jwt garmin flow`).

## O que foi feito
- Lido este `HANDOFF.md` antes da execução e feito discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Implementado Auth mínimo no backend:
  - `POST /api/auth/register` com email/senha/nome opcional.
  - `POST /api/auth/login`.
  - `GET /api/auth/me` protegido por Bearer JWT.
  - Hash de senha com `scrypt` + salt por usuário.
  - JWT HS256 assinado internamente via `JWT_SECRET`, sem adicionar dependência externa.
  - Guard `JwtAuthGuard` e tipos mínimos de usuário autenticado.
- Atualizado Prisma:
  - Campo `User.passwordHash String?` para compatibilidade com usuários MVP já existentes.
  - Migration criada: `prisma/migrations/20260531170000_add_user_password_hash/migration.sql`.
- Atualizado fluxo Garmin backend:
  - Rotas Garmin passam a preferir `Authorization: Bearer <token>` e usar o `sub` do JWT como `userId`.
  - Fallback `x-user-id`/query `userId` foi mantido temporariamente para não quebrar testes antigos.
- Atualizado `.env.example`/README backend com `JWT_SECRET` e `JWT_EXPIRES_IN_SECONDS`.
- Implementado Auth mínimo no frontend:
  - Tela de login/cadastro (`AuthPage`) antes do dashboard.
  - Logout no dashboard.
  - Token e usuário salvos em `localStorage` como solução pragmática de MVP.
  - Client `authApi` para register/login/me.
  - Client Garmin envia Bearer JWT quando existe sessão; só usa `VITE_MVP_USER_ID` como fallback sem JWT.
- Atualizado README frontend com fluxo de auth e comportamento do fallback.
- Validações executadas com sucesso:
  - Backend: `npx prisma generate`, `npm run build`, `npm run lint`.
  - Frontend: `npm run build`, `npm run lint`.
- Commits/push concluídos em `origin/dev`:
  - Backend: `7cae647cb1e81d94a438920666343db16d9f4bf0` (`feat: add jwt auth foundation`).
  - Frontend: `9f8522282b18da8b85cd2b0e1cc7559d0dfb5318` (`feat: add auth screens and jwt garmin flow`).

## Pendente / próximos passos
- Deploy backend `origin/dev` e aplicar migration Prisma no banco de produção antes de usar cadastro/login:
  - `npx prisma migrate deploy` no ambiente de produção.
- Configurar em produção:
  - `JWT_SECRET=<string forte gerada pela infra>`.
  - `JWT_EXPIRES_IN_SECONDS=604800` ou TTL definido pelo produto.
- Deploy frontend `origin/dev` e testar fluxo completo:
  1. abrir app;
  2. criar conta com email/senha;
  3. conectar Garmin;
  4. confirmar que o Garmin vincula ao usuário autenticado e dashboard consulta status via Bearer JWT.
- Tornar JWT obrigatório nas rotas Garmin quando testes legados com `demo-user` não forem mais necessários.
- Considerar refresh token/cookie httpOnly em etapa posterior; `localStorage` foi escolhido apenas para MVP/teste.
- Aplicar auth real nos demais módulos (`profile`, `consents`, `readiness`) quando saírem de stub.
- Confirmar/revisar endpoints de dados Wellness reais e mapeamentos antes de habilitar sync real.

## Decisões tomadas
- Usar `scrypt` nativo do Node para hash de senha: evita dependência nova e fornece hash forte o suficiente para MVP com salt individual.
- Usar JWT HS256 manual com `crypto`: reduz dependências, mas mantém assinatura/expiração; `JWT_SECRET` é obrigatório em produção.
- `passwordHash` opcional: preserva compatibilidade com usuários temporários/legados já criados sem senha.
- Manter fallback `x-user-id`/`userId`: reduz risco de quebrar validações Garmin existentes enquanto Rodrigo migra para contas reais.
- Armazenar token em `localStorage` no frontend: decisão pragmática para MVP; documentado como solução temporária menos segura que cookie httpOnly.

## Riscos e bloqueios conhecidos
- Migration precisa ser aplicada no banco real; sem isso `/api/auth/register` falhará por coluna ausente.
- `JWT_SECRET` precisa ser forte e configurado antes de produção; não usar default local.
- `localStorage` é vulnerável a XSS; reforçar CSP/sanitização e migrar para cookie httpOnly/refresh token em etapa posterior.
- Enquanto fallback `userId` existir, rotas Garmin ainda aceitam fluxo antigo; remover quando JWT for obrigatório.
- Usuários temporários existentes não têm senha e não conseguem login até cadastro/conta real ser criada.
