"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Lock, ChevronDown, ChevronUp, Download, FileText, Film, Image as ImageIcon, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, fileIcon } from "@/components/file-uploader";
import { parseYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import { toast } from "sonner";

type BlockType = "TEXT" | "IMAGE" | "VIDEO" | "PDF" | "PPT" | "EXCEL" | "YOUTUBE";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  caption?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  order: number;
}

interface Topic {
  id: string;
  title: string;
  mustComplete: boolean;
  order: number;
  blocks: Block[];
  completedAt?: string | null;
}

interface Attachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
  fileSize?: number | null;
}

interface LessonTopicsViewerProps {
  topics: Topic[];
  attachments: Attachment[];
  userId: string;
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "TEXT":
      return (
        <div
          className="prose prose-gray max-w-none prose-headings:font-semibold prose-a:text-indigo-600 prose-li:my-0 prose-ul:my-2 prose-ol:my-2 prose-p:my-2"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    case "IMAGE":
      return (
        <figure>
          <img
            src={block.content}
            alt={block.caption ?? block.fileName ?? "Image"}
            className="rounded-lg max-w-full w-full border border-gray-100"
          />
          {block.caption && <figcaption className="text-xs text-gray-400 mt-1.5 text-center">{block.caption}</figcaption>}
        </figure>
      );
    case "VIDEO":
      return (
        <figure>
          <video controls src={block.content} className="rounded-lg max-w-full w-full border border-gray-100">
            Your browser does not support video.
          </video>
          {block.caption && <figcaption className="text-xs text-gray-400 mt-1.5">{block.caption}</figcaption>}
        </figure>
      );
    case "PDF": {
      const pUrl = block.content;
      return (
        <div className="space-y-2">
          <iframe src={pUrl} className="w-full rounded-lg border border-gray-200" style={{ height: "500px" }} />
          {block.caption && <p className="text-xs text-gray-400">{block.caption}</p>}
          <a href={pUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </a>
        </div>
      );
    }
    case "PPT":
    case "EXCEL":
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          {fileIcon(block.type)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{block.fileName ?? (block.type === "PPT" ? "Presentation" : "Spreadsheet")}</p>
            {block.caption && <p className="text-xs text-gray-400">{block.caption}</p>}
          </div>
          <a href={block.content} download={block.fileName ?? undefined} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline shrink-0">
            <Download className="w-3.5 h-3.5" /> Download
          </a>
        </div>
      );
    case "YOUTUBE": {
      const videoId = parseYouTubeId(block.content);
      if (!videoId) return null;
      return (
        <figure>
          <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 bg-black">
            <iframe
              src={youTubeEmbedUrl(videoId)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={block.caption ?? "YouTube video"}
            />
          </div>
          {block.caption && <figcaption className="text-xs text-gray-400 mt-1.5">{block.caption}</figcaption>}
        </figure>
      );
    }
    default:
      return null;
  }
}

export function LessonTopicsViewer({ topics, attachments, userId }: LessonTopicsViewerProps) {
  const [completed, setCompleted] = useState<Record<string, boolean>>(
    Object.fromEntries(topics.map((t) => [t.id, !!t.completedAt]))
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(topics.map((t, i) => [t.id, i === 0]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  // A topic is locked if any earlier mustComplete topic is not yet done
  const isLocked = (topicIndex: number): boolean => {
    for (let i = 0; i < topicIndex; i++) {
      if (topics[i].mustComplete && !completed[topics[i].id]) return true;
    }
    return false;
  };

  const toggleComplete = async (topicId: string, newValue: boolean) => {
    setSaving(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newValue }),
      });
      if (!res.ok) throw new Error("Failed");
      setCompleted((prev) => ({ ...prev, [topicId]: newValue }));
      if (newValue) toast.success("Topic marked as complete");
    } catch {
      toast.error("Could not save progress");
    } finally {
      setSaving(null);
    }
  };

  if (topics.length === 0 && attachments.length === 0) return null;

  return (
    <div className="space-y-8 mt-8">
      {topics.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Topics</h2>
          {topics.map((topic, i) => {
            const locked = isLocked(i);
            const done = completed[topic.id];
            const open = expanded[topic.id] && !locked;

            return (
              <div
                key={topic.id}
                className={cn(
                  "border rounded-xl overflow-hidden transition-all",
                  locked ? "border-gray-100 bg-gray-50" : done ? "border-green-200" : "border-gray-200"
                )}
              >
                {/* Topic header */}
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && setExpanded((prev) => ({ ...prev, [topic.id]: !prev[topic.id] }))}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    locked ? "cursor-not-allowed" : "hover:bg-gray-50"
                  )}
                >
                  <div className="shrink-0">
                    {locked ? (
                      <Lock className="w-5 h-5 text-gray-300" />
                    ) : done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <span className={cn("flex-1 text-sm font-medium", locked ? "text-gray-400" : "text-gray-800")}>
                    {topic.title}
                  </span>
                  {topic.mustComplete && !done && !locked && (
                    <span className="text-xs text-amber-500 border border-amber-200 rounded-full px-2 py-0.5">Required</span>
                  )}
                  {!locked && (open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
                </button>

                {/* Topic content */}
                {open && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-5 bg-white">
                    {topic.blocks.map((block) => (
                      <BlockRenderer key={block.id} block={block} />
                    ))}
                    {topic.blocks.length === 0 && (
                      <p className="text-sm text-gray-400">No content in this topic yet.</p>
                    )}
                    <div className="flex justify-end pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        disabled={saving === topic.id}
                        onClick={() => toggleComplete(topic.id, !done)}
                        className={cn(
                          "w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                          done
                            ? "border-green-200 text-green-600 bg-green-50 hover:bg-green-100"
                            : "border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                        )}
                      >
                        {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        {saving === topic.id ? "Saving..." : done ? "Completed — Mark incomplete" : "Mark as complete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Training Materials</h2>
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                {fileIcon(a.type)}
                <span className="flex-1 text-sm text-gray-700 truncate">{a.fileName}</span>
                {a.fileSize && <span className="text-xs text-gray-400">{formatBytes(a.fileSize)}</span>}
                <a href={a.url} download={a.fileName} target="_blank" rel="noreferrer" className="shrink-0">
                  <Download className="w-4 h-4 text-gray-400 hover:text-indigo-600" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
