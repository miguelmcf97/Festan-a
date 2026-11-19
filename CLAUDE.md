# CLAUDE.md — instruções permanentes do projeto Planfest

Marketplace de serviços para festas e eventos com consultora de planejamento por IA. Praça piloto: Região Metropolitana do Rio de Janeiro. Idioma do produto, dos textos e da documentação: **português do Brasil**. Código (nomes de variáveis, tabelas, enums) em inglês.

## Princípios inegociáveis

1. **A IA nunca inventa** fornecedores, preços de fornecedor, avaliações, disponibilidade ou dados de mercado. Fornecedor só é recomendado se vier de `searchProviders` (ferramenta `buscar_fornecedores`).
2. **Números do planejamento vêm do servidor** (`computePlan`), nunca do texto do modelo, e são sempre rotulados como **estimativa**.
3. **Estimativa ≠ solicitação ≠ proposta ≠ reserva ≠ contratação confirmada.** Toda mudança de estado passa por `src/lib/quote-rules.ts` + `src/server/services/quotes.ts`. Não crie atalhos que pulem estados.
4. **Nada financeiro fictício apresentado como real.** O MVP não processa pagamentos; não grave em `transactions` até a integração real (Fase 4).
5. **Dados de demonstração sempre identificados** (`is_demo = true` + selo "Demonstração"). O seed é bloqueado em produção.
6. **Segurança antes de velocidade:** toda página/ação privada chama `requireUser(roles)` e filtra pelo dono; entradas validadas com zod; nada de dados pessoais em URL; CPF/CNPJ nunca público.
7. **Produção é sagrada:** nenhuma operação destrutiva, migração manual ou deploy em produção sem autorização explícita do fundador. Use homologação primeiro (`scripts/deploy.sh staging`).
8. **Decisões estratégicas** (modelo de cobrança, mudança de stack, nova praça) → apresentar alternativas e pedir aprovação.

## Stack e comandos

- Next.js 16 (App Router, `src/proxy.ts` em vez de middleware; `params`/`searchParams`/`cookies()` são assíncronos), React 19, TypeScript, Tailwind 4.
- PostgreSQL 16 + Drizzle ORM. Schema em `src/server/db/schema.ts`; migrações em `drizzle/`.
- IA: `src/server/ai/` — `PlannerEngine` (Anthropic ou `RulesEngine` demo), prompts versionados em `prompts.ts` (`PROMPT_VERSION`), ferramentas em `tools.ts`.

```bash
cp .env.example .env            # ajuste DATABASE_URL; sem ANTHROPIC_API_KEY a IA roda em modo demonstração
npm install
npm run db:migrate && npm run db:seed
npm run dev                     # http://localhost:3000  (logins demo: senha planfest123)
npm run typecheck && npm test && npm run build
python3 tests/e2e.py            # E2E (servidor rodando + seed)
python3 scripts/financial_model.py   # modelo financeiro
```

Mudou o schema? `npm run db:generate` (gera SQL em `drizzle/`), revise o SQL, rode `npm run db:migrate`. Nunca edite migrações já aplicadas.

## Convenções

- Dinheiro em **centavos** (`integer`). Converta com `reaisToCents` / exiba com `formatBRL`.
- Rótulos de status em `src/lib/format.ts`; badges em `src/components/status.tsx`.
- Server Actions em `actions.ts` por área; só exporte funções que podem ser chamadas pelo cliente (helpers vão para `src/server/services`).
- Componentes visuais em `src/components/ui.tsx`. Paleta: tinta `ink` #2A1846, ação `pitanga` #E5384F, destaque `maracuja` #FFC23D, confirmado `folha` #0F8A68. Fontes: Bricolage Grotesque (títulos) e Figtree (texto). Sem caixa alta em rótulos, sem gradientes decorativos.
- Textos de interface: frases curtas, voz ativa, o botão diz o que acontece ("Enviar proposta"), erros dizem como resolver.
- Alterou comportamento da IA? Crie nova `PROMPT_VERSION` e rode a avaliação de `docs/PLANO_DE_TESTES.md` §3.
- Novas regras de negócio: atualize `docs/REGRAS_DE_NEGOCIO.md` no mesmo commit.

## Documentação

`docs/` contém visão do produto, proposta de valor, modelo de negócios, mercado, concorrentes, go-to-market, plano financeiro, roadmap, arquitetura, regras de negócio e plano de testes. Dados de mercado sempre com fonte e data; hipóteses marcadas como tal.

## Pendências conhecidas

- Código do protótipo original (Lovable "Festança") não foi importado: o repositório GitHub `Festan-a` estava vazio. Para portar componentes, conectar o projeto Lovable ao GitHub.
- Upload de fotos, e-mail/WhatsApp, login Google, recuperação de senha, pagamentos: ver `docs/ROADMAP_DE_CRESCIMENTO.md`.
- Textos de termos e privacidade são minutas — revisão jurídica antes do lançamento.
