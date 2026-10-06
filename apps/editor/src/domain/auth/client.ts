'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AuthUser } from '@facadeur/api';
import { api } from '../api.js';

const AUTH_CHANGE_EVENT = 'facadeur:auth-change';

function notifyAuthChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export const authClient = {
  useSession() {
    const [data, setData] = useState<{ user: AuthUser } | null>(null);
    const [isPending, setIsPending] = useState(true);
    const refetch = useCallback(async () => {
      setIsPending(true);
      try {
        const session = await api.auth.session();
        setData(session);
        return session;
      } finally {
        setIsPending(false);
      }
    }, []);
    useEffect(() => {
      void refetch().catch(() => setData(null));
      const onAuthChanged = () => void refetch().catch(() => setData(null));
      window.addEventListener(AUTH_CHANGE_EVENT, onAuthChanged);
      return () => window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChanged);
    }, [refetch]);
    return { data, isPending, refetch };
  },

  async signIn(input: { email: string; name?: string }) {
    const result = await api.auth.signIn(input);
    notifyAuthChanged();
    return result;
  },

  async signOut() {
    try {
      await api.auth.signOut();
      notifyAuthChanged();
      return { error: undefined as Error | undefined };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Could not sign out') };
    }
  },
};
