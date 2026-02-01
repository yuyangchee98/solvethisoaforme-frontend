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
 * Find where each claim ends in the full document text
 */
export function getClaimEndPosition(
  fullText: string,
  claimNumber: number
): number {
  const claimStart = getClaimStartPosition(fullText, claimNumber);
  if (claimStart === -1) return -1;

  // Find the start of the next claim
  const nextClaimPattern = new RegExp(`^${claimNumber + 1}\\.\\s`, 'm');
  const nextMatch = fullText.slice(claimStart + 1).match(nextClaimPattern);

  if (nextMatch && nextMatch.index !== undefined) {
    // End at the start of the next claim
    return claimStart + 1 + nextMatch.index;
  }

  // This is the last claim, goes to end of document
  return fullText.length;
}

/**
 * Get annotations for a specific claim number
 */
export function getAnnotationsForClaim(
  allAnnotations: AnnotationData[],
  claimNumber: number
): AnnotationData[] {
  return allAnnotations.filter(ann => ann.claimNumber === claimNumber);
}
