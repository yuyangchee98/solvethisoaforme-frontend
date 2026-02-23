"use client";

import { memo, useEffect, useMemo } from "react";
import {
  CheckIcon,
  FileTextIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { usePreviewPanel } from "@/lib/previewPanelStore";
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
  status,
}) => {
  const args = useMemo(() => parseArgs(argsText), [argsText]);
  const filename = args.file_path ? getFilename(args.file_path) : "file";
  const size = formatSize(args.content);

  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";
  const isError = status?.type === "incomplete";

  const StatusIcon = isRunning
    ? LoaderIcon
    : isError
      ? XCircleIcon
      : CheckIcon;

  // Auto-open strategy.md in the preview panel when writing completes
  useEffect(() => {
    if (isComplete && filename === "strategy.md" && args.content) {
      usePreviewPanel.getState().openFile({
        filePath: args.file_path || filename,
        filename,
        content: args.content,
      });
    }
  }, [isComplete, filename, args.file_path, args.content]);

  const canOpen = isComplete && !!args.content;

  const handleClick = () => {
    if (!canOpen) return;
    usePreviewPanel.getState().openFile({
      filePath: args.file_path || filename,
      filename,
      content: args.content!,
    });
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "my-3 flex w-fit items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
        canOpen && "cursor-pointer hover:bg-accent/50",
        isError && "border-destructive/50 bg-destructive/5",
      )}
    >
      <StatusIcon
        className={cn(
          "size-4 shrink-0",
          isRunning && "animate-spin text-muted-foreground",
          isComplete && "text-green-600 dark:text-green-500",
          isError && "text-destructive",
        )}
      />
      <span className="font-medium leading-none">
        {filename}
      </span>
      {size && (
        <span className="text-muted-foreground text-xs">
          {"\u00B7  "}{size}
        </span>
      )}
      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
    </div>
  );
};

export const WriteToolCard = memo(
  WriteToolCardImpl,
) as ToolCallMessagePartComponent;

WriteToolCard.displayName = "WriteToolCard";
