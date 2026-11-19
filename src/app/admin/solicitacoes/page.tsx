import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { BookingStatus, QuoteStatus } from "@/components/status";
import { PageTitle } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { db } from "@/server/db";
import { bookings, quoteRequests } from "@/server/db/schema";

export const metadata: Metadata = { title: "Solicitações e contratações" };

export default async function AdminQuotes() {
  const [qs, bks] = await Promise.all([
    db.query.quoteRequests.findMany({ with: { provider: { columns: { tradeName: true } }, consumer: { columns: { name: true } }, category: true, event: true }, orderBy: desc(quoteRequests.createdAt), limit: 100 }),
    db.query.bookings.findMany({ with: { provider: { columns: { tradeName: true } }, consumer: { columns: { name: true } }, event: true }, orderBy: desc(bookings.createdAt), limit: 50 }),
  ]);
  return (
    <>
      <PageTitle title="Contratações" subtitle="Reserva = proposta aceita pelo cliente, aguardando o fornecedor. Contratação confirmada = as duas partes confirmaram. Valores não são processados pela Planfest." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-ink-soft"><th className="py-2">Evento</th><th>Cliente</th><th>Fornecedor</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {bks.map((b) => (
              <tr key={b.id}><td className="py-2">{b.event.title} · {formatDate(b.event.date)}</td><td>{b.consumer.name}</td><td>{b.provider.tradeName}</td><td>{formatBRL(b.amount)}</td><td><BookingStatus status={b.status} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="mt-10 text-2xl font-bold">Solicitações recentes</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-left text-ink-soft"><th className="py-2">Data</th><th>Cliente</th><th>Fornecedor</th><th>Categoria</th><th>Origem</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-line">
            {qs.map((q) => (
              <tr key={q.id}><td className="py-2">{formatDate(q.createdAt)}</td><td>{q.consumer.name}</td><td>{q.provider.tradeName}</td><td>{q.category.name}</td><td>{q.viaAi ? "IA" : "Catálogo"}</td><td><QuoteStatus status={q.status} /></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
