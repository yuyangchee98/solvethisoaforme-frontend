import { useState, useEffect, useCallback } from "react";
import { useThreadRuntime } from "@assistant-ui/react";
import { FileText } from "lucide-react";
import { usePreviewPanel } from "@/lib/previewPanelStore";
import { useSessionId } from "./contexts/SessionContext";
import { listWorkspaceFiles, getWorkspaceFileContent } from "@/lib/api";

const DELIVERABLE_FILES = [
  { path: "strategy.md", label: "Strategy" },
  { path: "amended_claims.md", label: "Amended Claims" },
] as const;

export function DeliverablesBar() {
  const sessionId = useSessionId();
  const [available, setAvailable] = useState<Set<string>>(new Set());
  const threadRuntime = useThreadRuntime();

  const checkFiles = useCallback(async () => {
    if (!sessionId) return;
    try {
      const files = await listWorkspaceFiles(sessionId);
      const names = new Set(files.map((f) => f.path));
      const found = new Set<string>();
      for (const d of DELIVERABLE_FILES) {
        if (names.has(d.path)) found.add(d.path);
      }
      setAvailable(found);
    } catch {
      // workspace may not exist yet
    }
  }, [sessionId]);

  useEffect(() => {
    checkFiles();
  }, [checkFiles]);

  useEffect(() => {
    return threadRuntime.unstable_on("runEnd", () => {
      setTimeout(checkFiles, 500);
    });
  }, [threadRuntime, checkFiles]);

  if (!sessionId || available.size === 0) return null;

  const handleClick = async (path: string) => {
    try {
      const content = await getWorkspaceFileContent(sessionId, path);
      usePreviewPanel.getState().openFile({
        filePath: path,
        filename: path,
        content,
      });
    } catch {
      // file may have been deleted
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2.5">
        {DELIVERABLE_FILES.filter((d) => available.has(d.path)).map((d) => (
          <button
            key={d.path}
            onClick={() => handleClick(d.path)}
            className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm hover:shadow-md hover:border-stone-300 active:bg-stone-50 transition-all cursor-pointer"
          >
            <FileText className="size-4 text-stone-400" />
            <span className="text-sm font-medium text-stone-700">
              {d.label}
            </span>
          </button>
        ))}
    </div>
  );
}
