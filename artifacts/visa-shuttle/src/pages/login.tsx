import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Plane, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Store tenant slug for agency UI
      if (data.tenantSlug) {
        localStorage.setItem("agency_tenant_slug", data.tenantSlug);
      }

      // Invalidate the me query so the new session is reflected
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Welcome back!",
        description: `Signed in as ${data.user.name || data.user.email}`,
      });

      // Route based on role
      const role = data.user.role;
      if (role === "saas_admin") {
        setLocation("/admin");
      } else if (role === "agency_owner" || role === "agency_staff") {
        setLocation("/app");
      } else if (role === "customer") {
        setLocation("/customer");
      } else {
        setLocation("/app");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">

          {/* Left — branding panel */}
          <div className="hidden lg:flex flex-col gap-8 pr-8">
            <div>
              <Logo size="lg" />
              <h2 className="mt-6 text-3xl font-bold leading-tight">
                The complete visa processing platform for modern agencies
              </h2>
              <p className="mt-3 text-muted-foreground text-lg">
                Manage applications, track documents, and give customers a branded self-service portal — all in one place.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: Plane, title: "Multi-country visa management", desc: "Handle Schengen, UK, US, and 50+ destinations" },
                { icon: Shield, title: "Secure customer portals", desc: "White-label OTP login with your agency branding" },
                { icon: Zap, title: "AI-powered document review", desc: "Instant quality checks and readiness scoring" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — login card */}
          <Card className="w-full shadow-xl border-border/50">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3 lg:hidden">
                <Logo size="lg" />
              </div>
              <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
              <CardDescription>Access your dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive" data-testid="text-login-error">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="#" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      autoComplete="current-password"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? "Signing in…" : "Sign In"}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup">
                  <a className="text-primary hover:underline font-medium" data-testid="link-signup">
                    Sign up free
                  </a>
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
