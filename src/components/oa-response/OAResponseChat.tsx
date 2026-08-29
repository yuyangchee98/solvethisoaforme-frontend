import { useState, useEffect, createContext, useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  useThreadRuntime,
} from '@assistant-ui/react';
import {
  useChatRuntime,
  AssistantChatTransport,
} from '@assistant-ui/react-ai-sdk';
import { PDFAttachmentAdapter } from '@/lib/pdfAttachmentAdapter';
import { DocxAttachmentAdapter } from '@/lib/docxAttachmentAdapter';
import { TextAttachmentAdapter } from '@/lib/textAttachmentAdapter';
import { Thread } from '@/components/assistant-ui/thread';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { UIMessage } from '@ai-sdk/react';

import { useSession } from './hooks/useSession';
import { SessionSidebar } from './SessionSidebar';
import { SessionProvider } from './contexts/SessionContext';
import { PreviewPanel } from './PreviewPanel';
import { usePreviewPanel } from '@/lib/previewPanelStore';
import { useMobileSidebar } from '@/lib/mobileSidebarStore';
import { useIsMobile } from '@/lib/useIsMobile';
import { getOAResponseMessagesEndpoint, getFileUrl, type OAResponseMessage } from '@/lib/api';
import { getToken, getMe, authHeaders, type AuthUser } from '@/lib/auth';
import { MessageSquarePlus, Loader2, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ---- Compaction context ----
// Set of message IDs that have a compaction marker associated with them.
// A compaction notice renders above these messages.
export const CompactionContext = createContext<Set<string>>(new Set());

/**
 * Convert backend messages to assistant-ui UIMessages.
 * Also returns a set of message IDs that have a compaction marker
 * (i.e. a compaction notice should render above that message).
 */
function convertToUIMessages(
  messages: OAResponseMessage[],
  sessionId: string,
): { uiMessages: UIMessage[]; compactionIds: Set<string> } {
  const compactionIds = new Set<string>();
  const uiMessages: UIMessage[] = [];

  for (const msg of messages) {
    const parts: UIMessage['parts'] = [];

    // Add file parts for user messages with attachments (before text for proper ordering)
    if (msg.role === 'user' && msg.attachments?.length) {
      for (const att of msg.attachments) {
        const url = getFileUrl(sessionId, `input/${att.filename}`);
        const ext = att.filename.split('.').pop()?.toLowerCase();
        let mediaType = 'application/octet-stream';
        if (ext === 'pdf') mediaType = 'application/pdf';
        else if (ext === 'png') mediaType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mediaType = 'image/jpeg';
        else if (ext === 'docx') mediaType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'log') mediaType = 'text/plain';
        else if (ext === 'json') mediaType = 'application/json';
        else if (ext === 'xml') mediaType = 'text/xml';

        parts.push({ type: 'file' as const, mediaType, filename: att.filename, url });
      }
    }

    // For assistant messages, use ordered parts if available
    let hasCompaction = false;
    if (msg.role === 'assistant' && msg.parts?.length) {
      // Build a lookup for tool calls by ID
      const toolCallMap = new Map(
        (msg.tool_calls ?? []).map((tc) => [tc.toolCallId, tc])
      );

      for (const part of msg.parts) {
        if (part.type === 'text' && part.text) {
          parts.push({ type: 'text' as const, text: part.text });
        } else if (part.type === 'tool-call' && part.toolCallId) {
          const tc = toolCallMap.get(part.toolCallId);
          if (tc) {
            parts.push({
              type: 'dynamic-tool' as const,
              toolName: tc.toolName,
              toolCallId: tc.toolCallId,
              state: 'output-available' as const,
              input: tc.input,
              output: tc.output,
            });
          }
        } else if (part.type === 'compaction') {
          hasCompaction = true;
        }
      }
    } else {
      // Fallback for old messages without ordered parts
      if (msg.role === 'assistant' && msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          parts.push({
            type: 'dynamic-tool' as const,
            toolName: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            state: 'output-available' as const,
            input: toolCall.input,
            output: toolCall.output,
          });
        }
      }

      if (msg.content) {
        parts.push({ type: 'text' as const, text: msg.content });
      }
    }

    uiMessages.push({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      parts,
    });

    if (hasCompaction) {
      compactionIds.add(msg.id);
    }
  }

  return { uiMessages, compactionIds };
}

/**
 * Create a fetch wrapper that intercepts SSE compaction events from the
 * response stream and calls `onCompaction` while still passing the full
 * stream through to the transport.
 */
