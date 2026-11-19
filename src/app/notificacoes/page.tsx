import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { Button, EmptyState, PageTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";

export const metadata: Metadata = { title: "Notificações" };

async function markAllRead() {
  "use server";
  const u = await requireUser();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, u.id), isNull(notifications.readAt)));
  revalidatePath("/", "layout");
}

export default async function Notificacoes() {
  const user = await requireUser(undefined, "/notificacoes");
  const list = await db.query.notifications.findMany({ where: eq(notifications.userId, user.id), orderBy: desc(notifications.createdAt), limit: 50 });
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <PageTitle title="Notificações" actions={list.some((n) => !n.readAt) ? <form action={markAllRead}><Button size="sm" variant="outline">Marcar todas como lidas</Button></form> : undefined} />
      {list.length === 0 ? <EmptyState title="Nenhuma notificação" body="Avisos sobre solicitações, propostas e contratações aparecem aqui." /> : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {list.map((n) => (
            <li key={n.id} className={n.readAt ? "" : "bg-pitanga-soft/40"}>
              <Link href={n.link ?? "#"} className="block p-4 hover:bg-surface">
                <p className="font-semibold">{!n.readAt && <span className="mr-2 inline-block size-2 rounded-full bg-pitanga" aria-label="Não lida" />}{n.title}</p>
                <p className="text-sm text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-ink-soft">{formatDateTime(n.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
