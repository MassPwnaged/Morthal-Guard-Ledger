// Add or remove users here, then push to GitHub to deploy.
// Keep this repo private — passphrases are stored in plaintext.
//
// `rank` must match a key in RANKS below (case doesn't matter — "Captain"
// and "captain" both resolve the same way). Permissions are what actually
// gate content — add more permission strings to a rank as you build
// features that need them.
//
// `memberSince` — date they joined, as "YYYY-MM-DD" (e.g. "2026-03-14").
// Leave it as "" if unknown; the site will show "—" instead of a day count.
//
// Permissions in use:
//   viewAllHours    — see everyone's weekly hours, not just your own
//   manageClockins  — force-clock-out anyone currently on duty, and clear
//                      a specific day's hours for anyone

export const RANKS = {
	gm: {
    label: "Game Master",
    level: 9,
    permissions: ["viewAllHours", "manageClockins"],
  },
  baron: {
    label: "Baron",
    level: 8,
    permissions: ["viewAllHours", "manageClockins"],
  },
  court: {
    label: "Court",
    level: 7,
    permissions: ["viewAllHours", "manageClockins"],
  },
  commander: {
    label: "Commander",
    level: 6,
    permissions: ["viewAllHours", "manageClockins"],
  },
  captain: {
    label: "Captain",
    level: 5,
    permissions: ["viewAllHours", "manageClockins"],
  },
  lieutenant: {
    label: "Lieutenant",
    level: 4,
    permissions: ["viewAllHours"],
  },
  sergeant: {
    label: "Sergeant",
    level: 3,
    permissions: [],
  },
  guard: {
    label: "Guard",
    level: 2,
    permissions: [],
  },
  recruit: {
    label: "Recruit",
    level: 1,
    permissions: [],
  },
};

export const USERS = [
  { name: "Sleeps-On-Ground", passphrase: "spongelouders", rank: "Baron", memberSince: "2026-05-21" },
  { name: "Gregard Smithersley", passphrase: "leythers", rank: "Court", memberSince: "2026-05-20" },
  { name: "Devona", passphrase: "noveda", rank: "Court", memberSince: "2026-09-10" },
  { name: "Thenn GiantsBane", passphrase: "bentthaneginns", rank: "Commander", memberSince: "2026-09-10" },
  { name: "Wias", passphrase: "siwe", rank: "Captain", memberSince: "2026-05-20" },
  { name: "Imin", passphrase: "imym", rank: "Lieutenant", memberSince: "2026-06-12" },
  { name: "Marcel Bellerose", passphrase: "rosebellecelm", rank: "Recruit", memberSince: "2026-09-17" },
  { name: "Iota Plopits", passphrase: "itspopltia", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Rallus Invel", passphrase: "levniralsul", rank: "Recruit", memberSince: "2026-09-17" },
  { name: "Gordon Zelphel", passphrase: "lephlenordo", rank: "Recruit", memberSince: "2026-09-09" },
  { name: "Bollvar Lostwood", passphrase: "woodlostvarllob", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Bogel Rubs-One", passphrase: "grousebonelb", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Turrel Durge", passphrase: "durgeturrel", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Sword Saint Notos", passphrase: "notossaintsword", rank: "Recruit", memberSince: "2026-09-11" },
  { name: "Dhubag", passphrase: "gabduh", rank: "Recruit", memberSince: "2026-05-10" },
  { name: "Gur Ganug", passphrase: "ganuggur", rank: "Recruit", memberSince: "2026-09-10" },
  { name: "Game Master", passphrase: "gmaccessmeower", rank: "Game Master", memberSince: "" },
];

export function findUser(name) {
  return USERS.find((u) => u.name === name) ?? null;
}

function normalizeRankKey(rankKey) {
  return typeof rankKey === "string" ? rankKey.trim().toLowerCase() : "";
}

export function rankInfo(rankKey) {
  const key = normalizeRankKey(rankKey);
  return RANKS[key] ?? { label: rankKey ?? "Unranked", level: 0, permissions: [] };
}

export function permissionsFor(rankKey) {
  return rankInfo(rankKey).permissions;
}