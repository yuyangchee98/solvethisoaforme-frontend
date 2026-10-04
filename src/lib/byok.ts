/**
 * BYOK (bring your own key) — the user's Anthropic API key.
 *
 * Stored only in this browser (localStorage); sent per-request as a header
 * and threaded by the backend into the agent subprocess environment. Never
 * persisted server-side.
 */

const STORAGE_KEY = "anthropic_api_key";

export function getAnthropicKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setAnthropicKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearAnthropicKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function byokHeaders(): Record<string, string> {
  const key = getAnthropicKey();
  return key ? { "X-Anthropic-Api-Key": key } : {};
}
