import React from 'react';
import type { AnnotationData } from '@/lib/annotationUtils';

interface AnnotatedTextProps {
  fullText: string;  // The full document text (untrimmed)
  claimStart: number;  // Where this claim starts in fullText
  claimEnd: number;  // Where this claim ends in fullText
  annotations: AnnotationData[];  // Annotations with absolute positions
  onAnnotationClick?: (annotation: AnnotationData) => void;
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

export function AnnotatedText({
  fullText,
  claimStart,
  claimEnd,
  annotations,
  onAnnotationClick,
  onAnnotationHover
}: AnnotatedTextProps) {
  // Sort annotations by start position
  const sorted = [...annotations].sort((a, b) => a.start - b.start);

  // Split text into segments, slicing from fullText using absolute positions
  const segments: React.ReactNode[] = [];
  let lastEnd = claimStart;

  for (let i = 0; i < sorted.length; i++) {
    const ann = sorted[i];

    // Plain text before annotation - slice from fullText
    if (ann.start > lastEnd) {
      segments.push(fullText.slice(lastEnd, ann.start));
    }

    // Annotated text - slice from fullText using absolute positions
    segments.push(
      <span
        key={`ann-${ann.start}-${ann.end}`}
        className={`annotation annotation-${ann.type}`}
        data-type={ann.type}
        data-start={ann.start}
        data-end={ann.end}
        data-claim={ann.claimNumber}
        onClick={() => onAnnotationClick?.(ann)}
        onMouseEnter={() => onAnnotationHover?.(ann)}
        onMouseLeave={() => onAnnotationHover?.(null)}
      >
        {fullText.slice(ann.start, ann.end)}
      </span>
    );

    lastEnd = ann.end;
  }

  // Remaining text - slice from fullText
  if (lastEnd < claimEnd) {
    segments.push(fullText.slice(lastEnd, claimEnd));
  }

  return <>{segments}</>;
}
