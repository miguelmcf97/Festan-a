import type { Metadata } from "next";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const isDemo = process.env.APP_ENV !== "production";
  return (
    <div className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-3xl font-bold">Entrar</h1>
      <p className="mt-1 text-ink-soft">Acompanhe suas festas, orçamentos e contratações.</p>
      <div className="mt-6"><LoginForm next={next} /></div>
      {isDemo && (
        <div className="mt-8 rounded-2xl bg-maracuja-soft p-4 text-sm">
          <p className="font-semibold">Contas de demonstração (senha: planfest123)</p>
          <ul className="mt-1 space-y-0.5 text-[#6b4800]">
            <li>Cliente: cliente@planfest.demo</li>
            <li>Fornecedor: fornecedor@planfest.demo</li>
            <li>Administrador: admin@planfest.demo</li>
          </ul>
        </div>
      )}
    </div>
  );
}
