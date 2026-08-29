/**
 * API client for Patent Claim NLP backend
 */

import { authHeaders, clearToken } from './auth';

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (res.status === 403) {
    // Billing was removed when the project became self-hosted. A 403 here means
    // the backend is still enforcing the old subscription gate — see the setup
    // guide for running an instance without it.
    throw new Error('Access denied by the backend');
  }

  return res;
}

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
  const response = await authFetch(`${API_BASE}/analyze-claims`, {
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

// OA Response Session Types
export interface OAResponseSession {
  id: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  workspace_path: string;
}

export interface ToolCallData {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: string | null;
}

export interface MessagePart {
  type: 'text' | 'tool-call' | 'compaction';
  text?: string;
  toolCallId?: string;
  trigger?: string;
}

export interface OAResponseMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCallData[] | null;
  parts?: MessagePart[] | null;
  created_at: string;
  attachments?: {
    id: string;
    filename: string;
    original_filename: string;
    document_type: string;
    file_size: number;
    created_at: string;
  }[];
}

// OA Response Session API Functions
export async function createOAResponseSession(): Promise<{
  id: string;
  workspace_path: string;
  created_at: string;
}> {
  const response = await authFetch(`${API_BASE}/oa-response/sessions`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  return response.json();
}

export async function listOAResponseSessions(): Promise<{ sessions: OAResponseSession[] }> {
  const response = await authFetch(`${API_BASE}/oa-response/sessions`);

  if (!response.ok) {
    throw new Error(`Failed to list sessions: ${response.status}`);
  }

  return response.json();
}

export async function deleteOAResponseSession(sessionId: string): Promise<void> {
  const response = await authFetch(`${API_BASE}/oa-response/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.status}`);
  }
}

export async function getOAResponseMessages(
  sessionId: string
): Promise<{ messages: OAResponseMessage[] }> {
  const response = await authFetch(`${API_BASE}/oa-response/sessions/${sessionId}/messages`);

  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.status}`);
  }

  return response.json();
}

export function getOAResponseMessagesEndpoint(sessionId: string): string {
  return `${API_BASE}/oa-response/sessions/${sessionId}/messages`;
}

export function getFileUrl(sessionId: string, filePath: string): string {
  // Normalize path - remove leading slash if present
  const normalizedPath = filePath.startsWith("/")
    ? filePath.slice(1)
    : filePath;
  return `${API_BASE}/oa-response/sessions/${sessionId}/files/${normalizedPath}`;
}

export function getDocxDownloadUrl(sessionId: string, filePath: string): string {
  return `${getFileUrl(sessionId, filePath)}?format=docx`;
}

// Workspace file browser types & functions

export interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  is_directory: boolean;
}

export async function listWorkspaceFiles(
  sessionId: string,
  path?: string
): Promise<WorkspaceFile[]> {
  const params = path ? `?path=${encodeURIComponent(path)}` : '';
  const response = await authFetch(
    `${API_BASE}/oa-response/sessions/${sessionId}/files${params}`
  );

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.status}`);
  }

  const data = await response.json();
  return data.files;
}

export async function getWorkspaceFileContent(
  sessionId: string,
  filePath: string
): Promise<string> {
  const normalizedPath = filePath.startsWith('/')
    ? filePath.slice(1)
    : filePath;
  const response = await authFetch(
    `${API_BASE}/oa-response/sessions/${sessionId}/files/${normalizedPath}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get file: ${response.status}`);
  }

  return response.text();
}

// Patent Reader API (public, no auth)

export async function fetchPatent(publicationNumber: string) {
  const response = await fetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Patent not found');
    }
    throw new Error(`Failed to fetch patent: ${response.status}`);
  }

  return response.json();
}

export interface ReferenceNumeral {
  numeral: string;
  label: string;
  count: number;
}

export interface HighlightSpan {
  start: number;
  end: number;
  numeral: string;
}

export interface ReferenceNumeralHighlights {
  abstract: HighlightSpan[];
  description: HighlightSpan[][][]; // [sectionIdx][paraIdx][spanIdx]
  claims: HighlightSpan[][];        // [claimIdx][spanIdx]
}

export interface NumeralLocation {
  sheet: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type?: "figure";
}

