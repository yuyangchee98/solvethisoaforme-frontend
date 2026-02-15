import { useState, useEffect } from 'react';
import { getToken, getMe, createPortalSession, type AuthUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

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

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const url = await createPortalSession();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) return null;

  const planLabel = user.plan_type === 'day_pass' ? 'Day Pass' : user.plan_type === 'individual' ? 'Individual' : 'None';
  const statusLabel = user.subscription_status === 'active' ? 'Active' : user.subscription_status === 'trialing' ? 'Trial' : user.subscription_status === 'canceled' ? 'Canceled' : 'Inactive';

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

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
        <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-4">Subscription</h2>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Plan</span>
            <span className="text-sm text-stone-900">{planLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-stone-500">Status</span>
            <span className={`text-sm font-medium ${statusLabel === 'Active' || statusLabel === 'Trial' ? 'text-green-600' : 'text-stone-500'}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        {user.subscription_status === 'active' || user.subscription_status === 'trialing' ? (
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="w-full"
          >
            {portalLoading ? 'Redirecting...' : 'Manage Billing'}
          </Button>
        ) : (
          <Button
            onClick={() => { window.location.href = '/subscribe'; }}
            className="w-full"
          >
            Choose a Plan
          </Button>
        )}
      </div>
    </div>
  );
}
