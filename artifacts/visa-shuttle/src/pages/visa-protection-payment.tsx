import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest } from "@/lib/queryClient";

function readCheckoutJson(res: Response) {
  return res.json().catch(() => ({}));
}

export default function VisaProtectionPaymentPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [certificate, setCertificate] = useState<string | null>(null);
  const [error, setError] = useState("");

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderId = params.get("order_id") || params.get("token");
  const paymentProvider = params.get("provider");
  const reason = params.get("reason");
  const isFailure = window.location.pathname.includes("/failure");

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (isFailure || !user || !orderId) return;
    let cancelled = false;
    async function verify() {
      setIsVerifying(true);
      setError("");
      try {
        const query = paymentProvider === "paypal" ? "?provider=paypal" : "";
        const res = await apiRequest("GET", `/api/b2c/payments/visa-protection/order/${orderId}${query}`);
        const data = await readCheckoutJson(res);
        if (cancelled) return;
        if (data.paid) {
          setCertificate(data.plan?.certificateNumber || null);
          setIsSuccess(true);
        } else if (data.plan && ["active", "claimed"].includes(data.plan.status)) {
          setCertificate(data.plan.certificateNumber || null);
          setIsSuccess(true);
        } else {
          setError(`Payment status: ${data.status || "Pending"}. Your protection activates only after the gateway confirms the payment.`);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Could not verify the payment");
      } finally {
        if (!cancelled) setIsVerifying(false);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [isFailure, orderId, paymentProvider, user]);

  if (authLoading || !user) return null;

  /* ===== FAILURE / CANCEL ===== */
  if (isFailure || (!isSuccess && !isVerifying && orderId)) {
    return (
      <DashboardLayout title="Payment Unsuccessful" subtitle="Your Visa Protection Plan was not activated">
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
                  Visa Protection was not activated
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                  {isFailure
                    ? reason === "canceled"
                      ? "You canceled the checkout. No charge was made and your protection plan stays inactive."
                      : "The payment gateway did not confirm a successful payment. Your protection plan remains inactive."
                    : error || "We could not confirm this payment. Your protection plan remains inactive until the gateway confirms it."}
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={() => setLocation("/deep-check")}
                    className="gap-2 border-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Back to Deep Check
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setLocation("/account")} className="gap-2">
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

  /* ===== SUCCESS ===== */
  if (isSuccess) {
    return (
      <DashboardLayout title="Visa Protection Activated" subtitle="Your application is now covered">
        <div className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border bg-white shadow-sm"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.16),transparent_45%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.10),transparent_35%)]" />
            <div className="relative p-8 md:p-12 text-center">
              <div className="relative mx-auto mb-7 w-28 h-28">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border border-indigo-400/30"
                    initial={{ scale: 0.35, opacity: 0.75 }}
                    animate={{ scale: 1.6 + i * 0.22, opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.28, ease: "easeOut" }}
                  />
                ))}
                <motion.div
                  initial={{ scale: 0.65, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 12 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20"
                >
                  <ShieldCheck className="w-14 h-14 text-white" />
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }}>
                <Badge className="mb-4 bg-emerald-100 text-emerald-700 border-0">Payment Successful</Badge>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 mb-4">Protection Activated!</h1>
                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Your Visa Protection Plan is now active. If your visa application is refused, your protected government charges are refunded in full.
                </p>
                {certificate && (
                  <p className="mt-3 text-sm font-mono font-semibold text-indigo-700 dark:text-indigo-300">
                    Certificate #{certificate}
                  </p>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.35 }} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => setLocation("/deep-check")}
                  className="gap-2 border-0 text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
                  data-testid="button-back-to-deep-check"
                >
                  Continue with your visa application
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLocation("/account")} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Back to Dashboard
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  /* ===== VERIFYING ===== */
  return (
    <DashboardLayout title="Verifying Payment" subtitle="Confirming your Visa Protection payment">
      <div className="max-w-4xl">
        <Card className="border-indigo-100 dark:border-indigo-900 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-blue-50/50 p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Verifying your payment with the gateway...</span>
          <span className="text-xs text-muted-foreground mt-1">This takes only a few seconds. Do not close this page.</span>
        </Card>
      </div>
    </DashboardLayout>
  );
}
