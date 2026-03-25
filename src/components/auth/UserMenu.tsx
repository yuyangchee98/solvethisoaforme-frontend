import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { getToken, getMe, logout, type AuthUser } from '@/lib/auth';

export function UserMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (!user) {
    return (
      <a
        href="/login"
        className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
      >
        Log In
      </a>
    );
  }

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
        {user.email}
      </a>
      <button
        onClick={logout}
        className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
      >
        Log Out
      </button>
    </div>
  );
}
