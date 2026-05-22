import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, CreditCard, Crown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  B2C_CURRENCIES,
  B2C_DEEP_CHECK_PRICES,
  type B2cCurrency,
  formatB2cPrice,
  getStoredB2cCurrency,
  storeB2cCurrency,
} from "@/lib/b2c-pricing";

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());

  const orderId = useMemo(() => new URLSearchParams(window.location.search).get("order_id"), []);
  const isReturn = window.location.pathname.includes("/return");
  const selectedPrice = B2C_DEEP_CHECK_PRICES[currency];
  const priceLabel = formatB2cPrice(currency);

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
          setIsSuccess(true);
          toast({ title: "Deep Check activated", description: "Your Deep Check access is now ready." });
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
      storeB2cCurrency(currency);
      const res = await apiRequest("POST", "/api/b2c/payments/deep-check/order", { currency });
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

  if (isSuccess) {
    return (
      <DashboardLayout title="Deep Check Activated" subtitle="Your AI analysis access is ready">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border bg-white shadow-sm"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(64,85,255,0.16),transparent_45%),radial-gradient(circle_at_90%_20%,rgba(255,32,96,0.10),transparent_35%)]" />
            <div className="relative p-8 md:p-12 text-center">
              <div className="relative mx-auto mb-7 w-28 h-28">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border border-emerald-400/30"
                    initial={{ scale: 0.35, opacity: 0.75 }}
                    animate={{ scale: 1.6 + i * 0.22, opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.28, ease: "easeOut" }}
                  />
                ))}
                <motion.div
                  initial={{ scale: 0.65, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 12 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-[#4055FF] flex items-center justify-center shadow-xl shadow-emerald-500/20"
                >
                  <CheckCircle2 className="w-14 h-14 text-white" />
                </motion.div>
                {[...Array(10)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: i % 2 === 0 ? "#4055FF" : "#FF2060",
                    }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                    animate={{
                      x: Math.cos((i / 10) * Math.PI * 2) * 88,
                      y: Math.sin((i / 10) * Math.PI * 2) * 68,
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.6],
                    }}
                    transition={{ duration: 1.4, delay: 0.2 + i * 0.04, ease: "easeOut" }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
              >
                <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-0">Payment Successful</Badge>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 mb-4">
                  Congratulations!
                </h1>
                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  You have successfully activated Deep Check. Your embassy-style AI visa analysis is ready to explore.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38, duration: 0.35 }}
                className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button
                  size="lg"
                  onClick={() => setLocation("/deep-check")}
                  className="gap-2 border-0 text-white bg-gradient-to-r from-[#4055FF] to-[#FF2060] hover:opacity-90"
                  data-testid="button-explore-deep-check"
                >
                  Explore Deep Check
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLocation("/account")}>
                  Back to Dashboard
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Deep Check Payment" subtitle="Unlock embassy-style AI visa analysis">
      <div className="max-w-4xl grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 text-white p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-300" />
              </div>
              <Badge className="bg-white/10 text-white border-white/20">One-time payment</Badge>
            </div>
            <CardTitle className="text-2xl md:text-3xl mt-6">Deep Check AI Analysis</CardTitle>
            <p className="text-blue-100 leading-relaxed">
              Pay securely with Cashfree and unlock your Deep Check report workflow immediately after successful payment.
            </p>
          </CardHeader>
          <CardContent className="p-7 space-y-5">
            <div className="space-y-3">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black">{priceLabel}</span>
                <span className="text-sm font-medium text-muted-foreground pb-1">per Deep Check</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/30 p-2">
                <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currency</span>
                {B2C_CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setCurrency(code);
                      storeB2cCurrency(code);
                    }}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                      currency === code
                        ? "bg-slate-950 text-white"
                        : "text-muted-foreground hover:bg-background hover:text-foreground"
                    }`}
                    disabled={isStarting || isReturn}
                  >
                    {code}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Checkout amount: {priceLabel} {currency !== "AED" ? currency : ""} ({selectedPrice.label})
              </p>
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
                {isStarting ? "Opening Cashfree..." : `Pay ${priceLabel} with Cashfree`}
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
