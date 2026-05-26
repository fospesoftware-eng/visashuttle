import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle2, Eye, EyeOff, PlaneTakeoff, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

function SignInProgressMark() {
  return (
    <div className="relative h-36 w-36" aria-label="Visa Shuttle readiness animation">
      <div className="absolute inset-0 rounded-full border border-white/20" />
      <div className="absolute inset-4 rounded-full border border-white/15" />
      <div className="absolute inset-7 animate-pulse rounded-full bg-white/10 blur-xl" />
      <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.75rem] bg-white/16 shadow-2xl backdrop-blur">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#4055FF] shadow-lg">
          <PlaneTakeoff className="h-6 w-6" />
        </div>
      </div>

      <div className="absolute -right-2 top-8 flex h-10 w-10 animate-bounce items-center justify-center rounded-2xl bg-white/18 text-white shadow-lg backdrop-blur [animation-duration:3.2s]">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <div className="absolute bottom-6 left-0 flex h-10 w-10 animate-pulse items-center justify-center rounded-2xl bg-white/18 text-white shadow-lg backdrop-blur">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="absolute left-8 top-0 flex h-9 w-9 animate-bounce items-center justify-center rounded-2xl bg-white/16 text-white shadow-lg backdrop-blur [animation-duration:4s]">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="absolute -bottom-5 left-1/2 w-44 -translate-x-1/2 rounded-2xl border border-white/15 bg-white/12 p-3 shadow-xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-white/70">
          <span>Profile scan</span>
          <span>82%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-[82%] animate-pulse rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const nextPath = new URLSearchParams(window.location.search).get("next");
  const message = new URLSearchParams(window.location.search).get("message");
  const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/account";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please enter your email and password"); return; }
    setError("");
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/b2c/auth/login", form);
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
      setLocation(safeNextPath);
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
        <div className="pt-4">
          <SignInProgressMark />
        </div>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-sm font-medium mb-8">
            <PlaneTakeoff className="w-3.5 h-3.5" />
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
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1">Sign in to your account</h2>
              <p className="text-muted-foreground">Welcome back! Enter your details below.</p>
            </div>

            {message && (
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                {message}
              </div>
            )}

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
              <Link href={`/join?next=${encodeURIComponent(safeNextPath)}`} className="text-[#4055FF] font-medium hover:underline">
                Create one free
              </Link>
            </p>

            <div className="mt-8 pt-6 border-t">
              <p className="text-xs text-center text-muted-foreground mb-3">Business workspace access</p>
              <Link href="/login">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-agency-login">
                  Visa Desk / Growth Hub Login
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
