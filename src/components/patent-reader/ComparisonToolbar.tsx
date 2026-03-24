import { useState } from "react";
import { ArrowLeftRight, X, Search, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import type { Patent } from "./types";

interface ComparisonToolbarProps {
  leftPatent: Patent | null;
  rightPatent: Patent | null;
  onSwap: () => void;
  onChangeLeft: (patentNumber: string) => void;
  onChangeRight: (patentNumber: string) => void;
  onExit: () => void;
  leftLoading?: boolean;
  rightLoading?: boolean;
}

function PatentSwitcher({
  patent,
  loading,
  onChange,
  align,
}: {
  patent: Patent | null;
  loading?: boolean;
  onChange: (patentNumber: string) => void;
  align: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      setOpen(false);
      setInput("");
      onChange(trimmed);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors max-w-[280px] min-w-0">
          {loading ? (
            <Loader2 className="size-3.5 animate-spin text-stone-400 shrink-0" />
          ) : null}
          <span className="font-mono text-xs text-stone-700 truncate">
            {patent ? patent.patent_number : "Loading..."}
          </span>
          {patent && (
            <span className="text-[11px] text-stone-400 truncate hidden sm:inline">
              — {patent.title}
            </span>
          )}
          <ChevronDown className="size-3 text-stone-400 shrink-0 ml-auto" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72">
        <p className="text-xs text-stone-500 mb-2">Switch to a different patent</p>
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. US11423567B2"
              className="w-full rounded-md border border-stone-200 bg-stone-50 text-xs py-1.5 pl-7 pr-2 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              autoFocus
            />
          </div>
          <Button type="submit" size="sm" disabled={!input.trim()} className="text-xs h-7 px-2.5">
            Go
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function ComparisonToolbar({
  leftPatent,
  rightPatent,
  onSwap,
  onChangeLeft,
  onChangeRight,
  onExit,
  leftLoading,
  rightLoading,
}: ComparisonToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-2">
      <PatentSwitcher
        patent={leftPatent}
        loading={leftLoading}
        onChange={onChangeLeft}
        align="start"
      />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onSwap}
        title="Swap patents"
        disabled={!leftPatent || !rightPatent}
      >
        <ArrowLeftRight className="size-4 text-stone-500" />
      </Button>

      <PatentSwitcher
        patent={rightPatent}
        loading={rightLoading}
        onChange={onChangeRight}
        align="start"
      />

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onExit}
        className="text-xs gap-1.5 text-stone-500 hover:text-stone-700"
      >
        <X className="size-3.5" />
        Exit comparison
      </Button>
    </div>
  );
}
