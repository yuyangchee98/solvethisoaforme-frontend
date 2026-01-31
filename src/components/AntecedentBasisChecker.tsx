import { useState, useEffect, useCallback } from 'react';
import { parseClaimsToTree } from '@/lib/claim-parser';
import { analyzeClaims, checkHealth, type AnalyzeClaimsResponse } from '@/lib/api';
import { createAnnotationsFromAnalysis, type AnnotationData } from '@/lib/annotationUtils';
import { debounce } from '@/lib/debounce';
import { ClaimEditor } from './editor/ClaimEditor';
import { AppTopBar } from './layout/AppTopBar';
import { StatusBar } from './layout/StatusBar';
import { ErrorSidebar } from './panels/ErrorSidebar';
import { AnnotationCard } from './editor/AnnotationCard';

const EXAMPLE_CLAIMS = `1. An apparatus to treat tissue of a prostate of a patient, the apparatus comprising:
a display;
a processor operatively coupled to the display; and
a memory comprising instructions that when executed by the processor, cause the apparatus to:
receive an image of a prostate,
identify delicate tissue structures of the prostate based on the image, the delicate tissue structures comprising at least one of bladder or sphincter,
identify one or more components of the apparatus, the one or more components comprising a surgical instrument and an energy source,
generate, using a trained classifier, a treatment plan to resect or remove a tissue.

2. The apparatus of claim 1, wherein the instructions further cause the apparatus to determine a location of the delicate tissue structure in relation to the tissue removal profile and to display a value of the one or more of a safety parameter or an efficacy parameter.`;

export default function AntecedentBasisChecker() {
  const [claimText, setClaimText] = useState(EXAMPLE_CLAIMS);
  const [analysis, setAnalysis] = useState<AnalyzeClaimsResponse | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected annotation for card display
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationData | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

  // Hovered annotation for highlighting
  const [hoveredAnnotation, setHoveredAnnotation] = useState<AnnotationData | null>(null);

  // Check API health on mount
  useEffect(() => {
    checkHealth().then((ok) => setApiStatus(ok ? 'online' : 'offline'));
  }, []);

  // Auto-analyze with debouncing
  const performAnalysis = useCallback(async (text: string) => {
    if (!text.trim() || apiStatus !== 'online') return;

    setAnalyzing(true);
    setError(null);

    try {
      const tree = parseClaimsToTree(text);
      const claims = Array.from(tree.claims.values()).map((c) => ({
        number: c.number,
        text: c.text,
        depends_on: c.dependsOn,
      }));

      if (claims.length === 0) {
        setAnalysis(null);
        setAnnotations([]);
        return;
      }

      const result = await analyzeClaims(claims);
      setAnalysis(result);
      setAnnotations(createAnnotationsFromAnalysis(result, text));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setAnalysis(null);
      setAnnotations([]);
    } finally {
      setAnalyzing(false);
    }
  }, [apiStatus]);

  // Debounced analysis
  const debouncedAnalysis = useCallback(
    debounce((text: string) => performAnalysis(text), 2000),
    [performAnalysis]
  );

  // Trigger analysis on text change
  useEffect(() => {
    debouncedAnalysis(claimText);
  }, [claimText, debouncedAnalysis]);

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: AnnotationData) => {
    // Find the DOM element for this annotation
    const element = document.querySelector(
      `.cm-annotation[data-start="${annotation.start}"][data-end="${annotation.end}"]`
    ) as HTMLElement;

    setSelectedAnnotation(annotation);
    setSelectedElement(element);
  }, []);

  // Handle error click from sidebar
  const handleErrorClick = useCallback((error: AnnotationData) => {
    handleAnnotationClick(error);

    // Scroll to annotation in editor
    const element = document.querySelector(
      `.cm-annotation[data-start="${error.start}"][data-end="${error.end}"]`
    ) as HTMLElement;
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [handleAnnotationClick]);

  // Handle apply suggestion
  const handleApplySuggestion = useCallback((annotation: AnnotationData) => {
    if (!annotation.suggestion) return;

    const newText =
      claimText.slice(0, annotation.start) +
      annotation.suggestion +
      claimText.slice(annotation.end);

    setClaimText(newText);
    setSelectedAnnotation(null);
    setSelectedElement(null);
  }, [claimText]);

  // Handle keyboard shortcut (Cmd+Enter to analyze)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        performAnalysis(claimText);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [claimText, performAnalysis]);

  // Apply hover highlighting to editor annotations
  useEffect(() => {
    // Remove all hover classes first
    document.querySelectorAll('.cm-annotation.hovered').forEach(el => {
      el.classList.remove('hovered');
    });

    // Add hover class to the hovered annotation
    if (hoveredAnnotation) {
      const elements = document.querySelectorAll(
        `.cm-annotation[data-start="${hoveredAnnotation.start}"][data-end="${hoveredAnnotation.end}"]`
      );
      elements.forEach(el => el.classList.add('hovered'));
    }
  }, [hoveredAnnotation]);

  const claimCount = analysis?.analyses.length || 0;
  const errorCount = analysis?.total_errors || 0;

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      <AppTopBar apiStatus={apiStatus} />

      <div className="flex-1 flex min-h-0">
        {/* Main editor area */}
        <div className="flex-1 p-6 flex flex-col min-h-0">
          <ClaimEditor
            value={claimText}
            onChange={setClaimText}
            annotations={annotations}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationHover={setHoveredAnnotation}
          />
        </div>

        {/* Error sidebar */}
        <ErrorSidebar
          annotations={annotations}
          onErrorClick={handleErrorClick}
          onErrorHover={setHoveredAnnotation}
          hoveredAnnotation={hoveredAnnotation}
        />
      </div>

      <StatusBar
        claimCount={claimCount}
        errorCount={errorCount}
        isAnalyzing={analyzing}
      />

      {/* Annotation card */}
      <AnnotationCard
        annotation={selectedAnnotation}
        targetElement={selectedElement}
        onClose={() => {
          setSelectedAnnotation(null);
          setSelectedElement(null);
        }}
        onApplySuggestion={handleApplySuggestion}
      />

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
