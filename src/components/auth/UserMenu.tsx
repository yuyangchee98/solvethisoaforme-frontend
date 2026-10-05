import { Settings } from 'lucide-react';

// Identity is an invisible guest account (see lib/auth.ts), so there's nothing
// to log in or out of — the menu is just the door to Settings.
export function UserMenu() {
  return (
    <div className="flex items-center gap-3">
      <a
        href="/settings"
        className="md:hidden rounded-md p-1.5 text-stone-600 hover:bg-stone-100 transition-colors"
        aria-label="Settings"
      >
        <Settings className="h-5 w-5" />
      </a>
      <a
        href="/settings"
        className="hidden md:inline text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
      >
        Settings
      </a>
    </div>
  );
}
