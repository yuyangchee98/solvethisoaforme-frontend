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
      <div className="w-12 border-l bg-white flex flex-col items-center pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="mt-4 flex flex-col items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <Badge variant="destructive" className="text-xs">
            {errors.length}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-white flex flex-col">
      <div className="h-14 border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <h2 className="font-semibold text-sm">Errors</h2>
          <Badge variant="destructive" className="text-xs">
            {errors.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {claimNumbers.map((claimNum) => (
          <div key={claimNum}>
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              Claim {claimNum}
            </div>
            <div className="space-y-2">
              {errorsByClaim[claimNum].map((error, idx) => {
                const isHovered = hoveredAnnotation?.start === error.start &&
                                 hoveredAnnotation?.end === error.end;

                return (
                  <Card
                    key={`${claimNum}-${idx}`}
                    className={`p-3 cursor-pointer transition-colors ${
                      isHovered
                        ? 'bg-red-100 border-red-300'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onErrorClick(error)}
                    onMouseEnter={() => onErrorHover?.(error)}
                    onMouseLeave={() => onErrorHover?.(null)}
                  >
                    <p className="text-sm font-medium text-red-600 mb-1">
                      "{error.text}"
                    </p>
                    {error.reason && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {error.reason}
                      </p>
                    )}
                    {error.suggestion && (
                      <p className="text-xs text-amber-600 mt-1">
                        Suggestion: "{error.suggestion}"
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
