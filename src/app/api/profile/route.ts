import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lineUserId: true,
      lineDisplayName: true,
      notifyEmail: true,
      notifyLine: true,
      position: { select: { id: true, name: true, color: true } },
      groupMembers: { include: { group: { select: { id: true, name: true, color: true } } } },
      createdAt: true,
    },
  });

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notifyEmail, notifyLine } = await req.json();

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(typeof notifyEmail === "boolean" ? { notifyEmail } : {}),
      ...(typeof notifyLine === "boolean" ? { notifyLine } : {}),
    },
    select: { notifyEmail: true, notifyLine: true },
  });

  return NextResponse.json(updated);
}
