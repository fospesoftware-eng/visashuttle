import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle, Sparkles, Globe, Shield, Zap, Phone, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

type Step = "info" | "otp";

export default function JoinPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>("info");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function startResendCountdown() {
    setResendCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function validateInfo() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\+?[1-9]\d{6,14}$/.test(form.phone.replace(/[\s\-()]/g, ""))) {
      e.phone = "Enter a valid phone number with country code (e.g. +44 7911 123456)";
    }
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "At least 8 characters required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function normalizePhone(raw: string) {
    const stripped = raw.replace(/[\s\-()]/g, "");
    return stripped.startsWith("+") ? stripped : `+${stripped}`;
  }

  async function handleSendOtp() {
    if (!validateInfo()) return;
    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhone(form.phone);
      await apiRequest("POST", "/api/b2c/otp/send", { phone: normalizedPhone });
      setStep("otp");
      startResendCountdown();
      toast({ title: "Code sent!", description: `A 6-digit code was sent to ${normalizedPhone}` });
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhone(form.phone);
      await apiRequest("POST", "/api/b2c/otp/send", { phone: normalizedPhone });
      setOtp(["", "", "", "", "", ""]);
      startResendCountdown();
      otpRefs.current[0]?.focus();
      toast({ title: "Code resent", description: "A new code was sent to your phone" });
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    pasted.split("").forEach((char, i) => { next[i] = char; });
    setOtp(next);
    const lastFilled = Math.min(pasted.length, 5);
    otpRefs.current[lastFilled]?.focus();
  }

  async function handleVerifyAndRegister() {
    const code = otp.join("");
    if (code.length < 6) {
      toast({ title: "Enter the full code", description: "Please enter all 6 digits", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhone(form.phone);
      await apiRequest("POST", "/api/b2c/otp/verify", { phone: normalizedPhone, otp: code });
      await apiRequest("POST", "/api/b2c/auth/register", {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: normalizedPhone,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
      setLocation("/check");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message || "Invalid or expired code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const features = [
    { icon: Sparkles, text: "1 free AI visa check — no credit card needed" },
    { icon: Globe, text: "Covers 100+ nationalities and destination countries" },
    { icon: Shield, text: "Secure, private — your data is never shared" },
    { icon: Zap, text: "Results in seconds with actionable next steps" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col text-white p-10 xl:p-14 justify-between flex-shrink-0"
        style={{ background: "linear-gradient(160deg,#4055FF 0%,#9033F5 50%,#FF2060 100%)" }}
      >
        <Logo size="lg" showText variant="white" />
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
            {features.map(({ icon: Icon, text }) => (
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

            {/* ── Step 1: Account Info ────────────────────────────────── */}
            {step === "info" && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1">Create your free account</h2>
                  <p className="text-muted-foreground">Get your first visa check free — no credit card needed</p>
                </div>

                <form
                  onSubmit={e => { e.preventDefault(); handleSendOtp(); }}
                  className="space-y-4"
                >
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
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+44 7911 123456"
                        value={form.phone}
                        onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setErrors(er => ({ ...er, phone: "" })); }}
                        className={`pl-9 ${errors.phone ? "border-red-400" : ""}`}
                        data-testid="input-phone"
                      />
                    </div>
                    {errors.phone
                      ? <p className="text-xs text-red-500">{errors.phone}</p>
                      : <p className="text-xs text-muted-foreground">Include country code. We'll send a verification code.</p>
                    }
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
                    style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}
                    disabled={isLoading}
                    data-testid="button-send-otp"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending code...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Send Verification Code
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
              </>
            )}

            {/* ── Step 2: OTP Verification ────────────────────────────── */}
            {step === "otp" && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                  onClick={() => { setStep("info"); setOtp(["", "", "", "", "", ""]); }}
                  data-testid="button-back-to-info"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="mb-8">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#4055FF20,#FF206020)" }}>
                    <Phone className="w-6 h-6 text-[#4055FF]" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Verify your phone</h2>
                  <p className="text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">{normalizePhone(form.phone)}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Enter verification code</Label>
                    <div className="flex gap-2.5 justify-between" data-testid="otp-input-group">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          onPaste={i === 0 ? handleOtpPaste : undefined}
                          className="w-full aspect-square text-center text-xl font-semibold rounded-xl border-2 bg-background transition-all focus:outline-none focus:border-[#4055FF] dark:focus:border-[#4055FF]"
                          style={{ borderColor: digit ? "#4055FF" : undefined }}
                          data-testid={`input-otp-${i}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Tip: you can paste the full code at once</p>
                  </div>

                  <Button
                    className="w-full h-11 text-base font-semibold border-0 text-white hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}
                    disabled={isLoading || otp.join("").length < 6}
                    onClick={handleVerifyAndRegister}
                    data-testid="button-verify-create"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Verify &amp; Create Account
                      </span>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Didn't receive the code?</p>
                    {resendCountdown > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Resend in <span className="font-medium text-foreground tabular-nums">{resendCountdown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-[#4055FF] font-medium hover:underline flex items-center gap-1.5 mx-auto disabled:opacity-50"
                        onClick={handleResend}
                        disabled={isLoading}
                        data-testid="button-resend-otp"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
