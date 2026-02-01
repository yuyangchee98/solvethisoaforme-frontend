import React from 'react';
import type { AnnotationData } from '@/lib/annotationUtils';

interface AnnotatedTextProps {
  text: string;
  annotations: AnnotationData[];  // Claim-relative positions
  onAnnotationClick?: (annotation: AnnotationData) => void;
  onAnnotationHover?: (annotation: AnnotationData | null) => void;
}

export function AnnotatedText({
  text,
  annotations,
  onAnnotationClick,
  onAnnotationHover
}: AnnotatedTextProps) {
  // Sort annotations by start position
  const sorted = [...annotations].sort((a, b) => a.start - b.start);

  // Split text into segments
  const segments: React.ReactNode[] = [];
  let lastEnd = 0;

  for (let i = 0; i < sorted.length; i++) {
    const ann = sorted[i];

    // Plain text before annotation
    if (ann.start > lastEnd) {
      segments.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd, ann.start)}</span>);
    }

    // Annotated text
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
        {text.slice(ann.start, ann.end)}
      </span>
    );

    lastEnd = ann.end;
  }

  // Remaining text
  if (lastEnd < text.length) {
    segments.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd)}</span>);
  }

  return <div className="whitespace-pre-wrap leading-relaxed">{segments}</div>;
}
