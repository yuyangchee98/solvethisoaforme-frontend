import { useState, useEffect, useRef } from "react";
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
  BookOpen,
  ArrowUpRight,
  GraduationCap,
  GitBranch,
  ScrollText,
  FileStack,
  Globe,
  Search,
  Plus,
  X,
  RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { Patent, PatentClaim } from "./types";
import type { ReferenceNumeral, NumeralLocation } from "@/lib/api";
import type { SearchTerm, SearchOccurrence } from "./search-utils";
import { SEARCH_COLORS } from "./search-utils";

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
  onFigureClick: (figNum: number) => void;
  /** Scoped scroll-to-occurrence for comparison mode isolation */
  onScrollToNumeralOccurrence?: (numeral: string, occurrenceIndex: number) => void;
  /** Navigate to a different patent (e.g. clicked citation) */
  onLoadPatent?: (pubNumber: string) => void;
  // Search
  searchTerms?: SearchTerm[];
  searchOccurrences?: SearchOccurrence[];
  onAddSearchTerm?: (term: string) => void;
  onRemoveSearchTerm?: (id: string) => void;
  onClearSearchTerms?: () => void;
  onScrollToSearchOccurrence?: (termIndex: number, globalOccurrenceIndex: number) => void;
  searchWholeWord?: boolean;
  searchCaseSensitive?: boolean;
  onToggleSearchWholeWord?: () => void;
  onToggleSearchCaseSensitive?: () => void;
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
        <span className="truncate">Claim {claim.number}</span>
        {claim.type === "independent" && hasChildren && (
          <span className="text-[10px] text-stone-400 ml-auto shrink-0">
            +{children.length}
          </span>
        )}
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
  onFigureClick,
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
  onFigureClick: (figNum: number) => void;
}) {
  if (patent.figure_urls.length === 0) {
    return (
      <p className="text-xs text-stone-400 italic p-3">
        No figures available for this patent.
      </p>
    );
  }

  const [rotation, setRotation] = useState(0);
  // Reset rotation when switching figures
  useEffect(() => setRotation(0), [selectedFigure]);

  // Measure container so we can scale down when rotated sideways
  const figContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = figContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isSideways = rotation === 90 || rotation === 270;
  // When rotated 90/270, the visual width becomes the layout height and vice versa.
  // Scale down so the rotated image fits within the container.
  const sideScale =
    isSideways && containerSize && containerSize.h > 0
      ? Math.min(1, containerSize.w / containerSize.h)
      : 1;

  const elementsOnSheet: { numeral: string; label: string }[] = [];
  if (selectedFigure !== null) {
    const seen = new Set<string>();
    for (const [numeral, locs] of Object.entries(numeralLocations)) {
      for (const loc of locs) {
        if (loc.sheet === selectedFigure && loc.type !== "figure" && !seen.has(numeral)) {
          seen.add(numeral);
          elementsOnSheet.push({ numeral, label: numeralLabels[numeral] ?? "" });
        }
      }
    }
    elementsOnSheet.sort((a, b) => parseInt(a.numeral, 10) - parseInt(b.numeral, 10));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thumbnail strip — skip index 0 (cover sheet) */}
      <div className="flex gap-1.5 p-2 overflow-x-auto border-b border-stone-100 shrink-0 items-end">
        {patent.figure_urls.map((url, i) => {
          if (i === 0) return null; // skip cover sheet
          return (
            <button
              key={url}
              onClick={() => onSelectFigure(selectedFigure === i ? null : i)}
              className={cn(
                "rounded border overflow-hidden bg-white shrink-0 transition-all hover:border-amber-400 flex flex-col items-center",
                selectedFigure === i
                  ? "border-amber-500 ring-1 ring-amber-500/30"
                  : "border-stone-200"
              )}
            >
              <img
                src={url}
                alt={`Figure ${i}`}
                className="h-16 w-auto"
                loading="lazy"
              />
              <span className={cn(
                "text-[9px] pb-0.5 transition-colors",
                selectedFigure === i ? "text-amber-600 font-medium" : "text-stone-400"
              )}>
                {i}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected figure — sized to fit vertically */}
      {selectedFigure !== null ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Bbox toggles */}
          <div className="flex items-center justify-end gap-1 px-3 pt-2">
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
              Boxes
            </button>
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              title="Rotate figure 90°"
            >
              <RotateCw className="size-3.5" />
              Rotate
            </button>
          </div>
          <div ref={figContainerRef} className="flex-1 min-h-0 flex items-center justify-center px-3 pb-3 overflow-hidden">
            <div
              className="relative inline-block max-w-full max-h-full transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg) scale(${sideScale})` }}
            >
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
                const bboxEl = ({ numeral, loc, i }: { numeral: string; loc: NumeralLocation; i: number }) => {
                  const isFigLabel = loc.type === "figure";
                  const label = isFigLabel ? null : numeralLabels[numeral];

                  const boxDiv = (
                    <div
                      className={cn(
                        "absolute rounded-sm cursor-pointer transition-colors",
                        isFigLabel
                          ? "border border-sky-500/60 bg-sky-400/15 hover:bg-sky-400/35 hover:border-sky-500"
                          : "border border-amber-500/60 bg-amber-400/15 hover:bg-amber-400/35 hover:border-amber-500"
                      )}
                      onClick={() => {
                        if (isFigLabel) {
                          const figNum = parseInt(numeral.replace(/^FIG\.\s*/, ""), 10);
                          if (!isNaN(figNum)) onFigureClick(figNum);
                        } else {
                          onBboxClick(numeral);
                        }
                      }}
                      style={{
                        left: `${Math.max(0, loc.x - pad) * 100}%`,
                        top: `${Math.max(0, loc.y - pad) * 100}%`,
                        width: `${(loc.w + pad * 2) * 100}%`,
                        height: `${(loc.h + pad * 2) * 100}%`,
                      }}
                    />
                  );

                  return (
                    <Tooltip key={`${numeral}-${i}`}>
                      <TooltipTrigger asChild>{boxDiv}</TooltipTrigger>
                      <TooltipContent side="top" sideOffset={4}>
                        {isFigLabel ? (
                          <span>FIG. {numeral.replace(/^FIG\.\s*/, "")}</span>
                        ) : label ? (
                          <span><span className="font-mono">{numeral}</span> — {label}</span>
                        ) : (
                          <span className="font-mono">{numeral}</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                };

                return (
                  <TooltipProvider>
                    {allOnSheet.map(({ numeral, loc }, i) => bboxEl({ numeral, loc, i }))}
                  </TooltipProvider>
                );
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
          {/* Element numbers list */}
          {elementsOnSheet.length > 0 && (
            <div className="shrink-0 border-t border-stone-100">
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wide">
                  Elements on sheet
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto px-1 pb-2">
                {elementsOnSheet.map(({ numeral, label }) => (
                  <button
                    key={numeral}
                    onClick={() => onBboxClick(numeral)}
                    className="w-full flex items-baseline gap-2 px-2 py-0.5 rounded text-left hover:bg-amber-50 transition-colors group"
                  >
                    <span className="font-mono text-xs text-amber-700 group-hover:text-amber-900 w-8 text-right shrink-0">
                      {numeral}
                    </span>
                    <span className="text-xs text-stone-500 group-hover:text-stone-700 truncate">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

function CollapsibleSection({
  icon,
  label,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors"
      >
        <ChevronRight
          className={cn("size-3 transition-transform", open && "rotate-90")}
        />
        {icon}
        {label}
      </button>
      {open && children}
    </div>
  );
}

function CitationList({
  citations,
  onLoadPatent,
}: {
  citations: { publication_number: string; title: string; examiner_cited: boolean }[];
  onLoadPatent?: (pubNumber: string) => void;
}) {
  return (
    <div className="space-y-1">
      {citations.map((cite, i) => (
        <div
          key={`${cite.publication_number}-${i}`}
          className="flex items-start gap-2 text-xs"
        >
          <button
            onClick={() => onLoadPatent?.(cite.publication_number)}
            className="font-mono text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0"
          >
            {cite.publication_number}
          </button>
          <span className="text-stone-500 truncate">{cite.title}</span>
          {cite.examiner_cited && (
            <span
              className="text-[10px] text-stone-400 shrink-0"
              title="Cited by examiner"
            >
              *
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DetailsTab({
  patent,
  referenceNumerals,
  activeNumeral,
  onNumeralHover,
  onNumeralClick,
  onScrollToNumeralOccurrence,
  onLoadPatent,
}: {
  patent: Patent;
  referenceNumerals: ReferenceNumeral[];
  activeNumeral: string | null;
  onNumeralHover: (numeral: string | null) => void;
  onNumeralClick: (numeral: string | null) => void;
  onScrollToNumeralOccurrence?: (numeral: string, occurrenceIndex: number) => void;
  onLoadPatent?: (pubNumber: string) => void;
}) {
  const [expandedNumeral, setExpandedNumeral] = useState<string | null>(null);

  const handleRowClick = (numeral: string) => {
    const toggling = expandedNumeral === numeral;
    setExpandedNumeral(toggling ? null : numeral);
    onNumeralClick(toggling ? null : numeral);
  };

  const handleSnippetClick = (occurrenceIndex: number, numeral: string) => {
    if (onScrollToNumeralOccurrence) {
      onScrollToNumeralOccurrence(numeral, occurrenceIndex);
    } else {
      onNumeralClick(numeral);
      const allSpans = document.querySelectorAll<HTMLElement>(
        `[data-ref-num="${numeral}"]`
      );
      const target = allSpans[occurrenceIndex];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("ring-2", "ring-amber-400");
        setTimeout(() => target.classList.remove("ring-2", "ring-amber-400"), 1500);
      }
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
                    "flex items-center cursor-pointer transition-colors px-2.5 py-1.5 text-xs",
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
                  <span className="ml-auto text-[10px] text-stone-500 bg-stone-100 rounded-full px-1.5 py-0.5 shrink-0 font-medium">
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
          Claims
        </div>
        <p className="text-sm text-stone-600">
          <span className="font-medium">{patent.claims.length}</span> claims
          <span className="mx-1.5 text-stone-300">·</span>
          <span className="font-medium">{patent.claims.filter((c) => c.type === "independent").length}</span> ind.
          <span className="mx-1.5 text-stone-300">·</span>
          <span className="font-medium">{patent.claims.filter((c) => c.type === "dependent").length}</span> dep.
        </p>
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

      {/* ── Related documents divider ── */}
      <div className="border-t border-stone-200 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-300 mb-3">Related</p>
      </div>

      {/* ── Patent Citations ── */}
      {(patent.patent_citations?.length ?? 0) > 0 && (
        <CollapsibleSection
          icon={<BookOpen className="size-3" />}
          label={`Patent Citations (${patent.patent_citations!.length})`}
        >
          <CitationList
            citations={patent.patent_citations!}
            onLoadPatent={onLoadPatent}
          />
        </CollapsibleSection>
      )}

      {/* ── Cited By ── */}
      {(patent.cited_by?.length ?? 0) > 0 && (
        <CollapsibleSection
          icon={<ArrowUpRight className="size-3" />}
          label={`Cited By (${patent.cited_by!.length})`}
        >
          <CitationList
            citations={patent.cited_by!}
            onLoadPatent={onLoadPatent}
          />
        </CollapsibleSection>
      )}

      {/* ── Non-Patent Citations ── */}
      {(patent.non_patent_citations?.length ?? 0) > 0 && (
        <CollapsibleSection
          icon={<GraduationCap className="size-3" />}
          label={`Non-Patent Citations (${patent.non_patent_citations!.length})`}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {patent.non_patent_citations!.map((cite, i) => (
              <p
                key={i}
                className="text-xs text-stone-600 leading-relaxed"
              >
                {cite.title}
              </p>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Patent Family ── */}
      {((patent.family_applications?.length ?? 0) > 0 ||
        (patent.country_status?.length ?? 0) > 0) && (
        <CollapsibleSection
          icon={<GitBranch className="size-3" />}
          label="Patent Family"
        >
          <div className="space-y-3">
            {(patent.family_applications?.length ?? 0) > 0 && (
              <div className="space-y-1">
                {patent.family_applications!.map((app) => (
                  <div key={app.application_number} className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      {app.representative_publication ? (
                        <button
                          onClick={() =>
                            onLoadPatent?.(app.representative_publication)
                          }
                          className="font-mono text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0"
                        >
                          {app.representative_publication}
                        </button>
                      ) : (
                        <span className="font-mono text-stone-500 shrink-0">
                          {app.application_number}
                        </span>
                      )}
                      {app.status && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            app.status === "Active" && "border-green-300 text-green-700",
                            app.status === "Ceased" && "border-red-300 text-red-700",
                            app.status === "Pending" && "border-amber-300 text-amber-700"
                          )}
                        >
                          {app.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-stone-500 truncate">{app.title}</p>
                    {app.expiration && (
                      <p className="text-stone-400 text-[10px]">
                        Expires: {app.expiration}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(patent.country_status?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {patent.country_status!.map((cs) => (
                  <Badge
                    key={cs.country_code}
                    variant="secondary"
                    className={cn(
                      "font-mono text-xs",
                      cs.publication_number ? "cursor-pointer" : "cursor-default"
                    )}
                    onClick={() =>
                      cs.publication_number &&
                      onLoadPatent?.(cs.publication_number)
                    }
                  >
                    <Globe className="size-3 mr-1" />
                    {cs.country_code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Legal Events ── */}
      {(patent.legal_events?.length ?? 0) > 0 && (
        <CollapsibleSection
          icon={<ScrollText className="size-3" />}
          label={`Legal Events (${patent.legal_events!.length})`}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {patent.legal_events!.map((evt, i) => (
              <div key={i} className="border-l-2 border-stone-200 pl-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-stone-500">{evt.date}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {evt.code}
                  </Badge>
                </div>
                <p className="text-xs text-stone-600">{evt.title}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* ── Similar Documents ── */}
      {(patent.similar_documents?.length ?? 0) > 0 && (
        <CollapsibleSection
          icon={<FileStack className="size-3" />}
          label={`Similar Documents (${patent.similar_documents!.length})`}
          defaultOpen={false}
        >
          <CitationList
            citations={patent.similar_documents!.map((d) => ({
              publication_number: d.publication_number,
              title: d.title,
              examiner_cited: false,
            }))}
            onLoadPatent={onLoadPatent}
          />
        </CollapsibleSection>
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
          className="w-full text-left px-2 py-1.5 rounded-md text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
        >
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
            className="w-full text-left px-2 py-1.5 rounded-md text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors truncate"
          >
            {titleCase(section.heading)}
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

// ── Search tab ────────────────────────────────────────────────────────────

function SearchTab({
  searchTerms,
  searchOccurrences,
  onAddSearchTerm,
  onRemoveSearchTerm,
  onClearSearchTerms,
  onScrollToSearchOccurrence,
  wholeWord,
  caseSensitive,
  onToggleWholeWord,
  onToggleCaseSensitive,
}: {
  searchTerms: SearchTerm[];
  searchOccurrences: SearchOccurrence[];
  onAddSearchTerm: (term: string) => void;
  onRemoveSearchTerm: (id: string) => void;
  onClearSearchTerms: () => void;
  onScrollToSearchOccurrence: (termIndex: number, globalOccurrenceIndex: number) => void;
  wholeWord: boolean;
  caseSensitive: boolean;
  onToggleWholeWord: () => void;
  onToggleCaseSensitive: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddSearchTerm(inputValue.trim());
      setInputValue("");
      inputRef.current?.focus();
    }
  };

  // Count occurrences per term
  const termCounts: Record<number, number> = {};
  for (const occ of searchOccurrences) {
    termCounts[occ.termIndex] = (termCounts[occ.termIndex] ?? 0) + 1;
  }

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      {/* Input with inline toggles */}
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <div className="flex-1 flex items-center rounded-md border border-stone-200 bg-white focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-500">
          <input
            ref={inputRef}
            data-search-input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search term..."
            className="flex-1 text-sm px-2.5 py-1.5 bg-transparent placeholder:text-stone-400 focus:outline-none min-w-0"
          />
          <div className="flex items-center gap-0.5 pr-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleCaseSensitive}
              title="Match case"
              className={cn(
                "text-[11px] font-semibold rounded px-1 py-0.5 transition-colors",
                caseSensitive
                  ? "bg-amber-100 text-amber-700"
                  : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              )}
            >
              Aa
            </button>
            <button
              type="button"
              onClick={onToggleWholeWord}
              title="Match whole word"
              className={cn(
                "text-[11px] font-semibold rounded px-1 py-0.5 transition-colors font-mono",
                wholeWord
                  ? "bg-amber-100 text-amber-700"
                  : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              )}
            >
              W
            </button>
          </div>
        </div>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!inputValue.trim()}
          className="px-2"
        >
          <Plus className="size-4" />
        </Button>
      </form>

      {/* Active term chips */}
      {searchTerms.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            {searchTerms.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 text-xs rounded-md border border-stone-200 bg-white px-2 py-1"
              >
                <span
                  className={cn("size-2.5 rounded-full shrink-0", SEARCH_COLORS[t.termIndex % SEARCH_COLORS.length])}
                />
                <span className="text-stone-700 max-w-[120px] truncate">{t.term}</span>
                <span className="text-stone-400 text-[10px]">
                  {termCounts[t.termIndex] ?? 0}
                </span>
                <button
                  onClick={() => onRemoveSearchTerm(t.id)}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          {searchTerms.length > 1 && (
            <button
              onClick={onClearSearchTerms}
              className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Hit list */}
      {searchTerms.length > 0 && searchOccurrences.length > 0 && (
        <div className="space-y-3">
          {searchTerms.map((t) => {
            const termOccs = searchOccurrences.filter((o) => o.termIndex === t.termIndex);
            if (termOccs.length === 0) return null;
            return (
              <div key={t.id} className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
                  <span
                    className={cn("size-2.5 rounded-full shrink-0", SEARCH_COLORS[t.termIndex % SEARCH_COLORS.length])}
                  />
                  {t.term}
                  <span className="text-[10px] font-normal">({termOccs.length})</span>
                </div>
                <div className="border border-stone-200 rounded-md overflow-hidden">
                  {termOccs.map((occ, i) => (
                    <button
                      key={i}
                      onClick={() => onScrollToSearchOccurrence(occ.termIndex, occ.globalOccurrenceIndex)}
                      className="w-full text-left px-3 py-1.5 hover:bg-stone-50 transition-colors flex gap-2 items-start border-b border-stone-100 last:border-b-0"
                    >
                      <span className="text-[10px] text-amber-600 font-medium shrink-0 mt-0.5 w-24 truncate">
                        {occ.section}
                      </span>
                      <span className="text-[11px] text-stone-500 leading-snug line-clamp-2">
                        {occ.snippet}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {searchTerms.length === 0 && (
        <p className="text-xs text-stone-400 italic">
          Enter a term above to search within the patent text.
        </p>
      )}
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
  onFigureClick,
  onScrollToNumeralOccurrence,
  onLoadPatent,
  searchTerms,
  searchOccurrences,
  onAddSearchTerm,
  onRemoveSearchTerm,
  onClearSearchTerms,
  onScrollToSearchOccurrence,
  searchWholeWord,
  searchCaseSensitive,
  onToggleSearchWholeWord,
  onToggleSearchCaseSensitive,
}: RightSidebarProps) {

  if (collapsed) {
    return (
      <div className="flex flex-col items-center pt-2 pb-2 gap-0.5 border-l border-stone-200 bg-white w-12">
        {[
          { value: "figures", icon: Image, label: "Figures" },
          { value: "details", icon: Info, label: "Details" },
          { value: "outline", icon: List, label: "Outline" },
          { value: "search", icon: Search, label: "Search" },
        ].map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => { onTabChange(value); onToggle(); }}
            title={label}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
              activeTab === value
                ? "text-amber-600 bg-amber-50/80"
                : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
            )}
          >
            <Icon className="size-[18px]" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onToggle}
          title="Expand sidebar"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <PanelRightClose className="size-[18px] rotate-180" />
        </button>
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
      <div className="flex items-center border-b border-stone-200">
        <TabsList className="flex flex-1 h-auto bg-transparent p-0 rounded-none -mb-px">
          {(["figures", "details", "outline", "search"] as const).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className={cn(
                "flex-1 rounded-none py-3 text-[13px] font-medium",
                "border-b-2 border-transparent bg-transparent shadow-none",
                "text-stone-400 hover:text-stone-500",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                "data-[state=active]:border-amber-500 data-[state=active]:text-stone-800",
                "transition-colors duration-150"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button variant="ghost" size="icon-sm" onClick={onToggle} title="Collapse sidebar" className="shrink-0 mr-1.5">
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
          onFigureClick={onFigureClick}
        />
      </TabsContent>
      <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto">
        <DetailsTab
          patent={patent}
          referenceNumerals={referenceNumerals}
          activeNumeral={activeNumeral}
          onNumeralHover={onNumeralHover}
          onNumeralClick={onNumeralClick}
          onScrollToNumeralOccurrence={onScrollToNumeralOccurrence}
          onLoadPatent={onLoadPatent}
        />
      </TabsContent>
      <TabsContent value="outline" className="mt-0 flex-1 overflow-y-auto">
        <OutlineTab patent={patent} onScrollTo={onScrollTo} />
      </TabsContent>
      <TabsContent value="search" className="mt-0 flex-1 overflow-y-auto">
        <SearchTab
          searchTerms={searchTerms ?? []}
          searchOccurrences={searchOccurrences ?? []}
          onAddSearchTerm={onAddSearchTerm ?? (() => {})}
          onRemoveSearchTerm={onRemoveSearchTerm ?? (() => {})}
          onClearSearchTerms={onClearSearchTerms ?? (() => {})}
          onScrollToSearchOccurrence={onScrollToSearchOccurrence ?? (() => {})}
          wholeWord={searchWholeWord ?? false}
          caseSensitive={searchCaseSensitive ?? false}
          onToggleWholeWord={onToggleSearchWholeWord ?? (() => {})}
          onToggleCaseSensitive={onToggleSearchCaseSensitive ?? (() => {})}
        />
      </TabsContent>
    </Tabs>
  );
}
