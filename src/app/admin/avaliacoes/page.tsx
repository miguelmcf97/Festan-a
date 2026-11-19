import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, EmptyState, PageTitle } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { db } from "@/server/db";
import { reviews } from "@/server/db/schema";
import { reviewModerationAction } from "../actions";

export const metadata: Metadata = { title: "Avaliações" };

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const list = await db.query.reviews.findMany({ with: { provider: { columns: { tradeName: true } }, author: { columns: { name: true } }, booking: true }, orderBy: desc(reviews.createdAt), limit: 100 });
  const pending = list.filter((r) => r.status === "PENDING");
  return (
    <>
      <Flash {...sp} />
      <PageTitle title="Moderação de avaliações" subtitle="Toda avaliação está ligada a uma contratação concluída na plataforma. Rejeite conteúdo ofensivo, dados pessoais ou relatos sem relação com o serviço." />
      <h2 className="text-xl font-bold">Pendentes ({pending.length})</h2>
      {pending.length === 0 ? <div className="mt-3"><EmptyState title="Nada para moderar" body="Novas avaliações aparecem aqui." /></div> : (
        <ul className="mt-3 space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line p-4">
              <p className="text-sm text-ink-soft">{r.author.name} sobre <strong className="text-ink">{r.provider.tradeName}</strong> · contratação de {formatBRL(r.booking.amount)} · {formatDate(r.createdAt)}</p>
              <p className="mt-1 font-semibold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
              <p className="mt-1">{r.comment}</p>
              <div className="mt-3 flex gap-2">
                {(["PUBLISHED", "REJECTED"] as const).map((st) => (
                  <form key={st} action={reviewModerationAction}>
                    <input type="hidden" name="reviewId" value={r.id} /><input type="hidden" name="status" value={st} />
                    <Button size="sm" variant={st === "PUBLISHED" ? "success" : "outline"}>{st === "PUBLISHED" ? "Publicar" : "Rejeitar"}</Button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 text-xl font-bold">Histórico recente</h2>
      <ul className="mt-3 divide-y divide-line rounded-2xl border border-line text-sm">
        {list.filter((r) => r.status !== "PENDING").slice(0, 30).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="flex-1">{r.provider.tradeName} · {r.rating}★ · {r.comment.slice(0, 80)}</span>
            <Badge tone={r.status === "PUBLISHED" ? "green" : "red"}>{r.status === "PUBLISHED" ? "Publicada" : "Rejeitada"}</Badge>
          </li>
        ))}
      </ul>
    </>
  );
}
