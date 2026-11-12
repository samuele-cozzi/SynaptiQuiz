import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clearSessionCookie, ensureAdmin, getCurrentUser, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9._-]+$/);

const credentialsSchema = z.object({
  action: z.enum(["login", "register", "guest", "logout"]),
  username: usernameSchema.optional(),
  password: z.string().min(8).max(128).optional(),
  confirmPassword: z.string().optional(),
});

function safeUser(user: {
  id: string;
  username: string;
  avatar: string | null;
  role: string;
  isGuest: boolean;
  locale: string;
  theme: string;
  defaultLanguage: string;
}) {
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    role: user.role,
    isGuest: user.isGuest,
    locale: user.locale,
    theme: user.theme,
    defaultLanguage: user.defaultLanguage,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    user,
    googleAuthEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the username and password fields." }, { status: 400 });
  }

  const { action, username, password, confirmPassword } = parsed.data;
  if (action === "logout") {
    return clearSessionCookie(NextResponse.json({ ok: true }));
  }

  await ensureAdmin();

  if (action === "register" && password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  let user;
  if (action === "register") {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    user = await prisma.user.create({
      data: {
        username: username!,
        passwordHash: await hash(password!, 12),
        role: "player",
      },
    });
  } else if (action === "guest") {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && (!existing.isGuest || !existing.isActive)) {
      return NextResponse.json({ error: "That username belongs to a registered account." }, { status: 409 });
    }
    user =
      existing ??
      (await prisma.user.create({ data: { username: username!, role: "player", isGuest: true } }));
  } else {
    user = await prisma.user.findUnique({ where: { username } });
    if (!user?.isActive || !user.passwordHash || !(await compare(password!, user.passwordHash))) {
      return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
    }
  }

  const response = NextResponse.json({ user: safeUser(user) });
  await setSessionCookie(response, user.id);
  return response;
}