import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { login, register, getMe, getToken, createCheckoutSession } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const plan = params.get('plan');

  // If already logged in, skip the form
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    getMe()
      .then(async (user) => {
        if (user.subscription_status === 'active' || user.subscription_status === 'trialing') {
          window.location.href = '/oa-response';
        } else if (plan) {
          const url = await createCheckoutSession(plan);
          window.location.href = url;
        } else {
          window.location.href = '/subscribe';
        }
      })
      .catch(() => {
        // Token invalid/expired, show the form
        setChecking(false);
      });
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const user = await getMe();
      if (user.subscription_status === 'active' || user.subscription_status === 'trialing') {
        window.location.href = '/oa-response';
      } else if (plan) {
        const url = await createCheckoutSession(plan);
        window.location.href = url;
      } else {
        window.location.href = '/subscribe';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password);
      await login(email, password);
      if (plan) {
        const url = await createCheckoutSession(plan);
        window.location.href = url;
      } else {
        window.location.href = '/subscribe';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const formFields = (
    <div className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          placeholder="Min. 8 characters"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Solve This OA For Me</h1>
        {plan && (
          <p className="text-sm text-stone-500 mt-1">
            {plan === 'day_pass' ? 'Day Pass — $49/day' : 'Individual — $189/mo'}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
        <Tabs defaultValue="login">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="login" className="flex-1">Log In</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin}>
              {formFields}
              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? 'Signing in...' : 'Log In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister}>
              {formFields}
              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
