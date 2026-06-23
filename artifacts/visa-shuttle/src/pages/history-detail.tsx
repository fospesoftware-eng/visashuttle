import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Info,
  Loader2,
  Mail,
  TrendingUp,
} from "lucide-react";
import { NextStepsSection } from "@/components/next-steps-section";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VisaCheck {
  id: string;
  checkType: string;
  formData: Record<string, string>;
  aiProvider: string;
  approvalChance: number | null;
  statusLabel: string | null;
  aiResponse: any;
  createdAt: string;
}

function scoreTheme(score: number | null) {
  if (score === null) return { grad: "from-slate-500 to-slate-700", badge: "bg-slate-100 text-slate-700", bar: "bg-slate-500" };
  if (score >= 80) return { grad: "from-emerald-500 to-teal-500", badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 60) return { grad: "from-[#4055FF] to-[#9033F5]", badge: "bg-blue-100 text-blue-700", bar: "bg-blue-500" };
  if (score >= 40) return { grad: "from-amber-500 to-orange-400", badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500" };
  return { grad: "from-red-500 to-rose-500", badge: "bg-red-100 text-red-700", bar: "bg-red-500" };
}

function ListSection({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string;
  icon: any;
  items?: string[];
  tone: "green" | "red" | "amber" | "blue" | "slate";
}) {
  const colors = {
    green: "bg-emerald-50 border-emerald-100 text-emerald-800",
    red: "bg-red-50 border-red-100 text-red-800",
    amber: "bg-amber-50 border-amber-100 text-amber-800",
    blue: "bg-blue-50 border-blue-100 text-blue-800",
    slate: "bg-slate-50 border-slate-100 text-slate-700",
  }[tone];

  if (!items?.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className={`flex gap-2 p-3 rounded-lg border text-sm ${colors}`}>
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{item}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DimBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-700">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-[#4055FF]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function FieldGrid({ formData }: { formData: Record<string, string> }) {
  const entries = Object.entries(formData).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!entries.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Submitted Answers
        </CardTitle>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1">
              {key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase())}
            </p>
            <p className="text-sm font-medium text-slate-800 break-words">{String(value)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function HistoryDetailPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/history/:id");
  const id = params?.id;
  const { toast } = useToast();
  const [isEmailingReport, setIsEmailingReport] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
  }, [user, authLoading]);

  const { data: check, isLoading, isError } = useQuery<VisaCheck>({
    queryKey: [`/api/b2c/checks/${id}`],
    enabled: !!user && !!id,
  });

  if (authLoading || !user) return null;

  if (isLoading) {
    return (
      <DashboardLayout title="Check Result" subtitle="Loading saved assessment">
        <div className="max-w-5xl space-y-4">
          <div className="h-52 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-40 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            <div className="h-40 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !check) {
    return (
      <DashboardLayout title="Check Result" subtitle="Saved assessment">
        <div className="max-w-xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h2 className="font-semibold text-slate-900 mb-2">Result not found</h2>
              <p className="text-sm text-slate-500 mb-5">This saved check may have been removed or is not available on your account.</p>
              <Link href="/history">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const form = check.formData || {};
  const result = check.aiResponse || {};
  const score = check.approvalChance ?? result.approvalChance ?? null;
  const theme = scoreTheme(score);
  const dims = result.dimensionScores;
  const riskItems = result.riskDetails?.length
    ? result.riskDetails.map((risk: any) => `${risk.factor || "Risk"}: ${risk.detail || risk.mitigation || ""}`.trim())
    : result.riskFactors;
  const date = check.createdAt
    ? new Date(check.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Saved check";
  const canUseDeepReport = check.checkType === "deep" && Boolean(user.deepCheckAccess || ["deep", "pro", "demo"].includes(String(user.subscriptionPlan || "").toLowerCase()));
  const downloadDeepReport = () => {
    if (!canUseDeepReport) return;
    window.open(`/api/b2c/deep-checks/${check.id}/pdf`, "_blank", "noopener,noreferrer");
  };
  const emailDeepReport = async () => {
    if (!canUseDeepReport) return;
    setIsEmailingReport(true);
    try {
      await apiRequest("POST", `/api/b2c/deep-checks/${check.id}/email`, {});
      toast({ title: "Report emailed", description: `Your Deep Check PDF was sent to ${user.email}.` });
    } catch (err: any) {
      toast({ title: "Email failed", description: err.message || "Please check email settings and try again.", variant: "destructive" });
    } finally {
      setIsEmailingReport(false);
    }
  };

  return (
    <DashboardLayout title="Saved Visa Result" subtitle={`${form.visaType || check.checkType} → ${form.destinationCountry || "Destination"}`}>
      <div className="max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/history">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to History
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {date}
          </div>
          {canUseDeepReport && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadDeepReport}>
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={emailDeepReport} disabled={isEmailingReport}>
                {isEmailingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Email PDF
              </Button>
            </div>
          )}
        </div>

        <Card className="overflow-hidden border-0 shadow-xl">
          <div className={`bg-gradient-to-br ${theme.grad} p-6 md:p-8 text-white`}>
            <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge className="bg-white/20 text-white border-0 capitalize">{check.checkType} check</Badge>
                  {check.aiProvider && <Badge className="bg-white/20 text-white border-0">AI: {check.aiProvider}</Badge>}
                </div>
                <p className="text-white/75 text-sm mb-1">AI Approval Estimate</p>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-2">{form.visaType || "Visa Check"}</h2>
                <p className="text-white/90 text-sm">
                  {form.nationality || "Traveler"} → <span className="font-semibold">{form.destinationCountry || "Destination"}</span>
                </p>
              </div>
              <div className="md:text-right flex-shrink-0">
                <div className="text-5xl md:text-7xl font-black leading-none">{score ?? "—"}{score !== null ? "%" : ""}</div>
                <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-bold ${theme.badge}`}>
                  {check.statusLabel || result.statusLabel || "Saved Result"}
                </div>
              </div>
            </div>
            {score !== null && (
              <div className="mt-5 h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${score}%` }} />
              </div>
            )}
          </div>

          {(result.summary || result.finalRecommendation) && (
            <CardContent className="p-5 md:p-6 bg-white">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Brain className="w-5 h-5 text-[#4055FF] flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  {result.summary && <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>}
                  {result.finalRecommendation && <p className="text-sm font-semibold text-slate-900">{result.finalRecommendation}</p>}
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {dims && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Profile Dimension Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              <DimBar label="Financial Strength" value={dims.financial ?? 0} />
              <DimBar label="Document Completeness" value={dims.documents ?? 0} />
              <DimBar label="Travel History" value={dims.travelHistory ?? 0} />
              <DimBar label="Home Country Ties" value={dims.homeTies ?? 0} />
              <DimBar label="Visa Profile Match" value={dims.visaProfile ?? 0} />
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <ListSection title="Profile Strengths" icon={CheckCircle} items={result.strengths} tone="green" />
          <ListSection title="Risk Factors" icon={AlertCircle} items={riskItems} tone="red" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ListSection title="Required Documents" icon={FileText} items={result.requiredDocuments} tone="blue" />
          <ListSection title="Missing Documents" icon={AlertCircle} items={result.missingDocuments} tone="amber" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ListSection title="Country Specific Concerns" icon={Info} items={result.countrySpecificConcerns} tone="amber" />
          <ListSection title="Improvement Tips" icon={TrendingUp} items={result.improvementTips} tone="blue" />
        </div>

        {result.actionPlan?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BadgeCheck className="w-4 h-4" />
                Action Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.actionPlan.map((item: any, index: number) => (
                <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {item.priority && <Badge variant="secondary" className="text-[10px] uppercase">{item.priority}</Badge>}
                    {item.timeframe && <span className="text-xs text-slate-500">{item.timeframe}</span>}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{item.action}</p>
                  {item.impact && <p className="text-xs text-slate-500 mt-1">{item.impact}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {result.nextSteps?.length > 0 && (
          <ListSection title="Next Steps" icon={BadgeCheck} items={result.nextSteps} tone="slate" />
        )}

        <FieldGrid formData={form} />

        <NextStepsSection
          score={score}
          destinationCountry={form.destinationCountry}
          nationality={form.nationality}
          visaType={form.visaType}
        />

        <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{result.disclaimer || "AI estimates are for guidance only and do not guarantee visa approval."}</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
