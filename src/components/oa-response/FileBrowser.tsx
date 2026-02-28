"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Loader2,
  FolderOpen,
} from "lucide-react";
import {
  listWorkspaceFiles,
  getWorkspaceFileContent,
  type WorkspaceFile,
} from "@/lib/api";
import { usePreviewPanel } from "@/lib/previewPanelStore";
import { cn } from "@/lib/utils";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DirectoryEntry({
  file,
  sessionId,
  depth,
}: {
  file: WorkspaceFile;
  sessionId: string;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<WorkspaceFile[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (children === null) {
      setLoading(true);
      try {
        const files = await listWorkspaceFiles(sessionId, file.path);
        setChildren(files);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    }
  };

  const Icon = expanded ? FolderOpen : Folder;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <Chevron className="size-3.5 shrink-0 text-muted-foreground" />
        <Icon className="size-4 shrink-0 text-amber-500" />
        <span className="truncate">{file.name}</span>
      </button>
      {expanded && (
        <div>
          {loading && (
            <div
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              <Loader2 className="size-3.5 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
          {children?.length === 0 && !loading && (
            <div
              className="px-2 py-1.5 text-sm text-muted-foreground italic"
              style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
            >
              Empty
            </div>
          )}
          {children?.map((child) => (
            <FileEntry
              key={child.path}
              file={child}
              sessionId={sessionId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileEntry({
  file,
  sessionId,
  depth,
}: {
  file: WorkspaceFile;
  sessionId: string;
  depth: number;
}) {
  const [loading, setLoading] = useState(false);

  if (file.is_directory) {
    return (
      <DirectoryEntry file={file} sessionId={sessionId} depth={depth} />
    );
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      const content = await getWorkspaceFileContent(sessionId, file.path);
      usePreviewPanel.getState().openFile({
        filePath: file.path,
        filename: file.name,
        content,
      });
    } catch {
      // Silently fail - could show a toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
      style={{ paddingLeft: `${depth * 16 + 8 + 14}px` }}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <FileText className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="truncate flex-1 text-left">{file.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatSize(file.size)}
      </span>
    </button>
  );
}

export function FileBrowser({ sessionId }: { sessionId: string }) {
  const [files, setFiles] = useState<WorkspaceFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listWorkspaceFiles(sessionId)
      .then((f) => {
        if (!cancelled) setFiles(f);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-6 animate-spin mb-2" />
        <span className="text-sm">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        Failed to load files.
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Folder className="size-8 mb-2 opacity-40" />
        <span className="text-sm">No files in workspace</span>
      </div>
    );
  }

  return (
    <div className="p-2">
      {files.map((file) => (
        <FileEntry key={file.path} file={file} sessionId={sessionId} depth={0} />
      ))}
    </div>
  );
}
