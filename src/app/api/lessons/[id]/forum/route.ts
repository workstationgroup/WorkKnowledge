import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const posts = await prisma.forumPost.findMany({
    where: { lessonId: id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(posts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const post = await prisma.forumPost.create({
    data: { lessonId: id, userId: user.id, userName: user.name, content: content.trim() },
    include: { replies: true },
  });

  return NextResponse.json(post, { status: 201 });
}
