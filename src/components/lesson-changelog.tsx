"use client";

import { useEffect, useState } from "react";
import { Clock, User } from "lucide-react";

interface ChangelogEntry {
  id: string;
  userId: string;
  userName: string;
  summary: string;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function LessonChangelog({ lessonId }: { lessonId: string }) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/changelog`)
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lessonId]);

  if (loading) return <p className="text-sm text-gray-400 py-2">Loading...</p>;

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-2">No changes recorded yet.</p>;
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />

      <ul className="space-y-4">
        {entries.map((entry) => (
          <li key={entry.id} className="flex gap-4 relative">
            {/* Dot */}
            <div className="shrink-0 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </div>

            <div className="flex-1 pb-1 min-w-0">
              <p className="text-sm text-gray-800 leading-snug">{entry.summary}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {entry.userName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <time title={new Date(entry.createdAt).toLocaleString()}>{timeAgo(entry.createdAt)}</time>
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
