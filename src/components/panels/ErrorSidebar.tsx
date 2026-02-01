import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, AlertCircle, ChevronDown, Loader2, CheckCircle } from 'lucide-react';
import type { AnnotationData } from '@/lib/annotationUtils';

interface ErrorSidebarProps {
  annotations: AnnotationData[];
  onErrorClick: (annotation: AnnotationData) => void;
  onErrorHover?: (annotation: AnnotationData | null) => void;
  onGroupHover?: (nounPhrase: string | null) => void;
  hoveredAnnotation?: AnnotationData | null;
  isAnalyzing?: boolean;
  hasAnalyzed?: boolean;
}

export function ErrorSidebar({
  annotations,
  onErrorClick,
  onErrorHover,
  onGroupHover,
  hoveredAnnotation,
  isAnalyzing = false,
  hasAnalyzed = false
}: ErrorSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'all'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const errors = annotations.filter((ann) => ann.type === 'error');

  // Group errors by noun phrase
  const errorsByPhrase = errors.reduce((acc, error) => {
    const key = error.np || error.text.toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(error);
    return acc;
  }, {} as Record<string, AnnotationData[]>);

  // Sort phrases by error count (descending)
  const phrases = Object.keys(errorsByPhrase).sort(
    (a, b) => errorsByPhrase[b].length - errorsByPhrase[a].length
  );

  // Group errors by claim number (for ungrouped view)
  const errorsByClaim = errors.reduce((acc, error) => {
    if (!acc[error.claimNumber]) {
      acc[error.claimNumber] = [];
    }
    acc[error.claimNumber].push(error);
    return acc;
  }, {} as Record<number, AnnotationData[]>);

  const claimNumbers = Object.keys(errorsByClaim)
    .map(Number)
    .sort((a, b) => a - b);

  const hasErrors = errors.length > 0;

  const toggleGroup = (phrase: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(phrase)) {
      newExpanded.delete(phrase);
    } else {
      newExpanded.add(phrase);
    }
    setExpandedGroups(newExpanded);
  };

  // Check if element is in viewport
  const isElementInViewport = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 64 && // Account for header height
      rect.bottom <= window.innerHeight &&
      rect.left >= 0 &&
      rect.right <= window.innerWidth
    );
  };

  // Scroll to annotation if not visible
  const scrollToAnnotation = (error: AnnotationData) => {
    const element = document.querySelector(
      `.cm-annotation[data-start="${error.start}"][data-end="${error.end}"]`
    ) as HTMLElement;

    if (element && !isElementInViewport(element)) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (isCollapsed) {
    return (
      <div className="sticky top-16 self-start w-16 max-h-[calc(100vh-4rem)] flex flex-col items-center pt-8 bg-stone-50/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 hover:bg-amber-100"
        >
          <ChevronLeft className="h-4 w-4 text-stone-600" />
        </Button>
        <div className="mt-6 flex flex-col items-center gap-2">
          {isAnalyzing ? (
            <Loader2 className="h-5 w-5 text-stone-400 animate-spin" />
          ) : hasErrors ? (
            <>
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
                {errors.length}
              </Badge>
            </>
          ) : hasAnalyzed ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-16 self-start w-96 max-h-[calc(100vh-4rem)] flex flex-col bg-amber-50/30 pr-12 pl-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg text-stone-900">
            {isAnalyzing ? 'Analyzing...' : 'Errors'}
          </h2>
          {!isAnalyzing && hasErrors && (
            <Badge className="text-xs font-semibold bg-amber-100 text-amber-700 border-0 px-2.5 py-1">
              {errors.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8 hover:bg-amber-100"
        >
          <ChevronRight className="h-4 w-4 text-stone-600" />
        </Button>
      </div>

      {/* View mode toggle - only show when we have errors */}
      {!isAnalyzing && hasErrors && (
        <div className="mb-5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grouped' ? 'all' : 'grouped')}
            className="text-xs font-semibold h-8 bg-white/80 hover:bg-white border-stone-200"
          >
            {viewMode === 'grouped' ? 'Show All' : 'Group by Phrase'}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-3">
        {/* Loading state */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-64 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Checking antecedent basis...</p>
          </div>
        )}

        {/* No errors state */}
        {!isAnalyzing && hasAnalyzed && !hasErrors && (
          <div className="flex flex-col items-center justify-center h-64 text-stone-500">
            <CheckCircle className="h-8 w-8 text-green-600 mb-3" />
            <p className="text-sm font-medium text-stone-700">No errors found!</p>
            <p className="text-xs text-stone-500 mt-1">All claims look good</p>
          </div>
        )}

        {/* Errors list */}
        {!isAnalyzing && hasErrors && (
          viewMode === 'grouped' ? (
          // Grouped view - by noun phrase
          phrases.map((phrase) => {
            const phraseErrors = errorsByPhrase[phrase];
            const isExpanded = expandedGroups.has(phrase);
            const firstError = phraseErrors[0];

            return (
              <div key={phrase} className="space-y-2">
                {/* Group header */}
                <div
                  className="p-3.5 cursor-pointer bg-white/80 hover:bg-white soft-shadow rounded-lg transition-all"
                  onClick={() => toggleGroup(phrase)}
                  onMouseEnter={() => onGroupHover?.(phrase)}
                  onMouseLeave={() => onGroupHover?.(null)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center gap-2.5">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-stone-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-stone-500 flex-shrink-0" />
                      )}
                      <p className="text-[15px] font-semibold text-stone-900 truncate">
                        "{phrase}"
                      </p>
                    </div>
                    <Badge className="text-xs font-semibold bg-amber-100 text-amber-700 border-0 ml-2 flex-shrink-0 px-2 py-0.5">
                      {phraseErrors.length}
                    </Badge>
                  </div>
                </div>

                {/* Expanded error instances */}
                {isExpanded && (
                  <div className="ml-4 space-y-2">
                    {phraseErrors.map((error, idx) => {
                      const isHovered = hoveredAnnotation?.start === error.start &&
                                       hoveredAnnotation?.end === error.end;

                      return (
                        <div
                          key={`${phrase}-${idx}`}
                          className={`p-3.5 cursor-pointer transition-all rounded-lg ${
                            isHovered
                              ? 'bg-amber-100/70 soft-shadow'
                              : 'bg-white/60 hover:bg-white/80 soft-shadow'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onErrorClick(error);
                          }}
                          onMouseEnter={() => {
                            onGroupHover?.(null); // Clear group hover
                            onErrorHover?.(error);
                            scrollToAnnotation(error);
                          }}
                          onMouseLeave={() => {
                            onErrorHover?.(null);
                          }}
                        >
                          <p className="text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                            Claim {error.claimNumber}
                          </p>
                          {error.reason && (
                            <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">
                              {error.reason}
                            </p>
                          )}
                          {error.suggestion && (
                            <p className="text-sm text-blue-600 mt-2.5 font-semibold bg-blue-50 px-2.5 py-1.5 rounded leading-relaxed">
                              Suggestion: "{error.suggestion}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Ungrouped view - by claim number
          claimNumbers.map((claimNum) => (
            <div key={claimNum}>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">
                Claim {claimNum}
              </div>
              <div className="space-y-2.5">
                {errorsByClaim[claimNum].map((error, idx) => {
                  const isHovered = hoveredAnnotation?.start === error.start &&
                                   hoveredAnnotation?.end === error.end;

                  return (
                    <div
                      key={`${claimNum}-${idx}`}
                      className={`p-4 cursor-pointer transition-all rounded-lg ${
                        isHovered
                          ? 'bg-amber-100/70 soft-shadow'
                          : 'bg-white/80 hover:bg-white soft-shadow'
                      }`}
                      onClick={() => onErrorClick(error)}
                      onMouseEnter={() => {
                        onGroupHover?.(null); // Clear group hover
                        onErrorHover?.(error);
                        scrollToAnnotation(error);
                      }}
                      onMouseLeave={() => {
                        onErrorHover?.(null);
                      }}
                    >
                      <p className="text-[15px] font-semibold text-stone-900 mb-2 leading-relaxed">
                        "{error.text}"
                      </p>
                      {error.reason && (
                        <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed">
                          {error.reason}
                        </p>
                      )}
                      {error.suggestion && (
                        <p className="text-sm text-blue-600 mt-2.5 font-semibold bg-blue-50 px-2.5 py-1.5 rounded leading-relaxed">
                          Suggestion: "{error.suggestion}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )
        )}
      </div>
    </div>
  );
}
