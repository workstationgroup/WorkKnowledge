import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canUserManageLesson } from "@/lib/permissions";

// GET /api/lessons/[id]/versions — list all versions for a lesson
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canUserManageLesson(user, lessonId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const versions = await prisma.lessonVersion.findMany({
    where: { lessonId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      title: true,
      status: true,
      savedByName: true,
      note: true,
      createdAt: true,
    },
  });

  return NextResponse.json(versions);
}

// POST /api/lessons/[id]/versions — restore a specific version
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await canUserManageLesson(user, lessonId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { versionId } = await req.json();

  const ver = await prisma.lessonVersion.findUnique({ where: { id: versionId } });
  if (!ver || ver.lessonId !== lessonId) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Apply the version's data back to the lesson
  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: ver.title,
      slug: ver.slug,
      content: ver.content,
      summary: ver.summary,
      readMinutes: ver.readMinutes,
      categoryId: ver.categoryId,
      status: ver.status,
    },
  });

  // Create a new version snapshot recording the restore
  const latest = await prisma.lessonVersion.findFirst({
    where: { lessonId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  await prisma.lessonVersion.create({
    data: {
      lessonId,
      version: (latest?.version ?? 0) + 1,
      title: ver.title,
      slug: ver.slug,
      content: ver.content,
      summary: ver.summary,
      readMinutes: ver.readMinutes,
      categoryId: ver.categoryId,
      status: ver.status,
      savedById: user.id,
      savedByName: user.name,
      note: `Restored from version ${ver.version}`,
    },
  });

  // Record in changelog
  const { recordChange } = await import("@/lib/changelog");
  await recordChange(lessonId, user.id, user.name, `Restored to version ${ver.version} ("${ver.title}")`);

  return NextResponse.json(lesson);
}
