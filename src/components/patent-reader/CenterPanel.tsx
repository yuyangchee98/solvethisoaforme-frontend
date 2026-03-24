import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Patent } from "./types";
import type { ReferenceNumeralHighlights, HighlightSpan } from "@/lib/api";

// Figure enumerations: "FIG. 1", "FIGS. 2 and 3", "FIGS. 2, 3 and 8", "FIGS. 2-5"
// Matches the entire enumeration as one unit so continuation numbers aren't misidentified.
const FIG_ENUM_REGEX =
  /(?:figures?|figs?\.?)\s*\d+[a-zA-Z]?(?:\s*[-–]\s*\d+[a-zA-Z]?|(?:\s*,\s*\d+[a-zA-Z]?)*(?:\s+(?:and|or|to|through)\s+\d+[a-zA-Z]?)?)/gi;

// Extract individual figure numbers from a FIG enumeration match
const FIG_NUM_EXTRACT = /\d+[a-zA-Z]?/g;

type RichPart =
  | string
  | { type: "numeral"; numeral: string; raw: string }
  | { type: "figure"; figNums: string[]; raw: string };

interface CenterPanelProps {
  patent: Patent;
  activeNumeral: string | null;
  highlights: ReferenceNumeralHighlights;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
}

function RichText({
  text,
  activeNumeral,
  spans,
  onNumeralHover,
  onNumeralClick,
  onFigureClick,
}: {
  text: string;
  activeNumeral: string | null;
  spans: HighlightSpan[];
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
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

  // Pass 2: use backend highlight spans, skipping any inside a FIG span
  const refSpans: { start: number; end: number; numeral: string; raw: string }[] = [];
  for (const span of spans) {
    if (figSpans.some((f) => span.start < f.end && span.end > f.start)) continue;
    refSpans.push({
      start: span.start,
      end: span.end,
      numeral: span.numeral,
      raw: text.slice(span.start, span.end),
    });
  }

  // Merge and sort all spans by position
  const allSpans: (typeof figSpans[number] | typeof refSpans[number])[] = [
    ...figSpans,
    ...refSpans,
  ].sort((a, b) => a.start - b.start);

  // Build parts array
  const parts: RichPart[] = [];
  let lastIndex = 0;
  for (const span of allSpans) {
    if (span.start < lastIndex) continue; // overlapping span, skip
    if (span.start > lastIndex) {
      parts.push(text.slice(lastIndex, span.start));
    }
    if ("figNums" in span) {
      parts.push({ type: "figure", figNums: span.figNums, raw: span.raw });
    } else {
      parts.push({ type: "numeral", numeral: span.numeral, raw: span.raw });
    }
    lastIndex = span.end;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 1 && typeof parts[0] === "string") {
    return <>{text}</>;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (typeof part === "string") {
          return <span key={i}>{part}</span>;
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

export function CenterPanel({
  patent,
  activeNumeral,
  highlights,
  onNumeralHover,
  onNumeralClick,
  onFigureClick,
}: CenterPanelProps) {
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
            {patent.claims.map((claim, ci) => (
              <div
                key={claim.number}
                id={`claim-${claim.number}`}
                className="group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono font-medium text-stone-400 pt-0.5 select-none shrink-0 w-5 text-right">
                    {claim.number}.
                  </span>
                  <p className="text-sm lg:text-base leading-relaxed text-stone-700">
                    <RichText
                      text={claim.text}
                      spans={highlights.claims[ci] ?? []}
                      {...commonProps}
                    />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
