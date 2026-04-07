"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Initial left-pane width as a fraction of container width (0..1). */
  initialLeftFraction?: number;
  minLeftPx?: number;
  minRightPx?: number;
}

/**
 * A two-pane horizontally resizable split view with a draggable
 * divider. Left pane grows when you drag the divider to the right.
 *
 * Uses a container-relative fraction so it behaves sensibly across
 * viewport sizes, falling back to pixel-based min widths at the edges.
 */
export function SplitView({
  left,
  right,
  initialLeftFraction = 0.55,
  minLeftPx = 320,
  minRightPx = 360,
}: SplitViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftFraction, setLeftFraction] = useState(initialLeftFraction);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      const total = rect.width;
      // Apply min constraints in px before converting to fraction
      const clamped = Math.max(
        minLeftPx,
        Math.min(total - minRightPx, offset),
      );
      setLeftFraction(clamped / total);
    },
    [minLeftPx, minRightPx],
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  // Re-clamp on resize so we don't leave one pane below its minimum.
  useEffect(() => {
    const handle = () => {
      const container = containerRef.current;
      if (!container) return;
      const total = container.getBoundingClientRect().width;
      if (total === 0) return;
      const current = leftFraction * total;
      const clamped = Math.max(
        minLeftPx,
        Math.min(total - minRightPx, current),
      );
      if (Math.abs(clamped - current) > 0.5) {
        setLeftFraction(clamped / total);
      }
    };
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [leftFraction, minLeftPx, minRightPx]);

  return (
    <div ref={containerRef} className="flex h-full w-full min-h-0">
      <div
        className="h-full min-h-0 overflow-hidden border-r border-stone-200"
        style={{ width: `${leftFraction * 100}%` }}
      >
        {left}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          "group relative w-1 shrink-0 cursor-col-resize bg-stone-100 hover:bg-amber-300 transition-colors",
          isDragging && "bg-amber-400",
        )}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
      <div
        className="h-full min-h-0 flex-1 overflow-hidden"
      >
        {right}
      </div>
    </div>
  );
}
