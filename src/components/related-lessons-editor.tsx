"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LessonOption {
  id: string;
  title: string;
  status: string;
  category: { name: string; color: string };
}

interface RelatedLessonsEditorProps {
  lessonId: string;
  allLessons: LessonOption[];
}

export interface RelatedLessonsEditorHandle {
  save: () => Promise<void>;
}

export const RelatedLessonsEditor = forwardRef<RelatedLessonsEditorHandle, RelatedLessonsEditorProps>(
  function RelatedLessonsEditor({ lessonId, allLessons }, ref) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");

    useEffect(() => {
      fetch(`/api/lessons/${lessonId}/related`)
        .then((r) => r.json())
        .then((data: { id: string }[]) => {
          if (Array.isArray(data)) setSelectedIds(new Set(data.map((l) => l.id)));
        })
        .catch(() => {});
    }, [lessonId]);

    useImperativeHandle(ref, () => ({
      save: async () => {
        const res = await fetch(`/api/lessons/${lessonId}/related`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relatedIds: [...selectedIds] }),
        });
        if (!res.ok) toast.error("Failed to save related lessons");
      },
    }));

    const toggle = (id: string) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });

    const options = allLessons.filter(
      (l) => l.id !== lessonId && l.title.toLowerCase().includes(search.toLowerCase())
    );

    const selected = allLessons.filter((l) => selectedIds.has(l.id));

    return (
      <div className="space-y-3">
        {/* Selected pills */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
              >
                {l.title}
                <button type="button" onClick={() => toggle(l.id)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons…"
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>

        {/* Lesson list */}
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
          {options.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No lessons found</p>
          )}
          {options.map((l) => {
            const active = selectedIds.has(l.id);
            return (
              <label
                key={l.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                  active ? "bg-indigo-50" : "hover:bg-gray-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(l.id)}
                  className="rounded border-gray-300 accent-indigo-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{l.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: l.category.color + "20", color: l.category.color }}
                    >
                      {l.category.name}
                    </span>
                    {l.status === "DRAFT" && (
                      <span className="text-xs text-amber-500">Draft</span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }
);
