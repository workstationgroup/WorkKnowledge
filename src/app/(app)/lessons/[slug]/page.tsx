import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Clock, ArrowLeft, Pencil, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { LessonActions } from "@/components/lesson-actions";
import { LessonTopicsViewer } from "@/components/lesson-topics-viewer";
import { LessonEndSection } from "@/components/lesson-end-section";
import { LessonTimeTracker } from "@/components/lesson-time-tracker";
import { LessonForum } from "@/components/lesson-forum";
import { WatchLaterButton } from "@/components/watch-later-button";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const LESSON_TOUR: PageTourStep[] = [
  {
    target: "lesson-header",
    title: "Lesson Details",
    description: "The header shows the lesson title, category, estimated read time, and how long you've spent on this lesson so far.",
    placement: "bottom",
  },
  {
    target: "lesson-topics",
    title: "Topics & Content",
    description: "Lessons are divided into topics. Work through each topic and mark it done as you go — your progress is saved automatically.",
    placement: "top",
  },
  {
    target: "lesson-complete",
    title: "Finish & Move On",
    description: "Once you've read all topics, mark the lesson complete here. If there's a quiz, you'll need to pass it first.",
    placement: "top",
  },
];

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user) return null;

  const lesson = await prisma.lesson.findUnique({
    where: { slug },
    include: {
      category: true,
      permissions: { include: { group: true } },
      quiz: { select: { id: true } },
    },
  });
  if (!lesson) notFound();

  if (user.role !== "ADMIN") {
    const userGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } });
    const groupIds = new Set(userGroups.map((m) => m.groupId));
    const isManagerForThisLesson = user.canManageLessons && lesson.permissions.some((p) => groupIds.has(p.groupId));

    // Non-managers can't see drafts / cancelled lessons
    if (!isManagerForThisLesson && lesson.status !== "PUBLISHED") notFound();

    // Group-restricted lesson: regular employees must be in a permitted group
    if (!isManagerForThisLesson && lesson.permissions.length > 0 && !lesson.permissions.some((p) => groupIds.has(p.groupId))) {
      notFound();
    }
  }

  const watchLaterEntry = await prisma.watchLater.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
  });
  const isWatchLater = !!watchLaterEntry;

  const [progress, topics, attachments, relatedRaw] = await Promise.all([
    prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    }),
    prisma.lessonTopic.findMany({
      where: { lessonId: lesson.id },
      include: { blocks: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    }),
    prisma.lessonAttachment.findMany({
      where: { lessonId: lesson.id },
      orderBy: { order: "asc" },
    }),
    // Related lessons (both directions)
    Promise.all([
      prisma.lessonRelation.findMany({
        where: { lessonId: lesson.id },
        include: { relatedLesson: { include: { category: true } } },
      }),
      prisma.lessonRelation.findMany({
        where: { relatedLessonId: lesson.id },
        include: { lesson: { include: { category: true } } },
      }),
    ]),
  ]);

  const topicProgressList = await prisma.lessonTopicProgress.findMany({
    where: { userId: user.id, topicId: { in: topics.map((t) => t.id) } },
  });
  const topicProgressMap = Object.fromEntries(topicProgressList.map((p) => [p.topicId, p.completedAt?.toISOString() ?? null]));

  const topicsWithProgress = topics.map((t) => ({
    ...t,
    completedAt: topicProgressMap[t.id] ?? null,
  }));

  const hasQuiz = !!lesson.quiz;

  // Merge related lessons from both directions, filter to published (or all for admin)
  const [relatedFrom, relatedTo] = relatedRaw;
  const relatedMap = new Map<string, { id: string; title: string; slug: string; readMinutes: number; category: { name: string; color: string } }>();
  for (const r of relatedFrom) {
    const l = r.relatedLesson;
    if (user.role === "ADMIN" || l.status === "PUBLISHED") relatedMap.set(l.id, l);
  }
  for (const r of relatedTo) {
    const l = r.lesson;
    if (user.role === "ADMIN" || l.status === "PUBLISHED") relatedMap.set(l.id, l);
  }
  const relatedLessons = [...relatedMap.values()];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      {/* Top anchor for re-learn scroll */}
      <div id="lesson-top" />

      <div className="flex items-center justify-between mb-6">
        <Link href="/lessons" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Lessons
        </Link>
        <div className="flex items-center gap-2">
          <WatchLaterButton lessonId={lesson.id} saved={isWatchLater} />
          {(user.role === "ADMIN" || user.canManageLessons) && (
            <Link
              href={`/admin/lessons/${lesson.id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit Lesson
            </Link>
          )}
        </div>
      </div>

      <div data-tour="lesson-header" className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" style={{ borderColor: lesson.category.color, color: lesson.category.color }}>
            {lesson.category.name}
          </Badge>
          {lesson.status === "DRAFT" && <Badge variant="outline" className="text-amber-500 border-amber-200">Draft</Badge>}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{lesson.title}</h1>
        {lesson.summary && <p className="text-gray-500 mt-2 text-lg">{lesson.summary}</p>}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /><span>{lesson.readMinutes} min read</span>
          </div>
          {lesson.permissions.length > 0 && (
            <span>For: {lesson.permissions.map((p) => p.group.name).join(", ")}</span>
          )}
          <LessonTimeTracker
            lessonId={lesson.id}
            initialSeconds={progress?.timeSpentSeconds ?? 0}
          />
        </div>
      </div>

      <Separator className="mb-6" />

      {lesson.content && (
        <div
          className="prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-indigo-600"
          dangerouslySetInnerHTML={{ __html: lesson.content }}
        />
      )}

      <div data-tour="lesson-topics">
        <LessonTopicsViewer
          topics={topicsWithProgress}
          attachments={attachments}
          userId={user.id}
        />
      </div>

      <Separator className="my-8" />

      {/* Quiz + lesson completion — client component handles score-gating */}
      <div data-tour="lesson-complete">
        <LessonEndSection
          lessonId={lesson.id}
          hasQuiz={hasQuiz}
          alreadyCompleted={!!progress?.completedAt}
        />
      </div>
      {relatedLessons.length > 0 && (
        <>
          <Separator className="my-8" />
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Related Lessons</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedLessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/lessons/${l.slug}`}
                  className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: l.category.color + "20" }}>
                    <BookOpen className="w-4 h-4" style={{ color: l.category.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{l.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium" style={{ color: l.category.color }}>{l.category.name}</span>
                      <span className="text-xs text-gray-400">{l.readMinutes} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator className="my-8" />

      <LessonForum
        lessonId={lesson.id}
        currentUserId={user.id}
        isAdmin={user.role === "ADMIN"}
      />

      <PageTour tourKey="wso_page_lesson_v1" steps={LESSON_TOUR} />
    </div>
  );
}
