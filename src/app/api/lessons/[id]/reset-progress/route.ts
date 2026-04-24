import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/**
 * POST /api/lessons/[id]/reset-progress
 * Clears the current user's topic progress, quiz attempts, and lesson completion
 * for this lesson so they can re-learn it from scratch.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const topics = await prisma.lessonTopic.findMany({
    where: { lessonId },
    select: { id: true },
  });
  const topicIds = topics.map((t) => t.id);

  const quiz = await prisma.lessonQuiz.findUnique({
    where: { lessonId },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.lessonTopicProgress.deleteMany({
      where: { userId: user.id, topicId: { in: topicIds } },
    }),
    prisma.lessonProgress.updateMany({
      where: { userId: user.id, lessonId },
      data: { completedAt: null },
    }),
    ...(quiz
      ? [prisma.quizAttempt.deleteMany({ where: { userId: user.id, quizId: quiz.id } })]
      : []),
  ]);

  return NextResponse.json({ success: true });
}
