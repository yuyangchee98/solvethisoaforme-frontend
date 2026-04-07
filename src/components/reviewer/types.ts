/**
 * Reviewer — shared type definitions.
 *
 * The Reviewer is a side-by-side document reader with citation linking.
 * The shell is mode-agnostic; each concrete "mode" (e.g.
 * strategy-vs-prior-art, claims-vs-spec) plugs into the shell by
 * implementing the `ReviewMode` interface below.
 */

import type { WorkspaceFile } from "@/lib/api";

// ── Source documents ──────────────────────────────────────────────────

export type SourceDocKind =
  | "spec"
  | "office_action"
  | "prior_art"
  | "other";

/**
 * A classified source document the left pane can display. `filePath`
 * is the workspace-relative path to the raw file (e.g. PDF);
 * `extractedPath` points at the `.extracted.md` sibling if the backend
 * processor produced one, otherwise null (forcing PDF-only display).
 */
export interface SourceDoc {
  id: string; // stable slug used for tab keys and anchor docIds
  label: string; // display label in the tab strip
  kind: SourceDocKind;
  filePath: string;
  extractedPath: string | null;
  /** Normalized publication-number forms used to resolve inline refs. */
  priorArtKeys: string[];
}

/** The primary document being read (the right pane). */
export interface PrimaryDoc {
  filePath: string;
  filename: string;
}

/** Result of a mode's `classifySources` call. */
export interface ClassifiedDocs {
  primaryDoc: PrimaryDoc | null;
  sourceDocs: SourceDoc[];
}

// ── Citation anchors ──────────────────────────────────────────────────

export type Anchor =
  | { docId: string; kind: "doc" }
  | { docId: string; kind: "paragraph"; value: string }
  | { docId: string; kind: "figure"; value: string }
  | { docId: string; kind: "claim"; value: string }
  | { docId: string; kind: "offset"; offset: number; length: number };

export type CitationKind =
  | "paragraph"
  | "figure"
  | "claim"
  | "reference"
  | "pullquote";

/**
 * A pull-quote successfully matched against a source doc's extracted
 * text. Pull-quotes live at the markdown AST level (blockquote nodes)
 * and are resolved at render time via `ReviewMode.matchPullQuote`.
 */
export interface PullQuoteMatch {
  docId: string;
  offset: number;
  length: number;
  /** Short display label like "Spec ¶44" for the corner pill. */
  label: string;
}

// ── Mode plugin interface ─────────────────────────────────────────────

export interface ModeSlotSpec {
  label: string;
  /** Accepted file extensions, e.g. [".md"] or [".pdf"]. */
  accept: string[];
  multiple: boolean;
}

export interface ModeSlots {
  /** The primary doc being read (right pane). */
  primary: ModeSlotSpec;
  /** The cross-reference docs (left pane). */
  sources: ModeSlotSpec;
}

/**
 * A Reviewer mode — the unit of extension that defines a specific
 * document-pair reading experience. For v1 only
 * `strategy-vs-prior-art` ships.
 */
export interface ReviewMode {
  id: string;
  label: string;
  slots: ModeSlots;

  /**
   * Classify the workspace files into a primary doc + source docs.
   * `primaryDocOverride` lets callers (e.g. the OA-handoff URL)
   * pin a specific file as the primary doc.
   */
  classifySources(
    files: WorkspaceFile[],
    opts?: { primaryDocOverride?: string },
  ): ClassifiedDocs;

  /**
   * Inject inline citation spans into the primary markdown. Returns
   * modified markdown containing `<span data-citation ...>` HTML for
   * every detected inline citation (paragraph refs, claims, figures,
   * prior art name references). The shell pipes this through
   * react-markdown with `rehype-raw` so the injected HTML flows
   * through unchanged.
   *
   * Pull-quotes are *not* handled here — they're matched lazily at
   * render time via `matchPullQuote` because blockquote resolution
   * requires access to the extracted source text.
   */
  enrichMarkdown(md: string, sources: SourceDoc[]): string;

  /**
   * Try to locate a blockquote's literal text inside any source doc's
   * extracted text. Returns `null` if no match is found.
   */
  matchPullQuote(
    quoteText: string,
    extractedTexts: Map<string, string>,
    sources: SourceDoc[],
  ): PullQuoteMatch | null;
}
