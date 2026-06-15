import { useMemo } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { type B2cCurrency, getStoredB2cCurrency } from "@/lib/b2c-pricing";

function safeCurrency(value: string | null): B2cCurrency {
  const code = String(value || getStoredB2cCurrency()).toUpperCase();
  return (["USD", "GBP", "EUR", "INR", "AED", "BHD"].includes(code) ? code : "USD") as B2cCurrency;
}

export default function PaymentFailurePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useB2cAuth();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const status = params.get("status");
  const reason = params.get("reason");
  const provider = params.get("provider") || "gateway";
  const plan = params.get("plan") === "pro" ? "pro" : "deep";
  const currency = safeCurrency(params.get("currency"));
  const retryUrl = `/payment/deep-check?plan=${plan}&currency=${currency}`;

  if (isLoading || !user) return null;

  return (
    <DashboardLayout title="Payment Unsuccessful" subtitle="Your Deep Check access was not activated">
      <div className="max-w-4xl">
        <Card className="overflow-hidden border-red-200 bg-white shadow-sm dark:border-red-900/60 dark:bg-slate-900">
          <CardContent className="p-0">
            <div className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-amber-50 p-8 text-center dark:from-red-950/35 dark:via-slate-950 dark:to-amber-950/20 md:p-12">
              <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-red-500/10 blur-3xl" />
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/70 dark:text-red-300">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <Badge className="mb-4 border-0 bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-200">
                Payment not completed
              </Badge>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                We could not activate Deep Check
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                The payment gateway did not confirm a successful payment. No Deep Check access was unlocked for this attempt.
              </p>

              <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-red-100 bg-white/80 p-4 text-left text-sm shadow-sm dark:border-red-900/50 dark:bg-slate-900/80">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gateway</p>
                    <p className="mt-1 font-bold capitalize text-slate-800 dark:text-slate-100">{provider}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-slate-100">{status || reason || "Payment failed or canceled"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => setLocation(retryUrl)}
                  className="gap-2 border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] text-white hover:opacity-90"
                  data-testid="button-retry-deep-check-payment"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Payment
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLocation("/pricing")} className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Back to Pricing
                </Button>
                <Button size="lg" variant="ghost" onClick={() => setLocation("/account")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
