import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const pathname = request.nextUrl.pathname;

  // Security + perf headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // API: no-store (evita cache incorreto de dados sensíveis)
  if (pathname.startsWith("/api")) {
    // Public endpoints que podem cachear 1min
    const publicApi = ["/api/health", "/api/lgpd/info", "/api/config/options"];
    const isPublic = publicApi.some((p) => pathname.startsWith(p));
    if (isPublic) {
      response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    } else {
      response.headers.set("Cache-Control", "no-store, must-revalidate");
    }
    return response;
  }

  // Assets estáticos: cache longo
  if (pathname.match(/\.(css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/)) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
