import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Coins, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { B2C_CURRENCIES, B2C_CURRENCY_FLAGS, type B2cCurrency, formatB2cPrice, getStoredB2cCurrency, storeB2cCurrency } from "@/lib/b2c-pricing";

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

export default function VisaToolsCreditPaymentPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());
  const [units, setUnits] = useState(1);
  const [isStarting, setIsStarting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const orderId = useMemo(() => new URLSearchParams(window.location.search).get("order_id"), []);
  const isReturn = window.location.pathname.includes("/return");

  const { data: credits } = useQuery<{ remainingCredits: number; pricing: { unit: number; amountPerUnit: number } }>({
    queryKey: ["/api/b2c/visa-tools/credits", currency],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/b2c/visa-tools/credits?currency=${currency}`);
      return res.json();
    },
    enabled: !!user,
  });

  const unitCredits = credits?.pricing?.unit ?? 100;
  const amountPerUnit = credits?.pricing?.amountPerUnit ?? 2;
  const totalCredits = units * unitCredits;
  const totalAmount = units * amountPerUnit;

  useEffect(() => {
    if (!authLoading && !user) setLocation(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (!user || !isReturn || !orderId) return;
    let cancelled = false;
    async function verify() {
      setIsVerifying(true);
      try {
        const res = await apiRequest("GET", `/api/b2c/payments/visa-tools-credits/order/${orderId}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.paid) {
          await queryClient.invalidateQueries({ queryKey: ["/api/b2c/visa-tools/credits"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/b2c/visa-tools/credits", currency] });
          setSuccess(true);
          toast({ title: "Credits activated", description: `${data.credits} Visa Tools credits added.` });
        } else {
          setError(`Payment status: ${data.status || "Pending"}`);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not verify payment");
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [isReturn, orderId, toast, user]);

  async function startPayment() {
    setIsStarting(true);
    setError("");
    try {
      storeB2cCurrency(currency);
      const res = await apiRequest("POST", "/api/b2c/payments/visa-tools-credits/order", { currency, units });
      const data = await res.json();
      if (!data.paymentSessionId) throw new Error("Cashfree did not return a payment session");
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

  if (success) {
    return (
      <DashboardLayout title="Visa Tools Credits" subtitle="Credits added successfully">
        <Card className="max-w-3xl border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <Badge className="mb-3 bg-emerald-100 text-emerald-700 border-0">Payment Successful</Badge>
            <h1 className="text-3xl font-black tracking-tight">Visa Tools credits are ready</h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">You can now continue running AI-assisted Visa Tools checks.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => setLocation("/visa-tools")}>Open Visa Tools</Button>
              <Button variant="outline" onClick={() => setLocation("/account")}>Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Buy Visa Tools Credits" subtitle="100 credits are used per tool check">
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden border-0 shadow-sm">
          <CardHeader className="bg-gradient-to-br from-[#4055FF] to-[#9033F5] text-white">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Coins className="h-6 w-6" />
              </div>
              <Badge className="bg-white/15 text-white border-white/20">Pay as you go</Badge>
            </div>
            <CardTitle className="mt-5 text-2xl">Additional Visa Tools Credits</CardTitle>
            <p className="text-sm text-blue-100">Each Visa Tools check burns 100 credits. Buy credits in multiples of 100.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Remaining credits</p>
                <p className="mt-1 text-3xl font-black">{credits?.remainingCredits ?? 0}</p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Selected top-up</p>
                <p className="mt-1 text-3xl font-black">{totalCredits}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Credit units</label>
              <Input type="number" min={1} max={100} value={units} onChange={e => setUnits(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
              <p className="text-xs text-muted-foreground">{unitCredits} credits per unit at {formatB2cPrice(currency, amountPerUnit)} per unit.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/30 p-2">
              <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currency</span>
              {B2C_CURRENCIES.map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => { setCurrency(code); storeB2cCurrency(code); }}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${currency === code ? "bg-slate-950 text-white" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
                  disabled={isStarting || isReturn}
                >
                  <span className="mr-1.5">{B2C_CURRENCY_FLAGS[code]}</span>{code}
                </button>
              ))}
            </div>

            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {isReturn ? (
              <Button disabled className="h-12 w-full gap-2">
                {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {isVerifying ? "Verifying payment..." : "Payment verification required"}
              </Button>
            ) : (
              <Button onClick={startPayment} disabled={isStarting} className="h-12 w-full gap-2 border-0 text-white bg-gradient-to-r from-[#4055FF] to-[#FF2060]">
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {isStarting ? "Opening Cashfree..." : `Pay ${formatB2cPrice(currency, totalAmount)} with Cashfree`}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit shadow-sm">
          <CardHeader><CardTitle className="text-base">How Credits Work</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-[#4055FF]" /><p>One Visa Tools analysis uses 100 credits after a successful AI result.</p></div>
            <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 text-[#4055FF]" /><p>Plan credits are included automatically. Paid credits are added after Cashfree confirms payment.</p></div>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/visa-tools")}>Back to Visa Tools</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
