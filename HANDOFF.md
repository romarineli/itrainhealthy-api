# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev` rastreando `origin/dev`; frontend `dev` rastreando `origin/dev`.
- Última sessão: 2026-05-31
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api` (alias dispatch: `/workspace/projects/itrainhealthy-api`).
- Frontend/Web: `/Users/irene/projects/itrainhealthy` (alias dispatch: `/workspace/projects/itrainhealthy`).
- Último push backend `dev`: `0fe09f99684bebaf5409233b84ac09ef9d1d9439` (`feat: add athlete profile api`).
- Último push frontend `dev`: `5a5ae9c9988c1e4c271fc68c0875675c53c10bf7` (`feat: add athlete profile gate`).

## O que foi feito
- Lido este `HANDOFF.md` e feito discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Mantido Auth mínimo, Consentimento LGPD e fluxo Garmin já validados por Rodrigo.
- Implementado Perfil Atleta mínimo no backend:
  - Nova model Prisma `AthleteProfile` com `id Int @id @default(autoincrement())` como PK interna e `uuid String @unique @default(cuid())` como identificador público.
  - Relação 1:1 com `User` via `userId Int @unique` usando o ID interno sequencial.
  - Campos mínimos: `displayName`, `birthDate`, `gender`, `heightCm`, `weightKg`, `primarySport`, `trainingGoal`, `experienceLevel`, `weeklyTrainingDays`, `timezone`, `createdAt`, `updatedAt`.
  - Migration criada: `prisma/migrations/20260531203000_add_athlete_profile/migration.sql`.
  - Novo módulo Nest `AthleteProfileModule` registrado em `AppModule`.
  - Endpoints protegidos por Bearer JWT:
    - `GET /api/athlete-profile/me` retorna perfil do usuário autenticado ou `null`.
    - `PUT /api/athlete-profile/me` faz upsert do perfil do usuário autenticado.
    - `PATCH /api/athlete-profile/me` também faz upsert/edição parcial.
  - DTO com validação básica de tipos, ranges e tamanhos (`heightCm`, `weightKg`, `weeklyTrainingDays`, strings e data ISO).
  - API expõe `id` como `uuid` público do perfil, nunca o ID inteiro interno.
- Implementado Perfil Atleta mínimo no frontend:
  - Client `src/lib/athleteProfileApi.ts` com Bearer JWT.
  - Gate/form `src/features/athlete-profile/AthleteProfileGate.tsx` após consentimento LGPD.
  - Se perfil não existe ou está incompleto, dashboard fica bloqueado até salvar campos mínimos.
  - Dashboard recebeu card/painel de Perfil Atleta e botão simples “Editar perfil”.
  - Formulário permite editar nome, nascimento, gênero, altura, peso, esporte, objetivo, experiência, dias/semana e timezone.
- Documentação atualizada:
  - Backend `README.md`: endpoints e campos do Perfil Atleta.
  - Frontend `README.md`: ordem Auth → LGPD → Perfil Atleta → Dashboard.
- Validações executadas com sucesso:
  - Backend: `npx prisma generate`, `npm run build`, `npm run lint`.
  - Frontend: `npm run build`, `npm run lint`.
- Commits/push concluídos em `origin/dev`:
  - Backend: `0fe09f99684bebaf5409233b84ac09ef9d1d9439` (`feat: add athlete profile api`).
  - Frontend: `5a5ae9c9988c1e4c271fc68c0875675c53c10bf7` (`feat: add athlete profile gate`).

## Pendente / próximos passos
- Deploy backend `origin/dev` e aplicar migrations Prisma no ambiente alvo:
  - `npx prisma migrate deploy`.
- Deploy frontend `origin/dev`.
- Testar fluxo completo:
  1. abrir app;
  2. criar conta ou login;
  3. aceitar consentimento LGPD;
  4. preencher perfil atleta mínimo;
  5. confirmar entrada no dashboard;
  6. editar perfil pelo botão “Editar perfil”;
  7. conectar Garmin e validar status no mesmo usuário autenticado.
- Usar dados do `AthleteProfile` na fórmula v1 de prontidão/recomendações quando essa regra for definida.
- Tornar JWT obrigatório nas rotas Garmin quando testes legados com `demo-user` não forem mais necessários.
- Considerar refresh token/cookie httpOnly em etapa posterior; `localStorage` segue como solução MVP/teste.
- Confirmar/revisar endpoints de dados Wellness reais e mapeamentos antes de habilitar sync real.

## Decisões tomadas
- Criar `AthleteProfile` em vez de reaproveitar `Profile`: separa claramente perfil esportivo/saúde do perfil técnico antigo (`Profile`) e evita quebrar stubs existentes.
- `AthleteProfile.id` é interno sequencial e `AthleteProfile.uuid` é público: mantém o padrão arquitetural atual e evita expor IDs incrementais.
- Endpoints são sempre `/me` e protegidos por JWT: impede acesso/edição de perfil de outros usuários.
- Perfil “completo” no frontend exige apenas campos essenciais de personalização inicial: `displayName`, `primarySport`, `trainingGoal`, `experienceLevel`, `weeklyTrainingDays`.
- Campos clínicos/sensíveis ficaram mínimos e opcionais (`heightCm`, `weightKg`, `birthDate`, `gender`) para reduzir atrito no MVP.
- `PUT` e `PATCH` compartilham upsert no MVP; DTO aceita payload parcial e backend atualiza apenas campos enviados.

## Riscos e bloqueios conhecidos
- Migration anterior estrutural de IDs sequenciais ainda é o maior ponto de atenção em bancos com dados reais; validar em staging/clone antes de produção.
- Nova migration `AthleteProfile` é aditiva e de baixo risco, mas depende das migrations anteriores já aplicadas porque referencia `User(id)` inteiro.
- Sem `npx prisma migrate deploy`, endpoints de perfil atleta falharão por tabela ausente.
- O texto/contrato de LGPD ainda é MVP; revisar juridicamente antes de produção real com dados sensíveis de saúde.
- `localStorage` continua vulnerável a XSS; migrar auth para cookie httpOnly/refresh-token posteriormente.
- Enquanto fallback `userId` existir no Garmin, ainda há fluxo legado; remover quando JWT for obrigatório.
