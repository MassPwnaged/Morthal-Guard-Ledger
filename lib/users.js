// Add or remove users here, then push to GitHub to deploy.
// Keep this repo private — passphrases are stored in plaintext.
//
// `rank` must match a key in RANKS below (case doesn't matter — "Captain"
// and "captain" both resolve the same way, but the KEY itself must match
// character-for-character otherwise, e.g. "vicecaptain" not "Vice-Captain"
// — punctuation like hyphens is NOT stripped, only case is ignored).
// Permissions are what actually gate content — add more permission
// strings to a rank as you build features that need them.
//
// `memberSince` — date they joined, as "YYYY-MM-DD" (e.g. "2026-03-14").
// Leave it as "" if unknown; the site will show "—" instead of a day count.
//
// Permissions in use:
//   viewAllHours    — see everyone's weekly hours, not just your own
//   manageClockins  — force-clock-out anyone currently on duty, clear a
//                      specific day's hours for anyone, and recalculate
//                      all-time hour totals from history
//   canDoReports    — create, view, and archive Guard Reports. Currently
//                      given to every rank below.
//
// Home's Personnel list sorts everyone by `level` (highest first) and
// shows a "Court" divider above the whole roster and a "Militia" divider
// right before the first person at or below the Militia rank's level —
// that boundary is computed from RANKS.militia.level, so it moves
// automatically if you ever renumber ranks.

export const RANKS = {
  gm: {
    label: "Game Master",
    level: 9,
    permissions: ["viewAllHours", "manageClockins", "canDoReports"],
  },
  baron: {
    label: "Baron",
    level: 8,
    permissions: ["viewAllHours", "manageClockins", "canDoReports"],
  },
  court: {
    label: "Court",
    level: 7,
    permissions: ["viewAllHours", "manageClockins", "canDoReports"],
  },
  captain: {
    label: "Captain",
    level: 6,
    permissions: ["viewAllHours", "manageClockins", "canDoReports"],
  },
  vicecaptain: {
    label: "Vice-Captain",
    level: 5,
    permissions: ["viewAllHours", "manageClockins", "canDoReports"],
  },
  lieutenant: {
    label: "Lieutenant",
    level: 4,
    permissions: ["viewAllHours", "canDoReports"],
  },
  sergeant: {
    label: "Sergeant",
    level: 3,
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
};

export const USERS = [
  { name: "Sleeps-On-Ground", passphrase: "spongelouders", rank: "Baron", memberSince: "2026-05-21" },
  { name: "Gregard Smithersley", passphrase: "leythers", rank: "Court", memberSince: "2026-05-20" },
  { name: "Devona", passphrase: "noveda", rank: "Court", memberSince: "2026-09-10" },
  { name: "Thenn GiantsBane", passphrase: "bentthaneginns", rank: "Captain", memberSince: "2026-09-10" },
  { name: "Wias", passphrase: "siwe", rank: "Vicecaptain", memberSince: "2026-05-20" },
  { name: "Imin", passphrase: "imym", rank: "Lieutenant", memberSince: "2026-06-12" },
  { name: "Marcel Bellerose", passphrase: "rosebellecelm", rank: "Recruit", memberSince: "2026-09-17" },
  { name: "Iota Plopits", passphrase: "itspopltia", rank: "Recruit", memberSince: "2026-07-27" },
  { name: "Rallus Invel", passphrase: "levniralsul", rank: "Recruit", memberSince: "2026-09-17" },
  { name: "Gordon Zelphel", passphrase: "lephlenordo", rank: "Recruit", memberSince: "2026-09-09" },
  { name: "Bollvar Lostwood", passphrase: "woodlostvarllob", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Bogel Rubs-One", passphrase: "grousebonelb", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Turrel Durge", passphrase: "durgeturrel", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Sword Saint Notos", passphrase: "notossaintsword", rank: "Recruit", memberSince: "2026-09-11" },
  { name: "Dhubag", passphrase: "gabduh", rank: "Recruit", memberSince: "2026-05-10" },
  { name: "Gur Ganug", passphrase: "ganuggur", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Heals-With-Hands", passphrase: "dahswitheals", rank: "Recruit", memberSince: "2026-09-20" },
  { name: "Simon Petrikov", passphrase: "rikopetonsi", rank: "Recruit", memberSince: "2026-09-20" },
  { name: "Geff Frost-Fist", passphrase: "rosttsifgeff", rank: "Recruit", memberSince: "2026-09-21" },
  { name: "Amaya Sirarus", passphrase: "risarusayama", rank: "Recruit", memberSince: "2026-06-27" },
  { name: "Game Master", passphrase: "gmaccessmeower", rank: "gm", memberSince: "" },
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