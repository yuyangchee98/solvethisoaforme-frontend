"use client";

import { memo, useMemo } from "react";
import {
  CheckCircle2Icon,
  ListTodoIcon,
  LoaderIcon,
} from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
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
}) => {
  const todos = useMemo(() => parseTodos(argsText), [argsText]);
  const isRunning = status?.type === "running";

  const completedCount = useMemo(
    () => todos?.filter((t) => t.status === "completed").length ?? 0,
    [todos],
  );
  const totalCount = todos?.length ?? 0;

  // While streaming args, show a simple loading state
  if (!todos) {
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
        {todos.map((todo, i) => (
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
