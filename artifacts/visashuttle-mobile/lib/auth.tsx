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

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function extractUser(payload: unknown): B2cUser | null {
  if (!isObject(payload)) return null;
  const candidate = "user" in payload && isObject(payload.user) ? payload.user : payload;
  if (!isObject(candidate)) return null;
  if (typeof candidate.id !== "string" || typeof candidate.email !== "string") return null;
  return {
    id: candidate.id,
    email: candidate.email,
    fullName: typeof candidate.fullName === "string" ? candidate.fullName : null,
    phone: typeof candidate.phone === "string" ? candidate.phone : null,
    freeChecksRemaining:
      typeof candidate.freeChecksRemaining === "number" ? candidate.freeChecksRemaining : null,
    deepCheckAccess:
      typeof candidate.deepCheckAccess === "boolean" ? candidate.deepCheckAccess : false,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<B2cUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiGet<unknown>("/api/b2c/auth/me");
      setUser(extractUser(me));
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
