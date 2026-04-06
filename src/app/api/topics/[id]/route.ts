import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recordChange } from "@/lib/changelog";

type BlockInput = {
  type: string;
  content: string;
  caption?: string | null;
  fileName?: string | null;
};

function pickBlockFields(b: BlockInput, i: number) {
  return {
    type: b.type as never,
    content: b.content,
    caption: b.caption ?? null,
    fileName: b.fileName ?? null,
    order: i,
  };
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { title, mustComplete, blocks } = await req.json();

    const before = await prisma.lessonTopic.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.topicBlock.deleteMany({ where: { topicId: id } });

    const topic = await prisma.lessonTopic.update({
      where: { id },
      data: {
        title,
        mustComplete,
        blocks: blocks?.length
          ? { create: blocks.map((b: BlockInput, i: number) => pickBlockFields(b, i)) }
          : undefined,
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });

    const changes: string[] = [];
    if (before.title !== title) changes.push(`renamed to "${title}"`);
    if (before.mustComplete !== mustComplete) changes.push(mustComplete ? "set as required" : "set as optional");
    changes.push("content updated");

    await recordChange(before.lessonId, user.id, user.name, `Topic "${title}": ${changes.join(", ")}`);

    return NextResponse.json(topic);
  } catch (err) {
    console.error("PUT /api/topics/[id] error:", err);
    return NextResponse.json({ error: "Failed to update topic" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const topic = await prisma.lessonTopic.findUnique({ where: { id } });
    if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.lessonTopic.delete({ where: { id } });
    await recordChange(topic.lessonId, user.id, user.name, `Deleted topic: "${topic.title}"`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/topics/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete topic" }, { status: 500 });
  }
}
