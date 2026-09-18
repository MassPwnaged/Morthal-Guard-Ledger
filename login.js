import { loadConfig, identify, createSession, sessionCookie, json } from "../../lib/auth.js";

const TTL_SECONDS = 60 * 60 * 12; // 12 hours

export async function onRequestPost({ request, env }) {
  let config;
  try {
    config = loadConfig(env);
  } catch (err) {
    return json({ error: "Server is not configured yet" }, 500);
  }

  let passphrase = "";
  let next = "/";
  const contentType = request.headers.get("Content-Type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      passphrase = String(body.passphrase ?? "");
      next = String(body.next ?? "/");
    } else {
      const form = await request.formData();
      passphrase = String(form.get("passphrase") ?? "");
      next = String(form.get("next") ?? "/");
    }
  } catch {
    return json({ error: "Could not read the request" }, 400);
  }

  passphrase = passphrase.trim();
  if (!passphrase) return json({ error: "Enter your passphrase" }, 400);

  const user = await identify(passphrase, config);
  if (!user) return json({ error: "That passphrase isn't recognized" }, 401);

  const token = await createSession(user, config.secret, TTL_SECONDS);
  return json(
    { user, next: safeRedirect(next) },
    200,
    { "Set-Cookie": sessionCookie(token, TTL_SECONDS) },
  );
}

// Only ever redirect to a path on this site.
function safeRedirect(target) {
  if (!target.startsWith("/") || target.startsWith("//")) return "/";
  if (target.startsWith("/login.html")) return "/";
  return target;
}
