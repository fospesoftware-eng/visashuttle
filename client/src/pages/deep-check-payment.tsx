import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, CreditCard, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_self" | "_blank" | "_modal" }) => Promise<unknown>;
    };
  }
}

function loadCashfreeSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Cashfree checkout")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Cashfree checkout"));
    document.body.appendChild(script);
  });
}

export default function DeepCheckPaymentPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const orderId = useMemo(() => new URLSearchParams(window.location.search).get("order_id"), []);
  const isReturn = window.location.pathname.includes("/return");

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (!user || !isReturn || !orderId) return;
    let cancelled = false;
    async function verify() {
      setIsVerifying(true);
      setError("");
      try {
        const res = await apiRequest("GET", `/api/b2c/payments/deep-check/order/${orderId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.paid || data.deepCheckAccess) {
          await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
          toast({ title: "Payment successful", description: "Deep Check is now unlocked." });
          setLocation("/deep-check");
        } else {
          setError(`Payment status: ${data.status || "Pending"}. Please complete the payment to unlock Deep Check.`);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not verify payment");
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [isReturn, orderId, setLocation, toast, user]);

  async function startPayment() {
    setIsStarting(true);
    setError("");
    try {
      const res = await apiRequest("POST", "/api/b2c/payments/deep-check/order");
      const data = await res.json();
      if (data.alreadyActive) {
        setLocation(data.redirectUrl || "/deep-check");
        return;
      }
      if (!data.paymentSessionId) {
        throw new Error("Cashfree did not return a payment session");
      }
      await loadCashfreeSdk();
      const cashfree = window.Cashfree?.({ mode: data.mode === "live" ? "production" : "sandbox" });
      if (!cashfree) throw new Error("Cashfree checkout is unavailable");
      await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (err: any) {
      setError(err.message || "Could not start payment");
      setIsStarting(false);
    }
  }

  if (authLoading || !user) return null;

  return (
    <DashboardLayout title="Deep Check Payment" subtitle="Unlock embassy-style AI visa analysis">
      <div className="max-w-4xl grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-300" />
              </div>
              <Badge className="bg-amber-400/20 text-amber-200 border-amber-300/30">50% Discount</Badge>
            </div>
            <CardTitle className="text-2xl md:text-3xl mt-6">Deep Check AI Analysis</CardTitle>
            <p className="text-blue-100 leading-relaxed">
              Pay securely with Cashfree and unlock your Deep Check report workflow immediately after successful payment.
            </p>
          </CardHeader>
          <CardContent className="p-7 space-y-5">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black">₹500</span>
              <span className="text-muted-foreground line-through pb-1">₹1,000</span>
              <span className="text-sm font-medium text-emerald-600 pb-1">Limited offer</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { icon: Sparkles, text: "AI score and risk analysis" },
                { icon: ShieldCheck, text: "Action plan and document gaps" },
                { icon: CheckCircle2, text: "Deep Check access unlocked" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="rounded-xl border bg-muted/30 p-4 text-sm font-medium">
                  <Icon className="w-4 h-4 text-[#4055FF] mb-2" />
                  {text}
                </div>
              ))}
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {isReturn ? (
              <Button disabled className="w-full h-12 gap-2">
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {isVerifying ? "Verifying payment..." : "Payment verification required"}
              </Button>
            ) : (
              <Button
                onClick={startPayment}
                disabled={isStarting}
                className="w-full h-12 gap-2 border-0 text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                data-testid="button-start-deep-check-payment"
              >
                {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {isStarting ? "Opening Cashfree..." : "Pay ₹500 with Cashfree"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-base">Secure Checkout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Payment is processed by Cashfree using the active test/live gateway mode configured in SaaS Admin.</p>
            <p>After payment, you will be returned here and Deep Check access will be enabled automatically.</p>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/pricing")}>
              Back to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
