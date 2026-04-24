"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { splitBlock } from "prosemirror-commands";
import { splitListItem } from "prosemirror-schema-list";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Minus, Undo, Redo, Link as LinkIcon, PlayCircle,
  Image as ImageIcon, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** When present, embedded images land under lessons/<id>/editor/… — otherwise drafts/<userId>/editor/… */
  lessonId?: string;
}

export function RichEditor({ value, onChange, placeholder, lessonId }: RichEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Start writing..." }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: false }),
      Youtube.configure({ width: 640, height: 360, nocookie: false, HTMLAttributes: { class: "w-full aspect-video h-auto" } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "prose prose-gray max-w-none focus:outline-none min-h-[300px] px-4 py-3 prose-li:my-0 prose-ul:my-2 prose-ol:my-2 prose-p:my-2" },
      // Intercept Enter/Shift+Enter before any extension gets it.
      // Enter → <br> everywhere (including inside list items).
      // Shift+Enter → split the current block (new paragraph, or new bullet in lists).
      handleKeyDown(view, event) {
        if (event.key !== "Enter" || event.isComposing) return false;
        const { state, dispatch } = view;
        if (event.shiftKey) {
          // Inside a list? Split the list item (= new bullet). Otherwise split the block (= new paragraph).
          const listItemType = state.schema.nodes.listItem;
          if (listItemType && splitListItem(listItemType)(state, dispatch)) return true;
          return splitBlock(state, dispatch);
        }
        // Plain Enter → hard break everywhere (including inside list items).
        const hardBreak = state.schema.nodes.hardBreak;
        if (!hardBreak) return false;
        dispatch(state.tr.replaceSelectionWith(hardBreak.create(), false).scrollIntoView());
        return true;
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const ToolBtn = ({
    onClick, active, disabled, children, title,
  }: {
    onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode; title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded hover:bg-gray-100 transition-colors disabled:opacity-40",
        active && "bg-gray-200 text-gray-900",
      )}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const url = window.prompt("URL");
    if (!url) return;
    const href = url.trim();
    if (!href) return;
    if (editor.state.selection.empty) {
      // No text selected — insert the URL itself as linked text so something is visible
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  };

  const embedYouTube = () => {
    const url = window.prompt("YouTube URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const signRes = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, lessonId }),
      });
      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({ error: "Upload failed" }));
        alert(err.error ?? "Upload failed");
        return;
      }
      const { uploadUrl, publicUrl } = await signRes.json();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        alert(`Storage upload failed (${putRes.status})`);
        return;
      }
      editor.chain().focus().setImage({ src: publicUrl, alt: file.name }).run();
    } catch {
      alert("Image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
        }}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>
          <Heading3 className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={setLink} active={editor.isActive("link")}>
          <LinkIcon className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => fileRef.current?.click()} disabled={uploading} title="Insert image">
          {uploading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <ImageIcon className="w-4 h-4" />}
        </ToolBtn>
        <ToolBtn onClick={embedYouTube} title="Embed YouTube video">
          <PlayCircle className="w-4 h-4 text-red-500" />
        </ToolBtn>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()}><Undo className="w-4 h-4" /></ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()}><Redo className="w-4 h-4" /></ToolBtn>
      </div>

      <EditorContent editor={editor} />

      {/* Keyboard hint */}
      <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400">
        <kbd className="px-1 py-0.5 rounded bg-white border border-gray-200 font-mono text-[10px]">Enter</kbd> line break
        <span className="mx-2">·</span>
        <kbd className="px-1 py-0.5 rounded bg-white border border-gray-200 font-mono text-[10px]">Shift</kbd>+<kbd className="px-1 py-0.5 rounded bg-white border border-gray-200 font-mono text-[10px]">Enter</kbd> new paragraph
      </div>
    </div>
  );
}
