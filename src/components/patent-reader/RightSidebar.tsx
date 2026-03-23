import { useState } from "react";
import {
  Image,
  Info,
  Tag,
  Scale,
  FileDown,
  List,
  FileText,
  ChevronRight,
  ChevronDown,
  PanelRightClose,
  ScanSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Patent, PatentClaim } from "./types";
import type { ReferenceNumeral, NumeralLocation } from "@/lib/api";

interface RightSidebarProps {
  patent: Patent;
  referenceNumerals: ReferenceNumeral[];
  activeNumeral: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedFigure: number | null;
  onSelectFigure: (i: number | null) => void;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  collapsed: boolean;
  onToggle: () => void;
  onScrollTo: (id: string) => void;
  highlightedLocation: NumeralLocation | null;
  showAllBboxes: boolean;
  onToggleBboxes: () => void;
  numeralLocations: Record<string, NumeralLocation[]>;
  numeralLabels: Record<string, string>;
  onBboxClick: (numeral: string) => void;
}

// ── Outline tab internals ────────────────────────────────────────────────

function ClaimNode({
  claim,
  children,
  onScrollTo,
}: {
  claim: PatentClaim;
  children: PatentClaim[];
  onScrollTo: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onScrollTo(`claim-${claim.number}`);
        }}
        className={cn(
          "flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md text-sm hover:bg-stone-100 transition-colors",
          claim.type === "independent"
            ? "font-medium text-stone-800"
            : "text-stone-600 pl-6"
        )}
      >
        {hasChildren &&
          (expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-stone-400" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-stone-400" />
          ))}
        {!hasChildren && <span className="w-3.5 shrink-0" />}
        <span className="truncate">
          Claim {claim.number}
          {claim.type === "independent" && (
            <span className="text-xs text-stone-400 ml-1">(ind.)</span>
          )}
        </span>
      </button>
      {expanded && hasChildren && (
        <div className="ml-2 border-l border-stone-200">
          {children.map((child) => (
            <ClaimNode
              key={child.number}
              claim={child}
              children={[]}
              onScrollTo={onScrollTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Tab content components ───────────────────────────────────────────────

function FiguresTab({
  patent,
  selectedFigure,
  onSelectFigure,
  highlightedLocation,
  showAllBboxes,
  onToggleBboxes,
  numeralLocations,
  numeralLabels,
  onBboxClick,
}: {
  patent: Patent;
  selectedFigure: number | null;
  onSelectFigure: (i: number | null) => void;
  highlightedLocation: NumeralLocation | null;
  showAllBboxes: boolean;
  onToggleBboxes: () => void;
  numeralLocations: Record<string, NumeralLocation[]>;
  numeralLabels: Record<string, string>;
  onBboxClick: (numeral: string) => void;
}) {
  if (patent.figure_urls.length === 0) {
    return (
      <p className="text-xs text-stone-400 italic p-3">
        No figures available for this patent.
      </p>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thumbnail strip — skip index 0 (cover sheet) */}
      <div className="flex gap-1.5 p-2 overflow-x-auto border-b border-stone-100 shrink-0">
        {patent.figure_urls.map((url, i) => {
          if (i === 0) return null; // skip cover sheet
          return (
            <button
              key={url}
              onClick={() => onSelectFigure(selectedFigure === i ? null : i)}
              className={cn(
                "rounded border overflow-hidden bg-white shrink-0 transition-all hover:border-amber-400",
                selectedFigure === i
                  ? "border-amber-500 ring-1 ring-amber-500/30"
                  : "border-stone-200"
              )}
            >
              <img
                src={url}
                alt={`Figure ${i}`}
                className="h-14 w-auto"
                loading="lazy"
              />
            </button>
          );
        })}
      </div>

      {/* Selected figure — sized to fit vertically */}
      {selectedFigure !== null ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Bbox toggle */}
          <div className="flex items-center justify-end px-3 pt-2">
            <button
              onClick={onToggleBboxes}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors",
                showAllBboxes
                  ? "bg-amber-100 text-amber-700"
                  : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              )}
              title="Show all detected reference numeral bounding boxes"
            >
              <ScanSearch className="size-3.5" />
              Bounding boxes
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-3 pb-3">
            <div className="relative inline-block max-w-full max-h-full">
              <img
                src={patent.figure_urls[selectedFigure]}
                alt={`Figure ${selectedFigure}`}
                className="max-w-full max-h-full object-contain rounded border border-stone-200 bg-white block"
              />
              {/* All bounding boxes overlay */}
              {showAllBboxes && (() => {
                const pad = 0.015;
                const allOnSheet: { numeral: string; loc: NumeralLocation }[] = [];
                for (const [numeral, locs] of Object.entries(numeralLocations)) {
                  for (const loc of locs) {
                    if (loc.sheet === selectedFigure) {
                      allOnSheet.push({ numeral, loc });
                    }
                  }
                }
                return allOnSheet.map(({ numeral, loc }, i) => (
                  <div
                    key={`${numeral}-${i}`}
                    className="absolute border border-amber-500/60 bg-amber-400/15 rounded-sm cursor-pointer hover:bg-amber-400/35 hover:border-amber-500 transition-colors"
                    title={numeralLabels[numeral] ? `${numeral} — ${numeralLabels[numeral]}` : numeral}
                    onClick={() => onBboxClick(numeral)}
                    style={{
                      left: `${Math.max(0, loc.x - pad) * 100}%`,
                      top: `${Math.max(0, loc.y - pad) * 100}%`,
                      width: `${(loc.w + pad * 2) * 100}%`,
                      height: `${(loc.h + pad * 2) * 100}%`,
                    }}
                  />
                ));
              })()}
              {/* Single highlighted location (from numeral click) */}
              {highlightedLocation && highlightedLocation.sheet === selectedFigure && (() => {
                const pad = 0.015;
                return (
                  <div
                    className="absolute border-2 border-amber-500 bg-amber-400/20 rounded-sm animate-pulse pointer-events-none"
                    style={{
                      left: `${Math.max(0, highlightedLocation.x - pad) * 100}%`,
                      top: `${Math.max(0, highlightedLocation.y - pad) * 100}%`,
                      width: `${(highlightedLocation.w + pad * 2) * 100}%`,
                      height: `${(highlightedLocation.h + pad * 2) * 100}%`,
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-stone-400">Select a figure above</p>
        </div>
      )}
    </div>
  );
}

/** Build context snippets for a numeral from all patent text sections. */
function getOccurrences(patent: Patent, numeral: string) {
  const regex = new RegExp(
    `(?:\\(\\s*${numeral}\\s*\\))|(?<=\\b[a-zA-Z][\\w-]*\\s)${numeral}(?=[\\s,;.\\)\\]]|$)`,
    "g"
  );
  const results: { text: string; section: string; occurrenceIndex: number }[] = [];
  let globalIdx = 0;

  const addFromText = (text: string, section: string) => {
    for (const match of text.matchAll(regex)) {
      const start = Math.max(0, match.index! - 40);
      const end = Math.min(text.length, match.index! + match[0].length + 40);
      let snippet = text.slice(start, end).replace(/\s+/g, " ");
      if (start > 0) snippet = "…" + snippet;
      if (end < text.length) snippet = snippet + "…";
      results.push({ text: snippet, section, occurrenceIndex: globalIdx });
      globalIdx++;
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

function DetailsTab({
  patent,
  referenceNumerals,
  activeNumeral,
  onNumeralHover,
  onNumeralClick,
}: {
  patent: Patent;
  referenceNumerals: ReferenceNumeral[];
  activeNumeral: string | null;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
}) {
  const [expandedNumeral, setExpandedNumeral] = useState<string | null>(null);

  const handleRowClick = (numeral: string) => {
    const toggling = expandedNumeral === numeral;
    setExpandedNumeral(toggling ? null : numeral);
    onNumeralClick(toggling ? null : numeral);
  };

  const handleSnippetClick = (occurrenceIndex: number, numeral: string) => {
    onNumeralClick(numeral);
    const allSpans = document.querySelectorAll<HTMLElement>(
      `[data-ref-num="${numeral}"]`
    );
    const target = allSpans[occurrenceIndex];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      // Brief pulse to show which occurrence was jumped to
      target.classList.add("ring-2", "ring-amber-400");
      setTimeout(() => target.classList.remove("ring-2", "ring-amber-400"), 1500);
    }
  };

  const occurrences =
    expandedNumeral ? getOccurrences(patent, expandedNumeral) : [];

  return (
    <div className="p-3 space-y-5 overflow-y-auto">
      {/* Reference numerals */}
      {referenceNumerals.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <Tag className="size-3" />
            Reference Numerals
          </div>
          <div className="border border-stone-200 rounded-md overflow-hidden">
            {referenceNumerals.map((ref) => (
              <div
                key={ref.numeral}
                data-ref-row={ref.numeral}
                className="border-b border-stone-100 last:border-b-0"
              >
                <div
                  onMouseEnter={() => onNumeralHover(ref.numeral)}
                  onMouseLeave={() => onNumeralHover(null)}
                  onClick={() => handleRowClick(ref.numeral)}
                  className={cn(
                    "flex items-center cursor-pointer transition-colors px-2 py-1 text-xs",
                    activeNumeral === ref.numeral
                      ? "bg-amber-100/70"
                      : "hover:bg-stone-50"
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "size-3 shrink-0 text-stone-400 transition-transform mr-1",
                      expandedNumeral === ref.numeral && "rotate-90"
                    )}
                  />
                  <span className="font-mono text-stone-500 w-10 text-right mr-2">
                    {ref.numeral}
                  </span>
                  <span className="text-stone-700 truncate">{ref.label}</span>
                  <span className="ml-auto text-stone-400 text-[10px] pl-2">
                    {ref.count}
                  </span>
                </div>
                {expandedNumeral === ref.numeral && occurrences.length > 0 && (
                  <div className="bg-stone-50 border-t border-stone-100 py-1">
                    {occurrences.map((occ, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSnippetClick(occ.occurrenceIndex, ref.numeral);
                        }}
                        className="w-full text-left px-3 py-1 hover:bg-amber-50 transition-colors flex gap-2 items-start"
                      >
                        <span className="text-[10px] text-amber-600 font-medium shrink-0 mt-0.5 w-24 truncate">
                          {occ.section}
                        </span>
                        <span className="text-[11px] text-stone-500 leading-snug line-clamp-2">
                          {occ.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {patent.classifications.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <Tag className="size-3" />
            Classification
          </div>
          <div className="flex flex-wrap gap-1.5">
            {patent.classifications.map((code) => (
              <Badge key={code} variant="secondary" className="font-mono text-xs">
                {code}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
          <Scale className="size-3" />
          Claim Summary
        </div>
        <div className="text-sm text-stone-600 space-y-1">
          <p>
            <span className="font-medium">{patent.claims.length}</span> total claims
          </p>
          <p>
            <span className="font-medium">
              {patent.claims.filter((c) => c.type === "independent").length}
            </span>{" "}
            independent
          </p>
          <p>
            <span className="font-medium">
              {patent.claims.filter((c) => c.type === "dependent").length}
            </span>{" "}
            dependent
          </p>
        </div>
      </div>

      {patent.pdf_url && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <FileDown className="size-3" />
            Document
          </div>
          <a
            href={patent.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            Download PDF
          </a>
        </div>
      )}
    </div>
  );
}

function OutlineTab({
  patent,
  onScrollTo,
}: {
  patent: Patent;
  onScrollTo: (id: string) => void;
}) {
  const independentClaims = patent.claims.filter((c) => c.type === "independent");
  const getDependents = (parentNum: number) =>
    patent.claims.filter((c) => c.depends_on === parentNum);

  return (
    <div className="p-2 space-y-4 overflow-y-auto">
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-2 mb-1">
          Sections
        </p>
        <button
          onClick={() => onScrollTo("abstract")}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md text-sm text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <FileText className="size-3.5 shrink-0 text-stone-400" />
          Abstract
        </button>
        {patent.description.map((section) => (
          <button
            key={section.heading}
            onClick={() =>
              onScrollTo(
                `section-${section.heading.toLowerCase().replace(/\s+/g, "-")}`
              )
            }
            className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md text-sm text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <FileText className="size-3.5 shrink-0 text-stone-400" />
            <span className="truncate">{titleCase(section.heading)}</span>
          </button>
        ))}
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-2 mb-1">
          Claims
        </p>
        {independentClaims.map((claim) => (
          <ClaimNode
            key={claim.number}
            claim={claim}
            children={getDependents(claim.number)}
            onScrollTo={onScrollTo}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function RightSidebar({
  patent,
  referenceNumerals,
  activeNumeral,
  activeTab,
  onTabChange,
  selectedFigure,
  onSelectFigure,
  onNumeralHover,
  onNumeralClick,
  collapsed,
  onToggle,
  onScrollTo,
  highlightedLocation,
  showAllBboxes,
  onToggleBboxes,
  numeralLocations,
  numeralLabels,
  onBboxClick,
}: RightSidebarProps) {

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-2 border-l border-stone-200 bg-white w-10">
        <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Expand sidebar">
          <List className="size-4 text-stone-500" />
        </Button>
      </div>
    );
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className={cn(
        "flex flex-col border-l border-stone-200 bg-white shrink-0 w-96"
      )}
    >
      {/* Tab bar + collapse */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-stone-100">
        <TabsList className="h-9">
          <TabsTrigger value="figures" className="text-sm px-3 py-1.5 gap-1.5">
            <Image className="size-4" />
            Figures
          </TabsTrigger>
          <TabsTrigger value="details" className="text-sm px-3 py-1.5 gap-1.5">
            <Info className="size-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="outline" className="text-sm px-3 py-1.5 gap-1.5">
            <List className="size-4" />
            Outline
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon-sm" onClick={onToggle} title="Collapse sidebar">
          <PanelRightClose className="size-4 text-stone-400" />
        </Button>
      </div>

      {/* Tab content — fills remaining height */}
      <TabsContent value="figures" className="mt-0 flex-1 min-h-0">
        <FiguresTab
          patent={patent}
          selectedFigure={selectedFigure}
          onSelectFigure={onSelectFigure}
          highlightedLocation={highlightedLocation}
          showAllBboxes={showAllBboxes}
          onToggleBboxes={onToggleBboxes}
          numeralLocations={numeralLocations}
          numeralLabels={numeralLabels}
          onBboxClick={onBboxClick}
        />
      </TabsContent>
      <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto">
        <DetailsTab
          patent={patent}
          referenceNumerals={referenceNumerals}
          activeNumeral={activeNumeral}
          onNumeralHover={onNumeralHover}
          onNumeralClick={onNumeralClick}
        />
      </TabsContent>
      <TabsContent value="outline" className="mt-0 flex-1 overflow-y-auto">
        <OutlineTab patent={patent} onScrollTo={onScrollTo} />
      </TabsContent>
    </Tabs>
  );
}
