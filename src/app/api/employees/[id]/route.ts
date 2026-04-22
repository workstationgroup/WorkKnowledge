import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { role, positionId, canManageLessons } = await req.json();
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(role !== undefined && { role }),
      ...(positionId !== undefined && { positionId: positionId ?? null }),
      ...(canManageLessons !== undefined && { canManageLessons }),
    },
  });
  return NextResponse.json(updated);
}
