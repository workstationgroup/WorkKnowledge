"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X, FileText, Film, Image, Table } from "lucide-react";
import { toast } from "sonner";

export type UploadedFile = {
  url: string;
  fileName: string;
  fileSize?: number;
  blockType: "IMAGE" | "VIDEO" | "PDF" | "PPT" | "EXCEL";
};

interface FileUploaderProps {
  onUploaded: (file: UploadedFile) => void;
  accept?: string;
  label?: string;
  lessonId: string;
  /** Which sub-folder under lessons/<id>/ the file lands in. */
  kind: "attachments" | "blocks";
}

const ACCEPT_ALL = ".jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.pdf,.ppt,.pptx,.xls,.xlsx";

const typeIcon: Record<string, React.ReactNode> = {
  IMAGE: <Image className="w-4 h-4" />,
  VIDEO: <Film className="w-4 h-4" />,
  PDF: <FileText className="w-4 h-4 text-red-500" />,
  PPT: <FileText className="w-4 h-4 text-orange-500" />,
  EXCEL: <Table className="w-4 h-4 text-green-600" />,
};

export function fileIcon(type: string) {
  return typeIcon[type] ?? <FileText className="w-4 h-4" />;
}

export function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({ onUploaded, accept, label = "Upload file", lessonId, kind }: FileUploaderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const upload = async (file: File) => {
    if (file.type.startsWith("video/") && file.type !== "video/mp4") {
      toast.error("Only MP4 videos are supported (mobile browsers can't play MOV/WebM reliably). Please convert to MP4 first.");
      if (ref.current) ref.current.value = "";
      return;
    }
    setLoading(true);
    try {
      // Step 1 — ask our server for a presigned PUT URL
      const signRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, lessonId, kind }),
      });
      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({ error: `Server error ${signRes.status}` }));
        throw new Error(err.error ?? "Upload failed");
      }
      const { uploadUrl, publicUrl, blockType } = await signRes.json();

      // Step 2 — upload the file directly to R2
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Storage upload failed (${putRes.status})`);

      onUploaded({ url: publicUrl, fileName: file.name, fileSize: file.size, blockType });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept={accept ?? ACCEPT_ALL}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {loading ? "Uploading..." : label}
      </button>
    </div>
  );
}
