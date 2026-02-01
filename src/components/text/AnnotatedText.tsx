import React from 'react';
import type { ClaimAnnotation } from '@/lib/claimPositions';

interface AnnotatedTextProps {
  text: string;
  annotations: ClaimAnnotation[];  // Has both absolute and claim-relative positions
  onAnnotationClick?: (annotation: ClaimAnnotation) => void;
  onAnnotationHover?: (annotation: ClaimAnnotation | null) => void;
}

export function AnnotatedText({
  text,
  annotations,
  onAnnotationClick,
  onAnnotationHover
}: AnnotatedTextProps) {
  // Sort annotations by relative start position (for rendering within claim)
  const sorted = [...annotations].sort((a, b) => a.relativeStart - b.relativeStart);

  // Split text into segments
  const segments: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ann = sorted[i];

    // Plain text before annotation (using relative positions for slicing)
    if (ann.relativeStart > lastEnd) {
      segments.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd, ann.relativeStart)}</span>);
    }

    // Annotated text
    segments.push(
      <span
        key={`ann-${ann.start}-${ann.end}`}
        className={`annotation annotation-${ann.type}`}
        data-type={ann.type}
        data-start={ann.start}  // ABSOLUTE position for hover matching
        data-end={ann.end}      // ABSOLUTE position for hover matching
        data-claim={ann.claimNumber}
        onClick={() => onAnnotationClick?.(ann)}
        onMouseEnter={() => onAnnotationHover?.(ann)}
        onMouseLeave={() => onAnnotationHover?.(null)}
      >
        {text.slice(ann.relativeStart, ann.relativeEnd)}  {/* RELATIVE positions for text slicing */}
      </span>
    );

    lastEnd = ann.relativeEnd;  // Track relative position for next segment
  }

  // Remaining text
  if (lastEnd < text.length) {
    segments.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd)}</span>);
  }

  return <div className="whitespace-pre-wrap leading-relaxed">{segments}</div>;
}
