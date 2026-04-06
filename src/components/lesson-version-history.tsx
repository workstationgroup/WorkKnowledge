"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Version {
  id: string;
  version: number;
  title: string;
  status: string;
  savedByName: string;
  note: string | null;
  createdAt: string;
}

interface LessonVersionHistoryProps {
  lessonId: string;
  onRestored: () => void; // called after restore so parent can reload
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700",
  DRAFT: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export function LessonVersionHistory({ lessonId, onRestored }: LessonVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/versions`)
      .then((r) => r.json())
      .then((data) => { setVersions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lessonId]);

  const restore = async (ver: Version) => {
    if (!confirm(`Restore version ${ver.version}: "${ver.title}"?\n\nThe lesson content will be replaced. A new version will be saved automatically.`)) return;
    setRestoring(ver.id);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: ver.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Restore failed");
      }
      toast.success(`Restored to version ${ver.version}`);
      onRestored();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoring(null);
    }
  };

  if (loading) return <p className="text-sm text-gray-400 py-2">Loading...</p>;
  if (versions.length === 0) return <p className="text-sm text-gray-400 py-2">No versions yet.</p>;

  const shown = expanded ? versions : versions.slice(0, 5);
  const current = versions[0]; // highest version = most recent

  return (
    <div className="space-y-2">
      {shown.map((ver) => {
        const isCurrent = ver.id === current.id;
        return (
          <div
            key={ver.id}
            className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
              isCurrent ? "border-indigo-200 bg-indigo-50" : "border-gray-100 bg-white"
            }`}
          >
            {/* Version badge */}
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
              isCurrent ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              v{ver.version}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-gray-900 truncate">{ver.title}</p>
                {isCurrent && <span className="text-xs text-indigo-600 font-medium">current</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_STYLE[ver.status] ?? "bg-gray-100 text-gray-500"}`}>
                  {ver.status.charAt(0) + ver.status.slice(1).toLowerCase()}
                </span>
              </div>
              {ver.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{ver.note}</p>}
              <p className="text-xs text-gray-400 mt-0.5">
                {ver.savedByName} · {new Date(ver.createdAt).toLocaleString()}
              </p>
            </div>

            {/* Restore button — hide on current version */}
            {!isCurrent && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => restore(ver)}
                disabled={restoring === ver.id}
                className="flex-shrink-0 h-8 gap-1.5 text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                {restoring === ver.id ? "Restoring…" : "Restore"}
              </Button>
            )}
          </div>
        );
      })}

      {versions.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 mt-1"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? "Show less" : `Show ${versions.length - 5} more versions`}
        </button>
      )}
    </div>
  );
}
