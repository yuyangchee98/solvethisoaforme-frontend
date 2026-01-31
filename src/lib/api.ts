/**
 * API client for Patent Claim NLP backend
 */

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

export interface NounPhrase {
  text: string;
  np: string;
  determiner: string | null;
  start: number;
  end: number;
  type: string;
}

export interface AntecedentError {
  text: string;
  np: string;
  start: number;
  end: number;
  reason: string;
  suggestion: string | null;
  suggestion_score: number | null;
}

export interface ClaimAnalysis {
  claim_number: number;
  claim_text: string;
  introductions: NounPhrase[];
  references: NounPhrase[];
  inherited_terms: string[];
  antecedent_errors: AntecedentError[];
}

export interface AnalyzeClaimsResponse {
  analyses: ClaimAnalysis[];
  total_errors: number;
}

export interface ParsedClaimForAPI {
  number: number;
  text: string;
  depends_on: number[];
}

export async function analyzeClaims(claims: ParsedClaimForAPI[]): Promise<AnalyzeClaimsResponse> {
  const response = await fetch(`${API_BASE}/analyze-claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claims }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
