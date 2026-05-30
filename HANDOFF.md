# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `tandy/migrate-backend-scaffold-nestjs`.
- Última sessão: 2026-05-30

## O que foi feito
- Lido o contexto histórico deste `HANDOFF.md` antes de executar o escopo.
- Confirmado projeto iTrain Healthy:
  - Backend/API: `/Users/irene/projects/itrainhealthy-api`
  - Frontend/Web: `/Users/irene/projects/itrainhealthy` (não alterado nesta sessão)
  - Handoff: `/Users/irene/projects/itrainhealthy-api/HANDOFF.md`
- Criada branch local `tandy/migrate-backend-scaffold-nestjs` a partir de `main` para evitar commit direto na branch base.
- Migrado o scaffold inicial do backend de Express para NestJS, mantendo Node.js + TypeScript + Prisma + PostgreSQL.
- Criada estrutura NestJS idiomática com `AppModule`, `main.ts`, `HealthModule/HealthController`, módulos `auth`, `users`, `profile`, `consents`, `garmin`, `whatsapp` e `readiness`.
- Implementado `GET /health` via controller NestJS, retornando `{ status: "ok", service: "itrainhealthy-api" }`.
- Criado `PrismaModule` global e `PrismaService` injetável. O serviço não força conexão no bootstrap para permitir health check sem banco local ativo; a conexão acontecerá quando operações Prisma reais forem usadas.
- Preservado `prisma/schema.prisma` inicial com modelos `User`, `Profile`, `Consent`, `Integration` e `ReadinessSnapshot`.
- Atualizados `package.json`, `package-lock.json`, `tsconfig.json`, `nest-cli.json`, `README.md` e ESLint config para NestJS.
- Mantidos adapters stubs para Garmin e WhatsApp, agora como providers injetáveis NestJS.
- Executadas validações:
  - `npm install` — sucesso; após atualização para NestJS 11, `npm audit --omit=dev` retornou 0 vulnerabilidades.
  - `npm run prisma:generate` — sucesso.
  - `npm run lint` — sucesso.
  - `npm run build` — sucesso.
  - `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/itrainhealthy?schema=public' npm run start` + `curl http://localhost:3000/health` — sucesso para health check.
- Não foram adicionados tokens ou segredos; `.env` permanece ignorado e somente `.env.example` contém placeholders.

## Pendente / próximos passos
- Implementar autenticação real e sessão/usuário atual além dos stubs de MVP.
- Implementar OAuth Garmin real, callback, armazenamento seguro/criptografado de tokens e sincronização inicial de dados.
- Definir e implementar fórmula v1 do score de prontidão.
- Implementar consentimentos reais para Garmin, WhatsApp, termos de uso e política de privacidade.
- Implementar provider WhatsApp real e templates/mensagens com opt-in explícito.
- Conectar frontend aos endpoints reais quando contratos deixarem de ser stubs.
- Adicionar testes automatizados (unitários/integrados) quando os fluxos reais forem implementados.
- Criar migrations Prisma reais com banco PostgreSQL disponível (`npm run prisma:migrate`).
- Fazer push/PR quando autorizado; nesta sessão foi solicitado explicitamente não fazer push.

## Decisões tomadas
- Backend oficial do projeto será NestJS + Prisma + PostgreSQL: Rodrigo questionou corretamente o scaffold Express; o scaffold Express anterior foi corrigido para arquitetura NestJS modular.
- Usar NestJS 11: evita vulnerabilidades conhecidas reportadas pelo `npm audit` em versões anteriores do ecossistema NestJS/Express transitivo.
- Não conectar Prisma no bootstrap: mantém `GET /health` disponível mesmo quando o PostgreSQL local não está rodando, sem impedir configuração do Prisma para uso real.
- Manter Garmin e WhatsApp como adapters stubs injetáveis: evita falsa integração e deixa pontos de extensão claros para provedores reais.
- Não alterar frontend: o contrato HTTP público inicial foi preservado, então não houve necessidade de ajuste no frontend.

## Riscos e bloqueios conhecidos
- Endpoints de auth/users/profile/consents/readiness ainda retornam dados stubs; não há segurança, multiusuário real ou autorização.
- Tokens Garmin/WhatsApp no schema estão apenas como campos planejados; antes de produção precisam criptografia em repouso e política de rotação.
- Não há banco PostgreSQL/migrations aplicadas nesta sessão; apenas `prisma generate` e bootstrap/health sem query real foram validados.
- Repositório local indica remoto `origin/main` como `[gone]`; push/PR exigirá nova validação do remoto/credenciais quando autorizado.
