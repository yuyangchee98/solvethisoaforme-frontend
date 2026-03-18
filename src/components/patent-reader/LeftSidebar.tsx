import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  List,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Patent, PatentClaim } from "./types";

interface LeftSidebarProps {
  patent: Patent;
  collapsed: boolean;
  onToggle: () => void;
  onScrollTo: (id: string) => void;
}

function ClaimNode({
  claim,
  children,
  onScrollTo,
}: {
  claim: PatentClaim;
  children: PatentClaim[];
  onScrollTo: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onScrollTo(`claim-${claim.number}`);
        }}
        className={cn(
          "flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md text-sm hover:bg-stone-100 transition-colors",
          claim.type === "independent"
            ? "font-medium text-stone-800"
            : "text-stone-600 pl-6"
        )}
      >
        {hasChildren &&
          (expanded ? (
            <ChevronDown className="size-3.5 shrink-0 text-stone-400" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-stone-400" />
          ))}
        {!hasChildren && <span className="w-3.5 shrink-0" />}
        <span className="truncate">
          Claim {claim.number}
          {claim.type === "independent" && (
            <span className="text-xs text-stone-400 ml-1">(ind.)</span>
          )}
        </span>
      </button>
      {expanded && hasChildren && (
        <div className="ml-2 border-l border-stone-200">
          {children.map((child) => (
            <ClaimNode
              key={child.number}
              claim={child}
              children={[]}
              onScrollTo={onScrollTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LeftSidebar({
  patent,
  collapsed,
  onToggle,
  onScrollTo,
}: LeftSidebarProps) {
  // Build claim tree: group dependents under their parent
  const independentClaims = patent.claims.filter(
    (c) => c.type === "independent"
  );
  const getDependents = (parentNum: number) =>
    patent.claims.filter((c) => c.depends_on === parentNum);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-2 border-r border-stone-200 bg-white w-10">
        <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Expand sidebar">
          <List className="size-4 text-stone-500" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r border-stone-200 bg-white w-64 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-100">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Outline
        </span>
        <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Collapse sidebar">
          <PanelLeftClose className="size-3.5 text-stone-400" />
        </Button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Document sections */}
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-2 mb-1">
            Sections
          </p>
          <button
            onClick={() => onScrollTo("abstract")}
            className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md text-sm text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <FileText className="size-3.5 shrink-0 text-stone-400" />
            Abstract
          </button>
          {patent.description.map((section) => (
            <button
              key={section.heading}
              onClick={() =>
                onScrollTo(
                  `section-${section.heading.toLowerCase().replace(/\s+/g, "-")}`
                )
              }
              className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md text-sm text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <FileText className="size-3.5 shrink-0 text-stone-400" />
              <span className="truncate">{titleCase(section.heading)}</span>
            </button>
          ))}
        </div>

        {/* Claims tree */}
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 px-2 mb-1">
            Claims
          </p>
          {independentClaims.map((claim) => (
            <ClaimNode
              key={claim.number}
              claim={claim}
              children={getDependents(claim.number)}
              onScrollTo={onScrollTo}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
