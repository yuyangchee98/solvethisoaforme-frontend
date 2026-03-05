"use client";

import { memo, useMemo } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  FolderSearchIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ToolFallbackRoot,
  ToolFallbackContent,
  ToolFallbackResult,
  ToolFallbackError,
  SubagentLabel,
  handleButtonKeyDown,
} from "@/components/assistant-ui/tool-fallback";
import { cn } from "@/lib/utils";

interface GlobArgs {
  pattern?: string;
  path?: string;
}

function parseArgs(argsText: string | undefined): GlobArgs {
  if (!argsText) return {};
  try {
    return JSON.parse(argsText) as GlobArgs;
  } catch {
    return {};
  }
}

function countFiles(result: unknown): number | null {
  if (result === undefined || result === null) return null;
  if (typeof result !== "string") return null;
  const trimmed = result.trim();
  if (!trimmed) return 0;
  return trimmed.split("\n").length;
}

const GlobToolCardImpl: ToolCallMessagePartComponent = ({
  argsText,
  result,
  status,
}) => {
  const args = useMemo(() => parseArgs(argsText), [argsText]);
  const fileCount = useMemo(() => countFiles(result), [result]);

  const isRunning = status?.type === "running";
  const isError = status?.type === "incomplete";
  const isCancelled = isError && status.reason === "cancelled";

  const StatusIcon = isRunning
    ? LoaderIcon
    : isError
      ? XCircleIcon
      : CheckIcon;

  const segments: string[] = [];
  if (args.path) {
    const basename = args.path.split("/").pop() || args.path;
    segments.push(`in ${basename}`);
  }
  if (!isRunning && fileCount !== null) {
    segments.push(`${fileCount} file${fileCount !== 1 ? "s" : ""}`);
  }

  return (
    <ToolFallbackRoot
      className={cn(isCancelled && "border-muted-foreground/30 bg-muted/30")}
    >
      <CollapsibleTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="aui-tool-fallback-trigger group/trigger flex w-full items-center gap-2 px-4 text-sm transition-colors cursor-pointer"
          onKeyDown={handleButtonKeyDown}
        >
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
              {isRunning ? "Finding" : "Found"} files
              {args.pattern && (
                <>
                  {" "}matching <b>{args.pattern}</b>
                </>
              )}
              {segments.length > 0 && (
                <span className="text-muted-foreground">
                  {"  \u00B7  "}
                  {segments.join("  \u00B7  ")}
                </span>
              )}
              <SubagentLabel />
            </span>
            {isRunning && (
              <span
                aria-hidden
                className="aui-tool-fallback-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
              >
                Finding files
                {args.pattern && (
                  <>
                    {" "}matching <b>{args.pattern}</b>
                  </>
                )}
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
        </div>
      </CollapsibleTrigger>

      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        {!isCancelled && <ToolFallbackResult result={result} />}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

export const GlobToolCard = memo(
  GlobToolCardImpl,
) as ToolCallMessagePartComponent;

GlobToolCard.displayName = "GlobToolCard";
