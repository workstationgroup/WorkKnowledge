import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.watchLater.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId: id } },
    create: { userId: user.id, lessonId: id },
    update: {},
  });

  return NextResponse.json({ saved: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.watchLater.deleteMany({ where: { userId: user.id, lessonId: id } });
  return NextResponse.json({ saved: false });
}
