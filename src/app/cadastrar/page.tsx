import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { getT } from "@/server/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Criar conta", "Create account") };
}

export default async function Cadastrar({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-3xl font-bold">{t("Criar conta", "Create account")}</h1>
      <p className="mt-1 text-ink-soft">{t("Para pedir orçamentos e acompanhar as respostas dos fornecedores.", "To request quotes and follow vendor replies.")}</p>
      <div className="mt-6"><SignupForm next={next} /></div>
      <p className="mt-6 text-center text-sm text-ink-soft">{t("É fornecedor?", "Are you a vendor?")} <Link href="/seja-fornecedor" className="font-semibold text-pitanga">{t("Cadastre sua empresa", "Register your business")}</Link></p>
    </div>
  );
}
