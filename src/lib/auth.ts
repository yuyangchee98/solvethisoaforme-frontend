/**
 * Auth utilities: token management + invisible guest accounts.
 *
 * There is no login screen. On first visit the app silently registers a
 * throwaway identity (random credentials kept in this browser) and logs it in.
 * The backend keeps its ordinary JWT auth — sessions stay scoped per identity,
 * and a future usage counter or "claim this account" login can hang off it.
 *
 * Phase-1 reality: the backend's SQLite is wiped when its container sleeps, so
 * guest users can vanish server-side. Recovery is the same silent flow: the
 * stored credentials re-register under the same email and life goes on (the
 * sessions were wiped with the same database anyway).
 */

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'auth_token';
const GUEST_EMAIL_KEY = 'guest_email';
const GUEST_PASSWORD_KEY = 'guest_password';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function login(email: string, password: string): Promise<void> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_BASE}/auth/jwt/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }

  const data = await res.json();
  setToken(data.access_token as string);
}

async function register(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  // REGISTER_USER_ALREADY_EXISTS is fine here: the guest row survived and the
  // login that follows will pick it up.
  if (!res.ok && res.status !== 400) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Registration failed');
  }
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getGuestCredentials(): { email: string; password: string } {
  let email = localStorage.getItem(GUEST_EMAIL_KEY);
  let password = localStorage.getItem(GUEST_PASSWORD_KEY);
  if (!email || !password) {
    email = `guest-${randomHex(8)}@guests.chyuang.com`;
    password = randomHex(24);
    localStorage.setItem(GUEST_EMAIL_KEY, email);
    localStorage.setItem(GUEST_PASSWORD_KEY, password);
  }
  return { email, password };
}

let guestAuthInFlight: Promise<void> | null = null;

/**
 * Make sure this browser holds a working token, creating or reviving the guest
 * identity as needed. Safe to call from several components at once.
 *
 * Pass `force` after a 401 to discard the stale token and re-provision.
 */
export function ensureGuestAuth(force = false): Promise<void> {
  if (force) {
    clearToken();
    guestAuthInFlight = null;
  }
  if (!force && getToken()) return Promise.resolve();
  if (!guestAuthInFlight) {
    guestAuthInFlight = (async () => {
      const { email, password } = getGuestCredentials();
      try {
        await login(email, password);
      } catch {
        // User row gone (fresh browser, or the phase-1 DB wipe). Re-register
        // under the same credentials and log in again.
        await register(email, password);
        await login(email, password);
      }
    })().finally(() => {
      guestAuthInFlight = null;
    });
  }
  return guestAuthInFlight;
}
