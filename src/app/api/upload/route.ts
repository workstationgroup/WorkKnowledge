import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { makeKey, presignPut } from "@/lib/r2";

export const runtime = "nodejs";

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && !user.canManageLessons) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { fileName, contentType, lessonFolder } = (await req.json()) as {
    fileName?: string;
    contentType?: string;
    lessonFolder?: string;
  };

  if (!fileName || !contentType) return NextResponse.json({ error: "fileName and contentType required" }, { status: 400 });

  const blockType = resolveBlockType(contentType, fileName);
  if (!blockType) return NextResponse.json({ error: "File type not supported. Allowed: images, video, PDF, PPT, Excel" }, { status: 400 });

  const folder = `lessons/${(lessonFolder || "General").replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const key = makeKey(folder, fileName);
  const { url, publicUrl } = await presignPut(key, contentType);

  return NextResponse.json({ uploadUrl: url, publicUrl, key, blockType });
}
