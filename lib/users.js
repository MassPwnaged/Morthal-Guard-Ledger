// Add or remove users here, then push to GitHub to deploy.
// Keep this repo private -- passphrases are stored in plaintext.
//
// A USER LINE LOOKS LIKE:
//   { name: "Wias", passphrase: "...", rank: "vicecaptain", group: "court", group: "court",
//     memberSince: "2026-05-20", permissions: ["globalAdmin"] }
//
//   rank         must match a key in RANKS below. Case is ignored, but
//                punctuation/spaces are NOT (use "vicecaptain", not
//                "Vice-Captain"). Rank sets the label, sort order (level)
//                and default permissions.
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
  "editMotd", "manageAffairs", "viewActivityLog", "globalAdmin",
];

export const DIVIDERS = [
  { key: "court",     label: "Court" },
  { key: "militia",   label: "Militia" },
  { key: "haafingar", label: "Haafingar" },
  { key: "gm",        label: "Game Master" },
];

export const RANKS = {
  gm: {
    label: "Game Master",
    level: 11,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog"],
  },
  jarl: {
    label: "Jarl",
    level: 10,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog"],
  },
  baron: {
    label: "Baron",
    level: 8,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog"],
  },
  court: {
    label: "Court",
    level: 7,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog"],
  },
  captain: {
    label: "Captain",
    level: 6,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog"],
  },
  vicecaptain: {
    label: "Vice-Captain",
    level: 5,
    permissions: ["viewAllHours", "manageClockins", "canDoReports", "editMotd", "manageAffairs", "viewActivityLog"],
  },
  lieutenant: {
    label: "Lieutenant",
    level: 4,
    permissions: ["viewAllHours", "canDoReports", "manageAffairs", "viewActivityLog"],
  },
  sergeant: {
    label: "Sergeant",
    level: 3,
    permissions: ["canDoReports", "manageAffairs"],
  },
  housecarl: {
    label: "Housecarl",
    level: 3,
    permissions: ["canDoReports", "manageAffairs"],
  },
  corporal: {
    label: "Corporal",
    level: 3,
    permissions: ["canDoReports", "manageAffairs"],
  },
  militiavet: {
    label: "Militia Veteran",
    level: 2,
    permissions: ["canDoReports"],
  },
  militia: {
    label: "Militia",
    level: 2,
    permissions: ["canDoReports"],
  },
  recruit: {
    label: "Recruit",
    level: 1,
    permissions: ["canDoReports"],
  },
  magistrate: {
    label: "Magistrate",
    level: 1,
    permissions: ["canDoReports"],
  },
  haafingarrangers: {
    label: "Haafingar Rangers",
    level: 1,
    permissions: ["canDoReports"],
  },
  haafingarrleadership: {
    label: "Haafingar Leadership",
    level: 1,
    permissions: ["canDoReports"],
  },
};

