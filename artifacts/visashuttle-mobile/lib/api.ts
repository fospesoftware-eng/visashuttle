import AsyncStorage from "@react-native-async-storage/async-storage";

const COOKIE_KEY = "visashuttle.cookie";

function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
}

export const API_BASE = resolveBaseUrl();

let memoryCookie: string | null = null;

export async function loadCookie(): Promise<string | null> {
  if (memoryCookie !== null) return memoryCookie;
  const v = await AsyncStorage.getItem(COOKIE_KEY);
  memoryCookie = v;
  return v;
}

export async function saveCookie(cookie: string | null): Promise<void> {
  memoryCookie = cookie;
  if (cookie) {
    await AsyncStorage.setItem(COOKIE_KEY, cookie);
  } else {
    await AsyncStorage.removeItem(COOKIE_KEY);
  }
}

function parseSetCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const first = setCookieHeader.split(",").find((p) => p.includes("connect.sid=")) ?? setCookieHeader;
  const pair = first.split(";")[0]?.trim();
  return pair || null;
}

export interface ApiError extends Error {
  status: number;
  payload?: unknown;
}

export async function api<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const cookie = await loadCookie();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie");
  const newCookie = parseSetCookie(setCookie);
  if (newCookie) await saveCookie(newCookie);

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
    const err = new Error(
      (data && typeof data === "object" && "message" in data && typeof (data as any).message === "string"
        ? (data as any).message
        : `Request failed with ${res.status}`),
    ) as ApiError;
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
