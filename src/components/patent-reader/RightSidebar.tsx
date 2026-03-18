import { Info, Tag, Scale, PanelRightClose, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Patent } from "./types";

interface RightSidebarProps {
  patent: Patent;
  collapsed: boolean;
  onToggle: () => void;
}

export function RightSidebar({
  patent,
  collapsed,
  onToggle,
}: RightSidebarProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-2 border-l border-stone-200 bg-white w-10">
        <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Expand sidebar">
          <Info className="size-4 text-stone-500" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-l border-stone-200 bg-white w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Details
        </span>
        <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Collapse sidebar">
          <PanelRightClose className="size-3.5 text-stone-400" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Classifications */}
        {patent.classifications.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
              <Tag className="size-3" />
              Classification
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patent.classifications.map((code) => (
                <Badge key={code} variant="secondary" className="font-mono text-xs">
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Claim summary */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <Scale className="size-3" />
            Claim Summary
          </div>
          <div className="text-sm text-stone-600 space-y-1">
            <p>
              <span className="font-medium">{patent.claims.length}</span> total
              claims
            </p>
            <p>
              <span className="font-medium">
                {patent.claims.filter((c) => c.type === "independent").length}
              </span>{" "}
              independent
            </p>
            <p>
              <span className="font-medium">
                {patent.claims.filter((c) => c.type === "dependent").length}
              </span>{" "}
              dependent
            </p>
          </div>
        </div>

        {/* PDF link */}
        {patent.pdf_url && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
              <FileDown className="size-3" />
              Document
            </div>
            <a
              href={patent.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              Download PDF
            </a>
          </div>
        )}

        {/* Annotations placeholder */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            <Info className="size-3" />
            Annotations
          </div>
          <p className="text-xs text-stone-400 italic">
            No annotations yet. Select text in the document to add one.
          </p>
        </div>
      </div>
    </div>
  );
}
