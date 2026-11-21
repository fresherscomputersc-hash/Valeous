'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface ClientActor {
  sessionId: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: 'INFLUENCER' | 'BUSINESS' | 'ADMIN' | 'CUSTOMER';
    avatarUrl: string | null;
    status: 'ACTIVE' | 'SUSPENDED';
    emailVerified: boolean;
  };
  businessProfile: {
    id: string;
    brandName: string;
    slug: string;
    city: string;
    walletBalancePaise: number;
  } | null;
  influencerProfile: {
    id: string;
    handle: string;
    displayName: string;
    niche: string;
    availableBalancePaise: number;
    pendingClearancePaise: number;
  } | null;
  customerProfile: {
    id: string;
    displayName: string;
    city: string;
    preferences: string | null;
  } | null;
}

const STORAGE_KEY = 'pb_session_token_v1';
let memorySessionToken: string | null = null;
let fetchPatched = false;

export function getStoredSessionToken(): string | null {
  if (memorySessionToken) return memorySessionToken;
  if (typeof window === 'undefined') return null;

  try {
    const fromSession = window.sessionStorage.getItem(STORAGE_KEY);
    if (fromSession) {
      memorySessionToken = fromSession;
      return fromSession;
    }
  } catch {
    // Storage blocked in strict cross-site iframe
  }

  try {
    const fromLocal = window.localStorage.getItem(STORAGE_KEY);
    if (fromLocal) {
      memorySessionToken = fromLocal;
      return fromLocal;
    }
  } catch {
    // Storage blocked
  }

  return null;
}

export function setStoredSessionToken(token: string | null): void {
  memorySessionToken = token;
  if (typeof window === 'undefined') return;

  try {
    if (token) {
      window.sessionStorage.setItem(STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction
  }

  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction
  }
}

function ensureSameOriginFetchBearerPatch(): void {
  if (typeof window === 'undefined' || fetchPatched) return;
  fetchPatched = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = getStoredSessionToken();
    if (!token) {
      return nativeFetch(input, init);
    }

    let urlString = '';
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input instanceof Request) {
      urlString = input.url;
    }

    const isSameOriginApi =
      urlString.startsWith('/api/') ||
      (typeof window !== 'undefined' &&
        urlString.startsWith(`${window.location.origin}/api/`));

    if (!isSameOriginApi) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined)
    );
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return nativeFetch(input, {
      ...init,
      headers,
    });
  };
}

// Install patch synchronously when module loads in browser so even initial child effects carry Bearer
if (typeof window !== 'undefined') {
  ensureSameOriginFetchBearerPatch();
}

interface AuthContextValue {
  actor: ClientActor | null;
  ready: boolean;
  establishSession: (sessionToken?: string | null) => Promise<ClientActor | null>;
  refreshActor: () => Promise<ClientActor | null>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  actor: null,
  ready: false,
  establishSession: async () => null,
  refreshActor: async () => null,
  clearSession: () => {},
});

export function AuthProvider({
  initialActor,
  children,
}: {
  initialActor: ClientActor | null;
  children: React.ReactNode;
}) {
  const [actor, setActor] = useState<ClientActor | null>(initialActor);
  const [ready, setReady] = useState<boolean>(Boolean(initialActor));

  const refreshActor = useCallback(async (): Promise<ClientActor | null> => {
    ensureSameOriginFetchBearerPatch();
    try {
      const token = getStoredSessionToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        headers,
      });
      if (!res.ok) {
        setActor(null);
        setReady(true);
        return null;
      }
      const data = (await res.json()) as { actor: ClientActor | null };
      if (!data.actor && token) {
        setStoredSessionToken(null);
      }
      setActor(data.actor ?? null);
      setReady(true);
      return data.actor ?? null;
    } catch {
      setReady(true);
      return null;
    }
  }, []);

  const establishSession = useCallback(
    async (sessionToken?: string | null): Promise<ClientActor | null> => {
      if (sessionToken) {
        setStoredSessionToken(sessionToken);
      }
      return refreshActor();
    },
    [refreshActor]
  );

  const clearSession = useCallback(() => {
    setStoredSessionToken(null);
    setActor(null);
    setReady(true);
  }, []);

  useEffect(() => {
    ensureSameOriginFetchBearerPatch();
    if (initialActor) {
      setActor(initialActor);
      setReady(true);
      return;
    }
    // If server had no cookie (e.g. third-party cookies blocked in preview iframe), hydrate from Bearer token!
    if (getStoredSessionToken()) {
      void refreshActor();
    } else {
      setReady(true);
    }
  }, [initialActor, refreshActor]);

  const value = useMemo(
    () => ({
      actor,
      ready,
      establishSession,
      refreshActor,
      clearSession,
    }),
    [actor, ready, establishSession, refreshActor, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
