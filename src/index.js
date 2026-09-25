import { USERS, RANKS, findUser, rankInfo, permissionsFor, normalizeRankKey } from "../lib/users.js";
import { DurableObject } from "cloudflare:workers";
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
const VALID_PATROL_KEYS = new Set(["1", "2", "3", "4", "5"]);
const ALLTIME_KEY = "hours:alltime";
const MOTD_KEY = "motd:current";
// Anyone whose rank level is strictly greater than this can change the
// message of the day. Level, not a permission string, since the request
// was framed as an absolute rank threshold rather than a named ability.
const MOTD_MIN_LEVEL = 4;
const WEEKLY_KEY_PATTERN = /^hours:\d{4}-\d{2}-\d{2}$/;
const REPORTS_KEY = "reports:list";
const REPORT_TYPES = new Set([
  "Altercation", "Theft", "Trespassing",
  "Rule Violation", "Suspicious Activity", "Other",
]);

const SECTORS = new Set([
  "City of Morthal", "Territory of Hjaalmarsh", "March of Snowhawk",
  "Territory of Cold Rock", "Settlement of Stonehills", "Labyrinthian",
]);

/** All guards share one LiveState instance — this is guild-wide shared
 * state (who's clocked in, who's on what patrol, open affairs cases),
 * not per-user data, so every request routes to the same named object
 * rather than being split by user or session. */
function getLiveState(env) {
  const id = env.LIVE_STATE.idFromName("global");
  return env.LIVE_STATE.get(id);
}

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
        canEditMotd: rankInfo(session.rank).level > MOTD_MIN_LEVEL,
        canManageAffairs: rankInfo(session.rank).level >= (RANKS.court?.level ?? Infinity),
      });
    }
    if (pathname === "/api/motd" && request.method === "GET") {
      return handleGetMotd(env);
    }
    if (pathname === "/api/motd" && request.method === "POST") {
      return handleSetMotd(request, env, session);
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
    if (pathname === "/api/patrol-assignments" && request.method === "GET") {
      return handlePatrolAssignmentsList(env);
    }
    if (pathname === "/api/patrol-assignments" && request.method === "POST") {
      return handlePatrolAssignmentSet(request, env, session.user);
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
    if (pathname === "/api/reports" && request.method === "GET") {
      return handleListReports(env, session);
    }
    if (pathname === "/api/reports" && request.method === "POST") {
      return handleCreateReport(request, env, session);
    }
    if (pathname === "/api/reports/edit" && request.method === "POST") {
      return handleEditReport(request, env, session);
    }
    if (pathname === "/api/reports/notes" && request.method === "POST") {
      return handleAddNote(request, env, session);
    }
    if (pathname === "/api/reports/notes/edit" && request.method === "POST") {
      return handleEditNote(request, env, session);
    }
    if (pathname === "/api/reports/notes/delete" && request.method === "POST") {
      return handleDeleteNote(request, env, session);
    }
    if (pathname === "/api/reports/archive" && request.method === "POST") {
      return handleArchiveReport(request, env, session);
    }

    if (pathname === "/api/affairs" && request.method === "GET") {
      return handleListAffairs(env);
    }
    if (pathname === "/api/affairs" && request.method === "POST") {
      return handleCreateAffair(request, env, session);
    }
    if (pathname === "/api/affairs/edit" && request.method === "POST") {
      return handleEditAffair(request, env, session);
    }
    if (pathname === "/api/affairs/finish" && request.method === "POST") {
      return handleFinishAffair(request, env, session);
    }
    if (pathname === "/api/affairs/join" && request.method === "POST") {
      return handleJoinAffair(request, env, session);
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
        isGm: normalizeRankKey(u.rank) === "gm",
        allTimeHours: totals[u.name] || 0,
        memberDays: daysSince(u.memberSince),
      };
    })
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
  return json({ people, militiaLevel: RANKS.militia?.level ?? null });
}

/* ---------- message of the day, backed by a single KV key ---------- */

async function handleGetMotd(env) {
  const raw = await env.CLOCKINS.get(MOTD_KEY);
  if (!raw) return json({ text: "", updatedBy: null, updatedAt: null });
  try {
    return json(JSON.parse(raw));
  } catch {
    return json({ text: "", updatedBy: null, updatedAt: null });
  }
}

/**
 * Sets the message of the day. Gated by rank level (> MOTD_MIN_LEVEL),
 * not a permission string, since the request was for an absolute rank
 * threshold. An empty message is allowed — it clears the custom MOTD and
 * the client falls back to its own default heading text.
 */
