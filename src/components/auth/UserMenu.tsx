import { useState, useEffect } from 'react';
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
      <span className="text-sm text-stone-500">{user.email}</span>
      <button
        onClick={logout}
        className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors"
      >
        Log Out
      </button>
    </div>
  );
}
