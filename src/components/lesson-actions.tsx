"use client";

import { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LessonActions({ lessonId, completed: initial }: { lessonId: string; completed: boolean }) {
  const [completed, setCompleted] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, completed: !completed }),
      });
      if (!res.ok) throw new Error();
      setCompleted(!completed);
      toast.success(completed ? "Marked as not completed" : "Lesson completed!");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
      <div>
        <p className="font-medium text-gray-900">
          {completed ? "You completed this lesson" : "Finished reading?"}
        </p>
        <p className="text-sm text-gray-400">
          {completed ? "Great work! Mark as incomplete to revisit." : "Mark this lesson as complete to track your progress."}
        </p>
      </div>
      <Button
        onClick={toggle}
        disabled={loading}
        variant={completed ? "outline" : "default"}
        className={completed ? "border-green-300 text-green-700 hover:bg-green-50" : ""}
      >
        {completed
          ? <><CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Completed</>
          : <><Circle className="w-4 h-4 mr-2" /> Mark Complete</>
        }
      </Button>
    </div>
  );
}
