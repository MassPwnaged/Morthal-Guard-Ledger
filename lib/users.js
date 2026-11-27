// Add or remove users here, then push to GitHub to deploy.
// Keep this repo private -- passphrases are stored in plaintext.
//
// A USER LINE LOOKS LIKE:
//   { name: "Wias", passphrase: "...", rank: "vicecaptain", group: "court", group: "court",
//     memberSince: "2026-05-20", permissions: ["globalAdmin"] }
//
//   rank         which rank they hold. You can write the rank's numeric id
//                (rank: 105), its key (rank: "militia") or its label
//                (rank: "Guard"). Case, spaces and punctuation are ignored.
//                Ids never change, so relabelling a rank is always safe.
//                Rank sets the label, sort order (level) and default
//                permissions.
//   group        which Home divider they appear under. Must match a `key`
//                in DIVIDERS below. REQUIRED -- anyone missing or with an
//                unknown group is shown under a visible "Unassigned"
//                divider (and logged) so mistakes can't hide.
//   permissions  OPTIONAL. Extra permission flags for just this person, added
//                on top of what their rank already gives them.
//   memberSince  "YYYY-MM-DD", or "" if unknown (site shows a dash).
//
// PERMISSION FLAGS (add any to a rank's list, or to one user's list):
//   viewAllHours     see everyone's weekly hours, not just your own
//   manageClockins   force clock-out, clear a day's hours, add hours,
//                    recalculate all-time totals
//   canDoReports     create/view/edit/archive Guard Reports, report notes,
//                    and the Militia Notice Board
//   editMotd         change the message of the day
//   manageAffairs    create, edit and finish Auxiliary Affairs
//   viewActivityLog  open the Activity Log
//   viewArchives     see archived reports, archived notices and finished
//                    Auxiliary Affairs (without it they are hidden entirely)
//   markPaid         tick the Paid button next to each person on the Weekly
//                    Hours tab (resets every week). Everyone who can open the
//                    Hours tab can SEE it; only this flag can change it.
//   globalAdmin      GLOBAL OVERRIDE. Grants every flag above. Affects
//                    permission checks only -- never the displayed rank or
//                    what is recorded on reports and cases.
// (Joining a patrol is not a flag: it just requires being clocked in.)
//
// To add a new flag: add its name to the lists above, then give it to the
// ranks/users who should have it. A brand-new flag only does something once
// code checks for it, so ask for the feature to be wired up.
//
// DIVIDERS (Home roster sections). Order here = order on the page. To make a
// new one, add a line to DIVIDERS and set `group` on the people who belong.
// Inside a divider people sort by rank level (highest first), then name.

export const ALL_PERMISSIONS = [
  "viewAllHours", "manageClockins", "canDoReports",
  "editMotd", "manageAffairs", "viewActivityLog", "viewArchives", "markPaid", "globalAdmin",
];

// CLEARANCE LEVELS for Guard Reports. Someone's clearance is their rank's
// `level`. A report can only be read by people whose clearance is at or above
// the report's, and a person can only file/edit a report at their own level or
// below. `level` here must match rank levels; `label` is what the report form
// shows (several ranks can share one level). The first entry is the lowest
// (the default; old reports count as this). globalAdmin sees everything.
export const CLEARANCE_LEVELS = [
  { level: 1,  label: "Guard Initiate" },
  { level: 2,  label: "Guard / Soldier" },
  { level: 3,  label: "Veteran Guard" },
  { level: 4,  label: "Sergeant" },
  { level: 5,  label: "Lieutenant" },
  { level: 6,  label: "Vice-Captain" },
  { level: 7,  label: "Captain" },
  { level: 8,  label: "Court" },
  { level: 9,  label: "Baron" },
  { level: 10, label: "Lady Commander / Lord Regent" },
  { level: 11, label: "Jarl" },
  { level: 12, label: "Game Master" },
];

export const DIVIDERS = [
  { key: "court",     label: "Court" },
  { key: "militia",   label: "Guard" },
  { key: "haafingar", label: "Haafingar" },
  { key: "snowhawk", label: "Snowhawk Garrison" },
  { key: "gm",        label: "Game Master" },
];

