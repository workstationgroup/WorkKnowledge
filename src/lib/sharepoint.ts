/**
 * Microsoft SharePoint file storage via Graph API (client credentials flow)
 * Requires Azure App to have "Sites.ReadWrite.All" Application permission + admin consent
 *
 * SharePoint hostname, site path, and folder are read from the DB settings table
 * (managed via the admin settings page), falling back to environment variables.
 */

import { prisma } from "@/lib/prisma";

async function getSharePointConfig() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["sharepoint_hostname", "sharepoint_site_path", "sharepoint_folder"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    hostname: map["sharepoint_hostname"] ?? process.env.SHAREPOINT_HOSTNAME ?? "",
    sitePath: map["sharepoint_site_path"] ?? process.env.SHAREPOINT_SITE_PATH ?? "",
    rootFolder: map["sharepoint_folder"] ?? process.env.SHAREPOINT_FOLDER ?? "Training Materials",
  };
}

export async function getAccessToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to get Microsoft access token");
  const data = await res.json();
  return data.access_token;
}

/**
 * Get or create a folder inside a parent drive item.
 * Uses /items/{parentId}/children — avoids the root:/path: syntax that causes BadRequest.
 */
async function getOrCreateFolder(
  driveId: string,
  parentItemId: string,
  folderName: string,
  token: string
): Promise<string> {
  // List children and look for an existing folder with this name
  const listRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentItemId}/children`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (listRes.ok) {
    const data = await listRes.json();
    const existing = (data.value ?? []).find(
      (i: { name: string; folder?: unknown }) => i.name === folderName && i.folder !== undefined
    );
    if (existing) return existing.id as string;
  }

  // Not found — create it
  const createRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentItemId}/children`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
    }
  );
  if (createRes.ok) return (await createRes.json()).id as string;

  // 409 = created between our list and create (race condition) — list again
  if (createRes.status === 409) {
    const retryRes = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${parentItemId}/children`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (retryRes.ok) {
      const data = await retryRes.json();
      const existing = (data.value ?? []).find(
        (i: { name: string; folder?: unknown }) => i.name === folderName && i.folder !== undefined
      );
      if (existing) return existing.id as string;
    }
  }

  const errText = await createRes.text().catch(() => String(createRes.status));
  throw new Error(`Cannot create SharePoint folder "${folderName}": ${errText}`);
}

/**
 * Convert an AllItems.aspx viewer URL to a direct file URL.
 * e.g. https://tenant.sharepoint.com/sites/HR/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2F...%2Fimage.jpg
 *   → https://tenant.sharepoint.com/sites/HR/Shared%20Documents/Apps/.../image.jpg
 */
function toDirectSharePointUrl(webUrl: string): string {
  try {
    const u = new URL(webUrl);
    const idParam = u.searchParams.get("id");
    if (idParam) {
      // idParam is the server-relative path to the file (already decoded by URLSearchParams)
      return `${u.origin}${encodeURI(idParam)}`;
    }
  } catch {
    // ignore
  }
  return webUrl; // already a direct URL
}

/**
 * Upload a file to SharePoint under a lesson-specific folder.
 * Returns the SharePoint webUrl (direct link to the file).
 *
 * SharePoint path structure:
 *   {rootFolder}/{lessonFolder}/{filename}
 */
export async function uploadToSharePoint(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  lessonFolder: string
): Promise<{ url: string; webUrl: string; itemId: string; driveId: string }> {
  const { hostname, sitePath, rootFolder } = await getSharePointConfig();

  if (!hostname || !sitePath) {
    throw new Error("SharePoint is not configured. Please set hostname and site path in Admin → Settings.");
  }

  const token = await getAccessToken();

  // Step 1: resolve the site to get its stable ID
  const cleanHostname = hostname.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cleanPath = sitePath.startsWith("/") ? sitePath : `/${sitePath}`;

  const siteRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${cleanHostname}:${cleanPath}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!siteRes.ok) {
    const err = await siteRes.text();
    throw new Error(`SharePoint site not found: ${err}`);
  }
  const site = await siteRes.json();
  const siteId: string = site.id;

  // Step 2: get the default document library drive
  const driveRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!driveRes.ok) {
    const err = await driveRes.text();
    throw new Error(`SharePoint drive not found: ${err}`);
  }
  const drive = await driveRes.json();
  const driveId: string = drive.id;

  // Step 3: get the drive root item ID (avoids root:/path: BadRequest issues)
  const rootRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/root`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!rootRes.ok) {
    const err = await rootRes.text();
    throw new Error(`Cannot access SharePoint drive root: ${err}`);
  }
  const rootItem = await rootRes.json();
  const rootItemId: string = rootItem.id;

  // Step 4: get or create folder hierarchy by item ID (no root:/path: syntax)
  // rootFolder may be a path like "Apps/Knowledge" — create each segment in sequence
  const safeLesson = lessonFolder.replace(/[#%&*:<>?\\|"]/g, "-").slice(0, 60);

  // Add a short random suffix before the extension to prevent duplicate file names
  const randomSuffix = Math.random().toString(36).slice(2, 8); // e.g. "k3f9az"
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : "";
  const safeFile = `${baseName}_${randomSuffix}${ext}`.replace(/[#%&*:<>?\\|"]/g, "-");

  const rootSegments = rootFolder.split("/").map((s) => s.trim()).filter(Boolean);
  let currentParentId = rootItemId;
  for (const segment of rootSegments) {
    currentParentId = await getOrCreateFolder(driveId, currentParentId, segment, token);
  }
  const lessonFolderId = await getOrCreateFolder(driveId, currentParentId, safeLesson, token);

  // Step 5: upload file — uses folder item ID, not root:/path:
  const uploadRes = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${lessonFolderId}:/${encodeURIComponent(safeFile)}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType,
      },
      body: fileBuffer as unknown as BodyInit,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`SharePoint upload failed: ${err}`);
  }

  const item = await uploadRes.json();

  // Step 6: create a shareable link so employees can open/download the file
  // item.webUrl from Graph API is the AllItems.aspx viewer URL, not a direct file URL.
  // Extract the server-relative file path from the "id" query parameter and build the direct URL.
  const directUrl = toDirectSharePointUrl(item.webUrl as string);
  return { url: directUrl, webUrl: directUrl, itemId: item.id as string, driveId };
}

/**
 * Delete a file from SharePoint by drive item ID.
 */
export async function deleteFromSharePoint(driveId: string, itemId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  // 204 = success, 404 = already gone — both are acceptable
  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`SharePoint delete failed: ${err}`);
  }
}
