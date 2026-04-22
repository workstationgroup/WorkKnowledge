"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RichEditor } from "@/components/rich-editor";
import { TopicEditor } from "@/components/topic-editor";
import { AttachmentsEditor, AttachmentsEditorHandle } from "@/components/attachments-editor";
import { LessonChangelog } from "@/components/lesson-changelog";
import { LessonVersionHistory } from "@/components/lesson-version-history";
import { QuizEditor, QuizEditorHandle } from "@/components/quiz-editor";
import { RelatedLessonsEditor, RelatedLessonsEditorHandle } from "@/components/related-lessons-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PageTour, type PageTourStep } from "@/components/page-tour";

const NEW_LESSON_TOUR: PageTourStep[] = [
  {
    title: "Creating a Lesson",
    description: "Fill in the lesson details here. Start with a title and category, then save — you can add topics, attachments, and a quiz afterwards.",
    placement: "center",
  },
  {
    target: "lesson-main-fields",
    title: "Lesson Content",
    description: "Enter the lesson title, a short summary, and an introduction or overview. The title auto-generates the URL slug.",
    placement: "right",
  },
  {
    target: "lesson-side-fields",
    title: "Lesson Settings",
    description: "Set the category, status (Draft → Published when ready), estimated read time, and which groups can access this lesson.",
    placement: "left",
  },
];

const EDIT_LESSON_TOUR: PageTourStep[] = [
  {
    title: "Editing a Lesson",
    description: "Update the lesson details, then scroll down to manage topics, attachments, quiz, and version history.",
    placement: "center",
  },
  {
    target: "lesson-main-fields",
    title: "Lesson Content",
    description: "Update the title, summary, and introduction text here. Changes are saved when you click the Save button.",
    placement: "bottom",
  },
  {
    target: "lesson-topics-section",
    title: "Topics",
    description: "Break the lesson into multiple topics. Each topic can contain rich text, images, videos, PDFs, and Office files.",
    placement: "bottom",
  },
  {
    target: "lesson-quiz-section",
    title: "Quiz",
    description: "Add a quiz with multiple-choice questions. Employees must pass the quiz to mark the lesson complete.",
    placement: "bottom",
  },
];

interface Category { id: string; name: string; color: string }
interface Group { id: string; name: string; color: string }
interface LessonOption { id: string; title: string; status: string; category: { name: string; color: string } }

