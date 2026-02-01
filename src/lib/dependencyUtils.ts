import type { ClaimTree, ParsedClaim } from './claim-parser';

const MAX_CHAIN_DEPTH = 20;

/**
 * Determines the type of dependency a claim has
 */
export function getDependencyType(claim: ParsedClaim): 'chain' | 'multi' | 'none' {
  if (claim.dependsOn.length === 0) return 'none';
  if (claim.dependsOn.length === 1) return 'chain';
  return 'multi';
}

/**
 * Checks if a claim has a chain dependency (single parent)
 */
export function isChainDependency(claim: ParsedClaim): boolean {
  return claim.dependsOn.length === 1;
}

/**
 * Checks if a claim has multiple dependencies (alternative options)
 */
export function isMultiDependency(claim: ParsedClaim): boolean {
  return claim.dependsOn.length > 1;
}

/**
 * Builds a dependency chain by recursively following single dependencies
 * Returns array of claim numbers from current claim to root
 * @param claimNumber - Starting claim number
 * @param claimTree - The full claim tree
 * @returns Array of claim numbers representing the chain (e.g., [22, 21, 12, 11, 10, 9, 1])
 */
export function buildDependencyChain(
  claimNumber: number,
  claimTree: ClaimTree
): number[] {
  const chain: number[] = [];
  const visited = new Set<number>();
  let currentNumber = claimNumber;
  let depth = 0;

  while (currentNumber && depth < MAX_CHAIN_DEPTH) {
    // Prevent circular dependencies
    if (visited.has(currentNumber)) {
      console.warn(`Circular dependency detected at claim ${currentNumber}`);
      break;
    }

    chain.push(currentNumber);
    visited.add(currentNumber);

    const currentClaim = claimTree.claims.get(currentNumber);
    if (!currentClaim) break;

    // Stop at multi-dependencies (only follow single-parent chains)
    if (currentClaim.dependsOn.length !== 1) break;

    currentNumber = currentClaim.dependsOn[0];
    depth++;
  }

  if (depth >= MAX_CHAIN_DEPTH) {
    console.warn(`Maximum chain depth (${MAX_CHAIN_DEPTH}) reached for claim ${claimNumber}`);
  }

  return chain;
}

/**
 * Formats a chain as a breadcrumb trail
 * @param claimNumber - Current claim number
 * @param chain - Array of claim numbers in the chain
 * @returns Formatted string like "22 → 21 → 12 → 11 → 10 → 9 → 1"
 */
export function formatChainBreadcrumb(claimNumber: number, chain: number[]): string {
  // If the chain doesn't start with the current claim, build a fresh one
  const relevantChain = chain[0] === claimNumber ? chain : [claimNumber];
  return relevantChain.join(' → ');
}

/**
 * Formats a multi-dependency range
 * @param dependsOn - Array of claim numbers
 * @returns Formatted string like "any of Claims 1–3" or "Claims 1, 2, 3"
 */
export function formatMultiDependencyRange(dependsOn: number[]): string {
  if (dependsOn.length === 0) return '';
  if (dependsOn.length === 1) return `Claim ${dependsOn[0]}`;

  const sorted = [...dependsOn].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Check if it's a continuous range
  const isContinuous = sorted.every((num, idx) => idx === 0 || num === sorted[idx - 1] + 1);

  if (isContinuous && sorted.length > 2) {
    return `any of Claims ${min}–${max}`;
  }

  // For non-continuous or small ranges, list them out
  if (sorted.length <= 3) {
    return `any of Claims ${sorted.join(', ')}`;
  }

  // For larger non-continuous ranges, use compact notation
  return `any of Claims ${min}–${max}`;
}

/**
 * Gets a short summary of a claim's dependencies for nested display
 * @param claim - The claim to summarize
 * @param claimTree - The full claim tree
 * @returns Short dependency description or null if no dependencies
 */
export function getDependencySummary(
  claim: ParsedClaim,
  claimTree: ClaimTree
): string | null {
  if (claim.dependsOn.length === 0) return null;

  if (isChainDependency(claim)) {
    const chain = buildDependencyChain(claim.number, claimTree);
    // Show only the parent, not the full chain in nested views
    return `→ Claim ${claim.dependsOn[0]}`;
  }

  return formatMultiDependencyRange(claim.dependsOn);
}
