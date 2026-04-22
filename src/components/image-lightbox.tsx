"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  caption?: string;
  onClose: () => void;
}

/**
 * Fullscreen lightbox with desktop double-click zoom, mouse drag-to-pan when
 * zoomed, and native mobile pinch-to-zoom (touch-action: pinch-zoom).
 */
function ImageLightbox({ src, caption, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offX: 0, offY: 0 });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const toggleZoom = () => {
    setScale((s) => (s > 1 ? 1 : 2));
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.offX + (e.clientX - dragStart.current.x),
      y: dragStart.current.offY + (e.clientY - dragStart.current.y),
    });
  };
  const stopDrag = () => setDragging(false);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
      className="flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="select-none" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt={caption ?? ""}
          onDoubleClick={toggleZoom}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.15s ease-out",
            cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in",
            touchAction: "pinch-zoom",
          }}
          className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg"
        />
        {caption && (
          <p className="text-center text-sm text-white/80 mt-3 max-w-[95vw] mx-auto px-4">
            {caption}
          </p>
        )}
        <p className="text-center text-[11px] text-white/40 mt-1.5 hidden md:block">
          Double-click to zoom · drag to pan · Esc to close
        </p>
      </div>
    </div>
  );
}

/**
 * Wraps children and turns every <img> click into a lightbox open.
 * Individual images can opt out with `data-no-zoom="true"`.
 */
export function LightboxRoot({ children }: { children: React.ReactNode }) {
  const [src, setSrc] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    if (target.dataset.noZoom === "true") return;
    const img = target as HTMLImageElement;
    if (!img.src) return;
    e.preventDefault();
    setSrc(img.src);
    setCaption(img.alt ?? "");
  };

  return (
    <div onClick={handleClick} className="[&_img]:cursor-zoom-in">
      {children}
      {src && <ImageLightbox src={src} caption={caption} onClose={() => setSrc(null)} />}
    </div>
  );
}
