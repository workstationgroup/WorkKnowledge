import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { uploadToSharePoint } from "@/lib/sharepoint";

export const runtime = "nodejs";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const MIME_TO_TYPE: Record<string, string> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/gif": "IMAGE",
  "image/webp": "IMAGE",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
  "application/pdf": "PDF",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPT",
  "application/vnd.ms-excel": "EXCEL",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "EXCEL",
};

// Extension fallback for when browsers report a generic MIME type (e.g. application/zip, application/octet-stream)
const EXT_TO_TYPE: Record<string, string> = {
  jpg: "IMAGE", jpeg: "IMAGE", png: "IMAGE", gif: "IMAGE", webp: "IMAGE",
  mp4: "VIDEO", mov: "VIDEO", webm: "VIDEO",
  pdf: "PDF",
  ppt: "PPT", pptx: "PPT",
  xls: "EXCEL", xlsx: "EXCEL",
};

function resolveBlockType(mimeType: string, fileName: string): string | undefined {
  if (MIME_TO_TYPE[mimeType]) return MIME_TO_TYPE[mimeType];
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_TYPE[ext];
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const lessonFolder = (formData.get("lessonFolder") as string) || "General";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 400 });

    const blockType = resolveBlockType(file.type, file.name);
    if (!blockType) return NextResponse.json({ error: "File type not supported. Allowed: images, video, PDF, PPT, Excel" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { url, itemId, driveId } = await uploadToSharePoint(buffer, file.name, file.type, lessonFolder);

    return NextResponse.json({ url, fileName: file.name, fileSize: file.size, blockType, itemId, driveId });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
