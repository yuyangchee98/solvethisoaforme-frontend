"use client";

import { memo, useMemo } from "react";
import { FileTextIcon, CheckIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFilename(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

function getFileExtension(filePath: string): string {
  const filename = getFilename(filePath);
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
}

const ReadToolCardImpl: ToolCallMessagePartComponent = (props) => {
  const { toolName, argsText, result, status, ...rest } = props;

  // Log all props including any we might be missing
  console.log("[ReadToolCard] ALL PROPS KEYS:", Object.keys(props));
  console.log("[ReadToolCard] REST PROPS:", rest);
  // Debug logging - log ALL props
  console.log("[ReadToolCard] Render - ALL PROPS:", {
    toolName,
    argsText,
    result,
    resultType: typeof result,
    resultLength: typeof result === "string" ? result.length : null,
    status: JSON.parse(JSON.stringify(status || {})),
  });

  const filePath = useMemo(() => {
    if (!argsText) return "";
    try {
      const args = JSON.parse(argsText);
      return args.file_path || "";
    } catch {
      return "";
    }
  }, [argsText]);

  const filename = getFilename(filePath);
  const extension = getFileExtension(filePath);

  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";
  const isError = status?.type === "incomplete";

  const resultText = useMemo(() => {
    console.log("[ReadToolCard] Processing result:", {
      result,
      typeofResult: typeof result,
      isNull: result === null,
      isUndefined: result === undefined,
    });
    if (!result) return "";
    if (typeof result === "string") return result;
    return JSON.stringify(result, null, 2);
  }, [result]);

  const fileSize = resultText ? formatFileSize(new Blob([resultText]).size) : "";

  const statusText = isRunning
    ? "Reading..."
    : isError
      ? "Failed to read"
      : fileSize
        ? `${fileSize} read`
        : "Read";

  const StatusIcon = isRunning
    ? LoaderIcon
    : isError
      ? XCircleIcon
      : CheckIcon;

  const card = (
    <div
      className={cn(
        "aui-read-tool-card group flex w-fit items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
        !isRunning && "cursor-pointer hover:bg-accent/50",
        isError && "border-destructive/50 bg-destructive/5"
      )}
    >
      <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium leading-none">{filename || "File"}</span>
        <span className="text-muted-foreground text-xs leading-none">
          {statusText}
        </span>
      </div>
      <StatusIcon
        className={cn(
          "ml-1 size-4 shrink-0",
          isRunning && "animate-spin text-muted-foreground",
          isComplete && "text-green-600 dark:text-green-500",
          isError && "text-destructive"
        )}
      />
    </div>
  );

  // Don't make clickable while running or if there's no result
  console.log("[ReadToolCard] Click check:", {
    isRunning,
    hasResultText: !!resultText,
    resultTextLength: resultText.length,
    willBeClickable: !isRunning && !!resultText,
  });

  if (isRunning || !resultText) {
    console.log("[ReadToolCard] Returning non-clickable card");
    return card;
  }

  console.log("[ReadToolCard] Returning clickable dialog");
  return (
    <Dialog onOpenChange={(open) => console.log("[ReadToolCard] Dialog open change:", open)}>
      <DialogTrigger asChild onClick={() => console.log("[ReadToolCard] Trigger clicked")}>{card}</DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            {filename}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto rounded-md border bg-muted/30 p-4">
          <pre
            className={cn(
              "whitespace-pre-wrap break-all font-mono text-sm",
              extension && `language-${extension}`
            )}
          >
            {resultText}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ReadToolCard = memo(
  ReadToolCardImpl
) as ToolCallMessagePartComponent;

ReadToolCard.displayName = "ReadToolCard";
