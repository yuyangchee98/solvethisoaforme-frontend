import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChatSection,
  ChatMessages,
  ChatInput,
  type ChatHandler,
  type Message,
} from '@llamaindex/chat-ui';
import '@llamaindex/chat-ui/styles/markdown.css';
import '@llamaindex/chat-ui/styles/editor.css';

import { useSession } from './hooks/useSession';
import { SessionSidebar } from './SessionSidebar';
import { ToolCallDisplay } from './ToolIndicator';
import { getAgentMessagesEndpoint, type AgentMessage } from '@/lib/api';
import { MessageSquarePlus, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
}

interface ToolCall {
  toolCallId: string;
  toolName: string;
  status: 'running' | 'complete';
}

function convertAgentMessages(messages: AgentMessage[]): Message[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content }],
  }));
}

export function AgentChat() {
  const {
    sessions,
    currentSession,
    messages: sessionMessages,
    isLoading: sessionLoading,
    error: sessionError,
    createSession,
    selectSession,
    deleteSession,
    clearError,
  } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<'submitted' | 'streaming' | 'ready' | 'error'>('ready');
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const uploaded: UploadedFile = { id, file };

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === id ? { ...f, preview: e.target?.result as string } : f))
        );
      };
      reader.readAsDataURL(file);
    }

    setUploadedFiles((prev) => [...prev, uploaded]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const resetUploadedFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  // Sync session messages to local state when session changes
  useEffect(() => {
    setMessages(convertAgentMessages(sessionMessages));
    setToolCalls([]);
  }, [sessionMessages]);

  const sendMessage = useCallback(
    async (msg: Message) => {
      if (!currentSession) return;

      // Add user message to local state
      setMessages((prev) => [...prev, msg]);
      setStatus('submitted');
      setToolCalls([]);

      // Create assistant message placeholder
      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        parts: [{ type: 'text', text: '' }],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Build FormData for the request
        const formData = new FormData();
        const textPart = msg.parts.find((p): p is { type: 'text'; text: string } => p.type === 'text');
        formData.append('content', textPart?.text || '');

        // Handle file uploads from state
        for (const uploaded of uploadedFiles) {
          formData.append('attachments', uploaded.file);
        }

        // Also handle file uploads from message parts (for compatibility)
        for (const part of msg.parts) {
          if (part.type === 'data-file' && 'data' in part && part.data) {
            const fileData = part.data as { url: string; filename: string; mediaType: string };
            const response = await fetch(fileData.url);
            const blob = await response.blob();
            formData.append('attachments', new File([blob], fileData.filename, { type: fileData.mediaType }));
          }
        }

        // Clear uploaded files after adding to form
        resetUploadedFiles();

        abortControllerRef.current = new AbortController();

        const endpoint = getAgentMessagesEndpoint(currentSession.id);
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        setStatus('streaming');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulatedText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line) continue;

            // Parse Vercel AI SDK Text Stream Protocol
            const typeCode = line[0];
            const data = line.slice(2); // Skip "X:" prefix

            switch (typeCode) {
              case '0': {
                // Text delta
                try {
                  const text = JSON.parse(data);
                  accumulatedText += text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg?.role === 'assistant') {
                      lastMsg.parts = [{ type: 'text', text: accumulatedText }];
                    }
                    return updated;
                  });
                } catch {
                  // Ignore parse errors
                }
                break;
              }
              case '9': {
                // Tool call start
                try {
                  const toolCall = JSON.parse(data);
                  setToolCalls((prev) => [
                    ...prev,
                    {
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      status: 'running',
                    },
                  ]);
                } catch {
                  // Ignore parse errors
                }
                break;
              }
              case 'a': {
                // Tool result
                try {
                  const result = JSON.parse(data);
                  setToolCalls((prev) =>
                    prev.map((tc) =>
                      tc.toolCallId === result.toolCallId
                        ? { ...tc, status: 'complete' }
                        : tc
                    )
                  );
                } catch {
                  // Ignore parse errors
                }
                break;
              }
              case 'd': {
                // Finish
                setStatus('ready');
                break;
              }
              case 'e': {
                // Error
                try {
                  const error = JSON.parse(data);
                  console.error('Stream error:', error.message);
                  setStatus('error');
                } catch {
                  setStatus('error');
                }
                break;
              }
            }
          }
        }

        setStatus('ready');
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStatus('ready');
        } else {
          console.error('Send message error:', err);
          setStatus('error');
        }
      }
    },
    [currentSession, uploadedFiles, resetUploadedFiles]
  );

  const stop = useCallback(async () => {
    abortControllerRef.current?.abort();
    setStatus('ready');
  }, []);

  const handler: ChatHandler = {
    messages,
    status,
    sendMessage,
    stop,
    setMessages,
  };

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
          <div className="flex-1 flex flex-col overflow-hidden">
            {toolCalls.length > 0 && (
              <div className="px-4 py-2 border-b border-stone-200 bg-stone-50">
                <ToolCallDisplay toolCalls={toolCalls} />
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <ChatSection handler={handler} className="h-full">
                <ChatMessages />
                <ChatInput>
                  {/* File preview */}
                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="relative group flex items-center gap-2 bg-stone-100 rounded-lg px-3 py-2 text-sm"
                        >
                          {file.preview ? (
                            <img
                              src={file.preview}
                              alt={file.file.name}
                              className="h-8 w-8 object-cover rounded"
                            />
                          ) : (
                            <FileText className="h-4 w-4 text-stone-500" />
                          )}
                          <span className="max-w-[150px] truncate text-stone-700">
                            {file.file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="ml-1 p-0.5 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <ChatInput.Form>
                    <ChatInput.Upload onUpload={handleFileUpload} />
                    <ChatInput.Field />
                    <ChatInput.Submit />
                  </ChatInput.Form>
                </ChatInput>
              </ChatSection>
            </div>
          </div>
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
