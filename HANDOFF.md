# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `main` (primeiro commit local do scaffold MVP preparado nesta sessão), frontend `main` (primeiro commit local do scaffold MVP preparado nesta sessão).
- Última sessão: 2026-05-30

## O que foi feito
- Lido o contexto histórico deste `HANDOFF.md` antes de executar o escopo.
- Confirmado roteamento do projeto iTrain Healthy:
  - Backend/API: `/Users/irene/projects/itrainhealthy-api`
  - Frontend/Web: `/Users/irene/projects/itrainhealthy`
  - Handoff: `/Users/irene/projects/itrainhealthy-api/HANDOFF.md`
- Criado scaffold inicial do backend em Node.js + TypeScript + Express + Prisma + PostgreSQL.
- Criada estrutura modular backend para `auth`, `users`, `profile`, `consents`, `garmin`, `whatsapp` e `readiness`.
- Criado `GET /health` e endpoints stubs iniciais sob `/api/*` para manter contrato mínimo do MVP.
- Criado `prisma/schema.prisma` inicial com modelos `User`, `Profile`, `Consent`, `Integration` e `ReadinessSnapshot`.
- Criadas interfaces/adapters stubs para Garmin e WhatsApp, sem OAuth Garmin real e sem envio WhatsApp real.
- Criados `package.json`, `tsconfig.json`, `eslint.config.js`, `.gitignore`, `.env.example` e `README.md` no backend.
- Criado scaffold inicial do frontend em Vite + React + TypeScript.
- Criada tela inicial do dashboard MVP com placeholders para status Garmin, score de prontidão, status WhatsApp e CTA de conectar Garmin.
- Criados `package.json`, configurações TypeScript/Vite/ESLint, `.gitignore`, `.env.example` e `README.md` no frontend.
- Instaladas dependências com `npm install` nos dois repositórios, gerando `package-lock.json`.
- Validações executadas:
  - Backend: `npm run prisma:generate`, `npm run lint`, `npm run build` — sucesso.
  - Frontend: `npm run lint`, `npm run build` — sucesso após adicionar `src/vite-env.d.ts`.
- Não foram adicionados tokens ou segredos; `.env` permanece ignorado.

## Pendente / próximos passos
- Implementar autenticação real e sessão/usuário atual além dos stubs de MVP.
- Implementar OAuth Garmin real, callback, armazenamento seguro/criptografado de tokens e sincronização inicial de dados.
- Definir e implementar fórmula v1 do score de prontidão.
- Implementar consentimentos reais para Garmin, WhatsApp, termos de uso e política de privacidade.
- Implementar provider WhatsApp real e templates/mensagens com opt-in explícito.
- Conectar frontend aos endpoints reais quando contratos deixarem de ser stubs.
- Adicionar testes automatizados (unitários/integrados) quando os fluxos reais forem implementados.
- Criar migrations Prisma reais com banco PostgreSQL disponível (`npm run prisma:migrate`).
- Fazer push/PR quando autorizado; nesta sessão foi solicitado sem push.

## Decisões tomadas
- Usar Express no backend: scaffold enxuto e compatível com APIs REST modulares do MVP.
- Manter Garmin e WhatsApp como adapters stubs: evita falsa integração e deixa pontos de extensão claros para provedores reais.
- Usar Prisma com PostgreSQL desde o início: atende stack alvo e prepara migrations/contratos persistentes.
- Não implementar admin neste momento: Rodrigo confirmou MVP v1 sem admin.
- Criar dashboard estático com placeholders no frontend: permite evolução visual e integração progressiva sem bloquear no backend real.
- Usar `.env.example` sem valores sensíveis e `.gitignore` protegendo `.env*`: reduz risco de vazamento de segredos.

## Riscos e bloqueios conhecidos
- Endpoints de auth/users/profile/consents/readiness ainda retornam dados stubs; não há segurança, multiusuário real ou autorização.
- Tokens Garmin/WhatsApp no schema estão apenas como campos planejados; antes de produção precisam criptografia em repouso e política de rotação.
- Não há banco PostgreSQL/migrations aplicadas nesta sessão; apenas `prisma generate` foi validado.
- `gh repo view` havia falhado em sessão anterior apesar de `git ls-remote` funcionar; push/PR pode exigir nova validação de credenciais.
- Repositórios continuam sem push remoto nesta sessão conforme orientação de não fazer push direto.
