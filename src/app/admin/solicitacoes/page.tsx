import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { BookingStatus, QuoteStatus } from "@/components/status";
import { PageTitle } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { db } from "@/server/db";
import { bookings, quoteRequests } from "@/server/db/schema";
import { categoryName } from "@/lib/i18n";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Solicitações e contratações", "Requests and bookings") };
}

export default async function AdminQuotes() {
  const { lang, t } = await getT();
  const [qs, bks] = await Promise.all([
    db.query.quoteRequests.findMany({ with: { provider: { columns: { tradeName: true } }, consumer: { columns: { name: true } }, category: true, event: true }, orderBy: desc(quoteRequests.createdAt), limit: 100 }),
    db.query.bookings.findMany({ with: { provider: { columns: { tradeName: true } }, consumer: { columns: { name: true } }, event: true }, orderBy: desc(bookings.createdAt), limit: 50 }),
  ]);
  return (
    <>
      <PageTitle title={t("Contratações", "Bookings")} subtitle={t("Reserva = proposta aceita pelo cliente, aguardando o fornecedor. Contratação confirmada = as duas partes confirmaram. Valores não são processados pela Planfest.", "Reservation = proposal accepted by the customer, waiting for the vendor. Confirmed booking = both sides confirmed. Amounts are not processed by Planfest.")} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-ink-soft"><th className="py-2">{t("Evento", "Event")}</th><th>{t("Cliente", "Customer")}</th><th>{t("Fornecedor", "Vendor")}</th><th>{t("Valor", "Amount")}</th><th>{t("Status", "Status")}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {bks.map((b) => (
              <tr key={b.id}><td className="py-2">{b.event.title} · {formatDate(b.event.date, lang)}</td><td>{b.consumer.name}</td><td>{b.provider.tradeName}</td><td>{formatBRL(b.amount)}</td><td><BookingStatus status={b.status} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 text-2xl font-bold">{t("Solicitações recentes", "Recent requests")}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-ink-soft"><th className="py-2">{t("Data", "Date")}</th><th>{t("Cliente", "Customer")}</th><th>{t("Fornecedor", "Vendor")}</th><th>{t("Categoria", "Category")}</th><th>{t("Origem", "Source")}</th><th>{t("Status", "Status")}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {qs.map((q) => (
              <tr key={q.id}><td className="py-2">{formatDate(q.createdAt, lang)}</td><td>{q.consumer.name}</td><td>{q.provider.tradeName}</td><td>{categoryName(q.category, lang)}</td><td>{q.viaAi ? t("IA", "AI") : t("Catálogo", "Catalog")}</td><td><QuoteStatus status={q.status} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
