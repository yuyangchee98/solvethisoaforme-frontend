import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useChatRuntime, AssistantChatTransport } from '@assistant-ui/react-ai-sdk';
import { Thread } from '@/components/assistant-ui/thread';
import { TooltipProvider } from '@/components/ui/tooltip';

import { useSession } from './hooks/useSession';
import { SessionSidebar } from './SessionSidebar';
import { getAgentMessagesEndpoint } from '@/lib/api';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ChatThread({ sessionId }: { sessionId: string }) {
  const endpoint = getAgentMessagesEndpoint(sessionId);
  console.log('[DEBUG] ChatThread mounting with endpoint:', endpoint);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: endpoint,
    }),
  });

  console.log('[DEBUG] Runtime created:', runtime);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

export function AgentChat() {
  const {
    sessions,
    currentSession,
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
            <ChatThread key={currentSession.id} sessionId={currentSession.id} />
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
