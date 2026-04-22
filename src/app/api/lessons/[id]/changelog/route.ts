import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { getUserGroupIds, lessonInUserGroups } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "ADMIN") {
    if (!user.canManageLessons) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { permissions: { select: { groupId: true } } } });
    if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const groupIds = await getUserGroupIds(user.id);
    if (!lessonInUserGroups(lesson.permissions, groupIds)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await prisma.lessonChangelog.findMany({
    where: { lessonId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(entries);
}
