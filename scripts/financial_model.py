"""
Modelo financeiro do Planfest — 36 meses, 3 cenários.
TODAS as premissas abaixo são HIPÓTESES a validar no piloto (exceto as marcadas como [fonte]).
Uso: python3 scripts/financial_model.py  → imprime tabelas em Markdown (coladas em docs/PLANO_FINANCEIRO.md)
"""
from dataclasses import dataclass

USD_BRL = 5.87  # [fonte] dólar comercial no fechamento de 18/11/2026 (Brasil 61); atualizar
# Custo de IA = chamadas por conversa × tokens × preço. Preços do Claude Sonnet 5.5: US$ 2 (entrada) / US$ 10 (saída) por milhão de tokens [fonte: tabela da API]
AI_CALLS_PER_CONVERSATION = 6       # limite de 3 mensagens por cliente × 2 rodadas do modelo (prompt v1.2)
AI_INPUT_TOKENS_PER_CALL = 6000     # instruções + catálogo + estado do evento + resultados das ferramentas
AI_OUTPUT_TOKENS_PER_CALL = 600
AI_PRICE_USD_PER_MTOK = (0.1, 0.5)  # Claude Haiku 5.5 (padrão desde 24/11/2026); Sonnet 5.5 = (2.0, 10.0)
AI_COST_PER_CONVERSATION_USD = AI_CALLS_PER_CONVERSATION * (AI_INPUT_TOKENS_PER_CALL * AI_PRICE_USD_PER_MTOK[0] + AI_OUTPUT_TOKENS_PER_CALL * AI_PRICE_USD_PER_MTOK[1]) / 1e6  # ≈ US$ 0,0054 (Sonnet seria ≈ US$ 0,108)


@dataclass
class Scenario:
    name: str
    providers_m36: int          # fornecedores cadastrados no mês 36
    providers_m6: int
    active_rate: float          # % de cadastrados que responderam ≥1 pedido no mês
    events_m36: int             # eventos com pedido de orçamento por mês no mês 36
    events_m3: int
    conversations_per_event: float  # conversas com IA por evento que vira pedido
    conversion: float           # evento → ≥1 contratação
    bookings_per_conv_event: float
    ticket: float               # R$ por contratação
    pro_start: int              # mês de início da assinatura Pro
    pro_adoption: float         # % dos fornecedores ativos que assinam
    pro_price: float
    pro_churn: float
    commission_start: int       # mês de início da comissão (exige pagamento na plataforma)
    commission: float
    on_platform_share: float    # % das contratações pagas pela plataforma
    payment_fee: float          # custo do gateway sobre o valor processado (mix Pix + cartão; juros de parcelamento repassados ao pagador)
    consumer_cac: float         # R$ por evento novo (mídia + parcerias)
    provider_cac: float         # R$ por fornecedor novo (equipe de campo + mídia)
    paid_share: float           # % dos eventos vindos de canal pago
    team: tuple                 # custo mensal de equipe (meses 1-12, 13-24, 25-36)


SCENARIOS = [
    Scenario("Conservador", 600, 120, 0.35, 450, 20, 2.0, 0.20, 1.8, 2200, 16, 0.08, 99, 0.06, 22, 0.08, 0.40, 0.020, 45, 90, 0.6, (14000, 32000, 55000)),
    Scenario("Base", 1500, 250, 0.45, 1300, 40, 1.8, 0.30, 2.2, 2500, 13, 0.12, 99, 0.05, 19, 0.08, 0.55, 0.015, 35, 70, 0.5, (16000, 45000, 85000)),
    Scenario("Otimista", 3000, 450, 0.55, 3200, 60, 1.6, 0.40, 2.6, 2800, 13, 0.18, 99, 0.04, 16, 0.09, 0.70, 0.012, 28, 55, 0.45, (18000, 60000, 130000)),
]
INFRA = {1: 900, 13: 2500, 25: 6000}  # VPS, backups, e-mail/WhatsApp, monitoramento, domínios (R$/mês)


def interp(m, m_start, v_start, m_end, v_end):
    """crescimento geométrico entre dois marcos"""
    if m <= m_start:
        return v_start * m / m_start
    r = (v_end / v_start) ** (1 / (m_end - m_start))
    return v_start * r ** (m - m_start)


