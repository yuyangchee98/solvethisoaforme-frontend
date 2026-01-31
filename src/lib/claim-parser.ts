/**
 * Claim Parser: Parse patent claims into dependency tree
 */

import { preprocess } from './preprocess';

export interface ParsedClaim {
  number: number;
  text: string;
  dependsOn: number[];
  isIndependent: boolean;
}

export interface ClaimTree {
  claims: Map<number, ParsedClaim>;
  roots: number[];
}

// Standard format: "1. A method", "2. The system"
const STANDARD_CLAIM_START = /^(\d+)\.\s+(A|An|The)\s+\w+/i;

/**
 * Split text into individual claims
 */
export function splitClaims(rawText: string): string[] {
  const text = preprocess(rawText);
  const lines = text.split('\n');
  const claims: string[] = [];
  let currentClaim: string[] = [];

  for (const line of lines) {
    if (STANDARD_CLAIM_START.test(line)) {
      if (currentClaim.length > 0) {
        claims.push(currentClaim.join('\n').trim());
      }
      currentClaim = [line];
    } else if (currentClaim.length > 0) {
      currentClaim.push(line);
    }
  }

  if (currentClaim.length > 0) {
    claims.push(currentClaim.join('\n').trim());
  }

  return claims;
}

/**
 * Parse dependency string handling various formats
 */
export function parseDependencyString(depStr: string): number[] {
  const deps: number[] = [];
  const parts = depStr.split(/,|\band\b|\bor\b/);

  for (const part of parts) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/(\d+)\s*[-–—]\s*(\d+)/) ||
                       trimmed.match(/(\d+)\s+to\s+(\d+)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) deps.push(i);
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) deps.push(num);
    }
  }

  return [...new Set(deps)].sort((a, b) => a - b);
}

/**
 * Extract dependencies from claim text
 */
export function extractDependencies(text: string): number[] {
  const anyOneMatch = text.match(/any\s+one\s+of\s+(?:claims?\s+)?(\d+)\s+to\s+(\d+)/i);
  if (anyOneMatch) {
    const start = parseInt(anyOneMatch[1], 10);
    const end = parseInt(anyOneMatch[2], 10);
    const deps: number[] = [];
    for (let i = start; i <= end; i++) deps.push(i);
    return deps;
  }

  const orMatch = text.match(/(?:of\s+)?claims?\s+(\d+(?:\s+or\s+\d+)+)/i);
  if (orMatch) {
    return parseDependencyString(orMatch[1]);
  }

  const standardMatch = text.match(
    /(?:of|according to|as (?:recited|claimed|set forth) in)\s+claims?\s+([\d,\s\-–—andor]+)/i
  );
  if (standardMatch) {
    return parseDependencyString(standardMatch[1]);
  }

  return [];
}

/**
 * Extract claim number from text
 */
export function extractClaimNumber(text: string): number {
  const match = text.match(/^(\d+)\./);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Parse single claim
 */
export function parseClaim(text: string): ParsedClaim {
  const dependsOn = extractDependencies(text);
  return {
    number: extractClaimNumber(text),
    text,
    dependsOn,
    isIndependent: dependsOn.length === 0,
  };
}

/**
 * Build tree from raw text
 */
export function parseClaimsToTree(rawText: string): ClaimTree {
  const claimTexts = splitClaims(rawText);
  const claims = new Map<number, ParsedClaim>();
  const roots: number[] = [];

  for (const text of claimTexts) {
    const parsed = parseClaim(text);
    if (parsed.number > 0) {
      claims.set(parsed.number, parsed);
      if (parsed.isIndependent) roots.push(parsed.number);
    }
  }

  return { claims, roots };
}
