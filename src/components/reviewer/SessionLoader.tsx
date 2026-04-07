"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { listReviewerFiles, type WorkspaceFile } from "@/lib/api";
import { SplitView } from "./SplitView";
import { SourcePane, type SourcePaneHandle } from "./SourcePane";
import { PrimaryPane } from "./PrimaryPane";
import type { ClassifiedDocs, ReviewMode, Anchor } from "./types";

interface SessionLoaderProps {
  mode: ReviewMode;
  sessionId: string;
  primaryDocOverride?: string;
}

export function SessionLoader({
  mode,
  sessionId,
  primaryDocOverride,
}: SessionLoaderProps): JSX.Element {
  const [files, setFiles] = useState<WorkspaceFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedTexts, setExtractedTexts] = useState<Map<string, string>>(
    new Map(),
  );
  const sourcePaneRef = useRef<SourcePaneHandle>(null);

  // Load the workspace file list
  useEffect(() => {
    let cancelled = false;
    setFiles(null);
    setError(null);
    listReviewerFiles(sessionId)
      .then((fs) => {
        if (!cancelled) setFiles(fs);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load session files");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Classify files into primary + sources via the mode plugin
  const classified: ClassifiedDocs | null = useMemo(() => {
    if (!files) return null;
    return mode.classifySources(files, { primaryDocOverride });
  }, [files, mode, primaryDocOverride]);

  // Citation click handler — routes to SourcePane.scrollToAnchor
  const handleCitationClick = useCallback((anchor: Anchor) => {
    sourcePaneRef.current?.scrollToAnchor(anchor);
  }, []);

  // Called by SourcePane each time an extracted text finishes loading.
  // We lift the cache here so PrimaryPane can use it for pull-quote
  // matching without a second fetch.
  const handleExtractedTextLoaded = useCallback(
    (docId: string, text: string) => {
      setExtractedTexts((prev) => {
        if (prev.get(docId) === text) return prev;
        const next = new Map(prev);
        next.set(docId, text);
        return next;
      });
    },
    [],
  );

  // ── Render states ─────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="size-4" /> {error}
        </div>
      </div>
    );
  }

  if (!files || !classified) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!classified.primaryDoc) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <AlertCircle className="size-8 mx-auto text-amber-500" />
          <h2 className="text-lg font-medium">No primary document found</h2>
          <p className="text-sm text-stone-500">
            This session doesn't contain a {mode.slots.primary.label.toLowerCase()}
            {" "}
            ({mode.slots.primary.accept.join(" or ")}).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2 shrink-0">
        <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-mono text-stone-500">
          {sessionId.slice(0, 8)}
        </span>
        <span className="text-sm text-stone-800 font-medium truncate flex-1">
          {classified.primaryDoc.filename}
        </span>
        <span className="text-[11px] text-stone-400">{mode.label}</span>
      </div>

      {/* Split view */}
      <div className="flex-1 min-h-0">
        <SplitView
          left={
            <SourcePane
              ref={sourcePaneRef}
              sessionId={sessionId}
              sources={classified.sourceDocs}
              onExtractedTextLoaded={handleExtractedTextLoaded}
            />
          }
          right={
            <PrimaryPane
              sessionId={sessionId}
              primaryDoc={classified.primaryDoc}
              sources={classified.sourceDocs}
              mode={mode}
              onCitationClick={handleCitationClick}
              extractedTexts={extractedTexts}
            />
          }
        />
      </div>
    </div>
  );
}
