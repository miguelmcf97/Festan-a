"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileMenu({ nav, loggedIn, dashboard }: { nav: { href: string; label: string }[]; loggedIn: boolean; dashboard: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full hover:bg-surface" aria-expanded={open} aria-controls="menu-movel" aria-label={open ? "Fechar menu" : "Abrir menu"}>
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div id="menu-movel" className="absolute inset-x-0 top-16 border-b border-line bg-white px-4 pb-4 shadow-sm">
          <nav className="flex flex-col" aria-label="Menu">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-line py-3 font-semibold">{n.label}</Link>
            ))}
            {loggedIn ? (
              <>
                <Link href={dashboard} onClick={() => setOpen(false)} className="border-b border-line py-3 font-semibold">Meu painel</Link>
                <form action="/sair" method="post"><button className="py-3 font-semibold text-ink-soft">Sair</button></form>
              </>
            ) : (
              <>
                <Link href="/entrar" onClick={() => setOpen(false)} className="border-b border-line py-3 font-semibold">Entrar</Link>
                <Link href="/cadastrar" onClick={() => setOpen(false)} className="py-3 font-semibold text-pitanga">Criar conta</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
