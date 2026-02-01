import type { AnnotationData } from './annotationUtils';

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
 * Convert annotations from absolute to claim-relative positions
 */
export function getAnnotationsForClaim(
  fullText: string,
  allAnnotations: AnnotationData[],
  claimNumber: number
): AnnotationData[] {
  const claimStart = getClaimStartPosition(fullText, claimNumber);
  if (claimStart === -1) return [];

  // Filter annotations for this claim and convert positions
  return allAnnotations
    .filter(ann => ann.claimNumber === claimNumber)
    .map(ann => ({
      ...ann,
      start: ann.start - claimStart,
      end: ann.end - claimStart,
    }));
}
