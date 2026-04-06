import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recordChange } from "@/lib/changelog";

type QuestionInput = {
  text: string;
  allowMultiple?: boolean;
  mediaUrl?: string | null;
  mediaType?: string | null;
  choices: { text: string; isCorrect: boolean }[];
};

// GET — fetch quiz for a lesson (employees see questions without isCorrect)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quiz = await prisma.lessonQuiz.findUnique({
    where: { lessonId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { choices: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!quiz) return NextResponse.json(null);

  if (user.role !== "ADMIN") {
    return NextResponse.json({
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        choices: q.choices.map(({ isCorrect: _, ...c }) => c),
      })),
    });
  }

  return NextResponse.json(quiz);
}

// PUT — create or fully replace quiz (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { passScore, questions } = await req.json();

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
    }

    const questionsData = (questions as QuestionInput[]).map((q, i) => ({
      text: q.text,
      allowMultiple: q.allowMultiple ?? false,
      mediaUrl: q.mediaUrl ?? null,
      mediaType: q.mediaType ?? null,
      order: i,
      choices: {
        create: q.choices.map((c, j) => ({
          text: c.text,
          isCorrect: c.isCorrect,
          order: j,
        })),
      },
    }));

    const existing = await prisma.lessonQuiz.findUnique({ where: { lessonId } });

    if (existing) {
      await prisma.quizQuestion.deleteMany({ where: { quizId: existing.id } });
      await prisma.lessonQuiz.update({
        where: { id: existing.id },
        data: { passScore, questions: { create: questionsData } },
      });
    } else {
      await prisma.lessonQuiz.create({
        data: { lessonId, passScore, questions: { create: questionsData } },
      });
    }

    await recordChange(
      lessonId,
      user.id,
      user.name,
      existing
        ? `Quiz updated: ${questions.length} question(s), pass score ${passScore}%`
        : `Quiz created with ${questions.length} question(s), pass score ${passScore}%`
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /quiz error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — remove quiz entirely
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.lessonQuiz.delete({ where: { lessonId } });
    await recordChange(lessonId, user.id, user.name, "Quiz removed");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /quiz error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
