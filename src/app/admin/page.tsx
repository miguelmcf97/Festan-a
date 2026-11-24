import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Button, Input, PageTitle, Panel } from "@/components/ui";
import { formatBRL } from "@/lib/format";
import { db } from "@/server/db";
import { getT } from "@/server/i18n";
import { getAiMessageLimit } from "@/server/services/ai-usage";
import { aiLimitAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Indicadores", "Metrics") };
}
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
      (SELECT count(*)::int FROM ai_messages WHERE role='USER') AS ai_user_messages,
      (SELECT count(*)::int FROM reviews WHERE status='PENDING') AS reviews_pending,
      (SELECT count(*)::int FROM complaints WHERE status IN ('OPEN','IN_REVIEW')) AS complaints_open
  `);
  return r[0] as Record<string, number>;
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const [k, aiLimit] = await Promise.all([kpis(), getAiMessageLimit()]);
  const pct = (a: number, b: number) => (b ? `${Math.round((Number(a) / Number(b)) * 100)}%` : "—");
  const setting = await db.query.platformSettings.findFirst({ where: (s, { eq }) => eq(s.key, "monetization") });
  const commission = Number((setting?.value as { commissionRate?: number } | undefined)?.commissionRate ?? 0);

  const sections: { title: string; items: { label: string; value: string; hint?: string }[] }[] = [
    {
      title: t("Oferta", "Supply"),
      items: [
        { label: t("Fornecedores cadastrados", "Registered vendors"), value: String(k.providers) },
        { label: t("Aprovados", "Approved"), value: String(k.providers_approved) },
        { label: t("Aguardando aprovação", "Waiting for approval"), value: String(k.providers_pending) },
        { label: t("Ativos (responderam em 30 dias)", "Active (replied in 30 days)"), value: String(k.providers_active) },
      ],
    },
    {
      title: t("Demanda", "Demand"),
      items: [
        { label: t("Clientes cadastrados", "Registered customers"), value: String(k.consumers), hint: t(`${k.consumers30} nos últimos 30 dias`, `${k.consumers30} in the last 30 days`) },
        { label: t("Conversas com a IA", "AI conversations"), value: String(k.conversations), hint: t(`${k.ai_user_messages} mensagens de clientes`, `${k.ai_user_messages} customer messages`) },
        { label: t("Conversa → solicitação", "Conversation → request"), value: pct(k.conversations_converted, k.conversations), hint: t("conversas cujo evento gerou pedido", "conversations whose event produced a request") },
        { label: t("Solicitações (30 dias)", "Requests (30 days)"), value: String(k.quotes30), hint: t(`${k.quotes30_ai} originadas pela IA`, `${k.quotes30_ai} started by the AI`) },
      ],
    },
    {
      title: t("Liquidez e receita", "Liquidity and revenue"),
      items: [
        { label: t("Taxa de resposta (30 dias)", "Response rate (30 days)"), value: pct(k.quotes30_responded, k.quotes30) },
        { label: t("Evento → contratação", "Event → booking"), value: pct(k.events_booked, k.events_with_quotes) },
        { label: t("Contratações confirmadas", "Confirmed bookings"), value: String(k.bookings), hint: t(`${k.reservations} reservas aguardando confirmação`, `${k.reservations} reservations waiting for confirmation`) },
        { label: t("Volume contratado (GMV)", "Booked volume (GMV)"), value: formatBRL(Number(k.gmv)), hint: t("declarado nas propostas; não processado pela Planfest", "stated in proposals; not processed by Planfest") },
        { label: t("Receita da plataforma", "Platform revenue"), value: formatBRL(Math.round(Number(k.gmv) * commission)), hint: commission ? t(`comissão ${commission * 100}%`, `${commission * 100}% commission`) : t("monetização desligada na fase de lançamento", "monetization off during launch") },
        { label: t("Custo de IA acumulado", "Accumulated AI cost"), value: `US$ ${(Number(k.ai_cost_micro) / 1e6).toFixed(2)}` },
      ],
    },
    {
      title: t("Moderação", "Moderation"),
      items: [
        { label: t("Avaliações pendentes", "Pending reviews"), value: String(k.reviews_pending) },
        { label: t("Reclamações abertas", "Open complaints"), value: String(k.complaints_open) },
      ],
    },
  ];

  return (
    <>
      <Flash ok={sp.ok} erro={sp.erro} />
      <PageTitle title={t("Indicadores do marketplace", "Marketplace metrics")} subtitle={t("Inclui dados de demonstração enquanto o ambiente não for de produção.", "Includes demo data while the environment is not production.")} />
      <Panel className="mb-8">
        <h2 className="text-xl font-bold">{t("Assistente de IA", "AI assistant")}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Quantas mensagens cada cliente pode enviar à assistente, somando todas as conversas. Menos mensagens = menor custo de IA. Administradores não têm limite. Use 0 para desligar a IA para clientes.",
            "How many messages each customer can send to the assistant, across all conversations. Fewer messages = lower AI cost. Admins have no limit. Use 0 to turn the AI off for customers.",
          )}
        </p>
        <form action={aiLimitAction} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="ai-limit" className="block text-sm font-semibold">{t("Mensagens por cliente", "Messages per customer")}</label>
            <Input id="ai-limit" name="limit" type="number" min={0} max={100} defaultValue={aiLimit} className="w-32" required />
          </div>
          <Button size="sm" variant="dark">{t("Salvar limite", "Save limit")}</Button>
        </form>
      </Panel>
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
