"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Lock, Unlock, Save, X, Image as ImageIcon, Film, FileText, Table, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichEditor } from "@/components/rich-editor";
import { FileUploader, UploadedFile, fileIcon } from "@/components/file-uploader";
import { parseYouTubeId, youTubeEmbedUrl } from "@/lib/youtube";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BlockType = "TEXT" | "IMAGE" | "VIDEO" | "PDF" | "PPT" | "EXCEL" | "YOUTUBE";

interface Block {
  id?: string;
  type: BlockType;
  content: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
}

interface Topic {
  id: string;
  lessonId?: string;
  title: string;
  mustComplete: boolean;
  order: number;
  blocks: Block[];
}

interface TopicEditorProps {
  lessonId: string;
  lessonTitle: string;
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  TEXT: "Text",
  IMAGE: "Image",
  VIDEO: "Video",
  PDF: "PDF",
  PPT: "PowerPoint",
  EXCEL: "Excel",
  YOUTUBE: "YouTube",
};

function YouTubeBlockEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const [input, setInput] = useState(block.content);
  const [error, setError] = useState("");

  const videoId = block.content ? parseYouTubeId(block.content) : null;

  const apply = () => {
    const id = parseYouTubeId(input);
    if (!id) { setError("Could not find a valid YouTube video ID in that URL."); return; }
    setError("");
    onChange({ ...block, content: input.trim() });
  };

  return (
    <div className="space-y-2">
      {videoId ? (
        <>
          <div className="aspect-video w-full rounded-lg overflow-hidden border border-gray-200 bg-black">
            <iframe
              src={youTubeEmbedUrl(videoId)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...block, content: "" })}
            className="text-xs text-gray-400 hover:text-red-400"
          >
            Remove video
          </button>
        </>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="Paste YouTube URL (e.g. https://youtu.be/...)"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            className="flex-1 text-sm"
          />
          <Button type="button" size="sm" onClick={apply}>Embed</Button>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Input
        placeholder="Caption (optional)"
        value={block.caption ?? ""}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        className="text-xs h-7"
      />
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onDelete,
  lessonFolder,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onDelete: () => void;
  lessonFolder: string;
}) {
  return (
    <div className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {block.type === "YOUTUBE"
            ? <PlayCircle className="w-4 h-4 text-red-500" />
            : fileIcon(block.type)}
          <span className="text-xs font-medium text-gray-600">{BLOCK_TYPE_LABELS[block.type]}</span>
        </div>
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {block.type === "TEXT" ? (
        <RichEditor value={block.content} onChange={(html) => onChange({ ...block, content: html })} placeholder="Write content..." />
      ) : block.type === "YOUTUBE" ? (
        <YouTubeBlockEditor block={block} onChange={onChange} />
      ) : block.content ? (
        <div className="flex items-center gap-2 p-2 rounded bg-white border border-gray-200">
          <span className="text-xs text-gray-600 truncate flex-1">{block.fileName ?? "File uploaded"}</span>
          <a href={block.content} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline shrink-0">View</a>
          <button type="button" onClick={() => onChange({ ...block, content: "", fileName: undefined })} className="text-gray-300 hover:text-red-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <FileUploader
          lessonFolder={lessonFolder}
          accept={
            block.type === "IMAGE" ? ".jpg,.jpeg,.png,.gif,.webp" :
            block.type === "VIDEO" ? ".mp4,.mov,.webm" :
            block.type === "PDF"   ? ".pdf" :
            block.type === "PPT"   ? ".ppt,.pptx" :
            block.type === "EXCEL" ? ".xls,.xlsx" :
            undefined
          }
          onUploaded={(f: UploadedFile) => onChange({ ...block, content: f.url, fileName: f.fileName, fileSize: f.fileSize })}
          label={`Upload ${BLOCK_TYPE_LABELS[block.type]}`}
        />
      )}

      {block.type !== "TEXT" && block.type !== "YOUTUBE" && (
        <Input
          placeholder="Caption (optional)"
          value={block.caption ?? ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          className="text-xs h-7"
        />
      )}
    </div>
  );
}

function TopicItem({
  topic,
  lessonFolder,
  isFirst,
  isLast,
  onMove,
  onSaved,
  onDelete,
}: {
  topic: Topic;
  lessonFolder: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: "up" | "down") => void;
  onSaved: (updated: Topic) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(topic.id.startsWith("new-"));
  const [title, setTitle] = useState(topic.title);
  const [mustComplete, setMustComplete] = useState(topic.mustComplete);
  const [blocks, setBlocks] = useState<Block[]>(topic.blocks);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(topic.title);
    setMustComplete(topic.mustComplete);
    setBlocks(topic.blocks);
  }, [topic.id]);

  const addBlock = (type: BlockType) => setBlocks((prev) => [...prev, { type, content: "" }]);

  const updateBlock = (i: number, b: Block) => setBlocks((prev) => prev.map((x, idx) => (idx === i ? b : x)));

  const deleteBlock = (i: number) => setBlocks((prev) => prev.filter((_, idx) => idx !== i));

  const moveBlock = (i: number, dir: "up" | "down") => {
    setBlocks((prev) => {
      const arr = [...prev];
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const save = async () => {
    if (!title.trim()) { toast.error("Topic title is required"); return; }
    setSaving(true);
    try {
      const isNew = topic.id.startsWith("new-");
      const url = isNew ? "/api/topics" : `/api/topics/${topic.id}`;
      const method = isNew ? "POST" : "PUT";
      const body = isNew
        ? { lessonId: topic.lessonId ?? "", title, mustComplete, blocks }
        : { title, mustComplete, blocks };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      const updated = await res.json();
      toast.success("Topic saved");
      onSaved(updated);
      setEditing(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (topic.id.startsWith("new-")) { onDelete(); return; }
    if (!confirm("Delete this topic?")) return;
    try {
      const res = await fetch(`/api/topics/${topic.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Topic deleted");
      onDelete();
    } catch { toast.error("Delete failed"); }
  };

  return (
    <div className={cn("border rounded-xl overflow-hidden", editing ? "border-indigo-300 shadow-sm" : "border-gray-200")}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => onMove("up")} disabled={isFirst} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => onMove("down")} disabled={isLast} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
        {editing ? (
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Topic title" className="flex-1 h-8 text-sm font-medium" autoFocus />
        ) : (
          <span className="flex-1 text-sm font-medium text-gray-800 truncate">{topic.title || "Untitled topic"}</span>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            title={mustComplete ? "Must complete" : "Can skip"}
            onClick={() => { if (editing) setMustComplete((v) => !v); }}
            className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors",
              mustComplete ? "border-amber-300 text-amber-600 bg-amber-50" : "border-gray-200 text-gray-400")}
          >
            {mustComplete ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {mustComplete ? "Must complete" : "Can skip"}
          </button>
          {!editing && <button type="button" onClick={() => setEditing(true)} className="text-xs text-indigo-600 hover:underline">Edit</button>}
          <button type="button" onClick={handleDelete} className="text-gray-300 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit area */}
      {editing && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/50">
          {/* Add block buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Add block:</span>
            {([
              ["TEXT", <FileText className="w-3 h-3" />, "Text"],
              ["IMAGE", <ImageIcon className="w-3 h-3" />, "Image"],
              ["VIDEO", <Film className="w-3 h-3" />, "Video"],
              ["YOUTUBE", <PlayCircle className="w-3 h-3 text-red-500" />, "YouTube"],
              ["PDF", <FileText className="w-3 h-3 text-red-400" />, "PDF"],
              ["PPT", <FileText className="w-3 h-3 text-orange-400" />, "PPT"],
              ["EXCEL", <Table className="w-3 h-3 text-green-600" />, "Excel"],
            ] as const).map(([type, icon, label]) => (
              <button key={type} type="button" onClick={() => addBlock(type as BlockType)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Blocks */}
          {blocks.length > 0 ? (
            <div className="space-y-2">
              {blocks.map((block, i) => (
                <div key={i} className="relative">
                  {blocks.length > 1 && (
                    <div className="absolute -left-1 top-3 flex flex-col gap-0.5 z-10">
                      <button type="button" onClick={() => moveBlock(i, "up")} disabled={i === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => moveBlock(i, "down")} disabled={i === blocks.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <BlockEditor block={block} onChange={(b) => updateBlock(i, b)} onDelete={() => deleteBlock(i)} lessonFolder={lessonFolder} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">No content yet — add a block above</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={mustComplete} onChange={(e) => setMustComplete(e.target.checked)}
                className="rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
              <span className="text-sm text-gray-700">Employees must complete this topic before continuing</span>
            </label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving..." : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Topic</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TopicEditor({ lessonId, lessonTitle }: TopicEditorProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/topics?lessonId=${lessonId}`)
      .then((r) => r.json())
      .then((data) => { setTopics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lessonId]);

  const addTopic = () => {
    setTopics((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, lessonId, title: "", mustComplete: true, order: prev.length, blocks: [] },
    ]);
  };

  const moveTopic = (i: number, dir: "up" | "down") => {
    setTopics((prev) => {
      const arr = [...prev];
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading topics...</div>;

  return (
    <div className="space-y-3">
      {topics.map((topic, i) => (
        <TopicItem
          key={topic.id}
          topic={topic}
          lessonFolder={lessonTitle}
          isFirst={i === 0}
          isLast={i === topics.length - 1}
          onMove={(dir) => moveTopic(i, dir)}
          onSaved={(updated) => setTopics((prev) => prev.map((t, idx) => (idx === i ? updated : t)))}
          onDelete={() => setTopics((prev) => prev.filter((_, idx) => idx !== i))}
        />
      ))}
      {topics.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400 mb-3">No topics yet</p>
          <Button type="button" variant="outline" size="sm" onClick={addTopic}>
            <Plus className="w-4 h-4 mr-1.5" /> Add First Topic
          </Button>
        </div>
      )}
      {topics.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={addTopic}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Topic
        </Button>
      )}
    </div>
  );
}
