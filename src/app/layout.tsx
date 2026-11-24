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
import { LangProvider } from "@/components/i18n-client";
import { LangSwitch } from "@/components/lang-switch";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: t("Planfest — planeje sua festa com IA e encontre fornecedores", "Planfest — plan your party with AI and find vendors"), template: "%s · Planfest" },
    description: t(
      "Conte como imagina sua festa. A IA da Planfest monta o planejamento, sugere a divisão do orçamento e encontra fornecedores na Região Metropolitana do Rio.",
      "Describe the party you have in mind. Planfest's AI builds the plan, suggests how to split the budget and finds vendors in the Rio de Janeiro metro area.",
    ),
  };
}
export const viewport: Viewport = { themeColor: "#e5384f" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const { lang, t } = await getT();
  const unread = user
    ? (await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))))[0].n
    : 0;
  const isDemoEnv = process.env.APP_ENV !== "production";
  const dashboard = user?.role === "ADMIN" ? "/admin" : user?.role === "PROVIDER" ? "/fornecedor" : "/painel";

  const nav = [
    { href: "/planejar", label: t("Planejar com IA", "Plan with AI") },
    { href: "/fornecedores", label: t("Fornecedores", "Vendors") },
    { href: "/seja-fornecedor", label: t("Para fornecedores", "For vendors") },
  ];

  return (
    <html lang={lang === "en" ? "en" : "pt-BR"}>
      <body className="min-h-dvh">
        <LangProvider lang={lang}>
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">{t("Pular para o conteúdo", "Skip to content")}</a>
        {isDemoEnv && (
          <div className="bg-maracuja px-4 py-1.5 text-center text-xs font-semibold text-ink">
            {t("Ambiente de demonstração: fornecedores, avaliações e valores exibidos são fictícios. Nenhum pagamento é processado.", "Demo environment: the vendors, reviews and prices shown are fictitious. No payments are processed.")}
          </div>
        )}
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
            <Link href="/" className="font-display text-2xl font-extrabold tracking-tight text-ink" aria-label={t("Planfest, página inicial", "Planfest, home page")}>
              plan<span className="text-pitanga">fest</span>
            </Link>
            <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label={t("Principal", "Main")}>
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-surface hover:text-ink">{n.label}</Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              {user ? (
                <>
                  <Link href="/notificacoes" className="relative grid size-10 place-items-center rounded-full hover:bg-surface" aria-label={`${t("Notificações", "Notifications")}${unread ? `, ${unread} ${t("não lidas", "unread")}` : ""}`}>
                    <Bell className="size-5" />
                    {unread > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-pitanga px-1 text-[10px] font-bold text-white">{unread}</span>}
                  </Link>
                  <Link href={dashboard} className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white sm:inline-block">
                    {user.role === "ADMIN" ? t("Administração", "Admin") : user.role === "PROVIDER" ? t("Meu painel", "My dashboard") : t("Minhas festas", "My parties")}
                  </Link>
                  <form action="/sair" method="post" className="hidden sm:block">
                    <button className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface">{t("Sair", "Sign out")}</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/entrar" className="hidden rounded-full px-4 py-2 text-sm font-semibold hover:bg-surface sm:inline-block">{t("Entrar", "Sign in")}</Link>
                  <Link href="/cadastrar" className="hidden rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white sm:inline-block">{t("Criar conta", "Create account")}</Link>
                </>
              )}
              <MobileMenu nav={nav} loggedIn={Boolean(user)} dashboard={dashboard} />
              <LangSwitch lang={lang} />
            </div>
          </div>
        </header>
        <main id="conteudo">{children}</main>
        <footer className="mt-24 border-t border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft sm:grid-cols-3">
            <div>
              <p className="font-display text-xl font-extrabold text-ink">plan<span className="text-pitanga">fest</span></p>
              <p className="mt-2 max-w-xs">{t("Você imagina a festa. A IA ajuda a planejar. A Planfest encontra quem pode realizar.", "You imagine the party. The AI helps you plan it. Planfest finds who can make it happen.")}</p>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-ink">Planfest</p>
              <Link href="/planejar" className="block hover:text-ink">{t("Planejar com IA", "Plan with AI")}</Link>
              <Link href="/fornecedores" className="block hover:text-ink">{t("Encontrar fornecedores", "Find vendors")}</Link>
              <Link href="/seja-fornecedor" className="block hover:text-ink">{t("Cadastrar minha empresa", "List my business")}</Link>
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-ink">{t("Transparência", "Transparency")}</p>
              <Link href="/privacidade" className="block hover:text-ink">{t("Privacidade e LGPD", "Privacy (LGPD)")}</Link>
              <Link href="/termos" className="block hover:text-ink">{t("Termos de uso", "Terms of use")}</Link>
              <p>{t("Atendemos hoje a Região Metropolitana do Rio de Janeiro.", "We currently serve the Rio de Janeiro metro area.")}</p>
            </div>
          </div>
        </footer>
        </LangProvider>
      </body>
    </html>
  );
}
