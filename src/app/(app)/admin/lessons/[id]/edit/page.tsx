import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonForm } from "@/components/lesson-form";

export default async function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user || user.role !== "ADMIN") redirect("/");

  const [lesson, categories, groups] = await Promise.all([
    prisma.lesson.findUnique({ where: { id }, include: { permissions: true } }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!lesson) notFound();

  return (
    <LessonForm
      categories={categories}
      groups={groups}
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
