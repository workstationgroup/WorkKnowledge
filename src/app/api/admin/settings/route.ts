import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { invalidateSettingsCache } from "@/lib/integration-settings";

const ALLOWED_KEYS = [
  "sharepoint_hostname",
  "sharepoint_site_path",
  "sharepoint_folder",
  "line_channel_id",
  "line_channel_secret",
  "line_channel_access_token",
  "line_callback_url",
];

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ALLOWED_KEYS } } });
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json(settings);
  } catch (err) {
    console.error("GET /api/admin/settings error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();

    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) },
        });
      }
    }

    invalidateSettingsCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/admin/settings error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
