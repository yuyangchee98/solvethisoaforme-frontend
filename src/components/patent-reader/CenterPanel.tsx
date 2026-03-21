import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Patent } from "./types";

// Combined regex matching both reference numerals and FIG references.
// Groups:
//   1 = parenthesized ref numeral: ( 110 )
//   2 = bare ref numeral after a word: camera 110
//   3 = figure number from FIG reference: FIG. 3, FIGS. 3A
const RICH_TEXT_REGEX =
  /(?:\(\s*(\d{1,5}[a-zA-Z]?)\s*\))|(?<=\b[a-zA-Z][\w-]*\s)(\d{1,5}[a-zA-Z]?)(?=[\s,;.\)\]]|$)|(?:FIGS?\.?\s*(\d+[a-zA-Z]?))/gi;

type RichPart =
  | string
  | { type: "numeral"; numeral: string; raw: string }
  | { type: "figure"; figNum: string; raw: string };

interface CenterPanelProps {
  patent: Patent;
  activeNumeral: string | null;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
}

function RichText({
  text,
  activeNumeral,
  onNumeralHover,
  onNumeralClick,
  onFigureClick,
}: {
  text: string;
  activeNumeral: string | null;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onFigureClick: (figIndex: number) => void;
}) {
  const parts: RichPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(RICH_TEXT_REGEX)) {
    const matchStart = match.index!;
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    if (match[3] != null) {
      // FIG reference
      parts.push({ type: "figure", figNum: match[3], raw: match[0] });
    } else {
      // Reference numeral (parenthesized or bare)
      parts.push({
        type: "numeral",
        numeral: match[1] || match[2],
        raw: match[0],
      });
    }
    lastIndex = matchStart + match[0].length;
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
          const figIndex = parseInt(part.figNum, 10);
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onFigureClick(figIndex);
              }}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer rounded px-0.5 transition-colors font-medium"
            >
              {part.raw}
            </span>
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
              onNumeralClick(isActive ? null : part.numeral);
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
  onNumeralHover,
  onNumeralClick,
  onFigureClick,
}: CenterPanelProps) {
  const richTextProps = {
    activeNumeral,
    onNumeralHover,
    onNumeralClick,
    onFigureClick,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50">
      <div className="max-w-3xl mx-auto py-8 px-6 space-y-8">
        {/* Title & metadata */}
        <header className="space-y-3">
          <h1 className="text-xl font-semibold text-stone-900 leading-tight">
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
          <div className="text-sm leading-relaxed text-stone-700">
            <RichText text={patent.abstract} {...richTextProps} />
          </div>
        </section>

        {/* Description sections */}
        {patent.description.map((section) => (
          <section
            key={section.heading}
            id={`section-${section.heading.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400 mb-2">
              {section.heading}
            </h2>
            <div className="space-y-3">
              {section.paragraphs.map((para, i) => (
                <div key={i} className="flex gap-2">
                  {para.number && (
                    <span className="text-[10px] font-mono text-stone-300 select-none pt-1 shrink-0 w-10 text-right">
                      [{para.number}]
                    </span>
                  )}
                  <p className="text-sm leading-relaxed text-stone-700 flex-1">
                    <RichText text={para.text} {...richTextProps} />
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
            {patent.claims.map((claim) => (
              <div
                key={claim.number}
                id={`claim-${claim.number}`}
                className="group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono font-medium text-stone-400 pt-0.5 select-none shrink-0 w-5 text-right">
                    {claim.number}.
                  </span>
                  <p className="text-sm leading-relaxed text-stone-700">
                    <RichText text={claim.text} {...richTextProps} />
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
