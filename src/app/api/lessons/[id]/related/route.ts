import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// GET — list related lessons for a lesson (both directions)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [from, to] = await Promise.all([
    prisma.lessonRelation.findMany({
      where: { lessonId: id },
      include: { relatedLesson: { include: { category: true } } },
    }),
    prisma.lessonRelation.findMany({
      where: { relatedLessonId: id },
      include: { lesson: { include: { category: true } } },
    }),
  ]);

  // Merge both directions, deduplicate by id
  const map = new Map<string, { id: string; title: string; slug: string; status: string; readMinutes: number; category: { name: string; color: string } }>();
  for (const r of from) {
    const l = r.relatedLesson;
    map.set(l.id, { id: l.id, title: l.title, slug: l.slug, status: l.status, readMinutes: l.readMinutes, category: l.category });
  }
  for (const r of to) {
    const l = r.lesson;
    map.set(l.id, { id: l.id, title: l.title, slug: l.slug, status: l.status, readMinutes: l.readMinutes, category: l.category });
  }

  return NextResponse.json([...map.values()]);
}

// PUT — replace the related lessons list (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { relatedIds }: { relatedIds: string[] } = await req.json();

  // Delete existing relations in both directions, then re-create
  await prisma.$transaction([
    prisma.lessonRelation.deleteMany({ where: { lessonId: id } }),
    prisma.lessonRelation.deleteMany({ where: { relatedLessonId: id } }),
    ...relatedIds.map((rid) =>
      prisma.lessonRelation.create({ data: { lessonId: id, relatedLessonId: rid } })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
