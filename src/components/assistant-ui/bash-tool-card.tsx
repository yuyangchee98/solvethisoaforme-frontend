"use client";

import { memo, useMemo } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  LoaderIcon,
  TerminalIcon,
  XCircleIcon,
} from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ToolFallbackRoot,
  ToolFallbackContent,
  ToolFallbackResult,
  ToolFallbackError,
} from "@/components/assistant-ui/tool-fallback";
import { cn } from "@/lib/utils";

interface BashArgs {
  command?: string;
  description?: string;
}

function parseArgs(argsText: string | undefined): BashArgs {
  if (!argsText) return {};
  try {
    return JSON.parse(argsText) as BashArgs;
  } catch {
    return {};
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

const BashToolCardImpl: ToolCallMessagePartComponent = ({
  argsText,
  result,
  status,
}) => {
  const args = useMemo(() => parseArgs(argsText), [argsText]);

  const isRunning = status?.type === "running";
  const isError = status?.type === "incomplete";
  const isCancelled = isError && status.reason === "cancelled";

  const StatusIcon = isRunning
    ? LoaderIcon
    : isError
      ? XCircleIcon
      : CheckIcon;

  const label = args.description
    ? truncate(args.description, 60)
    : args.command
      ? truncate(args.command, 60)
      : "command";

  return (
    <ToolFallbackRoot
      className={cn(isCancelled && "border-muted-foreground/30 bg-muted/30")}
    >
      <CollapsibleTrigger className="aui-tool-fallback-trigger group/trigger flex w-full items-center gap-2 px-4 text-sm transition-colors">
        <StatusIcon
          className={cn(
            "size-4 shrink-0",
            isCancelled && "text-muted-foreground",
            isRunning && "animate-spin",
          )}
        />
        <span
          className={cn(
            "relative inline-block grow text-left leading-none",
            isCancelled && "text-muted-foreground line-through",
          )}
        >
          <span>
            {isRunning ? "Running" : "Ran"}{" "}
            <b>{label}</b>
          </span>
          {isRunning && (
            <span
              aria-hidden
              className="aui-tool-fallback-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
            >
              Running <b>{label}</b>
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0",
            "transition-transform duration-(--animation-duration) ease-out",
            "group-data-[state=closed]/trigger:-rotate-90",
            "group-data-[state=open]/trigger:rotate-0",
          )}
        />
      </CollapsibleTrigger>

      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        {!isCancelled && <ToolFallbackResult result={result} />}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

export const BashToolCard = memo(
  BashToolCardImpl,
) as ToolCallMessagePartComponent;

BashToolCard.displayName = "BashToolCard";
