import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CheckCircle, Clock, BookOpen, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default async function MyPathPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    include: {
      position: {
        include: {
          lessons: { include: { lesson: { include: { category: true } } }, orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!user) return null;

  if (!user.position) {
    return (
      <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Training Path</h1>
        <Card>
          <CardContent className="py-16 text-center">
            <Lock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No position assigned yet</p>
            <p className="text-sm text-gray-400 mt-1">Ask your admin to assign your position to see your training path.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = await prisma.lessonProgress.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    select: { lessonId: true },
  });
  const completedIds = new Set(progress.map((p) => p.lessonId));
  const lessons = user.position.lessons.map((pl) => pl.lesson);
  const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;
  const totalMinutes = lessons.reduce((s, l) => s + l.readMinutes, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">My Training Path</h1>

      <Card className="mb-6">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-900 text-lg">{user.position.name}</p>
              {user.position.description && <p className="text-sm text-gray-400">{user.position.description}</p>}
            </div>
            <Badge variant={pct === 100 ? "default" : "secondary"}>
              {pct === 100 ? "Completed" : `${pct}% done`}
            </Badge>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <span>{completedCount}/{lessons.length} lessons</span>
            <span>·</span>
            <span>~{totalMinutes} min total</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {lessons.map((lesson, idx) => {
          const done = completedIds.has(lesson.id);
          return (
            <Link key={lesson.id} href={`/lessons/${lesson.slug}`}>
              <Card className={`hover:shadow-md transition-shadow cursor-pointer ${done ? "border-green-200" : ""}`}>
                <CardContent className="py-4 flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${done ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {done ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>{lesson.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block" style={{ backgroundColor: lesson.category.color + "20", color: lesson.category.color }}>
                      {lesson.category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock className="w-3 h-3" /><span>{lesson.readMinutes} min</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
