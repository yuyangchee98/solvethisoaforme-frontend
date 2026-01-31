import { useState, useEffect } from 'react';
import { parseClaimsToTree } from '@/lib/claim-parser';
import { analyzeClaims, checkHealth, type AnalyzeClaimsResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const [input, setInput] = useState(EXAMPLE_CLAIMS);
  const [analysis, setAnalysis] = useState<AnalyzeClaimsResponse | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkHealth().then((ok) => setApiStatus(ok ? 'online' : 'offline'));
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const tree = parseClaimsToTree(input);
      const claims = Array.from(tree.claims.values()).map((c) => ({
        number: c.number,
        text: c.text,
        depends_on: c.dependsOn,
      }));

      const result = await analyzeClaims(claims);
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Check Antecedent Basis</h2>
          <p className="text-sm text-muted-foreground">
            Analyze patent claims for antecedent basis errors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">API:</span>
          {apiStatus === 'checking' && <Badge variant="secondary">Checking...</Badge>}
          {apiStatus === 'online' && <Badge className="bg-green-500">Online</Badge>}
          {apiStatus === 'offline' && (
            <Badge variant="destructive">Offline</Badge>
          )}
        </div>
      </div>

      {/* Split Pane Layout */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Left: Text Editor */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Claims Text</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 font-mono text-sm resize-none"
              placeholder="Paste patent claims here..."
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleAnalyze}
                disabled={apiStatus !== 'online' || analyzing}
              >
                {analyzing ? 'Analyzing...' : 'Analyze'}
              </Button>
              {error && <span className="text-sm text-destructive">{error}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Right: Analysis Results */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Analysis Results
              {analysis && (
                <Badge
                  variant={analysis.total_errors > 0 ? 'destructive' : 'default'}
                  className={analysis.total_errors === 0 ? 'bg-green-500' : ''}
                >
                  {analysis.total_errors > 0
                    ? `${analysis.total_errors} error${analysis.total_errors > 1 ? 's' : ''}`
                    : 'No errors'
                  }
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto min-h-0">
            {!analysis ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Run analysis to see results
              </div>
            ) : (
              <div className="space-y-4">
                {analysis.analyses.map((claimAnalysis) => (
                  <div
                    key={claimAnalysis.claim_number}
                    className={`p-4 rounded-lg border ${
                      claimAnalysis.antecedent_errors.length > 0
                        ? 'border-red-300 bg-red-50'
                        : 'border-green-300 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-semibold">Claim {claimAnalysis.claim_number}</span>
                      {claimAnalysis.antecedent_errors.length > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {claimAnalysis.antecedent_errors.length} error
                          {claimAnalysis.antecedent_errors.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500 text-xs">OK</Badge>
                      )}
                    </div>

                    {/* Highlighted claim text */}
                    <div className="p-3 bg-white rounded border mb-3 text-sm font-mono">
                      <HighlightedClaim analysis={claimAnalysis} />
                    </div>

                    {/* Errors */}
                    {claimAnalysis.antecedent_errors.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Errors:</div>
                        {claimAnalysis.antecedent_errors.map((err, i) => (
                          <div key={i} className="text-xs bg-white p-2 rounded border border-red-200">
                            <span className="font-medium text-red-700">"{err.text}"</span>
                            <span className="text-muted-foreground"> - {err.reason}</span>
                            {err.suggestion && (
                              <div className="text-amber-600 mt-1">
                                → Did you mean "{err.suggestion}"?
                                {err.suggestion_score && err.suggestion_score >= 0.9 && (
                                  <span className="ml-1 text-green-600">(likely match)</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Details */}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        Show details
                      </summary>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="font-medium text-green-700 mb-1">
                            Introductions ({claimAnalysis.introductions.length})
                          </div>
                          <ul className="space-y-0.5">
                            {claimAnalysis.introductions.map((np, i) => (
                              <li key={i} className="text-muted-foreground">
                                "{np.np}"
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700 mb-1">
                            Available terms ({claimAnalysis.inherited_terms.length})
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {claimAnalysis.inherited_terms.map((term, i) => (
                              <span key={i} className="bg-gray-200 px-1 rounded">
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-200 border border-green-500 rounded" />
          Introduction
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-200 border border-blue-500 rounded" />
          Reference (OK)
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-red-200 border border-red-500 rounded" />
          Error
        </div>
      </div>
    </div>
  );
}

/**
 * Highlight text with colored spans for introductions, references, and errors
 */
function HighlightedClaim({ analysis }: { analysis: any }) {
  const text = analysis.claim_text;
  type Span = { start: number; end: number; type: 'intro' | 'ref' | 'error'; label: string };
  const spans: Span[] = [];

  for (const intro of analysis.introductions) {
    spans.push({ start: intro.start, end: intro.end, type: 'intro', label: intro.text });
  }

  for (const ref of analysis.references) {
    const hasError = analysis.antecedent_errors.some((e: any) => e.start === ref.start);
    spans.push({
      start: ref.start,
      end: ref.end,
      type: hasError ? 'error' : 'ref',
      label: ref.text,
    });
  }

  for (const err of analysis.antecedent_errors) {
    if (!spans.some(s => s.start === err.start)) {
      spans.push({ start: err.start, end: err.end, type: 'error', label: err.text });
    }
  }

  spans.sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];

    if (span.start > lastEnd) {
      parts.push(<span key={`text-${i}`}>{text.slice(lastEnd, span.start)}</span>);
    }

    const className =
      span.type === 'intro'
        ? 'bg-green-200 border-b-2 border-green-500'
        : span.type === 'ref'
          ? 'bg-blue-200 border-b-2 border-blue-500'
          : 'bg-red-200 border-b-2 border-red-500';

    parts.push(
      <span key={`span-${i}`} className={className} title={span.label}>
        {text.slice(span.start, span.end)}
      </span>
    );

    lastEnd = span.end;
  }

  if (lastEnd < text.length) {
    parts.push(<span key="text-end">{text.slice(lastEnd)}</span>);
  }

  return <div className="whitespace-pre-wrap">{parts}</div>;
}
