"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

const SYNC_INTERVAL_MS = 30_000; // send to server every 30 s
const DISPLAY_INTERVAL_MS = 1_000; // update the UI every 1 s
const MAX_SECONDS_PER_PING = 3_600; // hard cap (1 h) to match server

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

interface LessonTimeTrackerProps {
  lessonId: string;
  initialSeconds: number; // already-stored time from DB
}

export function LessonTimeTracker({ lessonId, initialSeconds }: LessonTimeTrackerProps) {
  // Live display total (initialSeconds + current session)
  const [displaySeconds, setDisplaySeconds] = useState(initialSeconds);

  // Refs — mutable state that must not trigger re-renders
  const activeStartRef = useRef<number | null>(null); // timestamp of when current active period began
  const pendingRef = useRef(0);                       // seconds accumulated but not yet sent to server
  const isActiveRef = useRef(false);

  const sendToServer = useCallback(
    (secs: number) => {
      if (secs <= 0) return;
      const capped = Math.min(secs, MAX_SECONDS_PER_PING);
      const url = `/api/lessons/${lessonId}/time`;
      const body = JSON.stringify({ seconds: capped });
      // sendBeacon works even during page unload; fall back to keepalive fetch
      try {
        const sent = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        if (!sent) throw new Error("sendBeacon returned false");
      } catch {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {/* best-effort */});
      }
    },
    [lessonId]
  );

  // Snapshot elapsed time from the current active period into pendingRef.
  // Returns elapsed seconds (0 if not active).
  const snapshotElapsed = useCallback((): number => {
    if (!isActiveRef.current || activeStartRef.current === null) return 0;
    const elapsed = Math.floor((Date.now() - activeStartRef.current) / 1000);
    activeStartRef.current = Date.now(); // reset start so we don't double-count
    pendingRef.current += elapsed;
    return elapsed;
  }, []);

  useEffect(() => {
    // Start tracking only if tab is visible
    if (!document.hidden) {
      isActiveRef.current = true;
      activeStartRef.current = Date.now();
    }

    // ── Display ticker (every 1 s) ─────────────────────────────────────
    const displayTimer = setInterval(() => {
      if (isActiveRef.current && activeStartRef.current !== null) {
        const sessionSecs = Math.floor((Date.now() - activeStartRef.current) / 1000);
        setDisplaySeconds(initialSeconds + pendingRef.current + sessionSecs);
      }
    }, DISPLAY_INTERVAL_MS);

    // ── Server sync (every 30 s) ───────────────────────────────────────
    const syncTimer = setInterval(() => {
      snapshotElapsed();
      if (pendingRef.current > 0) {
        sendToServer(pendingRef.current);
        pendingRef.current = 0;
      }
    }, SYNC_INTERVAL_MS);

    // ── Tab visibility ─────────────────────────────────────────────────
    const onVisibility = () => {
      if (document.hidden) {
        snapshotElapsed();
        isActiveRef.current = false;
        // Flush immediately when user leaves the tab
        if (pendingRef.current > 0) {
          sendToServer(pendingRef.current);
          pendingRef.current = 0;
        }
      } else {
        isActiveRef.current = true;
        activeStartRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    // ── Cleanup / page leave ───────────────────────────────────────────
    return () => {
      clearInterval(displayTimer);
      clearInterval(syncTimer);
      document.removeEventListener("visibilitychange", onVisibility);

      // Final flush on component unmount (navigation away)
      snapshotElapsed();
      if (pendingRef.current > 0) {
        sendToServer(pendingRef.current);
        pendingRef.current = 0;
      }
    };
  // initialSeconds intentionally excluded — we only want to read it once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, sendToServer, snapshotElapsed]);

  return (
    <div className="flex items-center gap-1.5 text-sm text-gray-400">
      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{formatTime(displaySeconds)} spent on this lesson</span>
    </div>
  );
}
