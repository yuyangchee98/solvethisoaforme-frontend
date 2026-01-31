import { useState, useEffect, useCallback } from 'react';
import { parseClaimsToTree } from '@/lib/claim-parser';
import { analyzeClaims, checkHealth, type AnalyzeClaimsResponse } from '@/lib/api';
import { createAnnotationsFromAnalysis, type AnnotationData } from '@/lib/annotationUtils';
import { debounce } from '@/lib/debounce';
import { ClaimEditor } from './editor/ClaimEditor';
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

2. The apparatus of claim 1, wherein the instructions further cause the apparatus to determine a location of the delicate tissue structure in relation to the tissue removal profile and to display a value of the one or more of a safety parameter or an efficacy parameter.

3. The apparatus of claim 1, wherein the delicate tissue structure comprises a verumontanum of the prostate.

4. The apparatus of claim 1, wherein the delicate tissue structure comprises cancerous tissue.

5. The apparatus of claim 2, wherein the tissue removal profile comprises one or more protection zones determined based, at least in part, upon one or more of decreasing damage to the delicate tissue structure or avoiding disbursement of pathogenic tissue.

6. The apparatus of claim 1, wherein the trained classifier is a trained neural network.

7. The apparatus of claim 1, wherein the trained classifier is a trained artificial intelligence network.

8. The apparatus of claim 1, wherein the instructions cause the apparatus to identify, using the trained classifier, the delicate tissue structures of the prostate within the image.

9. The apparatus of claim 1, wherein the tissue removal profile includes a cut profile.

10. The apparatus of claim 9, wherein the cut profile includes a plurality of locations comprising a plurality of angular coordinates about a treatment axis, a plurality of corresponding axial coordinates along the axis, and a plurality of radial distances from the axis.

11. The apparatus of claim 10, wherein the instructions further cause the apparatus to adjust the cut profile based on a user input.

12. The apparatus of claim 11, wherein the instructions cause the apparatus to adjust at least one of:
the plurality of angular coordinates about the treatment axis,
the plurality of corresponding axial coordinates along the axis, or
the plurality of radial distances from the axis.

13. The apparatus of claim 1, wherein the instructions cause the apparatus to identify the delicate tissue structures of the prostate with a trained convolutional neural network.

14. The apparatus of claim 1, wherein the instructions cause the apparatus to identify the delicate tissue structures of the prostate using edge detection, feature recognition, or segmentation.

15. The apparatus of claim 2, wherein the safety parameter and the efficacy parameter are generated with a classifier.

16. The apparatus of claim 1, wherein the instructions cause the apparatus to display the image of the prostate with the tissue removal profile in one or more of a sagittal view, parasagittal view, a transverse view, a coronal view, a paracoronal view, or a three-dimensional view.

17. The apparatus of claim 1, wherein the image of the prostate comprises one or more of tissue margin identification, tissue plane identification, tissue differentiation detection, fluoroscopy, CT scan imaging, magnetic resonance imaging, radioactivity detection, or radiopaque imaging.

18. The apparatus of claim 5, wherein the prostate comprises a delicate tissue structure and the tissue removal profile comprises a protection zone, and the protection zone of the tissue removal profile is determined in response to the image of the prostate and the one or more of the safety parameter or the efficacy parameter.

19. The apparatus of claim 18, wherein the protection zone is one of a plurality of protection zones, and the plurality of protection zones of the tissue removal profile are determined, at least in response, to the image of the prostate and the one or more of the safety parameter or the efficacy parameter.

20. The apparatus of claim 19, wherein one or more of the plurality of protection zones are determined, at least in part, based on one or more of avoiding damage to delicate tissue structures or avoiding disbursement of pathogenic tissue.`;

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

  // Apply hover highlighting to editor annotations and their pairs
  useEffect(() => {
    // Remove all hover classes first
    document.querySelectorAll('.cm-annotation.hovered').forEach(el => {
      el.classList.remove('hovered');
    });

    if (hoveredAnnotation) {
      // Highlight the hovered annotation
      const hoveredElements = document.querySelectorAll(
        `.cm-annotation[data-start="${hoveredAnnotation.start}"][data-end="${hoveredAnnotation.end}"]`
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
            `.cm-annotation[data-start="${intro.start}"][data-end="${intro.end}"]`
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
            `.cm-annotation[data-start="${ref.start}"][data-end="${ref.end}"]`
          );
          refElements.forEach(el => el.classList.add('hovered'));
        });
      }
    }
  }, [hoveredAnnotation, annotations, analysis]);

  const claimCount = analysis?.analyses.length || 0;
  const errorCount = analysis?.total_errors || 0;

  return (
    <div className="min-h-screen flex flex-col">
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
          hoveredAnnotation={hoveredAnnotation}
        />
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
