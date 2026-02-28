import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OAResponseSession } from '@/lib/api';

interface SessionSidebarProps {
  sessions: OAResponseSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  isLoading,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
    <aside className="w-64 bg-stone-100 border-r border-stone-200 flex flex-col h-full">
      <div className="p-3 border-b border-stone-200">
        <Button
          onClick={onCreateSession}
          disabled={isLoading}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-sm text-stone-500 text-center">
            No sessions yet
          </div>
        ) : (
          <ul className="py-2">
            {sessions.map((session) => (
              <li key={session.id} className="group relative">
                <button
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-stone-200 transition-colors',
                    currentSessionId === session.id && 'bg-stone-200'
                  )}
                >
                  <MessageSquare className="h-4 w-4 text-stone-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-700 truncate">
                      {formatDate(session.created_at)}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-300 rounded transition-opacity"
                  title="Delete session"
                >
                  <Trash2 className="h-4 w-4 text-stone-500 hover:text-red-500" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
