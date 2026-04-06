import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("AZURE_TENANT_ID, AZURE_CLIENT_ID or AZURE_CLIENT_SECRET missing from .env.local");
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  if (!res.ok) throw new Error("Azure authentication failed");
  return (await res.json()).access_token;
}

// GET /api/admin/settings/browse                        → list all SharePoint sites
// GET /api/admin/settings/browse?siteId=xxx             → list root folders (returns driveId too)
// GET /api/admin/settings/browse?driveId=xxx            → list root folders using drive ID directly
// GET /api/admin/settings/browse?driveId=xxx&folderId=y → list subfolder children
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const token = await getAccessToken();
    const reqUrl = new URL(req.url);
    const siteId = reqUrl.searchParams.get("siteId");
    const driveId = reqUrl.searchParams.get("driveId");
    const folderId = reqUrl.searchParams.get("folderId");

    // ── Folder listing ──────────────────────────────────────────────────────
    if (driveId) {
      // Use driveId directly — most reliable for subfolder navigation
      const childrenUrl = folderId
        ? `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${folderId}/children`
        : `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;

      console.log("[browse] driveId:", driveId, "folderId:", folderId, "→", childrenUrl);

      const res = await fetch(childrenUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Cannot list folders: ${err}` }, { status: 400 });
      }
      const data = await res.json();
      const folders = (data.value ?? [])
        .filter((i: { folder?: unknown }) => i.folder !== undefined)
        .map((i: { id: string; name: string }) => ({ id: i.id, name: i.name }));
      return NextResponse.json({ folders, driveId });
    }

    if (siteId || (reqUrl.searchParams.get("hostname") && reqUrl.searchParams.get("sitePath"))) {
      // Resolve siteId if coming from hostname+sitePath
      let resolvedSiteId = siteId;
      if (!resolvedSiteId) {
        const hostname = reqUrl.searchParams.get("hostname")!.replace(/^https?:\/\//, "").replace(/\/$/, "");
        const sp = reqUrl.searchParams.get("sitePath")!.replace(/\/$/, "");
        const cleanPath = sp.startsWith("/") ? sp : `/${sp}`;
        const siteRes = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${hostname}:${cleanPath}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!siteRes.ok) {
          return NextResponse.json({ error: "Site not found — save settings and test connection first" }, { status: 400 });
        }
        resolvedSiteId = (await siteRes.json()).id;
      }

      // Get the drive ID for this site
      const driveRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${resolvedSiteId}/drive`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!driveRes.ok) {
        const err = await driveRes.text();
        return NextResponse.json({ error: `Cannot access drive: ${err}` }, { status: 400 });
      }
      const drive = await driveRes.json();
      const resolvedDriveId: string = drive.id;

      // List root folders and return driveId so client can use it for subfolder calls
      const childrenUrl = `https://graph.microsoft.com/v1.0/drives/${resolvedDriveId}/root/children`;
      console.log("[browse] siteId resolved, driveId:", resolvedDriveId, "→", childrenUrl);

      const childrenRes = await fetch(childrenUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!childrenRes.ok) {
        const err = await childrenRes.text();
        return NextResponse.json({ error: `Cannot list folders: ${err}` }, { status: 400 });
      }
      const data = await childrenRes.json();
      const folders = (data.value ?? [])
        .filter((i: { folder?: unknown }) => i.folder !== undefined)
        .map((i: { id: string; name: string }) => ({ id: i.id, name: i.name }));
      return NextResponse.json({ folders, driveId: resolvedDriveId });
    }

    // ── Site listing ────────────────────────────────────────────────────────
    const sitesRes = await fetch(
      "https://graph.microsoft.com/v1.0/sites?search=*&$select=id,displayName,webUrl,name",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!sitesRes.ok) {
      const err = await sitesRes.text();
      return NextResponse.json({ error: `Cannot list sites: ${err}` }, { status: 400 });
    }
    const data = await sitesRes.json();
    const sites = (data.value ?? [])
      .filter((s: { webUrl?: string }) => s.webUrl)
      .map((s: { id: string; displayName?: string; name?: string; webUrl: string }) => {
        const url = new URL(s.webUrl);
        return {
          id: s.id,
          displayName: s.displayName || s.name || url.pathname,
          hostname: url.hostname,
          sitePath: url.pathname,
          webUrl: s.webUrl,
        };
      });
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Browse failed" }, { status: 500 });
  }
}
