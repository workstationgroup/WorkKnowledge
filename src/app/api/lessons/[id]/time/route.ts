import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/**
 * POST /api/lessons/[id]/time
 * Body: { seconds: number }
 * Atomically adds seconds to the user's LessonProgress.timeSpentSeconds.
 * Creates the progress row if it doesn't exist yet.
 * Designed to be called by the LessonTimeTracker component every ~30 s
 * and on page leave (via sendBeacon).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let seconds: number;
  try {
    const body = await req.json();
    seconds = Math.max(0, Math.min(Math.round(body.seconds ?? 0), 3600)); // cap at 1 h per ping
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (seconds === 0) return NextResponse.json({ ok: true });

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: {
      timeSpentSeconds: { increment: seconds },
      lastSeenAt: new Date(),
    },
    create: {
      userId: user.id,
      lessonId,
      timeSpentSeconds: seconds,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
