"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { FileText, FileSearch2 } from "lucide-react";

import { getReviewerFileContent, getReviewerFileUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import { PDFViewer } from "@/components/assistant-ui/pdf-viewer";
import {
  markdownComponents,
  preprocessMarkdown,
} from "@/components/shared/markdown-components";
import { cn } from "@/lib/utils";
import type { Anchor, SourceDoc } from "./types";

// ── Imperative API ───────────────────────────────────────────────────

export interface SourcePaneHandle {
  /** Switch to a doc tab and scroll to the given anchor. */
  scrollToAnchor: (anchor: Anchor) => void;
  /** Get the currently-cached extracted text for a doc, if any. */
  getExtractedText: (docId: string) => string | undefined;
}

// ── Component ────────────────────────────────────────────────────────

interface SourcePaneProps {
  sessionId: string;
  sources: SourceDoc[];
  /** Called once per source doc as its extracted text finishes loading. */
  onExtractedTextLoaded?: (docId: string, text: string) => void;
}

type ViewMode = "text" | "pdf";

function preprocessExtractedMarkdown(md: string): string {
  // Wrap every [NNNN] paragraph leader in an anchor span so
  // scrollToAnchor can find it. We only wrap the first occurrence
  // per paragraph number; subsequent [NNNN] references stay raw.
  const seen = new Set<string>();
  return md.replace(/\[(\d{3,})\]/g, (match, num) => {
    if (seen.has(num)) return match;
    seen.add(num);
    return `<span data-paragraph="${num}">${match}</span>`;
  });
}

const textSanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "u", "del", "br", "span"],
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span || []), "dataParagraph"],
  },
};

