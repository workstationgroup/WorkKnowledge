"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trophy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";

type MediaType = "IMAGE" | "VIDEO" | "YOUTUBE";

interface Choice {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  allowMultiple: boolean;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  choices: Choice[];
}

interface Quiz {
  passScore: number;
  questions: Question[];
}

interface AttemptResult {
  score: number;
  passed: boolean;
  passScore: number;
  total: number;
  correct: number;
  result: Record<string, { correct: boolean; correctChoiceIds: string[] }>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuestionMedia({ mediaUrl, mediaType }: { mediaUrl?: string | null; mediaType?: MediaType | null }) {
  if (!mediaUrl || !mediaType) return null;

  if (mediaType === "IMAGE") {
    return <img src={mediaUrl} alt="Question media" className="rounded-lg max-h-64 border border-gray-200 mb-3" />;
  }
  if (mediaType === "VIDEO") {
    return <video src={mediaUrl} controls className="rounded-lg max-h-64 w-full border border-gray-200 mb-3" />;
  }
  if (mediaType === "YOUTUBE") {
    const id = parseYouTubeId(mediaUrl);
    if (!id) return null;
    return (
      <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 bg-black mb-3">
        <iframe src={youTubeEmbedUrl(id)} className="w-full h-full" allowFullScreen title="Question video" />
      </div>
    );
  }
  return null;
}

interface QuizViewerProps {
  lessonId: string;
  onRelearn: () => void;
  onPassChange?: (passed: boolean) => void;
}

export function QuizViewer({ lessonId, onRelearn, onPassChange }: QuizViewerProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastAttemptScore, setLastAttemptScore] = useState<number | null>(null);

