import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export interface B2cUser {
  id: string;
  email: string;
  fullName: string;
  freeChecksUsed: number;
  subscriptionPlan: string;
  checkLimit: number;
  deepCheckAccess: boolean;
  stripeCustomerId: string | null;
  createdAt: string;
}

export function useB2cAuth() {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{ user: B2cUser }>({
    queryKey: ["/api/b2c/auth/me"],
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/b2c/auth/logout", {}),
    onSuccess: () => {
      queryClient.setQueryData(["/api/b2c/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/b2c"] });
      setLocation("/sign-in");
    },
  });

  const user = data?.user ?? null;
  const isDemo = user?.subscriptionPlan === "demo";
  const checksRemaining = isDemo ? Infinity : user ? Math.max(0, (user.checkLimit || 1) - (user.freeChecksUsed || 0)) : 0;
  const canCheck = isDemo ? true : checksRemaining > 0;

  return { user, isLoading, logout: logoutMutation.mutate, checksRemaining, canCheck, isDemo };
}
