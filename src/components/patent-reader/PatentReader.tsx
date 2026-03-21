import { useState, useCallback } from "react";
import { Search, Loader2, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CenterPanel } from "./CenterPanel";
import { RightSidebar } from "./RightSidebar";
import { fetchPatent, fetchReferenceNumerals } from "@/lib/api";
import type { ReferenceNumeral } from "@/lib/api";
import type { Patent } from "./types";

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
    <form onSubmit={onSubmit} className={`flex items-center gap-2 ${large ? "max-w-lg w-full" : "max-w-xl mx-auto"}`}>
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

export function PatentReader() {
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("figures");
  const [selectedFigure, setSelectedFigure] = useState<number | null>(null);
  const [patent, setPatent] = useState<Patent | null>(null);
  const [referenceNumerals, setReferenceNumerals] = useState<ReferenceNumeral[]>([]);
  const [activeNumeral, setActiveNumeral] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setReferenceNumerals([]);
      try {
        const data = await fetchPatent(trimmed);
        setPatent(data);
        // Fire async reference numeral extraction (non-blocking)
        fetchReferenceNumerals(trimmed).then(setReferenceNumerals);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch patent");
        setPatent(null);
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  const handleExampleClick = useCallback((number: string) => {
    setQuery(number);
    setLoading(true);
    setError(null);
    setReferenceNumerals([]);
    fetchPatent(number)
      .then((data) => {
        setPatent(data);
        fetchReferenceNumerals(number).then(setReferenceNumerals);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to fetch patent");
        setPatent(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleNumeralClickFromSpec = useCallback((numeral: string | null) => {
    setActiveNumeral(numeral);
    if (numeral) {
      setSidebarTab("details");
      // Scroll the table row into view — use two rAFs to ensure React has rendered
      // the tab switch before we query the DOM
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const row = document.querySelector(`[data-ref-row="${numeral}"]`);
          row?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    }
  }, []);

  const handleFigureClick = useCallback(
    (figIndex: number) => {
      // FIG. N maps to figure_urls[N] (index 0 is cover sheet D00000)
      if (patent && figIndex >= 0 && figIndex < patent.figure_urls.length) {
        setSidebarTab("figures");
        setSelectedFigure(figIndex);
      }
    },
    [patent]
  );

  const handleScrollTo = useCallback((id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Welcome screen when no patent is loaded
  if (!patent) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-lg w-full space-y-6 -mt-16">
            {/* Heading */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-stone-800">Patent Reader</h1>
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
              loading={loading}
              large
            />

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="size-4 shrink-0" />
                {error}
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
                    disabled={loading}
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

  // Patent loaded — three-panel layout
  return (
    <div className="flex flex-col h-full">
      {/* Compact search bar */}
      <div className="border-b border-stone-200 bg-white px-4 py-2">
        <SearchForm
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSearch}
          loading={loading}
        />
      </div>

      {/* Two-panel content */}
      <div className="flex flex-1 min-h-0">
        <CenterPanel
          patent={patent}
          activeNumeral={activeNumeral}
          onNumeralHover={setActiveNumeral}
          onNumeralClick={handleNumeralClickFromSpec}
          onFigureClick={handleFigureClick}
        />
        <RightSidebar
          patent={patent}
          referenceNumerals={referenceNumerals}
          activeNumeral={activeNumeral}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          selectedFigure={selectedFigure}
          onSelectFigure={setSelectedFigure}
          onNumeralHover={setActiveNumeral}
          onNumeralClick={setActiveNumeral}
          collapsed={rightCollapsed}
          onToggle={() => setRightCollapsed((c) => !c)}
          onScrollTo={handleScrollTo}
        />
      </div>
    </div>
  );
}