async function handleSetMotd(request, env, session) {
  const level = rankInfo(session.rank).level;
  if (level <= MOTD_MIN_LEVEL) {
    return json({ error: "You don't have permission to change the message of the day" }, 403);
  }

  let text = "";
  try {
    const body = await request.json();
    text = String(body.text ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (text.length > 300) {
    return json({ error: "Message is too long (300 characters max)" }, 400);
  }

  const record = { text, updatedBy: session.user, updatedAt: Date.now() };
  await env.CLOCKINS.put(MOTD_KEY, JSON.stringify(record));
  return json(record);
}

/* ---------- clock in/out, backed by KV ---------- */

function toEntries(state) {
  return Object.entries(state)
    .map(([name, info]) => {
      const record = findUser(name);
      return { name, since: info.since, rankLabel: rankInfo(record?.rank).label };
    })
    .sort((a, b) => a.since - b.since);
}

async function handleClockList(env) {
  const state = await getLiveState(env).getClockEntries();
  return json({ entries: toEntries(state) });
}

async function handleClockToggle(env, user) {
  const { state, clockedOutSince } = await getLiveState(env).toggleClock(user);
  // Hours history stays on KV (it's an append-heavy log, not live status —
  // no reason to route it through the DO too), so this step still happens
  // in the Worker, using whatever since-time the DO reports back.
  if (clockedOutSince !== null) {
    await recordSession(env, user, clockedOutSince, Date.now());
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

  const { state } = await getLiveState(env).forceClockOut(target);
  return json({ entries: toEntries(state) });
}

/* ---------- patrol assignments (who's on which patrol) ---------- */

async function handlePatrolAssignmentsList(env) {
  const assignments = await getLiveState(env).getPatrolAssignments();
  return json({ assignments });
}

/**
 * Sets or clears the calling guard's patrol assignment. One patrol per
 * guard at a time — assigning a new one silently replaces any previous
 * one for that same guard, same as the existing clock-in toggle model.
 * The clock-in requirement and the write both now happen inside the DO,
 * atomically, since both clock state and patrol state live in the same
 * object — no separate KV round-trip needed to check duty status.
 */
async function handlePatrolAssignmentSet(request, env, user) {
  let patrol = null;
  try {
    const body = await request.json();
    patrol = body.patrol === null ? null : String(body.patrol ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (patrol !== null && !VALID_PATROL_KEYS.has(patrol)) {
    return json({ error: "Invalid patrol" }, 400);
  }

  const result = await getLiveState(env).setPatrol(user, patrol);
  if (result.error) {
    return json({ error: result.error }, result.error.includes("clocked in") ? 403 : 400);
  }
  return json({ assignments: result.assignments });
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
  const clockState = await getLiveState(env).getClockEntries();
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
 * record and summing each person's hours across all of history. Safe to
 * run more than once — it's a full recompute, not an increment.
 * Requires the manageClockins permission.
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

/* ---------- Guard Reports, backed by a single KV list ---------- */

async function readReports(env) {
  const raw = await env.CLOCKINS.get(REPORTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeReports(env, reports) {
  await env.CLOCKINS.put(REPORTS_KEY, JSON.stringify(reports));
}

function sortReports(reports) {
  return [...reports].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1; // newest date first
    return b.createdAt - a.createdAt; // tiebreak: newest filed first
  });
}

function validateReportFields(body) {
  const title = String(body.title ?? "").trim();
  const type = String(body.type ?? "").trim();
  const typeOther = String(body.typeOther ?? "").trim();
  const date = String(body.date ?? "").trim();
  const location = String(body.location ?? "").trim();
  const sector = String(body.sector ?? "").trim();
  const victim = String(body.victim ?? "").trim();
  const perpetrator = String(body.perpetrator ?? "").trim();
  const description = String(body.description ?? "").trim();
  const actions = String(body.actions ?? "").trim();

  if (!title) return { error: "A short title is required" };
  if (title.length > 120) return { error: "Title is too long (120 characters max)" };
  if (!REPORT_TYPES.has(type)) return { error: "Invalid report type" };
  if (type === "Other" && !typeOther) return { error: "Please specify the report type" };
  if (!date || Number.isNaN(Date.parse(date))) return { error: "A valid date is required" };
  if (!location) return { error: "Location is required" };
  if (!SECTORS.has(sector)) return { error: "A valid sector is required" };
  if (!description) return { error: "Description is required" };

  return {
    fields: {
      title,
      type,
      typeOther: type === "Other" ? typeOther : "",
      date, location, sector, victim, perpetrator, description, actions,
    }
  };
}

async function handleListReports(env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("canDoReports")) {
    return json({ error: "You don't have permission to view reports" }, 403);
  }
  const reports = await readReports(env);
  return json({ reports: sortReports(reports) });
}

async function handleCreateReport(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("canDoReports")) {
    return json({ error: "You don't have permission to file a report" }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Could not read the request" }, 400); }

  const validated = validateReportFields(body);
  if (validated.error) return json({ error: validated.error }, 400);

  const record = findUser(session.user);
  const report = {
    id: crypto.randomUUID(),
    reportingGuard: session.user,
    reportingRankLabel: rankInfo(record?.rank).label,
    ...validated.fields,
    notes: [],
    archived: false,
    createdAt: Date.now(),
    editedAt: null,
  };

  const reports = await readReports(env);
  reports.push(report);
  await writeReports(env, reports);

  return json({ report, reports: sortReports(reports) });
}

/**
 * Edits an existing report's fields. Only the person who originally filed
 * it (reportingGuard) can edit it — canDoReports alone isn't enough, since
 * that would let anyone rewrite anyone else's report. Notes, archived
 * status, id, and who filed it are untouched by an edit.
 */
async function handleEditReport(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("canDoReports")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Could not read the request" }, 400); }

  const id = String(body.id ?? "").trim();
  if (!id) return json({ error: "No report id given" }, 400);

  const reports = await readReports(env);
  const target = reports.find((r) => r.id === id);
  if (!target) return json({ error: "Report not found" }, 404);

  if (target.reportingGuard !== session.user) {
    return json({ error: "Only the guard who filed this report can edit it" }, 403);
  }

  const validated = validateReportFields(body);
  if (validated.error) return json({ error: validated.error }, 400);

  Object.assign(target, validated.fields);
  target.editedAt = Date.now();
  await writeReports(env, reports);

  return json({ reports: sortReports(reports) });
}

/**
 * Appends a note to a report. Any holder of canDoReports can add one —
 * no separate permission, per design. A note can later be edited or
 * deleted only by the person who wrote it (see handleEditNote and
 * handleDeleteNote below).
 */
async function handleAddNote(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("canDoReports")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let id = "", text = "";
  try {
    const body = await request.json();
    id = String(body.id ?? "").trim();
    text = String(body.text ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (!id) return json({ error: "No report id given" }, 400);
  if (!text) return json({ error: "Note can't be empty" }, 400);

  const reports = await readReports(env);
  const target = reports.find((r) => r.id === id);
  if (!target) return json({ error: "Report not found" }, 404);

  const record = findUser(session.user);
  if (!Array.isArray(target.notes)) target.notes = [];
  target.notes.push({
    id: crypto.randomUUID(),
    author: session.user,
    authorRankLabel: rankInfo(record?.rank).label,
    text,
    createdAt: Date.now(),
    editedAt: null,
  });

  await writeReports(env, reports);
  return json({ reports: sortReports(reports) });
}

/**
 * Edits the text of a note. Only the person who originally wrote the
 * note can edit it — canDoReports alone isn't enough, same rule as
 * editing a report's own fields.
 */
async function handleEditNote(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("canDoReports")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let reportId = "", noteId = "", text = "";
  try {
    const body = await request.json();
    reportId = String(body.reportId ?? "").trim();
    noteId = String(body.noteId ?? "").trim();
    text = String(body.text ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (!reportId || !noteId) return json({ error: "Missing report or note id" }, 400);
  if (!text) return json({ error: "Note can't be empty" }, 400);

  const reports = await readReports(env);
  const report = reports.find((r) => r.id === reportId);
  if (!report) return json({ error: "Report not found" }, 404);

  const note = Array.isArray(report.notes) ? report.notes.find((n) => n.id === noteId) : null;
  if (!note) return json({ error: "Note not found" }, 404);

  if (note.author !== session.user) {
    return json({ error: "Only the person who wrote a note can edit it" }, 403);
  }

  note.text = text;
  note.editedAt = Date.now();
  await writeReports(env, reports);
  return json({ reports: sortReports(reports) });
}

/**
 * Deletes a note outright. Only the person who originally wrote the
 * note can delete it.
 */
async function handleDeleteNote(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("canDoReports")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let reportId = "", noteId = "";
  try {
    const body = await request.json();
    reportId = String(body.reportId ?? "").trim();
    noteId = String(body.noteId ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (!reportId || !noteId) return json({ error: "Missing report or note id" }, 400);

  const reports = await readReports(env);
  const report = reports.find((r) => r.id === reportId);
  if (!report) return json({ error: "Report not found" }, 404);
  if (!Array.isArray(report.notes)) report.notes = [];

  const noteIndex = report.notes.findIndex((n) => n.id === noteId);
  if (noteIndex === -1) return json({ error: "Note not found" }, 404);

  if (report.notes[noteIndex].author !== session.user) {
    return json({ error: "Only the person who wrote a note can delete it" }, 403);
  }

  report.notes.splice(noteIndex, 1);
  await writeReports(env, reports);
  return json({ reports: sortReports(reports) });
}

async function handleArchiveReport(request, env, session) {
  const permissions = permissionsFor(session.rank);
  if (!permissions.includes("canDoReports")) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let id = "", archived = true;
  try {
    const body = await request.json();
    id = String(body.id ?? "").trim();
    archived = Boolean(body.archived);
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (!id) return json({ error: "No report id given" }, 400);

  const reports = await readReports(env);
  const target = reports.find((r) => r.id === id);
  if (!target) return json({ error: "Report not found" }, 404);

  target.archived = archived;
  await writeReports(env, reports);

  return json({ reports: sortReports(reports) });
}

/* ---------- external/internal affairs cards ---------- */

function sortAffairs(affairs) {
  return [...affairs].sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? 1 : -1; // active first
    return b.createdAt - a.createdAt; // newest first within each group
  });
}

function canManageAffairsRank(rank) {
  return rankInfo(rank).level >= (RANKS.court?.level ?? Infinity);
}

async function handleListAffairs(env) {
  const affairs = await getLiveState(env).listAffairs();
  return json({ affairs });
}

async function handleCreateAffair(request, env, session) {
  if (!canManageAffairsRank(session.rank)) {
    return json({ error: "You don't have permission to open a case" }, 403);
  }

  let title = "", description = "";
  try {
    const body = await request.json();
    title = String(body.title ?? "").trim();
    description = String(body.description ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (!title) return json({ error: "A title is required" }, 400);
  if (title.length > 120) return json({ error: "Title is too long (120 characters max)" }, 400);
  if (!description) return json({ error: "A description is required" }, 400);

  const record = findUser(session.user);
  const result = await getLiveState(env).createAffair({
    title, description,
    createdBy: session.user,
    createdByRankLabel: rankInfo(record?.rank).label,
  });

  return json(result);
}

/** Editing and finishing are both restricted to the card's own creator,
 * same ownership rule as editing a guard report — canManageAffairs alone
 * isn't enough, another Court member can't edit someone else's case. */
async function handleEditAffair(request, env, session) {
  if (!canManageAffairsRank(session.rank)) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let id = "", title = "", description = "";
  try {
    const body = await request.json();
    id = String(body.id ?? "").trim();
    title = String(body.title ?? "").trim();
    description = String(body.description ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  if (!title) return json({ error: "A title is required" }, 400);
  if (title.length > 120) return json({ error: "Title is too long (120 characters max)" }, 400);
  if (!description) return json({ error: "A description is required" }, 400);

  const result = await getLiveState(env).editAffair({ id, title, description, user: session.user });
  if (result.error) return json({ error: result.error }, result.status);
  return json({ affairs: result.affairs });
}

async function handleFinishAffair(request, env, session) {
  if (!canManageAffairsRank(session.rank)) {
    return json({ error: "You don't have permission to do that" }, 403);
  }

  let id = "";
  try {
    const body = await request.json();
    id = String(body.id ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  const result = await getLiveState(env).finishAffair({ id, user: session.user });
  if (result.error) return json({ error: result.error }, result.status);
  return json({ affairs: result.affairs });
}

/** Toggles the calling guard's own membership on a card — anyone can
 * join or leave, not just Court members; that gate only applies to
 * creating, editing, and finishing cases. */
async function handleJoinAffair(request, env, session) {
  let id = "";
  try {
    const body = await request.json();
    id = String(body.id ?? "").trim();
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  const result = await getLiveState(env).joinAffair({ id, user: session.user });
  if (result.error) return json({ error: result.error }, result.status);
  return json({ affairs: result.affairs });
}

/* ---------- LiveState Durable Object ----------
 * One shared instance holds every piece of guild-wide state that gets
 * hammered by continuous polling: who's clocked in, who's on which
 * patrol, and open/closed affairs cases. Requests to a single DO
 * instance are serialized by the runtime, which is what actually solves
 * the KV eventual-consistency lag this replaced — not a config knob,
 * a different consistency model. Permission checks and input validation
 * stay in the Worker handlers above; this class only owns storage. */
export class LiveState extends DurableObject {
  // ---- clock-in ----

  async getClockEntries() {
    return (await this.ctx.storage.get("clock")) || {};
  }

  /** Toggles the caller's own clock state. Returns the new state plus,
   * if this call was a clock-OUT, the since-timestamp of the session
   * that just ended — the Worker uses that to record hours on KV,
   * which stays separate from this object on purpose (append-heavy
   * history, not live status). Clocking out also clears any patrol
   * assignment, done here as one atomic step since both live in this
   * same object now. */
  async toggleClock(user) {
    const state = (await this.ctx.storage.get("clock")) || {};
    let clockedOutSince = null;
    if (state[user]) {
      clockedOutSince = state[user].since;
      delete state[user];
    } else {
      state[user] = { since: Date.now() };
    }
    await this.ctx.storage.put("clock", state);
    if (clockedOutSince !== null) await this._clearPatrol(user);
    return { state, clockedOutSince };
  }

  async forceClockOut(target) {
    const state = (await this.ctx.storage.get("clock")) || {};
    if (state[target]) {
      delete state[target];
      await this.ctx.storage.put("clock", state);
      await this._clearPatrol(target);
    }
    return { state };
  }

  // ---- patrol assignments ----

  async getPatrolAssignments() {
    return (await this.ctx.storage.get("patrol")) || {};
  }

  async setPatrol(user, patrol) {
    if (patrol !== null) {
      if (!VALID_PATROL_KEYS.has(patrol)) return { error: "Invalid patrol" };
      const clockState = (await this.ctx.storage.get("clock")) || {};
      if (!clockState[user]) return { error: "You must be clocked in to join a patrol" };
    }
    const assignments = (await this.ctx.storage.get("patrol")) || {};
    if (patrol === null) delete assignments[user];
    else assignments[user] = patrol;
    await this.ctx.storage.put("patrol", assignments);
    return { assignments };
  }

  async _clearPatrol(user) {
    const assignments = (await this.ctx.storage.get("patrol")) || {};
    if (!(user in assignments)) return;
    delete assignments[user];
    await this.ctx.storage.put("patrol", assignments);
  }

  // ---- affairs ----

  async listAffairs() {
    return sortAffairs((await this.ctx.storage.get("affairs")) || []);
  }

  async createAffair({ title, description, createdBy, createdByRankLabel }) {
    const affairs = (await this.ctx.storage.get("affairs")) || [];
    const affair = {
      id: crypto.randomUUID(),
      title, description, createdBy, createdByRankLabel,
      createdAt: Date.now(), finished: false, finishedAt: null,
      editedAt: null, participants: [],
    };
    affairs.push(affair);
    await this.ctx.storage.put("affairs", affairs);
    return { affair, affairs: sortAffairs(affairs) };
  }

  async editAffair({ id, title, description, user }) {
    const affairs = (await this.ctx.storage.get("affairs")) || [];
    const target = affairs.find((a) => a.id === id);
    if (!target) return { error: "Case not found", status: 404 };
    if (target.createdBy !== user) {
      return { error: "Only the person who opened this case can edit it", status: 403 };
    }
    target.title = title;
    target.description = description;
    target.editedAt = Date.now();
    await this.ctx.storage.put("affairs", affairs);
    return { affairs: sortAffairs(affairs) };
  }

  async finishAffair({ id, user }) {
    const affairs = (await this.ctx.storage.get("affairs")) || [];
    const target = affairs.find((a) => a.id === id);
    if (!target) return { error: "Case not found", status: 404 };
    if (target.createdBy !== user) {
      return { error: "Only the person who opened this case can finish it", status: 403 };
    }
    target.finished = true;
    target.finishedAt = Date.now();
    await this.ctx.storage.put("affairs", affairs);
    return { affairs: sortAffairs(affairs) };
  }

  async joinAffair({ id, user }) {
    const affairs = (await this.ctx.storage.get("affairs")) || [];
    const target = affairs.find((a) => a.id === id);
    if (!target) return { error: "Case not found", status: 404 };
    if (!Array.isArray(target.participants)) target.participants = [];
    const idx = target.participants.indexOf(user);
    if (idx === -1) target.participants.push(user);
    else target.participants.splice(idx, 1);
    await this.ctx.storage.put("affairs", affairs);
    return { affairs: sortAffairs(affairs) };
  }
}