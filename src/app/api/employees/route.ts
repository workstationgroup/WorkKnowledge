import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const employees = await prisma.user.findMany({
    include: {
      position: true,
      groupMembers: { include: { group: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(employees);
}
