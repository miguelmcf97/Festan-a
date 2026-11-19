import Link from "next/link";
import { requireUser } from "@/server/auth";

const NAV = [
  { href: "/admin", label: "Indicadores" },
  { href: "/admin/fornecedores", label: "Fornecedores" },
  { href: "/admin/solicitacoes", label: "Solicitações e contratações" },
  { href: "/admin/avaliacoes", label: "Avaliações" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/usuarios", label: "Usuários e reclamações" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["ADMIN"], "/admin");
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <nav className="mb-6 flex flex-wrap gap-1 rounded-2xl bg-surface p-1.5" aria-label="Administração">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-xl px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-white hover:text-ink">{n.label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
