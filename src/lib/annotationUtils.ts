import type { AnalyzeClaimsResponse, ClaimAnalysis, AntecedentError, NounPhrase } from './api';

export type AnnotationType = 'intro' | 'ref' | 'error' | 'pronoun';

export interface AnnotationData {
  type: AnnotationType;
  start: number;
  end: number;
  text: string;
  np: string; // Noun phrase without determiner (from spaCy)
  claimNumber: number;
  reason?: string;
  suggestion?: string;
  suggestionScore?: number;
}

/**
 * Convert API analysis response to flat list of annotations
 * Positions are offset to match the full document
 */
export function createAnnotationsFromAnalysis(
  analysis: AnalyzeClaimsResponse,
  originalText: string
): AnnotationData[] {
  const annotations: AnnotationData[] = [];

  // Build claim position map
  const claimPositions = new Map<number, number>();

  for (const claim of analysis.analyses) {
    // Find where this claim starts in the original text
    const claimStart = originalText.indexOf(claim.claim_text);
    if (claimStart !== -1) {
      claimPositions.set(claim.claim_number, claimStart);
    }
  }

  for (const claim of analysis.analyses) {
    const offset = claimPositions.get(claim.claim_number) || 0;

    // Add introductions with offset (includes both "a/an X" and bare "X")
    for (const intro of claim.introductions) {
      annotations.push({
        type: 'intro',
        start: intro.start + offset,
        end: intro.end + offset,
        text: intro.text,
        np: intro.np, // Store the noun phrase for matching
        claimNumber: claim.claim_number,
      });
    }

    // Add references (checking if they have errors)
    for (const ref of claim.references) {
      const hasError = claim.antecedent_errors.some(e => e.start === ref.start);
      if (!hasError) {
        annotations.push({
          type: 'ref',
          start: ref.start + offset,
          end: ref.end + offset,
          text: ref.text,
          np: ref.np, // Store the noun phrase for matching
          claimNumber: claim.claim_number,
        });
      }
    }

    // Add errors with offset
    for (const error of claim.antecedent_errors) {
      annotations.push({
        type: 'error',
        start: error.start + offset,
        end: error.end + offset,
        text: error.text,
        np: error.np, // Store the noun phrase for matching
        claimNumber: claim.claim_number,
        reason: error.reason,
        suggestion: error.suggestion || undefined,
        suggestionScore: error.suggestion_score || undefined,
      });
    }
  }

  return annotations;
}

/**
 * Find annotation at a specific position
 */
export function findAnnotationAtPosition(
  annotations: AnnotationData[],
  position: number
): AnnotationData | null {
  return annotations.find(
    ann => position >= ann.start && position < ann.end
  ) || null;
}

/**
 * Get label for annotation type
 */
export function getAnnotationLabel(type: AnnotationType): string {
  switch (type) {
    case 'intro':
      return 'Introduction';
    case 'ref':
      return 'Reference';
    case 'error':
      return 'Error';
    case 'pronoun':
      return 'Pronoun';
  }
}

/**
 * Get color class for annotation type
 */
export function getAnnotationColorClass(type: AnnotationType): string {
  switch (type) {
    case 'intro':
      return 'text-green-600';
    case 'ref':
      return 'text-blue-600';
    case 'error':
      return 'text-red-600';
    case 'pronoun':
      return 'text-orange-600';
  }
}
