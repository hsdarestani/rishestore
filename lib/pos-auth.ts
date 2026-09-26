import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

const COOKIE = "rishe_pos_session";

function secret() {
  const value = process.env.APP_SECRET || "";
  if (value.length < 24) throw new Error("APP_SECRET is not configured");
  return value;
}
function sign(value: string) {
  return createHmac("sha256", secret()).update("pos:" + value).digest("hex");
}
export function createPosCookie(sessionId: string, expiresAt: Date) {
  const exp = Math.floor(expiresAt.getTime() / 1000);
  const payload = sessionId + "." + exp;
  return payload + "." + sign(payload);
}
function verify(token?: string | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expRaw, signature] = parts;
  const payload = id + "." + expRaw;
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
  return id;
}
export async function setPosSession(sessionId: string, expiresAt: Date) {
  const jar = await cookies();
  const maxAge = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  jar.set(COOKIE, createPosCookie(sessionId, expiresAt), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
}
export async function clearPosSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}
export async function getPosSession() {
  const jar = await cookies();
  const id = verify(jar.get(COOKIE)?.value);
  if (!id) return null;
  const session = await db.eventDeviceSession.findUnique({ where: { id } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;
  await db.eventDeviceSession.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(()=>undefined);
  return session;
}
