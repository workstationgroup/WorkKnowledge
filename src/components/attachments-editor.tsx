"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Trash2, GripVertical } from "lucide-react";
import { FileUploader, UploadedFile, fileIcon, formatBytes } from "@/components/file-uploader";
import { toast } from "sonner";

interface Attachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
  fileSize?: number | null;
  order: number;
}

interface StagedAttachment {
  key: string; // local-only id
  file: UploadedFile;
}

interface AttachmentsEditorProps {
  lessonId: string;
  lessonTitle: string;
}

export interface AttachmentsEditorHandle {
  save: () => Promise<void>;
}

export const AttachmentsEditor = forwardRef<AttachmentsEditorHandle, AttachmentsEditorProps>(
function AttachmentsEditor({ lessonId, lessonTitle }, ref) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [staged, setStaged] = useState<StagedAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useImperativeHandle(ref, () => ({ save: saveAttachments }));

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}/attachments`)
      .then((r) => r.json())
      .then((data) => { setAttachments(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [lessonId]);

  // File selected → stage locally (upload already happened in FileUploader)
  const onUploaded = (file: UploadedFile) => {
    setStaged((prev) => [...prev, { key: crypto.randomUUID(), file }]);
  };

  const removeStaged = (key: string) => {
    setStaged((prev) => prev.filter((s) => s.key !== key));
  };

  // Save staged files to DB
  const saveAttachments = async () => {
    if (staged.length === 0) return;
    setSaving(true);
    let saved = 0;
    for (const s of staged) {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: s.file.blockType,
            url: s.file.url,
            fileName: s.file.fileName,
            fileSize: s.file.fileSize,
            itemId: s.file.itemId,
            driveId: s.file.driveId,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
          toast.error(`Failed to save "${s.file.fileName}": ${err.error ?? "Unknown error"}`);
          continue;
        }
        const created = await res.json();
        setAttachments((prev) => [...prev, created]);
        saved++;
      } catch (e: unknown) {
        toast.error(`Failed to save "${s.file.fileName}": ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
    setStaged([]);
    setSaving(false);
    if (saved > 0) toast.success(`${saved} attachment${saved > 1 ? "s" : ""} saved`);
  };

  const deleteAttachment = async (id: string) => {
    if (!confirm("Remove this attachment? The file will also be deleted from SharePoint.")) return;
    try {
      const res = await fetch(`/api/lessons/${lessonId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId: id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        toast.error(err.error ?? "Delete failed");
        return;
      }
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Attachment removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) return <div className="text-sm text-gray-400 py-2">Loading...</div>;

  return (
    <div className="space-y-3">
      {/* Saved attachments */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white group">
              <GripVertical className="w-4 h-4 text-gray-200" />
              {fileIcon(a.type)}
              <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 text-sm text-gray-700 hover:text-indigo-600 hover:underline truncate">
                {a.fileName}
              </a>
              {a.fileSize && <span className="text-xs text-gray-400">{formatBytes(a.fileSize)}</span>}
              <button
                type="button"
                onClick={() => deleteAttachment(a.id)}
                className="text-gray-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Staged (unsaved) attachments */}
      {staged.length > 0 && (
        <div className="space-y-1.5">
          {staged.map((s) => (
            <div key={s.key} className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 group">
              <GripVertical className="w-4 h-4 text-amber-200" />
              {fileIcon(s.file.blockType)}
              <span className="flex-1 text-sm text-amber-800 truncate">{s.file.fileName}</span>
              {s.file.fileSize && <span className="text-xs text-amber-500">{formatBytes(s.file.fileSize)}</span>}
              <span className="text-xs text-amber-500 font-medium">unsaved</span>
              <button
                type="button"
                onClick={() => removeStaged(s.key)}
                className="text-amber-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && staged.length === 0 && (
        <p className="text-xs text-gray-400">No attachments yet</p>
      )}

      <div className="flex items-center gap-3">
        <FileUploader lessonFolder={lessonTitle} onUploaded={onUploaded} label="Add attachment" />
        {staged.length > 0 && (
          <span className="text-xs text-amber-600 font-medium">{staged.length} unsaved — click Save to upload</span>
        )}
      </div>
    </div>
  );
});
