import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google sign-in is not configured." }, { status: 501 });
  }

  const state = randomBytes(32).toString("base64url");
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ?? `${new URL(request.url).origin}/api/auth/google/callback`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("synaptiquiz_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 300,
  });
  return response;
}