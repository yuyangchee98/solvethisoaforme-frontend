import { useState } from "react";
import {
  Image,
  Info,
  Tag,
  Scale,
  FileDown,
  List,
  FileText,
  ChevronRight,
  ChevronDown,
  PanelRightClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Patent, PatentClaim } from "./types";

interface RightSidebarProps {
  patent: Patent;
  collapsed: boolean;
  onToggle: () => void;
  onScrollTo: (id: string) => void;
}

// ── Outline tab internals ────────────────────────────────────────────────

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

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Tab content components ───────────────────────────────────────────────

function FiguresTab({ patent }: { patent: Patent }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (patent.figure_urls.length === 0) {
    return (
      <p className="text-xs text-stone-400 italic p-3">
        No figures available for this patent.
      </p>
    );
  }

  return (
    <div className="p-2 space-y-2 overflow-y-auto">
      {selected !== null && (
        <button
          onClick={() => setSelected(null)}
          className="w-full bg-white border border-stone-200 rounded-lg overflow-hidden"
        >
          <img
            src={patent.figure_urls[selected]}
            alt={`Figure ${selected}`}
            className="w-full h-auto"
          />
        </button>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {patent.figure_urls.map((url, i) => (
          <button
            key={url}
            onClick={() => setSelected(selected === i ? null : i)}
            className={cn(
              "rounded-md border overflow-hidden bg-white transition-all hover:border-amber-400",
              selected === i
                ? "border-amber-500 ring-1 ring-amber-500/30"
                : "border-stone-200"
            )}
          >
            <img
              src={url}
              alt={`Figure ${i}`}
              className="w-full h-auto"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailsTab({ patent }: { patent: Patent }) {
  return (
    <div className="p-3 space-y-5 overflow-y-auto">
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
            <span className="font-medium">{patent.claims.length}</span> total claims
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
    </div>
  );
}

function OutlineTab({
  patent,
  onScrollTo,
}: {
  patent: Patent;
  onScrollTo: (id: string) => void;
}) {
  const independentClaims = patent.claims.filter((c) => c.type === "independent");
  const getDependents = (parentNum: number) =>
    patent.claims.filter((c) => c.depends_on === parentNum);

  return (
    <div className="p-2 space-y-4 overflow-y-auto">
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
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function RightSidebar({
  patent,
  collapsed,
  onToggle,
  onScrollTo,
}: RightSidebarProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-2 border-l border-stone-200 bg-white w-10">
        <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Expand sidebar">
          <List className="size-4 text-stone-500" />
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="figures" className="flex flex-col border-l border-stone-200 bg-white w-80 shrink-0">
      {/* Tab bar + collapse */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-stone-100">
        <TabsList className="h-7">
          <TabsTrigger value="figures" className="text-xs px-2 py-0.5 h-5 gap-1">
            <Image className="size-3" />
            Figures
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs px-2 py-0.5 h-5 gap-1">
            <Info className="size-3" />
            Details
          </TabsTrigger>
          <TabsTrigger value="outline" className="text-xs px-2 py-0.5 h-5 gap-1">
            <List className="size-3" />
            Outline
          </TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon-xs" onClick={onToggle} title="Collapse sidebar">
          <PanelRightClose className="size-3.5 text-stone-400" />
        </Button>
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <TabsContent value="figures" className="mt-0">
          <FiguresTab patent={patent} />
        </TabsContent>
        <TabsContent value="details" className="mt-0">
          <DetailsTab patent={patent} />
        </TabsContent>
        <TabsContent value="outline" className="mt-0">
          <OutlineTab patent={patent} onScrollTo={onScrollTo} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
