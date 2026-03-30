import { useRef, useState, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Patent, PatentParagraph, ClaimLimitation, LineBreak } from "./types";
import type { ColLineSelection } from "./usePatentPanel";
import type { ReferenceNumeralHighlights, HighlightSpan, ClaimElementSpan, ClaimElementsData } from "@/lib/api";
import type { SearchHighlightSpan, SearchHighlights } from "./search-utils";
import { SEARCH_COLORS } from "./search-utils";

// Color palette for claim element groups (12 visually distinct pastels)
const ELEMENT_COLORS = [
  "bg-rose-100/60",
  "bg-sky-100/60",
  "bg-emerald-100/60",
  "bg-violet-100/60",
  "bg-amber-100/70",
  "bg-cyan-100/60",
  "bg-pink-100/60",
  "bg-lime-100/60",
  "bg-indigo-100/60",
  "bg-orange-100/60",
  "bg-teal-100/60",
  "bg-fuchsia-100/60",
];

const ELEMENT_INTRO_BORDER = [
  "border-b border-rose-400/60",
  "border-b border-sky-400/60",
  "border-b border-emerald-400/60",
  "border-b border-violet-400/60",
  "border-b border-amber-400/60",
  "border-b border-cyan-400/60",
  "border-b border-pink-400/60",
  "border-b border-lime-400/60",
  "border-b border-indigo-400/60",
  "border-b border-orange-400/60",
  "border-b border-teal-400/60",
  "border-b border-fuchsia-400/60",
];

// Figure enumerations: "FIG. 1", "FIGS. 2 and 3", "FIGS. 2, 3 and 8", "FIGS. 2-5"
// Matches the entire enumeration as one unit so continuation numbers aren't misidentified.
const FIG_ENUM_REGEX =
  /(?:figures?|figs?\.?)\s*\d+[a-zA-Z]?(?:\s*[-–]\s*\d+[a-zA-Z]?|(?:\s*,\s*\d+[a-zA-Z]?)*(?:\s+(?:and|or|to|through)\s+\d+[a-zA-Z]?)?)/gi;

// Extract individual figure numbers from a FIG enumeration match
const FIG_NUM_EXTRACT = /\d+[a-zA-Z]?/g;

// Claim dependency references: "claim 1", "claims 1, 3, and 5", "claims 1 to 5",
// "any one of claims 1-5", "any preceding claim(s)"
const CLAIM_REF_REGEX =
  /(?:any\s+(?:one\s+)?of\s+)?(?:claims?\s+\d+(?:\s*(?:[-–]|to|through)\s*\d+|\s*(?:,\s*\d+)*(?:\s*,?\s*(?:and|or)\s+\d+)?)?|any\s+(?:one\s+of\s+the\s+)?preceding\s+claims?)/gi;

