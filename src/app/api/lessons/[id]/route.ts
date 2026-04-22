import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recordChange } from "@/lib/changelog";
import { getUserGroupIds, lessonInUserGroups } from "@/lib/permissions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { category: true, permissions: { include: { group: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN") {
    const userGroupIds = await getUserGroupIds(user.id);
    const isManager = user.canManageLessons && lessonInUserGroups(lesson.permissions, userGroupIds);

    // Non-managers can only see published lessons
    if (!isManager && lesson.status !== "PUBLISHED")
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Group-restricted lesson: user or manager must be in a permitted group
    if (lesson.permissions.length > 0 && !lessonInUserGroups(lesson.permissions, userGroupIds))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(lesson);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, slug, content, summary, categoryId, status, readMinutes, groupIds } = await req.json();

  // Fetch current state to diff and check access
  const before = await prisma.lesson.findUnique({
    where: { id },
    include: { permissions: true },
  });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN") {
    if (!user.canManageLessons) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const userGroupIds = await getUserGroupIds(user.id);
    if (!lessonInUserGroups(before.permissions, userGroupIds))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // Validate submitted groupIds are only from the manager's groups
    if (!groupIds?.length)
      return NextResponse.json({ error: "You must assign at least one group" }, { status: 403 });
    const invalid = (groupIds as string[]).filter((gid: string) => !userGroupIds.has(gid));
    if (invalid.length > 0)
      return NextResponse.json({ error: "You can only assign groups you belong to" }, { status: 403 });
  }

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "ADMIN") {
    if (!user.canManageLessons) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const lesson = await prisma.lesson.findUnique({ where: { id }, include: { permissions: true } });
    if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const userGroupIds = await getUserGroupIds(user.id);
    if (!lessonInUserGroups(lesson.permissions, userGroupIds))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.lesson.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
