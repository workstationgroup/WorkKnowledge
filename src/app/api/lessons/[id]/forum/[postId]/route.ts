import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const { postId } = await params;
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { isPinned } = await req.json();
  const post = await prisma.forumPost.update({ where: { id: postId }, data: { isPinned } });
  return NextResponse.json(post);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; postId: string }> }) {
  const { postId } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const post = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role !== "ADMIN" && post.userId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.forumPost.delete({ where: { id: postId } });
  return NextResponse.json({ success: true });
}
