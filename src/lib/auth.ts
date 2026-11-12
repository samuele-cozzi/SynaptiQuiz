import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";

export const sessionCookieName = "synaptiquiz_session";
const sessionDuration = 60 * 60 * 24 * 30;

export type AppUser = {
  id: string;
  username: string;
  avatar: string | null;
  role: string;
  isGuest: boolean;
  locale: string;
  theme: string;
  defaultLanguage: string;
};

function sessionSecret() {
  const secret = process.env.SESSION_SECRET ?? process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return secret ?? "synaptiquiz-development-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string) {
  const value = `${userId}.${Math.floor(Date.now() / 1000) + sessionDuration}`;
  return `${value}.${sign(value)}`;
}

function readSessionToken(token: string | undefined) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiry, signature] = parts;
  const value = `${userId}.${expiry}`;
  const expected = Buffer.from(sign(value));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  if (!/^\d+$/.test(expiry) || Number(expiry) < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export function setSessionCookie(response: NextResponse, userId: string) {
  response.cookies.set(sessionCookieName, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDuration,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function ensureAdmin() {
  const existingAdmin = await prisma.user.findFirst({ where: { role: "admin", isActive: true } });
  if (existingAdmin) return existingAdmin;

  const username = process.env.ADMIN_USER?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD || "password01";
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.ADMIN_USER?.trim() || !process.env.ADMIN_PASSWORD || password === "password01")
  ) {
    console.warn("SynaptiQuiz is bootstrapping with the default admin credentials. Override ADMIN_USER and ADMIN_PASSWORD before public use.");
  }
  const passwordHash = await hash(password, 12);
  const existingUser = await prisma.user.findUnique({ where: { username } });

  try {
    if (existingUser) {
      return await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: "admin", isActive: true, isGuest: false, passwordHash },
      });
    }
    return await prisma.user.create({
      data: { username, passwordHash, role: "admin", isActive: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const admin = await prisma.user.findFirst({ where: { role: "admin", isActive: true } });
      if (admin) return admin;
    }
    throw error;
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  await ensureAdmin();
  const cookieStore = await cookies();
  const userId = readSessionToken(cookieStore.get(sessionCookieName)?.value);
  if (!userId) return null;
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      username: true,
      avatar: true,
      role: true,
      isGuest: true,
      locale: true,
      theme: true,
      defaultLanguage: true,
    },
  });
}