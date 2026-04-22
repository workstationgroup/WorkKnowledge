import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { NEON_API_KEY, NEON_PROJECT_ID, NEON_PREVIEW_BRANCH_ID, NEON_PARENT_BRANCH_ID } = process.env;
  if (!NEON_API_KEY || !NEON_PROJECT_ID || !NEON_PREVIEW_BRANCH_ID || !NEON_PARENT_BRANCH_ID) {
    return NextResponse.json({ error: "Missing Neon env vars" }, { status: 500 });
  }

  const res = await fetch(
    `https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_PREVIEW_BRANCH_ID}/restore`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NEON_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source_branch_id: NEON_PARENT_BRANCH_ID }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Neon API ${res.status}: ${body}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
}