export const SourcePane = forwardRef<SourcePaneHandle, SourcePaneProps>(
  function SourcePane(
    { sessionId, sources, onExtractedTextLoaded },
    ref,
  ): JSX.Element {
    const [activeDocId, setActiveDocId] = useState<string>(
      () => sources[0]?.id ?? "",
    );
    const [viewModes, setViewModes] = useState<Map<string, ViewMode>>(() => {
      const m = new Map<string, ViewMode>();
      for (const s of sources) {
        m.set(s.id, s.extractedPath ? "text" : "pdf");
      }
      return m;
    });

    // Per-doc extracted text cache. Loaded lazily on first access.
    const [extractedTexts, setExtractedTexts] = useState<Map<string, string>>(
      new Map(),
    );
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

    const sourcesById = useMemo(() => {
      const m = new Map<string, SourceDoc>();
      for (const s of sources) m.set(s.id, s);
      return m;
    }, [sources]);

    const activeSource = sourcesById.get(activeDocId) ?? null;
    const activeMode = viewModes.get(activeDocId) ?? "pdf";

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // ── Extracted-text loader ─────────────────────────────────────
    const loadExtractedText = useCallback(
      async (src: SourceDoc): Promise<string | null> => {
        if (!src.extractedPath) return null;
        if (extractedTexts.has(src.id)) return extractedTexts.get(src.id)!;
        if (loadingIds.has(src.id)) return null;
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.add(src.id);
          return next;
        });
        try {
          const text = await getReviewerFileContent(
            sessionId,
            src.extractedPath,
          );
          setExtractedTexts((prev) => {
            const next = new Map(prev);
            next.set(src.id, text);
            return next;
          });
          onExtractedTextLoaded?.(src.id, text);
          return text;
        } catch (err) {
          console.error("Failed to load extracted text for", src.id, err);
          return null;
        } finally {
          setLoadingIds((prev) => {
            const next = new Set(prev);
            next.delete(src.id);
            return next;
          });
        }
      },
      [sessionId, extractedTexts, loadingIds, onExtractedTextLoaded],
    );

    // Preload extracted text for the initial active doc + all docs
    // (for pull-quote matching across the whole corpus).
    useEffect(() => {
      for (const src of sources) {
        if (src.extractedPath && !extractedTexts.has(src.id)) {
          loadExtractedText(src);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sources]);

    // ── Flash highlight helper ────────────────────────────────────
    const flash = useCallback((el: Element) => {
      el.classList.add("reviewer-flash");
      window.setTimeout(() => {
        el.classList.remove("reviewer-flash");
      }, 1600);
    }, []);

    // ── Scroll-to-anchor implementation ───────────────────────────
    const doScroll = useCallback(
      (anchor: Anchor) => {
        const container = scrollContainerRef.current;
        if (!container) return;
        let target: Element | null = null;
        if (anchor.kind === "paragraph") {
          target = container.querySelector(
            `[data-paragraph="${CSS.escape(anchor.value)}"]`,
          );
        } else if (anchor.kind === "figure") {
          target = findHeadingContaining(container, ["drawing", "figure"]);
        } else if (anchor.kind === "claim") {
          target = findHeadingContaining(container, ["claim"]);
        } else if (anchor.kind === "offset") {
          target = findOffsetNode(container, anchor.offset, anchor.length);
        }
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(target);
      },
      [flash],
    );

    // ── Imperative handle ─────────────────────────────────────────
    useImperativeHandle(
      ref,
      (): SourcePaneHandle => ({
        scrollToAnchor: (anchor) => {
          // Switch tab if needed, then scroll
          if (anchor.docId && anchor.docId !== activeDocId) {
            setActiveDocId(anchor.docId);
            // Defer the scroll until after the tab render settles
            requestAnimationFrame(() => {
              requestAnimationFrame(() => doScroll(anchor));
            });
          } else {
            doScroll(anchor);
          }
        },
        getExtractedText: (docId) => extractedTexts.get(docId),
      }),
      [activeDocId, doScroll, extractedTexts],
    );

    // ── Render ────────────────────────────────────────────────────
    return (
      <div className="flex h-full flex-col">
        {/* Tab strip */}
        <div className="flex items-stretch gap-1 overflow-x-auto border-b border-stone-200 bg-stone-50 px-2">
          {sources.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-stone-500">
              <FileSearch2 className="size-4" /> No source documents
            </div>
          )}
          {sources.map((src) => (
            <button
              key={src.id}
              onClick={() => setActiveDocId(src.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors",
                src.id === activeDocId
                  ? "border-amber-500 text-stone-900"
                  : "border-transparent text-stone-500 hover:text-stone-700",
              )}
              title={src.filePath}
            >
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate max-w-[14rem]">{src.label}</span>
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        {activeSource && (
          <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-3 py-1.5">
            <span className="text-[11px] text-stone-400 font-mono truncate flex-1">
              {activeSource.filePath}
            </span>
            <div className="flex rounded-md border border-stone-200 overflow-hidden text-[11px]">
              <button
                disabled={!activeSource.extractedPath}
                onClick={() =>
                  setViewModes((m) => {
                    const next = new Map(m);
                    next.set(activeSource.id, "text");
                    return next;
                  })
                }
                className={cn(
                  "px-2 py-0.5 transition-colors",
                  activeMode === "text"
                    ? "bg-stone-800 text-white"
                    : "bg-white text-stone-500 hover:text-stone-700",
                  !activeSource.extractedPath &&
                    "opacity-40 cursor-not-allowed",
                )}
                title={
                  activeSource.extractedPath
                    ? "View extracted text"
                    : "No extracted text available for this doc"
                }
              >
                Text
              </button>
              <button
                onClick={() =>
                  setViewModes((m) => {
                    const next = new Map(m);
                    next.set(activeSource.id, "pdf");
                    return next;
                  })
                }
                className={cn(
                  "px-2 py-0.5 transition-colors border-l border-stone-200",
                  activeMode === "pdf"
                    ? "bg-stone-800 text-white"
                    : "bg-white text-stone-500 hover:text-stone-700",
                )}
              >
                PDF
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto bg-white"
        >
          {activeSource && activeMode === "text" && (
            <ExtractedTextView
              key={activeSource.id}
              text={extractedTexts.get(activeSource.id)}
              loading={loadingIds.has(activeSource.id)}
            />
          )}
          {activeSource && activeMode === "pdf" && (
            <div className="p-4">
              <PDFViewer
                src={{
                  url: getReviewerFileUrl(sessionId, activeSource.filePath),
                  httpHeaders: authHeaders(),
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

// ── Helpers ──────────────────────────────────────────────────────────

function ExtractedTextView({
  text,
  loading,
}: {
  text: string | undefined;
  loading: boolean;
}): JSX.Element {
  if (loading && !text) {
    return (
      <div className="p-6 text-xs text-stone-400">
        Loading extracted text…
      </div>
    );
  }
  if (!text) {
    return (
      <div className="p-6 text-xs text-stone-400">
        No extracted text available.
      </div>
    );
  }
  return (
    <div className="p-6 text-sm leading-relaxed text-stone-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, textSanitizeSchema],
        ]}
        components={markdownComponents}
      >
        {preprocessExtractedMarkdown(preprocessMarkdown(text))}
      </ReactMarkdown>
    </div>
  );
}

function findHeadingContaining(
  container: Element,
  needles: string[],
): Element | null {
  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  for (const h of Array.from(headings)) {
    const text = h.textContent?.toLowerCase() ?? "";
    if (needles.some((n) => text.includes(n))) return h;
  }
  return null;
}

function findOffsetNode(
  container: Element,
  offset: number,
  length: number,
): Element | null {
  // Walk text nodes until we've seen `offset` characters of content,
  // then return the parent element of the text node that contains
  // the offset. This is approximate but good enough for scroll + flash.
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
  );
  let seen = 0;
  let node: Node | null = walker.nextNode();
  while (node) {
    const len = node.textContent?.length ?? 0;
    if (seen + len >= offset) {
      const parent = node.parentElement;
      return parent;
    }
    seen += len;
    node = walker.nextNode();
  }
  return null;
}
