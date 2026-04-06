import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getLineSettings } from "@/lib/integration-settings";

/**
 * GET /api/auth/line/callback
 * LINE redirects here after the user grants permission.
 * Exchanges the code for an access token, fetches the LINE profile,
 * and saves lineUserId + lineDisplayName to the DB user.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", req.url));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/profile?line=error&reason=" + encodeURIComponent(error), req.url));
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("line_oauth_state")?.value;
  cookieStore.delete("line_oauth_state");

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/profile?line=error&reason=state_mismatch", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/profile?line=error&reason=no_code", req.url));
  }

  const { channelId, channelSecret, callbackUrl } = await getLineSettings();

  // Exchange code for access token
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/profile?line=error&reason=token_failed", req.url));
  }

  const { access_token } = await tokenRes.json();

  // Fetch LINE profile
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(new URL("/profile?line=error&reason=profile_failed", req.url));
  }

  const { userId: lineUserId, displayName: lineDisplayName } = await profileRes.json();

  // Check if this LINE account is already linked to a different WSO user
  const existing = await prisma.user.findUnique({ where: { lineUserId } });
  if (existing && existing.id !== user.id) {
    return NextResponse.redirect(new URL("/profile?line=error&reason=already_linked", req.url));
  }

  // Save LINE info
  await prisma.user.update({
    where: { id: user.id },
    data: { lineUserId, lineDisplayName },
  });

  return NextResponse.redirect(new URL("/profile?line=success", req.url));
}
