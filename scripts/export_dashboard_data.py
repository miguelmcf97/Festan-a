"""
Exporta as premissas do modelo financeiro para o painel de projeção (Claude Data).
Gera JSON {rows, meta}; o meta carrega o código-fonte do modelo para conferência.
Uso: python3 scripts/export_dashboard_data.py <pasta_destino>
"""
import json, os, sys, importlib.util, datetime

here = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.join(here, "financial_model.py")
spec = importlib.util.spec_from_file_location("fm", src_path); fm = importlib.util.module_from_spec(spec); spec.loader.exec_module(fm)
out = sys.argv[1] if len(sys.argv) > 1 else "."
model_code = open(src_path, encoding="utf-8").read()
me_code = open(os.path.abspath(__file__), encoding="utf-8").read()
today = datetime.date.today().isoformat()

rows = []
for s in fm.SCENARIOS:
    rows.append({
        "cenario": s.name,
        "fornecedores_m6": s.providers_m6, "fornecedores_m36": s.providers_m36, "ativos_pct": s.active_rate,
        "eventos_m3": s.events_m3, "eventos_m36": s.events_m36, "conversas_por_evento": s.conversations_per_event,
        "chamadas_por_conversa": fm.AI_CALLS_PER_CONVERSATION, "tokens_entrada_por_chamada": fm.AI_INPUT_TOKENS_PER_CALL, "tokens_saida_por_chamada": fm.AI_OUTPUT_TOKENS_PER_CALL,
        "conversao": s.conversion, "contratacoes_por_evento": s.bookings_per_conv_event, "ticket": s.ticket,
        "pro_inicio": s.pro_start, "pro_adesao": s.pro_adoption, "pro_preco": s.pro_price, "pro_churn": s.pro_churn,
        "comissao_inicio": s.commission_start, "comissao": s.commission, "pagamento_plataforma": s.on_platform_share, "taxa_gateway": s.payment_fee,
        "cac_consumidor": s.consumer_cac, "cac_fornecedor": s.provider_cac, "pct_pago": s.paid_share,
        "equipe_ano1": s.team[0], "equipe_ano2": s.team[1], "equipe_ano3": s.team[2],
        "infra_ano1": fm.INFRA[1], "infra_ano2": fm.INFRA[13], "infra_ano3": fm.INFRA[25],
    })
json.dump({"rows": rows, "meta": [
    {"label": "Natureza", "value": "Hipóteses do plano de negócios da Planfest (19/11/2026), a validar no piloto. Não são dados observados."},
    {"label": "financial_model.py", "value": model_code, "type": "code", "lang": "python"},
    {"label": "export_dashboard_data.py", "value": me_code, "type": "code", "lang": "python"},
]}, open(os.path.join(out, "premissas.json"), "w"), ensure_ascii=False, indent=1)

json.dump({"rows": [
    {"modelo": "claude-sonnet-5-5", "nome": "Claude Sonnet 5.5", "entrada_usd_mtok": 2.0, "saida_usd_mtok": 10.0, "fonte": "https://emergent.sh/learn/claude-sonnet-5-5-pricing", "consultado_em": "2026-11-19"},
    {"modelo": "claude-haiku-5-5", "nome": "Claude Haiku 5.5", "entrada_usd_mtok": 0.10, "saida_usd_mtok": 0.50, "fonte": "https://apidog.com/blog/claude-haiku-5-5-pricing/", "consultado_em": "2026-11-19"},
], "meta": [{"label": "Unidade", "value": "US$ por milhão de tokens (preço de tabela da API, sem descontos de cache)"}]},
    open(os.path.join(out, "custos_ia.json"), "w"), ensure_ascii=False, indent=1)

json.dump({"rows": [{"data": "2026-11-18", "usd_brl": fm.USD_BRL, "fonte": "https://brasil61.com/n/dolar-fecha-em-alta-de-1-45-e-chega-a-r-5-87-bras2617492"}],
           "meta": [{"label": "Cotação", "value": "Dólar comercial, fechamento"}]},
    open(os.path.join(out, "cambio.json"), "w"), ensure_ascii=False, indent=1)

# Projeção de referência (para conferir o cálculo do painel)
ref = {s.name: fm.run(s) for s in fm.SCENARIOS}
json.dump(ref, open(os.path.join(out, "_referencia.json"), "w"))
print("ok", [r["cenario"] for r in rows])
