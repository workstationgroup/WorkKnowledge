import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonForm } from "@/components/lesson-form";

export default async function NewLessonPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user || user.role !== "ADMIN") redirect("/");

  const [categories, groups] = await Promise.all([
    prisma.category.findMany({ orderBy: { order: "asc" } }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <LessonForm categories={categories} groups={groups} />;
}
