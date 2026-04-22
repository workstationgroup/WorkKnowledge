import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonForm } from "@/components/lesson-form";
import { getUserGroupIds, lessonInUserGroups } from "@/lib/permissions";

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user || (user.role !== "ADMIN" && !user.canManageLessons)) redirect("/");

  const isManager = user.role !== "ADMIN" && user.canManageLessons;

  const [lesson, categories, allLessons] = await Promise.all([
    prisma.lesson.findUnique({ where: { id }, include: { permissions: true } }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.lesson.findMany({
      where: { id: { not: id } },
      include: { category: { select: { name: true, color: true } } },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    }),
  ]);

  if (!lesson) notFound();

  // Managers can only edit lessons that belong to one of their groups
  if (isManager) {
    const userGroupIds = await getUserGroupIds(user.id);
    if (!lessonInUserGroups(lesson.permissions, userGroupIds)) redirect("/admin/lessons");
  }

  let groups;
  if (isManager) {
    const userGroupIds = await getUserGroupIds(user.id);
    groups = await prisma.group.findMany({
      where: { id: { in: [...userGroupIds] } },
      orderBy: { name: "asc" },
    });
  } else {
    groups = await prisma.group.findMany({ orderBy: { name: "asc" } });
  }

  return (
    <LessonForm
      categories={categories}
      groups={groups}
      requireGroup={isManager}
      allLessons={allLessons.map((l) => ({ id: l.id, title: l.title, status: l.status, category: l.category }))}
      initial={{
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        content: lesson.content,
        summary: lesson.summary ?? "",
        categoryId: lesson.categoryId,
        status: lesson.status,
        readMinutes: lesson.readMinutes,
        groupIds: lesson.permissions.map((p) => p.groupId),
      }}
    />
  );
}
