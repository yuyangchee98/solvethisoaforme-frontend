import { useState, useEffect } from 'react';
import { getToken, getMe, type AuthUser } from '@/lib/auth';
import { getAnthropicKey, setAnthropicKey, clearAnthropicKey } from '@/lib/byok';
import { Loader2 } from 'lucide-react';

function maskKey(key: string): string {
  if (key.length <= 12) return '••••••••';
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

function AnthropicKeyCard() {
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSavedKey(getAnthropicKey());
  }, []);

  const handleSave = () => {
    if (!input.trim()) return;
    setAnthropicKey(input);
    setSavedKey(input.trim());
    setInput('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemove = () => {
    clearAnthropicKey();
    setSavedKey(null);
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm mb-6">
      <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-4">
        Anthropic API Key
      </h2>

      {savedKey ? (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-mono text-stone-900">{maskKey(savedKey)}</span>
          <button
            onClick={handleRemove}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mb-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <button
            onClick={handleSave}
            disabled={!input.trim()}
            className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      )}

      <p className="text-xs text-stone-500">
        Stored only in this browser and sent directly to your session when the
        agent runs — never saved on the server. Get a key at{' '}
        <a
          href="https://console.anthropic.com"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          console.anthropic.com
        </a>
        .
      </p>
    </div>
  );
}

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

      <AnthropicKeyCard />

    </div>
  );
}
