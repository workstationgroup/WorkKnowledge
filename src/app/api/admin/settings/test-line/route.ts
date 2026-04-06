import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getLineSettings } from "@/lib/integration-settings";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { channelId, channelSecret, channelAccessToken, callbackUrl } = await getLineSettings();

  if (!channelId || !channelSecret || !channelAccessToken || !callbackUrl) {
    return NextResponse.json({ ok: false, message: "Missing required LINE credentials" });
  }

  try {
    // Verify channel access token by calling the LINE Messaging API bot info endpoint
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json({
        ok: false,
        message: `LINE API error ${res.status}: ${body.message ?? "Invalid channel access token"}`,
      });
    }

    const info = await res.json();
    return NextResponse.json({
      ok: true,
      message: `Connected as @${info.basicId ?? info.displayName ?? "LINE Bot"} (${info.displayName ?? ""})`,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Network error — could not reach LINE API" });
  }
}
