import { USERS, findUser, rankInfo, permissionsFor } from "../lib/users.js";
import {
  identify, createSession, verifySession,
  readCookie, sessionCookie, COOKIE_NAME, json
} from "../lib/auth.js";
import { splitByCstDay, currentWeekKey, emptyWeek, DAY_NAMES } from "../lib/time.js";

const PUBLIC_PATHS = new Set([
  "/login",
  "/login.html",
  "/api/login",
  "/favicon.ico",
  "/robots.txt",
]);

const TTL = 60 * 60 * 12;
const KV_KEY = "clockins:state";
const ALLTIME_KEY = "hours:alltime";
const WEEKLY_KEY_PATTERN = /^hours:\d{4}-\d{2}-\d{2}$/;

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
      return json({
        user: session.user,
        rank: session.rank,
        rankLabel: rankInfo(session.rank).label,
        permissions: permissionsFor(session.rank),
      });
    }
    if (pathname === "/api/personnel" && request.method === "GET") {
      return handlePersonnel(env);
    }
    if (pathname === "/api/clockins" && request.method === "GET") {
      return handleClockList(env);
    }
    if (pathname === "/api/clock" && request.method === "POST") {
      return handleClockToggle(env, session.user);
    }
    if (pathname === "/api/clock/force-out" && request.method === "POST") {
      return handleForceClockOut(request, env, session);
    }
    if (pathname === "/api/hours" && request.method === "GET") {
      return handleHours(env, session, url.searchParams.get("week"));
    }
    if (pathname === "/api/hours/clear" && request.method === "POST") {
      return handleClearHours(request, env, session);
    }
    if (pathname === "/api/hours/recalculate-alltime" && request.method === "POST") {
      return handleRecalculateAlltime(env, session);
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

  const record = findUser(user);
  const token = await createSession(user, record?.rank ?? null, env.SESSION_SECRET, TTL);
  return json({ user, next: safeRedirect(next) }, 200, { "Set-Cookie": sessionCookie(token, TTL) });
}

function safeRedirect(target) {
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  if (target.startsWith("/login")) return "/";
  return target;
}

/**
 * Days since a person's memberSince date, as a plain calendar-day count
 * (not tied to CST day boundaries — this is a membership counter, not a
 * duty-hours calculation). Returns null if memberSince is missing or
 * unparseable, so the frontend can show "—" instead of a wrong number.
 */
