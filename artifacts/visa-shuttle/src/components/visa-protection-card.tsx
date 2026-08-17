import { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, CheckCircle, Info, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getStoredB2cCurrency } from "@/lib/b2c-pricing";

interface VisaProtectionCardProps {
  deepCheckId: string;
  score: number;
  destinationCountry: string;
  visaType: string;
}

export function VisaProtectionCard({
  deepCheckId,
  score,
  destinationCountry,
  visaType,
}: VisaProtectionCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [statusData, setStatusData] = useState<any>(null);

  const currency = getStoredB2cCurrency();

  const fetchStatus = async () => {
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
  };

  useEffect(() => {
    if (deepCheckId) {
      fetchStatus();
    }
  }, [deepCheckId, currency]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await apiRequest("POST", "/api/b2c/visa-protection/activate", {
        deepCheckId,
        currency,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to activate protection plan");
      
      toast({
        title: "🛡️ Visa Protection Activated!",
        description: data.message || "You are covered for 100% refund of your official visa fee in case of rejection.",
      });
      await fetchStatus();
    } catch (err: any) {
      toast({
        title: "Activation failed",
        description: err.message || "Unable to activate protection plan.",
        variant: "destructive",
      });
    } finally {
      setActivating(false);
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
        <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Loading Visa Protection Plan status...</span>
      </Card>
    );
  }

  const calculation = statusData?.calculation || {
    formattedVisaFee: "$185",
    formattedProtectionFee: "$37",
    protectionRatePercentage: 20,
    refundCoveragePercentage: 100,
  };

  const isEligible = score >= 80;
  const isAlreadyProtected = statusData?.exists && statusData?.plan?.status === "active";
  const isClaimed = statusData?.exists && statusData?.plan?.status === "claimed";

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
                {isEligible && !statusData?.exists && (
                  <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40 font-semibold">
                    🎉 QUALIFIED (80%+ SCORE)
                  </Badge>
                )}
              </div>
              <p className="text-indigo-200 text-xs md:text-sm mt-0.5">
                100% Refund of Official Government Visa Fees in case of rejection
              </p>
            </div>
          </div>

          <div className="text-left md:text-right flex-shrink-0">
            <span className="text-xs text-indigo-300 block font-medium">Add-on Cost (20% of Fee)</span>
            <span className="text-2xl md:text-3xl font-black text-white">{calculation.formattedProtectionFee}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-5 md:p-6 space-y-6">
        {/* ELIGIBILITY: QUALIFIED (SCORE >= 80) */}
        {isEligible ? (
          <>
            {isAlreadyProtected ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                      Your Visa Application is Protected!
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      Certificate #{statusData.plan.certificateNumber} is active. If your {destinationCountry} {visaType} is rejected after submitting valid documents, you receive a <strong>100% refund ({calculation.formattedVisaFee})</strong> of your government visa fee.
                    </p>
                  </div>
                </div>
                {!isClaimed && (
                  <div className="pt-2 flex justify-end">
                    <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold" onClick={() => setShowClaimModal(true)}>
                      Submit Visa Rejection Claim
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-indigo-950 dark:text-indigo-100 text-sm">
                      Congratulations! Your Deep Check Score qualifies you for 100% Visa Fee Protection
                    </h4>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300 mt-1">
                      Your high AI approval rating of <strong>{score}%</strong> unlocks our risk-free protection guarantee. Pay only 20% of your government visa fee today to safeguard your entire application fee.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Breakdown Grid */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border text-center">
                <span className="text-xs text-muted-foreground block font-medium">Government Visa Fee</span>
                <span className="text-lg font-bold text-foreground mt-0.5 block">{calculation.formattedVisaFee}</span>
                <span className="text-[11px] text-muted-foreground">Official Embassy Charge</span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
                <span className="text-xs text-indigo-700 dark:text-indigo-300 block font-semibold">Protection Cost (20%)</span>
                <span className="text-lg font-black text-indigo-900 dark:text-indigo-100 mt-0.5 block">{calculation.formattedProtectionFee}</span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">One-time add-on</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block font-semibold">Refund Coverage</span>
                <span className="text-lg font-black text-emerald-900 dark:text-emerald-100 mt-0.5 block">100% FULL REFUND</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Covered in full: {calculation.formattedVisaFee}</span>
              </div>
            </div>

            {/* How Protection Works Checklist */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How Visa Protection Works</h5>
              <div className="grid gap-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Full Fee Guarantee:</strong> Receive 100% refund of official embassy fees if your visa is rejected.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Valid Documents Requirement:</strong> Complete your application with valid required checklist documents.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span><strong>Fast Claims Processing:</strong> Direct payout to your original payment method within 48 hours.</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!isAlreadyProtected && !isClaimed && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t">
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                  <span>Guaranteed by Visa Shuttle Protection Policy</span>
                </div>
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-indigo-500/20"
                  onClick={handleActivate}
                  disabled={activating}
                >
                  {activating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Activating Protection...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Activate Visa Protection — {calculation.formattedProtectionFee}
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          /* INELIGIBLE (SCORE < 80) */
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-foreground text-sm">
                    Visa Protection Plan Locked
                  </h4>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[11px]">
                    Requires 80%+ Deep Check Score
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Visa Protection is reserved for applications with an <strong>80%+ AI approval rating</strong>. Your current Deep Check score is <strong className="text-foreground">{score}%</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <strong className="block mb-1">💡 How to unlock 100% Visa Protection:</strong>
              Follow the AI Action Plan recommendations below to resolve financial & document risks and boost your profile score to 80%+.
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
                  <h3 className="font-bold text-base">Submit Rejection Refund Claim</h3>
                </div>
                <button onClick={() => setShowClaimModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <p>
                  We are sorry to hear your visa was rejected. Under your Visa Protection Certificate #{statusData?.plan?.certificateNumber}, you are entitled to a <strong>100% refund ({calculation.formattedVisaFee})</strong> of your government visa fee.
                </p>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Rejection Reason / Embassy Remarks:</label>
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
