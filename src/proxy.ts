import { NextResponse, type NextRequest } from "next/server";

/**
 * Proteção leve de rotas privadas: sem cookie de sessão → /entrar.
 * A autorização real (sessão válida + papel) é verificada no servidor em cada página/ação.
 */
const PRIVATE = ["/painel", "/fornecedor", "/admin", "/notificacoes"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.has("pf_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*", "/fornecedor/:path*", "/admin/:path*", "/notificacoes"] };
