import { useState, useEffect } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import type { AnnotationData } from '@/lib/annotationUtils';
import { getAnnotationLabel, getAnnotationColorClass } from '@/lib/annotationUtils';

interface AnnotationTooltipProps {
  annotation: AnnotationData | null;
  targetElement: HTMLElement | null;
}

export function AnnotationTooltip({
  annotation,
  targetElement,
}: AnnotationTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    delay: { open: 300, close: 0 },
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  useEffect(() => {
    if (targetElement) {
      refs.setReference(targetElement);
    } else {
      refs.setReference(null);
    }
  }, [targetElement, refs]);

  useEffect(() => {
    setIsOpen(!!annotation && !!targetElement);
  }, [annotation, targetElement]);

  if (!annotation || !targetElement) {
    return null;
  }

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      {...getFloatingProps()}
      className="z-50 bg-white border shadow-lg rounded-lg p-3 max-w-xs"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-semibold ${getAnnotationColorClass(annotation.type)}`}>
          {getAnnotationLabel(annotation.type)}
        </span>
        <span className="text-xs text-muted-foreground">
          Claim {annotation.claimNumber}
        </span>
      </div>

      <p className="text-sm font-medium mb-1">"{annotation.text}"</p>

      {annotation.type === 'error' && annotation.reason && (
        <p className="text-xs text-muted-foreground">{annotation.reason}</p>
      )}

      {annotation.suggestion && (
        <p className="text-xs text-amber-600 mt-1">
          Did you mean "{annotation.suggestion}"?
        </p>
      )}
    </div>
  );
}
