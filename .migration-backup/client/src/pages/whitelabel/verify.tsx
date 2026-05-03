import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mail, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

type AuthMethod = "email" | "phone";

// Read the stored auth method synchronously during initial render so the UI
// never flickers from "email" → "phone" + can't fire a Resend with the wrong
// payload during the hydration window. Guarded for SSR.
function readStored(key: string): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(key) ?? "";
}

export default function WhiteLabelVerifyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [method] = useState<AuthMethod>(() => (readStored("wl_method") as AuthMethod) || "email");
  const [email] = useState(() => readStored("wl_email"));
  const [phone] = useState(() => readStored("wl_phone"));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If we landed on /verify without an identifier in sessionStorage (deep
  // link, refresh after cleanup, cleared storage), bounce back to login.
  useEffect(() => {
    const hasIdentifier = method === "email" ? email.trim() : phone.trim();
    if (!hasIdentifier) {
      setLocation(`/w/${slug}/login`);
    }
  }, [slug, setLocation, method, email, phone]);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  // Build the request payload based on which method the user signed in with.
  // Always includes the chosen identifier; passes the optional secondary one
  // so the server can backfill the customer record (e.g. email-signin user
  // who also gave their phone for SMS notifications).
  const buildAuthPayload = (verificationCode: string) => {
    const name = sessionStorage.getItem("wl_name") || undefined;
    if (method === "email") {
      return { email, code: verificationCode, name, phone: phone || undefined };
    }
    return { phone, code: verificationCode, name, email: email || undefined };
  };

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string; code: string; name?: string }) => {
      const res = await apiRequest("POST", `/api/w/${slug}/auth/verify-otp`, data);
      return res.json();
    },
    onSuccess: () => {
      sessionStorage.removeItem("wl_method");
      sessionStorage.removeItem("wl_email");
      sessionStorage.removeItem("wl_phone");
      sessionStorage.removeItem("wl_name");
      const ref = sessionStorage.getItem("wl_ref");
      toast({
        title: "Welcome!",
        description: "You've been signed in successfully"
      });
      if (ref) {
        setLocation(`/w/${slug}/portal?ref=${ref}`);
      } else {
        setLocation(`/w/${slug}/portal`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive"
      });
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  });

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (newCode.every(digit => digit) && newCode.join("").length === 6) {
      const fullCode = newCode.join("");
      verifyOTPMutation.mutate(buildAuthPayload(fullCode));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
      verifyOTPMutation.mutate(buildAuthPayload(pastedData));
    }
  };

  const handleResend = async () => {
    try {
      const payload = method === "email" ? { email } : { phone };
      await apiRequest("POST", `/api/w/${slug}/auth/request-otp`, payload);
      toast({
        title: "Code Sent",
        description: method === "email"
          ? "A new verification code has been sent to your email"
          : "A new verification code has been sent to your mobile number",
      });
    } catch {
      toast({ title: "Error", description: "Failed to resend code", variant: "destructive" });
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const primaryColor = tenant.primaryColor || "#00B4D8";
  const secondaryColor = tenant.secondaryColor || "#E056A0";
  const Icon = method === "email" ? Mail : Smartphone;
  const identifier = method === "email" ? email : phone;
  const targetLabel = method === "email" ? "email" : "mobile number";

  return (
    <div className="min-h-screen flex flex-col">
      <div 
        className="p-4 lg:p-6"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
        }}
      >
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/20 gap-2"
            onClick={() => setLocation(`/w/${slug}/login`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="h-8 brightness-0 invert" />
          ) : (
            <span className="text-white font-semibold">{tenant.name}</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div 
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Icon className="w-10 h-10" style={{ color: primaryColor }} />
              </div>
              <CardTitle className="text-2xl">Check your {targetLabel}</CardTitle>
              <CardDescription className="text-base">
                We sent a 6-digit code to<br />
                <span className="font-semibold text-foreground" data-testid="text-identifier">{identifier}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center gap-2 sm:gap-3">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all"
                    style={{ 
                      borderColor: digit ? primaryColor : undefined,
                      boxShadow: digit ? `0 0 0 1px ${primaryColor}` : undefined
                    }}
                    autoFocus={index === 0}
                    data-testid={`input-otp-${index}`}
                  />
                ))}
              </div>

              {verifyOTPMutation.isPending && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: primaryColor }} />
                  <span className="text-muted-foreground">Verifying...</span>
                </div>
              )}

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?{" "}
                  <button 
                    onClick={handleResend}
                    className="font-semibold hover:underline"
                    type="button"
                    style={{ color: primaryColor }}
                    data-testid="button-resend"
                  >
                    Resend Code
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 p-4 rounded-xl bg-white dark:bg-slate-900 border border-border">
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <CheckCircle2 className="w-5 h-5" style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Security Tip</h3>
                <p className="text-xs text-muted-foreground">
                  We use one-time codes instead of passwords to keep your account secure. Each code expires in 10 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {tenant.showPoweredBy && (
        <div className="py-4 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-950">
          Powered by <span className="font-semibold gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
