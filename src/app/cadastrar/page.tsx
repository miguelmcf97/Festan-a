import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Cadastrar({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-3xl font-bold">Criar conta</h1>
      <p className="mt-1 text-ink-soft">Para pedir orçamentos e acompanhar as respostas dos fornecedores.</p>
      <div className="mt-6"><SignupForm next={next} /></div>
      <p className="mt-6 text-center text-sm text-ink-soft">É fornecedor? <Link href="/seja-fornecedor" className="font-semibold text-pitanga">Cadastre sua empresa</Link></p>
    </div>
  );
}
