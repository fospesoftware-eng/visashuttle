import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, Eye, EyeOff, KeyRound, Loader2, PlaneTakeoff, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setChecking(false); setTokenValid(false); return; }
    fetch(`/api/b2c/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => setTokenValid(!!d.valid))
      .catch(() => setTokenValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    setError("");
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/b2c/auth/reset-password", { token, password: form.password });
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col text-white p-10 xl:p-14 justify-between flex-shrink-0" style={{background:"linear-gradient(160deg,#4055FF 0%,#9033F5 50%,#FF2060 100%)"}}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-sm font-medium w-fit">
          <PlaneTakeoff className="w-3.5 h-3.5" />
          Visa Shuttle
        </div>
        <div>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/16 shadow-2xl backdrop-blur">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight">
            Choose a new password
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Pick a strong password you don't use anywhere else. You'll use it next time you sign in to Visa Shuttle.
          </p>
        </div>
        <p className="text-white/60 text-sm">© {new Date().getFullYear()} Visa Shuttle. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {checking ? (
              <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#4055FF] mx-auto animate-spin" />
                <p className="text-muted-foreground">Checking your reset link…</p>
              </div>
            ) : done ? (
              <div className="text-center space-y-5">
                <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold mb-1">Password reset</h2>
                  <p className="text-muted-foreground">Your password has been updated. You can now sign in with your new password.</p>
                </div>
                <Button
                  className="w-full h-11 text-base font-semibold border-0 text-white hover:opacity-90"
                  style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}
                  onClick={() => navigate("/sign-in?message=" + encodeURIComponent("Your password has been reset. Please sign in."))}
                >
                  Go to Sign In
                </Button>
              </div>
            ) : !tokenValid ? (
              <div className="text-center space-y-5">
                <XCircle className="w-14 h-14 text-red-500 mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold mb-1">Link invalid or expired</h2>
                  <p className="text-muted-foreground">This password reset link is no longer valid. Reset links expire after 1 hour. Please request a new one.</p>
                </div>
                <Link href="/forgot-password">
                  <Button
                    className="w-full h-11 text-base font-semibold border-0 text-white hover:opacity-90"
                    style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}
                  >
                    Request a new link
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1">Set a new password</h2>
                  <p className="text-muted-foreground">Enter and confirm your new password below.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
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

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirm New Password</Label>
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      value={form.confirm}
                      onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setError(""); }}
                      data-testid="input-confirm"
                    />
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
                        Resetting...
                      </span>
                    ) : "Reset Password"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
