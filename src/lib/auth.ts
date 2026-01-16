import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "sentka_session";
export const ROLE_COOKIE = "sentka_role";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 1 day (no remember)
const REMEMBER_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 120_000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto
    .pbkdf2Sync(password, salt, 120_000, 64, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

export function roleFromInput(role?: string): UserRole {
  const normalized = (role ?? "").toString().toUpperCase();
  if (normalized === "DRIVER") return UserRole.DRIVER;
  if (normalized === "ADMIN") return UserRole.ADMIN;
  return UserRole.SHIPPER;
}

export async function createSession(userId: string, userAgent?: string, remember = false) {
  const token = crypto.randomBytes(32).toString("hex");
  const ttl = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await prisma.session.create({
    data: { token, userId, expiresAt, userAgent },
  });

  return { token, expiresAt };
}

export async function deleteSession(token?: string) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token } });
}

export async function getSession(token?: string) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } });
    return null;
  }
  return session;
}

export async function currentUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getSession(token);
  return session?.user ?? null;
}

export function withAuthCookies(res: NextResponse, token: string, role: UserRole, expiresAt: Date) {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    expires: expiresAt,
    path: "/",
  });
  res.cookies.set(ROLE_COOKIE, role, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    expires: expiresAt,
    path: "/",
  });
  return res;
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
  res.cookies.set(ROLE_COOKIE, "", { expires: new Date(0), path: "/" });
  return res;
}
