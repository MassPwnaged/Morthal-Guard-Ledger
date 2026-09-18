// Shared auth helpers. Runs on the Workers runtime (Web Crypto only, no Node APIs).

const encoder = new TextEncoder();

export const COOKIE_NAME = "session";
export const DEFAULT_ITERATIONS = 100000; // Workers caps PBKDF2 at 100k
export const KEY_BYTES = 32;

/* ---------- encoding ---------- */

export function b64urlEncode(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/* ---------- constant-time compare ---------- */

function equalBytes(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  if (crypto.subtle.timingSafeEqual) {
    return crypto.subtle.timingSafeEqual(a, b);
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* ---------- passphrase hashing ---------- */

export async function derivePassphrase(passphrase, saltBytes, iterations = DEFAULT_ITERATIONS) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    material,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/**
 * Reads config from the Pages environment.
 *   AUTH_SALT   base64url, one shared salt (see README for why)
 *   AUTH_USERS  JSON: { "<name>": "<base64url hash>", ... }
 *   AUTH_ITERATIONS  optional, defaults to 100000
 *   SESSION_SECRET   random string used to sign cookies
 */
export function loadConfig(env) {
  if (!env.AUTH_SALT || !env.AUTH_USERS || !env.SESSION_SECRET) {
    throw new Error("Missing AUTH_SALT, AUTH_USERS or SESSION_SECRET");
  }
  const parsed = JSON.parse(env.AUTH_USERS);
  return {
    salt: b64urlDecode(env.AUTH_SALT),
    iterations: Number(env.AUTH_ITERATIONS) || DEFAULT_ITERATIONS,
    secret: env.SESSION_SECRET,
    users: Object.entries(parsed).map(([name, hash]) => ({ name, hash: b64urlDecode(hash) })),
  };
}

/** Returns the matching user's name, or null. One PBKDF2 pass regardless of user count. */
export async function identify(passphrase, config) {
  const candidate = await derivePassphrase(passphrase, config.salt, config.iterations);
  let match = null;
  for (const user of config.users) {
    if (equalBytes(candidate, user.hash)) match = user.name;
  }
  return match;
}

/* ---------- session cookie ---------- */

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function createSession(user, secret, ttlSeconds = 60 * 60 * 12) {
  const payload = b64urlEncode(
    encoder.encode(JSON.stringify({ u: user, exp: Math.floor(Date.now() / 1000) + ttlSeconds })),
  );
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${b64urlEncode(sig)}`;
}

export async function verifySession(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  let expected;
  try {
    expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload)),
    );
  } catch {
    return null;
  }
  let given;
  try {
    given = b64urlDecode(sig);
  } catch {
    return null;
  }
  if (!equalBytes(expected, given)) return null;

  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (!data.u || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { user: data.u, expires: data.exp };
  } catch {
    return null;
  }
}

/* ---------- cookie plumbing ---------- */

export function readCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export function sessionCookie(value, maxAgeSeconds) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