  // answers: string for single-choice, string[] for multiple-choice
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/lessons/${lessonId}/quiz`).then((r) => r.json()),
      fetch(`/api/lessons/${lessonId}/quiz/attempt`).then((r) => r.json()),
    ]).then(([quizData, attempts]) => {
      setQuiz(quizData || null);
      if (Array.isArray(attempts) && attempts.length > 0) {
        setLastAttemptScore(attempts[0].score);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [lessonId]);

  // Shuffle choices once per quiz load
  const shuffledQuestions = useMemo(() => {
    if (!quiz) return [];
    return quiz.questions.map((q) => ({ ...q, choices: shuffle(q.choices) }));
  }, [quiz]);

  const toggleMultiple = (questionId: string, choiceId: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[] | undefined) ?? [];
      const next = current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId];
      return { ...prev, [questionId]: next };
    });
  };

  const submit = async () => {
    if (!quiz) return;
    const unanswered = quiz.questions.filter((q) => {
      const a = answers[q.id];
      return q.allowMultiple ? !Array.isArray(a) || a.length === 0 : !a;
    });
    if (unanswered.length > 0) {
      alert(`Please answer all ${unanswered.length} remaining question(s).`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/quiz/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      setResult(data);
      setLastAttemptScore(data.score);
      onPassChange?.(data.passed);
    } catch {
      alert("Could not submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setResult(null);
    setAnswers({});
    onPassChange?.(false);
  };

  if (loading) return null;
  if (!quiz || quiz.questions.length === 0) return null;

  // ── Results screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="border-2 rounded-2xl overflow-hidden">
        <div className={cn("px-6 py-6 text-center", result.passed ? "bg-green-50" : "bg-red-50")}>
          {result.passed
            ? <Trophy className="w-10 h-10 text-green-500 mx-auto mb-2" />
            : <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />}
          <p className="text-3xl font-bold mb-1" style={{ color: result.passed ? "#16a34a" : "#dc2626" }}>
            {result.score}%
          </p>
          <p className={cn("text-sm font-medium", result.passed ? "text-green-700" : "text-red-600")}>
            {result.passed
              ? "Congratulations! You passed."
              : `Not passed — you need ${result.passScore}% to pass.`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {result.correct} / {result.total} correct · Pass score: {result.passScore}%
          </p>
        </div>

        {/* Answer review */}
        <div className="px-6 py-4 space-y-4 bg-white">
          {shuffledQuestions.map((q, qi) => {
            const qr = result.result[q.id];
            const chosenRaw = answers[q.id];
            const chosen: string[] = Array.isArray(chosenRaw) ? chosenRaw : chosenRaw ? [chosenRaw] : [];

            return (
              <div key={q.id} className={cn("rounded-lg p-3 border", qr?.correct ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50")}>
                <div className="flex items-start gap-2 mb-2">
                  {qr?.correct
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{qi + 1}. {q.text}</p>
                    {q.allowMultiple && (
                      <p className="text-xs text-gray-400 mt-0.5">Multiple correct answers</p>
                    )}
                  </div>
                </div>
                <QuestionMedia mediaUrl={q.mediaUrl} mediaType={q.mediaType} />
                <div className="pl-6 space-y-1">
                  {q.choices.map((c) => {
                    const isChosen = chosen.includes(c.id);
                    const isCorrect = qr?.correctChoiceIds.includes(c.id);
                    return (
                      <div key={c.id} className={cn(
                        "text-xs px-2.5 py-1.5 rounded",
                        isCorrect ? "bg-green-100 text-green-800 font-medium" :
                        isChosen && !isCorrect ? "bg-red-100 text-red-700 line-through" :
                        "text-gray-500"
                      )}>
                        {isCorrect ? "✓ " : isChosen && !isCorrect ? "✗ " : ""}{c.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex gap-3 justify-end">
          {!result.passed && (
            <Button variant="outline" onClick={onRelearn}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Re-learn lesson
            </Button>
          )}
          <Button variant="outline" onClick={retry}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  // ── Quiz screen ─────────────────────────────────────────────────────────────
  const answeredCount = shuffledQuestions.filter((q) => {
    const a = answers[q.id];
    return q.allowMultiple ? Array.isArray(a) && a.length > 0 : !!a;
  }).length;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-indigo-900">Lesson Quiz</h3>
          <p className="text-xs text-indigo-600 mt-0.5">
            {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} · Pass score: {quiz.passScore}%
          </p>
        </div>
        {lastAttemptScore !== null && (
          <span className="text-xs text-indigo-500 bg-indigo-100 px-2.5 py-1 rounded-full">
            Last attempt: {lastAttemptScore}%
          </span>
        )}
      </div>

      <div className="px-6 py-5 space-y-8 bg-white">
        {shuffledQuestions.map((q, qi) => {
          const isMultiple = q.allowMultiple;
          const chosen: string[] = isMultiple
            ? ((answers[q.id] as string[] | undefined) ?? [])
            : answers[q.id] ? [answers[q.id] as string] : [];

          return (
            <div key={q.id}>
              <p className="text-sm font-medium text-gray-800 mb-1">
                {qi + 1}. {q.text}
              </p>
              {isMultiple && (
                <p className="text-xs text-gray-400 mb-2">Select all that apply</p>
              )}
              <QuestionMedia mediaUrl={q.mediaUrl} mediaType={q.mediaType} />
              <div className="space-y-2">
                {q.choices.map((c) => {
                  const selected = chosen.includes(c.id);
                  return (
                    <label key={c.id} className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors select-none",
                      selected
                        ? "border-indigo-400 bg-indigo-50 text-indigo-800"
                        : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                    )}>
                      {isMultiple ? (
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleMultiple(q.id, c.id)}
                          className="rounded border-gray-300 accent-indigo-600"
                        />
                      ) : (
                        <input
                          type="radio"
                          name={q.id}
                          value={c.id}
                          checked={selected}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: c.id }))}
                          className="accent-indigo-600"
                        />
                      )}
                      <span className="text-sm">{c.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {answeredCount} / {quiz.questions.length} answered
        </p>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Quiz"}
        </Button>
      </div>
    </div>
  );
}
