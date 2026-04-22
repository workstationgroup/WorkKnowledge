import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { recordChange } from "@/lib/changelog";

type BlockInput = {
  type: string;
  content: string;
  caption?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  driveId?: string | null;
  itemId?: string | null;
};

function pickBlockFields(b: BlockInput, i: number) {
  return {
    type: b.type as never,
    content: b.content,
    caption: b.caption ?? null,
    fileName: b.fileName ?? null,
    fileSize: b.fileSize ?? null,
    driveId: b.driveId ?? null,
    itemId: b.itemId ?? null,
    order: i,
  };
}

// GET /api/topics?lessonId=xxx
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lessonId = req.nextUrl.searchParams.get("lessonId");
  if (!lessonId) return NextResponse.json({ error: "lessonId required" }, { status: 400 });

  const topics = await prisma.lessonTopic.findMany({
    where: { lessonId },
    include: { blocks: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(topics);
}

// POST /api/topics — create a topic
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { lessonId, title, mustComplete, blocks } = await req.json();

    const lastTopic = await prisma.lessonTopic.findFirst({
      where: { lessonId },
      orderBy: { order: "desc" },
    });

    const topic = await prisma.lessonTopic.create({
      data: {
        lessonId,
        title,
        mustComplete: mustComplete ?? true,
        order: (lastTopic?.order ?? -1) + 1,
        blocks: blocks?.length
          ? { create: blocks.map((b: BlockInput, i: number) => pickBlockFields(b, i)) }
          : undefined,
      },
      include: { blocks: { orderBy: { order: "asc" } } },
    });

    await recordChange(lessonId, user.id, user.name, `Added topic: "${title}"`);

    return NextResponse.json(topic, { status: 201 });
  } catch (err) {
    console.error("POST /api/topics error:", err);
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }
}
