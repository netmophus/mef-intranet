import { NextResponse } from 'next/server';

// Next.js 16 : « Proxy » remplace « Middleware » (même fonctionnement).
// Protection légère par présence du cookie d'accès (la vraie validation reste
// côté API). Toutes les routes sont protégées sauf /login et les assets.
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const aCookie = request.cookies.has('mef_access');
  const estLogin = pathname === '/login';

  if (!aCookie && !estLogin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (aCookie && estLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Exclut _next, favicon et tout fichier avec extension (assets).
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
};
