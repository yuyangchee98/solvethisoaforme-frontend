import { useState, useEffect } from 'react';
import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
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
import { getAgentMessagesEndpoint, getFileUrl, type AgentMessage } from '@/lib/api';
import { getToken, getMe, authHeaders, type AuthUser } from '@/lib/auth';
import { SubscriptionRequired } from '@/components/auth/SubscriptionRequired';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function convertToUIMessages(messages: AgentMessage[], sessionId: string): UIMessage[] {
  return messages.map((msg) => {
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

    // Add tool call parts for assistant messages (before text for proper ordering)
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

    // Add text part if there's content
    if (msg.content) {
      parts.push({ type: 'text' as const, text: msg.content });
    }

    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      parts,
    };
  });
}

function ChatThread({ sessionId, initialMessages }: { sessionId: string; initialMessages: AgentMessage[] }) {
  const endpoint = getAgentMessagesEndpoint(sessionId);

  const runtime = useChatRuntime({
    id: sessionId,
    messages: convertToUIMessages(initialMessages, sessionId),
    transport: new AssistantChatTransport({
      api: endpoint,
      headers: authHeaders(),
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
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

export function AgentChat() {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'no-subscription'>('loading');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    getMe()
      .then((user) => {
        if (user.subscription_status === 'active' || user.subscription_status === 'trialing') {
          setAuthState('authenticated');
        } else {
          setAuthState('no-subscription');
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

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

  const handleCreateSession = async () => {
    await createSession();
  };

  if (authState === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (authState === 'no-subscription') {
    return <SubscriptionRequired />;
  }

  return (
    <div className="flex h-full">
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSession?.id || null}
        isLoading={sessionLoading}
        onCreateSession={handleCreateSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
      />

      <div className="flex-1 flex flex-col">
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
    </div>
  );
}
