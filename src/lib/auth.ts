/**
 * Auth utilities: token management, login, register, billing.
 */

const API_BASE = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

const TOKEN_KEY = 'auth_token';

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

export interface AuthUser {
  id: string;
  email: string;
  subscription_status: string | null;
  plan_type: string | null;
  is_active: boolean;
}

export async function login(email: string, password: string): Promise<string> {
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
  const token = data.access_token as string;
  setToken(token);
  return token;
}

export async function register(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 400 && data.detail === 'REGISTER_USER_ALREADY_EXISTS') {
      throw new Error('An account with this email already exists');
    }
    throw new Error(data.detail || 'Registration failed');
  }
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error('Not authenticated');
  }

  return res.json();
}

export async function createCheckoutSession(
  plan: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ plan }),
  });

  if (!res.ok) {
    throw new Error('Failed to create checkout session');
  }

  const data = await res.json();
  return data.url as string;
}

export function logout(): void {
  clearToken();
  window.location.href = '/login';
}
