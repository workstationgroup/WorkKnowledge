import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const { postId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const post = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reply = await prisma.forumReply.create({
    data: { postId, userId: user.id, userName: user.name, content: content.trim() },
  });

  return NextResponse.json(reply, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const { postId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { replyId } = await req.json();
  const reply = await prisma.forumReply.findUnique({ where: { id: replyId } });
  if (!reply || reply.postId !== postId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN" && reply.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.forumReply.delete({ where: { id: replyId } });
  return NextResponse.json({ success: true });
}
