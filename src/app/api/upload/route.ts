import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildKey, presignPut, type UploadKind } from "@/lib/r2";
import { canUserManageLesson } from "@/lib/permissions";

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

  const { fileName, contentType, lessonId, kind } = (await req.json()) as {
    fileName?: string;
    contentType?: string;
    lessonId?: string;
    kind?: UploadKind;
  };

  if (!fileName || !contentType) return NextResponse.json({ error: "fileName and contentType required" }, { status: 400 });
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });
  if (kind !== "attachments" && kind !== "blocks") {
    return NextResponse.json({ error: "kind must be 'attachments' or 'blocks'" }, { status: 400 });
  }

  if (!(await canUserManageLesson(user, lessonId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blockType = resolveBlockType(contentType, fileName);
  if (!blockType) return NextResponse.json({ error: "File type not supported. Allowed: images, video, PDF, PPT, Excel" }, { status: 400 });

  const key = buildKey({ lessonId, userId: user.id, kind, fileName });
  const { url, publicUrl } = await presignPut(key, contentType);

  return NextResponse.json({ uploadUrl: url, publicUrl, key, blockType });
}
