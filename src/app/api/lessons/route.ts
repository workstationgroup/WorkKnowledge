import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recordChange } from "@/lib/changelog";
import { getUserGroupIds } from "@/lib/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let lessons;
  if (user.role === "ADMIN") {
    lessons = await prisma.lesson.findMany({
      include: { category: true, permissions: { include: { group: true } } },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    });
  } else {
    const userGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } });
    const groupIds = userGroups.map((m) => m.groupId);
    lessons = await prisma.lesson.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { permissions: { none: {} } },
          { permissions: { some: { groupId: { in: groupIds } } } },
        ],
      },
      include: { category: true, permissions: { include: { group: true } } },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    });
  }

  return NextResponse.json(lessons);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "ADMIN" && !user.canManageLessons)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, slug, content, summary, categoryId, status, readMinutes, groupIds } = body;

    // Managers must assign at least one of their own groups
    if (user.role !== "ADMIN" && user.canManageLessons) {
      const userGroupIds = await getUserGroupIds(user.id);
      if (!groupIds?.length) {
        return NextResponse.json({ error: "You must assign at least one group to this lesson" }, { status: 403 });
      }
      const invalid = (groupIds as string[]).filter((gid) => !userGroupIds.has(gid));
      if (invalid.length > 0) {
        return NextResponse.json({ error: "You can only assign groups you belong to" }, { status: 403 });
      }
    }

    const lesson = await prisma.lesson.create({
      data: {
        title, slug, content, summary, categoryId,
        status: status ?? "DRAFT",
        readMinutes: readMinutes ?? 5,
        permissions: groupIds?.length
          ? { create: groupIds.map((gid: string) => ({ groupId: gid })) }
          : undefined,
      },
      include: { category: true, permissions: { include: { group: true } } },
    });

    await recordChange(lesson.id, user.id, user.name, `Lesson created as ${lesson.status === "PUBLISHED" ? "published" : "draft"}`);

    // Create initial version snapshot
    await prisma.lessonVersion.create({
      data: {
        lessonId: lesson.id,
        version: 1,
        title: lesson.title,
        slug: lesson.slug,
        content: lesson.content,
        summary: lesson.summary,
        readMinutes: lesson.readMinutes,
        categoryId: lesson.categoryId,
        status: lesson.status,
        savedById: user.id,
        savedByName: user.name,
        note: "Initial version",
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string; meta?: { target?: string[] }; message?: string };
    console.error("POST /api/lessons failed:", err);
    if (err.code === "P2002") {
      const target = err.meta?.target?.join(", ") ?? "field";
      return NextResponse.json({ error: `A lesson with this ${target} already exists` }, { status: 409 });
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Invalid category — please pick one from the list" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message ?? "Failed to create lesson" }, { status: 500 });
  }
}
