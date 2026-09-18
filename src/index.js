import { USERS } from "../lib/users.js";
import {
  identify, createSession, verifySession,
  readCookie, sessionCookie, COOKIE_NAME, json
} from "../lib/auth.js";

const PUBLIC_PATHS = new Set([
  "/login",
  "/login.html",
  "/api/login",
  "/favicon.ico",
  "/robots.txt",
]);

const TTL = 60 * 60 * 12;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie("", 0) }
      });
    }
    if (url.pathname === "/api/me" && request.method === "GET") {
      const session = await verifySession(readCookie(request, COOKIE_NAME), env.SESSION_SECRET);
      if (!session) return json({ error: "Not signed in" }, 401);
      return json({ user: session.user });
    }

    if (!PUBLIC_PATHS.has(url.pathname)) {
      const session = await verifySession(readCookie(request, COOKIE_NAME), env.SESSION_SECRET);
      if (!session) {
        if (url.pathname.startsWith("/api/")) return json({ error: "Not signed in" }, 401);
        const target = new URL("/login.html", url.origin);
        target.searchParams.set("next", url.pathname + url.search);
        return Response.redirect(target.toString(), 302);
      }
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleLogin(request, env) {
  if (!env.SESSION_SECRET) return json({ error: "Server is not configured yet" }, 500);

  let passphrase = "", next = "/";
  try {
    const body = await request.json();
    passphrase = String(body.passphrase ?? "").trim();
    next = String(body.next ?? "/");
  } catch { return json({ error: "Could not read the request" }, 400); }

  if (!passphrase) return json({ error: "Enter your passphrase" }, 400);

  const user = identify(passphrase, USERS);
  if (!user) return json({ error: "That passphrase isn't recognized" }, 401);

  const token = await createSession(user, env.SESSION_SECRET, TTL);
  return json({ user, next: safeRedirect(next) }, 200, { "Set-Cookie": sessionCookie(token, TTL) });
}

function safeRedirect(target) {
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  if (target.startsWith("/login")) return "/";
  return target;
}