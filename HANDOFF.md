# HANDOFF — iTrain Healthy

## Status atual
- Branch ativa: backend `tandy/migrate-backend-scaffold-nestjs`.
- Última sessão: 2026-05-30

## O que foi feito
- Lido o contexto histórico deste `HANDOFF.md` antes de executar o escopo.
- Confirmado projeto iTrain Healthy pelo canal `#itrainhealthy`:
  - Backend/API: `/Users/irene/projects/itrainhealthy-api`
  - Frontend/Web: `/Users/irene/projects/itrainhealthy` (inspecionado; não alterado nesta sessão)
  - Handoff: `/Users/irene/projects/itrainhealthy-api/HANDOFF.md`
- Mantida a branch local `tandy/migrate-backend-scaffold-nestjs`, que estava com working tree limpo, preservando o scaffold NestJS existente.
- Implementada foundation Garmin no backend NestJS:
  - `GET /api/garmin/authorize/start` para iniciar OAuth.
  - Alias temporário `GET /api/garmin/connect` preservado para compatibilidade.
  - `GET /api/garmin/callback` para receber `code/state` e persistir tokens criptografados.
  - `GET /api/garmin/status` para status da conexão.
  - `DELETE /api/garmin/disconnect` e `POST /api/garmin/disconnect` para desconexão local e tentativa futura de revoke remoto.
  - `POST /api/garmin/sync` para sync manual inicial, com janela padrão de últimos 90 dias.
- Criados DTOs/interfaces para token exchange/refresh, status, disconnect, sync manual e métricas normalizadas base: HRV, sono, VO2, atividades e carga de treino.
- Substituído adapter stub Garmin por adapter configurável via env para OAuth/token/refresh e stub seguro para endpoints de dados, sem inventar contrato Garmin não aprovado.
- Implementada assinatura de `state` OAuth e criptografia AES-256-GCM para tokens em repouso; tokens não são expostos em logs.
- Implementado userId temporário via `x-user-id` ou query `userId`, documentado como TODO controlado para futura auth real. Em ambiente não-produção, o start OAuth cria usuário placeholder para satisfazer FK Prisma; em produção não cria.
- Atualizado `prisma/schema.prisma` com `GarminConnection`, `GarminSyncLog`, `GarminMetric`, `GarminSyncStatus` e `GarminMetricType`.
- Criada migration SQL local em `prisma/migrations/20260531000000_add_garmin_foundation/migration.sql` via `prisma migrate diff --from-empty`; não aplicada em banco local nesta sessão.
- Atualizados `.env.example`, `src/config/env.ts` e `README.md` com variáveis e instruções Garmin.
- Validações executadas com sucesso no backend:
  - `npm run prisma:generate`
  - `npm run lint`
  - `npm run build`

## Pendente / próximos passos
- Obter credenciais reais Garmin e validar app/API aprovada.
- Confirmar contratos reais da Garmin para authorize/token/refresh/revoke e endpoints de dados Health API; ajustar paths/payloads do adapter conforme documentação aprovada.
- Aplicar migration em PostgreSQL real/local e validar fluxo com dados persistidos.
- Implementar mapeamento real de payloads Garmin para `GarminMetric`.
- Implementar auth real/JWT e substituir o `x-user-id`/`userId` temporário e criação placeholder de usuário.
- Conectar frontend ao endpoint `GET /api/garmin/authorize/start` quando UX do login/usuário estiver definida.
- Adicionar testes unitários/integrados para state OAuth, criptografia, callback, disconnect e sync.
- Definir e implementar fórmula v1 do score de prontidão usando métricas normalizadas.
- Fazer push/PR quando autorizado; nesta sessão foi solicitado explicitamente não fazer push.

## Decisões tomadas
- Continuar na branch `tandy/migrate-backend-scaffold-nestjs`: a branch estava limpa e contém o scaffold NestJS que deve ser preservado.
- Não implementar diagnóstico médico: Garmin foundation apenas importa/normaliza métricas base para features futuras de bem-estar/prontidão.
- Não chamar endpoints de dados Garmin reais sem contrato aprovado: evita falsa integração, vazamento de tokens para URLs incorretas e mapeamentos inválidos.
- Criptografar tokens antes de persistir: reduz risco de exposição em repouso; `GARMIN_TOKEN_ENCRYPTION_KEY` deve ser configurado antes de produção.
- Usar `state` OAuth assinado e expirável: reduz risco de callback forjado no fluxo MVP.
- Manter userId explícito apenas como solução temporária documentada: compatível com futura auth sem transformar em autorização definitiva.

## Riscos e bloqueios conhecidos
- Integração Garmin ainda depende de credenciais reais e validação da API aprovada.
- Endpoints OAuth foram implementados em padrão OAuth2 configurável; Garmin pode exigir ajustes específicos após acesso à documentação/portal do app aprovado.
- Migration SQL foi gerada, mas não aplicada/validada contra banco PostgreSQL em execução nesta sessão.
- Sem auth real, `x-user-id`/query `userId` é apenas mecanismo de desenvolvimento/MVP e não deve ir para produção como autorização.
- `GARMIN_TOKEN_ENCRYPTION_KEY` vazio usa fallback local apenas em desenvolvimento; produção deve bloquear sem chave real.
- Repositório local já indicava remoto `origin/main` como `[gone]` em sessão anterior; push/PR exigirá nova validação do remoto/credenciais quando autorizado.
