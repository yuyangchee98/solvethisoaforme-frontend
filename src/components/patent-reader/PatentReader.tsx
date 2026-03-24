import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, AlertCircle, FileText, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CenterPanel } from "./CenterPanel";
import { RightSidebar } from "./RightSidebar";
import { CompareButton } from "./CompareButton";
import { ComparisonToolbar } from "./ComparisonToolbar";
import { useIsMobile } from "@/lib/useIsMobile";
import { usePatentPanel } from "./usePatentPanel";
import { usePatentRegistry } from "./usePatentRegistry";
import type { PatentPanel } from "./usePatentPanel";

const EXAMPLE_PATENTS = [
  { number: "US11423567B2", title: "Head location/orientation detection method" },
  { number: "US20220075747A1", title: "Multiple hot pluggable device support via emulated switch" },
  { number: "US10956685B2", title: "Sequence-to-sequence prediction using a neural network model" },
];

function SearchForm({
  query,
  onQueryChange,
  onSubmit,
  loading,
  large,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  loading: boolean;
  large?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className={`flex items-center gap-2 ${large ? "max-w-lg w-full" : "flex-1 max-w-xl"}`}>
      <div className="relative flex-1">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 ${large ? "size-5" : "size-4"}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="e.g. US11423567B2"
          className={`w-full rounded-lg border border-stone-200 bg-white text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 ${large ? "py-2.5 pl-11 pr-4" : "py-1.5 pl-9 pr-3 bg-stone-50"}`}
        />
      </div>
      <Button type="submit" size={large ? "default" : "sm"} disabled={loading || !query.trim()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Fetch"}
      </Button>
    </form>
  );
}

/** Renders a RightSidebar wired to a panel's state. */
function PanelSidebar({
  panel,
  collapsed,
  onToggle,
  onScrollTo,
  containerRef,
}: {
  panel: PatentPanel;
  collapsed: boolean;
  onToggle: () => void;
  onScrollTo: (id: string) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}) {
  if (!panel.patent) return null;
  return (
    <RightSidebar
      patent={panel.patent}
      referenceNumerals={panel.referenceNumerals}
      activeNumeral={panel.activeNumeral}
      activeTab={panel.sidebarTab}
      onTabChange={panel.setSidebarTab}
      selectedFigure={panel.selectedFigure}
      onSelectFigure={(i) => {
        panel.setSelectedFigure(i);
        panel.setHighlightedLocation(null);
      }}
      onNumeralHover={panel.setActiveNumeral}
      onNumeralClick={panel.setActiveNumeral}
      onLoadPatent={panel.loadPatent}
      collapsed={collapsed}
      onToggle={onToggle}
      onScrollTo={onScrollTo}
      highlightedLocation={panel.highlightedLocation}
      showAllBboxes={panel.showAllBboxes}
      onToggleBboxes={panel.toggleBboxes}
      numeralLocations={panel.numeralLocations}
      numeralLabels={panel.numeralLabels}
      onBboxClick={panel.handleBboxClick}
      onFigureClick={panel.handleFigLabelClick}
      onScrollToNumeralOccurrence={panel.scrollToNumeralOccurrence}
    />
  );
}

export function PatentReader() {
  const isMobile = useIsMobile();

  // UI state (declared before hooks so callbacks can reference them)
  const [query, setQuery] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(true);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);

  // Auto-expand sidebar when interaction targets it (comparison mode).
  // In normal mode these set state that isn't read, so it's a harmless no-op.
  const openLeftSidebar = useCallback(() => setLeftSidebarCollapsed(false), []);
  const openRightSidebar = useCallback(() => setRightSidebarCollapsed(false), []);

  // Panel hooks (both always instantiated per React rules of hooks)
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const left = usePatentPanel({ containerRef: leftPanelRef, onRequestSidebarOpen: openLeftSidebar });
  const right = usePatentPanel({ containerRef: rightPanelRef, onRequestSidebarOpen: openRightSidebar });

  // Cross-window registry
  const registry = usePatentRegistry();
  useEffect(() => {
    if (left.patent) {
      registry.announce({
        patentNumber: left.patent.patent_number,
        title: left.patent.title,
      });
    } else {
      registry.announce(null);
    }
  }, [left.patent, registry.announce]);

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;
      left.loadPatent(trimmed);
    },
    [query, left.loadPatent]
  );

  const handleExampleClick = useCallback(
    (number: string) => {
      setQuery(number);
      left.loadPatent(number);
    },
    [left.loadPatent]
  );

  // Comparison actions
  const handleCompare = useCallback(
    (patentNumber: string) => {
      setCompareMode(true);
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
      right.loadPatent(patentNumber);
    },
    [right.loadPatent]
  );

  const handleExitCompare = useCallback(() => {
    setCompareMode(false);
  }, []);

  const handleSwap = useCallback(() => {
    const leftNum = left.patent?.patent_number;
    const rightNum = right.patent?.patent_number;
    if (leftNum && rightNum) {
      left.loadPatent(rightNum);
      right.loadPatent(leftNum);
    }
  }, [left.patent, right.patent, left.loadPatent, right.loadPatent]);

  const handleChangeLeft = useCallback(
    (patentNumber: string) => {
      left.loadPatent(patentNumber);
    },
    [left.loadPatent]
  );

  const handleChangeRight = useCallback(
    (patentNumber: string) => {
      right.loadPatent(patentNumber);
    },
    [right.loadPatent]
  );

  // Welcome screen when no patent is loaded
  if (!left.patent && !compareMode) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full space-y-6 -mt-16">
            {/* Heading */}
            <div className="text-center space-y-2">
              <h1 className="text-xl md:text-2xl font-semibold text-stone-800">Patent Reader</h1>
              <p className="text-sm text-stone-500 leading-relaxed">
                Look up any US patent or published application by its publication number.
                The document will be parsed into a structured, readable format with
                navigable sections and claim dependency trees.
              </p>
            </div>

            {/* Search */}
            <SearchForm
              query={query}
              onQueryChange={setQuery}
              onSubmit={handleSearch}
              loading={left.loading}
              large
            />

            {/* Error */}
            {left.error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="size-4 shrink-0" />
                {left.error}
              </div>
            )}

            {/* Format hints */}
            <div className="text-center">
              <p className="text-xs text-stone-400 mb-1">Accepted formats</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["US11423567B2", "US 2022/0075747 A1", "US 11,423,567 B2"].map((fmt) => (
                  <code
                    key={fmt}
                    className="text-xs font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded"
                  >
                    {fmt}
                  </code>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">
                Application serial numbers (e.g. 16/904,029) are not supported.
              </p>
            </div>

            {/* Example patents */}
            <div className="space-y-1.5">
              <p className="text-xs text-stone-400 text-center">Or try an example</p>
              <div className="space-y-1">
                {EXAMPLE_PATENTS.map((ex) => (
                  <button
                    key={ex.number}
                    onClick={() => handleExampleClick(ex.number)}
                    disabled={left.loading}
                    className="flex items-start gap-2.5 w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors group disabled:opacity-50"
                  >
                    <FileText className="size-4 text-stone-400 group-hover:text-amber-600 mt-0.5 shrink-0 transition-colors" />
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-stone-600 group-hover:text-stone-800 transition-colors">
                        {ex.number}
                      </p>
                      <p className="text-xs text-stone-400 truncate">{ex.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Comparison mode ──────────────────────────────────────────────────
  if (compareMode) {
    return (
      <div className="flex flex-col h-full">
        <ComparisonToolbar
          leftPatent={left.patent}
          rightPatent={right.patent}
          onSwap={handleSwap}
          onChangeLeft={handleChangeLeft}
          onChangeRight={handleChangeRight}
          onExit={handleExitCompare}
          leftLoading={left.loading}
          rightLoading={right.loading}
        />

        <div className="flex flex-1 min-h-0">
          {/* Left panel */}
          <div
            ref={leftPanelRef}
            className="flex flex-1 min-w-0 border-r border-stone-200"
          >
            {left.patent ? (
              <CenterPanel
                patent={left.patent}
                activeNumeral={left.activeNumeral}
                highlights={left.numeralHighlights}
                onNumeralHover={left.setActiveNumeral}
                onNumeralClick={left.handleNumeralClickFromSpec}
                onFigureClick={left.handleFigureClick}
                onClaimClick={left.handleClaimClick}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                {left.loading ? (
                  <Loader2 className="size-6 animate-spin text-stone-400" />
                ) : left.error ? (
                  <div className="flex items-center gap-2 text-sm text-red-600 px-4">
                    <AlertCircle className="size-4 shrink-0" />
                    {left.error}
                  </div>
                ) : null}
              </div>
            )}

            {/* Inline collapsible sidebar */}
            {left.patent && (
              <PanelSidebar
                panel={left}
                collapsed={leftSidebarCollapsed}
                onToggle={() => setLeftSidebarCollapsed((c) => !c)}
                onScrollTo={left.handleScrollTo}
                containerRef={leftPanelRef}
              />
            )}
          </div>

          {/* Right panel */}
          <div
            ref={rightPanelRef}
            className="flex flex-1 min-w-0"
          >
            {right.patent ? (
              <CenterPanel
                patent={right.patent}
                activeNumeral={right.activeNumeral}
                highlights={right.numeralHighlights}
                onNumeralHover={right.setActiveNumeral}
                onNumeralClick={right.handleNumeralClickFromSpec}
                onFigureClick={right.handleFigureClick}
                onClaimClick={right.handleClaimClick}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                {right.loading ? (
                  <Loader2 className="size-6 animate-spin text-stone-400" />
                ) : right.error ? (
                  <div className="flex items-center gap-2 text-sm text-red-600 px-4">
                    <AlertCircle className="size-4 shrink-0" />
                    {right.error}
                  </div>
                ) : null}
              </div>
            )}

            {/* Inline collapsible sidebar */}
            {right.patent && (
              <PanelSidebar
                panel={right}
                collapsed={rightSidebarCollapsed}
                onToggle={() => setRightSidebarCollapsed((c) => !c)}
                onScrollTo={right.handleScrollTo}
                containerRef={rightPanelRef}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Normal mode (single patent loaded) ───────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Compact search bar + compare button */}
      <div className="border-b border-stone-200 bg-white px-4 py-2 flex items-center gap-2">
        <SearchForm
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSearch}
          loading={left.loading}
        />
        <CompareButton
          currentPatent={left.patent}
          otherTabs={registry.others}
          isMobile={isMobile}
          onCompare={handleCompare}
        />
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0 relative" ref={leftPanelRef}>
        <CenterPanel
          patent={left.patent!}
          activeNumeral={left.activeNumeral}
          highlights={left.numeralHighlights}
          onNumeralHover={left.setActiveNumeral}
          onNumeralClick={left.handleNumeralClickFromSpec}
          onFigureClick={left.handleFigureClick}
          onClaimClick={left.handleClaimClick}
        />

        {/* Desktop: inline sidebar */}
        {!isMobile && (
          <PanelSidebar
            panel={left}
            collapsed={rightCollapsed}
            onToggle={() => setRightCollapsed((c) => !c)}
            onScrollTo={left.handleScrollTo}
          />
        )}

        {/* Mobile: floating button + Sheet drawer */}
        {isMobile && (
          <>
            <Button
              size="icon"
              variant="outline"
              className="absolute bottom-4 right-4 z-10 size-11 rounded-full shadow-md bg-white border-stone-200"
              onClick={() => setSheetOpen(true)}
            >
              <PanelRight className="size-5 text-stone-600" />
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetContent
                side="right"
                showCloseButton={false}
                className="w-[85vw] max-w-md p-0 flex flex-col"
              >
                <PanelSidebar
                  panel={left}
                  collapsed={false}
                  onToggle={() => setSheetOpen(false)}
                  onScrollTo={(id) => {
                    setSheetOpen(false);
                    setTimeout(() => left.handleScrollTo(id), 300);
                  }}
                />
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </div>
  );
}
