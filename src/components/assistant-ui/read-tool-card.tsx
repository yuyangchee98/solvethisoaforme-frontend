"use client";

import { memo, useMemo } from "react";
import {
  FileTextIcon,
  CheckIcon,
  LoaderIcon,
  XCircleIcon,
  FileIcon,
} from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCachedUrl } from "@/lib/fileCache";
import { getFileUrl } from "@/lib/api";
import { useSessionId } from "@/components/agent/contexts/SessionContext";
import { PDFViewer } from "./pdf-viewer";

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

const ReadToolCardImpl: ToolCallMessagePartComponent = ({
  argsText,
  result,
  status,
}) => {
  const sessionId = useSessionId();

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
  const isPDF = extension === "pdf";

  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";
  const isError = status?.type === "incomplete";

  const resultText = useMemo(() => {
    if (!result) return "";
    if (typeof result === "string") return result;
    return JSON.stringify(result, null, 2);
  }, [result]);

  // For PDFs, try cache first, then fall back to server URL
  const pdfSrc = useMemo(() => {
    if (!isPDF || !filePath) return null;

    // Normalize path for cache lookup (remove leading slash)
    const normalizedPath = filePath.startsWith("/")
      ? filePath.slice(1)
      : filePath;

    // Try cache first (for user-uploaded files)
    const cachedUrl = getCachedUrl(normalizedPath);
    if (cachedUrl) return cachedUrl;

    // Fall back to server URL
    if (sessionId) {
      return getFileUrl(sessionId, filePath);
    }

    return null;
  }, [isPDF, filePath, sessionId]);

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

  const FileDisplayIcon = isPDF ? FileIcon : FileTextIcon;

  const card = (
    <div
      className={cn(
        "aui-read-tool-card group my-3 flex w-fit items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
        !isRunning && "cursor-pointer hover:bg-accent/50",
        isError && "border-destructive/50 bg-destructive/5"
      )}
    >
      <FileDisplayIcon className="size-5 shrink-0 text-muted-foreground" />
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

  // Don't make clickable while running
  if (isRunning) {
    return card;
  }

  // For PDFs, we need pdfSrc; for text files, we need resultText
  const canShowContent = isPDF ? !!pdfSrc : !!resultText;
  if (!canShowContent) {
    return card;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{card}</DialogTrigger>
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileDisplayIcon className="size-5" />
            {filename}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto rounded-md border bg-muted/30 p-4">
          {isPDF && pdfSrc ? (
            <PDFViewer src={pdfSrc} />
          ) : (
            <pre
              className={cn(
                "whitespace-pre-wrap break-all font-mono text-sm",
                extension && `language-${extension}`
              )}
            >
              {resultText}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ReadToolCard = memo(
  ReadToolCardImpl
) as ToolCallMessagePartComponent;

ReadToolCard.displayName = "ReadToolCard";
