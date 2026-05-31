# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev` rastreando `origin/dev`; frontend `dev` rastreando `origin/dev`.
- Última sessão: 2026-05-31
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api` (alias dispatch: `/workspace/projects/itrainhealthy-api`).
- Frontend/Web: `/Users/irene/projects/itrainhealthy` (alias dispatch: `/workspace/projects/itrainhealthy`).

## O que foi feito
- Lido este `HANDOFF.md` antes da execução e feito discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Investigado erro retornado pela Garmin após deploy: `Unable to identify proxy for host: apis-secure and url: /oauth/authorize` / `messaging.adaptors.http.flow.ApplicationNotFound`.
- Diagnóstico técnico: o backend estava montando autorização em `https://apis.garmin.com/oauth/authorize` via `new URL('/oauth/authorize', GARMIN_API_BASE_URL)`. Esse host (`apis.garmin.com`) é usado para Wellness REST APIs, não para o endpoint de autorização OAuth do Garmin Connect Developer Program; por isso o gateway/proxy da Garmin não encontra aplicação/rota para `/oauth/authorize` e retorna `ApplicationNotFound`.
- Confirmada documentação pública do Garmin Connect Developer Program OAuth 2.0 PKCE indicando:
  - Authorization GET: `https://connect.garmin.com/oauth2Confirm`
  - Token POST: `https://connectapi.garmin.com/di-oauth2-service/oauth/token`
  - Wellness REST APIs: `https://apis.garmin.com/wellness-api/rest/...`
- Aplicada correção mínima no backend para OAuth 2.0 PKCE:
  - `src/config/env.ts`: adicionadas `GARMIN_AUTHORIZATION_URL` e `GARMIN_TOKEN_URL` com defaults oficiais de OAuth 2.0 PKCE.
  - `src/modules/garmin/garmin.adapter.ts`: authorization URL deixou de usar `GARMIN_API_BASE_URL + /oauth/authorize`; agora usa `GARMIN_AUTHORIZATION_URL`, inclui `code_challenge` e `code_challenge_method=S256`, remove `scope=read`, e troca token exchange/refresh para `GARMIN_TOKEN_URL`.
  - `src/modules/garmin/garmin.service.ts`: gera `code_verifier`/`code_challenge` PKCE; guarda o verifier criptografado dentro do `state` assinado para recuperar no callback sem nova tabela temporária.
  - `.env.example`: documentados endpoints OAuth corretos e alerta para não usar `https://apis.garmin.com/oauth/authorize`.
  - `README.md`: documentado que `GARMIN_API_BASE_URL` é para Wellness REST APIs, não authorize, e listados endpoints OAuth 2.0 PKCE corretos.
- Validação executada com sucesso:
  - `npm run build`
  - `npm run lint`

## Pendente / próximos passos
- Fazer deploy da branch `dev` atualizada para produção e retestar `GET /api/garmin/authorize/start?userId=demo-user`; a `authorizationUrl` esperada deve iniciar com `https://connect.garmin.com/oauth2Confirm` e conter `code_challenge`/`code_challenge_method=S256`.
- Rodrigo deve validar no portal Garmin se o app está habilitado no ambiente correto (evaluation/sandbox ou production) para OAuth 2.0 PKCE e se o redirect URI cadastrado bate exatamente com `https://itrainhealthy-api.xrunai.app/api/garmin/callback`.
- Configurar em produção, se quiser sobrescrever defaults:
  - `GARMIN_AUTHORIZATION_URL=https://connect.garmin.com/oauth2Confirm`
  - `GARMIN_TOKEN_URL=https://connectapi.garmin.com/di-oauth2-service/oauth/token`
  - `GARMIN_API_BASE_URL=https://apis.garmin.com`
- Manter `GARMIN_STATE_SECRET` e `GARMIN_TOKEN_ENCRYPTION_KEY` como segredos internos fortes gerados pela infra/app; Garmin não fornece esses valores.
- Aplicar/validar migrations Prisma no PostgreSQL de produção se ainda não estiverem aplicadas.
- Implementar auth real/JWT e remover o mecanismo temporário `userId` por query/header e o bootstrap MVP de usuário.
- Confirmar/revisar endpoints de dados Wellness reais e mapeamentos antes de habilitar sync real.

## Decisões tomadas
- Trocar authorize/token para OAuth 2.0 PKCE oficial do Garmin Connect Developer Program em vez de insistir em `/oauth/authorize` sob `apis.garmin.com`: corrige o erro `ApplicationNotFound` e alinha com a documentação Garmin.
- Manter `GARMIN_API_BASE_URL=https://apis.garmin.com` apenas para Wellness REST APIs: separa claramente OAuth de APIs de dados.
- Persistir `code_verifier` criptografado no `state` assinado: evita criar tabela/coluna temporária só para o callback e não expõe o verifier em texto claro no state.
- Não registrar client_id do teste no código/documentação: é identificador vindo da mensagem, não necessário para diagnóstico nem para commit.
- Não expor nem inspecionar segredos: alterações usam placeholders e defaults públicos de endpoint.

## Riscos e bloqueios conhecidos
- A correção precisa ser implantada; produção continuará apontando para URL antiga até deploy da branch corrigida.
- Se o app Garmin ainda não estiver aprovado/habilitado no ambiente correto ou se o redirect URI estiver diferente, a Garmin pode retornar outro erro após corrigirmos o endpoint.
- O callback/token exchange ainda não foi validado ponta-a-ponta com credenciais reais nesta sessão.
- O bootstrap MVP em produção permite criação idempotente de usuário pelo `userId` informado enquanto o endpoint estiver público; deve ser removido quando auth real entrar.
- `GARMIN_STATE_SECRET` e `GARMIN_TOKEN_ENCRYPTION_KEY` devem estar configuradas com valores longos/aleatórios em produção; não usar defaults de desenvolvimento.
