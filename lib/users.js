// Add or remove users here, then push to GitHub to deploy.
// Keep this repo private — passphrases are stored in plaintext.
//
// `rank` must match a key in RANKS below (case doesn't matter — "Captain"
// and "captain" both resolve the same way). Permissions are what actually
// gate content — add more permission strings to a rank as you build
// features that need them.

export const RANKS = {
	baron: {
    label: "Baron",
    level: 8,
    permissions: ["viewAllHours"],
  },
  	court: {
    label: "Court",
    level: 7,
    permissions: ["viewAllHours"],
  },
  	commander: {
    label: "Commander",
    level: 6,
    permissions: ["viewAllHours"],
  },
  captain: {
    label: "Captain",
    level: 5,
    permissions: ["viewAllHours"],
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
	{ name: "Wias", passphrase: "siwe", rank: "Captain" },
	{ name: "Gregard Smithersley", passphrase: "leythers", rank: "Court" },
	{ name: "Imin", passphrase: "imym", rank: "Lieutenant" },
	{ name: "Thenn GiantsBane", passphrase: "bentthaneginns", rank: "Commander" },
	{ name: "Sleeps-On-Ground", passphrase: "spongelouders", rank: "Baron" },
	{ name: "Marcel Bellerose", passphrase: "rosebellecelm", rank: "Recruit" },
	{ name: "Iota Plopits", passphrase: "itspopltia", rank: "Recruit" },
	{ name: "Rallus Invel", passphrase: "levni", rank: "Recruit" },
	{ name: "Gordon Zelphel", passphrase: "lephlenordo", rank: "Recruit" },
	{ name: "Bollvar Lostwood", passphrase: "woodlostvarllob", rank: "Recruit" },
	{ name: "Bogel Rubs-One", passphrase: "grousebonelb", rank: "Recruit" },
	{ name: "Turrel Durge", passphrase: "durgeturrel", rank: "Recruit" },
	{ name: "Sword Saint Notos", passphrase: "notossaintsword", rank: "Recruit" },
	{ name: "Dhubag", passphrase: "gabduh", rank: "Recruit" },
	{ name: "Gur Ganug", passphrase: "ganuggur", rank: "Recruit" },
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