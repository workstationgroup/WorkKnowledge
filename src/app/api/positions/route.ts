import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const positions = await prisma.position.findMany({
    include: {
      _count: { select: { users: true, lessons: true } },
      lessons: { include: { lesson: { include: { category: true } } }, orderBy: { order: "asc" } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, color } = await req.json();
  const position = await prisma.position.create({ data: { name, description, color } });
  return NextResponse.json(position, { status: 201 });
}
