import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { completed } = await req.json();

  const progress = await prisma.lessonTopicProgress.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    update: { completedAt: completed ? new Date() : null },
    create: { userId: user.id, topicId, completedAt: completed ? new Date() : null },
  });
  return NextResponse.json(progress);
}
