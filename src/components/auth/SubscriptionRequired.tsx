import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createCheckoutSession } from '@/lib/auth';

export function SubscriptionRequired() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(plan: string) {
    setLoading(plan);
    try {
      const url = await createCheckoutSession(plan);
      window.location.href = url;
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-stone-900 mb-2">
          Subscription required
        </h2>
        <p className="text-stone-500 mb-6">
          Choose a plan to start analyzing Office Actions.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => handleCheckout('day_pass')}
            disabled={loading !== null}
          >
            {loading === 'day_pass' ? 'Redirecting...' : 'Day Pass — $49/day'}
          </Button>
          <Button
            onClick={() => handleCheckout('individual')}
            disabled={loading !== null}
          >
            {loading === 'individual' ? 'Redirecting...' : 'Individual — $189/mo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
