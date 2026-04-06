import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Clock, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { LessonActions } from "@/components/lesson-actions";
import { LessonTopicsViewer } from "@/components/lesson-topics-viewer";
import { LessonEndSection } from "@/components/lesson-end-section";
import { LessonTimeTracker } from "@/components/lesson-time-tracker";

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

  if (user.role !== "ADMIN" && lesson.status !== "PUBLISHED") notFound();

  if (user.role !== "ADMIN" && lesson.permissions.length > 0) {
    const userGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } });
    const groupIds = new Set(userGroups.map((m) => m.groupId));
    if (!lesson.permissions.some((p) => groupIds.has(p.groupId))) notFound();
  }

  const [progress, topics, attachments] = await Promise.all([
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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      {/* Top anchor for re-learn scroll */}
      <div id="lesson-top" />

      <Link href="/lessons" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Lessons
      </Link>

      <div className="mb-6">
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

      <LessonTopicsViewer
        topics={topicsWithProgress}
        attachments={attachments}
        userId={user.id}
      />

      <Separator className="my-8" />

      {/* Quiz + lesson completion — client component handles score-gating */}
      <LessonEndSection
        lessonId={lesson.id}
        hasQuiz={hasQuiz}
        alreadyCompleted={!!progress?.completedAt}
      />
    </div>
  );
}
