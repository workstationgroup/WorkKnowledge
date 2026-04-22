import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { buildKey, presignPut } from "@/lib/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && !user.canManageLessons) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { fileName, contentType, lessonId } = (await req.json()) as {
    fileName?: string;
    contentType?: string;
    lessonId?: string | null;
  };
  if (!fileName || !contentType) return NextResponse.json({ error: "fileName and contentType required" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" }, { status: 400 });
  }

  const key = buildKey({ lessonId, userId: user.id, kind: "editor", fileName });
  const { url, publicUrl } = await presignPut(key, contentType);
  return NextResponse.json({ uploadUrl: url, publicUrl, key });
}
