import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/money";

const COOKIE_NAME = "rishe_session";
const TTL = 60 * 60 * 24 * 30;

function secret() {
  const value = process.env.APP_SECRET;
  if (!value || value.length < 24) throw new Error("APP_SECRET is not configured");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createSessionToken(userId: string) {
  const expires = Math.floor(Date.now() / 1000) + TTL;
  const payload = userId + "." + expires;
  return payload + "." + sign(payload);
}

function verifyToken(token?: string | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;
  const payload = userId + "." + expiresRaw;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const userId = verifyToken(jar.get(COOKIE_NAME)?.value);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin;
  if (origin !== expected) throw new Error("INVALID_ORIGIN");
}

export function normalizeIdentity(phone: string) {
  return normalizePhone(phone);
}
