import { useState, useCallback, useRef, useMemo } from "react";
import { fetchPatent, fetchReferenceNumerals, fetchFigureMap, fetchClaimElements } from "@/lib/api";
import type {
  ReferenceNumeral,
  ReferenceNumeralHighlights,
  NumeralLocation,
  ClaimElementsData,
} from "@/lib/api";
import type { Patent } from "./types";
import type { SearchTerm, SearchHighlights, SearchOccurrence } from "./search-utils";
import { computeSearchHighlights, computeSearchOccurrences } from "./search-utils";

interface UsePatentPanelOptions {
  /** Scope DOM queries to this container (for comparison mode isolation). */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Called when an interaction needs the sidebar visible (e.g. numeral click → show figure). */
  onRequestSidebarOpen?: () => void;
}

export function usePatentPanel(options?: UsePatentPanelOptions) {
  const [patent, setPatent] = useState<Patent | null>(null);
  const [referenceNumerals, setReferenceNumerals] = useState<
    ReferenceNumeral[]
  >([]);
  const [numeralHighlights, setNumeralHighlights] =
    useState<ReferenceNumeralHighlights>({
      abstract: [],
      description: [],
      claims: [],
    });
  const [figureMap, setFigureMap] = useState<Record<string, number>>({});
  const [numeralLocations, setNumeralLocations] = useState<
    Record<string, NumeralLocation[]>
  >({});
  const [activeNumeral, setActiveNumeral] = useState<string | null>(null);
  const [highlightedLocation, setHighlightedLocation] =
    useState<NumeralLocation | null>(null);
  const [showAllBboxes, setShowAllBboxes] = useState(true);
  const [selectedFigure, setSelectedFigure] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState("figures");
  const [claimElements, setClaimElements] = useState<ClaimElementsData>({
    claim_elements: [],
    groups: [],
  });
  const [activeElementGroup, setActiveElementGroup] = useState<number | null>(null);
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numeralClickCount = useRef<Record<string, number>>({});
  const searchIdRef = useRef(0);

  // Scoped DOM query helpers
  const qsa = useCallback(
    <T extends Element>(selector: string): NodeListOf<T> => {
      const root = options?.containerRef?.current ?? document;
      return root.querySelectorAll<T>(selector);
    },
    [options?.containerRef]
  );

  const qs = useCallback(
    <T extends Element>(selector: string): T | null => {
      const root = options?.containerRef?.current ?? document;
      return root.querySelector<T>(selector);
    },
    [options?.containerRef]
  );

  const loadPatent = useCallback(async (pubNumber: string) => {
    const id = ++searchIdRef.current;
    setLoading(true);
    setError(null);
    setReferenceNumerals([]);
    setNumeralHighlights({ abstract: [], description: [], claims: [] });
    setFigureMap({});
    setNumeralLocations({});
    setHighlightedLocation(null);
    setActiveNumeral(null);
    setSelectedFigure(null);
    setClaimElements({ claim_elements: [], groups: [] });
    setActiveElementGroup(null);
    setSearchTerms([]);
    numeralClickCount.current = {};
    try {
      const data = await fetchPatent(pubNumber);
      if (id !== searchIdRef.current) return;
      setPatent(data);
      fetchReferenceNumerals(pubNumber).then(({ numerals, highlights }) => {
        if (id === searchIdRef.current) {
          setReferenceNumerals(numerals);
          setNumeralHighlights(highlights);
        }
      });
      fetchFigureMap(pubNumber).then(({ figureMap: fm, numeralLocations: nl }) => {
        if (id !== searchIdRef.current) return;
        setFigureMap(fm);
        setNumeralLocations(nl);
      });
      fetchClaimElements(pubNumber).then((data) => {
        if (id === searchIdRef.current) {
          setClaimElements(data);
        }
      });
    } catch (err) {
      if (id !== searchIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch patent");
      setPatent(null);
    } finally {
      if (id === searchIdRef.current) setLoading(false);
    }
  }, []);

  const handleNumeralClickFromSpec = useCallback(
    (numeral: string | null) => {
      if (!numeral) {
        setActiveNumeral(null);
        setHighlightedLocation(null);
        return;
      }

      const locations = numeralLocations[numeral];
      options?.onRequestSidebarOpen?.();
      if (locations && locations.length > 0) {
        const prev = numeralClickCount.current[numeral] ?? -1;
        const next = numeral === activeNumeral ? prev + 1 : 0;
        numeralClickCount.current[numeral] = next;
        const loc = locations[next % locations.length];
        setActiveNumeral(numeral);
        setSidebarTab("figures");
        setSelectedFigure(loc.sheet);
        setHighlightedLocation(loc);
      } else {
        setActiveNumeral(numeral);
        setHighlightedLocation(null);
        setSidebarTab("details");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const row = qs<HTMLElement>(`[data-ref-row="${numeral}"]`);
            row?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        });
      }
    },
    [numeralLocations, activeNumeral, qs, options?.onRequestSidebarOpen]
  );

  const handleFigureClick = useCallback(
    (figNum: number) => {
      if (!patent) return;
      const figStr = String(figNum);
      const mapped = figureMap[figStr];
      const sheetIndex = mapped ?? figNum;
      if (sheetIndex >= 0 && sheetIndex < patent.figure_urls.length) {
        options?.onRequestSidebarOpen?.();
        setSidebarTab("figures");
        setSelectedFigure(sheetIndex);
      }
    },
    [patent, figureMap, options?.onRequestSidebarOpen]
  );

  const handleBboxClick = useCallback(
    (numeral: string) => {
      const allSpans = qsa<HTMLElement>(`[data-ref-num="${numeral}"]`);
      if (allSpans.length === 0) return;
      const prev = numeralClickCount.current[numeral] ?? -1;
      const next = numeral === activeNumeral ? prev + 1 : 0;
      numeralClickCount.current[numeral] = next;
      const target = allSpans[next % allSpans.length];
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-amber-400");
      setTimeout(
        () => target.classList.remove("ring-2", "ring-amber-400"),
        1500
      );
      setActiveNumeral(numeral);
    },
    [activeNumeral, qsa]
  );

  const handleFigLabelClick = useCallback(
    (figNum: number) => {
      const figStr = String(figNum);
      const key = `FIG. ${figStr}`;
      const allSpans = qsa<HTMLElement>(`[data-fig-ref="${figStr}"]`);
      if (allSpans.length === 0) return;
      const prev = numeralClickCount.current[key] ?? -1;
      const next = key === activeNumeral ? prev + 1 : 0;
      numeralClickCount.current[key] = next;
      const target = allSpans[next % allSpans.length];
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-sky-400");
      setTimeout(
        () => target.classList.remove("ring-2", "ring-sky-400"),
        1500
      );
      setActiveNumeral(key);
    },
    [activeNumeral, qsa]
  );

  const handleScrollTo = useCallback(
    (id: string) => {
      const el = qs<HTMLElement>(`#${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [qs]
  );

  const handleElementClick = useCallback(
    (groupId: number) => {
      const allSpans = qsa<HTMLElement>(`[data-element-group="${groupId}"]`);
      if (allSpans.length === 0) return;
      const key = `elem-${groupId}`;
      const prev = numeralClickCount.current[key] ?? -1;
      const next = groupId === activeElementGroup ? prev + 1 : 0;
      numeralClickCount.current[key] = next;
      const target = allSpans[next % allSpans.length];
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("ring-2", "ring-offset-1");
      setTimeout(() => target.classList.remove("ring-2", "ring-offset-1"), 1500);
      setActiveElementGroup(groupId);
    },
    [activeElementGroup, qsa]
  );

  const handleClaimClick = useCallback(
    (claimNumber: number) => {
      const el = qs<HTMLElement>(`#claim-${claimNumber}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-violet-400", "ring-offset-2", "rounded-md");
      setTimeout(
        () => el.classList.remove("ring-2", "ring-violet-400", "ring-offset-2", "rounded-md"),
        1500
      );
    },
    [qs]
  );

  const scrollToNumeralOccurrence = useCallback(
    (numeral: string, occurrenceIndex: number) => {
      setActiveNumeral(numeral);
      const allSpans = qsa<HTMLElement>(`[data-ref-num="${numeral}"]`);
      const target = allSpans[occurrenceIndex];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("ring-2", "ring-amber-400");
        setTimeout(
          () => target.classList.remove("ring-2", "ring-amber-400"),
          1500
        );
      }
    },
    [qsa]
  );

  const toggleBboxes = useCallback(() => {
    setShowAllBboxes((v) => !v);
  }, []);

  const numeralLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ref of referenceNumerals) {
      map[ref.numeral] = ref.label;
    }
    return map;
  }, [referenceNumerals]);

  // ── Search ────────────────────────────────────────────────────────────

  const searchHighlights = useMemo<SearchHighlights>(() => {
    if (!patent || searchTerms.length === 0) {
      return { abstract: [], description: [], claims: [] };
    }
    return computeSearchHighlights(patent, searchTerms);
  }, [patent, searchTerms]);

  const searchOccurrences = useMemo<SearchOccurrence[]>(() => {
    if (!patent || searchTerms.length === 0) return [];
    return computeSearchOccurrences(patent, searchTerms);
  }, [patent, searchTerms]);

  const nextTermId = useRef(0);

  const addSearchTerm = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchTerms((prev) => {
      // Don't add duplicates
      if (prev.some((t) => t.term.toLowerCase() === trimmed.toLowerCase())) return prev;
      const id = String(++nextTermId.current);
      const termIndex = prev.length;
      return [...prev, { id, term: trimmed, termIndex }];
    });
  }, []);

  const removeSearchTerm = useCallback((id: string) => {
    setSearchTerms((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      // Re-index so colors stay contiguous
      return filtered.map((t, i) => ({ ...t, termIndex: i }));
    });
  }, []);

  const clearSearchTerms = useCallback(() => {
    setSearchTerms([]);
  }, []);

  const scrollToSearchOccurrence = useCallback(
    (termIndex: number, globalOccurrenceIndex: number) => {
      const allSpans = qsa<HTMLElement>(`[data-search-term="${termIndex}"]`);
      const target = allSpans[globalOccurrenceIndex];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("ring-2", "ring-stone-400");
        setTimeout(
          () => target.classList.remove("ring-2", "ring-stone-400"),
          1500
        );
      }
    },
    [qsa]
  );

  return {
    // Data
    patent,
    referenceNumerals,
    numeralHighlights,
    claimElements,
    figureMap,
    numeralLocations,
    numeralLabels,
    activeElementGroup,
    // Interaction state
    activeNumeral,
    highlightedLocation,
    showAllBboxes,
    selectedFigure,
    sidebarTab,
    // Loading
    loading,
    error,
    // Search
    searchTerms,
    searchHighlights,
    searchOccurrences,
    // Actions
    loadPatent,
    addSearchTerm,
    removeSearchTerm,
    clearSearchTerms,
    scrollToSearchOccurrence,
    setActiveNumeral,
    setActiveElementGroup,
    handleElementClick,
    handleNumeralClickFromSpec,
    handleFigureClick,
    handleBboxClick,
    handleFigLabelClick,
    handleScrollTo,
    handleClaimClick,
    scrollToNumeralOccurrence,
    setSelectedFigure,
    setHighlightedLocation,
    setSidebarTab,
    toggleBboxes,
  };
}

export type PatentPanel = ReturnType<typeof usePatentPanel>;
