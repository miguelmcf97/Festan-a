import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { MobileMenu } from "@/components/mobile-menu";

export const metadata: Metadata = {
  title: { default: "Planfest — planeje sua festa com IA e encontre fornecedores", template: "%s · Planfest" },
  description: "Conte como imagina sua festa. A IA da Planfest monta o planejamento, sugere a divisão do orçamento e encontra fornecedores na Região Metropolitana do Rio.",
};
export const viewport: Viewport = { themeColor: "#e5384f" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const unread = user
    ? (await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))))[0].n
    : 0;
  const isDemoEnv = process.env.APP_ENV !== "production";
  const dashboard = user?.role === "ADMIN" ? "/admin" : user?.role === "PROVIDER" ? "/fornecedor" : "/painel";

  const nav = [
    { href: "/planejar", label: "Planejar com IA" },
    { href: "/fornecedores", label: "Fornecedores" },
    { href: "/seja-fornecedor", label: "Para fornecedores" },
  ];

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Pular para o conteúdo</a>
        {isDemoEnv && (
          <div className="bg-maracuja px-4 py-1.5 text-center text-xs font-semibold text-ink">
            Ambiente de demonstração: fornecedores, avaliações e valores exibidos são fictícios. Nenhum pagamento é processado.
          </div>
        )}
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
            <Link href="/" className="font-display text-2xl font-extrabold tracking-tight text-ink" aria-label="Planfest, página inicial">
              plan<span className="text-pitanga">fest</span>
            </Link>
            <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Principal">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-surface hover:text-ink">{n.label}</Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <Link href="/notificacoes" className="relative grid size-10 place-items-center rounded-full hover:bg-surface" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}>
                    <Bell className="size-5" />
                    {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-pitanga px-1 text-[10px] font-bold text-white">{unread}</span>}
                  </Link>
                  <Link href={dashboard} className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white sm:inline-block">
                    {user.role === "ADMIN" ? "Administração" : user.role === "PROVIDER" ? "Meu painel" : "Minhas festas"}
                  </Link>
                  <form action="/sair" method="post" className="hidden sm:block">
                    <button className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface">Sair</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/entrar" className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-surface sm:inline-block">Entrar</Link>
                  <Link href="/cadastrar" className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white sm:inline-block">Criar conta</Link>
                </>
              )}
              <MobileMenu nav={nav} loggedIn={Boolean(user)} dashboard={dashboard} />
            </div>
          </div>
        </header>
        <main id="conteudo">{children}</main>
        <footer className="mt-24 border-t border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft sm:grid-cols-3">
            <div>
              <p className="font-display text-xl font-extrabold text-ink">plan<span className="text-pitanga">fest</span></p>
              <p className="mt-2 max-w-xs">Você imagina a festa. A IA ajuda a planejar. A Planfest encontra quem pode realizar.</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-ink">Planfest</p>
              <Link href="/planejar" className="block hover:text-ink">Planejar com IA</Link>
              <Link href="/fornecedores" className="block hover:text-ink">Encontrar fornecedores</Link>
              <Link href="/seja-fornecedor" className="block hover:text-ink">Cadastrar minha empresa</Link>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-ink">Transparência</p>
              <Link href="/privacidade" className="block hover:text-ink">Privacidade e LGPD</Link>
              <Link href="/termos" className="block hover:text-ink">Termos de uso</Link>
              <p>Atendemos hoje a Região Metropolitana do Rio de Janeiro.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