export const RANKS = {
  gm: {
    label: "Game Master",
    id: 101,
    level: 12,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives"],
  },
  jarl: {
    label: "Jarl",
    id: 102,
    level: 11,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  ladycommander: {
    label: "Lady Commander",
    id: 103,
    level: 10,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  lordregent: {
    label: "Lord Regent",
    id: 104,
    level: 10,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  baron: {
    label: "Baron",
    id: 105,
    level: 9,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  court: {
    label: "Court",
    id: 106,
    level: 8,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  ambassador: {
    label: "Ambassador",
    id: 119,
    level: 8,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  stewardess: {
    label: "Stewardess",
    id: 120,
    level: 8,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  courtmagistrate: {
    label: "Magistrate",
    id: 121,
    level: 8,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives","markPaid"],
  },
  captain: {
    label: "Captain",
    id: 107,
    level: 7,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives"],
  },
  vicecaptain: {
    label: "Vice-Captain",
    id: 108,
    level: 6,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog", "viewArchives"],
  },
  lieutenant: {
    label: "Lieutenant",
    id: 109,
    level: 5,
    permissions: ["viewAllHours", "manageClockins", "canDoReports","editMotd", "manageAffairs", "viewActivityLog", "viewArchives"],
  },
  sergeant: {
    label: "Sergeant",
    id: 110,
    level: 4,
    permissions: ["canDoReports", "manageAffairs", "viewArchives"],
  },
  housecarl: {
    label: "Housecarl",
    id: 111,
    level: 4,
    permissions: ["canDoReports", "manageAffairs", "viewArchives"],
  },
  corporal: {
    label: "Corporal",
    id: 112,
    level: 4,
    permissions: ["canDoReports", "manageAffairs", "viewArchives"],
  },
  militiavet: {
    label: "Veteran Guard",
    id: 113,
    level: 3,
    permissions: ["canDoReports", "viewArchives"],
  },
  soldier: {
    label: "Soldier",
    id: 122,
    level: 2,
    permissions: ["canDoReports", "viewArchives"],
  },
  militia: {
    label: "Guard",
    id: 114,
    level: 2,
    permissions: ["canDoReports", "viewArchives"],
  },
  recruit: {
    label: "Guard Initiate",
    id: 115,
    level: 1,
    permissions: ["canDoReports"],
  },
  magistrate: {
    label: "Magistrate's Office",
    id: 116,
    level: 1,
    permissions: ["canDoReports", "viewArchives"],
  },
  haafingarrangers: {
    label: "Haafingar Rangers",
    id: 117,
    level: 1,
    permissions: ["canDoReports", "viewArchives"],
  },
  haafingarrleadership: {
    label: "Haafingar Leadership",
    id: 118,
    level: 1,
    permissions: ["canDoReports", "viewArchives"],
  },
};

export const USERS = [
  { name: "Sleeps-On-Ground", passphrase: "spongelouders", rank: "jarl", group: "court", memberSince: "2026-05-21" },
  { name: "Gregard Smithersley", passphrase: "leythers", rank: "courtmagistrate", group: "court", memberSince: "2026-05-20" },
  { name: "Devona", passphrase: "noveda", rank: "stewardess", group: "court", memberSince: "2026-09-10" },
//  { name: "Thenn GiantsBane", passphrase: "bentthaneginns", rank: "Captain", group: "court", memberSince: "2026-09-10" },
  { name: "Wias", passphrase: "siwe", rank: "ladycommander", group: "court", memberSince: "2026-05-20", permissions: ["globalAdmin"] },
  { name: "Imin", passphrase: "imym", rank: "housecarl", group: "court", memberSince: "2026-06-12" },
  { name: "Marcel Bellerose", passphrase: "rosebellecelm", rank: "corporal", group: "militia", memberSince: "2026-09-17" },
//  { name: "Iota Plopits", passphrase: "itspopltia", rank: "militiavet", group: "militia", memberSince: "2026-07-27" },
  { name: "Rallus Invel", passphrase: "levniralsul", rank: "militiavet", group: "militia", memberSince: "2026-09-17" },
  { name: "Gordon Zelphel", passphrase: "lephlenordo", rank: "militiavet", group: "militia", memberSince: "2026-09-09" },
//  { name: "Bollvar Lostwood", passphrase: "woodlostvarllob", rank: "Recruit", group: "militia", memberSince: "2026-09-10" },
//  { name: "Bogel Rubs-One", passphrase: "grousebonelb", rank: "Recruit", group: "militia", memberSince: "2026-09-10" },
  { name: "Turrel Durge", passphrase: "durgeturrel", rank: "sergeant", group: "militia", memberSince: "2026-09-10" },
//  { name: "Sword Saint Notos", passphrase: "notossaintsword", rank: "Recruit", group: "militia", memberSince: "2026-09-11" },
  { name: "Dhubag", passphrase: "gabduh", rank: "ambassador", group: "court", memberSince: "2026-05-10" },
//  { name: "Gur Ganug", passphrase: "ganuggur", rank: "Recruit", group: "militia", memberSince: "2026-09-10" },
//  { name: "Heals-With-Hands", passphrase: "dahswitheals", rank: "Recruit", group: "militia", memberSince: "2026-09-20" },
  { name: "Simon Petrikov", passphrase: "rikopetonsi", rank: "vicecaptain", group: "militia", memberSince: "2026-09-20" },
//  { name: "Geff Frost-Fist", passphrase: "rosttsifgeff", rank: "Recruit", group: "militia", memberSince: "2026-09-21" },
//  { name: "Amaya Sirarus", passphrase: "risarusayama", rank: "Recruit", group: "militia", memberSince: "2026-06-27" },
//  { name: "Kaladas Wolfsbane", passphrase: "fowlsnabedasalak", rank: "Jarl", group: "court", memberSince: "" },
  { name: "Ligorn Oakenwing", passphrase: "keningworngli", rank: "militiavet", group: "militia", memberSince: "2026-09-12" },
  { name: "Tenebris Silvam", passphrase: "ilvamsirenet", rank: "court", group: "court", memberSince: "2026-09-12" },
  { name: "Game Master", passphrase: "gmaccessmeower", rank: "gm", group: "gm", memberSince: "" },
//  { name: "Magistrate's Office", passphrase: "iceffostratemagis", rank: "Magistrate", group: "haafingar", memberSince: "" },
//  { name: "Haafingar Leadership", passphrase: "derhsipfingar", rank: "haafingarrleadership", group: "haafingar", memberSince: "" },
//  { name: "Haafingar Rangers", passphrase: "angersfingerhaa", rank: "HaafingarRangers", group: "haafingar", memberSince: "" },
//  { name: "Dro'vashi", passphrase: "ashivord", rank: "Recruit", group: "militia", memberSince: "2026-10-06" },
//  { name: "Dar", passphrase: "radkhajiiti", rank: "militiavet", group: "militia", memberSince: "2026-10-08" },
  { name: "Weselton", passphrase: "notselwe", rank: "militia", group: "militia", memberSince: "2026-10-18" },
  { name: "Elliana Zeriene", passphrase: "reliezeneanial", rank: "militia", group: "militia", memberSince: "2026-10-24" },
  { name: "Nibbles-Da-Stones", passphrase: "stonedanibbler", rank: "militia", group: "militia", memberSince: "2026-06-12" },
  { name: "Vandar", passphrase: "darnav", rank: "recruit", group: "militia", memberSince: "2026-10-28" },
  { name: "Sworn Blade Fallenshade", passphrase: "shadenlafnorse", rank: "militia", group: "militia", memberSince: "2026-10-28" },
  { name: "Jorik Roriksson", passphrase: "rojrikskiorson", rank: "Court", group: "court", memberSince: "2026-11-14" },
  //test
  { name: "Flake Greenwood", passphrase: "woodfelkearneg", rank: "recruit", group: "militia", memberSince: "2026-10-30" },
  { name: "Nurgle Khan", passphrase: "nahgurlek", rank: "recruit", group: "militia", memberSince: "2026-11-24" },
  { name: "Toryn Bearskin", passphrase: "barnyokistern", rank: "soldier", group: "snowhawk", memberSince: "2026-11-14" },
  { name: "Tsulin Honey-Bear", passphrase: "hobensunyearlit", rank: "soldier", group: "snowhawk", memberSince: "2026-11-14" },
  { name: "Clodowig Fox-Speaker", passphrase: "forkedpixelsgowoac", rank: "soldier", group: "snowhawk", memberSince: "2026-11-14" },
];

export function findUser(name) {
  return USERS.find((u) => u.name === name) ?? null;
}

/**
 * Finds a rank from whatever a user line says. Accepts, in any case and
 * ignoring spaces/punctuation: the rank's numeric `id`, its key in RANKS,
 * or its label. So rank: 105, rank: "militia" and rank: "Guard" all work.
 * Returns the RANKS key, or null if nothing matches.
 */
export function resolveRankKey(input) {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().toLowerCase();
  if (!raw) return null;
  const squash = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, "");
  const want = squash(raw);
  for (const [key, r] of Object.entries(RANKS)) {
    if (String(r.id) === raw || key === raw) return key;
  }
  for (const [key, r] of Object.entries(RANKS)) {
    if (key === want || squash(r.label) === want) return key;
  }
  return null;
}

export function normalizeRankKey(rankKey) {
  return resolveRankKey(rankKey) ?? "";
}

export function rankInfo(rankKey) {
  const key = resolveRankKey(rankKey);
  return (key && RANKS[key]) || { label: rankKey ?? "Unranked", level: 0, permissions: [] };
}

export function permissionsFor(rankKey) {
  return rankInfo(rankKey).permissions;
}

/**
 * Final flag list for a person: their rank's flags plus any extra flags on
 * their own user line. "globalAdmin" expands to every flag.
 */
export function effectivePermissions(user) {
  const set = new Set([
    ...permissionsFor(user?.rank),
    ...(Array.isArray(user?.permissions) ? user.permissions : []),
  ]);
  if (set.has("globalAdmin")) return [...ALL_PERMISSIONS];
  return [...set];
}

export function hasPermission(userName, flag) {
  return effectivePermissions(findUser(userName)).includes(flag);
}

/** The divider a user belongs to, or the visible fallback. */
export const UNASSIGNED_DIVIDER = { key: "__unassigned", label: "Unassigned" };

export function dividerFor(user) {
  return DIVIDERS.find((d) => d.key === user?.group) ?? UNASSIGNED_DIVIDER;
}

/** Rank levels that no clearance level covers exactly (clearance falls back to the nearest one below). */
export function clearanceLevelFor(level) {
  let best = null;
  for (const c of CLEARANCE_LEVELS) if (c.level <= level) best = c;
  return best;
}

/** Mistakes in this file, so they show up in logs instead of failing silently. */
export function configProblems() {
  const problems = [];
  for (const u of USERS) {
    if (!resolveRankKey(u.rank)) problems.push(`${u.name}: unknown rank "${u.rank}"`);
    if (!DIVIDERS.some((d) => d.key === u.group)) problems.push(`${u.name}: unknown group "${u.group}"`);
    for (const p of u.permissions ?? []) {
      if (!ALL_PERMISSIONS.includes(p)) problems.push(`${u.name}: unknown permission "${p}"`);
    }
  }
  const seenIds = new Set();
  const seenLabels = new Set();
  for (const [k, r] of Object.entries(RANKS)) {
    if (r.id === undefined) problems.push(`rank ${k}: missing id`);
    else if (seenIds.has(String(r.id))) problems.push(`rank ${k}: duplicate id ${r.id}`);
    seenIds.add(String(r.id));
    const lab = r.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenLabels.has(lab)) problems.push(`rank ${k}: duplicate label "${r.label}"`);
    seenLabels.add(lab);
  }
  const clearanceSeen = new Set();
  for (const c of CLEARANCE_LEVELS) {
    if (clearanceSeen.has(c.level)) problems.push(`clearance level ${c.level} listed twice`);
    clearanceSeen.add(c.level);
  }
  for (const [k, r] of Object.entries(RANKS)) {
    if (r.level >= 1 && !clearanceSeen.has(r.level)) problems.push(`rank ${k}: level ${r.level} has no entry in CLEARANCE_LEVELS`);
  }
  for (const [k, r] of Object.entries(RANKS)) {
    for (const p of r.permissions) {
      if (!ALL_PERMISSIONS.includes(p)) problems.push(`rank ${k}: unknown permission "${p}"`);
    }
  }
  return problems;
}

for (const p of configProblems()) console.warn("[users.js]", p);