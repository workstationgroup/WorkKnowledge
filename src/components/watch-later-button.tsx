"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WatchLaterButtonProps {
  lessonId: string;
  saved: boolean;
  size?: "sm" | "md";
}

export function WatchLaterButton({ lessonId, saved: initial, size = "md" }: WatchLaterButtonProps) {
  const [saved, setSaved] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      const res = await fetch(`/api/lessons/${lessonId}/watch-later`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Saved to Watch Later" : "Removed from Watch Later");
    } catch {
      setSaved(!next); // rollback
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from Watch Later" : "Save to Watch Later"}
      className={cn(
        "flex-shrink-0 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
        size === "sm" ? "p-1" : "p-1.5",
        saved
          ? "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          : "text-gray-300 hover:text-gray-500 hover:bg-gray-100",
        loading && "opacity-50 cursor-wait"
      )}
    >
      {saved
        ? <BookmarkCheck className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
        : <Bookmark     className={size === "sm" ? "w-4 h-4" : "w-5 h-5"} />
      }
    </button>
  );
}
