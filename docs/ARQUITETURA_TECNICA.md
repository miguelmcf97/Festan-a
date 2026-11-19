# Arquitetura técnica

> Última revisão: 19/11/2026

## 1. Decisões e justificativas

| Decisão | Escolha | Por quê | Alternativas descartadas |
|---|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | SSR para SEO local; front e back no mesmo serviço (1 container na VPS); Server Actions com checagem de origem | Vite/React do Lovable + API separada (2 serviços, SEO fraco) |
| Banco | **PostgreSQL 16** | Relacional, transações para o fluxo comercial, JSONB para preferências; PostGIS disponível para o futuro | — |
| ORM / migrações | **Drizzle ORM + drizzle-kit** | TypeScript puro, sem binários nativos (Prisma precisa baixar engines — bloqueado no ambiente de build e mais peso na imagem); SQL de migração legível em `drizzle/` | Prisma |
| Estilo | **Tailwind CSS 4** + componentes próprios (`src/components/ui.tsx`) | Leve, sem dependência de biblioteca de componentes | shadcn/ui (possível no futuro) |
| Fontes | Bricolage Grotesque + Figtree via `@fontsource` (self-hosted) | Sem chamada a terceiros (CSP e LGPD) | Google Fonts em runtime |
| IA | **Claude (Anthropic API)** via interface `PlannerEngine`; padrão `claude-sonnet-5-5` | Tool use nativo; troca de modelo/fornecedor sem tocar regra de negócio | Acoplar regra ao SDK |
| Autenticação | Própria: bcrypt (custo 12) + sessão em banco (token aleatório, só o SHA-256 é salvo) + cookie httpOnly/SameSite=Lax/Secure | Controle total, sem serviço externo, revogação imediata | Auth.js (pode ser adotado para login Google na Fase 2) |
| Deploy | Docker (Next standalone) + Nginx no host + certbot | Barato, previsível, portável | PaaS |

## 2. Estrutura de pastas

```
src/
  app/                 rotas (páginas, server actions, API)
    planejar/          chat com IA (cliente) + ações de solicitação
    fornecedores/      catálogo e perfil público
    painel/            área do cliente
    fornecedor/        área do fornecedor
    admin/             administração
    api/ai/chat        endpoint do chat (rate limited)
    api/health         healthcheck
  components/          UI reutilizável
  lib/                 funções puras (formatação, geo, CPF/CNPJ, máquina de estados)
  server/
    db/schema.ts       modelo de dados (fonte da verdade)
    auth.ts            sessões, papéis, auditoria
    ai/                motor de IA: prompts, ferramentas, engines, extração, orquestrador
    services/          regras de negócio (busca, planejamento, solicitações/propostas/contratações)
    security/          rate limiting
  proxy.ts             redireciona áreas privadas sem sessão (Next 16 "proxy", ex-middleware)
drizzle/               migrações SQL
scripts/               seed demo, modelo financeiro, backup, deploy
deploy/nginx/          configuração do proxy reverso
docs/                  documentação de produto, negócio e técnica
tests/                 unitários (vitest) e E2E (Playwright)
```

## 3. Módulos (mapeamento do briefing)

| # | Módulo | Onde |
|---|---|---|
| 1–2 | Autenticação e usuários | `server/auth.ts`, `app/auth-actions.ts`, `app/entrar`, `app/cadastrar` |
| 3 | Prestadores | `app/seja-fornecedor`, `app/fornecedor`, `server/services/providers.ts` |
| 4–5 | Categorias e serviços | tabelas `categories` (árvore, editável no admin) e `services` |
| 6 | Busca e geolocalização | `server/services/search.ts` (Haversine + raio + áreas atendidas + agenda + capacidade) |
| 7 | Planejamento de eventos | `server/services/planning.ts` (pacotes por tipo, estimativas, alocação, versões) |
| 8–9 | IA e recomendações | `server/ai/*` |
| 10–12 | Solicitações, propostas, contratações | `server/services/quotes.ts` + `lib/quote-rules.ts` (máquina de estados) |
| 13 | Avaliações | `reviews` (1 por contratação concluída, moderação) |
| 14 | Notificações | tabela `notifications` (no app); e-mail/WhatsApp na Fase 2 via fila |
| 15 | Administração | `app/admin/*` |
| 16–17 | Monetização e pagamentos futuros | `platform_settings` (parâmetros) e `transactions` (reservada; o MVP não grava) |

## 4. Modelo de dados (resumo)

```
users ─┬─< sessions
       ├─< providers ─┬─< provider_categories >─ categories (árvore parent_id)
       │              ├─< provider_service_areas >─ locations
       │              ├─< services, portfolio_items, availability
       │              └─< reviews
       ├─< events ─┬─< event_plans ─< plan_items >─ categories
       │           ├─< ai_conversations ─< ai_messages
       │           └─< quote_requests ─┬─< quote_messages
       │                               └─< proposals ─── bookings ─┬── reviews
       │                                                           └─< transactions (futuro)
       ├─< notifications, complaints, audit_logs
platform_settings (chave/valor JSON)
```

Regras de integridade relevantes: `quote_requests (event_id, provider_id, category_id)` único; `bookings.proposal_id` único; `reviews.booking_id` único; `availability (provider_id, date)` único; dinheiro sempre em centavos (`integer`).