/** Extract claim numbers from a claim reference match, given the current claim number for "preceding". */
function extractClaimNums(raw: string, currentClaimNumber: number): number[] {
  const lower = raw.toLowerCase();

  // "any preceding claim(s)" → all claims before this one
  if (/preceding\s+claims?/.test(lower)) {
    const nums: number[] = [];
    for (let i = 1; i < currentClaimNumber; i++) nums.push(i);
    return nums;
  }

  // Extract all numbers from the match
  const allNums = [...raw.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
  if (allNums.length === 0) return [];

  // Range: "claims 1 to 5", "claims 1-5", "claims 1 through 5"
  if (/(?:[-–]|to|through)/.test(raw) && allNums.length >= 2) {
    const start = allNums[0];
    const end = allNums[allNums.length - 1];
    const nums: number[] = [];
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }

  // Enumeration: "claims 1, 3, and 5" or "claim 1 or 2"
  return allNums;
}

type RichPart =
  | string
  | { type: "numeral"; numeral: string; raw: string }
  | { type: "figure"; figNums: string[]; raw: string }
  | { type: "claim-ref"; claimNums: number[]; raw: string };

interface CenterPanelProps {
  patent: Patent;
  activeNumeral: string | null;
  activeElementGroup: number | null;
  highlights: ReferenceNumeralHighlights;
  claimElements: ClaimElementsData;
  searchHighlights?: SearchHighlights;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
  onClaimClick: (claimNumber: number) => void;
  onElementHover: (groupId: number | null) => void;
  onElementClick: (groupId: number) => void;
  onColLineSelect?: (selection: ColLineSelection | null) => void;
}

/** Find the claim element span that covers a given character position. */
function elementSpanAt(pos: number, elementSpans: ClaimElementSpan[]): ClaimElementSpan | undefined {
  return elementSpans.find((s) => pos >= s.start && pos < s.end);
}

function RichText({
  text,
  activeNumeral,
  spans,
  elementSpans,
  activeElementGroup,
  searchSpans,
  onNumeralHover,
  onNumeralClick,
  onFigureClick,
  onClaimClick,
  onElementHover,
  onElementClick,
  currentClaimNumber,
}: {
  text: string;
  activeNumeral: string | null;
  spans: HighlightSpan[];
  elementSpans?: ClaimElementSpan[];
  activeElementGroup?: number | null;
  searchSpans?: SearchHighlightSpan[];
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
  onClaimClick?: (claimNumber: number) => void;
  onElementHover?: (groupId: number | null) => void;
  onElementClick?: (groupId: number) => void;
  currentClaimNumber?: number;
}) {
  // Pass 1: find all FIG enumerations
  const figSpans: { start: number; end: number; figNums: string[]; raw: string }[] = [];
  for (const match of text.matchAll(FIG_ENUM_REGEX)) {
    const nums = match[0].match(FIG_NUM_EXTRACT) || [];
    figSpans.push({
      start: match.index!,
      end: match.index! + match[0].length,
      figNums: nums,
      raw: match[0],
    });
  }

  // Pass 1b: find all claim references
  const claimRefSpans: { start: number; end: number; claimNums: number[]; raw: string }[] = [];
  if (onClaimClick && currentClaimNumber) {
    for (const match of text.matchAll(CLAIM_REF_REGEX)) {
      const nums = extractClaimNums(match[0], currentClaimNumber);
      if (nums.length > 0) {
        claimRefSpans.push({
          start: match.index!,
          end: match.index! + match[0].length,
          claimNums: nums,
          raw: match[0],
        });
      }
    }
  }

  // Pass 2: use backend highlight spans, skipping any inside a FIG or claim-ref span
  const coveredSpans = [...figSpans, ...claimRefSpans];
  const refSpans: { start: number; end: number; numeral: string; raw: string }[] = [];
  for (const span of spans) {
    if (coveredSpans.some((f) => span.start < f.end && span.end > f.start)) continue;
    refSpans.push({
      start: span.start,
      end: span.end,
      numeral: span.numeral,
      raw: text.slice(span.start, span.end),
    });
  }

  // Merge and sort all spans by position
  type AnySpan = typeof figSpans[number] | typeof refSpans[number] | typeof claimRefSpans[number];
  const allSpans: AnySpan[] = [
    ...figSpans,
    ...claimRefSpans,
    ...refSpans,
  ].sort((a, b) => a.start - b.start);

  // Build parts array with character position tracking
  const parts: { part: RichPart; charStart: number }[] = [];
  let lastIndex = 0;
  for (const span of allSpans) {
    if (span.start < lastIndex) continue; // overlapping span, skip
    if (span.start > lastIndex) {
      parts.push({ part: text.slice(lastIndex, span.start), charStart: lastIndex });
    }
    if ("figNums" in span) {
      parts.push({ part: { type: "figure", figNums: span.figNums, raw: span.raw }, charStart: span.start });
    } else if ("claimNums" in span) {
      parts.push({ part: { type: "claim-ref", claimNums: span.claimNums, raw: span.raw }, charStart: span.start });
    } else {
      parts.push({ part: { type: "numeral", numeral: span.numeral, raw: span.raw }, charStart: span.start });
    }
    lastIndex = span.end;
  }
  if (lastIndex < text.length) {
    parts.push({ part: text.slice(lastIndex), charStart: lastIndex });
  }

  const elSpans = elementSpans ?? [];
  const sSpans = searchSpans ?? [];

  /** Wrap a text fragment in <mark> tags where search spans overlap [absStart, absEnd). */
  const applySearchMarks = (
    content: string,
    absStart: number,
    keyPrefix: string | number,
  ): React.ReactNode => {
    if (sSpans.length === 0) return content;
    // Find overlapping search spans
    const absEnd = absStart + content.length;
    const overlapping = sSpans.filter((s) => s.start < absEnd && s.end > absStart);
    if (overlapping.length === 0) return content;

    const fragments: React.ReactNode[] = [];
    let pos = 0;
    for (const span of overlapping) {
      const relStart = Math.max(0, span.start - absStart);
      const relEnd = Math.min(content.length, span.end - absStart);
      if (relStart > pos) {
        fragments.push(content.slice(pos, relStart));
      }
      fragments.push(
        <mark
          key={`${keyPrefix}-s${relStart}`}
          data-search-term={span.termIndex}
          className={cn(
            "rounded-sm px-0",
            SEARCH_COLORS[span.termIndex % SEARCH_COLORS.length],
          )}
        >
          {content.slice(relStart, relEnd)}
        </mark>
      );
      pos = relEnd;
    }
    if (pos < content.length) {
      fragments.push(content.slice(pos));
    }
    return <>{fragments}</>;
  };

  if (parts.length === 1 && typeof parts[0].part === "string" && elSpans.length === 0 && sSpans.length === 0) {
    return <>{text}</>;
  }

  /** Render a span with element background, hover, and click behavior. */
  const renderElementSpan = (
    content: React.ReactNode,
    el: ClaimElementSpan,
    key: string | number,
  ): React.ReactNode => {
    const colorIdx = el.group_id % ELEMENT_COLORS.length;
    const isIntro = el.role === "introduction" || el.role === "bare";
    const isActive = activeElementGroup === el.group_id;
    return (
      <span
        key={key}
        data-element-group={el.group_id}
        title={el.np_text}
        onMouseEnter={() => onElementHover?.(el.group_id)}
        onMouseLeave={() => onElementHover?.(null)}
        onClick={(e) => {
          e.stopPropagation();
          onElementClick?.(el.group_id);
        }}
        className={cn(
          "rounded-sm px-0.5 -mx-0.5 cursor-pointer transition-colors",
          ELEMENT_COLORS[colorIdx],
          isIntro && ELEMENT_INTRO_BORDER[colorIdx],
          isActive && "ring-1 ring-offset-1 ring-current",
        )}
      >
        {content}
      </span>
    );
  };

  return (
    <>
      {parts.map(({ part, charStart }, i) => {
        if (typeof part === "string") {
          // Split plain text at element span boundaries for accurate background coloring
          if (elSpans.length === 0) {
            return <span key={i}>{applySearchMarks(part, charStart, i)}</span>;
          }
          // Find all element boundaries within this text range
          const end = charStart + part.length;
          const boundaries = new Set<number>([0, part.length]);
          for (const el of elSpans) {
            if (el.start > charStart && el.start < end) boundaries.add(el.start - charStart);
            if (el.end > charStart && el.end < end) boundaries.add(el.end - charStart);
          }
          const sorted = [...boundaries].sort((a, b) => a - b);
          if (sorted.length <= 2) {
            // No element boundaries inside — wrap whole fragment
            const el = elementSpanAt(charStart, elSpans);
            if (!el) return <span key={i}>{applySearchMarks(part, charStart, i)}</span>;
            return renderElementSpan(applySearchMarks(part, charStart, i), el, i);
          }
          // Multiple segments — split at boundaries
          return (
            <span key={i}>
              {sorted.slice(0, -1).map((bStart, bi) => {
                const bEnd = sorted[bi + 1];
                const segment = part.slice(bStart, bEnd);
                const absPos = charStart + bStart;
                const el = elementSpanAt(absPos, elSpans);
                if (!el) return <span key={bi}>{applySearchMarks(segment, absPos, `${i}-${bi}`)}</span>;
                return renderElementSpan(applySearchMarks(segment, absPos, `${i}-${bi}`), el, bi);
              })}
            </span>
          );
        }

        if (part.type === "figure") {
          const raw = part.raw;
          const numMatches = [...raw.matchAll(FIG_NUM_EXTRACT)];
          if (numMatches.length === 0) {
            return <span key={i}>{raw}</span>;
          }

          const fragments: React.ReactNode[] = [];
          let fi = 0;
          for (let ni = 0; ni < numMatches.length; ni++) {
            const nm = numMatches[ni];
            const nmStart = nm.index!;
            if (nmStart > fi) {
              fragments.push(
                <span key={`${i}-t${ni}`} className="text-blue-600 font-medium">
                  {raw.slice(fi, nmStart)}
                </span>
              );
            }
            const figIndex = parseInt(nm[0], 10);
            fragments.push(
              <span
                key={`${i}-n${ni}`}
                data-fig-ref={String(figIndex)}
                onClick={(e) => {
                  e.stopPropagation();
                  onFigureClick(figIndex);
                }}
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer rounded px-0.5 transition-colors font-medium"
              >
                {nm[0]}
              </span>
            );
            fi = nmStart + nm[0].length;
          }
          if (fi < raw.length) {
            fragments.push(
              <span key={`${i}-te`} className="text-blue-600 font-medium">
                {raw.slice(fi)}
              </span>
            );
          }

          return <span key={i}>{fragments}</span>;
        }

        if (part.type === "claim-ref") {
          return (
            <ClaimRefLink
              key={i}
              raw={part.raw}
              claimNums={part.claimNums}
              onClaimClick={onClaimClick!}
            />
          );
        }

        // Reference numeral
        const isActive = activeNumeral === part.numeral;
        return (
          <span
            key={i}
            data-ref-num={part.numeral}
            onMouseEnter={() => onNumeralHover(part.numeral)}
            onMouseLeave={() => onNumeralHover(null)}
            onClick={(e) => {
              e.stopPropagation();
              onNumeralClick(part.numeral);
            }}
            className={cn(
              "font-mono text-[0.8em] cursor-pointer rounded px-0.5 transition-colors",
              isActive
                ? "bg-amber-200/70 text-amber-900"
                : "text-stone-400 hover:bg-amber-100/50 hover:text-amber-700"
            )}
          >
            {part.raw}
          </span>
        );
      })}
    </>
  );
}

/** Clickable claim reference that cycles through multiple targets. */
function ClaimRefLink({
  raw,
  claimNums,
  onClaimClick,
}: {
  raw: string;
  claimNums: number[];
  onClaimClick: (claimNumber: number) => void;
}) {
  const cycleIdx = useRef(0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claimNums.length === 0) return;
    const idx = cycleIdx.current % claimNums.length;
    onClaimClick(claimNums[idx]);
    cycleIdx.current = idx + 1;
  };

  const title =
    claimNums.length === 1
      ? `Go to claim ${claimNums[0]}`
      : `Cycle through claims ${claimNums.join(", ")} (click repeatedly)`;

  return (
    <span
      onClick={handleClick}
      title={title}
      className="text-violet-600 hover:text-violet-800 hover:bg-violet-50 cursor-pointer rounded px-0.5 transition-colors font-medium"
    >
      {raw}
    </span>
  );
}

