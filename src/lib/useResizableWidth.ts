import { useCallback, useRef, useState } from "react";

interface UseResizableWidthOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth: number | (() => number);
  onWidthChange: (width: number) => void;
}

export function useResizableWidth({
  initialWidth,
  minWidth,
  maxWidth,
  onWidthChange,
}: UseResizableWidthOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, width: 0 });

  const resolveMax = () =>
    typeof maxWidth === "function" ? maxWidth() : maxWidth;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      startRef.current = { x: e.clientX, width: initialWidth };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      draggingRef.current = true;
      setIsDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [initialWidth],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const delta = startRef.current.x - e.clientX; // left = wider
      const next = Math.min(
        resolveMax(),
        Math.max(minWidth, startRef.current.width + delta),
      );
      onWidthChange(next);
    },
    [minWidth, maxWidth, onWidthChange],
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return {
    isDragging,
    handleProps: { onPointerDown, onPointerMove, onPointerUp },
  };
}
