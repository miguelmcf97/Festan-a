import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Button, EmptyState, PageTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Notificações", "Notifications") };
}

// Títulos em inglês por tipo de aviso (os avisos ficam gravados em português).
const TITLE_EN: Record<string, string> = {
  QUOTE_NEW: "New quote request",
  QUOTE_MESSAGE: "New message",
  PROPOSAL_ACCEPTED: "Proposal accepted — confirm the booking",
  PROPOSAL_REJECTED: "Proposal declined",
  QUOTE_CANCELLED: "Request cancelled by the customer",
  QUOTE_DECLINED: "The vendor cannot take this request",
  INFO_REQUEST: "The vendor asked for more information",
  PROPOSAL_RECEIVED: "New quote received",
  BOOKING_CONFIRMED: "Booking confirmed",
  BOOKING_RELEASED: "The vendor did not confirm the reservation",
  BOOKING_COMPLETED: "How was the service?",
  PROVIDER_PENDING: "New vendor waiting for approval",
  PROVIDER_APPROVE: "Sign-up approved",
  PROVIDER_REJECT: "Sign-up not approved",
  PROVIDER_SUSPEND: "Profile suspended",
  PROVIDER_VERIFY: "You received the verified badge",
  COMPLAINT_UPDATE: "Your complaint was reviewed",
};

async function markAllRead() {
  "use server";
  const u = await requireUser();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, u.id), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
}

export default async function Notificacoes() {
  const user = await requireUser(undefined, "/notificacoes");
  const { lang, t } = await getT();
  const list = await db.query.notifications.findMany({ where: eq(notifications.userId, user.id), orderBy: desc(notifications.createdAt), limit: 50 });
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <PageTitle title={t("Notificações", "Notifications")} actions={list.some((n) => !n.readAt) ? <form action={markAllRead}><Button size="sm" variant="outline">{t("Marcar todas como lidas", "Mark all as read")}</Button></form> : undefined} />
      {list.length === 0 ? <EmptyState title={t("Nenhuma notificação", "No notifications")} body={t("Avisos sobre solicitações, propostas e contratações aparecem aqui.", "Updates about requests, proposals and bookings show up here.")} /> : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {list.map((n) => (
            <li key={n.id} className={n.readAt ? "" : "bg-pitanga-soft/40"}>
              <Link href={n.link ?? "#"} className="block p-4 hover:bg-surface">
                <p className="font-semibold">{!n.readAt && <span className="mr-2 inline-block size-2 rounded-full bg-pitanga" aria-label={t("Não lida", "Unread")} />}{lang === "en" ? (TITLE_EN[n.type] ?? n.title) : n.title}</p>
                <p className="text-sm text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-ink-soft">{formatDateTime(n.createdAt, lang)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
