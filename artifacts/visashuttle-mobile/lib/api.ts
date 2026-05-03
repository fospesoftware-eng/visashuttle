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

function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
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
    const message =
      data && typeof data === "object" && data !== null && "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : data && typeof data === "object" && data !== null && "message" in data &&
          typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `Request failed with ${res.status}`;
    const err = new Error(message) as ApiError;
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data as T;
}

export const apiGet = <T = unknown>(path: string) => api<T>("GET", path);
export const apiPost = <T = unknown>(path: string, body?: unknown) => api<T>("POST", path, body);
export const apiPut = <T = unknown>(path: string, body?: unknown) => api<T>("PUT", path, body);
export const apiDelete = <T = unknown>(path: string) => api<T>("DELETE", path);
