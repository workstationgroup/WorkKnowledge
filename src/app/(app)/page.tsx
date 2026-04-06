import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user) return null;

  const userGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } });
  const groupIdSet = new Set(userGroups.map((m) => m.groupId));

  const allPublished = await prisma.lesson.findMany({
    where: { status: "PUBLISHED" },
    include: { category: true, permissions: { select: { groupId: true } } },
  });

  const accessibleLessons = user.role === "ADMIN"
    ? allPublished
    : allPublished.filter((l) =>
        l.permissions.length === 0 || l.permissions.some((p) => groupIdSet.has(p.groupId))
      );

  const completedProgress = await prisma.lessonProgress.findMany({
    where: { userId: user.id, completedAt: { not: null } },
  });
  const completedIds = new Set(completedProgress.map((p) => p.lessonId));
  const completedCount = accessibleLessons.filter((l) => completedIds.has(l.id)).length;
  const pct = accessibleLessons.length ? Math.round((completedCount / accessibleLessons.length) * 100) : 0;

  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  const recentLessons = accessibleLessons.slice(0, 6);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back, {user.name.split(" ")[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Continue learning and growing with Work Station Office</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div><p className="text-2xl font-bold">{accessibleLessons.length}</p><p className="text-sm text-gray-500">Available Lessons</p></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div><p className="text-2xl font-bold">{completedCount}</p><p className="text-sm text-gray-500">Completed</p></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div><p className="text-2xl font-bold">{pct}%</p><p className="text-sm text-gray-500">Overall Progress</p></div>
          </div>
          <Progress value={pct} className="mt-3" />
        </CardContent></Card>
      </div>

      <div className="mb-6 md:mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const count = accessibleLessons.filter((l) => l.categoryId === cat.id).length;
            return (
              <Link key={cat.id} href={`/lessons?category=${cat.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-5 pb-4">
                    <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                      <BookOpen className="w-4 h-4" style={{ color: cat.color }} />
                    </div>
                    <p className="font-semibold text-sm text-gray-900">{cat.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{count} lessons</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Lessons</h2>
        <div className="space-y-3">
          {recentLessons.length === 0 && <p className="text-gray-500 text-sm">No lessons available yet.</p>}
          {recentLessons.map((lesson) => {
            const done = completedIds.has(lesson.id);
            return (
              <Link key={lesson.id} href={`/lessons/${lesson.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-100" : "bg-gray-100"}`}>
                      {done ? <CheckCircle className="w-4 h-4 text-green-600" /> : <BookOpen className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{lesson.title}</p>
                      <p className="text-xs text-gray-400">{lesson.category.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Clock className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-400">{lesson.readMinutes} min</span>
                      {done && <Badge variant="secondary" className="text-xs">Done</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
