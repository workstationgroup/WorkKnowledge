"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOUR_KEY = "wso_tour_done_v1";

interface Step {
  target?: string; // data-tour attribute value → "[data-tour='xxx']"
  title: string;
  description: string;
  placement?: "right" | "left" | "top" | "bottom" | "center";
}

const EMPLOYEE_STEPS: Step[] = [
  {
    title: "Welcome to WSO Knowledge! 👋",
    description:
      "This is Work Station Office's training platform. Let us give you a quick tour so you can start learning right away.",
    placement: "center",
  },
  {
    target: "dashboard",
    title: "Dashboard",
    description:
      "Your home screen shows your overall progress, completed lessons, and a quick overview of all categories.",
    placement: "right",
  },
  {
    target: "my-path",
    title: "My Training Path",
    description:
      "Lessons assigned to your job position appear here in order. Work through them step by step to complete your training.",
    placement: "right",
  },
  {
    target: "all-lessons",
    title: "All Lessons",
    description:
      "Browse the full lesson library. Filter by category, search by name, and click any lesson to start reading.",
    placement: "right",
  },
  {
    target: "user-profile",
    title: "Your Account",
    description:
      "Your name and email are shown here. Use the Sign out button when you're finished for the day.",
    placement: "top",
  },
];

const ADMIN_EXTRA_STEPS: Step[] = [
  {
    target: "admin-lessons",
    title: "Manage Lessons",
    description:
      "Create and publish lessons with rich content, topics, attachments (stored in SharePoint), and quizzes.",
    placement: "right",
  },
  {
    target: "admin-positions",
    title: "Positions & Templates",
    description:
      "Define job positions and attach lessons to them. Employees assigned to a position will see those lessons in their Training Path.",
    placement: "right",
  },
  {
    target: "admin-employees",
    title: "Employees",
    description:
      "Manage employee accounts, assign positions, and control which groups they belong to.",
    placement: "right",
  },
  {
    target: "admin-settings",
    title: "Settings",
    description:
      "Connect SharePoint for file storage, manage lesson categories, and configure other app-wide settings.",
    placement: "right",
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6; // spotlight padding around target

function getRect(target: string): SpotlightRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
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
  transform?: string;
}

function calcTooltipPos(
  rect: SpotlightRect | null,
  placement: Step["placement"],
  tooltipW: number,
  tooltipH: number,
  vpW: number,
  vpH: number
): TooltipPos {
  if (!rect || placement === "center") {
    return {
      top: vpH / 2 - tooltipH / 2,
      left: vpW / 2 - tooltipW / 2,
      right: "auto",
      bottom: "auto",
    };
  }

  const GAP = 16;

  if (placement === "right") {
    return {
      top: Math.min(
        Math.max(rect.top + rect.height / 2 - tooltipH / 2, 16),
        vpH - tooltipH - 16
      ),
      left: rect.left + rect.width + GAP,
      right: "auto",
      bottom: "auto",
    };
  }
  if (placement === "left") {
    return {
      top: Math.min(
        Math.max(rect.top + rect.height / 2 - tooltipH / 2, 16),
        vpH - tooltipH - 16
      ),
      left: "auto",
      right: vpW - rect.left + GAP,
      bottom: "auto",
    };
  }
  if (placement === "top") {
    return {
      top: "auto",
      bottom: vpH - rect.top + GAP,
      left: Math.min(
        Math.max(rect.left + rect.width / 2 - tooltipW / 2, 16),
        vpW - tooltipW - 16
      ),
      right: "auto",
    };
  }
  // bottom
  return {
    top: rect.top + rect.height + GAP,
    left: Math.min(
      Math.max(rect.left + rect.width / 2 - tooltipW / 2, 16),
      vpW - tooltipW - 16
    ),
    right: "auto",
    bottom: "auto",
  };
}

interface TourGuideProps {
  isAdmin: boolean;
}

export function TourGuide({ isAdmin }: TourGuideProps) {
  const steps = isAdmin ? [...EMPLOYEE_STEPS, ...ADMIN_EXTRA_STEPS] : EMPLOYEE_STEPS;
  const [active, setActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 0, left: 0, right: "auto", bottom: "auto" });

  const step = steps[stepIdx];

  const updatePositions = useCallback(() => {
    if (!active) return;
    // Confirmation screen is always centered — no spotlight
    if (showConfirm) {
      setSpotlight(null);
      const tw = tooltipRef.current?.offsetWidth ?? 320;
      const th = tooltipRef.current?.offsetHeight ?? 260;
      setTooltipPos(calcTooltipPos(null, "center", tw, th, window.innerWidth, window.innerHeight));
      return;
    }
    const rect = step.target ? getRect(step.target) : null;
    setSpotlight(rect);
    const tw = tooltipRef.current?.offsetWidth ?? 320;
    const th = tooltipRef.current?.offsetHeight ?? 200;
    setTooltipPos(calcTooltipPos(rect, step.placement, tw, th, window.innerWidth, window.innerHeight));
  }, [active, step, showConfirm]);

  // Show tour on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(TOUR_KEY)) {
      // Small delay so the page is fully rendered
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useLayoutEffect(() => {
    updatePositions();
  }, [updatePositions]);

  useEffect(() => {
    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [updatePositions]);

  const close = () => {
    setActive(false);
    setShowConfirm(false);
    localStorage.setItem(TOUR_KEY, "1");
  };

  const restart = () => {
    setShowConfirm(false);
    setStepIdx(0);
  };

  const next = () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      setShowConfirm(true);
    }
  };

  const prev = () => setStepIdx((i) => Math.max(0, i - 1));

  if (!active) {
    return (
      <button
        onClick={() => { setStepIdx(0); setActive(true); }}
        data-tour="help-btn"
        title="Take the tour"
        className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Take the tour
      </button>
    );
  }

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[9000]" style={{ pointerEvents: "none" }}>
        {/* SVG cutout overlay */}
        {spotlight ? (
          <svg
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0 }}
          >
            <defs>
              <mask id="tour-mask">
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
              mask="url(#tour-mask)"
            />
          </svg>
        ) : (
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
        )}

        {/* Spotlight border ring */}
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
        {showConfirm ? (
          /* ── Confirmation screen ── */
          <div className="px-5 py-6 text-center">
            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-indigo-600" />
            </div>
            <p className="font-semibold text-gray-900 text-base mb-1">Ready to get started?</p>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Do you feel confident using WSO Knowledge? You can always replay this tour from the sidebar.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={close} className="w-full gap-2">
                <CheckCircle2 className="w-4 h-4" /> Yes, I&apos;m ready!
              </Button>
              <Button variant="outline" onClick={restart} className="w-full gap-2 text-gray-600">
                <RefreshCw className="w-3.5 h-3.5" /> Take the tour again
              </Button>
            </div>
          </div>
        ) : (
          /* ── Normal step ── */
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <p className="font-semibold text-gray-900 leading-tight">{step.title}</p>
              </div>
              <button onClick={close} className="text-gray-300 hover:text-gray-500 ml-2 mt-0.5 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <p className="px-5 pt-2 pb-4 text-sm text-gray-500 leading-relaxed">{step.description}</p>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between">
              {/* Step dots */}
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

              {/* Buttons */}
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
          </>
        )}
      </div>
    </>
  );
}
