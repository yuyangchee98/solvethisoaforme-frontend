import { useState } from "react";
import { ArrowLeftRight, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { Patent } from "./types";
import type { PatentRegistryEntry } from "./usePatentRegistry";

interface CompareButtonProps {
  currentPatent: Patent | null;
  otherTabs: Map<string, PatentRegistryEntry>;
  isMobile: boolean;
  onCompare: (patentNumber: string) => void;
}

function CompareSearchForm({
  onSubmit,
}: {
  onSubmit: (patentNumber: string) => void;
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. US11423567B2"
          className="w-full rounded-md border border-stone-200 bg-stone-50 text-xs py-1.5 pl-7 pr-2 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
        />
      </div>
      <Button type="submit" size="sm" disabled={!input.trim()} className="text-xs h-7 px-2.5">
        Go
      </Button>
    </form>
  );
}

export function CompareButton({
  currentPatent,
  otherTabs,
  isMobile,
  onCompare,
}: CompareButtonProps) {
  const [open, setOpen] = useState(false);

  if (!currentPatent) return null;

  // Mobile: greyed out with tooltip
  if (isMobile) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 opacity-40 cursor-not-allowed"
              onClick={(e) => e.preventDefault()}
            >
              <ArrowLeftRight className="size-3.5" />
              Compare
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Patent comparison is available on desktop only.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const otherEntries = Array.from(otherTabs.values());

  const handleSelect = (patentNumber: string) => {
    setOpen(false);
    onCompare(patentNumber);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <ArrowLeftRight className="size-3.5" />
          Compare
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {otherEntries.length > 0 ? (
          <>
            <p className="text-sm font-medium text-stone-800 mb-2">
              Compare with...
            </p>
            <div className="space-y-0.5 mb-3">
              {otherEntries.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(entry.patentNumber)}
                  className="flex items-start gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-stone-100 transition-colors group"
                >
                  <FileText className="size-3.5 text-stone-400 group-hover:text-amber-600 mt-0.5 shrink-0 transition-colors" />
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-stone-600 group-hover:text-stone-800 transition-colors">
                      {entry.patentNumber}
                    </p>
                    <p className="text-[11px] text-stone-400 truncate">
                      {entry.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-stone-100 pt-3">
              <p className="text-[11px] text-stone-400 mb-1.5">
                Or enter a patent number
              </p>
              <CompareSearchForm onSubmit={handleSelect} />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-stone-800 mb-1">
              Compare patents side by side
            </p>
            <p className="text-xs text-stone-500 leading-relaxed mb-3">
              Open this page in another browser tab with a different patent, then
              click Compare to pick it from the list.
            </p>
            <div className="border-t border-stone-100 pt-3">
              <p className="text-[11px] text-stone-400 mb-1.5">
                Or enter a patent number directly
              </p>
              <CompareSearchForm onSubmit={handleSelect} />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
