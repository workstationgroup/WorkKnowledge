import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "@/components/profile-client";
import { getLineSettings } from "@/lib/integration-settings";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ line?: string; reason?: string }>;
}) {
  const { line: lineStatus, reason } = await searchParams;

  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      lineUserId: true,
      lineDisplayName: true,
      notifyEmail: true,
      notifyLine: true,
      createdAt: true,
      position: { select: { id: true, name: true, color: true } },
      groupMembers: { include: { group: { select: { id: true, name: true, color: true } } } },
    },
  });

  if (!user) return null;

  const { channelId, callbackUrl } = await getLineSettings();

  return (
    <ProfileClient
      user={{
        ...user,
        createdAt: user.createdAt.toISOString(),
        groupMembers: user.groupMembers.map((gm) => ({ group: gm.group })),
      }}
      lineStatus={lineStatus}
      lineReason={reason}
      lineConfigured={!!channelId && !!callbackUrl}
    />
  );
}
