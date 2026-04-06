"use client";

import { useState } from "react";
import { QuizViewer } from "@/components/quiz-viewer";
import { LessonActions } from "@/components/lesson-actions";

interface LessonEndSectionProps {
  lessonId: string;
  hasQuiz: boolean;
  alreadyCompleted: boolean;
}

export function LessonEndSection({ lessonId, hasQuiz, alreadyCompleted }: LessonEndSectionProps) {
  // quizPassed: null = not attempted yet, true = passed, false = failed
  const [quizPassed, setQuizPassed] = useState<boolean | null>(alreadyCompleted ? true : null);

  const handleRelearn = () => {
    // Scroll back to top of lesson content
    const el = document.getElementById("lesson-top");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (!hasQuiz) {
    // No quiz — show completion button directly
    return <LessonActions lessonId={lessonId} completed={alreadyCompleted} />;
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
