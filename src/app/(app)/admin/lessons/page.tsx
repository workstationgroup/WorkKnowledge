import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Plus, Eye, Clock, BookOpen, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LessonsFilter, Pagination } from "@/components/lessons-filter";

const PAGE_SIZE = 15;

export default async function AdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>;
}) {
  const { q, category, status, page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const session = await auth();
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user || user.role !== "ADMIN") redirect("/");

  const statusFilter =
    status && ["PUBLISHED", "DRAFT", "CANCELLED"].includes(status)
      ? { status: status as "PUBLISHED" | "DRAFT" | "CANCELLED" }
      : {};

  const allLessons = await prisma.lesson.findMany({
    where: {
      ...statusFilter,
      ...(category ? { category: { slug: category } } : {}),
    },
    include: { category: true, permissions: { include: { group: true } } },
    orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
  });

  // Search filter
  const search = q?.trim() ?? "";
  const filtered = search
    ? allLessons.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          (l.summary ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : allLessons;

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const pageLessons = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });

  const drafts = allLessons.filter((l) => l.status === "DRAFT").length;
  const hasActiveFilter = !!search || !!category || !!status;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Lessons</h1>
          <p className="text-gray-500 mt-1">{allLessons.length} total · {drafts} draft{drafts !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/admin/lessons/new" className="flex-shrink-0">
          <Button><Plus className="w-4 h-4 mr-2" /> New Lesson</Button>
        </Link>
      </div>

      <div className="mb-6">
        <LessonsFilter categories={categories} isAdmin={true} total={total} />
      </div>

      {pageLessons.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{hasActiveFilter ? "No lessons match your search or filters." : "No lessons yet. Create your first one!"}</p>
            {hasActiveFilter && <p className="text-sm mt-1">Try adjusting your search or filters.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pageLessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardContent className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/lessons/${lesson.id}/edit`}
                      className="font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors"
                    >
                      {lesson.title}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      lesson.status === "PUBLISHED"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : lesson.status === "CANCELLED"
                        ? "bg-gray-50 text-gray-400 border-gray-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}>
                      {lesson.status === "PUBLISHED" ? "Published" : lesson.status === "CANCELLED" ? "Cancelled" : "Draft"}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ backgroundColor: lesson.category.color + "20", color: lesson.category.color }}
                    >
                      {lesson.category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.readMinutes} min</span>
                    {lesson.permissions.length > 0
                      ? <span>Groups: {lesson.permissions.map((p) => p.group.name).join(", ")}</span>
                      : <span>All employees</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/lessons/${lesson.slug}`}>
                    <Button variant="ghost" size="icon"><Eye className="w-4 h-4" /></Button>
                  </Link>
                  <Link href={`/admin/lessons/${lesson.id}/edit`}>
                    <Button variant="ghost" size="icon"><Pencil className="w-4 h-4" /></Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination page={safePage} totalPages={totalPages} />
    </div>
  );
}
