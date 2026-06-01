# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev`; frontend `dev`.
- Última sessão: 2026-06-01
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api`.
- Frontend/Web: `/Users/irene/projects/itrainhealthy`.
- Branch base operacional do canal: `dev`.
- Regra operacional definida por Rodrigo: após modificações neste projeto/canal, fazer merge das alterações na branch `dev` dos repositórios envolvidos, preservando histórico de commits. Não fazer push direto em `main`/`master`/produção.
- Regra operacional GitHub/push corrigida por Rodrigo: o token de GitHub fica no env global, na variável `SANCHO_GITHUB_TOKEN`, e deve ser usado para operações GitHub/push neste projeto via método seguro/temporário, sem expor o valor em logs, remotes, commits ou chat, e sem gravar token no remote.

## O que foi feito
- Lido o handoff e executado discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Atualizado `/Users/irene/.openclaw/workspace/fullstack/PROJECTS_INDEX.md` com a regra correta de token GitHub no env global `SANCHO_GITHUB_TOKEN`.
- Atualizado este `HANDOFF.md` para remover a regra antiga de token no `.env` e registrar a regra correta sem expor segredo.
- Confirmado que `SANCHO_GITHUB_TOKEN` está definido no env global sem imprimir seu valor.

## Pendente / próximos passos
- Enviar `dev` de backend e frontend para `origin/dev` usando autenticação temporária/segura com `SANCHO_GITHUB_TOKEN`.
- Deploy backend e frontend após o push remoto em `origin/dev`, se esse for o fluxo operacional desejado.
- Em produção, confirmar variável `GARMIN_API_BASE_URL=https://apis.garmin.com/wellness-api/rest`; se estiver explicitamente errada (`https://apis.garmin.com`), precisa ser corrigida fora do código.
- Retestar `/api/garmin/sync` com conta conectada e confirmar resposta 200 com `PARTIAL_FAILURE`/diagnostic quando Garmin retornar 404 por permissão/configuração.
- Quando chegarem payloads reais de webhook, validar se o identificador (`userId`, `userAccessToken` ou `garminUserId`) bate com `GarminConnection.externalUserId` salvo no OAuth.

## Decisões tomadas
- Registrar a regra operacional corrigida de Rodrigo no `PROJECTS_INDEX.md` e neste handoff: operações GitHub/push deste projeto devem usar `SANCHO_GITHUB_TOKEN` do env global de forma segura e nunca expor o valor.
- Não gravar token em remotes nem imprimir segredos; autenticação deve ser temporária por header/helper seguro compatível com GitHub HTTPS.
- Manter a branch operacional `dev` como alvo dos pushes; não usar `main`/`master`/produção.

## Riscos e bloqueios conhecidos
- Não expor `SANCHO_GITHUB_TOKEN` em logs, remotes, commits ou chat.
- Conferir sempre branch `dev` e status antes de push; nunca push direto em `main`/`master`/produção.
- Backfill Garmin é assíncrono: mesmo quando aceito, o sync manual não recebe dados na resposta; os dados chegam pelos webhooks configurados.
- `hrv` pode depender de permissão/summary type específico no Health API; se o portal não listar HRV como endpoint habilitado, deve ser removido de `GARMIN_SYNC_ENDPOINTS` até liberação.

## Instruções objetivas para Rodrigo — Garmin Portal
- Confirmar ambiente correto do app (sandbox/evaluation/production) e que o OAuth usado pela conta conectada pertence ao mesmo app/ambiente.
- Configurar a raiz REST no backend: `GARMIN_API_BASE_URL=https://apis.garmin.com/wellness-api/rest`.
- Habilitar no portal os summary types/endpoints necessários para os 5 webhooks do MVP:
  - Activities → callback `https://itrainhealthy-api.xrunai.app/api/garmin/webhook/activities`
  - Activity Details → callback `https://itrainhealthy-api.xrunai.app/api/garmin/webhook/activityDetails`
  - Dailies → callback `https://itrainhealthy-api.xrunai.app/api/garmin/webhook/dailies`
  - Sleeps → callback `https://itrainhealthy-api.xrunai.app/api/garmin/webhook/sleeps`
  - User Metrics → callback `https://itrainhealthy-api.xrunai.app/api/garmin/webhook/userMetrics`
- Se o portal disponibilizar HRV como summary type separado, adicionar também `https://itrainhealthy-api.xrunai.app/api/garmin/webhook/hrv`; se não disponibilizar, não esperar sucesso em `/hrv`.
- Se o portal exigir um callback único, usar `https://itrainhealthy-api.xrunai.app/api/garmin/webhook`.
- Após configurar, reconectar a conta Garmin e rodar sync com janela curta; para histórico, aguardar entrega assíncrona dos webhooks de backfill.
