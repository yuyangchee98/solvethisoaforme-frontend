"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { X, ArrowLeft, FolderOpen } from "lucide-react";
import { usePreviewPanel } from "@/lib/previewPanelStore";
import { useIsMobile } from "@/lib/useIsMobile";
import { getDocxDownloadUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import { FileBrowser } from "./FileBrowser";
import { cn } from "@/lib/utils";
import {
  markdownComponents,
  preprocessMarkdown,
} from "@/components/shared/markdown-components";

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : "";
}

function isMarkdownFile(filename: string): boolean {
  const ext = getExtension(filename);
  return ext === ".md" || ext === ".mdx";
}

function handleDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BrowserContent({ sessionId, close }: { sessionId: string; close: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">Workspace Files</span>
        <button
          onClick={close}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <FileBrowser sessionId={sessionId} />
      </div>
    </div>
  );
}

function FilePreviewContent({
  file,
  sessionId,
  close,
  backToBrowser,
}: {
  file: { filePath: string; filename: string; content: string };
  sessionId?: string;
  close: () => void;
  backToBrowser: () => void;
}) {
  const ext = getExtension(file.filename);
  const isMd = isMarkdownFile(file.filename);

  // Compute the file path relative to the session workspace, for URLs.
  const relativeFilePath = sessionId && file.filePath
    ? (() => {
        const parts = file.filePath.split(`/sessions/${sessionId}/`);
        return parts.length > 1 ? parts[parts.length - 1] : file.filePath;
      })()
    : file.filePath;

  async function handleDocxDownload() {
    if (!sessionId || !file.filePath) return;
    const url = getDocxDownloadUrl(sessionId, relativeFilePath);
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = file.filename.replace(/\.mdx?$/, ".docx");
    a.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        {sessionId && (
          <button
            onClick={backToBrowser}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Back to files"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <span className="flex-1 truncate text-sm font-medium">
          {file.filename}
        </span>
        {isMd && sessionId && (
          <button
            onClick={handleDocxDownload}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Download as Word document"
          >
            Download .docx
          </button>
        )}
        <button
          onClick={() => handleDownload(file.filename, file.content)}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Download file"
        >
          Download .md
        </button>
        <button
          onClick={close}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6 text-sm">
        {isMarkdownFile(file.filename) ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, { ...defaultSchema, tagNames: [...(defaultSchema.tagNames || []), "u", "del", "br"] }]]}
            components={markdownComponents}
          >
            {preprocessMarkdown(file.content)}
          </ReactMarkdown>
        ) : (
          <pre className="whitespace-pre-wrap break-all font-mono text-sm">
            {file.content}
          </pre>
        )}
      </div>
    </div>
  );
}

export function PreviewPanel({ sessionId }: { sessionId?: string }) {
  const { isOpen, mode, file, close, backToBrowser } = usePreviewPanel();
  const isMobile = useIsMobile();

  const content = isOpen ? (
    mode === 'browser' && sessionId ? (
      <BrowserContent sessionId={sessionId} close={close} />
    ) : mode === 'preview' && file ? (
      <FilePreviewContent
        file={file}
        sessionId={sessionId}
        close={close}
        backToBrowser={backToBrowser}
      />
    ) : null
  ) : null;

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-full bg-background transform transition-transform duration-300 ease-in-out",
            isOpen && content ? "translate-x-0" : "translate-x-full",
          )}
        >
          {content}
        </div>
        {isOpen && content && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={close}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={cn(
        "h-full border-l border-border bg-background transition-all duration-300 ease-in-out",
        isOpen ? "w-[32rem]" : "w-0 overflow-hidden border-l-0",
      )}
    >
      {content && <div className="w-[32rem] h-full">{content}</div>}
    </div>
  );
}
