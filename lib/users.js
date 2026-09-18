// Add or remove users here, then push to GitHub to deploy.
// Keep this repo private — passphrases are stored in plaintext.
//
// `rank` must match a key in RANKS below (case doesn't matter — "Captain"
// and "captain" both resolve the same way). Permissions are what actually
// gate content — add more permission strings to a rank as you build
// features that need them.

export const RANKS = {
  captain: {
    label: "Captain",
    level: 3,
    permissions: ["viewAllHours"],
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
  { name: "Gregard Smithersley", passphrase: "leythers", rank: "Captain" },
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