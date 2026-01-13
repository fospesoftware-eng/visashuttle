import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

export default function WhiteLabelVerifyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("wl_email");
    if (!storedEmail) {
      setLocation(`/w/${slug}/login`);
      return;
    }
    setEmail(storedEmail);
  }, [slug, setLocation]);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: { email: string; code: string; name?: string; phone?: string }) => {
      const res = await apiRequest("POST", `/api/w/${slug}/auth/verify-otp`, data);
      return res.json();
    },
    onSuccess: () => {
      sessionStorage.removeItem("wl_email");
      sessionStorage.removeItem("wl_name");
      sessionStorage.removeItem("wl_phone");
      toast({
        title: "Welcome!",
        description: "You've been signed in successfully"
      });
      setLocation(`/w/${slug}/portal`);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast({ title: "Invalid Code", description: "Please enter a 6-digit code", variant: "destructive" });
      return;
    }
    const name = sessionStorage.getItem("wl_name") || undefined;
    const phone = sessionStorage.getItem("wl_phone") || undefined;
    verifyOTPMutation.mutate({ email, code, name, phone });
  };

  const handleResend = async () => {
    try {
      await apiRequest("POST", `/api/w/${slug}/auth/request-otp`, { email });
      toast({ title: "Code Sent", description: "A new verification code has been sent" });
    } catch {
      toast({ title: "Error", description: "Failed to resend code", variant: "destructive" });
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${tenant.primaryColor || "#00B4D8"}20, ${tenant.secondaryColor || "#E056A0"}20)`
      }}
    >
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: tenant.primaryColor ? `${tenant.primaryColor}20` : undefined }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: tenant.primaryColor || undefined }} />
            </div>
            <div>
              <CardTitle className="text-xl">Check your email</CardTitle>
              <CardDescription>
                We sent a verification code to<br />
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                  data-testid="input-otp"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={verifyOTPMutation.isPending || code.length !== 6}
                style={{ backgroundColor: tenant.primaryColor || undefined }}
                data-testid="button-verify"
              >
                {verifyOTPMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Verify & Sign In"
                )}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive a code?{" "}
                <button 
                  onClick={handleResend}
                  className="text-primary hover:underline"
                  type="button"
                  data-testid="button-resend"
                >
                  Resend
                </button>
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => setLocation(`/w/${slug}/login`)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Use a different email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {tenant.showPoweredBy && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Powered by <span className="font-medium gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
