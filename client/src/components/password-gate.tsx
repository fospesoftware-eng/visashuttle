import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const { data: authStatus, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/site-auth/status"],
    queryFn: async () => {
      const res = await fetch("/api/site-auth/status", { credentials: "include" });
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const verifyMutation = useMutation({
    mutationFn: async (pwd: string) => {
      const res = await apiRequest("POST", "/api/site-auth/verify", { password: pwd });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-auth/status"] });
      toast({ title: "Access granted", description: "Welcome to VisaShuttle" });
    },
    onError: () => {
      toast({ 
        title: "Invalid password", 
        description: "Please try again", 
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      verifyMutation.mutate(password);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authStatus?.authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Protected Access</CardTitle>
          <CardDescription>
            This application is password protected. Please enter the access code to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Enter access password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                autoFocus
                data-testid="input-site-password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={verifyMutation.isPending || !password.trim()}
              data-testid="button-unlock"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Unlock Access"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
