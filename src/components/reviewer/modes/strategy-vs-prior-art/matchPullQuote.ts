/**
 * Pull-quote matcher for the strategy-vs-prior-art mode.
 *
 * Takes the literal text of a blockquote from the strategy and tries
 * to locate it inside each source doc's extracted text. The first
 * match wins. Match is done by whitespace-normalized substring
 * search — we don't attempt any fuzzy/edit-distance matching because
 * the agent quotes prior art verbatim.
 */

import type { PullQuoteMatch, SourceDoc } from "../../types";

/** Collapse runs of whitespace to a single space and trim. */
function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Strip surrounding quotes (straight or curly) from a blockquote body. */
function stripQuotes(s: string): string {
  return s
    .replace(/^[\s"'“”‘’]+/, "")
    .replace(/[\s"'“”‘’]+$/, "");
}

/** Minimum length to attempt a match — avoids matching single words. */
const MIN_QUOTE_LENGTH = 20;

/**
 * Build a short label for the pill shown on a matched pull-quote,
 * e.g. "Spec ¶44" when we know the paragraph number.
 */
function buildLabel(
  source: SourceDoc,
  extractedText: string,
  offset: number,
): string {
  // Scan backwards from the match for the nearest [NNNN] paragraph
  // leader — this gives us a human-readable location if present.
  const windowStart = Math.max(0, offset - 400);
  const window = extractedText.slice(windowStart, offset + 1);
  const lastBracket = window.match(/\[(\d{3,})\][^\[]*$/);
  if (lastBracket) {
    const paraNum = parseInt(lastBracket[1], 10);
    return `${source.label} ¶${paraNum}`;
  }
  return source.label;
}

/**
 * Try to match a blockquote's text against the provided source docs.
 * Returns the first successful match, or null if no source contains
 * the quote.
 */
export function matchPullQuote(
  quoteText: string,
  extractedTexts: Map<string, string>,
  sources: SourceDoc[],
): PullQuoteMatch | null {
  const needle = normalize(stripQuotes(quoteText));
  if (needle.length < MIN_QUOTE_LENGTH) return null;

  for (const src of sources) {
    const extracted = extractedTexts.get(src.id);
    if (!extracted) continue;
    const haystack = normalize(extracted);
    const offset = haystack.indexOf(needle);
    if (offset < 0) continue;

    // Map the normalized offset back to an approximate position in
    // the original extracted text by walking forward through the
    // source until we've consumed `offset` non-whitespace-normalized
    // chars. This isn't exact but good enough for scroll anchoring.
    const origOffset = mapNormalizedOffset(extracted, offset);
    return {
      docId: src.id,
      offset: origOffset,
      length: needle.length,
      label: buildLabel(src, extracted, origOffset),
    };
  }

  return null;
}

/**
 * Walk through `original`, skipping whitespace runs to match the
 * normalized offset. Returns the approximate index in the original
 * string where the normalized offset lands.
 */
function mapNormalizedOffset(original: string, normalizedOffset: number): number {
  let normIdx = 0;
  let i = 0;
  let prevWasSpace = false;
  while (i < original.length && normIdx < normalizedOffset) {
    const c = original[i];
    const isSpace = /\s/.test(c);
    if (isSpace) {
      if (!prevWasSpace && normIdx > 0) {
        // This whitespace run will collapse to one space in the
        // normalized form — count it as one char.
        normIdx += 1;
      }
      prevWasSpace = true;
    } else {
      normIdx += 1;
      prevWasSpace = false;
    }
    i += 1;
  }
  return i;
}
