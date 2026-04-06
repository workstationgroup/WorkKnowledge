import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/sign-in");

  return (
    <div className="flex h-full min-h-screen">
      <AppSidebar isAdmin={user.role === "ADMIN"} userName={user.name} userEmail={user.email} />
      {/* pt-14 offsets the fixed mobile header; removed on md+ where the sidebar is visible */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
