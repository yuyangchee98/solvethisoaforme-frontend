"use client";

import { memo, useMemo } from "react";
import {
  CheckCircle2Icon,
  ListTodoIcon,
  LoaderIcon,
} from "lucide-react";
import { useMessage, type ToolCallMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

interface TodoItem {
  content: string;
  status: "completed" | "in_progress" | "pending";
  activeForm?: string;
}

function parseTodos(argsText: string | undefined): TodoItem[] | null {
  if (!argsText) return null;
  try {
    const args = JSON.parse(argsText);
    if (Array.isArray(args.todos)) return args.todos;
    return null;
  } catch {
    return null;
  }
}

const TodoWriteToolCardImpl: ToolCallMessagePartComponent = ({
  argsText,
  status,
  toolCallId,
}) => {
  // Only render the LAST TodoWrite in the message — earlier ones are stale
  const isLast = useMessage((state) => {
    if (!("content" in state)) return true;
    const content = state.content as readonly { type: string; toolName?: string; toolCallId?: string }[];
    const todoWrites = content.filter(
      (p) => p.type === "tool-call" && p.toolName === "TodoWrite",
    );
    return todoWrites.length === 0 || todoWrites[todoWrites.length - 1]?.toolCallId === toolCallId;
  });

  const todos = useMemo(() => parseTodos(argsText), [argsText]);

  // When the message turn is done, no further TodoWrite updates will arrive,
  // so treat any lingering "in_progress" items as completed.
  const turnDone = status?.type !== "running";

  const resolvedTodos = useMemo(() => {
    if (!todos) return null;
    if (!turnDone) return todos;
    return todos.map((t) =>
      t.status === "in_progress" ? { ...t, status: "completed" as const } : t,
    );
  }, [todos, turnDone]);

  const completedCount = useMemo(
    () => resolvedTodos?.filter((t) => t.status === "completed").length ?? 0,
    [resolvedTodos],
  );
  const totalCount = resolvedTodos?.length ?? 0;

  // Hide earlier (superseded) TodoWrite cards
  if (!isLast) return null;

  // While streaming args, show a simple loading state
  if (!resolvedTodos) {
    return (
      <div className="my-3 w-full rounded-lg border px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          <span>Updating progress...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 w-full rounded-lg border px-4 py-3 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2">
        <ListTodoIcon className="size-4 text-muted-foreground" />
        <span className="font-medium">Agent Progress</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-1.5">
        {resolvedTodos.map((todo, i) => (
          <div key={i} className="flex items-center gap-2">
            {todo.status === "completed" && (
              <CheckCircle2Icon className="size-4 shrink-0 text-green-600 dark:text-green-500" />
            )}
            {todo.status === "in_progress" && (
              <LoaderIcon className="size-4 shrink-0 animate-spin text-foreground" />
            )}
            {todo.status === "pending" && (
              <div className="size-4 shrink-0 flex items-center justify-center">
                <div className="size-2.5 rounded-full border border-muted-foreground/40" />
              </div>
            )}
            <span
              className={cn(
                "leading-snug",
                todo.status !== "in_progress" && "text-muted-foreground",
              )}
            >
              {todo.status === "in_progress" && todo.activeForm
                ? todo.activeForm
                : todo.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TodoWriteToolCard = memo(
  TodoWriteToolCardImpl,
) as ToolCallMessagePartComponent;

TodoWriteToolCard.displayName = "TodoWriteToolCard";
