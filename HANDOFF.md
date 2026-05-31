# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev` rastreando `origin/dev`; frontend `dev` rastreando `origin/dev`.
- Última sessão: 2026-05-31
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api` (alias dispatch: `/workspace/projects/itrainhealthy-api`).
- Frontend/Web: `/Users/irene/projects/itrainhealthy` (alias dispatch: `/workspace/projects/itrainhealthy`).
- Último push backend `dev`: `28a31dcc4422b0ed3f755558973d3c6fd752b545` (`fix: align garmin sync with wellness backfill`).
- Último push frontend `dev`: `3f1d7506dd7d39b4dcbbe56ecc06c077600ae213` (`fix: explain garmin backfill sync`).

## O que foi feito
- Lido este `HANDOFF.md` e feito discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Investigado erro real do Rodrigo: endpoints chamados como `/wellness-api/rest/...` contra `GARMIN_API_BASE_URL=https://apis.garmin.com` retornaram 400/404.
- Diagnóstico técnico:
  - A Wellness API REST usa base `https://apis.garmin.com/wellness-api/rest` e paths relativos como `/activities`, `/activityDetails`, `/dailies`, `/sleeps`, `/userMetrics`.
  - Pull de summaries usa janela por `uploadStartTimeInSeconds`/`uploadEndTimeInSeconds`, mas deve ser feito em janelas curtas; o backend agora quebra em chunks de até 24h.
  - Dados históricos/anteriores ao token geralmente exigem backfill por `/backfill/{summaryType}` com `summaryStartTimeInSeconds`/`summaryEndTimeInSeconds`.
  - Backfill é assíncrono: a Garmin entrega summaries via callback/webhook configurado no portal; não retorna os dados imediatamente no botão sync.
  - `activityDetails` e alguns detalhes dependem de summaryId/dados previamente entregues; não devem ser tratados como lista genérica ilimitada.
  - `/trainingLoad` não é endpoint REST genérico confiável; removido do default e `TRAINING_LOAD` fica mapeado para `/userMetrics` quando disponível.
- Corrigido backend Garmin:
  - Default `GARMIN_API_BASE_URL` mudou para `https://apis.garmin.com/wellness-api/rest`.
  - Paths default agora são relativos: `/activities`, `/activityDetails`, `/dailies`, `/sleeps`, `/hrv`, `/userMetrics`.
  - Pull divide intervalos em chunks <= 24h.
  - Se nenhum pull funcionar, backend tenta solicitar backfill por summary type.
  - Resposta de sync agora pode retornar `backfillRequested: true` e `diagnostic` explicando que os dados chegarão por webhook.
  - Mensagem de erro final explica pull/backfill, permissões/summary types e necessidade de webhook no Garmin Developer Portal.
  - `.env.example` documenta `GARMIN_SYNC_ENDPOINTS`, `GARMIN_WEBHOOK_SECRET` e callbacks a configurar no portal.
- Implementado webhook Garmin mínimo no backend:
  - `POST /api/garmin/webhook`
  - `POST /api/garmin/webhook/:summaryType`
  - Se `GARMIN_WEBHOOK_SECRET` estiver configurado, exige header `x-garmin-webhook-secret`.
  - Recebe payloads brutos/arrays, identifica `userId`/`userAccessToken`/`garminUserId`, encontra `GarminConnection.externalUserId`, normaliza e persiste em `GarminMetric` com `raw`/`summary`.
  - Atualiza `lastSyncAt` na conexão quando importa dados via webhook.
- Ajustado frontend:
  - `GarminSyncResponse` aceita `backfillRequested` e `diagnostic`.
  - Dashboard mostra mensagem específica quando o sync manual apenas solicitou backfill e aguarda webhook.
- Documentação atualizada no README backend com o fluxo correto: pull curto, backfill assíncrono e webhooks.
- Validações executadas com sucesso:
  - Backend: `npm run build`, `npm run lint`.
  - Frontend: `npm run build`, `npm run lint`.
- Commits/push concluídos em `origin/dev`:
  - Backend: `28a31dcc4422b0ed3f755558973d3c6fd752b545` (`fix: align garmin sync with wellness backfill`).
  - Frontend: `3f1d7506dd7d39b4dcbbe56ecc06c077600ae213` (`fix: explain garmin backfill sync`).

## Pendente / próximos passos
- Deploy backend `origin/dev` e frontend `origin/dev`.
- Em produção, configurar/confirmar:
  - `GARMIN_API_BASE_URL=https://apis.garmin.com/wellness-api/rest`.
  - Opcional `GARMIN_WEBHOOK_SECRET` e header correspondente se o portal permitir header customizado/proxy.
  - No Garmin Developer Portal, habilitar summary types necessários e configurar callback/webhook para:
    - `https://itrainhealthy-api.xrunai.app/api/garmin/webhook`
    - ou callbacks específicos: `/api/garmin/webhook/activities`, `/activityDetails`, `/dailies`, `/sleeps`, `/userMetrics`.
- Reteste recomendado:
  1. login;
  2. conectar Garmin;
  3. clicar “Sync manual” com janela curta/default;
  4. se retornar `backfillRequested`, aguardar entrega no webhook;
  5. conferir `GarminMetric`, `GarminSyncLog`, `lastSyncAt` e dashboard.
- Se Garmin informar paths/summary types exatos diferentes, preencher `GARMIN_SYNC_ENDPOINTS` no formato `METRIC:/path,METRIC:/path`.
- Usar dados sincronizados de `GarminMetric` na fórmula v1 de prontidão/recomendações.
- Tornar JWT obrigatório também nas rotas Garmin de status/connect/disconnect quando testes legados com `demo-user` não forem mais necessários.

## Decisões tomadas
- Corrigir base URL para o root REST real e usar paths relativos: evita duplicar `/wellness-api/rest` e reduz erro 400 por URL/contrato incorreto.
- Chunk de 24h para pull: reduz chance de rejeição por janela muito grande e segue padrão de summary upload windows.
- Backfill como fallback, não como substituto de sync imediato: backfill é assíncrono e depende de webhook.
- Implementar webhook sem migration nova: payload normalizado cabe em `GarminMetric.raw`/`summary` e vínculo por `GarminConnection.externalUserId`.
- Manter `GARMIN_SYNC_ENDPOINTS` configurável: contratos exatos variam por app/summary type aprovado no portal Garmin.
- Não expor tokens em log/resposta; erros mostram paths/status, não credenciais.

## Riscos e bloqueios conhecidos
- Sem webhook configurado no Garmin Developer Portal, backfill pode ser aceito mas nenhum dado chegará ao banco.
- Se `externalUserId` salvo no OAuth não corresponder ao identificador dos payloads webhook (`userId`/`userAccessToken`), os eventos serão recebidos mas ficarão `unmatched`; ajustar mapeamento conforme payload real.
- Algumas rotas/summary types podem estar indisponíveis para o app atual até Garmin liberar permissões específicas.
- `GARMIN_WEBHOOK_SECRET` só funciona se houver forma de enviar header customizado; se o portal não suportar, usar proxy/gateway ou deixar vazio e validar por allowlist/IP futuramente.
- `GARMIN_TOKEN_ENCRYPTION_KEY` deve permanecer estável; trocar chave impede descriptografar tokens Garmin já armazenados.
- `localStorage` continua vulnerável a XSS; migrar auth para cookie httpOnly/refresh-token posteriormente.
