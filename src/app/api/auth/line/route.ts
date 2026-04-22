import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getLineSettings } from "@/lib/integration-settings";
import crypto from "crypto";

/**
 * GET /api/auth/line
 * Initiates LINE Login OAuth flow.
 * Stores a CSRF state in a short-lived cookie set directly on the redirect
 * response — using cookies() + NextResponse.redirect() together can lose
 * Set-Cookie headers in Next.js App Router.
 */
export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { channelId, callbackUrl } = await getLineSettings();

  if (!channelId || !callbackUrl) {
    return NextResponse.json(
      { error: "LINE_CHANNEL_ID or LINE_CALLBACK_URL is not configured" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: callbackUrl,
    state,
    scope: "profile",
  });

  const response = NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );

  // Set cookie directly on the response so it's included in the redirect headers
  response.cookies.set("line_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}

/**
 * DELETE /api/auth/line
 * Disconnects LINE account from the current user.
 */
export async function DELETE(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { lineUserId: null, lineDisplayName: null, notifyLine: false },
  });

  return NextResponse.json({ ok: true });
}
