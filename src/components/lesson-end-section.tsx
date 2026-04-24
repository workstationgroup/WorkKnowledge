"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { QuizViewer } from "@/components/quiz-viewer";
import { LessonActions } from "@/components/lesson-actions";

interface LessonEndSectionProps {
  lessonId: string;
  hasQuiz: boolean;
  alreadyCompleted: boolean;
  hasTopics: boolean;
  allTopicsCompleteInitial: boolean;
}

export function LessonEndSection({
  lessonId,
  hasQuiz,
  alreadyCompleted,
  hasTopics,
  allTopicsCompleteInitial,
}: LessonEndSectionProps) {
  // quizPassed: null = not attempted yet, true = passed, false = failed
  const [quizPassed, setQuizPassed] = useState<boolean | null>(alreadyCompleted ? true : null);
  const [allTopicsComplete, setAllTopicsComplete] = useState<boolean>(allTopicsCompleteInitial);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ allComplete: boolean }>).detail;
      if (detail && typeof detail.allComplete === "boolean") {
        setAllTopicsComplete(detail.allComplete);
      }
    };
    window.addEventListener("wso:topics-progress", handler);
    return () => window.removeEventListener("wso:topics-progress", handler);
  }, []);

  const handleRelearn = () => {
    const el = document.getElementById("lesson-top");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (!hasQuiz) {
    // No quiz — show completion button directly
    return <LessonActions lessonId={lessonId} completed={alreadyCompleted} />;
  }

  // Quiz exists but topics aren't all complete yet → hide quiz behind a gate
  if (hasTopics && !allTopicsComplete && !alreadyCompleted) {
    return (
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/60">
        <div className="px-6 py-8 text-center">
          <Lock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-700">Quiz locked</h3>
          <p className="text-xs text-gray-500 mt-1.5 max-w-md mx-auto">
            Complete every topic above to unlock the quiz for this lesson.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QuizViewer
        lessonId={lessonId}
        onPassChange={setQuizPassed}
        onRelearn={handleRelearn}
      />
      {/* Only show Mark Complete after passing */}
      {quizPassed && (
        <LessonActions lessonId={lessonId} completed={alreadyCompleted} />
      )}
      {quizPassed === false && (
        <p className="text-sm text-center text-red-500">
          You need to pass the quiz before completing this lesson.
        </p>
      )}
    </div>
  );
}
