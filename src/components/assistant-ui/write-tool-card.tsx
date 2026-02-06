"use client";

import { memo, useMemo } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  LoaderIcon,
  PencilIcon,
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

interface WriteArgs {
  file_path?: string;
  content?: string;
}

function parseArgs(argsText: string | undefined): WriteArgs {
  if (!argsText) return {};
  try {
    return JSON.parse(argsText) as WriteArgs;
  } catch {
    return {};
  }
}

function formatSize(content: string | undefined): string {
  if (!content) return "";
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFilename(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

const WriteToolCardImpl: ToolCallMessagePartComponent = ({
  argsText,
  result,
  status,
}) => {
  const args = useMemo(() => parseArgs(argsText), [argsText]);
  const filename = args.file_path ? getFilename(args.file_path) : "file";
  const size = formatSize(args.content);

  const isRunning = status?.type === "running";
  const isError = status?.type === "incomplete";
  const isCancelled = isError && status.reason === "cancelled";

  const StatusIcon = isRunning
    ? LoaderIcon
    : isError
      ? XCircleIcon
      : CheckIcon;

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
            {isRunning ? "Writing" : "Wrote"} <b>{filename}</b>
            {size && (
              <span className="text-muted-foreground">
                {"  \u00B7  "}{size}
              </span>
            )}
          </span>
          {isRunning && (
            <span
              aria-hidden
              className="aui-tool-fallback-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
            >
              Writing <b>{filename}</b>
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

export const WriteToolCard = memo(
  WriteToolCardImpl,
) as ToolCallMessagePartComponent;

WriteToolCard.displayName = "WriteToolCard";
