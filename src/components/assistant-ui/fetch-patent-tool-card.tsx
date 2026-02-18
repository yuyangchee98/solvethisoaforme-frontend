"use client";

import { memo, useMemo } from "react";
import {
  BookOpenIcon,
  CheckIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { cn } from "@/lib/utils";

const FetchPatentToolCardImpl: ToolCallMessagePartComponent = ({
  argsText,
  result,
  status,
}) => {
  const pubNumber = useMemo(() => {
    if (!argsText) return "";
    try {
      const args = JSON.parse(argsText);
      return args.publication_number || "";
    } catch {
      return "";
    }
  }, [argsText]);

  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";
  const isError = status?.type === "incomplete";

  const parsed = useMemo(() => {
    if (!result) return null;
    const text = typeof result === "string" ? result : JSON.stringify(result);

    // Check for error
    if (text.startsWith("Error:")) {
      return { error: text };
    }

    // Parse success result lines
    const titleMatch = text.match(/Fetched:\s*(.+)/);
    const claimsMatch = text.match(/Claims:\s*(\d+)/);
    const pathMatch = text.match(/Saved to:\s*(.+)/);

    return {
      title: titleMatch?.[1]?.trim() || "",
      claimCount: claimsMatch?.[1] || "0",
      filePath: pathMatch?.[1]?.trim() || "",
    };
  }, [result]);

  const hasError = isError || parsed?.error;

  const statusText = isRunning
    ? `Fetching ${pubNumber}...`
    : hasError
      ? parsed?.error || "Failed to fetch"
      : parsed?.title
        ? `Full patent · ${parsed.claimCount} claims`
        : "Fetched";

  const titleText = isRunning
    ? pubNumber
    : parsed && "title" in parsed && parsed.title
      ? parsed.title
      : pubNumber || "Patent";

  const StatusIcon = isRunning
    ? LoaderIcon
    : hasError
      ? XCircleIcon
      : CheckIcon;

  return (
    <div
      className={cn(
        "aui-fetch-patent-tool-card group my-3 flex w-fit items-center gap-3 rounded-lg border px-3 py-2 text-sm",
        hasError && "border-destructive/50 bg-destructive/5",
      )}
    >
      <BookOpenIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium leading-none">{titleText}</span>
        <span className="text-muted-foreground text-xs leading-none">
          {statusText}
        </span>
      </div>
      <StatusIcon
        className={cn(
          "ml-1 size-4 shrink-0",
          isRunning && "animate-spin text-muted-foreground",
          isComplete && !hasError && "text-green-600 dark:text-green-500",
          hasError && "text-destructive",
        )}
      />
    </div>
  );
};

export const FetchPatentToolCard = memo(
  FetchPatentToolCardImpl,
) as ToolCallMessagePartComponent;

FetchPatentToolCard.displayName = "FetchPatentToolCard";
