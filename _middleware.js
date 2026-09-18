import { COOKIE_NAME, readCookie, verifySession, json } from "../lib/auth.js";

// Everything else on the site requires a session.
const PUBLIC_PATHS = new Set([
  "/login.html",
  "/api/login",
  "/favicon.ico",
  "/robots.txt",
]);

export async function onRequest(context) {
  const { request, env, next, data } = context;
  const url = new URL(request.url);

  if (PUBLIC_PATHS.has(url.pathname)) return next();

  const session = await verifySession(readCookie(request, COOKIE_NAME), env.SESSION_SECRET);

  if (!session) {
    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not signed in" }, 401);
    }
    const target = new URL("/login.html", url.origin);
    target.searchParams.set("next", url.pathname + url.search);
    return Response.redirect(target.toString(), 302);
  }

  data.user = session.user;

  const response = await next();
  const headers = new Headers(response.headers);
  // Signed-in pages are per-user; keep them out of shared caches.
  headers.set("Cache-Control", "private, no-store");
  return new Response(response.body, { status: response.status, headers });
}
