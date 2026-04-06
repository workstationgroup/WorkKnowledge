import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await prisma.lessonProgress.findMany({
    where: { userId: user.id },
    include: { lesson: { include: { category: true } } },
  });
  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId, completed } = await req.json();
  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { completedAt: completed ? new Date() : null },
    create: { userId: user.id, lessonId, completedAt: completed ? new Date() : null },
  });
  return NextResponse.json(progress);
}
