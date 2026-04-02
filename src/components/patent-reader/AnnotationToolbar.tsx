import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANNOTATION_COLORS,
  ANNOTATION_DOT_CLASSES,
  type AnnotationColor,
  type PendingAnnotation,
} from "./annotation-types";

interface AnnotationToolbarProps {
  pending: PendingAnnotation;
  onSave: (color: AnnotationColor, note: string) => void;
  onCancel: () => void;
  /** If true, show the hard gate message instead of the toolbar */
  hardGate?: boolean;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function AnnotationToolbar({
  pending,
  onSave,
  onCancel,
  hardGate,
  scrollContainerRef,
}: AnnotationToolbarProps) {
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>("yellow");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Position relative to scroll container
  const container = scrollContainerRef.current;
  const containerRect = container?.getBoundingClientRect();
  const scrollTop = container?.scrollTop ?? 0;

  const top = pending.rect.top - (containerRect?.top ?? 0) + scrollTop - 8;
  const left = pending.rect.left - (containerRect?.left ?? 0) + pending.rect.width / 2;

  // Click outside to dismiss
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    // Delay to avoid the mouseup that created the selection from immediately closing
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onCancel]);

  // Escape to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  // Focus note when expanded
  useEffect(() => {
    if (showNote) noteRef.current?.focus();
  }, [showNote]);

  const handleSave = useCallback(() => {
    onSave(selectedColor, note);
  }, [onSave, selectedColor, note]);

  if (hardGate) {
    return (
      <div
        ref={toolbarRef}
        className="absolute z-50 -translate-x-1/2 -translate-y-full"
        style={{ top, left }}
      >
        <div className="bg-white rounded-lg shadow-lg border border-stone-200 px-4 py-3 text-center max-w-xs">
          <p className="text-sm text-stone-700 mb-2">
            Free annotation limit reached. Create a free account to continue.
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href="/login?tab=register"
              className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-md transition-colors"
            >
              Create Account
            </a>
            <a
              href="/login"
              className="text-xs font-medium text-stone-600 hover:text-stone-800 px-3 py-1.5 rounded-md border border-stone-200 hover:border-stone-300 transition-colors"
            >
              Log In
            </a>
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
      </div>
    );
  }

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 -translate-x-1/2 -translate-y-full"
      style={{ top, left }}
    >
      <div className="bg-white rounded-lg shadow-lg border border-stone-200 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          {/* Color circles */}
          {ANNOTATION_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setSelectedColor(color);
                if (!showNote) onSave(color, note);
              }}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                ANNOTATION_DOT_CLASSES[color],
                selectedColor === color && showNote
                  ? "border-stone-600 scale-110"
                  : "border-transparent",
              )}
              title={color}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-stone-200 mx-0.5" />

          {/* Note toggle */}
          <button
            type="button"
            onClick={() => setShowNote(!showNote)}
            className={cn(
              "p-1 rounded hover:bg-stone-100 transition-colors",
              showNote ? "text-amber-600" : "text-stone-400",
            )}
            title="Add note"
          >
            <MessageSquarePlus className="size-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:bg-stone-100 text-stone-400 transition-colors"
            title="Cancel"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Note input */}
        {showNote && (
          <div className="mt-2 flex gap-1.5">
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="flex-1 text-xs border border-stone-200 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSave();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSave}
              className="self-end text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 rounded-md transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Arrow pointing down to the selection */}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white" />
    </div>
  );
}
