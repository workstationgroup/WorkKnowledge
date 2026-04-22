import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getAccessToken } from "@/lib/sharepoint";

export const runtime = "nodejs";

/**
 * GET /api/sharepoint-proxy?url=<sharepoint-sharing-url>
 *
 * Fetches a SharePoint file via Graph API and streams the bytes to the browser.
 * This lets <img> and <video> tags display files stored in SharePoint without
 * requiring the end-user to be authenticated to SharePoint directly.
 *
 * Uses the Graph API "shared drive item" endpoint which accepts a sharing URL:
 *   GET /shares/{encodedUrl}/driveItem/content
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = req.nextUrl;
  const driveId = searchParams.get("driveId");
  const itemId = searchParams.get("itemId");
  const sharingUrl = searchParams.get("url");

  if (!driveId && !itemId && !sharingUrl) {
    return new NextResponse("Missing driveId+itemId or url param", { status: 400 });
  }

  try {
    const token = await getAccessToken();
    let graphUrl: string;

    if (driveId && itemId) {
      // Direct drive item access — most reliable
      graphUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}/content`;
    } else {
      // Fallback: resolve the real sharing URL from AllItems.aspx viewer URL if needed,
      // then encode it for the Graph API /shares/{id} endpoint
      let resolvedUrl = sharingUrl!;

      // AllItems.aspx URLs are viewer pages, not sharing links — extract the real file URL
      try {
        const u = new URL(resolvedUrl);
        const idParam = u.searchParams.get("id");
        if (idParam && u.pathname.includes("AllItems.aspx")) {
          resolvedUrl = `${u.origin}${encodeURI(idParam)}`;
        }
      } catch { /* ignore */ }

      // Encode as base64url for the /shares/ endpoint
      const encoded =
        "u!" +
        Buffer.from(resolvedUrl)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
      graphUrl = `https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem/content`;
    }

    const res = await fetch(graphUrl, { headers: { Authorization: `Bearer ${token}` } });

    if (!res.ok) {
      console.error("SharePoint proxy error:", res.status, await res.text().catch(() => ""));
      return new NextResponse("Failed to fetch file from SharePoint", { status: 502 });
    }

    const contentType = res.headers.get("Content-Type") ?? "application/octet-stream";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        // Cache for 24 h in browser, serve stale for up to 1 h while revalidating
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("SharePoint proxy error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
