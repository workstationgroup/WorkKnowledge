import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// POST — submit quiz answers, returns score + pass/fail + correct answers
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // answers: { [questionId]: string } for single, { [questionId]: string[] } for multiple
  const { answers } = await req.json();

  const quiz = await prisma.lessonQuiz.findUnique({
    where: { lessonId },
    include: { questions: { include: { choices: true } } },
  });
  if (!quiz) return NextResponse.json({ error: "No quiz found" }, { status: 404 });

  let correct = 0;
  const result: Record<string, { correct: boolean; correctChoiceIds: string[] }> = {};

  for (const question of quiz.questions) {
    const correctIds = question.choices.filter((c) => c.isCorrect).map((c) => c.id);

    let isCorrect = false;
    if (question.allowMultiple) {
      // Must select exactly the right set
      const chosen: string[] = Array.isArray(answers[question.id]) ? answers[question.id] : [];
      const chosenSet = new Set(chosen);
      const correctSet = new Set(correctIds);
      isCorrect =
        chosenSet.size === correctSet.size &&
        [...chosenSet].every((id) => correctSet.has(id));
    } else {
      const chosen: string = answers[question.id] ?? "";
      isCorrect = correctIds.includes(chosen);
    }

    if (isCorrect) correct++;
    result[question.id] = { correct: isCorrect, correctChoiceIds: correctIds };
  }

  const total = quiz.questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= quiz.passScore;

  await prisma.quizAttempt.create({
    data: { quizId: quiz.id, userId: user.id, score, passed, answers },
  });

  return NextResponse.json({ score, passed, passScore: quiz.passScore, total, correct, result });
}

// GET — fetch attempt history for the current user
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.lessonQuiz.findUnique({ where: { lessonId } });
  if (!quiz) return NextResponse.json([]);

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId: quiz.id, userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json(attempts);
}