/** Slice spans that fall within a text range, adjusting offsets to be relative. */
function sliceSpans<T extends { start: number; end: number }>(
  spans: T[],
  rangeStart: number,
  rangeEnd: number,
): T[] {
  return spans
    .filter((s) => s.start < rangeEnd && s.end > rangeStart)
    .map((s) => ({
      ...s,
      start: Math.max(0, s.start - rangeStart),
      end: Math.min(rangeEnd - rangeStart, s.end - rangeStart),
    }));
}

/** Find where a limitation's text starts in the flat claim text. */
function findLimitationOffset(claimText: string, limText: string, searchFrom: number): number {
  if (!limText) return -1;
  // Match first 40 chars to handle minor whitespace differences
  const needle = limText.slice(0, 40).replace(/\s+/g, " ");
  const haystack = claimText.slice(searchFrom).replace(/\s+/g, " ");
  const idx = haystack.indexOf(needle);
  if (idx === -1) return -1;
  // Map back to original string position — approximate but close enough
  // since we're just replacing multi-space with single-space
  return searchFrom + idx;
}

/** Render a claim limitation tree with indentation, using RichText for each node. */
function ClaimLimitationsRenderer({
  limitations,
  claimText,
  spans,
  elementSpans,
  activeElementGroup,
  onElementHover,
  onElementClick,
  searchSpans,
  ...richTextProps
}: {
  limitations: ClaimLimitation[];
  claimText: string;
  spans: HighlightSpan[];
  elementSpans?: ClaimElementSpan[];
  activeElementGroup?: number | null;
  onElementHover?: (groupId: number | null) => void;
  onElementClick?: (groupId: number) => void;
  searchSpans?: SearchHighlightSpan[];
  activeNumeral: string | null;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
  onClaimClick?: (claimNumber: number) => void;
  currentClaimNumber?: number;
}) {
  // Build a flat list of (limitation, depth) with offsets into claimText
  const flatLims: { lim: ClaimLimitation; offset: number }[] = [];
  let searchPos = 0;

  const flatten = (lims: ClaimLimitation[]) => {
    for (const lim of lims) {
      if (lim.text) {
        const offset = findLimitationOffset(claimText, lim.text, searchPos);
        flatLims.push({ lim, offset });
        if (offset >= 0) {
          searchPos = offset + lim.text.length;
        }
      }
      if (lim.children.length > 0) {
        flatten(lim.children);
      }
    }
  };
  flatten(limitations);

  return (
    <div className="space-y-1">
      {flatLims.map(({ lim, offset }, i) => {
        const indent = lim.depth;
        const limSpans = offset >= 0
          ? sliceSpans(spans, offset, offset + lim.text.length)
          : [];
        const limElementSpans = offset >= 0 && elementSpans
          ? sliceSpans(elementSpans, offset, offset + lim.text.length)
          : undefined;
        const limSearchSpans = offset >= 0 && searchSpans
          ? sliceSpans(searchSpans, offset, offset + lim.text.length)
          : undefined;

        return (
          <div
            key={i}
            style={{ paddingLeft: `${indent * 1.5}rem` }}
          >
            <RichText
              text={lim.text}
              spans={limSpans}
              elementSpans={limElementSpans}
              activeElementGroup={activeElementGroup}
              onElementHover={onElementHover}
              onElementClick={onElementClick}
              searchSpans={limSearchSpans}
              {...richTextProps}
            />
          </div>
        );
      })}
    </div>
  );
}

