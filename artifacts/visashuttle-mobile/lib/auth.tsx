import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, saveCookie } from "./api";

export interface B2cUser {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  freeChecksRemaining?: number | null;
  deepCheckAccess?: boolean;
}

interface AuthContextValue {
  user: B2cUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<B2cUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiGet<{ user: B2cUser } | B2cUser | null>("/api/b2c/auth/me");
      const u = me && typeof me === "object" && "user" in (me as any) ? (me as any).user : me;
      setUser((u as B2cUser) ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    await apiPost("/api/b2c/auth/login", { email, password });
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await apiPost("/api/b2c/auth/logout", {});
    } catch {
      /* ignore */
    }
    await saveCookie(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refresh, signIn, signOut }),
    [user, loading, refresh, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
