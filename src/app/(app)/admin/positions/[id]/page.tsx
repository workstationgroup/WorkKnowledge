"use client";

import { useEffect, useState, use } from "react";
import { ArrowLeft, GripVertical, X, Plus, Search, BookOpen, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const POSITION_TEMPLATE_TOUR: PageTourStep[] = [
  {
    title: "Edit Position Template",
    description: "Here you define which lessons are required for this job position and in what order they should be completed.",
    placement: "center",
  },
  {
    target: "available-lessons",
    title: "Available Lessons",
    description: "All published lessons appear here. Search by name, then click a lesson to add it to this position's training path.",
    placement: "right",
  },
  {
    target: "training-path",
    title: "Training Path",
    description: "Lessons added to the path appear here in order. Drag to reorder. Click Save Template when done.",
    placement: "left",
  },
];

interface Lesson {
  id: string;
  title: string;
  readMinutes: number;
  category: { name: string; color: string };
}

interface PositionLesson {
  id: string;
  order: number;
  lesson: Lesson;
}

interface Position {
  id: string;
  name: string;
  description: string | null;
  color: string;
  lessons: PositionLesson[];
  _count: { users: number };
}

export default function PositionTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [position, setPosition] = useState<Position | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<Lesson[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/positions/${id}`).then((r) => r.json()).then((p: Position) => {
      setPosition(p);
      setSelected(p.lessons.map((pl) => pl.lesson));
    });
    fetch("/api/lessons").then((r) => r.json()).then(setAllLessons);
  }, [id]);

  const selectedIds = new Set(selected.map((l) => l.id));

  const filtered = allLessons.filter(
    (l) => l.title.toLowerCase().includes(search.toLowerCase()) && !selectedIds.has(l.id)
  );

  const addLesson = (lesson: Lesson) => setSelected((prev) => [...prev, lesson]);
  const removeLesson = (lessonId: string) => setSelected((prev) => prev.filter((l) => l.id !== lessonId));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/positions/${id}/lessons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonIds: selected.map((l) => l.id) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!position) return <div className="p-4 sm:p-8 text-gray-400">Loading...</div>;

  const totalMinutes = selected.reduce((sum, l) => sum + l.readMinutes, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/positions">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: position.color }} />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{position.name}</h1>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {position._count.users} employees · {selected.length} lessons · ~{totalMinutes} min total
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Available lessons */}
        <Card data-tour="available-lessons">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Available Lessons</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input
                placeholder="Search lessons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 max-h-[500px] overflow-y-auto space-y-2">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">
                {search ? "No results" : "All lessons already added"}
              </p>
            )}
            {filtered.map((lesson) => (
              <div key={lesson.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer group"
                onClick={() => addLesson(lesson)}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: lesson.category.color + "20" }}>
                  <BookOpen className="w-3.5 h-3.5" style={{ color: lesson.category.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                  <p className="text-xs text-gray-400">{lesson.category.name} · {lesson.readMinutes} min</p>
                </div>
                <Plus className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right: Selected lessons */}
        <Card data-tour="training-path">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Training Path</span>
              <Badge variant="secondary">{selected.length} lessons</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 max-h-[500px] overflow-y-auto space-y-2">
            {selected.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click lessons on the left to add them</p>
              </div>
            )}
            {selected.map((lesson, idx) => (
              <div key={lesson.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 group">
                <span className="text-xs font-bold text-gray-300 w-5 text-center flex-shrink-0">{idx + 1}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: lesson.category.color + "20" }}>
                  <BookOpen className="w-3.5 h-3.5" style={{ color: lesson.category.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                  <p className="text-xs text-gray-400">{lesson.category.name} · {lesson.readMinutes} min</p>
                </div>
                <button onClick={() => removeLesson(lesson.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {selected.length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span>Total training time</span>
                  <span className="font-medium">{totalMinutes} min</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <PageTour tourKey="wso_page_position_template_v1" steps={POSITION_TEMPLATE_TOUR} />
    </div>
  );
}