function formatParaLocation(para: PatentParagraph): string | null {
  if (para.number) return `[${para.number}]`;
  if (para.col != null && para.line != null) {
    if (para.end_col != null && para.end_line != null) {
      if (para.col === para.end_col) {
        return `[col.${para.col}, L${para.line}-${para.end_line}]`;
      }
      return `[col.${para.col}, L${para.line} \u2192 col.${para.end_col}, L${para.end_line}]`;
    }
    return `[col.${para.col}, L${para.line}]`;
  }
  return null;
}

function paraId(para: PatentParagraph): string | undefined {
  if (para.number) return `para-${para.number}`;
  if (para.col != null && para.line != null) return `para-col${para.col}-L${para.line}`;
  return undefined;
}

/** Resolve a character offset to col/line using binary search on line_breaks. */
function resolveOffset(offset: number, lineBreaks: LineBreak[]): LineBreak {
  let lo = 0, hi = lineBreaks.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineBreaks[mid].offset <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lineBreaks[lo];
}

/** Format a resolved selection range as a copyable string. */
function formatSelectionRange(start: LineBreak, end: LineBreak): string {
  if (start.col === end.col && start.line === end.line) {
    return `col.${start.col}, L${start.line}`;
  }
  if (start.col === end.col) {
    return `col.${start.col}, L${start.line}-${end.line}`;
  }
  return `col.${start.col}, L${start.line} \u2013 col.${end.col}, L${end.line}`;
}

