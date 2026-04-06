import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Helper: get the current DB user from session (returns null if not authenticated)
export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}
