import { prisma } from "@/lib/prisma";

export async function recordChange(lessonId: string, userId: string, userName: string, summary: string) {
  await prisma.lessonChangelog.create({
    data: { lessonId, userId, userName, summary },
  });
}
