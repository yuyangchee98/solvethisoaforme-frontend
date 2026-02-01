import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseClaimsToTree } from '@/lib/claim-parser';
import { analyzeClaims, checkHealth, type AnalyzeClaimsResponse } from '@/lib/api';
import { createAnnotationsFromAnalysis, type AnnotationData } from '@/lib/annotationUtils';
import { debounce } from '@/lib/debounce';
import { EXAMPLE_CLAIMS } from '@/lib/exampleClaims';
import { ClaimEditor } from './editor/ClaimEditor';
import { StatusBar } from './layout/StatusBar';
import { ActionBar } from './layout/ActionBar';
import { ErrorSidebar } from './panels/ErrorSidebar';
import { AnnotationCard } from './editor/AnnotationCard';
import { ExpandedClaimsView } from './ExpandedClaimsView';
import { Button } from './ui/button';
import { FileText, LayoutList } from 'lucide-react';

export default function AntecedentBasisChecker() {
  const [claimText, setClaimText] = useState(EXAMPLE_CLAIMS);
  const [analysis, setAnalysis] = useState<AnalyzeClaimsResponse | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [analyzing, setAnalyzing] = useState(true); // Start as true since we have initial content
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected annotation for card display
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationData | null>(null);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);

  // Hovered annotation for highlighting
  const [hoveredAnnotation, setHoveredAnnotation] = useState<AnnotationData | null>(null);

  // Hovered group (noun phrase) for highlighting all instances
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // View state: 'editor' or 'expanded'
  const [currentView, setCurrentView] = useState<'editor' | 'expanded'>('editor');

  // Parse claim tree from text
  const claimTree = useMemo(() => parseClaimsToTree(claimText), [claimText]);

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
      setHasAnalyzed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
      setAnalysis(null);
      setAnnotations([]);
      setHasAnalyzed(true);
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

  // Apply hover highlighting to editor annotations and their pairs
  useEffect(() => {
    // Remove all hover classes first
    document.querySelectorAll('.cm-annotation.hovered, .annotation.hovered').forEach(el => {
      el.classList.remove('hovered');
    });

    // If hovering a group, highlight all errors with that noun phrase
    if (hoveredGroup) {
      const matchingErrors = annotations.filter(
        ann => ann.type === 'error' && ann.np === hoveredGroup
      );

      matchingErrors.forEach(error => {
        const errorElements = document.querySelectorAll(
          `.cm-annotation[data-start="${error.start}"][data-end="${error.end}"], .annotation[data-start="${error.start}"][data-end="${error.end}"]`
        );
        errorElements.forEach(el => el.classList.add('hovered'));
      });
    }
    // If hovering an individual annotation
    else if (hoveredAnnotation) {
      // Highlight the specific hovered annotation
      const hoveredElements = document.querySelectorAll(
        `.cm-annotation[data-start="${hoveredAnnotation.start}"][data-end="${hoveredAnnotation.end}"], .annotation[data-start="${hoveredAnnotation.start}"][data-end="${hoveredAnnotation.end}"]`
      );
      hoveredElements.forEach(el => el.classList.add('hovered'));

      // If it's a reference, also highlight its introduction
      if (hoveredAnnotation.type === 'ref') {
        // Find matching introduction by noun phrase (using spaCy's np field)
        const matchingIntros = annotations.filter(
          ann => ann.type === 'intro' && ann.np === hoveredAnnotation.np
        );

        matchingIntros.forEach(intro => {
          const introElements = document.querySelectorAll(
            `.cm-annotation[data-start="${intro.start}"][data-end="${intro.end}"], .annotation[data-start="${intro.start}"][data-end="${intro.end}"]`
          );
          introElements.forEach(el => el.classList.add('hovered'));
        });
      }

      // If it's an introduction, also highlight references to it
      if (hoveredAnnotation.type === 'intro') {
        // Find matching references by noun phrase (using spaCy's np field)
        const matchingRefs = annotations.filter(
          ann => ann.type === 'ref' && ann.np === hoveredAnnotation.np
        );

        matchingRefs.forEach(ref => {
          const refElements = document.querySelectorAll(
            `.cm-annotation[data-start="${ref.start}"][data-end="${ref.end}"], .annotation[data-start="${ref.start}"][data-end="${ref.end}"]`
          );
          refElements.forEach(el => el.classList.add('hovered'));
        });
      }

      // For individual errors, only highlight that specific one (no matching)
    }
  }, [hoveredAnnotation, hoveredGroup, annotations, analysis]);

  const claimCount = analysis?.analyses.length || 0;
  const errorCount = analysis?.total_errors || 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 mt-6">
        {/* Action Bar */}
        <ActionBar>
          <div className="flex items-center gap-2 bg-stone-100 rounded-lg p-1">
            <Button
              onClick={() => setCurrentView('editor')}
              variant="ghost"
              size="sm"
              className={currentView === 'editor' ? 'bg-white shadow-sm text-stone-900 hover:bg-white' : 'text-stone-600 hover:bg-stone-200'}
            >
              <FileText className="h-4 w-4 mr-2" />
              Editor
            </Button>
            <Button
              onClick={() => setCurrentView('expanded')}
              variant="ghost"
              size="sm"
              className={currentView === 'expanded' ? 'bg-white shadow-sm text-stone-900 hover:bg-white' : 'text-stone-600 hover:bg-stone-200'}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Expanded Claims
            </Button>
          </div>
        </ActionBar>

        {/* Conditional View */}
        {currentView === 'editor' ? (
          /* Editor and Sidebar */
          <div className="flex-1 flex min-h-0">
            {/* Main editor area */}
            <div className="flex-1 p-12 flex flex-col min-h-0">
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
              onGroupHover={setHoveredGroup}
              hoveredAnnotation={hoveredAnnotation}
              isAnalyzing={analyzing}
              hasAnalyzed={hasAnalyzed}
            />
          </div>
        ) : (
          /* Expanded Claims View with Sidebar */
          <div className="flex-1 flex min-h-0">
            <ExpandedClaimsView
              claimTree={claimTree}
              analyses={analysis?.analyses || []}
              annotations={annotations}
              fullText={claimText}
              onAnnotationClick={handleAnnotationClick}
              onAnnotationHover={setHoveredAnnotation}
            />

            {/* Error sidebar */}
            <ErrorSidebar
              annotations={annotations}
              onErrorClick={handleErrorClick}
              onErrorHover={setHoveredAnnotation}
              onGroupHover={setHoveredGroup}
              hoveredAnnotation={hoveredAnnotation}
              isAnalyzing={analyzing}
              hasAnalyzed={hasAnalyzed}
            />
          </div>
        )}
      </div>

      <StatusBar
        claimCount={claimCount}
        errorCount={errorCount}
        isAnalyzing={analyzing}
        apiStatus={apiStatus}
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
