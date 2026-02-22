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
    window.location.href = '/subscribe';
    throw new Error('Active subscription required');
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

// Agent Session Types
export interface AgentSession {
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
  type: 'text' | 'tool-call';
  text?: string;
  toolCallId?: string;
}

export interface AgentMessage {
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

// Agent Session API Functions
export async function createAgentSession(): Promise<{
  id: string;
  workspace_path: string;
  created_at: string;
}> {
  const response = await authFetch(`${API_BASE}/agents/sessions`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  return response.json();
}

export async function listAgentSessions(): Promise<{ sessions: AgentSession[] }> {
  const response = await authFetch(`${API_BASE}/agents/sessions`);

  if (!response.ok) {
    throw new Error(`Failed to list sessions: ${response.status}`);
  }

  return response.json();
}

export async function deleteAgentSession(sessionId: string): Promise<void> {
  const response = await authFetch(`${API_BASE}/agents/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete session: ${response.status}`);
  }
}

export async function getAgentMessages(
  sessionId: string
): Promise<{ messages: AgentMessage[] }> {
  const response = await authFetch(`${API_BASE}/agents/sessions/${sessionId}/messages`);

  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.status}`);
  }

  return response.json();
}

export function getAgentMessagesEndpoint(sessionId: string): string {
  return `${API_BASE}/agents/sessions/${sessionId}/messages`;
}

export function getFileUrl(sessionId: string, filePath: string): string {
  // Normalize path - remove leading slash if present
  const normalizedPath = filePath.startsWith("/")
    ? filePath.slice(1)
    : filePath;
  return `${API_BASE}/agents/sessions/${sessionId}/files/${normalizedPath}`;
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
    `${API_BASE}/agents/sessions/${sessionId}/files${params}`
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
    `${API_BASE}/agents/sessions/${sessionId}/files/${normalizedPath}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get file: ${response.status}`);
  }

  return response.text();
}
