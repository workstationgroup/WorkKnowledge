import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recordChange } from "@/lib/changelog";
import { deleteFromR2, keyFromPublicUrl } from "@/lib/r2";
import { canUserManageLesson } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attachments = await prisma.lessonAttachment.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(attachments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canUserManageLesson(user, lessonId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { type, url, fileName, fileSize } = await req.json();

    const last = await prisma.lessonAttachment.findFirst({ where: { lessonId }, orderBy: { order: "desc" } });
    const attachment = await prisma.lessonAttachment.create({
      data: {
        lessonId, type, url, fileName, fileSize,
        order: (last?.order ?? -1) + 1,
      },
    });

    await recordChange(lessonId, user.id, user.name, `Added attachment: "${fileName}"`);

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save attachment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canUserManageLesson(user, lessonId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { attachmentId } = await req.json();
    const attachment = await prisma.lessonAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

    const key = keyFromPublicUrl(attachment.url);
    if (key) {
      try { await deleteFromR2(key); } catch (e) { console.error("R2 delete failed (continuing):", e); }
    }

    await prisma.lessonAttachment.delete({ where: { id: attachmentId, lessonId } });
    await recordChange(lessonId, user.id, user.name, `Removed attachment: "${attachment.fileName}"`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete attachment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
