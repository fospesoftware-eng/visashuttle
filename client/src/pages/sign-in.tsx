import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please enter your email and password"); return; }
    setError("");
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/b2c/auth/login", form);
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
      setLocation("/account");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col text-white p-10 xl:p-14 justify-between flex-shrink-0" style={{background:"linear-gradient(160deg,#4055FF 0%,#9033F5 50%,#FF2060 100%)"}}>
        <Logo size="lg" showText variant="white" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Visa Insights
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight">
            Welcome back to Visa Shuttle
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Sign in to view your visa check history, run new checks, and get personalized AI-powered insights for your travel plans.
          </p>
        </div>
        <p className="text-white/60 text-sm">© {new Date().getFullYear()} Visa Shuttle. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-6 border-b lg:border-none">
          <div className="lg:hidden">
            <Logo size="md" />
          </div>
          <div className="hidden lg:block" />
          <Link href="/join" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            New here? <span className="text-[#4055FF] font-medium">Create free account</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1">Sign in to your account</h2>
              <p className="text-muted-foreground">Welcome back! Enter your details below.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(""); }}
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-blue-600 hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(""); }}
                    className="pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(s => !s)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400" data-testid="error-message">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold border-0 text-white hover:opacity-90"
                  style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <Link href="/join" className="text-[#4055FF] font-medium hover:underline">
                Create one free
              </Link>
            </p>

            <div className="mt-8 pt-6 border-t">
              <p className="text-xs text-center text-muted-foreground mb-3">Are you a travel agency?</p>
              <Link href="/login">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-agency-login">
                  Agency / Staff Login
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
