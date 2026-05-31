# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev` rastreando `origin/dev`; frontend `dev` rastreando `origin/dev`.
- Última sessão: 2026-05-31
- Canal/projeto: `#itrainhealthy` / `channel:1510376273623650384` → iTrain Healthy.
- Backend/API: `/Users/irene/projects/itrainhealthy-api` (alias dispatch: `/workspace/projects/itrainhealthy-api`).
- Frontend/Web: `/Users/irene/projects/itrainhealthy` (alias dispatch: `/workspace/projects/itrainhealthy`).
- Último push frontend `dev`: `006f5899da8ed518dbf3f0bd5f677ae9e1655054` (`fix: add vercel spa fallback`).

## O que foi feito
- Lido este `HANDOFF.md` antes da execução e feito discovery obrigatório com `pwd` + `git status --short --branch` nos repos backend e frontend.
- Investigado 404 na Vercel ao abrir rota direta do frontend: `https://itrainhealthy.xrunai.app/integrations/garmin/success?provider=garmin&status=connected`.
- Confirmado que o frontend é Vite/React SPA e não havia `vercel.json` no repo frontend.
- Adicionado `vercel.json` no frontend com rewrite SPA para enviar rotas profundas sem extensão para `/index.html`, preservando assets estáticos e arquivos com extensão.
- Atualizado `README.md` do frontend com orientação sobre fallback SPA na Vercel.
- Sincronizado frontend com `origin/dev` antes do commit; havia um commit remoto novo, então as alterações locais foram preservadas via stash temporário e reaplicadas após fast-forward.
- Validação frontend executada com sucesso:
  - `npm run build`
  - `npm run lint`
- Commit/push frontend concluído em `origin/dev`:
  - `006f5899da8ed518dbf3f0bd5f677ae9e1655054` (`fix: add vercel spa fallback`).

## Pendente / próximos passos
- Rodrigo deve redeployar o frontend na Vercel a partir de `origin/dev`.
- Após deploy, testar rota direta:
  - `https://itrainhealthy.xrunai.app/integrations/garmin/success?provider=garmin&status=connected`
  - `https://itrainhealthy.xrunai.app/integrations/garmin/error?provider=garmin&status=error&message=connection_failed`
- Retestar fluxo OAuth Garmin completo: backend callback deve redirecionar para a página frontend de sucesso sem 404.
- Configurar produção com `FRONTEND_URL=https://itrainhealthy.xrunai.app` e, se necessário, `GARMIN_SUCCESS_REDIRECT_URL`/`GARMIN_ERROR_REDIRECT_URL` explícitas.
- Aplicar/validar migrations Prisma no PostgreSQL de produção se ainda não estiverem aplicadas.
- Implementar auth real/JWT e remover o mecanismo temporário `userId` por query/header e o bootstrap MVP de usuário.
- Confirmar/revisar endpoints de dados Wellness reais e mapeamentos antes de habilitar sync real.

## Decisões tomadas
- Usar `vercel.json` com rewrite para `/index.html`: é a correção mínima e padrão para SPA React/Vite em Vercel com rotas client-side.
- Não reescrever assets/arquivos estáticos com extensão: evita quebrar JS/CSS gerados pelo Vite e arquivos públicos como favicon/robots/manifest.
- Não alterar backend nesta sessão além deste handoff: o problema era exclusivamente fallback de hospedagem frontend.

## Riscos e bloqueios conhecidos
- A correção só terá efeito após novo deploy do frontend na Vercel.
- Se a Vercel estiver configurada com root directory diferente do repo frontend, confirmar que `vercel.json` está no diretório raiz efetivo do projeto implantado.
- A página de sucesso confirma o retorno do OAuth, mas o dashboard ainda deve consultar `/api/garmin/status` para refletir status real pós-conexão.
- O bootstrap MVP em produção permite criação idempotente de usuário pelo `userId` informado enquanto o endpoint estiver público; deve ser removido quando auth real entrar.
- `GARMIN_STATE_SECRET` e `GARMIN_TOKEN_ENCRYPTION_KEY` devem estar configuradas com valores longos/aleatórios em produção; não usar defaults de desenvolvimento.