interface LessonFormProps {
  categories: Category[];
  groups: Group[];
  allLessons?: LessonOption[];
  requireGroup?: boolean; // managers must assign at least one group
  initial?: {
    id: string;
    title: string;
    slug: string;
    content: string;
    summary: string;
    categoryId: string;
    status: string;
    readMinutes: number;
    groupIds: string[];
  };
}

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export function LessonForm({ categories, groups, allLessons = [], requireGroup = false, initial }: LessonFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [readMinutes, setReadMinutes] = useState(initial?.readMinutes ?? 5);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set(initial?.groupIds ?? []));
  const [saving, setSaving] = useState(false);

  const attachmentsRef = useRef<AttachmentsEditorHandle>(null);
  const quizRef = useRef<QuizEditorHandle>(null);
  const relatedRef = useRef<RelatedLessonsEditorHandle>(null);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initial) setSlug(toSlug(val));
  };

  const toggleGroup = (id: string) =>
    setSelectedGroups((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async (): Promise<{ ok: boolean; slug?: string }> => {
    if (!title.trim() || !categoryId) { toast.error("Title and category are required"); return { ok: false }; }
    if (requireGroup && selectedGroups.size === 0) { toast.error("You must assign at least one group"); return { ok: false }; }
    setSaving(true);
    try {
      const method = initial ? "PUT" : "POST";
      const url = initial ? `/api/lessons/${initial.id}` : "/api/lessons";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, content, summary, categoryId, status, readMinutes, groupIds: [...selectedGroups] }),
      });
      const text = await res.text();
      let data: { id?: string; slug?: string; error?: string } = {};
      try { if (text) data = JSON.parse(text); } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);

      if (initial) {
        await Promise.all([
          attachmentsRef.current?.save(),
          quizRef.current?.save(),
          relatedRef.current?.save(),
        ]);
      }

      toast.success(initial ? "Lesson saved" : "Lesson created");
      if (!initial) {
        router.push(`/admin/lessons/${data.id}/edit`);
      }
      return { ok: true, slug: data.slug ?? slug };
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      return { ok: false };
    } finally {
      setSaving(false);
    }
  };

  const saveAndPreview = async () => {
    const res = await save();
    if (res.ok && res.slug) window.open(`/lessons/${res.slug}`, "_blank", "noopener,noreferrer");
  };

  // Ctrl/Cmd+S → save, blocking the browser's Save Page dialog.
  // Listen in the capture phase on document so we beat Tiptap / any editor child
  // that might call stopPropagation. Checking e.code covers non-US keyboard layouts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isS = e.key === "s" || e.key === "S" || e.code === "KeyS";
      if ((e.ctrlKey || e.metaKey) && isS && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!saving) save();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, title, slug, content, summary, categoryId, status, readMinutes, selectedGroups]);

  return (
    <div className="pb-8 max-w-4xl mx-auto">
      {/* Sticky header — top-14 on mobile to sit below the fixed nav bar */}
      <div className="sticky top-14 md:top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-8 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{initial ? "Edit Lesson" : "New Lesson"}</h1>
        <div className="flex items-center gap-2">
          {initial && slug && (
            <>
              <a
                href={`/lessons/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" /> Preview
              </a>
              <Button onClick={saveAndPreview} disabled={saving} variant="outline" className="gap-2">
                <Save className="w-4 h-4" /> Save & Preview
              </Button>
            </>
          )}
          <Button onClick={save} disabled={saving} className="gap-2" title="Save (Ctrl+S / ⌘S)">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-8 pt-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div data-tour="lesson-main-fields" className="col-span-2 space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input placeholder="Lesson title" value={title} onChange={(e) => handleTitleChange(e.target.value)} className="text-lg" />
          </div>
          <div className="space-y-1.5">
            <Label>Summary (optional)</Label>
            <RichEditor
              value={summary}
              onChange={setSummary}
              placeholder="Brief description shown in lesson list"
              lessonId={initial?.id}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Introduction / Overview</Label>
            <RichEditor value={content} onChange={setContent} placeholder="Write the lesson overview here..." lessonId={initial?.id} />
          </div>
        </div>

        {/* Sidebar */}
        <div data-tour="lesson-side-fields" className="space-y-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="" disabled>Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Read time (minutes)</Label>
                <Input type="number" min={1} value={readMinutes} onChange={(e) => setReadMinutes(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>URL Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="lesson-url-slug" className="font-mono text-sm" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <Label className="mb-2 block">Access Groups</Label>
              <p className="text-xs text-gray-400 mb-3">
                {requireGroup
                  ? "Assign at least one group — you can only pick groups you belong to."
                  : "Leave empty = visible to all employees"}
              </p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const active = selectedGroups.has(g.id);
                  return (
                    <button key={g.id} onClick={() => toggleGroup(g.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all ${active ? "border-transparent text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                      style={active ? { backgroundColor: g.color } : {}}
                    >
                      {g.name}
                    </button>
                  );
                })}
                {groups.length === 0 && <p className="text-xs text-gray-400">No groups yet</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Topics & Attachments — only available after lesson is saved */}
      {initial && (
        <>
          <Separator className="my-8" />
          <div className="space-y-8">
            <div>
              <h2 data-tour="lesson-topics-section" className="text-lg font-semibold text-gray-900 mb-1">Topics</h2>
              <p className="text-sm text-gray-500 mb-4">Break the lesson into topics. Each topic can contain text, images, videos, PDFs, PPT, or Excel files.</p>
              <TopicEditor lessonId={initial.id} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Attachments</h2>
              <p className="text-sm text-gray-500 mb-4">Training materials employees can download (stored in SharePoint).</p>
              <AttachmentsEditor ref={attachmentsRef} lessonId={initial.id} />
            </div>

            <div>
              <h2 data-tour="lesson-quiz-section" className="text-lg font-semibold text-gray-900 mb-1">Quiz</h2>
              <p className="text-sm text-gray-500 mb-4">Set a quiz employees must pass at the end of this lesson. Each question has 5 choices.</p>
              <QuizEditor ref={quizRef} lessonId={initial.id} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Related Lessons</h2>
              <p className="text-sm text-gray-500 mb-4">Suggest other lessons employees should take alongside or after this one.</p>
              <RelatedLessonsEditor ref={relatedRef} lessonId={initial.id} allLessons={allLessons} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Version History</h2>
              <p className="text-sm text-gray-500 mb-4">A snapshot is saved automatically each time the lesson is updated. Click Restore to roll back to any previous version.</p>
              <LessonVersionHistory lessonId={initial.id} onRestored={() => window.location.reload()} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Change History</h2>
              <p className="text-sm text-gray-500 mb-4">All edits to this lesson, topics, and attachments.</p>
              <LessonChangelog lessonId={initial.id} />
            </div>
          </div>
        </>
      )}

      {!initial && (
        <p className="mt-6 text-sm text-gray-400 text-center">Save to continue — topics, attachments, quiz, and related lessons are available after the first save.</p>
      )}
      </div>
      <PageTour
        tourKey={initial ? "wso_page_lesson_edit_v1" : "wso_page_lesson_new_v1"}
        steps={initial ? EDIT_LESSON_TOUR : NEW_LESSON_TOUR}
      />
    </div>
  );
}
