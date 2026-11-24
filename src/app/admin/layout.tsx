import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getT } from "@/server/i18n";

const NAV: [string, string, string][] = [
  ["/admin", "Indicadores", "Metrics"],
  ["/admin/fornecedores", "Fornecedores", "Vendors"],
  ["/admin/solicitacoes", "Solicitações e contratações", "Requests and bookings"],
  ["/admin/avaliacoes", "Avaliações", "Reviews"],
  ["/admin/categorias", "Categorias", "Categories"],
  ["/admin/usuarios", "Usuários e reclamações", "Users and complaints"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["ADMIN"], "/admin");
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <nav className="mb-6 flex flex-wrap gap-1 rounded-2xl bg-surface p-1.5" aria-label={t("Administração", "Administration")}>
        {NAV.map(([href, pt, en]) => (
          <Link key={href} href={href} className="rounded-xl px-3.5 py-2 text-sm font-semibold text-ink-soft hover:bg-white hover:text-ink">{t(pt, en)}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