function daysSince(dateString) {
  if (!dateString) return null;
  const parsed = Date.parse(dateString + "T00:00:00Z");
  if (Number.isNaN(parsed)) return null;
  const diffMs = Date.now() - parsed;
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Every registered person, their rank, all-time clocked hours, and days
 * since they joined, for the Personnel list on Home. Never includes
 * passphrases. The base roster is static (no KV cost); all-time totals
 * cost one KV read.
 */
async function handlePersonnel(env) {
  const totals = await readAlltimeTotals(env);
  const people = USERS
    .map((u) => {
      const info = rankInfo(u.rank);
      return {
        name: u.name,
        rankLabel: info.label,
        level: info.level,
        allTimeHours: totals[u.name] || 0,
        memberDays: daysSince(u.memberSince),
      };
    })
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  return json({ people });
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
    .map(([name, info]) => {
      const record = findUser(name);
      return { name, since: info.since, rankLabel: rankInfo(record?.rank).label };
    })
    .sort((a, b) => a.since - b.since);
}

async function handleClockList(env) {
  const state = await readClockState(env);
  return json({ entries: toEntries(state) });
}

async function handleClockToggle(env, user) {
  const state = await readClockState(env);

  if (state[user]) {
    const since = state[user].since;
    delete state[user];
    await writeClockState(env, state);
    await recordSession(env, user, since, Date.now());
  } else {
    state[user] = { since: Date.now() };
    await writeClockState(env, state);
  }

  return json({ entries: toEntries(state), self: state[user] ?? null });
}

/**
 * Force-clocks someone out without recording their current session's
 * elapsed time — the in-progress stint is discarded, not added to today's
 * hours or their all-time total. Any hours they already had recorded
 * earlier today are untouched. Requires the manageClockins permission.
 */
async function handleForceClockOut(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("manageClockins")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let target = "";
  try {
    const body = await request.json();
    target = String(body.name ?? "").trim();
  } catch { return json({ error: "Could not read the request" }, 400); }

  if (!target) return json({ error: "No name given" }, 400);

  const state = await readClockState(env);
  if (!state[target]) {
    return json({ entries: toEntries(state) }); // already off duty, nothing to do
  }

  delete state[target];
  await writeClockState(env, state);

  return json({ entries: toEntries(state) });
}

/* ---------- weekly hours + all-time totals, backed by KV ---------- */

async function readAlltimeTotals(env) {
  const raw = await env.CLOCKINS.get(ALLTIME_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function adjustAlltimeTotal(env, user, deltaHours) {
  const totals = await readAlltimeTotals(env);
  const next = Math.max(0, (totals[user] || 0) + deltaHours);
  totals[user] = next;
  await env.CLOCKINS.put(ALLTIME_KEY, JSON.stringify(totals));
}

async function recordSession(env, user, startMs, endMs) {
  const segments = splitByCstDay(startMs, endMs);
  const byWeek = {};
  for (const seg of segments) (byWeek[seg.weekKey] ??= []).push(seg);

  for (const [weekKey, segs] of Object.entries(byWeek)) {
    const key = "hours:" + weekKey;
    const raw = await env.CLOCKINS.get(key);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[user]) data[user] = emptyWeek();
    for (const seg of segs) data[user][seg.day] += seg.hours;
    await env.CLOCKINS.put(key, JSON.stringify(data));
  }

  const totalHours = (endMs - startMs) / (60 * 60 * 1000);
  await adjustAlltimeTotal(env, user, totalHours);
}

async function handleHours(env, session, requestedWeek) {
  const weekKey = requestedWeek || currentWeekKey();
  const raw = await env.CLOCKINS.get("hours:" + weekKey);
  const stored = raw ? JSON.parse(raw) : {};

  // Fold in live partial-day hours for anyone still clocked in.
  const clockState = await readClockState(env);
  const now = Date.now();
  const live = JSON.parse(JSON.stringify(stored));
  for (const [name, info] of Object.entries(clockState)) {
    const segments = splitByCstDay(info.since, now).filter((s) => s.weekKey === weekKey);
    if (!segments.length) continue;
    if (!live[name]) live[name] = emptyWeek();
    for (const seg of segments) live[name][seg.day] += seg.hours;
  }

  const permissions = permissionsFor(session.rank);
  const canViewAll = permissions.includes("viewAllHours");
  const canManageHours = permissions.includes("manageClockins");

  const names = canViewAll ? Object.keys(live) : [session.user];
  if (!canViewAll && !live[session.user]) live[session.user] = emptyWeek();

  const people = names.map((name) => {
    const days = live[name] ?? emptyWeek();
    const record = findUser(name);
    const week = DAY_NAMES.reduce((sum, d) => sum + (days[d] || 0), 0);
    return { name, rankLabel: rankInfo(record?.rank).label, days, week };
  });

  return json({ weekKey, people, canViewAll, canManageHours });
}

/**
 * Zeroes one person's stored hours for one day of one week, and subtracts
 * that same amount from their all-time total so the two stay consistent.
 * Requires the manageClockins permission.
 *
 * Note: if the target is currently clocked in and the cleared day is part
 * of their active session, the number will show live time again on the
 * next refresh, since that time isn't written to storage until they clock
 * out. Force-clock them out first for a clean zero.
 */
async function handleClearHours(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("manageClockins")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let weekKey = "", target = "", day = "";
  try {
    const body = await request.json();
    weekKey = String(body.week ?? "").trim();
    target = String(body.name ?? "").trim();
    day = String(body.day ?? "").trim();
  } catch { return json({ error: "Could not read the request" }, 400); }

  if (!weekKey || !target || !DAY_NAMES.includes(day)) {
    return json({ error: "Missing or invalid week, name, or day" }, 400);
  }

  const key = "hours:" + weekKey;
  const raw = await env.CLOCKINS.get(key);
  const data = raw ? JSON.parse(raw) : {};
  if (!data[target]) data[target] = emptyWeek();

  const previousValue = data[target][day] || 0;
  data[target][day] = 0;
  await env.CLOCKINS.put(key, JSON.stringify(data));

  if (previousValue > 0) {
    await adjustAlltimeTotal(env, target, -previousValue);
  }

  return json({ ok: true });
}

/**
 * Rebuilds hours:alltime from scratch by walking every stored weekly
 * record and summing each person's hours across all of history. This is
 * a full recompute, not an increment, so it's safe to run more than once
 * — running it twice never double-counts, it just recalculates the same
 * ground truth from the weekly records, which remain the source of truth.
 *
 * Needed because the all-time counter only started accumulating from the
 * moment it was added to the site; this catches it up using hours that
 * were already recorded in earlier weeks before that.
 *
 * Requires manageClockins, since it rewrites everyone's numbers at once.
 */
async function handleRecalculateAlltime(env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("manageClockins")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  const totals = {};
  let weeksProcessed = 0;
  let cursor;

  do {
    const page = await env.CLOCKINS.list({ prefix: "hours:", cursor });
    for (const key of page.keys) {
      if (!WEEKLY_KEY_PATTERN.test(key.name)) continue; // skip hours:alltime itself
      const raw = await env.CLOCKINS.get(key.name);
      if (!raw) continue;
      let data;
      try { data = JSON.parse(raw); } catch { continue; }
      for (const [name, days] of Object.entries(data)) {
        const weekTotal = DAY_NAMES.reduce((sum, d) => sum + (days[d] || 0), 0);
        totals[name] = (totals[name] || 0) + weekTotal;
      }
      weeksProcessed++;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  await env.CLOCKINS.put(ALLTIME_KEY, JSON.stringify(totals));

  return json({ ok: true, weeksProcessed, totals });
}