import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LessonForm } from "@/components/lesson-form";

export default async function NewLessonPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user || (user.role !== "ADMIN" && !user.canManageLessons)) redirect("/");

  const isManager = user.role !== "ADMIN" && user.canManageLessons;

  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });

  let groups;
  if (isManager) {
    // Managers can only assign their own groups
    const { getUserGroupIds } = await import("@/lib/permissions");
    const userGroupIds = await getUserGroupIds(user.id);
    groups = await prisma.group.findMany({
      where: { id: { in: [...userGroupIds] } },
      orderBy: { name: "asc" },
    });
  } else {
    groups = await prisma.group.findMany({ orderBy: { name: "asc" } });
  }

  return <LessonForm categories={categories} groups={groups} requireGroup={isManager} />;
}
