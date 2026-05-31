# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev` rastreando `origin/dev`; frontend `dev` rastreando `origin/dev`.
- Última sessão: 2026-05-31
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api` (alias dispatch: `/workspace/projects/itrainhealthy-api`).
- Frontend/Web: `/Users/irene/projects/itrainhealthy` (alias dispatch: `/workspace/projects/itrainhealthy`).
- Último push backend `dev`: `6d43a2dde080f5cad435abc41bbfb20e0f7bc814` (`feat: implement garmin manual sync`).
- Último push frontend `dev`: `1ed8291ffd0531ce49a6843a6a04722ba34ab75f` (`feat: show garmin sync results`).

## O que foi feito
- Lido este `HANDOFF.md` e feito discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Mantido Auth mínimo, Consentimento LGPD, Perfil Atleta e OAuth Garmin já validados por Rodrigo.
- Implementado Sync Garmin manual no backend usando tabelas existentes, sem migration nova:
  - `POST /api/garmin/sync` agora está protegido por `JwtAuthGuard` e usa exclusivamente o usuário autenticado (`request.user.id`/`User.uuid`).
  - Serviço resolve `User.uuid` público para `User.id` interno, encontra `GarminConnection`, renova token via refresh token quando expirado e não expõe tokens em respostas/logs.
  - `GarminAdapter.fetchNormalizedMetrics` deixou de ser stub e passa a tentar chamadas reais contra a API Garmin configurada (`GARMIN_API_BASE_URL`, default `https://apis.garmin.com`).
  - Tentativas default para paths comuns Wellness/Activity por tipo solicitado:
    - `/wellness-api/rest/activities`
    - `/wellness-api/rest/activityDetails`
    - `/wellness-api/rest/sleeps`
    - `/wellness-api/rest/hrv`
    - `/wellness-api/rest/userMetrics`
    - `/wellness-api/rest/trainingLoad`
  - Janela enviada por query string com `uploadStartTimeInSeconds` e `uploadEndTimeInSeconds`.
  - Respostas JSON reais são normalizadas para `GarminMetric` com `type`, `sourceId`, `measuredAt`, `value`, `unit`, `summary` e `raw`.
  - Respostas HTTP 403/404/erro são registradas como tentativas e, se nenhum endpoint estiver habilitado, o sync falha com mensagem clara orientando confirmar permissões, summary types ou necessidade de webhook/backfill no portal Garmin.
  - Variável opcional `GARMIN_SYNC_ENDPOINTS` adicionada ao `.env.example` para override dos paths exatos liberados no portal Garmin: formato `METRIC:/path,METRIC:/path`.
  - `GET /api/garmin/status` agora retorna `lastError` e até 5 `recentMetrics` persistidas para o dashboard.
- Implementado feedback do Sync Garmin no frontend:
  - Botão existente “Sync manual” agora exibe resultado com quantidade importada e tentativas/path/status retornados pelo backend.
  - Dashboard mostra `lastSyncAt`, último erro e lista “Dados reais sincronizados” com métricas recentes (`type`, data e valor/unidade quando disponíveis).
- Documentação atualizada:
  - Backend `README.md`: seção Sync Garmin MVP com endpoint protegido, persistência em `GarminMetric`, status/recentMetrics e limitação de endpoints/webhooks.
  - Frontend `README.md`: dashboard exibe resultado do sync, `lastSyncAt`, erro e métricas recentes.
- Validações executadas com sucesso:
  - Backend: `npx prisma generate`, `npm run build`, `npm run lint`.
  - Frontend: `npm run build`, `npm run lint`.
- Commits/push concluídos em `origin/dev`:
  - Backend: `6d43a2dde080f5cad435abc41bbfb20e0f7bc814` (`feat: implement garmin manual sync`).
  - Frontend: `1ed8291ffd0531ce49a6843a6a04722ba34ab75f` (`feat: show garmin sync results`).

## Pendente / próximos passos
- Deploy backend `origin/dev` e frontend `origin/dev`.
- Garantir que todas as migrations anteriores já estejam aplicadas:
  - `npx prisma migrate deploy`.
- Testar fluxo completo em ambiente com credenciais Garmin reais:
  1. login;
  2. LGPD aceito;
  3. perfil atleta completo;
  4. conectar Garmin;
  5. clicar “Sync manual”;
  6. verificar `lastSyncAt`, tentativas e métricas recentes no dashboard;
  7. conferir registros em `GarminSyncLog` e `GarminMetric`.
- Se o portal Garmin informar paths diferentes, configurar `GARMIN_SYNC_ENDPOINTS` com os endpoints autorizados.
- Confirmar com Garmin se o app atual tem Health/Activity API pull habilitado ou se exige webhook/subscription/backfill para entrega de summaries.
- Usar dados sincronizados de `GarminMetric` na fórmula v1 de prontidão/recomendações.
- Tornar JWT obrigatório também nas rotas Garmin de status/connect/disconnect quando testes legados com `demo-user` não forem mais necessários.
- Considerar refresh token/cookie httpOnly em etapa posterior; `localStorage` segue como solução MVP/teste.

## Decisões tomadas
- Não criar tabela nova para o sync nesta etapa: `GarminMetric` e `GarminSyncLog` já suportam dados normalizados, raw JSON, deduplicação e auditoria básica.
- Proteger `POST /api/garmin/sync` com JWT obrigatório: sync real manipula dados sensíveis do usuário e não deve aceitar fallback legado.
- Manter `GET /api/garmin/status` com compatibilidade temporária, mas enriquecido com `lastError`/`recentMetrics`.
- Persistir `raw` completo da Garmin em `GarminMetric`: permite ajustar mapeamentos depois sem perder payload real, evitando inventar campos clínicos.
- Implementar endpoints default conservadores e override via `GARMIN_SYNC_ENDPOINTS`: documentação Garmin pública não expõe todos os contratos do app aprovado, então o backend precisa ser configurável por ambiente.
- Se nenhum endpoint retornar OK, falhar com diagnóstico claro em vez de mascarar como sucesso vazio.

## Riscos e bloqueios conhecidos
- Garmin Health/Activity API frequentemente depende de habilitação por summary type, permissões do app e/ou fluxo webhook/backfill. Se os endpoints pull default retornarem 403/404, configurar `GARMIN_SYNC_ENDPOINTS` ou habilitar webhook no portal Garmin.
- Não há token/segredo em logs ou respostas, mas `raw` de saúde é persistido no banco; tratar banco/logs com controles LGPD adequados.
- Sem migrations anteriores aplicadas, as tabelas `GarminMetric`/`GarminSyncLog` podem não existir ou ter schema antigo.
- `GARMIN_TOKEN_ENCRYPTION_KEY` deve estar estável; trocar a chave impede descriptografar tokens Garmin já armazenados.
- `localStorage` continua vulnerável a XSS; migrar auth para cookie httpOnly/refresh-token posteriormente.
- Enquanto fallback `userId` existir em outras rotas Garmin, ainda há fluxo legado; remover quando JWT for obrigatório.
