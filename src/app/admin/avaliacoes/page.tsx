import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Flash } from "@/components/status";
import { Badge, Button, EmptyState, PageTitle } from "@/components/ui";
import { formatBRL, formatDate } from "@/lib/format";
import { db } from "@/server/db";
import { reviews } from "@/server/db/schema";
import { reviewModerationAction } from "../actions";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Avaliações", "Reviews") };
}

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const { lang, t } = await getT();
  const list = await db.query.reviews.findMany({ with: { provider: { columns: { tradeName: true } }, author: { columns: { name: true } }, booking: true }, orderBy: desc(reviews.createdAt), limit: 100 });
  const pending = list.filter((r) => r.status === "PENDING");
  return (
    <>
      <Flash {...sp} />
      <PageTitle title={t("Moderação de avaliações", "Review moderation")} subtitle={t("Toda avaliação está ligada a uma contratação concluída na plataforma. Rejeite conteúdo ofensivo, dados pessoais ou relatos sem relação com o serviço.", "Every review is tied to a booking completed on the platform. Reject offensive content, personal data or reports unrelated to the service.")} />
      <h2 className="text-xl font-bold">{t("Pendentes", "Pending")} ({pending.length})</h2>
      {pending.length === 0 ? <div className="mt-3"><EmptyState title={t("Nada para moderar", "Nothing to moderate")} body={t("Novas avaliações aparecem aqui.", "New reviews show up here.")} /></div> : (
        <ul className="mt-3 space-y-3">
          {pending.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line p-4">
              <p className="text-sm text-ink-soft">{r.author.name} {t("sobre", "about")} <strong className="text-ink">{r.provider.tradeName}</strong> · {t("contratação de", "booking of")} {formatBRL(r.booking.amount)} · {formatDate(r.createdAt, lang)}</p>
              <p className="mt-1 font-semibold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
              <p className="mt-1">{r.comment}</p>
              <div className="mt-3 flex gap-2">
                {(["PUBLISHED", "REJECTED"] as const).map((st) => (
                  <form key={st} action={reviewModerationAction}>
                    <input type="hidden" name="reviewId" value={r.id} /><input type="hidden" name="status" value={st} />
                    <Button size="sm" variant={st === "PUBLISHED" ? "success" : "outline"}>{st === "PUBLISHED" ? t("Publicar", "Publish") : t("Rejeitar", "Reject")}</Button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 text-xl font-bold">{t("Histórico recente", "Recent history")}</h2>
      <ul className="mt-3 divide-y divide-line rounded-2xl border border-line text-sm">
        {list.filter((r) => r.status !== "PENDING").slice(0, 30).map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="flex-1">{r.provider.tradeName} · {r.rating}★ · {r.comment.slice(0, 80)}</span>
            <Badge tone={r.status === "PUBLISHED" ? "green" : "red"}>{r.status === "PUBLISHED" ? t("Publicada", "Published") : t("Rejeitada", "Rejected")}</Badge>
          </li>
        ))}
      </ul>
    </>
  );
}
