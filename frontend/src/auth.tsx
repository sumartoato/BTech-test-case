import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { api, setUnauthorizedHandler } from './api';

const TOKEN_KEY = 'token';
const IDLE_LIMIT_MS = Number(import.meta.env.VITE_IDLE_MINUTES ?? 15) * 60 * 1000;
const REFRESH_BEFORE_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

interface AuthContextValue {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function tokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000;
  } catch {
    return 0;
  }
}

function readToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && tokenExpiry(token) > Date.now()) return token;
  localStorage.removeItem(TOKEN_KEY);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken);
  const lastActivity = useRef(Date.now());
  const refreshing = useRef(false);

  const saveToken = (value: string | null) => {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
    setToken(value);
  };

  const logout = useCallback(() => saveToken(null), []);

  const login = async (email: string, password: string) => {
    const res = await api<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    lastActivity.current = Date.now();
    saveToken(res.accessToken);
  };

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    if (!token) return;

    const markActive = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const check = async () => {
      const now = Date.now();
      if (now - lastActivity.current >= IDLE_LIMIT_MS || tokenExpiry(token) <= now) {
        logout();
        return;
      }

      // user is still active, extend the session before the token runs out
      if (tokenExpiry(token) - now < REFRESH_BEFORE_MS && !refreshing.current) {
        refreshing.current = true;
        try {
          const res = await api<{ accessToken: string }>('/auth/refresh', {
            method: 'POST',
            token,
            retries: 2,
          });
          saveToken(res.accessToken);
        } catch {
          // keep the current token, next tick will try again
        } finally {
          refreshing.current = false;
        }
      }
    };

    const interval = setInterval(check, 10000);
    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
    };
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
