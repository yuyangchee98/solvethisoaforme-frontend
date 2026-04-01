import { useState, useCallback, useEffect } from 'react';
import type { OAResponseSession, OAResponseMessage } from '@/lib/api';
import {
  createOAResponseSession,
  listOAResponseSessions,
  deleteOAResponseSession,
  getOAResponseMessages,
} from '@/lib/api';

export interface UseSessionReturn {
  sessions: OAResponseSession[];
  currentSession: OAResponseSession | null;
  messages: OAResponseMessage[];
  isLoading: boolean;
  error: string | null;
  createSession: () => Promise<OAResponseSession | null>;
  selectSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  clearError: () => void;
}

let lastTrackedSessionUrl = window.location.href;

function updateUrlSession(sessionId: string | null) {
  const url = new URL(window.location.href);
  if (sessionId) {
    url.searchParams.set('session', sessionId);
  } else {
    url.searchParams.delete('session');
  }
  const newUrl = url.toString();
  window.history.replaceState({}, '', newUrl);

  if (newUrl !== lastTrackedSessionUrl) {
    lastTrackedSessionUrl = newUrl;
    (window as any).gtag?.('event', 'page_view', {
      page_location: newUrl,
    });
  }
}

function getUrlSessionId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('session');
}

export function useSession(): UseSessionReturn {
  const [sessions, setSessions] = useState<OAResponseSession[]>([]);
  const [currentSession, setCurrentSession] = useState<OAResponseSession | null>(null);
  const [messages, setMessages] = useState<OAResponseMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const refreshSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await listOAResponseSessions();
      // Sort by created_at descending (newest first)
      const sorted = result.sessions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSessions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSession = useCallback(async (): Promise<OAResponseSession | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await createOAResponseSession();
      const newSession: OAResponseSession = {
        id: result.id,
        status: 'active',
        created_at: result.created_at,
        updated_at: result.created_at,
        workspace_path: result.workspace_path,
      };
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      updateUrlSession(newSession.id);
      return newSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Find the session in our list
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Load messages for this session
      const result = await getOAResponseMessages(sessionId);
      setMessages(result.messages);
      setCurrentSession(session);
      updateUrlSession(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [sessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteOAResponseSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // If we deleted the current session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
        updateUrlSession(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  // Load sessions on mount, then restore session from URL if present
  useEffect(() => {
    refreshSessions().then(() => {
      const urlSessionId = getUrlSessionId();
      if (urlSessionId) {
        // selectSession depends on sessions state, so we need to
        // check directly via the API instead of waiting for state
        getOAResponseMessages(urlSessionId)
          .then((result) => {
            setMessages(result.messages);
            // Find the session from the freshly-loaded list
            setSessions((prev) => {
              const session = prev.find((s) => s.id === urlSessionId);
              if (session) {
                setCurrentSession(session);
              } else {
                // Session from URL no longer exists, clean up
                updateUrlSession(null);
              }
              return prev;
            });
          })
          .catch(() => {
            // Invalid session ID in URL, clean up
            updateUrlSession(null);
          });
      }
    });
  }, [refreshSessions]);

  return {
    sessions,
    currentSession,
    messages,
    isLoading,
    error,
    createSession,
    selectSession,
    deleteSession,
    refreshSessions,
    clearError,
  };
}
