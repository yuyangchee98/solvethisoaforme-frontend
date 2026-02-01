import type { AnnotationData } from './annotationUtils';

/**
 * Annotation with both absolute and claim-relative positions
 */
export interface ClaimAnnotation extends AnnotationData {
  // These are claim-relative positions for text slicing
  relativeStart: number;
  relativeEnd: number;
  // start/end remain absolute for hover matching
}

/**
 * Find where each claim starts in the full document text
 */
export function getClaimStartPosition(
  fullText: string,
  claimNumber: number
): number {
  // Find "X. " pattern (claim number followed by period and space)
  const pattern = new RegExp(`^${claimNumber}\\.\\s`, 'm');
  const match = fullText.match(pattern);
  return match?.index ?? -1;
}

/**
 * Get annotations for a claim with both absolute and claim-relative positions
 */
export function getAnnotationsForClaim(
  fullText: string,
  allAnnotations: AnnotationData[],
  claimNumber: number
): ClaimAnnotation[] {
  const claimStart = getClaimStartPosition(fullText, claimNumber);
  if (claimStart === -1) return [];

  // Filter annotations for this claim and add relative positions
  return allAnnotations
    .filter(ann => ann.claimNumber === claimNumber)
    .map(ann => ({
      ...ann,
      // Keep original absolute positions for hover matching
      start: ann.start,
      end: ann.end,
      // Add claim-relative positions for text slicing
      relativeStart: ann.start - claimStart,
      relativeEnd: ann.end - claimStart,
    }));
}
