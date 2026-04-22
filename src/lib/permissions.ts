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