## 5. Arquitetura da IA

```
Navegador ──POST /api/ai/chat──► rate limit (usuário/visitante + IP)
                                   │
                                   ▼
                          agent.chat()  ── carrega conversa (dono verificado)
                                   │      monta system prompt versionado com:
                                   │      catálogo de categorias + estado do evento (JSON) + plano atual
                                   ▼
                    PlannerEngine (getEngine)
          ┌────────────────────────┴───────────────────────┐
   AnthropicEngine (Claude, tool use,               RulesEngine (modo demonstração:
   até 6 rodadas, cache do system prompt)           extração por regras, mesmas ferramentas)
          └────────────────────────┬───────────────────────┘
                                   ▼
          Ferramentas (tools.ts) — ÚNICA ponte com os dados:
            atualizar_evento      → grava no evento; resolve bairro → locations
            montar_planejamento   → planning.computePlan (números calculados no servidor) → event_plans
            buscar_fornecedores   → search.searchProviders (somente APPROVED, filtros reais)
            verificar_disponibilidade → availability
                                   ▼
          Persistência: ai_messages (USER/ASSISTANT/TOOL + payload), tokens e custo em ai_conversations
          Resposta: texto + UiPayload { plano, recomendações (cards) } + estado do evento
```

Controles: histórico limitado a 12 mensagens (o estado vai estruturado), `max_tokens` 1.500, validação zod de todas as entradas de ferramenta, categorias desconhecidas ignoradas e reportadas, erro do provedor → mensagem amigável sem perder o plano. Versão do prompt em `PROMPT_VERSION`; nova versão = novo identificador (não editar o histórico).

**Configuração:** `AI_PROVIDER=anthropic|demo-rules`, `AI_MODEL`, `ANTHROPIC_API_KEY`. Sem chave → modo demonstração, sinalizado na interface.

## 6. Segurança e LGPD

| Controle | Implementação |
|---|---|
| Senhas | bcrypt custo 12; mínimo 8 caracteres |
| Sessão | token de 256 bits; banco guarda só o hash; expira em 30 dias; revogada ao suspender usuário |
| Autorização | `requireUser(roles)` em toda página/ação privada; consultas sempre filtradas pelo dono (ex.: `consumer_id = usuário`) |
| CSRF | Server Actions do Next verificam origem; cookies SameSite=Lax |
| Rate limiting | login, cadastro, chat de IA, solicitações (app) + `limit_req` no Nginx |
| Cabeçalhos | CSP restritiva, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy |
| Open redirect | `next` aceita só caminhos internos |
| Enumeração de contas | mesma mensagem para e-mail inexistente e senha errada |
| Dados pessoais | CPF/CNPJ nunca exibido (mascarado no admin); telefone/e-mail do cliente só para o fornecedor após contratação confirmada (e vice-versa); IA não recebe dados sensíveis |
| Auditoria | `audit_logs` para login, cadastro, decisões de admin, propostas, aceites, cancelamentos |
| Consentimento | aceite de termos com data (`lgpd_consent_at`); marketing opcional |
| Direitos do titular | status `ANONYMIZED` previsto; rotina de anonimização na Fase 2 |
| Backups | `pg_dump` diário, 14 dias locais + cópia externa criptografada (rclone) |

## 7. Infraestrutura na VPS

- **VPS sugerida para o MVP:** 2 vCPU, 4 GB RAM, 80 GB SSD (homologação + produção na mesma máquina, isoladas por projeto Compose, banco e volume próprios). Ao passar de ~5 mil usuários/dia, separar o banco.
- **Ambientes:** desenvolvimento (local, seed demo), homologação (`homolog.` com senha e `noindex`, porta 3101) e produção (porta 3100). Variáveis em `.env.staging` / `.env.production` (fora do git).
- **Fluxo de atualização:** `scripts/deploy.sh staging` → validar → `scripts/deploy.sh production` (pede confirmação e faz backup antes). Migrações rodam no serviço `migrate` antes do `app` subir.
- **Monitoramento:** `/api/health` (app + banco) em serviço de uptime externo; logs JSON com rotação no Docker; alertas de disco/memória do provedor da VPS. Fase 2: Sentry para erros e painel de custo de IA.
- **SSL e domínio:** certbot no Nginx; redirecionamento 80→443; HSTS.
- **Regras operacionais:** seed demo é bloqueado com `APP_ENV=production`; nenhuma operação destrutiva em produção sem autorização registrada.

## 8. Caminho de escala

1. Rate limiting e sessões em Redis (necessário ao rodar mais de uma instância).
2. Busca geográfica no banco com PostGIS (hoje: filtro em memória sobre até 500 candidatos — suficiente para milhares de fornecedores por praça).
3. Fila (BullMQ/Redis) para e-mail/WhatsApp, recálculo de métricas e calibração de estimativas.
4. Armazenamento de imagens em S3 compatível + CDN.
5. Cidade como dimensão do catálogo (multi-praça); réplicas de leitura do Postgres.
6. Pagamentos: tabela `transactions` já modelada (PAYMENT, PAYOUT, PLATFORM_FEE, REFUND, SUBSCRIPTION) com `external_id` único para idempotência de webhooks.
