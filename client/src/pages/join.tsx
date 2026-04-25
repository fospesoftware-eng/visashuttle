import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle, Sparkles, Globe, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export default function JoinPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "At least 8 characters required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/b2c/auth/register", form);
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
      setLocation("/check");
    } catch (err: any) {
      toast({ title: "Sign up failed", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col text-white p-10 xl:p-14 justify-between flex-shrink-0" style={{background:"linear-gradient(160deg,#4055FF 0%,#9033F5 50%,#FF2060 100%)"}}>
        <Logo size="lg" showText />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Free to get started
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight">
            Know Your Visa Chances Before You Apply
          </h1>
          <p className="text-white/80 text-lg mb-10 leading-relaxed">
            Get a free AI-powered assessment of your visa approval probability in under 60 seconds.
          </p>
          <div className="space-y-5">
            {[
              { icon: Sparkles, text: "1 free AI visa check — no credit card needed" },
              { icon: Globe, text: "Covers 100+ nationalities and destination countries" },
              { icon: Shield, text: "Secure, private — your data is never shared" },
              { icon: Zap, text: "Results in seconds with actionable next steps" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-white/90">{text}</span>
              </div>
            ))}
          </div>
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
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Already have an account? <span className="text-[#4055FF] font-medium">Sign in</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1">Create your free account</h2>
              <p className="text-muted-foreground">Get your first visa check free — no credit card needed</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Your full name"
                  value={form.fullName}
                  onChange={e => { setForm(f => ({ ...f, fullName: e.target.value })); setErrors(er => ({ ...er, fullName: "" })); }}
                  className={errors.fullName ? "border-red-400" : ""}
                  data-testid="input-name"
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: "" })); }}
                  className={errors.email ? "border-red-400" : ""}
                  data-testid="input-email"
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: "" })); }}
                    className={`pr-10 ${errors.password ? "border-red-400" : ""}`}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(s => !s)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold border-0 text-white hover:opacity-90 mt-2"
                  style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Create Free Account
                  </span>
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-5">
              By signing up, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>

            <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
              <p className="text-sm text-center text-blue-700 dark:text-blue-300">
                <span className="font-semibold">Free plan includes:</span> 1 AI-powered visa check with full breakdown
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
