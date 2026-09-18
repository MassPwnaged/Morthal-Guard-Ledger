#!/usr/bin/env node
// Generates the environment variables for the passphrase gate.
//
//   node scripts/make-users.mjs rias alice bob
//     -> invents a strong passphrase for each name
//
//   node scripts/make-users.mjs rias=correct-horse alice=battery-staple
//     -> uses the passphrases you supply
//
//   node scripts/make-users.mjs --salt <existing> --secret <existing> carol
//     -> adds a person to an existing deployment (reuse the salt, or every
//        other passphrase stops working)

const ITERATIONS = Number(process.env.AUTH_ITERATIONS) || 100000;
const KEY_BYTES = 32;
// Crockford-ish alphabet: no I, L, O, U, so nothing is ambiguous when read aloud.
const ALPHABET = "abcdefghjkmnpqrstvwxyz23456789";

const args = process.argv.slice(2);
let salt = null;
let secret = null;
const people = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--salt") { salt = args[++i]; continue; }
  if (args[i] === "--secret") { secret = args[++i]; continue; }
  const [name, ...rest] = args[i].split("=");
  people.push({ name, passphrase: rest.length ? rest.join("=") : generatePassphrase() });
}

if (!people.length) {
  console.error("Usage: node scripts/make-users.mjs <name>[=passphrase] ...");
  process.exit(1);
}

const saltBytes = salt ? b64urlDecode(salt) : crypto.getRandomValues(new Uint8Array(16));
const saltText = salt ?? b64urlEncode(saltBytes);
const secretText = secret ?? b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));

const users = {};
for (const person of people) {
  users[person.name] = b64urlEncode(await derive(person.passphrase, saltBytes));
}

console.log("\nPassphrases — hand these out privately, they are not recoverable:\n");
for (const person of people) {
  console.log(`  ${person.name.padEnd(14)} ${person.passphrase}`);
}

console.log("\nEnvironment variables for the Pages project:\n");
console.log(`  AUTH_SALT       ${saltText}`);
console.log(`  SESSION_SECRET  ${secretText}`);
console.log(`  AUTH_ITERATIONS ${ITERATIONS}`);
console.log(`  AUTH_USERS      ${JSON.stringify(users)}`);
if (salt) {
  console.log("\n  (Merge AUTH_USERS into the existing value rather than replacing it.)");
}
console.log("");

/* ---------- helpers ---------- */

function generatePassphrase() {
  const groups = 4, perGroup = 4;
  const bytes = crypto.getRandomValues(new Uint8Array(groups * perGroup));
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
  return Array.from({ length: groups }, (_, g) =>
    chars.slice(g * perGroup, (g + 1) * perGroup).join(""),
  ).join("-");
}

async function derive(passphrase, saltBytes) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function b64urlEncode(bytes) {
  return Buffer.from(bytes).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(text) {
  return new Uint8Array(Buffer.from(text.replace(/-/g, "+").replace(/_/g, "/"), "base64"));
}
