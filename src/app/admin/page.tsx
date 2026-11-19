import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { PageTitle } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Indicadores" };
export const dynamic = "force-dynamic";

async function kpis() {
  const r = await db.execute<Record<string, number>>(sql`
    SELECT
      (SELECT count(*)::int FROM users WHERE role='CONSUMER') AS consumers,
      (SELECT count(*)::int FROM users WHERE role='CONSUMER' AND created_at > now() - interval '30 days') AS consumers30,
      (SELECT count(*)::int FROM providers) AS providers,
      (SELECT count(*)::int FROM providers WHERE status='APPROVED') AS providers_approved,
      (SELECT count(*)::int FROM providers WHERE status='PENDING_REVIEW') AS providers_pending,
      (SELECT count(DISTINCT provider_id)::int FROM quote_requests WHERE first_response_at > now() - interval '30 days') AS providers_active,
      (SELECT count(*)::int FROM quote_requests WHERE created_at > now() - interval '30 days') AS quotes30,
      (SELECT count(*)::int FROM quote_requests WHERE created_at > now() - interval '30 days' AND first_response_at IS NOT NULL) AS quotes30_responded,
      (SELECT count(*)::int FROM quote_requests WHERE created_at > now() - interval '30 days' AND via_ai) AS quotes30_ai,
      (SELECT count(*)::int FROM bookings WHERE status IN ('CONFIRMED','COMPLETED')) AS bookings,
      (SELECT count(*)::int FROM bookings WHERE status='PENDING_CONFIRMATION') AS reservations,
      (SELECT coalesce(sum(amount),0)::bigint FROM bookings WHERE status IN ('CONFIRMED','COMPLETED')) AS gmv,
      (SELECT count(DISTINCT event_id)::int FROM quote_requests) AS events_with_quotes,
      (SELECT count(DISTINCT event_id)::int FROM bookings WHERE status IN ('CONFIRMED','COMPLETED')) AS events_booked,
      (SELECT count(*)::int FROM ai_conversations) AS conversations,
      (SELECT count(*)::int FROM ai_conversations c WHERE EXISTS (SELECT 1 FROM quote_requests q WHERE q.event_id = c.event_id)) AS conversations_converted,
      (SELECT coalesce(sum(cost_micro_usd),0)::bigint FROM ai_conversations) AS ai_cost_micro,
      (SELECT count(*)::int FROM reviews WHERE status='PENDING') AS reviews_pending,
      (SELECT count(*)::int FROM complaints WHERE status IN ('OPEN','IN_REVIEW')) AS complaints_open
  `);
  return r[0] as Record<string, number>;
}

export default async function AdminHome() {
  const k = await kpis();
  const pct = (a: number, b: number) => (b ? `${Math.round((Number(a) / Number(b)) * 100)}%` : "—");
  const setting = await db.query.platformSettings.findFirst({ where: (s, { eq }) => eq(s.key, "monetization") });
  const commission = Number((setting?.value as { commissionRate?: number } | undefined)?.commissionRate ?? 0);

  const sections: { title: string; items: { label: string; value: string; hint?: string }[] }[] = [
    {
      title: "Oferta",
      items: [
        { label: "Fornecedores cadastrados", value: String(k.providers) },
        { label: "Aprovados", value: String(k.providers_approved) },
        { label: "Aguardando aprovação", value: String(k.providers_pending) },
        { label: "Ativos (responderam em 30 dias)", value: String(k.providers_active) },
      ],
    },
    {
      title: "Demanda",
      items: [
        { label: "Clientes cadastrados", value: String(k.consumers), hint: `${k.consumers30} nos últimos 30 dias` },
        { label: "Conversas com a IA", value: String(k.conversations) },
        { label: "Conversa → solicitação", value: pct(k.conversations_converted, k.conversations), hint: "conversas cujo evento gerou pedido" },
        { label: "Solicitações (30 dias)", value: String(k.quotes30), hint: `${k.quotes30_ai} originadas pela IA` },
      ],
    },
    {
      title: "Liquidez e receita",
      items: [
        { label: "Taxa de resposta (30 dias)", value: pct(k.quotes30_responded, k.quotes30) },
        { label: "Evento → contratação", value: pct(k.events_booked, k.events_with_quotes) },
        { label: "Contratações confirmadas", value: String(k.bookings), hint: `${k.reservations} reservas aguardando confirmação` },
        { label: "Volume contratado (GMV)", value: formatBRL(Number(k.gmv)), hint: "declarado nas propostas; não processado pela Planfest" },
        { label: "Receita da plataforma", value: formatBRL(Math.round(Number(k.gmv) * commission)), hint: commission ? `comissão ${commission * 100}%` : "monetização desligada na fase de lançamento" },
        { label: "Custo de IA acumulado", value: `US$ ${(Number(k.ai_cost_micro) / 1e6).toFixed(2)}` },
      ],
    },
    {
      title: "Moderação",
      items: [
        { label: "Avaliações pendentes", value: String(k.reviews_pending) },
        { label: "Reclamações abertas", value: String(k.complaints_open) },
      ],
    },
  ];

  return (
    <>
      <PageTitle title="Indicadores do marketplace" subtitle="Inclui dados de demonstração enquanto o ambiente não for de produção." />
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-bold">{s.title}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {s.items.map((i) => (
                <div key={i.label} className="rounded-2xl border border-line p-4">
                  <p className="font-display text-3xl font-bold">{i.value}</p>
                  <p className="text-sm font-medium">{i.label}</p>
                  {i.hint && <p className="mt-0.5 text-xs text-ink-soft">{i.hint}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
