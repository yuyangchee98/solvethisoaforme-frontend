import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Patent, ClaimLimitation } from "./types";
import type { ReferenceNumeralHighlights, HighlightSpan, ClaimElementSpan, ClaimElementsData } from "@/lib/api";

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
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
  onClaimClick: (claimNumber: number) => void;
  onElementHover: (groupId: number | null) => void;
  onElementClick: (groupId: number) => void;
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

  if (parts.length === 1 && typeof parts[0].part === "string" && elSpans.length === 0) {
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
            return <span key={i}>{part}</span>;
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
            if (!el) return <span key={i}>{part}</span>;
            return renderElementSpan(part, el, i);
          }
          // Multiple segments — split at boundaries
          return (
            <span key={i}>
              {sorted.slice(0, -1).map((bStart, bi) => {
                const bEnd = sorted[bi + 1];
                const segment = part.slice(bStart, bEnd);
                const absPos = charStart + bStart;
                const el = elementSpanAt(absPos, elSpans);
                if (!el) return <span key={bi}>{segment}</span>;
                return renderElementSpan(segment, el, bi);
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
  ...richTextProps
}: {
  limitations: ClaimLimitation[];
  claimText: string;
  spans: HighlightSpan[];
  elementSpans?: ClaimElementSpan[];
  activeElementGroup?: number | null;
  onElementHover?: (groupId: number | null) => void;
  onElementClick?: (groupId: number) => void;
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
              {...richTextProps}
            />
          </div>
        );
      })}
    </div>
  );
}

export function CenterPanel({
  patent,
  activeNumeral,
  activeElementGroup,
  highlights,
  claimElements,
  onNumeralHover,
  onNumeralClick,
  onFigureClick,
  onClaimClick,
  onElementHover,
  onElementClick,
}: CenterPanelProps) {
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
    <div className="flex-1 overflow-y-auto bg-stone-50">
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
              {section.paragraphs.map((para, pi) => (
                <div key={pi} className="flex gap-2">
                  {para.number && (
                    <span className="text-[10px] lg:text-[11px] font-mono text-stone-300 select-none pt-1 shrink-0 w-10 text-right">
                      [{para.number}]
                    </span>
                  )}
                  <p className="text-sm lg:text-base leading-relaxed text-stone-700 flex-1">
                    <RichText
                      text={para.text}
                      spans={highlights.description[si]?.[pi] ?? []}
                      {...commonProps}
                    />
                  </p>
                </div>
              ))}
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