def run(s: Scenario):
    rows, pro_subs, prev_providers, cum = [], 0.0, 0, 0.0
    for m in range(1, 37):
        providers = round(interp(m, 6, s.providers_m6, 36, s.providers_m36))
        active = providers * s.active_rate
        events = round(interp(m, 3, s.events_m3, 36, s.events_m36))
        conversations = events * s.conversations_per_event
        bookings = events * s.conversion * s.bookings_per_conv_event
        gmv = bookings * s.ticket
        # receita
        if m >= s.pro_start:
            target = active * s.pro_adoption
            pro_subs = pro_subs * (1 - s.pro_churn) + max(0, target - pro_subs * (1 - s.pro_churn)) * 0.35  # adesão gradual
        sub_rev = pro_subs * s.pro_price
        processed = gmv * s.on_platform_share if m >= s.commission_start else 0
        com_rev = processed * s.commission
        revenue = sub_rev + com_rev
        # custos variáveis
        pay_cost = processed * s.payment_fee
        ai_cost = conversations * AI_COST_PER_CONVERSATION_USD * USD_BRL
        contrib = revenue - pay_cost - ai_cost
        # custos de aquisição e fixos
        new_providers = max(0, providers - prev_providers)
        prev_providers = providers
        mkt = events * s.paid_share * s.consumer_cac + new_providers * s.provider_cac
        team = s.team[0] if m <= 12 else s.team[1] if m <= 24 else s.team[2]
        infra = INFRA[1] if m <= 12 else INFRA[13] if m <= 24 else INFRA[25]
        ebitda = contrib - mkt - team - infra
        cum += ebitda
        rows.append(dict(m=m, providers=providers, active=active, events=events, conversations=conversations, bookings=bookings,
                         gmv=gmv, take=(revenue / gmv if gmv else 0), pro=pro_subs, sub_rev=sub_rev, com_rev=com_rev, revenue=revenue,
                         ai=ai_cost, pay=pay_cost, contrib=contrib, mkt=mkt, team=team, infra=infra, ebitda=ebitda, cum=cum))
    return rows


def brl(v):
    return f"R$ {v:,.0f}".replace(",", ".")


def unit_economics(s: Scenario):
    # Fornecedor Pro
    ltv_pro = s.pro_price * 0.95 / s.pro_churn  # margem bruta ~95% (só infra)
    cac_pro = s.provider_cac / max(s.pro_adoption, 0.01) * s.active_rate  # custo para gerar 1 assinante
    # Consumidor (por evento adquirido)
    rev_per_event = s.conversion * s.bookings_per_conv_event * s.ticket * s.commission * s.on_platform_share * (1 - s.payment_fee / s.commission)
    ai_per_event = s.conversations_per_event * AI_COST_PER_CONVERSATION_USD * USD_BRL
    repeat = 1.3  # premissa: 30% voltam para outra festa em 3 anos
    ltv_cons = (rev_per_event - ai_per_event) * repeat
    blended_cac = s.consumer_cac * s.paid_share
    return ltv_pro, cac_pro, rev_per_event, ltv_cons, blended_cac


if __name__ == "__main__":
    print("## Resultados por cenário (meses 12, 24 e 36)\n")
    for s in SCENARIOS:
        r = run(s)
        print(f"### {s.name}\n")
        print("| Indicador | Mês 12 | Mês 24 | Mês 36 |\n|---|---:|---:|---:|")
        pick = [r[11], r[23], r[35]]
        lines = [
            ("Fornecedores cadastrados", lambda x: f"{x['providers']:,}".replace(",", ".")),
            ("Fornecedores ativos", lambda x: f"{x['active']:,.0f}".replace(",", ".")),
            ("Eventos com pedido de orçamento / mês", lambda x: f"{x['events']:,}".replace(",", ".")),
            ("Solicitações enviadas / mês (≈3 por evento)", lambda x: f"{x['events']*3:,}".replace(",", ".")),
            ("Contratações / mês", lambda x: f"{x['bookings']:,.0f}".replace(",", ".")),
            ("GMV / mês", lambda x: brl(x["gmv"])),
            ("Assinantes Pro", lambda x: f"{x['pro']:,.0f}".replace(",", ".")),
            ("Receita recorrente (assinaturas) / mês", lambda x: brl(x["sub_rev"])),
            ("Receita de comissão / mês", lambda x: brl(x["com_rev"])),
            ("Receita total / mês", lambda x: brl(x["revenue"])),
            ("Take rate efetivo", lambda x: f"{x['take']*100:.1f}%"),
            ("Custo de IA / mês", lambda x: brl(x["ai"])),
            ("Margem de contribuição / mês", lambda x: brl(x["contrib"])),
            ("Marketing (aquisição) / mês", lambda x: brl(x["mkt"])),
            ("Equipe + infraestrutura / mês", lambda x: brl(x["team"] + x["infra"])),
            ("Resultado operacional / mês", lambda x: brl(x["ebitda"])),
            ("Resultado acumulado", lambda x: brl(x["cum"])),
        ]
        for label, f in lines:
            print(f"| {label} | " + " | ".join(f(x) for x in pick) + " |")
        be = next((x["m"] for x in r if x["ebitda"] > 0), None)
        trough = min(x["cum"] for x in r)
        print(f"\n- Ponto de equilíbrio operacional (mês com resultado > 0): **{('mês ' + str(be)) if be else 'não atingido em 36 meses'}**")
        print(f"- Necessidade de caixa (pior resultado acumulado): **{brl(-trough)}**")
        ltv_pro, cac_pro, rev_ev, ltv_cons, bcac = unit_economics(s)
        print(f"- LTV fornecedor Pro ≈ {brl(ltv_pro)} · custo de aquisição por assinante ≈ {brl(cac_pro)} · LTV/CAC ≈ {ltv_pro/cac_pro:.1f}x")
        print(f"- Receita líquida por evento adquirido ≈ {brl(rev_ev)} · LTV consumidor ≈ {brl(ltv_cons)} · CAC médio por evento ≈ {brl(bcac)} · LTV/CAC ≈ {ltv_cons/bcac:.1f}x\n")
