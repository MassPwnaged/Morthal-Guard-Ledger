const encoder = new TextEncoder();
export const COOKIE_NAME = "session";

function safeEqual(a, b) {
  const ab = encoder.encode(a.padEnd(b.length));
  const bb = encoder.encode(b.padEnd(a.length));
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0 && a.length === b.length;
}

export function identify(passphrase, users) {
  let match = null;
  for (const user of users) {
    if (safeEqual(passphrase, user.passphrase)) match = user.name;
  }
  return match;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
}

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

export async function createSession(user, rank, secret, ttlSeconds = 60 * 60 * 12) {
  const payload = b64urlEncode(
    encoder.encode(JSON.stringify({
      u: user, r: rank, exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    })),
  );
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload));
  return `${payload}.${b64urlEncode(sig)}`;
}

export async function verifySession(token, secret) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  let expected;
  try {
    expected = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload)));
  } catch { return null; }
  let given;
  try { given = b64urlDecode(sig); } catch { return null; }

  if (expected.length !== given.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ given[i];
  if (diff !== 0) return null;

  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    if (!data.u || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { user: data.u, rank: data.r ?? null, expires: data.exp };
  } catch { return null; }
}

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
    "Path=/", "HttpOnly", "Secure", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}