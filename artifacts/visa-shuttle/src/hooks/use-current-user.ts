import { useQuery } from "@tanstack/react-query";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenantId: string | null;
  avatarUrl: string | null;
  permissions?: string[];
}

export interface CurrentUserData {
  authenticated: boolean;
  user?: CurrentUser;
  tenantSlug?: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string | null;
  } | null;
}

export function useCurrentUser() {
  return useQuery<CurrentUserData>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    },
    staleTime: 30_000,
    retry: false,
  });
}
