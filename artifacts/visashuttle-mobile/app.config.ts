import type { ExpoConfig } from "expo/config";
import appJson from "./app.json";

/**
 * Resolve the public API base URL.
 *
 * The mobile app talks to the same Express backend as the web artifact
 * (`@workspace/api-server`), which the Replit artifact router exposes under
 * `/api` on the main repl domain (`REPLIT_DOMAINS`). The Expo dev server runs
 * on a different subdomain (`REPLIT_EXPO_DEV_DOMAIN`) that bypasses the
 * artifact router, so relative URLs from inside Expo would *not* reach the
 * API server. We therefore resolve and inline the absolute URL at bundle
 * time so both the web preview and native builds hit the same backend the
 * web app uses.
 *
 * Priority:
 *   1. `EXPO_PUBLIC_API_URL`    — explicit override (e.g. production URL)
 *   2. `REPLIT_DOMAINS`          — first comma-separated dev/preview domain
 *   3. `EXPO_PUBLIC_DOMAIN`      — legacy fallback name
 */
function resolveApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const replitDomains = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (replitDomains) return `https://${replitDomains}`;

  const legacy = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (legacy) return `https://${legacy}`;

  return "";
}

const apiUrl = resolveApiUrl();

// Surface the resolved URL to the bundler so `process.env.EXPO_PUBLIC_API_URL`
// reads it consistently at runtime even when only `REPLIT_DOMAINS` was set.
if (apiUrl && !process.env.EXPO_PUBLIC_API_URL) {
  process.env.EXPO_PUBLIC_API_URL = apiUrl;
}

const base = appJson.expo as ExpoConfig;

const config: ExpoConfig = {
  ...base,
  extra: {
    ...(base.extra ?? {}),
    apiUrl,
  },
};

export default config;