interface SelectionIndicator {
  text: string;
  y: number;  // top position relative to scroll container (with scroll offset)
}

export function CenterPanel({
  patent,
  activeNumeral,
  activeElementGroup,
  highlights,
  claimElements,
  searchHighlights,
  onNumeralHover,
  onNumeralClick,
  onFigureClick,
  onClaimClick,
  onElementHover,
  onElementClick,
  onColLineSelect,
}: CenterPanelProps) {
  const [showJumpTo, setShowJumpTo] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [flashParagraph, setFlashParagraph] = useState<string | null>(null);
  const [selectionIndicator, setSelectionIndicator] = useState<SelectionIndicator | null>(null);
  const [copied, setCopied] = useState(false);
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleParagraphClick = useCallback(() => {
    setShowJumpTo(true);
    setJumpInput("");
    requestAnimationFrame(() => jumpInputRef.current?.focus());
  }, []);

  const handleJumpTo = useCallback(() => {
    const cleaned = jumpInput.replace(/[\[\]]/g, "").trim();
    if (!cleaned) return;
    let el = document.getElementById(`para-${cleaned}`);
    if (!el && /^\d+$/.test(cleaned)) {
      el = document.getElementById(`para-${cleaned.padStart(4, "0")}`);
    }
    // Try col/line format: "3,31" or "col.3, L31" or "3 31"
    if (!el) {
      const colLineMatch = cleaned.match(/(?:col\.?\s*)?(\d+)[,\s]+(?:L?\s*)?(\d+)/i);
      if (colLineMatch) {
        el = document.getElementById(`para-col${colLineMatch[1]}-L${colLineMatch[2]}`);
      }
    }
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const paraKey = el.id.replace("para-", "");
      setFlashParagraph(paraKey);
      setTimeout(() => setFlashParagraph(null), 1500);
    }
    setShowJumpTo(false);
  }, [jumpInput]);

  // Selection → col/line tooltip
  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    console.log("[ColLine] mouseUp, selection:", sel?.toString().slice(0, 50), "collapsed:", sel?.isCollapsed);
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelectionIndicator(null);
      return;
    }

    // Walk up from the selection anchor to find the paragraph container with data-line-breaks
    const findParaContainer = (node: Node | null): HTMLElement | null => {
      let el = node instanceof HTMLElement ? node : node?.parentElement;
      while (el) {
        if (el.dataset.lineBreaks) return el;
        el = el.parentElement;
      }
      return null;
    };

    const anchorPara = findParaContainer(sel.anchorNode);
    const focusPara = findParaContainer(sel.focusNode);
    console.log("[ColLine] anchorPara:", !!anchorPara, "hasLineBreaks:", !!anchorPara?.dataset.lineBreaks);
    if (!anchorPara) {
      setSelectionIndicator(null);
      return;
    }

    // Get the full text content and compute offsets within it
    const getOffsetInPara = (container: HTMLElement, node: Node, offset: number): number => {
      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(node, offset);
      return range.toString().length;
    };

    try {
      const lineBreaks: LineBreak[] = JSON.parse(anchorPara.dataset.lineBreaks!);
      if (!lineBreaks.length) {
        setSelectionIndicator(null);
        return;
      }

      const startOffset = getOffsetInPara(anchorPara, sel.anchorNode!, sel.anchorOffset);

      let endLineBreaks = lineBreaks;
      let endOffset: number;
      if (focusPara && focusPara !== anchorPara && focusPara.dataset.lineBreaks) {
        // Selection spans multiple paragraphs — use the focus paragraph's line_breaks for end
        endLineBreaks = JSON.parse(focusPara.dataset.lineBreaks!);
        endOffset = getOffsetInPara(focusPara, sel.focusNode!, sel.focusOffset);
      } else {
        endOffset = getOffsetInPara(anchorPara, sel.focusNode!, sel.focusOffset);
      }

      // Normalize: ensure start < end within same paragraph
      const actualStart = Math.min(startOffset, endOffset);
      const actualEnd = Math.max(startOffset, endOffset);

      const startLoc = resolveOffset(
        focusPara === anchorPara ? actualStart : startOffset,
        lineBreaks,
      );
      const endLoc = resolveOffset(
        focusPara === anchorPara ? actualEnd : endOffset,
        endLineBreaks,
      );

      const text = formatSelectionRange(startLoc, endLoc);

      // Collect all line_breaks between start and end for PDF highlighting
      // Combine both paragraphs' line_breaks, filter to the selected col/line range
      const allBreaks = focusPara !== anchorPara
        ? [...lineBreaks, ...endLineBreaks]
        : lineBreaks;
      const selectedBreaks = allBreaks.filter((lb) => {
        const key = lb.col * 1000 + lb.line;
        const startKey = startLoc.col * 1000 + startLoc.line;
        const endKey = endLoc.col * 1000 + endLoc.line;
        return key >= startKey && key <= endKey;
      });

      // Position indicator at the vertical center of the selection
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = scrollContainerRef.current;
      const containerRect = container?.getBoundingClientRect();
      const scrollTop = container?.scrollTop ?? 0;
      const y = rect.top + rect.height / 2 - (containerRect?.top ?? 0) + scrollTop;

      console.log("[ColLine] resolved:", text, "y:", y);
      setSelectionIndicator({ text, y });
      setCopied(false);

      // Notify parent for sidebar Source tab
      onColLineSelect?.({
        label: text,
        startBreak: startLoc,
        endBreak: endLoc,
        lineBreaks: selectedBreaks,
      });
    } catch (err) {
      console.error("[ColLine] error:", err);
      setSelectionIndicator(null);
      onColLineSelect?.(null);
    }
  }, [onColLineSelect]);

  // Dismiss tooltip when selection is cleared
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionIndicator(null);
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const handleCopyLocation = useCallback(() => {
    if (!selectionIndicator) return;
    navigator.clipboard.writeText(selectionIndicator.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [selectionIndicator]);

  // Build a lookup: claim_number -> spans
  const claimElementMap = new Map(
    claimElements.claim_elements.map((ce) => [ce.claim_number, ce.spans])
  );

  const commonProps = {
    activeNumeral,
    onNumeralHover,
    onNumeralClick,
    onFigureClick,
  };

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-stone-50 relative" onMouseUp={handleTextSelect}>
      {/* Selection col/line indicator — left margin */}
      {selectionIndicator && (
        <div
          className="absolute left-2 z-40 pointer-events-auto flex items-center gap-1 cursor-pointer group"
          style={{ top: selectionIndicator.y, transform: "translateY(-50%)" }}
          onClick={handleCopyLocation}
          title="Click to copy"
        >
          <span className={cn(
            "text-[10px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded transition-colors",
            copied
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700 group-hover:bg-amber-200",
          )}>
            {copied ? "Copied!" : selectionIndicator.text}
          </span>
        </div>
      )}
      {showJumpTo && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          onClick={() => setShowJumpTo(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-stone-200 px-4 py-3 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium text-stone-500">Go to ¶</span>
            <input
              ref={jumpInputRef}
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJumpTo();
                if (e.key === "Escape") setShowJumpTo(false);
              }}
              placeholder="0042"
              className="text-sm border border-stone-300 rounded-md px-2.5 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
            <kbd className="text-[10px] text-stone-400 bg-stone-100 border border-stone-200 rounded px-1 py-0.5">Enter</kbd>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10 space-y-8">
        {/* Title & metadata */}
        <header className="space-y-3">
          <h1 className="text-xl lg:text-2xl font-semibold text-stone-900 leading-tight">
            {patent.title}
          </h1>
          <div className="flex flex-wrap gap-2 text-xs text-stone-500">
            <Badge variant="outline" className="font-mono">
              {patent.patent_number}
            </Badge>
            {patent.priority_date && patent.priority_date !== patent.filing_date && (
              <>
                <span>Priority: {patent.priority_date}</span>
                <span className="text-stone-300">|</span>
              </>
            )}
            <span>Filed: {patent.filing_date}</span>
            <span className="text-stone-300">|</span>
            <span>Published: {patent.publication_date}</span>
          </div>
          <div className="text-sm text-stone-600">
            <span className="font-medium">Inventors:</span>{" "}
            {patent.inventors.join(", ")}
          </div>
          <div className="text-sm text-stone-600">
            <span className="font-medium">Assignee:</span> {patent.assignee}
          </div>
        </header>

        {/* Abstract */}
        <section id="abstract">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-2">
            Abstract
          </h2>
          <div className="text-sm lg:text-base leading-relaxed text-stone-700">
            <RichText
              text={patent.abstract}
              spans={highlights.abstract}
              searchSpans={searchHighlights?.abstract}
              {...commonProps}
            />
          </div>
        </section>

        {/* Description sections */}
        {patent.description.map((section, si) => (
          <section
            key={section.heading}
            id={`section-${section.heading.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {section.heading}
            </h2>
            <div className="space-y-3">
              {section.paragraphs.map((para, pi) => {
                const pid = paraId(para);
                const locationLabel = formatParaLocation(para);
                const hasColLine = para.col != null;
                return (
                <div
                  key={pi}
                  id={pid}
                  className={cn(
                    "flex gap-2 rounded-sm transition-colors duration-700",
                    pid && flashParagraph === pid.replace("para-", "") && "bg-amber-100/60",
                  )}
                >
                  {locationLabel && (
                    <span
                      onClick={handleParagraphClick}
                      className={cn(
                        "text-[10px] lg:text-[11px] font-mono text-stone-300 hover:text-amber-500 cursor-pointer select-none pt-1 shrink-0 text-right transition-colors",
                        hasColLine ? "w-fit whitespace-nowrap" : "w-10",
                      )}
                      title="Jump to paragraph..."
                    >
                      {locationLabel}
                    </span>
                  )}
                  <p
                    className="text-sm lg:text-base leading-relaxed text-stone-700 flex-1"
                    {...(para.line_breaks?.length ? { "data-line-breaks": JSON.stringify(para.line_breaks) } : {})}
                  >
                    <RichText
                      text={para.text}
                      spans={highlights.description[si]?.[pi] ?? []}
                      searchSpans={searchHighlights?.description[si]?.[pi]}
                      {...commonProps}
                    />
                  </p>
                </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Claims */}
        <section id="claims">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-3">
            Claims
          </h2>
          <div className="space-y-4">
            {patent.claims.map((claim, ci) => {
              const hasLimitations = claim.limitations && claim.limitations.length > 0;
              return (
                <div
                  key={claim.number}
                  id={`claim-${claim.number}`}
                  className="group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono font-medium text-stone-400 pt-0.5 select-none shrink-0 w-5 text-right">
                      {claim.number}.
                    </span>
                    {hasLimitations ? (
                      <div className="text-sm lg:text-base leading-relaxed text-stone-700 flex-1">
                        <ClaimLimitationsRenderer
                          limitations={claim.limitations}
                          claimText={claim.text}
                          spans={highlights.claims[ci] ?? []}
                          elementSpans={claimElementMap.get(claim.number)}
                          activeElementGroup={activeElementGroup}
                          onElementHover={onElementHover}
                          onElementClick={onElementClick}
                          searchSpans={searchHighlights?.claims[ci]}
                          {...commonProps}
                          onClaimClick={onClaimClick}
                          currentClaimNumber={claim.number}
                        />
                      </div>
                    ) : (
                      <p className="text-sm lg:text-base leading-relaxed text-stone-700">
                        <RichText
                          text={claim.text}
                          spans={highlights.claims[ci] ?? []}
                          elementSpans={claimElementMap.get(claim.number)}
                          activeElementGroup={activeElementGroup}
                          onElementHover={onElementHover}
                          onElementClick={onElementClick}
                          searchSpans={searchHighlights?.claims[ci]}
                          {...commonProps}
                          onClaimClick={onClaimClick}
                          currentClaimNumber={claim.number}
                        />
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
