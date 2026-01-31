import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import type { AnnotationData } from '@/lib/annotationUtils';

interface ErrorSidebarProps {
  annotations: AnnotationData[];
  onErrorClick: (annotation: AnnotationData) => void;
  onErrorHover?: (annotation: AnnotationData | null) => void;
  hoveredAnnotation?: AnnotationData | null;
}

export function ErrorSidebar({
  annotations,
  onErrorClick,
  onErrorHover,
  hoveredAnnotation
}: ErrorSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const errors = annotations.filter((ann) => ann.type === 'error');

  // Group errors by claim number
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

  if (errors.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="w-16 flex flex-col items-center pt-8 bg-stone-50/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 hover:bg-amber-100"
        >
          <ChevronLeft className="h-4 w-4 text-stone-600" />
        </Button>
        <div className="mt-6 flex flex-col items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
            {errors.length}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 flex flex-col bg-amber-50/30 pr-12 pl-8 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-base text-stone-900">Errors</h2>
          <Badge className="text-xs bg-amber-100 text-amber-700 border-0">
            {errors.length}
          </Badge>
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

      <div className="flex-1 overflow-auto space-y-3">
        {claimNumbers.map((claimNum) => (
          <div key={claimNum}>
            <div className="text-xs font-medium text-stone-500 mb-3">
              Claim {claimNum}
            </div>
            <div className="space-y-2">
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
                    onMouseEnter={() => onErrorHover?.(error)}
                    onMouseLeave={() => onErrorHover?.(null)}
                  >
                    <p className="text-sm font-medium text-stone-900 mb-1">
                      "{error.text}"
                    </p>
                    {error.reason && (
                      <p className="text-xs text-stone-600 line-clamp-2">
                        {error.reason}
                      </p>
                    )}
                    {error.suggestion && (
                      <p className="text-xs text-amber-700 mt-2 font-medium">
                        Suggestion: "{error.suggestion}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
