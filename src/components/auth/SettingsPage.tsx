import { useState, useEffect } from 'react';
import { getToken, getMe, type AuthUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    getMe()
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 mb-8">Settings</h1>

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm mb-6">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Email</span>
            <span className="text-sm text-stone-900">{user.email}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
