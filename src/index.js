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
const KV_KEY = "clockins:state";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (pathname === "/api/logout" && request.method === "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie("", 0) }
      });
    }

    const session = await verifySession(readCookie(request, COOKIE_NAME), env.SESSION_SECRET);
    const isPublic = PUBLIC_PATHS.has(pathname);

    if (!isPublic && !session) {
      if (pathname.startsWith("/api/")) return json({ error: "Not signed in" }, 401);
      const target = new URL("/login.html", url.origin);
      target.searchParams.set("next", pathname + url.search);
      return Response.redirect(target.toString(), 302);
    }

    if (pathname === "/api/me" && request.method === "GET") {
      return json({ user: session.user });
    }
    if (pathname === "/api/clockins" && request.method === "GET") {
      return handleClockList(env);
    }
    if (pathname === "/api/clock" && request.method === "POST") {
      return handleClockToggle(env, session.user);
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

/* ---------- clock in/out, backed by KV ---------- */

async function readClockState(env) {
  const raw = await env.CLOCKINS.get(KV_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function writeClockState(env, state) {
  await env.CLOCKINS.put(KV_KEY, JSON.stringify(state));
}

function toEntries(state) {
  return Object.entries(state)
    .map(([name, info]) => ({ name, since: info.since }))
    .sort((a, b) => a.since - b.since);
}

async function handleClockList(env) {
  const state = await readClockState(env);
  return json({ entries: toEntries(state) });
}

async function handleClockToggle(env, user) {
  const state = await readClockState(env);

  if (state[user]) {
    delete state[user];
  } else {
    state[user] = { since: Date.now() };
  }

  await writeClockState(env, state);
  return json({ entries: toEntries(state), self: state[user] ?? null });
}