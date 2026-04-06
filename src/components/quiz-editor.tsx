"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Plus, Trash2, CheckCircle2, Image as ImageIcon, Film, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploader, UploadedFile } from "@/components/file-uploader";
import { parseYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MediaType = "IMAGE" | "VIDEO" | "YOUTUBE";

interface Choice {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  allowMultiple: boolean;
  mediaUrl?: string;
  mediaType?: MediaType;
  choices: Choice[];
}

const newChoice = (): Choice => ({ text: "", isCorrect: false });

const newQuestion = (): Question => ({
  text: "",
  allowMultiple: false,
  choices: [newChoice(), newChoice(), newChoice(), newChoice()],
});

interface QuizEditorProps {
  lessonId: string;
}

export interface QuizEditorHandle {
  save: () => Promise<boolean>;
}

// ── Media picker for a question ──────────────────────────────────────────────
function QuestionMedia({
  mediaUrl,
  mediaType,
  onChange,
  lessonFolder,
}: {
  mediaUrl?: string;
  mediaType?: MediaType;
  onChange: (url: string | undefined, type: MediaType | undefined) => void;
  lessonFolder: string;
}) {
  const [ytInput, setYtInput] = useState("");
  const [mode, setMode] = useState<MediaType | null>(null);

  if (mediaUrl && mediaType) {
    const remove = () => onChange(undefined, undefined);
    if (mediaType === "IMAGE") {
      return (
        <div className="relative w-full">
          <img src={mediaUrl} alt="Question media" className="rounded-lg max-h-48 border border-gray-200" />
          <button type="button" onClick={remove} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-400 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    if (mediaType === "VIDEO") {
      return (
        <div className="relative w-full">
          <video src={mediaUrl} controls className="rounded-lg max-h-48 border border-gray-200 w-full" />
          <button type="button" onClick={remove} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-400 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    if (mediaType === "YOUTUBE") {
      const id = parseYouTubeId(mediaUrl);
      return (
        <div className="relative w-full">
          {id && (
            <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 bg-black">
              <iframe src={youTubeEmbedUrl(id)} className="w-full h-full" allowFullScreen />
            </div>
          )}
          <button type="button" onClick={remove} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-400 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
  }

  if (!mode) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Add media (optional):</span>
        <button type="button" onClick={() => setMode("IMAGE")} className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
          <ImageIcon className="w-3 h-3" /> Image
        </button>
        <button type="button" onClick={() => setMode("VIDEO")} className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
          <Film className="w-3 h-3" /> Video
        </button>
        <button type="button" onClick={() => setMode("YOUTUBE")} className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors">
          <PlayCircle className="w-3 h-3 text-red-400" /> YouTube
        </button>
      </div>
    );
  }

  if (mode === "YOUTUBE") {
    const embed = () => {
      const id = parseYouTubeId(ytInput);
      if (!id) { toast.error("Invalid YouTube URL"); return; }
      onChange(ytInput.trim(), "YOUTUBE");
      setMode(null);
    };
    return (
      <div className="flex gap-2">
        <Input placeholder="YouTube URL" value={ytInput} onChange={(e) => setYtInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && embed()} className="flex-1 text-sm" autoFocus />
        <Button type="button" size="sm" onClick={embed}>Embed</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)}>Cancel</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <FileUploader
        lessonFolder={lessonFolder}
        onUploaded={(f: UploadedFile) => { onChange(f.url, mode!); setMode(null); }}
        label={`Upload ${mode === "IMAGE" ? "Image" : "Video"}`}
      />
      <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)}>Cancel</Button>
    </div>
  );
}

// ── Single question editor ────────────────────────────────────────────────────
function QuestionEditor({
  q,
  qi,
  onChange,
  onDelete,
  lessonId,
}: {
  q: Question;
  qi: number;
  onChange: (q: Question) => void;
  onDelete: () => void;
  lessonId: string;
}) {
  const setChoice = (ci: number, text: string) =>
    onChange({ ...q, choices: q.choices.map((c, i) => (i === ci ? { ...c, text } : c)) });

  const toggleCorrect = (ci: number) => {
    if (q.allowMultiple) {
      // toggle individual choice
      onChange({ ...q, choices: q.choices.map((c, i) => (i === ci ? { ...c, isCorrect: !c.isCorrect } : c)) });
    } else {
      // single-select: only one correct at a time
      onChange({ ...q, choices: q.choices.map((c, i) => ({ ...c, isCorrect: i === ci })) });
    }
  };

  const addChoice = () => {
    if (q.choices.length >= 8) { toast.error("Max 8 choices per question"); return; }
    onChange({ ...q, choices: [...q.choices, newChoice()] });
  };

  const removeChoice = (ci: number) => {
    if (q.choices.length <= 2) { toast.error("Need at least 2 choices"); return; }
    onChange({ ...q, choices: q.choices.filter((_, i) => i !== ci) });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-1">
          {qi + 1}
        </span>
        <div className="flex-1 space-y-2">
          <Input placeholder="Question text" value={q.text} onChange={(e) => onChange({ ...q, text: e.target.value })} />
          <QuestionMedia
            mediaUrl={q.mediaUrl}
            mediaType={q.mediaType}
            onChange={(url, type) => onChange({ ...q, mediaUrl: url, mediaType: type })}
            lessonFolder={`lesson-${lessonId}`}
          />
        </div>
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-400 shrink-0 mt-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="pl-9 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400">
            {q.allowMultiple ? "Multiple correct answers — tick all that apply" : "Single correct answer — select one"}
          </p>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={q.allowMultiple}
              onChange={(e) => onChange({ ...q, allowMultiple: e.target.checked, choices: q.choices.map((c) => ({ ...c, isCorrect: false })) })}
              className="rounded border-gray-300 text-indigo-500 focus:ring-indigo-400" />
            <span className="text-xs text-gray-600">Multiple correct</span>
          </label>
        </div>

        {q.choices.map((c, ci) => (
          <div key={ci} className="flex items-center gap-2">
            <button type="button" onClick={() => toggleCorrect(ci)}
              className={cn(
                "shrink-0 flex items-center justify-center transition-colors",
                q.allowMultiple
                  ? cn("w-5 h-5 rounded border-2", c.isCorrect ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400")
                  : cn("w-5 h-5 rounded-full border-2", c.isCorrect ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400")
              )}
              title="Mark as correct"
            >
              {c.isCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
            </button>
            <Input
              placeholder={`Choice ${ci + 1}`}
              value={c.text}
              onChange={(e) => setChoice(ci, e.target.value)}
              className={cn("flex-1 text-sm", c.isCorrect && "border-green-300 bg-green-50")}
            />
            {q.choices.length > 2 && (
              <button type="button" onClick={() => removeChoice(ci)} className="text-gray-200 hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}

        {q.choices.length < 8 && (
          <button type="button" onClick={addChoice} className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 mt-1">
            <Plus className="w-3 h-3" /> Add choice
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main QuizEditor ───────────────────────────────────────────────────────────
export const QuizEditor = forwardRef<QuizEditorHandle, QuizEditorProps>(function QuizEditor({ lessonId }, ref) {
  const [passScore, setPassScore] = useState(80);
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useImperativeHandle(ref, () => ({ save }));

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.questions?.length) {
          setHasQuiz(true);
          setPassScore(data.passScore);
          setQuestions(data.questions.map((q: Question & { choices: Choice[] }) => {
            // Pad saved choices back to 5 so the editor always shows 5 rows
            const choices = [...q.choices];
            while (choices.length < 4) choices.push(newChoice());
            return {
              text: q.text,
              allowMultiple: q.allowMultiple ?? false,
              mediaUrl: q.mediaUrl,
              mediaType: q.mediaType,
              choices,
            };
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lessonId]);

  const updateQ = (i: number, q: Question) => setQuestions((prev) => prev.map((x, idx) => (idx === i ? q : x)));

  const save = async (): Promise<boolean> => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) { toast.error(`Question ${i + 1}: question text required`); return false; }
      const filled = q.choices.filter((c) => c.text.trim());
      if (filled.length < 2) { toast.error(`Question ${i + 1}: at least 2 choices required`); return false; }
      if (!q.choices.some((c) => c.isCorrect && c.text.trim())) { toast.error(`Question ${i + 1}: mark at least one correct answer`); return false; }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/quiz`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passScore,
          questions: questions.map((q) => ({
            text: q.text,
            allowMultiple: q.allowMultiple,
            mediaUrl: q.mediaUrl ?? null,
            mediaType: q.mediaType ?? null,
            choices: q.choices.filter((c) => c.text.trim()),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        throw new Error(data.error ?? "Failed");
      }
      setHasQuiz(true);
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save quiz");
      return false;
    } finally { setSaving(false); }
  };

  const deleteQuiz = async () => {
    if (!confirm("Delete quiz and all attempt history?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/lessons/${lessonId}/quiz`, { method: "DELETE" });
      setHasQuiz(false);
      setQuestions([newQuestion()]);
      setPassScore(80);
      toast.success("Quiz deleted");
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  };

  if (loading) return <p className="text-sm text-gray-400 py-2">Loading...</p>;

  return (
    <div className="space-y-6">
      {/* Pass score */}
      <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex-1">
          <Label className="text-amber-800">Pass Score (%)</Label>
          <p className="text-xs text-amber-600 mt-0.5">Minimum percentage correct to pass this lesson</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" min={0} max={100} value={passScore}
            onChange={(e) => setPassScore(Math.min(100, Math.max(0, Number(e.target.value))))}
            className="w-20 text-center font-bold text-amber-700 border-amber-300 bg-white" />
          <span className="text-amber-700 font-medium">%</span>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <QuestionEditor key={qi} q={q} qi={qi} lessonId={lessonId}
            onChange={(updated) => updateQ(qi, updated)}
            onDelete={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))} />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((p) => [...p, newQuestion()])}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Question
        </Button>
        {hasQuiz && (
          <Button type="button" variant="outline" size="sm" onClick={deleteQuiz} disabled={deleting}
            className="text-red-500 hover:text-red-600 hover:border-red-300">
            {deleting ? "Deleting..." : "Delete Quiz"}
          </Button>
        )}
      </div>
    </div>
  );
});
