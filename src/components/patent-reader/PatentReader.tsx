import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Loader2, AlertCircle, FileText, PanelRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CenterPanel } from "./CenterPanel";
import { RightSidebar } from "./RightSidebar";
import { CompareButton } from "./CompareButton";
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
  { number: "EP3081497B1", title: "Packaging machine and method for producing packages from a packaging material" },
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
              <div className="flex flex-wrap justify-center gap-2">
                {["US11423567B2", "EP3081497B1", "WO2016116889A1", "CN110546615B"].map((fmt) => (
                  <code
                    key={fmt}
                    className="text-xs font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded"
                  >
                    {fmt}
                  </code>
                ))}
              </div>
              <details className="mt-3 text-left max-w-md mx-auto">
                <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600 text-center select-none">
                  Supported formats &amp; jurisdictions
                </summary>
                <div className="mt-2 text-xs text-stone-500 space-y-3 bg-stone-50 border border-stone-200 rounded-lg p-4">
                  {/* Input format */}
                  <div>
                    <p className="font-medium text-stone-600 mb-1">How to enter a patent number</p>
                    <p className="leading-relaxed">
                      Enter the <span className="font-medium">publication number</span> (not the
                      application serial number). You can type it with or without spaces, commas,
                      slashes, or kind codes &mdash; we normalize it automatically.
                    </p>
                    <div className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                      <span className="text-stone-400">US granted:</span>
                      <span>US 11,423,567 B2 <span className="text-stone-400">or</span> US11423567B2</span>
                      <span className="text-stone-400">US application:</span>
                      <span>US 2022/0075747 A1 <span className="text-stone-400">or</span> US20220075747A1</span>
                      <span className="text-stone-400">US design:</span>
                      <span>USD1234567S</span>
                      <span className="text-stone-400">US reissue:</span>
                      <span>USRE49000E</span>
                      <span className="text-stone-400">US plant:</span>
                      <span>USPP12345P3</span>
                      <span className="text-stone-400">EP:</span>
                      <span>EP 3 081 497 B1 <span className="text-stone-400">or</span> EP3081497B1</span>
                      <span className="text-stone-400">WO/PCT:</span>
                      <span>WO 2016/116889 A1 <span className="text-stone-400">or</span> WO2016116889A1</span>
                      <span className="text-stone-400">CN:</span>
                      <span>CN110546615B</span>
                      <span className="text-stone-400">JP:</span>
                      <span>JP6876012B2</span>
                      <span className="text-stone-400">KR:</span>
                      <span>KR102345678B1</span>
                    </div>
                  </div>

                  {/* Kind codes */}
                  <div>
                    <p className="font-medium text-stone-600 mb-1">Kind codes</p>
                    <p className="leading-relaxed">
                      If you omit the kind code (the letter suffix like B2 or A1), we
                      automatically try common variants. Including it is recommended for
                      faster, more precise lookups.
                    </p>
                  </div>

                  {/* Jurisdictions */}
                  <div>
                    <p className="font-medium text-stone-600 mb-1">Supported jurisdictions</p>
                    <p className="leading-relaxed mb-1.5">
                      Data comes from Google Patents, which indexes 100+ patent offices.
                      Verified jurisdictions:
                    </p>
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-stone-400 text-[11px] uppercase tracking-wider mb-0.5">Americas</p>
                        <p className="text-[11px] leading-relaxed">
                          US (United States), CA (Canada), MX (Mexico), BR (Brazil),
                          AR (Argentina), CL (Chile), CO (Colombia), UY (Uruguay)
                        </p>
                      </div>
                      <div>
                        <p className="text-stone-400 text-[11px] uppercase tracking-wider mb-0.5">Europe</p>
                        <p className="text-[11px] leading-relaxed">
                          EP (European Patent Office), DE (Germany), GB (United Kingdom),
                          FR (France), NL (Netherlands), BE (Belgium), AT (Austria),
                          CH (Switzerland), SE (Sweden), NO (Norway), DK (Denmark),
                          FI (Finland), IE (Ireland), ES (Spain), IT (Italy), PL (Poland),
                          CZ (Czech Republic), RO (Romania), GR (Greece), HU (Hungary)
                        </p>
                      </div>
                      <div>
                        <p className="text-stone-400 text-[11px] uppercase tracking-wider mb-0.5">Asia-Pacific</p>
                        <p className="text-[11px] leading-relaxed">
                          CN (China), JP (Japan), KR (South Korea), TW (Taiwan),
                          IN (India), AU (Australia), NZ (New Zealand), SG (Singapore),
                          PH (Philippines), MY (Malaysia), TH (Thailand), HK (Hong Kong)
                        </p>
                      </div>
                      <div>
                        <p className="text-stone-400 text-[11px] uppercase tracking-wider mb-0.5">International &amp; Other</p>
                        <p className="text-[11px] leading-relaxed">
                          WO (WIPO/PCT), EA (Eurasian Patent Org), RU (Russia),
                          UA (Ukraine), MD (Moldova), IL (Israel), SA (Saudi Arabia),
                          TR (Turkey), EG (Egypt), ZA (South Africa), AP (ARIPO)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Not supported */}
                  <div>
                    <p className="font-medium text-stone-600 mb-1">Not supported</p>
                    <ul className="list-disc list-inside text-[11px] leading-relaxed space-y-0.5">
                      <li>Application serial numbers (e.g. 16/904,029)</li>
                      <li>Provisional application numbers</li>
                      <li>Patents not indexed by Google Patents</li>
                    </ul>
                  </div>
                </div>
              </details>
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
