# Estratégia de go-to-market — RM do Rio de Janeiro

> Última revisão: 19/11/2026 · Praça aprovada: Região Metropolitana do Rio de Janeiro

## 1. Recorte inicial

- **Ocasiões foco (wedge):** aniversários infantis, 15 anos, chás de bebê/revelação. Motivos: alta frequência (todo ano), decisão rápida, ticket acessível e muitos fornecedores pequenos sem canal digital. Casamento entra na Fase 3 (ticket alto, mas ciclo de ~7 meses e concorrência especializada).
- **Zonas iniciais:** Zona Oeste (Barra, Recreio, Jacarepaguá, Campo Grande) e Zona Norte (Tijuca, Méier, Madureira), depois Niterói/São Gonçalo e Baixada. Critério: densidade de famílias + concentração de casas de festa [HIPÓTESE a validar com dados de busca e mapeamento de campo].
- **Categorias prioritárias (12 de 21):** espaços, buffet, churrasco, doces e bolos, decoração, brinquedos infláveis, recreação, personagens, DJ, fotografia, mesas e cadeiras, pipoca/algodão doce.

## 2. Fases

### Fase 1 — Formação da oferta (meses 0–3)
- Meta: **150 fornecedores aprovados**, ≥ 8 por categoria prioritária em cada zona inicial, ≥ 40% verificados.
- Táticas:
  1. Equipe de campo (1–2 pessoas) visitando polos de festas (ex.: comércio de artigos de festa no Saara, no Centro) e casas de festa; cadastro assistido em 10 minutos pelo celular.
  2. Lista de fornecedores ativos no Instagram por categoria/bairro → abordagem por DM com "perfil gratuito + pedidos qualificados".
  3. Parceria com associações (Abrafesta, Asbrafe) e fornecedores-âncora (buffets que indicam parceiros).
  4. Programa "Fundador": selo, gratuidade estendida (12 meses após o início da cobrança) e prioridade de exibição para os 100 primeiros verificados.
- Qualidade: aprovação manual, verificação de documento e contato, checagem de portfólio.

### Fase 2 — MVP aberto (meses 3–6)
- Meta: **100 eventos/mês com pedido de orçamento**, taxa de resposta ≥ 50% em 48h.
- Táticas de demanda:
  1. SEO local: páginas de categoria × bairro ("buffet infantil em Campo Grande") geradas a partir do catálogo real.
  2. Mídia paga geolocalizada (Instagram/Google) para "planejar festa infantil" com o planejador como isca (sem cadastro).
  3. Parcerias com escolas infantis, pediatras, lojas de artigos de festa e plataformas de lista de presentes.
  4. Indicação: fornecedor convida clientes antigos a avaliarem (só conta após contratação na plataforma) e ganha destaque.
- Produto: e-mail/WhatsApp transacional, fotos reais, recuperação de senha, login Google.

### Fase 3 — Liquidez (meses 6–12)
- Metas: ≥ 60% de resposta em 48h, ≥ 2,5 propostas por evento, ≥ 25% de eventos com contratação.
- Alavancas: lembretes automáticos ao fornecedor; ranking que premia rapidez; modelos de proposta; IA que sugere resposta ao fornecedor; reputação; programa de garantia (Fase 4).
- Introduzir Plano Pro opcional quando os gatilhos forem atingidos (ver `MODELO_DE_NEGOCIOS.md`).

### Fase 4 — Expansão (12+ meses)
- Pagamentos com split e comissão; casamentos; novas categorias.
- **Expansão geográfica** (critério: densidade + custo de aquisição): Grande São Paulo **ou** BH (onde o Meu Bolinho já atua — avaliar), depois Campinas/Curitiba. Cada praça replica o playbook da Fase 1 com meta de 150 fornecedores antes de abrir a demanda.

## 3. Retenção

- **Consumidor:** a festa é recorrente (aniversário anual). Lembrete 60 dias antes da data do ano seguinte com o plano anterior pronto para reaproveitar; histórico de fornecedores favoritos; avaliação pós-evento.
- **Fornecedor:** pedidos constantes; painel de indicadores; alerta de demanda no bairro; reputação acumulada que não se transfere para fora.
- **Churn esperado** (hipóteses do modelo): Pro 4–6%/mês.

## 4. Indicadores de acompanhamento (semanal)

| Área | Indicador | Meta Fase 2 | Meta Fase 3 |
|---|---|---|---|
| Oferta | Fornecedores aprovados / ativos (responderam em 30 dias) | 250 / 100 | 400 / 180 |
| Demanda | Eventos com pedido / mês | 100 | 300 |
| IA | Conversa → pedido de orçamento | 25% | 35% |
| Liquidez | Taxa de resposta em 48h | 50% | 60% |
| Liquidez | Propostas por evento | 1,5 | 2,5 |
| Conversão | Evento → contratação confirmada | 15% | 25% |
| Qualidade | Nota média / reclamações por 100 contratações | ≥ 4,5 / ≤ 3 | ≥ 4,5 / ≤ 2 |
| Eficiência | CAC por evento / custo de IA por conversa | ≤ R$ 40 / ≤ R$ 1 | ≤ R$ 35 / ≤ R$ 1 |

Todos já calculáveis pelos dados do sistema (vários exibidos em `/admin`).
