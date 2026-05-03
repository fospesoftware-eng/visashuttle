import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COOKIE_KEY = "visashuttle.cookie";

const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    return (await SecureStore.getItemAsync(key)) ?? null;
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Resolve the API base URL for the current runtime.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL — explicit override (e.g. https://api.example.com)
 *  2. EXPO_PUBLIC_DOMAIN  — Replit dev/preview domain provided by the workflow
 *  3. Web — relative URLs ("") so the browser uses the current origin (the
 *     proxy in front of the artifact already routes /api/* to the API server)
 *  4. Native dev fallback — http://localhost:8080 (the API server's local
 *     dev port). This keeps simulators/emulators working when neither env
 *     var is set, and surfaces a sensible default instead of silently
 *     hitting the wrong host.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  if (Platform.OS === "web") return "";
  return "http://localhost:8080";
}

export const API_BASE = resolveBaseUrl();

let memoryCookie: string | null = null;
let cookieLoaded = false;

export async function loadCookie(): Promise<string | null> {
  if (cookieLoaded) return memoryCookie;
  try {
    memoryCookie = await storage.get(COOKIE_KEY);
  } catch {
    memoryCookie = null;
  }
  cookieLoaded = true;
  return memoryCookie;
}

export async function saveCookie(cookie: string | null): Promise<void> {
  memoryCookie = cookie;
  cookieLoaded = true;
  try {
    if (cookie) await storage.set(COOKIE_KEY, cookie);
    else await storage.remove(COOKIE_KEY);
  } catch {
    /* ignore persistence errors */
  }
}

function parseSetCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const first =
    setCookieHeader.split(",").find((p) => p.includes("connect.sid=")) ?? setCookieHeader;
  const pair = first.split(";")[0]?.trim();
  return pair || null;
}

export interface ApiError extends Error {
  status: number;
  payload?: unknown;
}

const isWeb = Platform.OS === "web";

export async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!isWeb) {
    const cookie = await loadCookie();
    if (cookie) headers["Cookie"] = cookie;
  }

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...(isWeb ? { credentials: "include" as const } : {}),
  });

  if (!isWeb) {
    const setCookie = res.headers.get("set-cookie");
    const newCookie = parseSetCookie(setCookie);
    if (newCookie) await saveCookie(newCookie);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message = pickErrorMessage(data) ?? `Request failed with ${res.status}`;
    const err = new Error(message) as ApiError;
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data as T;
}

function pickErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (typeof obj.error === "string") return obj.error;
  if (typeof obj.message === "string") return obj.message;
  return null;
}

export const apiGet = <T = unknown>(path: string) => api<T>("GET", path);
export const apiPost = <T = unknown>(path: string, body?: unknown) => api<T>("POST", path, body);
export const apiPut = <T = unknown>(path: string, body?: unknown) => api<T>("PUT", path, body);
export const apiDelete = <T = unknown>(path: string) => api<T>("DELETE", path);
