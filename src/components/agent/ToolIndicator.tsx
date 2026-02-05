import {
  FileText,
  Search,
  Terminal,
  FolderOpen,
  Edit3,
  ListTree,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolIndicatorProps {
  toolName: string;
  status: 'running' | 'complete';
  className?: string;
}

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Read: FileText,
  Grep: Search,
  Bash: Terminal,
  Glob: FolderOpen,
  Write: Edit3,
  Edit: Edit3,
  Task: ListTree,
};

const TOOL_LABELS: Record<string, string> = {
  Read: 'Reading file',
  Grep: 'Searching',
  Bash: 'Running command',
  Glob: 'Finding files',
  Write: 'Writing file',
  Edit: 'Editing file',
  Task: 'Running task',
};

export function ToolIndicator({ toolName, status, className }: ToolIndicatorProps) {
  const Icon = TOOL_ICONS[toolName] || Terminal;
  const label = TOOL_LABELS[toolName] || toolName;
  const isRunning = status === 'running';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium',
        isRunning
          ? 'bg-amber-50 text-amber-700 border border-amber-200'
          : 'bg-green-50 text-green-700 border border-green-200',
        className
      )}
    >
      {isRunning ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3 w-3" />
      )}
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}

interface ToolCallDisplayProps {
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    status: 'running' | 'complete';
  }>;
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 my-2">
      {toolCalls.map((call) => (
        <ToolIndicator
          key={call.toolCallId}
          toolName={call.toolName}
          status={call.status}
        />
      ))}
    </div>
  );
}
