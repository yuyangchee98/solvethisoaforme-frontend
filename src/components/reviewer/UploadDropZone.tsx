"use client";

import { useCallback, useRef, useState } from "react";
import {
  FileText,
  FileUp,
  Loader2,
  Upload,
  X,
  Check,
  AlertCircle,
  Clipboard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createReviewerSession,
  uploadReviewerStrategy,
  uploadReviewerStrategyText,
  uploadReviewerSource,
  type ReviewerSourceUploadResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ReviewMode } from "./types";

interface UploadDropZoneProps {
  mode: ReviewMode;
}

type StrategyInput =
  | { kind: "file"; file: File }
  | { kind: "text"; content: string; filename: string };

interface SourceProgress {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  extracted?: boolean;
  pages?: number | null;
}

export function UploadDropZone({ mode }: UploadDropZoneProps): JSX.Element {
  const [strategy, setStrategy] = useState<StrategyInput | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [pasteFilename, setPasteFilename] = useState("strategy.md");
  const [sources, setSources] = useState<SourceProgress[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const strategyInputRef = useRef<HTMLInputElement>(null);
  const sourcesInputRef = useRef<HTMLInputElement>(null);

  // ── Strategy file handling ────────────────────────────────────────
  const handleStrategyFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!mode.slots.primary.accept.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setSubmitError(
        `Strategy doc must be ${mode.slots.primary.accept.join(" or ")}`,
      );
      return;
    }
    setSubmitError(null);
    setStrategy({ kind: "file", file: f });
  }, [mode]);

  // ── Source file handling ──────────────────────────────────────────
  const handleSourceFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next: SourceProgress[] = [];
    for (const f of Array.from(files)) {
      if (!mode.slots.sources.accept.some((ext) => f.name.toLowerCase().endsWith(ext))) {
        continue;
      }
      next.push({ file: f, status: "queued" });
    }
    if (next.length === 0) {
      setSubmitError(
        `Source documents must be ${mode.slots.sources.accept.join(" or ")}`,
      );
      return;
    }
    setSubmitError(null);
    setSources((prev) => [...prev, ...next]);
  }, [mode]);

  const removeSource = (i: number) => {
    setSources((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Drag-and-drop handlers ────────────────────────────────────────
  function onStrategyDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleStrategyFiles(e.dataTransfer.files);
  }
  function onSourcesDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    handleSourceFiles(e.dataTransfer.files);
  }
  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  // ── Submit ─────────────────────────────────────────────────────────
  const canSubmit =
    !submitting &&
    sources.length > 0 &&
    (strategy !== null ||
      (pasteMode && pasteContent.trim().length > 0));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    let sessionId: string;
    try {
      const session = await createReviewerSession();
      sessionId = session.id;
    } catch (err) {
      setSubmitting(false);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create session",
      );
      return;
    }

    // Upload strategy
    try {
      if (pasteMode) {
        await uploadReviewerStrategyText(
          sessionId,
          pasteFilename || "strategy.md",
          pasteContent,
        );
      } else if (strategy?.kind === "file") {
        await uploadReviewerStrategy(sessionId, strategy.file);
      }
    } catch (err) {
      setSubmitting(false);
      setSubmitError(
        err instanceof Error ? err.message : "Failed to upload strategy",
      );
      return;
    }

    // Upload sources sequentially so we can show per-file progress
    for (let i = 0; i < sources.length; i++) {
      setSources((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: "uploading" };
        return next;
      });
      try {
        const result: ReviewerSourceUploadResponse = await uploadReviewerSource(
          sessionId,
          sources[i].file,
        );
        setSources((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: result.error ? "error" : "done",
            error: result.error ?? undefined,
            extracted: result.extracted,
            pages: result.pages,
          };
          return next;
        });
      } catch (err) {
        setSources((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          };
          return next;
        });
      }
    }

    // Redirect to the reader view
    window.location.href = `/reviewer?session=${sessionId}`;
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col items-center justify-start overflow-auto bg-stone-50 px-4 py-10">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-stone-900">
            {mode.label}
          </h1>
          <p className="text-sm text-stone-500">
            Upload a {mode.slots.primary.label.toLowerCase()} and the source
            documents it references to open them side-by-side with citation
            linking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strategy slot */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-stone-700">
                {mode.slots.primary.label}
              </h2>
              <button
                onClick={() => setPasteMode((m) => !m)}
                className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-700 transition-colors"
              >
                <Clipboard className="size-3" />
                {pasteMode ? "Upload file" : "Paste markdown"}
              </button>
            </div>

            {!pasteMode ? (
              <div
                onDrop={onStrategyDrop}
                onDragOver={onDragOver}
                onClick={() => strategyInputRef.current?.click()}
                className={cn(
                  "rounded-lg border-2 border-dashed border-stone-200 bg-stone-50/50 p-6 text-center cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-colors",
                  strategy && "border-amber-400 bg-amber-50/40",
                )}
              >
                <input
                  ref={strategyInputRef}
                  type="file"
                  accept={mode.slots.primary.accept.join(",")}
                  onChange={(e) => handleStrategyFiles(e.target.files)}
                  className="hidden"
                />
                {!strategy && (
                  <div className="space-y-1">
                    <FileText className="size-6 mx-auto text-stone-400" />
                    <p className="text-xs text-stone-500">
                      Drop a {mode.slots.primary.accept.join("/")} file here,
                      or click to select
                    </p>
                  </div>
                )}
                {strategy?.kind === "file" && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <Check className="size-4 text-emerald-500" />
                    <span className="font-mono text-stone-700">
                      {strategy.file.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStrategy(null);
                      }}
                      className="text-stone-400 hover:text-red-500"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={pasteFilename}
                  onChange={(e) => setPasteFilename(e.target.value)}
                  className="w-full rounded-md border border-stone-200 px-2 py-1 text-xs font-mono"
                  placeholder="strategy.md"
                />
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  rows={10}
                  className="w-full rounded-md border border-stone-200 px-2 py-1 text-xs font-mono resize-y"
                  placeholder="# Strategy&#10;&#10;Paste your markdown here..."
                />
              </div>
            )}
          </div>

          {/* Sources slot */}
          <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-medium text-stone-700">
              {mode.slots.sources.label}
            </h2>
            <div
              onDrop={onSourcesDrop}
              onDragOver={onDragOver}
              onClick={() => sourcesInputRef.current?.click()}
              className={cn(
                "rounded-lg border-2 border-dashed border-stone-200 bg-stone-50/50 p-6 text-center cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-colors",
                sources.length > 0 && "border-amber-400 bg-amber-50/40",
              )}
            >
              <input
                ref={sourcesInputRef}
                type="file"
                accept={mode.slots.sources.accept.join(",")}
                multiple
                onChange={(e) => handleSourceFiles(e.target.files)}
                className="hidden"
              />
              <div className="space-y-1">
                <FileUp className="size-6 mx-auto text-stone-400" />
                <p className="text-xs text-stone-500">
                  Drop {mode.slots.sources.accept.join("/")} files here, or
                  click to select
                </p>
              </div>
            </div>
            {sources.length > 0 && (
              <ul className="space-y-1 max-h-48 overflow-auto">
                {sources.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md bg-stone-50 px-2 py-1 text-xs"
                  >
                    {s.status === "queued" && (
                      <FileText className="size-3.5 text-stone-400" />
                    )}
                    {s.status === "uploading" && (
                      <Loader2 className="size-3.5 animate-spin text-amber-500" />
                    )}
                    {s.status === "done" && (
                      <Check className="size-3.5 text-emerald-500" />
                    )}
                    {s.status === "error" && (
                      <AlertCircle className="size-3.5 text-red-500" />
                    )}
                    <span className="flex-1 truncate font-mono">
                      {s.file.name}
                    </span>
                    {s.pages != null && s.status === "done" && (
                      <span className="text-stone-400">
                        {s.pages}p{s.extracted ? "" : " (no text)"}
                      </span>
                    )}
                    {s.status === "error" && (
                      <span className="text-red-500 truncate max-w-[10rem]">
                        {s.error}
                      </span>
                    )}
                    {!submitting && (
                      <button
                        onClick={() => removeSource(i)}
                        className="text-stone-400 hover:text-red-500"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {submitError && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="size-4" /> {submitError}
          </div>
        )}

        <div className="flex items-center justify-center">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Opening…
              </>
            ) : (
              <>
                <Upload className="size-4" /> Open Reviewer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
