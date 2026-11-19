# Plano financeiro

> Última revisão: 19/11/2026. **Todas as projeções são hipóteses** (exceto preços de IA e cotação, marcados como fonte). O modelo é reproduzível: `python3 scripts/financial_model.py` — altere as premissas lá e cole a saída aqui.

## 1. Premissas por cenário

| Premissa | Conservador | Base | Otimista | Observação |
|---|---:|---:|---:|---|
| Fornecedores cadastrados (mês 6 → mês 36) | 120 → 600 | 250 → 1.500 | 450 → 3.000 | Crescimento geométrico entre marcos |
| Fornecedores ativos (% dos cadastrados) | 35% | 45% | 55% | Respondeu ≥ 1 pedido no mês |
| Eventos com pedido/mês (mês 3 → mês 36) | 20 → 450 | 40 → 1.300 | 60 → 3.200 | Só RM do Rio |
| Conversas com IA por evento que vira pedido | 2,0 | 1,8 | 1,6 | Inclui conversas que não convertem |
| Evento → ≥ 1 contratação | 20% | 30% | 40% | |
| Contratações por evento convertido | 1,8 | 2,2 | 2,6 | Casamentos: média de 9 fornecedores (Casamentos.com.br/ESADE) |
| Ticket médio por contratação | R$ 2.200 | R$ 2.500 | R$ 2.800 | **Validar no piloto** |
| Plano Pro (início · adesão dos ativos · preço · churn/mês) | mês 16 · 8% · R$ 99 · 6% | mês 13 · 12% · R$ 99 · 5% | mês 13 · 18% · R$ 99 · 4% | |
| Comissão (início · taxa · % pago pela plataforma) | mês 22 · 8% · 40% | mês 19 · 8% · 55% | mês 16 · 9% · 70% | Exige pagamentos integrados |
| Custo do gateway sobre o valor processado | 2,0% | 1,5% | 1,2% | Mix Pix + cartão; juros de parcelamento com o pagador |
| CAC por evento de canal pago · % pago | R$ 45 · 60% | R$ 35 · 50% | R$ 28 · 45% | Restante: orgânico/SEO/indicação |
| Custo por fornecedor novo | R$ 90 | R$ 70 | R$ 55 | Campo + mídia |
| Equipe/mês (anos 1 · 2 · 3) | 14k · 32k · 55k | 16k · 45k · 85k | 18k · 60k · 130k | Fundadores com pró-labore reduzido no ano 1 |
| Infraestrutura/mês (anos 1 · 2 · 3) | R$ 900 · 2.500 · 6.000 | idem | idem | VPS, backup, e-mail/WhatsApp, monitoramento |
| Custo de IA por conversa | US$ 0,15 | US$ 0,15 | US$ 0,15 | ~8 turnos no Claude Sonnet 5.5 (US$ 2 / US$ 10 por milhão de tokens de entrada/saída — [fonte](https://emergent.sh/learn/claude-sonnet-5-5-pricing)); Haiku 5.5 custa US$ 0,10/0,50 ([fonte](https://apidog.com/blog/claude-haiku-5-5-pricing/)) |
| Câmbio | R$ 5,14/US$ | | | Referência de mai/2025; atualizar |

## 2. Resultados

### Conservador

| Indicador | Mês 12 | Mês 24 | Mês 36 |
|---|---:|---:|---:|
| Fornecedores cadastrados | 166 | 315 | 600 |
| Fornecedores ativos | 58 | 110 | 210 |
| Eventos com pedido de orçamento / mês | 47 | 145 | 450 |
| Solicitações enviadas / mês (≈3 por evento) | 141 | 435 | 1.350 |
| Contratações / mês | 17 | 52 | 162 |
| GMV / mês | R$ 37.224 | R$ 114.840 | R$ 356.400 |
| Assinantes Pro | 0 | 7 | 14 |
| Receita recorrente (assinaturas) / mês | R$ 0 | R$ 721 | R$ 1.383 |
| Receita de comissão / mês | R$ 0 | R$ 3.675 | R$ 11.405 |
| Receita total / mês | R$ 0 | R$ 4.396 | R$ 12.788 |
| Take rate efetivo | 0.0% | 3.8% | 3.6% |
| Custo de IA / mês | R$ 72 | R$ 224 | R$ 694 |
| Margem de contribuição / mês | R$ -72 | R$ 3.254 | R$ 9.243 |
| Marketing (aquisição) / mês | R$ 2.079 | R$ 5.355 | R$ 14.940 |
| Equipe + infraestrutura / mês | R$ 14.900 | R$ 34.500 | R$ 61.000 |
| Resultado operacional / mês | R$ -17.051 | R$ -36.601 | R$ -66.697 |
| Resultado acumulado | R$ -203.387 | R$ -649.704 | R$ -1.427.083 |

- Ponto de equilíbrio operacional (mês com resultado > 0): **não atingido em 36 meses**
- Necessidade de caixa (pior resultado acumulado): **R$ 1.427.083**
- LTV fornecedor Pro ≈ R$ 1.568 · custo de aquisição por assinante ≈ R$ 394 · LTV/CAC ≈ 4.0x
- Receita líquida por evento adquirido ≈ R$ 19 · LTV consumidor ≈ R$ 23 · CAC médio por evento ≈ R$ 27 · LTV/CAC ≈ 0.8x

### Base

| Indicador | Mês 12 | Mês 24 | Mês 36 |
|---|---:|---:|---:|
| Fornecedores cadastrados | 358 | 733 | 1.500 |
| Fornecedores ativos | 161 | 330 | 675 |
| Eventos com pedido de orçamento / mês | 103 | 367 | 1.300 |
| Solicitações enviadas / mês (≈3 por evento) | 309 | 1.101 | 3.900 |
| Contratações / mês | 68 | 242 | 858 |
| GMV / mês | R$ 169.950 | R$ 605.550 | R$ 2.145.000 |
| Assinantes Pro | 0 | 33 | 68 |
| Receita recorrente (assinaturas) / mês | R$ 0 | R$ 3.272 | R$ 6.709 |
| Receita de comissão / mês | R$ 0 | R$ 26.644 | R$ 94.380 |
| Receita total / mês | R$ 0 | R$ 29.917 | R$ 101.089 |
| Take rate efetivo | 0.0% | 4.9% | 4.7% |
| Custo de IA / mês | R$ 143 | R$ 509 | R$ 1.804 |
| Margem de contribuição / mês | R$ -143 | R$ 24.411 | R$ 81.589 |
| Marketing (aquisição) / mês | R$ 3.272 | R$ 9.432 | R$ 28.840 |
| Equipe + infraestrutura / mês | R$ 16.900 | R$ 47.500 | R$ 91.000 |
| Resultado operacional / mês | R$ -20.315 | R$ -32.521 | R$ -38.251 |
| Resultado acumulado | R$ -241.308 | R$ -759.614 | R$ -1.472.296 |

- Ponto de equilíbrio operacional (mês com resultado > 0): **não atingido em 36 meses**
- Necessidade de caixa (pior resultado acumulado): **R$ 1.472.296**
- LTV fornecedor Pro ≈ R$ 1.881 · custo de aquisição por assinante ≈ R$ 262 · LTV/CAC ≈ 7.2x
- Receita líquida por evento adquirido ≈ R$ 59 · LTV consumidor ≈ R$ 75 · CAC médio por evento ≈ R$ 18 · LTV/CAC ≈ 4.3x

### Otimista

| Indicador | Mês 12 | Mês 24 | Mês 36 |
|---|---:|---:|---:|
| Fornecedores cadastrados | 658 | 1.405 | 3.000 |
| Fornecedores ativos | 362 | 773 | 1.650 |
| Eventos com pedido de orçamento / mês | 177 | 754 | 3.200 |
| Solicitações enviadas / mês (≈3 por evento) | 531 | 2.262 | 9.600 |
| Contratações / mês | 184 | 784 | 3.328 |
| GMV / mês | R$ 515.424 | R$ 2.195.648 | R$ 9.318.400 |
| Assinantes Pro | 0 | 117 | 251 |
| Receita recorrente (assinaturas) / mês | R$ 0 | R$ 11.616 | R$ 24.844 |
| Receita de comissão / mês | R$ 0 | R$ 138.326 | R$ 587.059 |
| Receita total / mês | R$ 0 | R$ 149.941 | R$ 611.903 |
| Take rate efetivo | 0.0% | 6.8% | 6.6% |
| Custo de IA / mês | R$ 218 | R$ 930 | R$ 3.948 |
| Margem de contribuição / mês | R$ -218 | R$ 130.568 | R$ 529.681 |
| Marketing (aquisição) / mês | R$ 4.485 | R$ 14.230 | R$ 50.440 |
| Equipe + infraestrutura / mês | R$ 18.900 | R$ 62.500 | R$ 136.000 |
| Resultado operacional / mês | R$ -23.604 | R$ 53.838 | R$ 343.241 |
| Resultado acumulado | R$ -278.954 | R$ -349.675 | R$ 1.274.412 |

- Ponto de equilíbrio operacional (mês com resultado > 0): **mês 19**
- Necessidade de caixa (pior resultado acumulado): **R$ 505.712**
- LTV fornecedor Pro ≈ R$ 2.351 · custo de aquisição por assinante ≈ R$ 168 · LTV/CAC ≈ 14.0x
- Receita líquida por evento adquirido ≈ R$ 159 · LTV consumidor ≈ R$ 205 · CAC médio por evento ≈ R$ 13 · LTV/CAC ≈ 16.3x


## 3. Sensibilidade (cenário base)

| Variação sobre o cenário base | Equilíbrio operacional | Necessidade de caixa | Resultado no mês 36 |
|---|---|---:|---:|
| Base (referência) | não atingido em 36 meses | R$ 1.472.296 | R$ -38.251 |
| Conversão evento→contratação 30% → 40% | não atingido em 36 meses | R$ 1.255.242 | R$ -12.690 |
| Pagamento pela plataforma 55% → 75% | não atingido em 36 meses | R$ 1.235.509 | R$ -10.366 |
| Comissão 8% → 10% | não atingido em 36 meses | R$ 1.271.938 | R$ -14.656 |
| Ticket médio R$ 2.500 → R$ 3.200 | não atingido em 36 meses | R$ 1.289.970 | R$ -16.779 |
| Equipe enxuta (R$ 12k / 30k / 60k) | não atingido em 36 meses | R$ 944.296 | R$ -13.251 |
| Volume 2.500 eventos/mês no mês 36 (2ª praça no ano 3) | mês 36 | R$ 1.213.730 | R$ 5.880 |
| Combinado: conversão 35% + plataforma 70% + equipe enxuta | mês 34 | R$ 674.373 | R$ 23.929 |

## 4. Leitura dos números

1. **Só com a RM do Rio, o cenário base não se paga em 36 meses** e consome ~R$ 1,5 mi. O otimista atinge equilíbrio no mês 19 com ~R$ 0,5 mi de caixa.
2. **A alavanca mais forte é o custo fixo combinado com conversão e pagamento na plataforma** — o combinado (conversão 35%, 70% pago pela plataforma, equipe enxuta) atinge equilíbrio no mês 34 com ~R$ 0,67 mi.
3. **Volume ajuda menos do que parece** enquanto a aquisição for paga: o lucro por evento (≈ R$ 59 de receita líquida no base) é pequeno frente ao custo fixo. Por isso a 2ª praça só faz sentido com playbook de aquisição orgânica provado no Rio.
4. **Unit economics do fornecedor Pro são saudáveis** (LTV/CAC 4–14x), mas a receita é pequena; ele financia operação, não escala.
5. **No conservador, o LTV/CAC do consumidor fica abaixo de 1** → mídia paga não deve escalar antes de a conversão evento→contratação passar de 25%.
6. **IA é custo marginal pequeno** (< 2% da receita no base); trocar para Haiku 5.5 nas etapas de extração reduz ainda mais.

## 5. Indicadores financeiros — definições usadas

| Indicador | Definição |
|---|---|
| GMV | Soma dos valores das contratações confirmadas (declarado nas propostas; processado pela plataforma só a partir da Fase 4) |
| Take rate | Receita da plataforma ÷ GMV |
| Receita recorrente | Assinaturas Pro ativas × preço |
| CAC (consumidor) | Gasto de aquisição ÷ eventos novos com pedido (canal pago); "CAC médio" inclui orgânicos |
| LTV (consumidor) | Receita líquida por evento × fator de recompra (1,3 em 3 anos) |
| LTV (fornecedor Pro) | Preço × margem (95%) ÷ churn mensal |
| Churn | Cancelamentos de Pro no mês ÷ assinantes no início do mês |
| Margem de contribuição | Receita − gateway − IA |
| Ponto de equilíbrio | Primeiro mês com resultado operacional > 0 |

## 6. Necessidade de capital e uso [HIPÓTESE]

Captação sugerida: **R$ 1,0–1,5 mi (pré-seed/anjo)** para 24 meses, liberada por marcos: 40% produto e engenharia, 30% formação de oferta e operações, 25% aquisição de demanda, 5% jurídico/contábil e reserva. Marco para a próxima rodada: gatilhos da Fase 3 atingidos no Rio e comissão rodando com ≥ 50% das contratações pagas pela plataforma.
