# Modelo de negócios e monetização

> Última revisão: 19/11/2026 · **Decisão pendente de aprovação do fundador** (ver §5)

## 1. O problema do marketplace de dois lados

A Planfest precisa formar oferta (fornecedores) e demanda (clientes) ao mesmo tempo, numa praça só. Qualquer cobrança cedo demais reduz a oferta; sem oferta, a IA recomenda pouco e o cliente não volta. Por isso a monetização é **faseada** e condicionada a métricas de liquidez — não a datas.

## 2. Comparação dos modelos

| Critério | A — Comissão por contratação | B — Assinatura do fornecedor | C — Cobrança por lead | D — Híbrido |
|---|---|---|---|---|
| Alinhamento de incentivos | Alto (só ganha quando o fornecedor ganha) | Médio | Baixo (fornecedor paga sem fechar) | Alto |
| Atrito para formar oferta | Baixo | **Alto** (custo fixo antes de ver resultado) | Médio-alto | Baixo se a assinatura for opcional |
| Previsibilidade de receita | Baixa no início | Alta | Média | Média-alta |
| Risco de desintermediação | **Alto** sem pagamento na plataforma | Nenhum | Nenhum | Médio |
| Exige pagamentos integrados | Sim (para cobrar de forma confiável) | Não | Não | Sim para a parte de comissão |
| Evidência de mercado | Celebrar (eventos corporativos) cobra por intermediação | Diretórios de casamento vendem planos de destaque | GetNinjas: R$ 71 mi de receita, mas com reclamações recorrentes de profissionais ([Reclame Aqui](https://www.reclameaqui.com.br/getninjas/cobranca-indevida-por-contatos-desatualizados-e-falta-de-reembolso_bcVYyz20uPtKhPF4/)) | — |
| Adequação ao estágio inicial | Média | Baixa | Baixa | **Alta, se faseado** |

## 3. Recomendação: híbrido faseado (D)

| Fase | Quando (gatilho, não data) | Fornecedor paga | Cliente paga |
|---|---|---|---|
| 1–2 · Formação de oferta e MVP | Desde o lançamento | **Nada** | Nada |
| 3 · Liquidez | ≥ 60% de taxa de resposta em 48h, ≥ 2,5 propostas por evento e ≥ 25% de eventos com contratação por 3 meses seguidos | **Plano Pro opcional — R$ 99/mês** [HIPÓTESE]: destaque nas recomendações (rotulado como "patrocinado" quando aplicável), estatísticas de demanda do bairro, respostas rápidas por IA, portfólio ampliado | Nada |
| 4 · Monetização | Pagamentos integrados (Pix + cartão com split) | **Comissão de 8% sobre contratação paga pela plataforma** [HIPÓTESE], retida no split; Pro continua opcional | Pode parcelar; juros de cartão repassados ao pagador |

**Por que não 10–15% (sugestão do plano do Lovable)?** Comissão alta acelera a desintermediação num mercado em que o primeiro contato já entrega o fornecedor. 8% é a hipótese de partida; testar 8–12% por categoria (ex.: espaços e buffets têm ticket maior e margem diferente de doces).

**O que justifica pagar pela plataforma (anti-desintermediação):**
1. Reserva garantida: valor do sinal retido até a confirmação; devolução automática se o fornecedor cancelar.
2. Parcelamento para o cliente sem risco para o fornecedor.
3. Avaliação e selo só contam contratações pagas pela plataforma (a partir da Fase 4).
4. Contato direto liberado só após contratação confirmada (já implementado).

## 4. Outras fontes (Fase 4+)

- Anúncios patrocinados de categoria/bairro, sempre identificados.
- Parcerias de distribuição com plataformas de lista de presentes (iCasei, Casar.com) — receita de indicação.
- Planejamento "premium" para casamentos (cerimonialista + IA).
- Dados agregados e anônimos de preço para associações/fornecedores (conforme LGPD).

## 5. Decisões que precisam da aprovação do fundador

| Decisão | Recomendação | Alternativa |
|---|---|---|
| Gratuidade no lançamento | Sim, até atingir os gatilhos da Fase 3, com aviso de 60 dias antes de qualquer cobrança | Pro pago desde o início (oferta cresce mais devagar) |
| Ordem da monetização | Pro opcional → comissão com pagamentos | Comissão primeiro (exige pagamentos já na Fase 3) |
| Comissão inicial | 8% | 10% fixo; ou variável por categoria |
| Gateway de pagamento | Avaliar Asaas, Pagar.me, Mercado Pago, Iugu (split + Pix + KYC do recebedor) | — |

## 6. Estrutura de custos (resumo — detalhe em `PLANO_FINANCEIRO.md`)

- **Variáveis:** IA (~US$ 0,15 por conversa no Sonnet 5.5, a validar com uso real); gateway (~1,2–2% do valor processado, mix Pix/cartão); mensageria (e-mail/WhatsApp).
- **Aquisição:** consumidor (mídia local, parcerias, SEO) e fornecedor (equipe de campo + mídia).
- **Fixos:** equipe (produto/engenharia, operações de oferta, atendimento), VPS e ferramentas (R$ 0,9–6 mil/mês), jurídico/contábil.