export async function fetchFigureMap(
  publicationNumber: string
): Promise<{ figureMap: Record<string, number>; numeralLocations: Record<string, NumeralLocation[]> }> {
  const response = await fetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/figure-map`
  );

  if (!response.ok) return { figureMap: {}, numeralLocations: {} };

  const data = await response.json();
  return {
    figureMap: data.figure_map ?? {},
    numeralLocations: data.numeral_locations ?? {},
  };
}

export async function fetchReferenceNumerals(
  publicationNumber: string
): Promise<{ numerals: ReferenceNumeral[]; highlights: ReferenceNumeralHighlights }> {
  const response = await fetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/reference-numerals`
  );

  if (!response.ok)
    return { numerals: [], highlights: { abstract: [], description: [], claims: [] } };

  const data = await response.json();
  return {
    numerals: data.numerals ?? [],
    highlights: data.highlights ?? { abstract: [], description: [], claims: [] },
  };
}

// Claim element highlighting

export interface ClaimElementSpan {
  start: number;
  end: number;
  group_id: number;
  np_text: string;
  role: "introduction" | "reference" | "bare";
}

export interface ClaimElementGroup {
  group_id: number;
  np_text: string;
  introduced_in: number;
}

export interface ClaimElementsData {
  claim_elements: { claim_number: number; spans: ClaimElementSpan[] }[];
  groups: ClaimElementGroup[];
}

const EMPTY_CLAIM_ELEMENTS: ClaimElementsData = { claim_elements: [], groups: [] };

export async function fetchColLines(
  publicationNumber: string
): Promise<{ description: any[] | null }> {
  const response = await fetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/col-lines`
  );

  if (!response.ok) return { description: null };
  return response.json();
}

export async function fetchClaimElements(
  publicationNumber: string
): Promise<ClaimElementsData> {
  const response = await fetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/claim-elements`
  );

  if (!response.ok) return EMPTY_CLAIM_ELEMENTS;
  return response.json();
}

// ── Annotations ────────────────────────────────────────────────────

import type { PatentAnnotation, AnnotationColor } from '@/components/patent-reader/annotation-types';

export async function fetchAnnotations(publicationNumber: string): Promise<PatentAnnotation[]> {
  const res = await authFetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/annotations`
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.map((r: any) => ({
    id: r.id,
    patentNumber: r.patent_number,
    section: r.section,
    sectionIndex: r.section_index,
    paragraphIndex: r.paragraph_index,
    startOffset: r.start_offset,
    endOffset: r.end_offset,
    selectedText: r.selected_text,
    note: r.note,
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createAnnotationApi(
  publicationNumber: string,
  annotation: PatentAnnotation,
): Promise<PatentAnnotation> {
  const res = await authFetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/annotations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: annotation.id,
        section: annotation.section,
        section_index: annotation.sectionIndex,
        paragraph_index: annotation.paragraphIndex,
        start_offset: annotation.startOffset,
        end_offset: annotation.endOffset,
        selected_text: annotation.selectedText,
        note: annotation.note,
        color: annotation.color,
        created_at: annotation.createdAt,
        updated_at: annotation.updatedAt,
      }),
    }
  );
  const r = await res.json();
  return {
    id: r.id,
    patentNumber: r.patent_number,
    section: r.section,
    sectionIndex: r.section_index,
    paragraphIndex: r.paragraph_index,
    startOffset: r.start_offset,
    endOffset: r.end_offset,
    selectedText: r.selected_text,
    note: r.note,
    color: r.color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function updateAnnotationApi(
  publicationNumber: string,
  annotationId: string,
  updates: { note?: string; color?: AnnotationColor },
): Promise<void> {
  await authFetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/annotations/${annotationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );
}

export async function deleteAnnotationApi(
  publicationNumber: string,
  annotationId: string,
): Promise<void> {
  await authFetch(
    `${API_BASE}/patents/${encodeURIComponent(publicationNumber)}/annotations/${annotationId}`,
    { method: "DELETE" }
  );
}

export async function bulkImportAnnotations(
  annotations: PatentAnnotation[],
): Promise<void> {
  await authFetch(`${API_BASE}/patents/annotations/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      annotations: annotations.map((a) => ({
        id: a.id,
        patent_number: a.patentNumber,
        section: a.section,
        section_index: a.sectionIndex,
        paragraph_index: a.paragraphIndex,
        start_offset: a.startOffset,
        end_offset: a.endOffset,
        selected_text: a.selectedText,
        note: a.note,
        color: a.color,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
      })),
    }),
  });
}
