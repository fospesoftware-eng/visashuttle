import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, KeyRound, MailCheck, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sentMessage, setSentMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Please enter your email address"); return; }
    setError("");
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/b2c/auth/forgot-password", { email });
      const data = await res.json().catch(() => ({}));
      setSentMessage(data.message || "If an account exists for that email, we've sent a password reset link.");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
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
            Forgot your password?
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            No problem. Enter the email you signed up with and we'll send you a secure link to set a new password.
          </p>
        </div>
        <p className="text-white/60 text-sm">© {new Date().getFullYear()} Visa Shuttle. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {sent ? (
              <div className="text-center space-y-5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <MailCheck className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">Check your email</h2>
                  <p className="text-muted-foreground">{sentMessage}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
                  📬 Can't find it? Check your <strong>spam</strong> or <strong>junk</strong> folder. The link expires in 1 hour.
                </div>
                <Link href="/sign-in" className="inline-flex items-center justify-center gap-2 text-sm text-[#4055FF] font-medium hover:underline">
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1">Reset your password</h2>
                  <p className="text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      data-testid="input-email"
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
                        Sending...
                      </span>
                    ) : "Send Reset Link"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  <Link href="/sign-in" className="inline-flex items-center gap-1 text-[#4055FF] font-medium hover:underline">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
