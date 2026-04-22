import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, CheckCircle, Clock, Bookmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { WatchLaterButton } from "@/components/watch-later-button";
import { Pagination } from "@/components/lessons-filter";

const PAGE_SIZE = 15;

export default async function WatchLaterPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user) return null;

  const total = await prisma.watchLater.count({ where: { userId: user.id } });
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);

  const items = await prisma.watchLater.findMany({
    where: { userId: user.id },
    include: {
      lesson: {
        include: {
          category: true,
          permissions: { select: { groupId: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const completedIds = items.length
    ? new Set(
        (
          await prisma.lessonProgress.findMany({
            where: {
              userId: user.id,
              lessonId: { in: items.map((i) => i.lessonId) },
              completedAt: { not: null },
            },
            select: { lessonId: true },
          })
        ).map((p) => p.lessonId)
      )
    : new Set<string>();

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-indigo-500" />
          Watch Later
        </h1>
        <p className="text-gray-500 mt-1">
          {total === 0
            ? "Lessons you bookmark will appear here"
            : `${total} saved lesson${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Bookmark className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium">No saved lessons yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Click the bookmark icon on any lesson to save it here
            </p>
            <Link
              href="/lessons"
              className="inline-block mt-4 text-sm text-indigo-600 hover:underline"
            >
              Browse lessons →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-2">
          {items.map(({ lesson, id: wlId }) => {
            const done = completedIds.has(lesson.id);
            return (
              <Card key={wlId} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center gap-4">
                  {/* Status icon */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      done ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    {done
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <BookOpen className="w-4 h-4 text-gray-400" />
                    }
                  </div>

                  {/* Title + meta — clickable */}
                  <Link
                    href={`/lessons/${lesson.slug}`}
                    className="flex-1 min-w-0 group"
                  >
                    <p className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: lesson.category.color + "20",
                          color: lesson.category.color,
                        }}
                      >
                        {lesson.category.name}
                      </span>
                      {lesson.summary && (
                        <span
                          className="text-xs text-gray-400 truncate hidden sm:block [&_*]:inline [&_p]:m-0"
                          dangerouslySetInnerHTML={{ __html: lesson.summary }}
                        />
                      )}
                    </div>
                  </Link>

                  {/* Right side */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {done && (
                      <span className="text-xs text-green-600 font-medium hidden sm:block">Done</span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.readMinutes} min</span>
                    </div>
                    <WatchLaterButton lessonId={lesson.id} saved={true} size="sm" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Pagination page={safePage} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
