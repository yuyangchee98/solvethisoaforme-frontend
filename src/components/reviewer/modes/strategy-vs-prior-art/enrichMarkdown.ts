/**
 * Markdown enrichment pass for the strategy-vs-prior-art mode.
 *
 * Walks the raw markdown text and replaces inline citation patterns
 * with `<span data-citation ...>` HTML elements that carry resolution
 * info. The Reviewer's PrimaryPane then pipes the result through
 * `rehype-raw` + `rehype-sanitize` (with our data attributes
 * whitelisted) so the injected HTML flows through react-markdown
 * unchanged. The `span` override in the shared markdown components
 * turns these data attributes into clickable behavior.
 *
 * Patterns handled:
 *   [0044]           → paragraph anchor on the spec
 *   Figure 3, Fig 3  → figure anchor on the spec
 *   claim 14         → claim anchor on the spec
 *   Shuler (US …)    → switch left tab to the matching prior art
 *
 * Pull-quotes are handled separately in `matchPullQuote.ts` at render
 * time because blockquote text isn't a simple regex match.
 */

import type { SourceDoc } from "../../types";
import { normalizePubKeys } from "./classifySources";

// ── Placeholder protection ───────────────────────────────────────────
//
// We don't want to mangle URLs, existing HTML tags, or fenced code
// blocks. Strategy docs rarely have code, but we should at least skip
// over anything that looks like raw HTML.

function isInsideTag(text: string, index: number): boolean {
  // Walk back to find the nearest '<' or '>' — if we hit '<' first,
  // we're inside a tag.
  for (let i = index - 1; i >= 0; i--) {
    const c = text[i];
    if (c === ">") return false;
    if (c === "<") return true;
  }
  return false;
}

// ── HTML escape (for the text embedded inside our spans) ─────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Citation span builder ────────────────────────────────────────────

interface SpanAttrs {
  kind: "paragraph" | "figure" | "claim" | "reference";
  docId: string | null; // null if unresolved
  value?: string;
  label: string; // the visible text inside the span
  className: string;
}

function buildSpan(attrs: SpanAttrs): string {
  const resolved = attrs.docId != null;
  const base = [
    "data-citation",
    `data-citation-kind="${attrs.kind}"`,
    attrs.docId ? `data-citation-doc-id="${escapeHtml(attrs.docId)}"` : 'data-citation-unresolved="1"',
    attrs.value ? `data-citation-value="${escapeHtml(attrs.value)}"` : "",
    `class="${attrs.className}${resolved ? "" : " opacity-60 cursor-not-allowed"}"`,
    `title="${resolved ? "" : "Source not in session"}"`,
  ].filter(Boolean);
  return `<span ${base.join(" ")}>${escapeHtml(attrs.label)}</span>`;
}

// ── Styling by kind ──────────────────────────────────────────────────

const CLASS_PARAGRAPH =
  "inline-block cursor-pointer rounded bg-amber-50 px-1 py-0.5 font-mono text-[0.85em] text-amber-700 hover:bg-amber-100";
const CLASS_FIGURE =
  "inline-block cursor-pointer rounded bg-sky-50 px-1 py-0.5 text-[0.85em] text-sky-700 hover:bg-sky-100";
const CLASS_CLAIM =
  "inline-block cursor-pointer rounded bg-violet-50 px-1 py-0.5 text-[0.85em] text-violet-700 hover:bg-violet-100";
const CLASS_REFERENCE =
  "inline-block cursor-pointer rounded bg-stone-100 px-1 py-0.5 text-[0.85em] text-stone-700 hover:bg-stone-200";

// ── The main enrichment pass ─────────────────────────────────────────

export function enrichMarkdown(md: string, sources: SourceDoc[]): string {
  // Pre-compute the spec doc id (first source with kind 'spec')
  const spec = sources.find((s) => s.kind === "spec");
  const specId = spec?.id ?? null;

  // Pre-compute prior-art lookups keyed by every normalized form.
  const priorArtByKey = new Map<string, SourceDoc>();
  for (const src of sources) {
    if (src.kind !== "prior_art") continue;
    for (const k of src.priorArtKeys) {
      priorArtByKey.set(k, src);
    }
  }

  // Track replacements so we can do a single pass with position
  // awareness. Each entry: { start, end, replacement }.
  interface Replacement {
    start: number;
    end: number;
    replacement: string;
  }
  const replacements: Replacement[] = [];

  const pushMatch = (start: number, end: number, html: string) => {
    // Skip if the match is inside an existing HTML tag (e.g. <span>)
    if (isInsideTag(md, start)) return;
    replacements.push({ start, end, replacement: html });
  };

  // ── Paragraph refs: [NNNN] (4+ digits) ──────────────────────────
  {
    const re = /\[(\d{4,})\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      const value = m[1];
      pushMatch(
        m.index,
        m.index + m[0].length,
        buildSpan({
          kind: "paragraph",
          docId: specId,
          value,
          label: `[${value}]`,
          className: CLASS_PARAGRAPH,
        }),
      );
    }
  }

  // ── Figure refs: Figure 3, Fig. 3, FIG. 3A ───────────────────────
  {
    const re = /\b(?:Figure|Fig\.?|FIG\.?)\s+(\d+[A-Za-z]?)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      const value = m[1];
      pushMatch(
        m.index,
        m.index + m[0].length,
        buildSpan({
          kind: "figure",
          docId: specId,
          value,
          label: m[0],
          className: CLASS_FIGURE,
        }),
      );
    }
  }

  // ── Claim refs: claim 14, claims 1-20 ────────────────────────────
  {
    const re = /\bclaims?\s+(\d+(?:\s*[-–]\s*\d+)?)\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      const value = m[1];
      pushMatch(
        m.index,
        m.index + m[0].length,
        buildSpan({
          kind: "claim",
          docId: specId,
          value,
          label: m[0],
          className: CLASS_CLAIM,
        }),
      );
    }
  }

  // ── Prior-art references: Name (US 2022/0075747) / Name (US12345678B2) ─
  {
    const re = /\b([A-Z][a-zA-Z]+)\s+\((US\s*\d[\d\s\/\-]*[A-Z0-9]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      const rawPub = m[2];
      const keys = normalizePubKeys(rawPub);
      let target: SourceDoc | null = null;
      for (const k of keys) {
        const hit = priorArtByKey.get(k);
        if (hit) {
          target = hit;
          break;
        }
      }
      pushMatch(
        m.index,
        m.index + m[0].length,
        buildSpan({
          kind: "reference",
          docId: target?.id ?? null,
          value: rawPub,
          label: m[0],
          className: CLASS_REFERENCE,
        }),
      );
    }
  }

  // ── Apply replacements ───────────────────────────────────────────
  // Sort by start position descending so later replacements don't
  // shift earlier indices. Also filter overlaps (first-match-wins
  // when two patterns target the same span).
  replacements.sort((a, b) => b.start - a.start);
  let result = md;
  let lastStart = Infinity;
  for (const r of replacements) {
    if (r.end > lastStart) continue; // overlap — skip
    result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
    lastStart = r.start;
  }

  return result;
}
