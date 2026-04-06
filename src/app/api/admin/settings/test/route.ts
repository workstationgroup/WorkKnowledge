import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
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
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure authentication failed: ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ["sharepoint_hostname", "sharepoint_site_path", "sharepoint_folder"] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const hostname = map["sharepoint_hostname"] ?? process.env.SHAREPOINT_HOSTNAME ?? "";
    const sitePath = map["sharepoint_site_path"] ?? process.env.SHAREPOINT_SITE_PATH ?? "";
    const rootFolder = map["sharepoint_folder"] ?? process.env.SHAREPOINT_FOLDER ?? "Training Materials";

    if (!hostname || !sitePath) {
      return NextResponse.json({ ok: false, message: "Hostname and site path are not saved yet. Save settings first, then test." });
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json({ ok: false, message: "AZURE_TENANT_ID, AZURE_CLIENT_ID or AZURE_CLIENT_SECRET is missing from .env.local" });
    }

    // Step 1: get token
    let token: string;
    try {
      token = await getAccessToken(tenantId, clientId, clientSecret);
    } catch (err) {
      return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : "Auth failed" });
    }

    // Step 2: resolve site — try both URL formats
    const cleanHostname = hostname.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const cleanPath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;

    // First: discover the tenant's actual SharePoint hostname via sites/root
    const rootRes = await fetch(
      "https://graph.microsoft.com/v1.0/sites/root",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!rootRes.ok) {
      // Can't access any SharePoint endpoint at all — permissions not granted
      return NextResponse.json({
        ok: false,
        message:
          "The app cannot access SharePoint. You must grant Sites.ReadWrite.All permission in Azure Portal:\n\n" +
          "1. portal.azure.com → App registrations → your app\n" +
          "2. API permissions → Add a permission → Microsoft Graph → Application permissions\n" +
          "3. Search \"Sites.ReadWrite.All\" → check it → Add permissions\n" +
          "4. Click \"Grant admin consent for [your org]\" → Confirm\n" +
          "5. Wait 1–2 minutes then test again",
      });
    }

    const rootSite = await rootRes.json();
    const rootWebUrl: string = rootSite.webUrl ?? "";
    const actualHostname = rootWebUrl ? new URL(rootWebUrl).hostname : "";

    // Always return the discovered hostname so the user can verify
    if (!actualHostname) {
      return NextResponse.json({
        ok: false,
        message: `Connected to Microsoft Graph but could not determine SharePoint hostname. Root site webUrl: "${rootWebUrl}"`,
      });
    }

    if (cleanHostname !== actualHostname) {
      return NextResponse.json({
        ok: false,
        message:
          `Wrong SharePoint hostname.\n\n` +
          `You entered:   "${cleanHostname || "(empty)"}"\n` +
          `Correct value: "${actualHostname}"\n\n` +
          `Copy the correct value above into the Hostname field, save, then test again.`,
        correctHostname: actualHostname,
      });
    }

    // Format 1: sites/{hostname}:{path}  (most common)
    let siteRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${cleanHostname}:${cleanPath}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Format 2: sites/{hostname},{siteId} — fallback via search
    if (!siteRes.ok) {
      const searchRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites?search=${encodeURIComponent(cleanHostname)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!searchRes.ok) {
        // Both failed — diagnose the original error
        let errText = "";
        try { errText = await siteRes.text(); } catch { /* ignore */ }

        let errObj: { error?: { code?: string; message?: string } } = {};
        try { errObj = JSON.parse(errText); } catch { /* ignore */ }

        const code = errObj?.error?.code ?? "";

        if (code === "generalException" || code === "accessDenied") {
          return NextResponse.json({
            ok: false,
            message:
              "Access denied to SharePoint. Fix in Azure Portal:\n" +
              "1. App registrations → your app → API permissions\n" +
              "2. Add permission: Microsoft Graph → Application → Sites.ReadWrite.All\n" +
              "3. Click \"Grant admin consent for [your org]\"\n" +
              "4. Wait 1–2 minutes and test again.",
          });
        }

        return NextResponse.json({
          ok: false,
          message: `Could not access SharePoint site.\nHostname: ${cleanHostname}\nSite path: ${cleanPath}\nError: ${errObj?.error?.message ?? errText}`,
        });
      }

      const searchData = await searchRes.json();
      const matchedSite = (searchData.value ?? []).find(
        (s: { name?: string; webUrl?: string }) =>
          s.webUrl?.toLowerCase().includes(cleanPath.toLowerCase().split("/").pop() ?? "")
      );

      if (!matchedSite) {
        return NextResponse.json({
          ok: false,
          message: `No SharePoint site found matching "${cleanPath}" on ${cleanHostname}. Check the site path is correct.`,
        });
      }

      return NextResponse.json({
        ok: true,
        message: `Connected to "${matchedSite.displayName ?? matchedSite.name}". SharePoint is reachable. ` +
          `Note: Sites.ReadWrite.All may still be needed for file uploads.`,
      });
    }

    const site = await siteRes.json();

    // Step 3: check root folder
    const folderRes = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${site.id}/drive/root:/${encodeURIComponent(rootFolder)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (folderRes.status === 404) {
      return NextResponse.json({
        ok: true,
        message: `✓ Connected to "${site.displayName}". The folder "${rootFolder}" doesn't exist yet — it will be created automatically on first upload.`,
      });
    }

    if (!folderRes.ok) {
      const errText = await folderRes.text();
      return NextResponse.json({
        ok: false,
        message: `Connected to site but could not access drive/folder: ${errText}`,
      });
    }

    const folder = await folderRes.json();
    return NextResponse.json({
      ok: true,
      message: `✓ Connected to "${site.displayName}" → folder "${folder.name}" found. SharePoint is ready for file uploads.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message });
  }
}
