import { Loader2 } from 'lucide-react';

interface StatusBarProps {
  claimCount: number;
  errorCount: number;
  isAnalyzing: boolean;
}

export function StatusBar({ claimCount, errorCount, isAnalyzing }: StatusBarProps) {
  return (
    <div className="h-8 border-t bg-muted/30 px-4 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          {claimCount} {claimCount === 1 ? 'claim' : 'claims'}
        </span>
        <span className={errorCount > 0 ? 'text-red-600 font-medium' : ''}>
          {errorCount} {errorCount === 1 ? 'error' : 'errors'}
        </span>
      </div>

      {isAnalyzing && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Analyzing...</span>
        </div>
      )}
    </div>
  );
}
