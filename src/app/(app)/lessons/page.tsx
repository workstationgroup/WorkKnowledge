import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BookOpen, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LessonsFilter, Pagination } from "@/components/lessons-filter";
import { WatchLaterButton } from "@/components/watch-later-button";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const LESSONS_TOUR: PageTourStep[] = [
  {
    title: "All Lessons",
    description: "Browse the full library of training materials. Search by name, filter by category or status, and click any lesson to open it.",
    placement: "center",
  },
  {
    target: "lessons-filter",
    title: "Search & Filter",
    description: "Type a lesson title to search, or use the category and status filters to narrow down the list.",
    placement: "bottom",
  },
  {
    target: "lesson-results",
    title: "Lesson Cards",
    description: "Each card shows the lesson title, category, estimated read time, and your completion status. Click to open.",
    placement: "top",
  },
];

const PAGE_SIZE = 15;

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; status?: string; page?: string }>;
}) {
  const { category, q, status, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user) return null;

  const isAdmin = user.role === "ADMIN";

  const userGroups = await prisma.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  });
  const groupIdSet = new Set(userGroups.map((m) => m.groupId));

  // Build status filter
  type LessonStatus = "PUBLISHED" | "DRAFT" | "CANCELLED";
  const statusFilter: { status?: LessonStatus } =
    !isAdmin ? { status: "PUBLISHED" }
    : status && (["PUBLISHED", "DRAFT", "CANCELLED"] as string[]).includes(status)
    ? { status: status as LessonStatus }
    : {};

  // Fetch all lessons matching hard filters (category + status)
  const allLessons = await prisma.lesson.findMany({
    where: {
      ...statusFilter,
      ...(category ? { category: { slug: category } } : {}),
    },
    include: { category: true, permissions: { select: { groupId: true } } },
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
  });

  // Group permission filter (JS side — required because it's a many-to-many join)
  const permitted = isAdmin
    ? allLessons
    : allLessons.filter(
        (l) => l.permissions.length === 0 || l.permissions.some((p) => groupIdSet.has(p.groupId))
      );

  // Search filter (title + summary)
  const search = q?.trim() ?? "";
  const filtered = search
    ? permitted.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          (l.summary ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : permitted;

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const pageLessons = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const lessonIds = pageLessons.map((l) => l.id);

  // Completed set + Watch Later set for current page
  const [progress, watchLaterRaw] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: user.id, lessonId: { in: lessonIds }, completedAt: { not: null } },
      select: { lessonId: true },
    }),
    prisma.watchLater.findMany({
      where: { userId: user.id, lessonId: { in: lessonIds } },
      select: { lessonId: true },
    }),
  ]);
  const completedIds = new Set(progress.map((p) => p.lessonId));
  const watchLaterIds = new Set(watchLaterRaw.map((w) => w.lessonId));

  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });

  const hasActiveFilter = !!search || !!category || !!status;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Lessons</h1>
        <p className="text-gray-500 mt-1">Browse and search all available training materials</p>
      </div>

      <div data-tour="lessons-filter" className="mb-6">
        <LessonsFilter categories={categories} isAdmin={isAdmin} total={total} />
      </div>

      {/* Results */}
      {pageLessons.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-medium">No lessons found</p>
            {hasActiveFilter && (
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div data-tour="lesson-results" className="space-y-2">
          {pageLessons.map((lesson) => {
            const done = completedIds.has(lesson.id);
            const saved = watchLaterIds.has(lesson.id);
            return (
              <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center gap-3">
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

                  {/* Title + summary — clickable */}
                  <Link href={`/lessons/${lesson.slug}`} className="flex-1 min-w-0 group">
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

                  {/* Badges + time + bookmark */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lesson.status === "DRAFT" && (
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-200">Draft</Badge>
                    )}
                    {lesson.status === "CANCELLED" && (
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">Cancelled</Badge>
                    )}
                    {done && (
                      <Badge variant="secondary" className="text-xs hidden sm:inline-flex">Done</Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />{lesson.readMinutes} min
                    </div>
                    <WatchLaterButton lessonId={lesson.id} saved={saved} size="sm" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={safePage} totalPages={totalPages} />
      <PageTour tourKey="wso_page_lessons_v1" steps={LESSONS_TOUR} />
    </div>
  );
}
