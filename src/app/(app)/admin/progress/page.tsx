import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProgressDashboard } from "@/components/progress-dashboard";

export default async function AdminProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; user?: string }>;
}) {
  const session = await auth();
  const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!me || me.role !== "ADMIN") redirect("/");

  const { group: groupFilter, user: userFilter } = await searchParams;

  // All groups for filter bar
  const groups = await prisma.group.findMany({ orderBy: { name: "asc" } });

  // All employees (with group memberships + position)
  const allUsers = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    include: {
      position: { select: { id: true, name: true, color: true } },
      groupMembers: { include: { group: { select: { id: true, name: true, color: true } } } },
    },
    orderBy: { name: "asc" },
  });

  // Apply filters
  let filteredUsers = allUsers;
  if (groupFilter) {
    filteredUsers = filteredUsers.filter((u) =>
      u.groupMembers.some((gm) => gm.group.id === groupFilter)
    );
  }
  if (userFilter) {
    filteredUsers = filteredUsers.filter((u) => u.id === userFilter);
  }

  const userIds = filteredUsers.map((u) => u.id);

  // All published lessons
  const lessons = await prisma.lesson.findMany({
    where: { status: "PUBLISHED" },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
  });

  // Progress for filtered users
  const progressRows = await prisma.lessonProgress.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      lessonId: true,
      completedAt: true,
      timeSpentSeconds: true,
      lastSeenAt: true,
    },
  });

  // Quiz attempts for filtered users
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      quizId: true,
      score: true,
      passed: true,
      createdAt: true,
      quiz: { select: { lessonId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize (dates → strings, no BigInt issues)
  const serializedUsers = filteredUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    position: u.position,
    groups: u.groupMembers.map((gm) => gm.group),
  }));

  const serializedProgress = progressRows.map((p) => ({
    userId: p.userId,
    lessonId: p.lessonId,
    completedAt: p.completedAt?.toISOString() ?? null,
    timeSpentSeconds: p.timeSpentSeconds,
    lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
  }));

  const serializedAttempts = quizAttempts.map((a) => ({
    userId: a.userId,
    lessonId: a.quiz.lessonId,
    score: a.score,
    passed: a.passed,
    createdAt: a.createdAt.toISOString(),
  }));

  const serializedLessons = lessons.map((l) => ({
    id: l.id,
    title: l.title,
    readMinutes: l.readMinutes,
    category: l.category,
  }));

  return (
    <ProgressDashboard
      groups={groups}
      allUsers={allUsers.map((u) => ({ id: u.id, name: u.name }))}
      users={serializedUsers}
      lessons={serializedLessons}
      progress={serializedProgress}
      quizAttempts={serializedAttempts}
      activeGroupId={groupFilter ?? ""}
      activeUserId={userFilter ?? ""}
    />
  );
}
