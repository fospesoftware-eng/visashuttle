import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle, Info, Sparkles, Loader2, ExternalLink, Landmark, Fingerprint, Receipt, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getStoredB2cCurrency } from "@/lib/b2c-pricing";

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

interface VisaProtectionCardProps {
  deepCheckId: string;
  score: number;
  destinationCountry: string;
  visaType: string;
}

const PROTECTION_SCORE_BANDS = [
  { range: "95–100%", label: "Lowest premium" },
  { range: "90–94%", label: "Low premium" },
  { range: "80–89%", label: "Lower premium" },
  { range: "70–79%", label: "Higher premium" },
  { range: "Below 70%", label: "Not available" },
];

export function VisaProtectionCard({
  deepCheckId,
  score,
  destinationCountry,
  visaType,
}: VisaProtectionCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [statusData, setStatusData] = useState<any>(null);

  const currency = getStoredB2cCurrency();

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", `/api/b2c/visa-protection/status/${deepCheckId}?currency=${currency}`);
      const data = await res.json();
      setStatusData(data);
    } catch (err) {
      console.error("Failed to load visa protection status:", err);
    } finally {
      setLoading(false);
    }
  }, [deepCheckId, currency]);

  useEffect(() => {
    if (deepCheckId) {
      fetchStatus();
    }
  }, [deepCheckId, fetchStatus]);

  // Gateway order flow: PayPal approval redirect or Cashfree hosted checkout (mirrors Deep Check payment)
  const handlePay = async () => {
    setPaying(true);
    try {
      const res = await apiRequest("POST", "/api/b2c/payments/visa-protection/order", {
        deepCheckId,
        currency,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start the protection payment");
      if (data.alreadyActive) {
        await fetchStatus();
        return;
      }
      if (data.provider === "paypal" && data.approvalUrl) {
        window.location.href = data.approvalUrl;
        return;
      }
      if (!data.paymentSessionId) {
        throw new Error("Payment gateway did not return a checkout session");
      }
      await loadCashfreeSdk();
      const cashfree = window.Cashfree?.({ mode: data.mode === "live" ? "production" : "sandbox" });
      if (!cashfree) throw new Error("Cashfree checkout is unavailable");
      await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
    } catch (err: any) {
      toast({
        title: "Payment could not start",
        description: err.message || "Unable to start the protection payment.",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  const handleClaim = async () => {
    if (!statusData?.plan?.id) return;
    setClaiming(true);
    try {
      const res = await apiRequest("POST", "/api/b2c/visa-protection/claim", {
        planId: statusData.plan.id,
        claimReason,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit refund claim");

      toast({
        title: "Refund Claim Submitted",
        description: data.message,
      });
      setShowClaimModal(false);
      await fetchStatus();
    } catch (err: any) {
      toast({
        title: "Claim submission failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-indigo-100 dark:border-indigo-900 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-blue-50/50 p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
        <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Checking Visa Protection eligibility...</span>
      </Card>
    );
  }

  const calc = statusData?.calculation || null;
  const plan = statusData?.plan || null;
  const planStatus = plan?.status;
  const isAlreadyProtected = statusData?.exists && planStatus === "active";
  const isClaimed = statusData?.exists && planStatus === "claimed";
  const isPendingPayment = statusData?.exists && planStatus === "pending_payment";
  const isEligible = !!statusData?.purchasable;
  const formattedProtected = calc?.formattedProtectedFee || "—";
  const formattedPremium = calc?.formattedPremium || "—";
  const formattedGov = calc?.formattedGovernmentFee || "—";
  const refundableLabel = calc?.refundPolicy?.refundableLabel || "Protected government charges";
  const nonRefundable: string[] = calc?.refundPolicy?.nonRefundable || ["Deep Check fee", "Visa Protection premium"];

  const hasComponentFees = !!(calc?.formattedBiometricFee || calc?.formattedMandatoryLevy || calc?.formattedOtherCharges);

  return (
    <Card className="overflow-hidden border-2 border-indigo-200 dark:border-indigo-800 shadow-xl bg-white dark:bg-slate-900">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white p-5 md:p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48" />
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center flex-shrink-0 text-indigo-300">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-white">Visa Protection Plan</h3>
                {isAlreadyProtected && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 font-semibold">
                    ACTIVE PROTECTION
                  </Badge>
                )}
                {isClaimed && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 font-semibold">
                    REFUND CLAIM UNDER REVIEW
                  </Badge>
                )}
                {isPendingPayment && (
                  <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 font-semibold">
                    PAYMENT PENDING
                  </Badge>
                )}
                {isEligible && !statusData?.exists && (
                  <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40 font-semibold">
                    🎉 ELIGIBLE ({statusData?.approvalScore ?? score}% SCORE)
                  </Badge>
                )}
              </div>
              <p className="text-indigo-200 text-xs md:text-sm mt-0.5">
                100% refund of protected government charges if your visa is refused
              </p>
            </div>
          </div>

          {!isEligible && !statusData?.exists ? (
            <div className="text-left md:text-right flex-shrink-0">
              <span className="text-xs text-indigo-300 block font-medium">Protection Premium</span>
              <span className="text-2xl md:text-3xl font-black text-white/50">Locked</span>
            </div>
          ) : (
            <div className="text-left md:text-right flex-shrink-0">
              <span className="text-xs text-indigo-300 block font-medium">
                Protection Premium{calc?.premiumPercent ? ` (${calc.premiumPercent}%)` : ""}
              </span>
              <span className="text-2xl md:text-3xl font-black text-white">{formattedPremium}</span>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-5 md:p-6 space-y-6">
        {statusData?.exists && plan ? (
          /* ===== PLAN EXISTS (active / claimed / pending) ===== */
          <>
            {isAlreadyProtected && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                      Your Visa Application is Protected!
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      Certificate #{plan.certificateNumber} is active. If your {plan.destinationCountry || destinationCountry} {plan.visaType || visaType} application is refused after submitting valid documents, you receive a <strong>100% refund of protected government charges ({plan.feeSnapshot?.formattedProtectedFee || formattedProtected})</strong>.
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1.5">
                      Not refunded: {nonRefundable.join(" · ")}
                    </p>
                  </div>
                </div>
                {!isClaimed && (
                  <div className="pt-2 flex justify-end">
                    <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold" onClick={() => setShowClaimModal(true)}>
                      Submit Visa Refusal Claim
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isClaimed && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 dark:text-amber-100 text-sm">Refund claim under review</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                      Our claims team is verifying your refusal documents. Once approved, {plan.feeSnapshot?.formattedProtectedFee || formattedProtected} in protected government charges will be refunded to your original payment method within 48 hours. {nonRefundable.join(" and ")} are not refunded.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isPendingPayment && (
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 space-y-3">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sky-900 dark:text-sky-100 text-sm">Payment not completed</h4>
                    <p className="text-xs text-sky-800 dark:text-sky-300 mt-1">
                      Your protection plan is reserved at {formattedPremium} but activates only after successful payment.
                    </p>
                  </div>
                </div>
                <div className="pt-1 flex justify-end">
                  <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold" onClick={handlePay} disabled={paying}>
                    {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="w-4 h-4 mr-1.5" />}
                    Resume Payment — {formattedPremium}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : isEligible && calc ? (
          /* ===== ELIGIBLE — PURCHASE UI ===== */
          <>
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-sm">
                    Your Deep Check score of {statusData?.approvalScore ?? score}% qualifies you for Visa Protection
                  </h4>
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1">
                    Premium band <strong>{calc.scoreBand?.label || "—"}</strong>
                    {calc.destinationRiskFactor ? <> · destination risk factor <strong>×{calc.destinationRiskFactor}</strong></> : null}
                    . Pay once today — if your visa is refused, your protected government charges are refunded in full.
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="rounded-xl border overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b flex items-center gap-2">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visa Fee Breakdown — {calc.destinationCountry}</span>
              </div>
              <div className="divide-y text-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2 text-muted-foreground"><Landmark className="w-3.5 h-3.5" /> Government visa fee</span>
                  <span className="font-semibold">{formattedGov}</span>
                </div>
                {hasComponentFees && (
                  <>
                    {(calc.formattedBiometricFee || "").trim() && Number(calc.biometricFeeMinor) > 0 && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="flex items-center gap-2 text-muted-foreground"><Fingerprint className="w-3.5 h-3.5" /> Biometric fee</span>
                        <span className="font-semibold">{calc.formattedBiometricFee}</span>
                      </div>
                    )}
                    {Number(calc.mandatoryLevyMinor) > 0 && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-muted-foreground pl-[22px]">Mandatory levy</span>
                        <span className="font-semibold">{calc.formattedMandatoryLevy}</span>
                      </div>
                    )}
                    {Number(calc.otherChargesMinor) > 0 && (
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-muted-foreground pl-[22px]">Other government charges</span>
                        <span className="font-semibold">{calc.formattedOtherCharges}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 dark:bg-slate-800/30">
                  <span className="font-semibold text-foreground">Protected charges (100% refundable)</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{formattedProtected}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/70 dark:bg-indigo-950/30">
                  <span className="font-bold text-indigo-950 dark:text-indigo-100">
                    Visa Protection premium
                    <span className="ml-2 text-[11px] font-semibold text-indigo-500 dark:text-indigo-300">
                      {calc.premiumPercent}% of protected charges
                    </span>
                  </span>
                  <span className="text-lg font-black text-indigo-900 dark:text-indigo-100">{formattedPremium}</span>
                </div>
              </div>
            </div>

            {/* Refund Policy */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">If visa is REFUSED</span>
                <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100 mt-1 block">{refundableLabel}</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">100% refund · {formattedProtected}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
                <span className="text-xs font-semibold text-muted-foreground block">If visa is APPROVED</span>
                <span className="text-sm font-bold text-foreground mt-1 block">Coverage closes</span>
                <span className="text-[11px] text-muted-foreground font-medium">Non-refundable: {nonRefundable.join(", ")}</span>
              </div>
            </div>

            {/* How Protection Works Checklist */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How Visa Protection Works</h5>
              <div className="grid gap-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Full Fee Guarantee:</strong> 100% refund of protected government charges (visa fee + mandatory levies) if your visa is refused.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Valid Documents Requirement:</strong> Complete your application with the required checklist documents.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Fast Claims Processing:</strong> Payout to your original payment method within 48 hours of claim approval.</span>
                </div>
              </div>
            </div>

            {calc.officialSource && (
              <a href={calc.officialSource} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2">
                Official fee source (verified {calc.lastVerifiedAt || "recently"})
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span>Secure checkout · Activated immediately after payment</span>
              </div>
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/20"
                onClick={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening secure checkout...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Pay & Activate Protection — {formattedPremium}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* ===== INELIGIBLE ===== */
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-foreground text-sm">Visa Protection Plan not available</h4>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[11px]">
                    Requires {statusData?.requiredScore ?? 70}%+ Deep Check Score
                  </Badge>
                </div>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1.5 leading-relaxed list-disc pl-4">
                  {(statusData?.ineligibleReasons?.length
                    ? statusData.ineligibleReasons
                    : ["Deep Check score is below the minimum required for Visa Protection."]
                  ).map((reason: string, i: number) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Score band reference */}
            <div className="p-3.5 rounded-lg border bg-background">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Protection availability by Deep Check score</h5>
              <div className="grid gap-1.5 text-xs">
                {PROTECTION_SCORE_BANDS.map((band) => (
                  <div key={band.range} className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{band.range}</span>
                    <span className={band.label === "Not available" ? "text-rose-600 dark:text-rose-400 font-medium" : "text-emerald-600 dark:text-emerald-400 font-medium"}>
                      {band.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <strong className="block mb-1">💡 How to unlock Visa Protection:</strong>
              Follow the AI Action Plan recommendations below to resolve financial &amp; document risks and raise your profile score to {statusData?.requiredScore ?? 70}%+.
            </div>
          </div>
        )}

        {/* Claim Modal */}
        {showClaimModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-base">Submit Refusal Refund Claim</h3>
                </div>
                <button onClick={() => setShowClaimModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <p>
                  We are sorry your visa was refused. Under your Visa Protection Certificate #{statusData?.plan?.certificateNumber}, you are entitled to a <strong>100% refund of protected government charges ({statusData?.plan?.feeSnapshot?.formattedProtectedFee || formattedProtected})</strong>.
                </p>
                <p className="text-[11px]">
                  Non-refundable: {nonRefundable.join(", ")}.
                </p>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Refusal Reason / Embassy Remarks:</label>
                  <textarea
                    className="w-full rounded-lg border p-2.5 bg-background text-foreground text-xs focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="Briefly state the refusal reason provided by the embassy..."
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowClaimModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleClaim} disabled={claiming}>
                  {claiming ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Submit Refund Claim
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
