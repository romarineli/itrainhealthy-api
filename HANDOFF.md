# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `dev`; frontend `dev`.
- Última sessão: 2026-05-30

## O que foi feito
- Lido o contexto histórico deste `HANDOFF.md` antes de executar o escopo.
- Confirmado projeto iTrain Healthy pelo canal `#itrainhealthy`:
  - Backend/API: `/Users/irene/projects/itrainhealthy-api`
  - Frontend/Web: `/Users/irene/projects/itrainhealthy`
  - Handoff: `/Users/irene/projects/itrainhealthy-api/HANDOFF.md`
- Executado discovery obrigatório:
  - Backend iniciou em `tandy/migrate-backend-scaffold-nestjs`, depois foi criada/trocada branch local `dev` apontando para os commits NestJS/Garmin existentes.
  - Frontend iniciou em `main`, depois foi criada/trocada branch local `dev`.
- Backend validado na branch `dev`; ela contém os commits locais de scaffold NestJS e foundation Garmin:
  - `03329d6 refactor: migrate backend scaffold to nestjs`
  - `d83b059 feat: add garmin integration foundation`
- Frontend Vite React/TypeScript integrado ao fluxo Garmin do backend:
  - Criado client `src/lib/garminApi.ts` para `GET /api/garmin/authorize/start`, `GET /api/garmin/status`, `POST /api/garmin/sync` e `POST /api/garmin/disconnect`.
  - Dashboard passou a carregar status Garmin, exibir estados `loading`, `connected`, `disconnected`, `needs_configuration` e `error`.
  - CTA **Conectar Garmin** chama o start OAuth e redireciona para `authorizationUrl` quando o backend está configurado.
  - Adicionadas ações de atualização de status, sync manual e disconnect.
  - Mensagem explícita de pendência de credenciais Garmin quando o backend retorna `needs_configuration` ou `configured=false`.
  - UserId temporário do MVP centralizado via `VITE_MVP_USER_ID` com fallback local `demo-user`, enviado por query `userId` e header `x-user-id`.
- Documentação frontend atualizada:
  - `.env.example` com `VITE_API_BASE_URL` e `VITE_MVP_USER_ID`.
  - `README.md` documentando envs, userId temporário/TODO auth e endpoints Garmin consumidos.
- Validações executadas com sucesso:
  - Frontend: `npm run lint` e `npm run build`.
  - Backend: `npm run lint` e `npm run build`.
- Commit frontend criado localmente na branch `dev`:
  - `60a58d0 feat: connect dashboard to garmin api`
- Tentado push seguro para `origin/dev` nos dois repositórios usando header de autenticação temporário com `SANCHO_GITHUB_TOKEN`, sem gravar token no remote.
  - `git ls-remote --heads origin dev` autenticado não retornou branch remota `dev` para nenhum dos dois repositórios.
  - Push bloqueado para ambos por permissão do GitHub: `Write access to repository not granted` / HTTP 403.
  - `gh api repos/sys4u-br/itrainhealthy-api` e `gh api repos/sys4u-br/itrainhealthy` retornaram 404 para o token `sys4u-tandy`, indicando que o token não enxerga esses repositórios.

## Pendente / próximos passos
- Conceder ao usuário/token `sys4u-tandy` acesso aos repositórios `sys4u-br/itrainhealthy-api` e `sys4u-br/itrainhealthy` ou criar esses repositórios no GitHub com permissão de escrita.
- Após permissão/repo disponível, executar push de ambos:
  - Backend: `/Users/irene/projects/itrainhealthy-api`, branch local `dev`.
  - Frontend: `/Users/irene/projects/itrainhealthy`, branch local `dev`.
- Obter credenciais reais Garmin e configurar backend (`GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, `GARMIN_REDIRECT_URI`) para validar OAuth real.
- Aplicar migration Prisma em PostgreSQL real/local e validar fluxo com dados persistidos.
- Implementar auth real/JWT e remover userId temporário via env/query/header.
- Confirmar contratos reais Garmin para endpoints OAuth/token/refresh/revoke e endpoints de dados Health API.
- Adicionar testes unitários/integrados para o fluxo Garmin backend e client/frontend.

## Decisões tomadas
- Criar branch local `dev` em ambos os repositórios: pedido explícito de Rodrigo/Sancho para integrar e enviar a branch dev.
- Basear `dev` do backend na branch que já continha NestJS + Garmin foundation: preserva histórico local e evita perder os commits já feitos.
- Usar `POST /api/garmin/disconnect` no frontend: o backend aceita `POST` e `DELETE`; `POST` evita problemas de body em `DELETE` e mantém contrato simples no MVP.
- Manter `VITE_MVP_USER_ID` com fallback `demo-user`: permite validar integração antes de auth real, mas está documentado como TODO controlado.
- Não implementar admin nem auth real nesta sessão: fora do escopo explícito.
- Não fazer force push: remoto `dev` não foi encontrado e, de qualquer forma, push foi bloqueado por permissão.

## Riscos e bloqueios conhecidos
- Push remoto não concluído por falta de permissão/acesso do token aos repositórios iTrain Healthy no GitHub.
- Integração Garmin ainda depende de credenciais reais; sem elas o dashboard mostra estado de credenciais pendentes e não redireciona para OAuth real.
- Sem auth real, `VITE_MVP_USER_ID`/`x-user-id`/query `userId` é apenas mecanismo de MVP e não deve ser usado como autorização em produção.
- Backend ainda tem adapter de dados Garmin parcialmente stubado até confirmação da documentação/contratos aprovados.
- Migration Prisma Garmin foi criada em sessão anterior, mas ainda precisa ser aplicada/validada contra PostgreSQL.
