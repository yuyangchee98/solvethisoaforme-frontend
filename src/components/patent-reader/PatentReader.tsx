import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, AlertCircle, FileText, PanelRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CenterPanel } from "./CenterPanel";
import { RightSidebar } from "./RightSidebar";
import { ComparisonToolbar } from "./ComparisonToolbar";
import { useIsMobile } from "@/lib/useIsMobile";
import { usePatentPanel } from "./usePatentPanel";
import { usePatentRegistry } from "./usePatentRegistry";
import type { PatentPanel } from "./usePatentPanel";

// ── URL state helpers ────────────────────────────────────────────────
function getUrlParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

function updateUrl(patent: string | null, compare: string | null) {
  const url = new URL(window.location.href);
  if (patent) url.searchParams.set('patent', patent);
  else url.searchParams.delete('patent');
  if (compare) url.searchParams.set('compare', compare);
  else url.searchParams.delete('compare');
  window.history.replaceState({}, '', url.toString());
}

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

function PatentSearchDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (patentNumber: string) => void;
  loading: boolean;
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onOpenChange(false);
    setInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Load patent</DialogTitle>
          <DialogDescription>
            Enter a publication number &mdash; US, EP, WO, CN, JP, KR, and 100+ other jurisdictions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. US11423567B2"
              className="w-full rounded-lg border border-stone-200 bg-white text-sm py-2.5 pl-10 pr-4 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Fetch"}
          </Button>
        </form>

        {/* Example patents */}
        <div className="space-y-1 pt-2 border-t border-stone-100">
          <p className="text-xs text-stone-400">Examples</p>
          {EXAMPLE_PATENTS.map((ex) => (
            <button
              key={ex.number}
              onClick={() => {
                onSubmit(ex.number);
                onOpenChange(false);
                setInput("");
              }}
              disabled={loading}
              className="flex items-start gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-stone-100 transition-colors group disabled:opacity-50"
            >
              <FileText className="size-3.5 text-stone-400 group-hover:text-amber-600 mt-0.5 shrink-0 transition-colors" />
              <div className="min-w-0">
                <p className="text-xs font-mono text-stone-600">{ex.number}</p>
                <p className="text-[11px] text-stone-400 truncate">{ex.title}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
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
      searchTerms={panel.searchTerms}
      searchOccurrences={panel.searchOccurrences}
      onAddSearchTerm={panel.addSearchTerm}
      onRemoveSearchTerm={panel.removeSearchTerm}
      onClearSearchTerms={panel.clearSearchTerms}
      onScrollToSearchOccurrence={panel.scrollToSearchOccurrence}
      searchWholeWord={panel.searchWholeWord}
      searchCaseSensitive={panel.searchCaseSensitive}
      onToggleSearchWholeWord={panel.toggleSearchWholeWord}
      onToggleSearchCaseSensitive={panel.toggleSearchCaseSensitive}
    />
  );
}

function AnalysisStatus({ panel }: { panel: PatentPanel }) {
  const items = [
    { key: "num", label: "Numerals", loading: panel.numeralsLoading },
    { key: "fig", label: "Figures", loading: panel.figureMapLoading },
    { key: "elem", label: "Elements", loading: panel.claimElementsLoading },
  ];
  const anyLoading = items.some((i) => i.loading);
  const allDone = !anyLoading && panel.patent;

  const [hasStarted, setHasStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (anyLoading) {
      setHasStarted(true);
      setDismissed(false);
    }
  }, [anyLoading]);

  useEffect(() => {
    if (hasStarted && allDone) {
      const t = setTimeout(() => setDismissed(true), 2000);
      return () => clearTimeout(t);
    }
  }, [hasStarted, allDone]);

  if (!hasStarted || dismissed) return null;

  return (
    <>
      <span className="text-stone-200 shrink-0">|</span>
      {items.map((item) => (
        <span key={item.key} className="flex items-center gap-1 shrink-0 text-[11px]">
          {item.loading ? (
            <Loader2 className="size-3 animate-spin text-amber-500" />
          ) : (
            <Check className="size-3 text-emerald-500" />
          )}
          <span className={item.loading ? "text-stone-500" : "text-stone-400"}>
            {item.label}
          </span>
        </span>
      ))}
    </>
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
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);


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

  // Restore state from URL on mount
  useEffect(() => {
    const patentParam = getUrlParam('patent');
    const compareParam = getUrlParam('compare');
    if (patentParam) {
      setQuery(patentParam);
      left.loadPatent(patentParam);
    }
    if (compareParam) {
      setCompareMode(true);
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
      right.loadPatent(compareParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL when state changes
  useEffect(() => {
    updateUrl(
      left.patent?.patent_number ?? null,
      compareMode && right.patent ? right.patent.patent_number : null,
    );
  }, [left.patent, right.patent, compareMode]);

  // Intercept Cmd/Ctrl+F → open search tab & focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        // Only intercept when a patent is loaded
        if (!left.patent) return;
        e.preventDefault();
        if (compareMode) {
          setLeftSidebarCollapsed(false);
          left.setSidebarTab("search");
        } else if (isMobile) {
          setSheetOpen(true);
          left.setSidebarTab("search");
        } else {
          setRightCollapsed(false);
          left.setSidebarTab("search");
        }
        // Focus the search input after tab switch renders
        requestAnimationFrame(() => {
          // Use document — on mobile the Sheet is a portal outside the panel ref
          const input = document.querySelector<HTMLInputElement>(
            '[data-search-input]'
          );
          input?.focus();
        });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [left.patent, compareMode, isMobile]);

  // Intercept Cmd/Ctrl+K → open patent search dialog
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchDialogOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
      <div className="flex flex-col h-full relative overflow-hidden">
        {/* Background mockup */}
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none" aria-hidden="true">
          <div className="w-full max-w-5xl mx-auto px-6 translate-y-[38%] md:translate-y-[30%]">
            <div className="rounded-xl border border-stone-200/60 bg-white shadow-lg overflow-hidden opacity-40">
              {/* Chrome bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-400">Patent Reader</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-400 font-medium">US11423567B2</div>
              </div>
              {/* Title bar */}
              <div className="px-4 py-2 border-b border-stone-100 bg-white">
                <p className="text-[12px] font-medium text-stone-700 truncate">Methods and systems for detecting head location and orientation</p>
              </div>
              {/* Two-panel layout */}
              <div className="flex" style={{ minHeight: 340 }}>
                {/* Main content */}
                <div className="flex-1 p-4 border-r border-stone-100 bg-stone-50/50 space-y-3">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Abstract</p>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    A method for detecting head location and orientation using a sensor array{" "}
                    <span className="font-mono text-[0.8em] text-amber-600 bg-amber-50 rounded px-0.5">102</span>{" "}
                    and processing unit <span className="font-mono text-[0.8em] text-stone-400 rounded px-0.5">104</span>.
                    The system generates a depth map and applies machine learning models.
                  </p>
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Description</p>
                  <div className="space-y-2">
                    {[
                      { para: "[0003]", text: "FIG. 1 illustrates an exemplary system 100 for head tracking. The system 100 includes a sensor array 102 and a processing unit 104 connected via a data bus 106." },
                      { para: "[0004]", text: "The sensor array 102 comprises one or more depth sensors configured to capture three-dimensional point cloud data of a scene." },
                      { para: "[0005]", text: "The processing unit 104 receives the point cloud data via the data bus 106 and generates a depth map representing the spatial distribution of surfaces." },
                    ].map((p) => (
                      <div key={p.para} className="flex gap-2">
                        <span className="text-[10px] font-mono text-stone-300 shrink-0 w-10 text-right pt-0.5">{p.para}</span>
                        <p className="text-[11px] text-stone-600 leading-relaxed">{p.text}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Claims</p>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className="text-[10px] font-mono font-medium text-stone-400 shrink-0 w-5 text-right pt-0.5">1.</span>
                      <p className="text-[11px] text-stone-600 leading-relaxed">A method for detecting head location and orientation, the method comprising: receiving, by a processor, image data from a sensor array...</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-mono font-medium text-stone-400 shrink-0 w-5 text-right pt-0.5">2.</span>
                      <p className="text-[11px] text-stone-600 leading-relaxed">The method of <span className="text-violet-600 font-medium">claim 1</span>, wherein the sensor comprises a depth camera.</p>
                    </div>
                  </div>
                </div>
                {/* Sidebar */}
                <div className="w-48 p-3 bg-white space-y-1 hidden md:block">
                  <p className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Reference Numerals</p>
                  {[
                    { num: "100", label: "system", count: 8 },
                    { num: "102", label: "sensor array", count: 6, active: true },
                    { num: "104", label: "processing unit", count: 4 },
                    { num: "106", label: "data bus", count: 3 },
                    { num: "108", label: "memory module", count: 2 },
                  ].map((item) => (
                    <div key={item.num} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${item.active ? "bg-amber-50" : ""}`}>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${item.active ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-500"}`}>{item.num}</span>
                      <span className="text-[10px] text-stone-500 flex-1 truncate">{item.label}</span>
                      <span className="text-[9px] text-stone-300">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Gradient fade at top so it blends into background */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-50 via-stone-50/80 to-transparent" />
        </div>

        {/* Foreground content */}
        <div className="flex-1 flex items-center justify-center px-4 relative z-10">
          <div className="max-w-lg w-full space-y-6 -mt-16">
            {/* Heading */}
            <div className="text-center space-y-2">
              <h1 className="text-xl md:text-2xl font-semibold text-stone-800">Patent Reader</h1>
              <p className="text-sm text-stone-500 leading-relaxed">
                Enter any patent number to get a structured, navigable view with claim trees, reference numerals, and figure mapping.
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

            {/* Example patents */}
            <div className="space-y-1.5">
              <p className="text-xs text-stone-400 text-center">Or try an example</p>
              <div className="space-y-1">
                {EXAMPLE_PATENTS.map((ex) => (
                  <button
                    key={ex.number}
                    onClick={() => handleExampleClick(ex.number)}
                    disabled={left.loading}
                    className="flex items-start gap-2.5 w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100/80 transition-colors group disabled:opacity-50"
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

        <PatentSearchDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
          onSubmit={(num) => {
            setQuery(num);
            left.loadPatent(num);
          }}
          loading={left.loading}
        />
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
                activeElementGroup={left.activeElementGroup}
                highlights={left.numeralHighlights}
                claimElements={left.claimElements}
                searchHighlights={left.searchHighlights}
                onNumeralHover={left.setActiveNumeral}
                onNumeralClick={left.handleNumeralClickFromSpec}
                onFigureClick={left.handleFigureClick}
                onClaimClick={left.handleClaimClick}
                onElementHover={left.setActiveElementGroup}
                onElementClick={left.handleElementClick}
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
                activeElementGroup={right.activeElementGroup}
                highlights={right.numeralHighlights}
                claimElements={right.claimElements}
                searchHighlights={right.searchHighlights}
                onNumeralHover={right.setActiveNumeral}
                onNumeralClick={right.handleNumeralClickFromSpec}
                onFigureClick={right.handleFigureClick}
                onClaimClick={right.handleClaimClick}
                onElementHover={right.setActiveElementGroup}
                onElementClick={right.handleElementClick}
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
      {/* Patent info bar */}
      <div className="border-b border-stone-200 bg-white px-4 py-2 flex items-center gap-3 min-w-0">
        <Badge variant="outline" className="font-mono shrink-0 text-xs">
          {left.patent!.patent_number}
        </Badge>
        <span className="text-sm text-stone-600 truncate min-w-0 flex-1">
          {left.patent!.title}
        </span>
        <AnalysisStatus panel={left} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchDialogOpen(true)}
          className="shrink-0 text-stone-500 gap-1.5"
          title="Load a different patent"
        >
          <Search className="size-3.5" />
          <kbd className="hidden sm:inline text-[10px] font-mono bg-stone-100 text-stone-400 px-1 py-0.5 rounded border border-stone-200">
            {navigator.platform?.includes("Mac") ? "\u2318" : "Ctrl+"}K
          </kbd>
        </Button>
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0 relative" ref={leftPanelRef}>
        <CenterPanel
          patent={left.patent!}
          activeNumeral={left.activeNumeral}
          activeElementGroup={left.activeElementGroup}
          highlights={left.numeralHighlights}
          claimElements={left.claimElements}
          searchHighlights={left.searchHighlights}
          onNumeralHover={left.setActiveNumeral}
          onNumeralClick={left.handleNumeralClickFromSpec}
          onFigureClick={left.handleFigureClick}
          onClaimClick={left.handleClaimClick}
          onElementHover={left.setActiveElementGroup}
          onElementClick={left.handleElementClick}
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

      <PatentSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSubmit={(num) => {
          setQuery(num);
          left.loadPatent(num);
        }}
        loading={left.loading}
      />
    </div>
  );
}
