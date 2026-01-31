import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface AppTopBarProps {
  apiStatus: 'checking' | 'online' | 'offline';
  onSettingsClick?: () => void;
}

export function AppTopBar({ apiStatus, onSettingsClick }: AppTopBarProps) {
  return (
    <div className="h-14 border-b bg-white px-6 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold">Claim Analyzer</h1>
        <p className="text-xs text-muted-foreground">
          Antecedent basis checking
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">API:</span>
          {apiStatus === 'checking' && (
            <Badge variant="secondary" className="text-xs">
              Checking...
            </Badge>
          )}
          {apiStatus === 'online' && (
            <Badge className="bg-green-500 hover:bg-green-600 text-xs">
              Online
            </Badge>
          )}
          {apiStatus === 'offline' && (
            <Badge variant="destructive" className="text-xs">
              Offline
            </Badge>
          )}
        </div>

        {onSettingsClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
