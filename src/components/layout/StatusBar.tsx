interface StatusBarProps {
  claimCount: number;
  errorCount: number;
  isAnalyzing: boolean;
  apiStatus: 'checking' | 'online' | 'offline';
}

export function StatusBar({
  claimCount,
  errorCount,
  isAnalyzing,
  apiStatus,
}: StatusBarProps) {
  return (
    <div className="h-12 bg-white/60 backdrop-blur-sm border-t border-stone-200/50 px-12 flex items-center justify-between text-xs text-stone-500">
      <div className="flex items-center gap-6">
        <span className="font-medium">{claimCount} claim{claimCount !== 1 ? 's' : ''}</span>

        {errorCount > 0 && (
          <span className="text-amber-700 font-medium">
            {errorCount} error{errorCount > 1 ? 's' : ''}
          </span>
        )}

        {isAnalyzing && (
          <span className="flex items-center gap-2 text-amber-600">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Analyzing...
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${
          apiStatus === 'online' ? 'bg-emerald-500' :
          apiStatus === 'offline' ? 'bg-red-400' : 'bg-amber-400'
        }`} />
        <span className="text-xs">
          {apiStatus === 'online' ? 'API Connected' :
           apiStatus === 'offline' ? 'API Offline' : 'Checking...'}
        </span>
      </div>
    </div>
  );
}
