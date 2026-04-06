import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recordChange } from "@/lib/changelog";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { category: true, permissions: { include: { group: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN" && lesson.status !== "PUBLISHED")
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN" && lesson.permissions.length > 0) {
    const userGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } });
    const groupIds = new Set(userGroups.map((m) => m.groupId));
    if (!lesson.permissions.some((p) => groupIds.has(p.groupId)))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(lesson);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, slug, content, summary, categoryId, status, readMinutes, groupIds } = await req.json();

  // Fetch current state to diff
  const before = await prisma.lesson.findUnique({
    where: { id },
    include: { permissions: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.lessonPermission.deleteMany({ where: { lessonId: id } });

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      title, slug, content, summary, categoryId, status, readMinutes,
      permissions: groupIds?.length
        ? { create: groupIds.map((gid: string) => ({ groupId: gid })) }
        : undefined,
    },
    include: { category: true, permissions: { include: { group: true } } },
  });

  // Build changelog summary
  const changes: string[] = [];
  if (before.title !== title) changes.push(`title changed to "${title}"`);
  if (before.slug !== slug) changes.push(`URL slug changed to "${slug}"`);
  if (before.status !== status) changes.push(`status changed to ${status}`);
  if (before.categoryId !== categoryId) changes.push("category changed");
  if (before.readMinutes !== readMinutes) changes.push(`read time changed to ${readMinutes} min`);
  if (before.summary !== summary) changes.push("summary updated");
  if (before.content !== content) changes.push("content updated");

  const beforeGroups = new Set(before.permissions.map((p) => p.groupId));
  const afterGroups = new Set((groupIds ?? []) as string[]);
  const addedGroups = [...afterGroups].filter((g) => !beforeGroups.has(g)).length;
  const removedGroups = [...beforeGroups].filter((g) => !afterGroups.has(g)).length;
  if (addedGroups > 0 || removedGroups > 0) changes.push("access groups updated");

  if (changes.length > 0) {
    await recordChange(id, user.id, user.name, changes.join(", "));

    // Create a version snapshot only when content actually changed
    const latest = await prisma.lessonVersion.findFirst({
      where: { lessonId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    await prisma.lessonVersion.create({
      data: {
        lessonId: id,
        version: (latest?.version ?? 0) + 1,
        title: lesson.title,
        slug: lesson.slug,
        content: lesson.content,
        summary: lesson.summary,
        readMinutes: lesson.readMinutes,
        categoryId: lesson.categoryId,
        status: lesson.status,
        savedById: user.id,
        savedByName: user.name,
        note: changes.join(", "),
      },
    });
  }

  return NextResponse.json(lesson);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.lesson.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
