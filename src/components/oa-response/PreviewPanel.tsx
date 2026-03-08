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

function preprocessMarkdown(md: string): string {
  return md
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/([^\n])\n(&emsp;)/g, "$1<br>\n$2");
}

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

const markdownComponents = {
  h1: ({ className, ...props }: React.ComponentProps<"h1">) => (
    <h1
      className={cn(
        "mb-2 scroll-m-20 font-semibold text-base first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }: React.ComponentProps<"h2">) => (
    <h2
      className={cn(
        "mt-3 mb-1.5 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: React.ComponentProps<"h3">) => (
    <h3
      className={cn(
        "mt-2.5 mb-1 scroll-m-20 font-semibold text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }: React.ComponentProps<"h4">) => (
    <h4
      className={cn(
        "mt-2 mb-1 scroll-m-20 font-medium text-sm first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.ComponentProps<"p">) => (
    <p
      className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({ className, ...props }: React.ComponentProps<"a">) => (
    <a
      className={cn(
        "text-primary underline underline-offset-2 hover:text-primary/80",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }: React.ComponentProps<"blockquote">) => (
    <blockquote
      className={cn(
        "my-2.5 border-muted-foreground/30 border-l-2 pl-3 text-muted-foreground italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.ComponentProps<"ul">) => (
    <ul
      className={cn(
        "my-2 ml-4 list-disc marker:text-muted-foreground [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: React.ComponentProps<"ol">) => (
    <ol
      className={cn(
        "my-2 ml-4 list-decimal marker:text-muted-foreground [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: React.ComponentProps<"hr">) => (
    <hr
      className={cn("my-2 border-muted-foreground/20", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: React.ComponentProps<"table">) => (
    <table
      className={cn(
        "my-2 w-full border-separate border-spacing-0 overflow-y-auto",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }: React.ComponentProps<"th">) => (
    <th
      className={cn(
        "bg-muted px-2 py-1 text-left font-medium first:rounded-tl-lg last:rounded-tr-lg",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }: React.ComponentProps<"td">) => (
    <td
      className={cn(
        "border-muted-foreground/20 border-b border-l px-2 py-1 text-left last:border-r",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }: React.ComponentProps<"tr">) => (
    <tr
      className={cn(
        "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }: React.ComponentProps<"li">) => (
    <li className={cn("leading-normal", className)} {...props} />
  ),
  pre: ({ className, ...props }: React.ComponentProps<"pre">) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-lg border border-border/50 bg-muted/30 p-3 text-xs leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: React.ComponentProps<"code">) => {
    const isBlock = className?.includes("language-");
    return (
      <code
        className={cn(
          !isBlock &&
            "rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
};

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

  async function handleDocxDownload() {
    if (!sessionId || !file.filePath) return;
    const pathParts = file.filePath.split(`/sessions/${sessionId}/`);
    const relativePath = pathParts.length > 1 ? pathParts[pathParts.length - 1] : file.filePath;
    const url = getDocxDownloadUrl(sessionId, relativePath);
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
