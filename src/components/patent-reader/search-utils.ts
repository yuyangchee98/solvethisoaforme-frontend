import type { Patent } from "./types";

// ── Types ─────────────────────────────────────────────────────────────

export interface SearchTerm {
  id: string;
  term: string;
  termIndex: number;
}

export interface SearchHighlightSpan {
  start: number;
  end: number;
  termIndex: number;
}

export interface SearchHighlights {
  abstract: SearchHighlightSpan[];
  /** description[sectionIndex][paragraphIndex] */
  description: SearchHighlightSpan[][][];
  /** claims[claimIndex] */
  claims: SearchHighlightSpan[][];
}

export interface SearchOccurrence {
  termIndex: number;
  section: string;
  snippet: string;
  /** Index within all `data-search-occurrence` elements for this term */
  globalOccurrenceIndex: number;
}

export interface SearchOptions {
  wholeWord: boolean;
  caseSensitive: boolean;
}

// ── Colors ────────────────────────────────────────────────────────────
// Distinct from ELEMENT_COLORS (*-100/60) and amber numerals
export const SEARCH_COLORS = [
  "bg-yellow-200/70",
  "bg-green-200/70",
  "bg-blue-200/70",
  "bg-red-200/70",
  "bg-purple-200/70",
  "bg-orange-200/70",
];

// ── Helpers ───────────────────────────────────────────────────────────

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function findAllMatches(
  text: string,
  terms: SearchTerm[],
  options?: SearchOptions,
): SearchHighlightSpan[] {
  const spans: SearchHighlightSpan[] = [];
  for (const { term, termIndex } of terms) {
    if (!term) continue;
    let pattern = escapeRegex(term);
    if (options?.wholeWord) pattern = `\\b${pattern}\\b`;
    const flags = options?.caseSensitive ? "g" : "gi";
    const regex = new RegExp(pattern, flags);
    for (const match of text.matchAll(regex)) {
      spans.push({
        start: match.index!,
        end: match.index! + match[0].length,
        termIndex,
      });
    }
  }
  // Sort by start position, then longer spans first for overlaps
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  // Remove overlapping spans (keep first/longest)
  const result: SearchHighlightSpan[] = [];
  let lastEnd = -1;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      result.push(span);
      lastEnd = span.end;
    }
  }
  return result;
}

// ── Compute functions ─────────────────────────────────────────────────

export function computeSearchHighlights(
  patent: Patent,
  searchTerms: SearchTerm[],
  options?: SearchOptions,
): SearchHighlights {
  if (searchTerms.length === 0) {
    return { abstract: [], description: [], claims: [] };
  }

  return {
    abstract: findAllMatches(patent.abstract, searchTerms, options),
    description: patent.description.map((section) =>
      section.paragraphs.map((para) => findAllMatches(para.text, searchTerms, options)),
    ),
    claims: patent.claims.map((claim) =>
      findAllMatches(claim.text, searchTerms, options),
    ),
  };
}

export function computeSearchOccurrences(
  patent: Patent,
  searchTerms: SearchTerm[],
  options?: SearchOptions,
): SearchOccurrence[] {
  if (searchTerms.length === 0) return [];

  const results: SearchOccurrence[] = [];
  // Track global occurrence index per term (must match DOM order of <mark> elements)
  const termCounters: Record<number, number> = {};
  for (const t of searchTerms) termCounters[t.termIndex] = 0;

  // Use findAllMatches (same dedup as highlights) to stay consistent with rendered marks
  const addFromText = (text: string, section: string) => {
    const spans = findAllMatches(text, searchTerms, options);
    for (const span of spans) {
      const start = Math.max(0, span.start - 40);
      const end = Math.min(text.length, span.end + 40);
      let snippet = text.slice(start, end).replace(/\s+/g, " ");
      if (start > 0) snippet = "\u2026" + snippet;
      if (end < text.length) snippet = snippet + "\u2026";
      results.push({
        termIndex: span.termIndex,
        section,
        snippet,
        globalOccurrenceIndex: termCounters[span.termIndex]!,
      });
      termCounters[span.termIndex]!++;
    }
  };

  addFromText(patent.abstract, "Abstract");
  for (const sec of patent.description) {
    for (const para of sec.paragraphs) {
      addFromText(para.text, titleCase(sec.heading));
    }
  }
  for (const claim of patent.claims) {
    addFromText(claim.text, `Claim ${claim.number}`);
  }
  return results;
}
