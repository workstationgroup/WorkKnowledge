"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Only show page tours after the global sidebar tour is completed
const GLOBAL_TOUR_KEY = "wso_tour_done_v1";

export interface PageTourStep {
  target?: string; // data-tour attribute value
  title: string;
  description: string;
  placement?: "right" | "left" | "top" | "bottom" | "center";
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;

/**
 * Scroll the element into view by directly setting scrollTop on the scrollable
 * container — this is guaranteed synchronous so getBoundingClientRect() called
 * immediately after reflects the new position.
 *
 * scrollIntoView() (even with behavior:"instant") routes through the browser's
 * scroll machinery and getBoundingClientRect() in the same JS task can still
 * return the pre-scroll coordinates on some browsers/engines.
 */
function scrollToTarget(target: string): void {
  const el = document.querySelector(`[data-tour="${target}"]`) as HTMLElement | null;
  if (!el) return;

  // Find the nearest scrollable ancestor (the app uses <main overflow-y-auto>)
  let container: HTMLElement | null = el.parentElement;
  while (container && container !== document.body) {
    const overflow = window.getComputedStyle(container).overflowY;
    if (overflow === "auto" || overflow === "scroll") break;
    container = container.parentElement;
  }
  const scroller: HTMLElement = container && container !== document.body
    ? container
    : document.documentElement;

  const scrollerRect = scroller.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();

  // Element's top relative to the scroller's client area, adjusted for current scroll
  const elTopInScroller = elRect.top - scrollerRect.top + scroller.scrollTop;
  // Place element 100px from the top of the scroller (clears any fixed header)
  const desired = elTopInScroller - 100;
  scroller.scrollTop = Math.max(0, desired); // synchronous — layout updated immediately
}

function getRect(target: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const vpH = window.innerHeight;
  if (r.bottom < 0 || r.top > vpH) return null;
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
}

interface TooltipPos {
  top: number | "auto";
  left: number | "auto";
  right: number | "auto";
  bottom: number | "auto";
}

function calcTooltipPos(
  rect: SpotlightRect | null,
  placement: PageTourStep["placement"],
  tooltipW: number,
  tooltipH: number,
  vpW: number,
  vpH: number
): TooltipPos {
  const center = (): TooltipPos => ({
    top: Math.max(16, vpH / 2 - tooltipH / 2),
    left: Math.max(16, vpW / 2 - tooltipW / 2),
    right: "auto",
    bottom: "auto",
  });

  if (!rect || placement === "center") return center();

  const GAP = 16;
  const MARGIN = 16;

  // Clamp helpers
  const clampTop = (t: number) => Math.min(Math.max(t, MARGIN), vpH - tooltipH - MARGIN);
  const clampLeft = (l: number) => Math.min(Math.max(l, MARGIN), vpW - tooltipW - MARGIN);

  const resolvedPlacement = (() => {
    if (placement === "right" && rect.left + rect.width + GAP + tooltipW > vpW - MARGIN) {
      return "left"; // flip to left if no room
    }
    if (placement === "left" && rect.left - GAP - tooltipW < MARGIN) {
      return "right"; // flip to right if no room
    }
    return placement ?? "bottom";
  })();

  if (resolvedPlacement === "right") {
    const left = rect.left + rect.width + GAP;
    if (left + tooltipW > vpW - MARGIN) return center();
    return { top: clampTop(rect.top + rect.height / 2 - tooltipH / 2), left, right: "auto", bottom: "auto" };
  }
  if (resolvedPlacement === "left") {
    const right = vpW - rect.left + GAP;
    if (vpW - right - tooltipW < MARGIN) return center();
    return { top: clampTop(rect.top + rect.height / 2 - tooltipH / 2), left: "auto", right, bottom: "auto" };
  }
  const cx = clampLeft(rect.left + rect.width / 2 - tooltipW / 2);

  if (resolvedPlacement === "top") {
    const topEdge = rect.top - GAP - tooltipH;
    if (topEdge < MARGIN) {
      // not enough room above — try below
      const bottomTop = rect.top + rect.height + GAP;
      if (bottomTop + tooltipH > vpH - MARGIN) return center(); // no room either side
      return { top: bottomTop, left: cx, right: "auto", bottom: "auto" };
    }
    return { top: topEdge, left: cx, right: "auto", bottom: "auto" };
  }
  // bottom
  const bottomTop = rect.top + rect.height + GAP;
  if (bottomTop + tooltipH > vpH - MARGIN) {
    // not enough room below — try above
    const topEdge = rect.top - GAP - tooltipH;
    if (topEdge < MARGIN) return center(); // no room either side
    return { top: topEdge, left: cx, right: "auto", bottom: "auto" };
  }
  return { top: bottomTop, left: cx, right: "auto", bottom: "auto" };
}

interface PageTourProps {
  tourKey: string;
  steps: PageTourStep[];
}

export function PageTour({ tourKey, steps }: PageTourProps) {
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({
    top: 0,
    left: 0,
    right: "auto",
    bottom: "auto",
  });

  const step = steps[stepIdx];

  const measure = useCallback(() => {
    const rect = step.target ? getRect(step.target) : null;
    setSpotlight(rect);
    const tw = tooltipRef.current?.offsetWidth ?? 320;
    const th = tooltipRef.current?.offsetHeight ?? 200;
    setTooltipPos(
      calcTooltipPos(rect, step.placement, tw, th, window.innerWidth, window.innerHeight)
    );
  }, [step]);

  // When the active step changes: scroll target into view (instant) then measure.
  // scrollIntoView({ behavior: "instant" }) is synchronous, so measure() called
  // right after sees the correct post-scroll getBoundingClientRect values.
  useEffect(() => {
    if (!active) return;
    if (step.target) scrollToTarget(step.target); // synchronous scrollTop mutation
    measure();                                     // getBoundingClientRect is correct immediately
  }, [active, step, measure]);

  // Auto-show on first visit to this page.
  // Wait until the global sidebar tour is done so the two don't overlap.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(tourKey)) return;
    if (!localStorage.getItem(GLOBAL_TOUR_KEY)) return;
    const t = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(t);
  }, [tourKey]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, measure]);

  const close = () => {
    setActive(false);
    localStorage.setItem(tourKey, "1");
  };

  const next = () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      close();
    }
  };

  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  if (!active) {
    return (
      <button
        onClick={() => { setStepIdx(0); setActive(true); }}
        title="Take the page tour"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[8000] w-10 h-10 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
      >
        <Sparkles className="w-4 h-4" />
      </button>
    );
  }

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[9000]" style={{ pointerEvents: "none" }}>
        {spotlight ? (
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <mask id="page-tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlight.left}
                  y={spotlight.top}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#page-tour-mask)"
            />
          </svg>
        ) : (
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
        )}

        {spotlight && (
          <div
            className="absolute rounded-xl transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: "0 0 0 2px #6366f1, 0 0 0 4px rgba(99,102,241,0.3)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Tooltip card — above overlay */}
      <div
        ref={tooltipRef}
        className="fixed z-[9100] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 transition-all duration-300"
        style={{
          top: tooltipPos.top === "auto" ? "auto" : tooltipPos.top,
          left: tooltipPos.left === "auto" ? "auto" : tooltipPos.left,
          right: tooltipPos.right === "auto" ? "auto" : tooltipPos.right,
          bottom: tooltipPos.bottom === "auto" ? "auto" : tooltipPos.bottom,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <p className="font-semibold text-gray-900 leading-tight">{step.title}</p>
          </div>
          <button
            onClick={close}
            className="text-gray-300 hover:text-gray-500 ml-2 mt-0.5 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <p className="px-5 pt-2 pb-4 text-sm text-gray-500 leading-relaxed">{step.description}</p>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === stepIdx ? "w-4 h-2 bg-indigo-600" : "w-2 h-2 bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <Button size="sm" variant="outline" onClick={prev} className="h-8 px-3 gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
            <Button size="sm" onClick={next} className="h-8 px-4 gap-1">
              {stepIdx === steps.length - 1 ? "Done" : "Next"}
              {stepIdx < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