function createCompactionFetch(onCompaction: () => void): typeof globalThis.fetch {
  return async (input, init) => {
    const response = await fetch(input, init);

    // Only intercept SSE streams
    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('text/event-stream') || !response.body) {
      return response;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const transformed = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining buffer line
          if (buffer.startsWith('data: ') && buffer.includes('"compaction"')) {
            try {
              const data = JSON.parse(buffer.slice(6));
              if (data.type === 'compaction') onCompaction();
            } catch { /* ignore */ }
          }
          controller.close();
          return;
        }
        // Scan each chunk for compaction events
        buffer += decoder.decode(value, { stream: true });
        // Check complete lines for compaction events
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ') && line.includes('"compaction"')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'compaction') {
                onCompaction();
              }
            } catch {
              // Not valid JSON, ignore
            }
          }
        }
        // Pass through the original bytes unchanged
        controller.enqueue(value);
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(transformed, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

function ChatThread({ sessionId, initialMessages }: { sessionId: string; initialMessages: OAResponseMessage[] }) {
  const endpoint = getOAResponseMessagesEndpoint(sessionId);
  const { uiMessages, compactionIds: initialCompaction } = useMemo(
    () => convertToUIMessages(initialMessages, sessionId),
    [initialMessages, sessionId],
  );

  const [compactionIds, setCompactionIds] = useState<Set<string>>(initialCompaction);

  // For live streaming, we use a sentinel ID since we don't know the
  // assistant-ui generated message ID ahead of time. We use a special
  // marker "__streaming__" that the Thread component resolves to the
  // last assistant message.
  const handleCompaction = useCallback(() => {
    setCompactionIds((prev) => {
      const next = new Set(prev);
      next.add('__streaming__');
      return next;
    });
  }, []);

  const compactionFetch = useMemo(
    () => createCompactionFetch(handleCompaction),
    [handleCompaction],
  );

  const runtime = useChatRuntime({
    id: sessionId,
    messages: uiMessages,
    transport: new AssistantChatTransport({
      api: endpoint,
      headers: authHeaders(),
      fetch: compactionFetch,
    }),
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new PDFAttachmentAdapter(),
        new DocxAttachmentAdapter(),
        new TextAttachmentAdapter(),
      ]),
    },
  });

  return (
    <CompactionContext.Provider value={compactionIds}>
      <AssistantRuntimeProvider runtime={runtime}>
        <CompactionStreamingCleanup setCompactionIds={setCompactionIds} />
        <Thread />
      </AssistantRuntimeProvider>
    </CompactionContext.Provider>
  );
}

/**
 * Resolves the "__streaming__" compaction sentinel to the actual last
 * assistant message ID when a run completes, so the marker persists
 * correctly and doesn't affect future messages.
 */
function CompactionStreamingCleanup({
  setCompactionIds,
}: {
  setCompactionIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  const threadRuntime = useThreadRuntime();

  useEffect(() => {
    return threadRuntime.unstable_on("runEnd", () => {
      setCompactionIds((prev) => {
        if (!prev.has("__streaming__")) return prev;
        const next = new Set(prev);
        next.delete("__streaming__");
        // Resolve to the last message's ID
        const state = threadRuntime.getState();
        const messages = state.messages;
        if (messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg.role === "assistant") {
            next.add(lastMsg.id);
          }
        }
        return next;
      });
    });
  }, [threadRuntime, setCompactionIds]);

  return null;
}

function AuthenticatedChat() {
  const {
    sessions,
    currentSession,
    messages,
    isLoading: sessionLoading,
    error: sessionError,
    createSession,
    selectSession,
    deleteSession,
    clearError,
  } = useSession();

  const isMobile = useIsMobile();
  const sidebarOpen = useMobileSidebar((s) => s.isOpen);
  const closeSidebar = useMobileSidebar((s) => s.close);

  // Close preview panel on session switch
  useEffect(() => {
    usePreviewPanel.getState().close();
  }, [currentSession?.id]);

  const handleCreateSession = async () => {
    await createSession();
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    closeSidebar();
  };

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSession?.id || null}
          isLoading={sessionLoading}
          onCreateSession={handleCreateSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
        />
      </div>

      {/* Mobile sidebar drawer */}
      {isMobile && (
        <>
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <SessionSidebar
              sessions={sessions}
              currentSessionId={currentSession?.id || null}
              isLoading={sessionLoading}
              onCreateSession={handleCreateSession}
              onSelectSession={handleSelectSession}
              onDeleteSession={deleteSession}
            />
          </div>
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={closeSidebar}
            />
          )}
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {sessionError && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex justify-between items-center">
            <span>{sessionError}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              Dismiss
            </button>
          </div>
        )}

        {currentSession ? (
          <TooltipProvider>
            <SessionProvider sessionId={currentSession.id}>
              <ChatThread key={currentSession.id} sessionId={currentSession.id} initialMessages={messages} />
            </SessionProvider>
          </TooltipProvider>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquarePlus className="h-16 w-16 mx-auto text-stone-300 mb-4" />
              <h2 className="text-xl font-semibold text-stone-900 mb-2">
                No session selected
              </h2>
              <p className="text-stone-500 mb-4">
                Create a new session or select an existing one to start chatting.
              </p>
              <Button onClick={handleCreateSession} disabled={sessionLoading}>
                Create New Session
              </Button>
            </div>
          </div>
        )}
      </div>

      <PreviewPanel sessionId={currentSession?.id} />
    </div>
  );
}

export function OAResponseChat() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'not-logged-in'>('loading');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthState('not-logged-in');
      return;
    }
    getMe()
      .then(() => {
        setAuthState('authenticated');
      })
      .catch(() => {
        setAuthState('not-logged-in');
      });
  }, []);

  if (authState === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (authState === 'not-logged-in') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Bot className="h-14 w-14 mx-auto text-amber-500 mb-5" />
          <h2 className="text-2xl font-bold text-stone-900 mb-3">
            OA Agent
          </h2>
          <p className="text-stone-600 mb-6">
            Upload your Office Action and let AI help you draft responses — analyze rejections, research prior art, and build arguments.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href="/login">Log in to get started</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/login?tab=register">Sign up</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href="/tools/oa-agent">Learn more</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <AuthenticatedChat />;
}
