import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import agencySigninPlane from "@/assets/agency-signin-paper-plane.png";

function AgencyLoginMark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative h-14 w-14" aria-label="Agency workflow animation">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#4055FF]/15 via-[#9033F5]/15 to-[#FF2060]/15" />
        <div className="absolute inset-2 rounded-xl border border-white/70 bg-white/80 shadow-lg backdrop-blur" />
        <div className="absolute inset-0 flex items-center justify-center text-[#4055FF]">
          <Fingerprint className="h-6 w-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[420px] w-full max-w-[500px] items-center justify-center" aria-label="Visa Shuttle travel mark">
      <img
        src={agencySigninPlane}
        alt="Visa Shuttle travel mark"
        className="h-auto w-full max-w-[500px] object-contain"
        loading="eager"
      />
    </div>
  );
}

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
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFF] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(64,85,255,0.10),transparent_31%),radial-gradient(circle_at_82%_76%,rgba(255,32,96,0.08),transparent_28%),linear-gradient(180deg,#FFFFFF_0%,#F8FAFF_60%,#EEF3FF_100%)]" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_0.86fr]">
          <section className="hidden min-h-[680px] flex-col justify-between rounded-[2.5rem] bg-white/35 p-10 backdrop-blur-xl lg:flex">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4055FF]/12 bg-white/70 px-4 py-2 text-sm font-bold text-[#4055FF]">
                <span className="h-2 w-2 rounded-full bg-[#FF2060]" />
                Visa Shuttle Agency
              </div>
              <h1 className="mt-8 max-w-lg text-5xl font-black leading-[1] tracking-tight text-[#101A4D]">
                One quiet place to run every visa case.
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
                Leads, proposals, documents, payments, and customer portals arranged into a focused agency workspace.
              </p>
            </div>

            <AgencyLoginMark />

            <div className="flex items-center justify-between border-t border-slate-200/80 pt-6">
              <p className="max-w-xs text-sm leading-6 text-slate-500">
                Built for agencies that need clear work queues and cleaner customer handoffs.
              </p>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#101A4D] text-white">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-2xl shadow-[#4055FF]/12 backdrop-blur-xl sm:p-8">
              <div className="mb-7 flex items-center gap-4 lg:hidden">
                <AgencyLoginMark compact />
                <div>
                  <p className="text-sm font-bold uppercase text-[#4055FF]">Agency login</p>
                  <h1 className="text-2xl font-black tracking-tight">Visa Shuttle</h1>
                </div>
              </div>

              <div className="mb-7">
                <h2 className="text-4xl font-black tracking-tight text-[#101A4D]">Log in</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Access your agency dashboard.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive" data-testid="text-login-error">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-700">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="agency@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 px-4 text-base shadow-inner shadow-slate-100 focus-visible:ring-[#4055FF]"
                    data-testid="input-email"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-bold text-slate-700">Password</Label>
                    <a href="#" className="text-sm font-semibold text-[#4055FF] hover:underline">
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
                      className="h-12 rounded-2xl border-slate-200 bg-slate-50/70 px-4 pr-12 text-base shadow-inner shadow-slate-100 focus-visible:ring-[#4055FF]"
                      autoComplete="current-password"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl border-0 bg-[#101A4D] text-base font-black text-white shadow-xl shadow-[#101A4D]/18 transition-transform hover:scale-[1.01] hover:bg-[#17266F]"
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign in to dashboard
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-[#4055FF]/10 bg-[#4055FF]/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Protected agency workspace</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Your agency session is secured and routed to the right dashboard based on your role.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-slate-500">
                New agency?{" "}
                <Link href="/business/agency-crm/signup">
                  <a className="font-bold text-[#4055FF] hover:underline" data-testid="link-signup">
                    Create agency account
                  </a>
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
