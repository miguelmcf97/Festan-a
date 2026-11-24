import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Entrar", "Sign in") };
}

export default async function Entrar({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const isDemo = process.env.APP_ENV !== "production";
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-3xl font-bold">{t("Entrar", "Sign in")}</h1>
      <p className="mt-1 text-ink-soft">{t("Acompanhe suas festas, orçamentos e contratações.", "Track your parties, quotes and bookings.")}</p>
      <div className="mt-6"><LoginForm next={next} /></div>
      {isDemo && (
        <div className="mt-8 rounded-2xl bg-maracuja-soft p-4 text-sm">
          <p className="font-semibold">{t("Contas de demonstração (senha: planfest123)", "Demo accounts (password: planfest123)")}</p>
          <ul className="mt-1 space-y-0.5 text-[#6b4800]">
            <li>{t("Cliente", "Customer")}: cliente@planfest.demo</li>
            <li>{t("Fornecedor", "Vendor")}: fornecedor@planfest.demo</li>
            <li>{t("Administrador", "Admin")}: admin@planfest.demo</li>
          </ul>
        </div>
      )}
    </div>
  );
}
