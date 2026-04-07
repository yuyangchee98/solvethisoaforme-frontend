"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { ArrowUpRight, Loader2 } from "lucide-react";

import { getReviewerFileContent } from "@/lib/api";
import {
  markdownComponents,
  preprocessMarkdown,
} from "@/components/shared/markdown-components";
import { cn } from "@/lib/utils";
import {
  CitationProvider,
  useCitationContext,
  type CitationContextValue,
} from "./CitationContext";
import type {
  Anchor,
  PullQuoteMatch,
  PrimaryDoc,
  ReviewMode,
  SourceDoc,
} from "./types";

interface PrimaryPaneProps {
  sessionId: string;
  primaryDoc: PrimaryDoc;
  sources: SourceDoc[];
  mode: ReviewMode;
  onCitationClick: (anchor: Anchor) => void;
  /**
   * Live map of extracted source text, keyed by source doc id.
   * Kept up to date by the parent (SessionLoader) as SourcePane
   * loads each source's extracted text.
   */
  extractedTexts: Map<string, string>;
}

// Sanitizer schema extended to allow our citation + pullquote data
// attributes to flow through.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "u", "del", "br", "span"],
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span || []),
      "dataCitation",
      "dataCitationKind",
      "dataCitationDocId",
      "dataCitationValue",
      "dataCitationUnresolved",
      "className",
      "title",
    ],
    blockquote: [
      ...(defaultSchema.attributes?.blockquote || []),
      "className",
    ],
  },
};

export function PrimaryPane({
  sessionId,
  primaryDoc,
  sources,
  mode,
  onCitationClick,
  extractedTexts,
}: PrimaryPaneProps): JSX.Element {
  const [rawMd, setRawMd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRawMd(null);
    setError(null);
    getReviewerFileContent(sessionId, primaryDoc.filePath)
      .then((text) => {
        if (!cancelled) setRawMd(text);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load document");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, primaryDoc.filePath]);

  // Enrich the markdown once per (md, sources) pair.
  const enrichedMd = useMemo(() => {
    if (!rawMd) return null;
    const preprocessed = preprocessMarkdown(rawMd);
    return mode.enrichMarkdown(preprocessed, sources);
  }, [rawMd, sources, mode]);

  // Build the citation context value.
  const sourcesById = useMemo(() => {
    const m = new Map<string, SourceDoc>();
    for (const s of sources) m.set(s.id, s);
    return m;
  }, [sources]);

  const contextValue = useMemo<CitationContextValue>(
    () => ({
      onCitationClick,
      matchPullQuote: (quoteText: string) =>
        mode.matchPullQuote(quoteText, extractedTexts, sources),
      sourcesById,
    }),
    [onCitationClick, mode, extractedTexts, sources, sourcesById],
  );

  // Build an extended markdown component map with citation + blockquote
  // overrides.
  const enrichedComponents = useMemo<Components>(
    () => ({
      ...(markdownComponents as unknown as Components),
      span: CitationSpan,
      blockquote: PullQuoteBlockquote,
    }),
    [],
  );

  return (
    <CitationProvider value={contextValue}>
      <div className="flex h-full flex-col">
        <div className="border-b border-stone-200 bg-white px-4 py-2">
          <div className="text-xs font-mono text-stone-400">
            {primaryDoc.filePath}
          </div>
          <div className="text-sm font-medium text-stone-800 truncate">
            {primaryDoc.filename}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          {error && (
            <div className="p-6 text-sm text-red-600">
              {error}
            </div>
          )}
          {!error && !enrichedMd && (
            <div className="flex items-center gap-2 p-6 text-sm text-stone-400">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}
          {enrichedMd && (
            <div className="p-6 text-sm max-w-3xl mx-auto">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  rehypeRaw,
                  [rehypeSanitize, sanitizeSchema],
                ]}
                components={enrichedComponents}
              >
                {enrichedMd}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </CitationProvider>
  );
}

// ── Citation span override ───────────────────────────────────────────

type SpanComponentProps = React.ClassAttributes<HTMLSpanElement> &
  React.HTMLAttributes<HTMLSpanElement> &
  ExtraProps;

function CitationSpan(props: SpanComponentProps): React.ReactElement {
  const { children, className, ...rest } = props;
  // Strip the react-markdown-specific `node` prop so it doesn't end
  // up on the DOM as an attribute.
  const { node: _node, ...domProps } = rest as Record<string, unknown>;
  // react-markdown lowercases but rehype-raw preserves camelCase-ish
  // data attributes as their original data-citation form.
  const isCitation =
    domProps["data-citation"] !== undefined ||
    className?.includes("reviewer-citation");
  const { onCitationClick } = useCitationContext();

  if (!isCitation) {
    return (
      <span className={className} {...(domProps as React.HTMLAttributes<HTMLSpanElement>)}>
        {children}
      </span>
    );
  }

  const kind = domProps["data-citation-kind"] as
    | "paragraph"
    | "figure"
    | "claim"
    | "reference"
    | undefined;
  const docId = domProps["data-citation-doc-id"] as string | undefined;
  const value = domProps["data-citation-value"] as string | undefined;
  const unresolved = domProps["data-citation-unresolved"] === "1";

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    if (unresolved || !docId || !kind) return;
    let anchor: Anchor;
    if (kind === "reference") {
      anchor = { docId, kind: "doc" };
    } else if (kind === "paragraph" && value) {
      anchor = { docId, kind: "paragraph", value };
    } else if (kind === "figure" && value) {
      anchor = { docId, kind: "figure", value };
    } else if (kind === "claim" && value) {
      anchor = { docId, kind: "claim", value };
    } else {
      anchor = { docId, kind: "doc" };
    }
    onCitationClick(anchor);
  };

  return (
    <span
      {...(domProps as React.HTMLAttributes<HTMLSpanElement>)}
      className={className}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as React.MouseEvent<HTMLSpanElement>);
        }
      }}
    >
      {children}
    </span>
  );
}

// ── Blockquote override (pull-quote matcher) ─────────────────────────

function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in (node as any)) {
    const props = (node as any).props;
    if (props && "children" in props) return extractText(props.children);
  }
  return "";
}

type BlockquoteComponentProps = React.ClassAttributes<HTMLQuoteElement> &
  React.BlockquoteHTMLAttributes<HTMLQuoteElement> &
  ExtraProps;

function PullQuoteBlockquote(props: BlockquoteComponentProps): React.ReactElement {
  const { children, className } = props;
  const ctx = useCitationContext();
  const [match, setMatch] = useState<PullQuoteMatch | null>(null);

  // Run the match whenever the children change. Scoped with useEffect
  // so we don't block render.
  useEffect(() => {
    const text = extractText(children);
    if (!text) {
      setMatch(null);
      return;
    }
    setMatch(ctx.matchPullQuote(text));
  }, [children, ctx]);

  const handleClick = () => {
    if (!match) return;
    ctx.onCitationClick({
      docId: match.docId,
      kind: "offset",
      offset: match.offset,
      length: match.length,
    });
  };

  return (
    <blockquote
      className={cn(
        "relative my-2.5 border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground italic",
        className,
      )}
    >
      {children}
      {match && (
        <button
          onClick={handleClick}
          className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          title={`Jump to ${match.label}`}
        >
          <ArrowUpRight className="size-2.5" />
          {match.label}
        </button>
      )}
    </blockquote>
  );
}
