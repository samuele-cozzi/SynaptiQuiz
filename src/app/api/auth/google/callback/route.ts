import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type GoogleIdentity = {
  sub: string;
  email: string;
  email_verified: boolean;
  aud: string;
};

function finishWithError(request: NextRequest) {
  return NextResponse.redirect(new URL("/en?auth=google-error", request.url));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const expectedState = request.cookies.get("synaptiquiz_oauth_state")?.value;
  const state = searchParams.get("state");
  const code = searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!expectedState || !state || state !== expectedState || !code || !clientId || !clientSecret) {
    return finishWithError(request);
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${request.nextUrl.origin}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return finishWithError(request);
  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token) return finishWithError(request);

  const identityResponse = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
    { cache: "no-store" },
  );
  if (!identityResponse.ok) return finishWithError(request);
  const identity = (await identityResponse.json()) as GoogleIdentity;
  if (identity.aud !== clientId || !identity.email_verified || !identity.sub || !identity.email) {
    return finishWithError(request);
  }

  await ensureAdmin();
  const linkedIdentity = await prisma.authIdentity.findFirst({
    where: { provider: "google", providerAccountId: identity.sub },
    include: { user: true },
  });
  let user = linkedIdentity?.user;
  if (!user) {
    const baseUsername = identity.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .slice(0, 18)
      .padEnd(3, "user");
    let username = baseUsername;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername.slice(0, 18)}${suffix++}`;
    }
    user = await prisma.user.create({
      data: {
        username,
        role: "player",
        identities: { create: { provider: "google", providerAccountId: identity.sub } },
      },
    });
  }
  if (!user.isActive) return finishWithError(request);

  const response = NextResponse.redirect(new URL("/en", request.url));
  response.cookies.set("synaptiquiz_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 0,
  });
  return setSessionCookie(response, user.id);
}