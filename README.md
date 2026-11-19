# Planfest

> Você imagina a festa. Nossa inteligência artificial ajuda a planejar. Nossa plataforma encontra quem pode realizar.

Marketplace de serviços para festas com consultora de planejamento por IA — piloto na Região Metropolitana do Rio de Janeiro.

## Rodar localmente

Pré-requisitos: Node 22+, PostgreSQL 16.

```bash
cp .env.example .env          # ajuste DATABASE_URL
npm install
npm run db:migrate            # cria as tabelas
npm run db:seed               # dados de DEMONSTRAÇÃO (bloqueado em produção)
npm run dev                   # http://localhost:3000
```

Contas demo (senha `planfest123`): `cliente@planfest.demo`, `fornecedor@planfest.demo`, `admin@planfest.demo`.

**IA:** sem `ANTHROPIC_API_KEY`, o planejador roda em modo demonstração (regras, mesmo catálogo e mesmos cálculos). Com a chave, usa Claude (`AI_MODEL`, padrão `claude-sonnet-5-5`).

## Qualidade

```bash
npm run typecheck
npm test                      # unitários (vitest)
npm run build
python3 tests/e2e.py          # E2E com Playwright (servidor rodando + seed)
```

## Implantação (VPS)

Docker + Nginx + certbot, homologação e produção separadas. Ver `docs/ARQUITETURA_TECNICA.md` §7 e `scripts/deploy.sh`.

## Documentação

| Documento | Conteúdo |
|---|---|
| [Visão do produto](docs/VISAO_DO_PRODUTO.md) | Diagnóstico do protótipo Lovable, visão, jornadas, MVP, diferenciais da IA |
| [Proposta de valor](docs/PROPOSTA_DE_VALOR.md) | Consumidor e fornecedor |
| [Modelo de negócios](docs/MODELO_DE_NEGOCIOS.md) | Comparação A/B/C/D e recomendação faseada |
| [Análise de mercado](docs/ANALISE_DE_MERCADO.md) | Dados com fonte, TAM/SAM/SOM |
| [Concorrentes](docs/ANALISE_DE_CONCORRENTES.md) | Mapa competitivo e diferenciais |
| [Go-to-market](docs/ESTRATEGIA_DE_GO_TO_MARKET.md) | Fases 1–4 no Rio, aquisição, retenção, KPIs |
| [Plano financeiro](docs/PLANO_FINANCEIRO.md) | 3 cenários, sensibilidade, unit economics |
| [Roadmap](docs/ROADMAP_DE_CRESCIMENTO.md) | Sprints, riscos, estratégia de crescimento |
| [Arquitetura](docs/ARQUITETURA_TECNICA.md) | Stack, módulos, dados, IA, segurança, VPS |
| [Regras de negócio](docs/REGRAS_DE_NEGOCIO.md) | Estados, busca, estimativas, avaliações, privacidade |
| [Plano de testes](docs/PLANO_DE_TESTES.md) | Automatizados, manuais, avaliação da IA |
