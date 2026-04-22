import { prisma } from "@/lib/prisma";

export async function getUserGroupIds(userId: string): Promise<Set<string>> {
  const members = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  return new Set(members.map((m) => m.groupId));
}

/** True if at least one lesson permission group overlaps with the user's groups. */
export function lessonInUserGroups(
  permissions: { groupId: string }[],
  userGroupIds: Set<string>
): boolean {
  return permissions.some((p) => userGroupIds.has(p.groupId));
}

/**
 * True if the user may edit the given lesson: either ADMIN, or a manager
 * (canManageLessons) who belongs to one of the lesson's permission groups.
 */
export async function canUserManageLesson(
  user: { id: string; role: string; canManageLessons: boolean },
  lessonId: string,
): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (!user.canManageLessons) return false;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { permissions: { select: { groupId: true } } },
  });
  if (!lesson) return false;
  const groupIds = await getUserGroupIds(user.id);
  return lessonInUserGroups(lesson.permissions, groupIds);
}
