import { useEffect } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Lightbulb } from 'lucide-react';
import type { AnnotationData } from '@/lib/annotationUtils';
import { getAnnotationLabel, getAnnotationColorClass } from '@/lib/annotationUtils';

interface AnnotationCardProps {
  annotation: AnnotationData | null;
  targetElement: HTMLElement | null;
  onClose: () => void;
  onApplySuggestion?: (annotation: AnnotationData) => void;
}

export function AnnotationCard({
  annotation,
  targetElement,
  onClose,
  onApplySuggestion,
}: AnnotationCardProps) {
  const { refs, floatingStyles } = useFloating({
    open: !!annotation,
    middleware: [offset(12), flip(), shift({ padding: 16 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (targetElement) {
      refs.setReference(targetElement);
    } else {
      refs.setReference(null);
    }
  }, [targetElement, refs]);

  if (!annotation || !targetElement) {
    return null;
  }

  const isError = annotation.type === 'error';

  return (
    <Card
      ref={refs.setFloating}
      style={floatingStyles}
      className="z-50 w-96 shadow-xl"
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold ${getAnnotationColorClass(annotation.type)}`}
            >
              {getAnnotationLabel(annotation.type)}
            </span>
            <span className="text-xs text-muted-foreground">
              Claim {annotation.claimNumber}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3.5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Text</p>
            <p className="text-[15px] font-medium leading-relaxed">"{annotation.text}"</p>
          </div>

          {isError && annotation.reason && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Issue</p>
              <p className="text-[15px] text-red-600 leading-relaxed">{annotation.reason}</p>
            </div>
          )}

          {annotation.suggestion && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-900 mb-2">
                    Suggested correction
                  </p>
                  <p className="text-[15px] text-amber-800 font-semibold mb-2 leading-relaxed">
                    "{annotation.suggestion}"
                  </p>
                  {annotation.suggestionScore && annotation.suggestionScore >= 0.9 && (
                    <p className="text-xs text-amber-700 font-medium">
                      High confidence match
                    </p>
                  )}
                </div>
              </div>
              {onApplySuggestion && (
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => onApplySuggestion(annotation)}
                >
                  Apply suggestion
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
