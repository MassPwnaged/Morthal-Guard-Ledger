import { json } from "../../lib/auth.js";

// The middleware already guarantees a session here.
export async function onRequestGet({ data }) {
  return json({ user: data.user });
}
