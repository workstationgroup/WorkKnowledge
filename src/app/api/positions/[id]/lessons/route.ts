import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: positionId } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lessonIds }: { lessonIds: string[] } = await req.json();

  await prisma.positionLesson.deleteMany({ where: { positionId } });
  if (lessonIds.length > 0) {
    await prisma.positionLesson.createMany({
      data: lessonIds.map((lessonId, order) => ({ positionId, lessonId, order })),
    });
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    include: {
      lessons: { include: { lesson: { include: { category: true } } }, orderBy: { order: "asc" } },
    },
  });
  return NextResponse.json(position);
}