export const USERS = [
  { name: "Sleeps-On-Ground", passphrase: "spongelouders", rank: "Baron", group: "court", memberSince: "2026-05-21" },
  { name: "Gregard Smithersley", passphrase: "leythers", rank: "Court", group: "court", memberSince: "2026-05-20" },
  { name: "Devona", passphrase: "noveda", rank: "Court", group: "court", memberSince: "2026-09-10" },
  { name: "Thenn GiantsBane", passphrase: "bentthaneginns", rank: "Captain", group: "court", memberSince: "2026-09-10" },
  { name: "Wias", passphrase: "siwe", rank: "Vicecaptain", group: "court", memberSince: "2026-05-20", permissions: ["globalAdmin"] },
  { name: "Imin", passphrase: "imym", rank: "housecarl", group: "court", memberSince: "2026-06-12" },
  { name: "Marcel Bellerose", passphrase: "rosebellecelm", rank: "militiavet", group: "militia", memberSince: "2026-09-17" },
  { name: "Iota Plopits", passphrase: "itspopltia", rank: "militiavet", group: "militia", memberSince: "2026-07-27" },
  { name: "Rallus Invel", passphrase: "levniralsul", rank: "militiavet", group: "militia", memberSince: "2026-09-17" },
  { name: "Gordon Zelphel", passphrase: "lephlenordo", rank: "militiavet", group: "militia", memberSince: "2026-09-09" },
  { name: "Bollvar Lostwood", passphrase: "woodlostvarllob", rank: "Recruit", group: "militia", memberSince: "2026-09-10" },
  { name: "Bogel Rubs-One", passphrase: "grousebonelb", rank: "Recruit", group: "militia", memberSince: "2026-09-10" },
  { name: "Turrel Durge", passphrase: "durgeturrel", rank: "militiavet", group: "militia", memberSince: "2026-09-10" },
  { name: "Sword Saint Notos", passphrase: "notossaintsword", rank: "Recruit", group: "militia", memberSince: "2026-09-11" },
  { name: "Dhubag", passphrase: "gabduh", rank: "Court", group: "court", memberSince: "2026-05-10" },
  { name: "Gur Ganug", passphrase: "ganuggur", rank: "Recruit", group: "militia", memberSince: "2026-09-10" },
//  { name: "Heals-With-Hands", passphrase: "dahswitheals", rank: "Recruit", group: "militia", memberSince: "2026-09-20" },
  { name: "Simon Petrikov", passphrase: "rikopetonsi", rank: "militiavet", group: "militia", memberSince: "2026-09-20" },
//  { name: "Geff Frost-Fist", passphrase: "rosttsifgeff", rank: "Recruit", group: "militia", memberSince: "2026-09-21" },
//  { name: "Amaya Sirarus", passphrase: "risarusayama", rank: "Recruit", group: "militia", memberSince: "2026-06-27" },
  { name: "Kaladas Wolfsbane", passphrase: "fowlsnabedasalak", rank: "Jarl", group: "court", memberSince: "" },
  { name: "Ligorn Oakenwing", passphrase: "keningworngli", rank: "militiavet", group: "militia", memberSince: "2026-09-12" },
  { name: "Tenebris Silvam", passphrase: "ilvamsirenet", rank: "militiavet", group: "militia", memberSince: "2026-09-12" },
  { name: "Game Master", passphrase: "gmaccessmeower", rank: "gm", group: "gm", memberSince: "" },
  { name: "Magistrate's Office", passphrase: "iceffostratemagis", rank: "Magistrate", group: "haafingar", memberSince: "" },
  { name: "Haafingar Leadership", passphrase: "derhsipfingar", rank: "haafingarrleadership", group: "haafingar", memberSince: "" },
  { name: "Haafingar Rangers", passphrase: "angersfingerhaa", rank: "HaafingarRangers", group: "haafingar", memberSince: "" },
  { name: "Dro'vashi", passphrase: "ashivord", rank: "Recruit", group: "militia", memberSince: "2026-10-06" },
];

export function findUser(name) {
  return USERS.find((u) => u.name === name) ?? null;
}

export function normalizeRankKey(rankKey) {
  return typeof rankKey === "string" ? rankKey.trim().toLowerCase() : "";
}

export function rankInfo(rankKey) {
  const key = normalizeRankKey(rankKey);
  return RANKS[key] ?? { label: rankKey ?? "Unranked", level: 0, permissions: [] };
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

/** Mistakes in this file, so they show up in logs instead of failing silently. */
export function configProblems() {
  const problems = [];
  for (const u of USERS) {
    if (!RANKS[normalizeRankKey(u.rank)]) problems.push(`${u.name}: unknown rank "${u.rank}"`);
    if (!DIVIDERS.some((d) => d.key === u.group)) problems.push(`${u.name}: unknown group "${u.group}"`);
    for (const p of u.permissions ?? []) {
      if (!ALL_PERMISSIONS.includes(p)) problems.push(`${u.name}: unknown permission "${p}"`);
    }
  }
  for (const [k, r] of Object.entries(RANKS)) {
    for (const p of r.permissions) {
      if (!ALL_PERMISSIONS.includes(p)) problems.push(`rank ${k}: unknown permission "${p}"`);
    }
  }
  return problems;
}

for (const p of configProblems()) console.warn("[users.js]", p);