import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import {
  Crown, Lock, Sparkles, CheckCircle, FileText, AlertCircle,
  TrendingUp, Download, Shield, ArrowRight, Zap, ChevronLeft,
  ChevronRight, Brain, User, Plane, CreditCard, Globe, Home,
  Info, RefreshCw, Flag, Star, AlertTriangle, Activity, BookOpen,
  Briefcase, BadgeCheck, BarChart3, ClipboardList, Plus, Trash2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SearchableSelect, MultiSearchableSelect } from "@/components/searchable-select";
import { getUniversitiesForCountry } from "@/data/universities";
import { getCountryVisaConfig } from "@/data/country-visa-types";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MIN_DOB_ISO, TODAY_ISO, validateAdultApplicantDob } from "@/lib/applicant-age";

import { COUNTRIES, VISA_TYPES } from "@/shared/destinations";

const YES_NO = ["Yes", "No"];
const YES_NO_MAYBE = ["Yes", "No", "Planning to get"];

const STEPS = [
  { n: 1, title: "Personal Profile", icon: User, bg: "bg-blue-50", color: "text-blue-600" },
  { n: 2, title: "Travel Plan", icon: Plane, bg: "bg-purple-50", color: "text-purple-600" },
  { n: 3, title: "Employment & Income", icon: Briefcase, bg: "bg-emerald-50", color: "text-emerald-600" },
  { n: 4, title: "Financial Depth", icon: CreditCard, bg: "bg-amber-50", color: "text-amber-600" },
  { n: 5, title: "History & Visas", icon: Globe, bg: "bg-rose-50", color: "text-rose-600" },
  { n: 6, title: "Documents", icon: FileText, bg: "bg-orange-50", color: "text-orange-600" },
  { n: 7, title: "Home Ties & Extra", icon: Home, bg: "bg-teal-50", color: "text-teal-600" },
];

type SeverityKey = "critical" | "high" | "medium" | "low";
type PriorityKey = "immediate" | "before_applying" | "optional";

const SEVERITY_STYLE: Record<SeverityKey, string> = {
  critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
};

const PRIORITY_STYLE: Record<PriorityKey, string> = {
  immediate: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  before_applying: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
  optional: "border-l-slate-300 bg-slate-50 dark:bg-slate-800/30",
};

const PRIORITY_LABEL: Record<PriorityKey, string> = {
  immediate: "Do now",
  before_applying: "Before applying",
  optional: "Optional",
};

const PRIORITY_BADGE: Record<PriorityKey, string> = {
  immediate: "bg-red-100 text-red-700",
  before_applying: "bg-amber-100 text-amber-700",
  optional: "bg-slate-100 text-slate-600",
};

// Score gauge SVG
function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const radius = 90;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const arc = circumference * 0.75;
  const dashOffset = arc - (score / 100) * arc;

  const color = score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : score >= 20 ? "#f97316" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg width={200} height={200} viewBox="0 0 200 200" style={{ transform: "rotate(-225deg)" }}>
        <circle cx={100} cy={100} r={normalizedRadius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} strokeDasharray={`${arc} ${circumference}`} />
        <circle cx={100} cy={100} r={normalizedRadius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-5xl font-black" style={{ color }}>{score}%</p>
        <p className="text-sm font-bold text-muted-foreground mt-1">{grade}</p>
      </div>
    </div>
  );
}

function DimBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold">{value}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Sel({ label, val, onChange, opts, tooltip }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
        {label}{tooltip && <span className="text-xs text-muted-foreground ml-1">({tooltip})</span>}
      </Label>
      <select value={val} onChange={e => onChange(e.target.value)}
        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
        <option value="">Select…</option>
        {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function DocToggle({ label, val, onChange, tooltip }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
        {label}{tooltip && <span className="text-xs text-muted-foreground ml-1">({tooltip})</span>}
      </Label>
      <div className="flex gap-2 flex-wrap">
        {YES_NO.map(o => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${val === o ? "bg-primary text-white border-primary" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

const BLANK: Record<string, string> = {};

// ── Date helpers ─────────────────────────────────────────────────────────────
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

function getAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── Visa-purpose compatibility ─────────────────────────────────────────────

const TRANSIT_LONG_DURATIONS = ["15–30 days", "1–3 months", "More than 3 months"];
const EMPLOYED_STATUSES = ["Employed (Full-time)", "Employed (Part-time)", "Government Employee"];
const WORKING_STATUSES = [...EMPLOYED_STATUSES, "Self-employed / Business Owner", "Freelancer / Consultant"];

const VISA_REGIONS = ["Schengen / EU","United States","United Kingdom","Australia","Canada","Japan","UAE","Singapore","South Korea","New Zealand","Switzerland","Other"];
const VISA_STATUSES = ["Currently valid","Expires within 6 months","Expired within last year","Expired 1–3 years ago"];

const LOAD_MESSAGES = [
  "Analyzing your personal profile…",
  "Reviewing employment & financial strength…",
  "Evaluating travel history & visa track record…",
  "Checking home country ties & return intent…",
  "Running embassy-style risk assessment…",
  "Comparing against consular approval patterns…",
  "Generating dimension scores…",
  "Building your personalized action plan…",
  "Finalizing your Deep Check report…",
];

const DEEP_PROGRESS_STEPS = [
  "Reviewing your personal profile…",
  "Assessing employment and financial strength…",
  "Evaluating travel history and visa record…",
  "Checking home ties and document readiness…",
  "Generating your AI Analysis report…",
];

const DEEP_MIN_PROGRESS_MS = 20000;
const DEEP_STEP_PROGRESS_MS = Math.floor(DEEP_MIN_PROGRESS_MS / DEEP_PROGRESS_STEPS.length);

type VisaHolding = { region: string; status: string };

// Countries that officially do not allow dual nationality
const NO_DUAL_NATIONALITY_COUNTRIES = new Set([
  "India","China","Japan","Singapore","Malaysia","United Arab Emirates","Saudi Arabia",
  "Indonesia","South Korea","Thailand","Vietnam","Myanmar","Nepal","Pakistan",
  "Bangladesh","Sri Lanka","Philippines","Kazakhstan","Azerbaijan","Uzbekistan",
  "Algeria","Morocco","Tunisia","Ethiopia","Kenya","Zimbabwe","Venezuela","Ukraine",
]);

// Income source options filtered by employment status
function getIncomeSourceOpts(empStatus: string): string[] {
  if (empStatus === "Student") return ["Scholarship / Grant","Family Support","Investment Returns","Rental Income","Freelance / Consultancy"];
  if (empStatus === "Retired") return ["Pension / Retirement","Investment Returns","Rental Income","Family Support"];
  if (empStatus === "Unemployed") return ["Investment Returns","Rental Income","Family Support"];
  if (empStatus === "Self-employed / Business Owner") return ["Business Revenue","Investment Returns","Rental Income","Family Support"];
  if (empStatus === "Freelancer / Consultant") return ["Freelance / Consultancy","Investment Returns","Rental Income","Family Support"];
  return ["Employment Salary","Business Revenue","Freelance / Consultancy","Investment Returns","Rental Income","Pension / Retirement","Family Support","Scholarship / Grant"];
}

// Trip funding options filtered by employment status
function getTripFundingOpts(empStatus: string): string[] {
  const base = ["Self-funded","Family member","Sponsor / Host","Scholarship / Grant","Business funds"];
  if (EMPLOYED_STATUSES.includes(empStatus)) return ["Self-funded","Employer / Company","Family member","Sponsor / Host","Scholarship / Grant","Business funds"];
  return base;
}

export default function DeepCheckPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Record<string, string>>({ ...BLANK });
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [visaHoldings, setVisaHoldings] = useState<VisaHolding[]>([]);
  const [loadMessage, setLoadMessage] = useState(LOAD_MESSAGES[0]);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [profileApplied, setProfileApplied] = useState(false);

  // Load saved profile
  const { data: savedProfile } = useQuery<any>({
    queryKey: ["/api/b2c/profile"],
    enabled: !!user,
  });

  // Auto pre-fill from saved profile on first load
  useEffect(() => {
    if (!savedProfile?.nationality || profileApplied) return;
    setForm(f => ({
      ...f,
      nationality: savedProfile.nationality || f.nationality,
      passportCountry: savedProfile.passportCountry || f.passportCountry,
      dateOfBirth: savedProfile.dateOfBirth || f.dateOfBirth,
      gender: savedProfile.gender || f.gender,
      maritalStatus: savedProfile.maritalStatus || f.maritalStatus,
      countryOfResidence: savedProfile.countryOfResidence || f.countryOfResidence,
      employmentStatus: savedProfile.employmentStatus || f.employmentStatus,
      jobTitle: savedProfile.jobTitle || f.jobTitle,
      companyName: savedProfile.companyName || f.companyName,
      yearsInJob: savedProfile.yearsInJob || f.yearsInJob,
      monthlyIncome: savedProfile.monthlyIncome || f.monthlyIncome,
      sourceOfIncome: savedProfile.sourceOfIncome || f.sourceOfIncome,
      bankBalance: savedProfile.bankBalance || f.bankBalance,
      tripFunding: savedProfile.tripFunding || f.tripFunding,
      countriesVisited: savedProfile.countriesVisited || f.countriesVisited,
      previousVisaRefusals: savedProfile.previousVisaRefusals || f.previousVisaRefusals,
      hasBankStatement: savedProfile.hasBankStatement ? "Yes" : f.hasBankStatement,
      hasTaxReturn: savedProfile.hasTaxReturn ? "Yes" : f.hasTaxReturn,
      hasSalarySlips: savedProfile.hasSalarySlips ? "Yes" : f.hasSalarySlips,
      hasCreditCard: savedProfile.hasCreditCard ? "Yes" : f.hasCreditCard,
      hasProperty: savedProfile.hasProperty ? "Yes" : f.hasProperty,
      familyInHomeCountry: savedProfile.familyInHomeCountry ? "Yes" : f.familyInHomeCountry,
      propertyInHomeCountry: savedProfile.propertyInHomeCountry ? "Yes" : f.propertyInHomeCountry,
    }));
    setProfileApplied(true);
    toast({ title: "Profile loaded", description: "Your saved profile has been pre-filled. Review and adjust as needed." });
  }, [savedProfile]);

  // Rotating status messages while submitting
  useEffect(() => {
    if (!isSubmitting) return;
    let i = 0;
    setLoadMessage(LOAD_MESSAGES[0]);
    const tick = setInterval(() => {
      i = (i + 1) % LOAD_MESSAGES.length;
      setLoadMessage(LOAD_MESSAGES[i]);
    }, 2800);
    return () => clearInterval(tick);
  }, [isSubmitting]);

  useEffect(() => {
    if (!isSubmitting) {
      setAnalysisStep(0);
      return;
    }

    setAnalysisStep(0);
    const tick = setInterval(() => {
      setAnalysisStep(current => Math.min(DEEP_PROGRESS_STEPS.length - 1, current + 1));
    }, DEEP_STEP_PROGRESS_MS);

    return () => clearInterval(tick);
  }, [isSubmitting]);

  if (authLoading) return null;
  if (!user) { setLocation("/sign-in"); return null; }

  const set = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const hasAccess = user.deepCheckAccess;

  // ===================== RESULT SCORECARD =====================
  if (result) {
    const score: number = result.approvalChance ?? 0;
    const grade: string = result.profileGrade ?? "—";
    const dims = result.dimensionScores ?? {};
    const riskDetails: any[] = result.riskDetails ?? [];
    const actionPlan: any[] = result.actionPlan ?? [];
    const statusLabel: string = result.statusLabel ?? "";
    const docRate: number = result.documentCompletionRate ?? 0;
    const confidence: string = result.confidenceLevel ?? "";

    const statusColor =
      score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
      : score >= 60 ? "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400"
      : score >= 40 ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
      : "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:text-red-400";

    return (
      <DashboardLayout title="Deep Check Results" subtitle="AI-powered embassy-style visa analysis">
        <div className="max-w-4xl space-y-6">
          {/* AI Analysis badge */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-300">
                <Brain className="w-3.5 h-3.5" />
                AI Analysis
              </div>
              {confidence && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground border">
                  Confidence: {confidence}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { setResult(null); setStep(1); setForm({ ...BLANK }); }}>
              <RefreshCw className="w-3.5 h-3.5" /> New Deep Check
            </Button>
          </div>

          {/* Score hero */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <ScoreGauge score={score} grade={grade} />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border ${statusColor} mb-3`}>
                      <Activity className="w-4 h-4" />
                      {statusLabel}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                      {form.nationality} → {form.destinationCountry}
                    </h2>
                    <p className="text-blue-100 text-sm leading-relaxed mb-4 max-w-xl">{result.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-medium">{form.visaType}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-medium">Doc: {docRate}% complete</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-medium">Grade: {grade}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile dimension scores */}
          {dims && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Profile Dimension Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                <DimBar label="Financial Strength" value={dims.financial ?? 0} color="bg-emerald-500" />
                <DimBar label="Document Completeness" value={dims.documents ?? 0} color="bg-blue-500" />
                <DimBar label="Travel History" value={dims.travelHistory ?? 0} color="bg-purple-500" />
                <DimBar label="Home Country Ties" value={dims.homeTies ?? 0} color="bg-amber-500" />
                <DimBar label="Visa Profile Match" value={dims.visaProfile ?? 0} color="bg-rose-500" />
              </CardContent>
            </Card>
          )}

          {/* Embassy Insight */}
          {result.embassyInsight && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="p-5 flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Flag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-1">Embassy Intelligence — {form.destinationCountry}</p>
                  <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">{result.embassyInsight}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two-column: Strengths + Risk Details */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Profile Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(result.strengths ?? []).map((s: string, i: number) => (
                  <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-emerald-800 dark:text-emerald-300">{s}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Risk Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {riskDetails.length > 0 ? riskDetails.map((r: any, i: number) => {
                  const sev = (r.severity || "low") as SeverityKey;
                  return (
                    <div key={i} className={`p-3 rounded-lg border text-sm ${SEVERITY_STYLE[sev]}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold">{r.factor}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${SEVERITY_STYLE[sev]}`}>{r.severity}</span>
                      </div>
                      <p className="text-xs opacity-90 mb-1">{r.detail}</p>
                      {r.mitigation && (
                        <p className="text-xs opacity-75 italic">→ {r.mitigation}</p>
                      )}
                    </div>
                  );
                }) : (result.riskFactors ?? []).map((r: string, i: number) => (
                  <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-800 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-orange-800 dark:text-orange-300">{r}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Action Plan */}
          {actionPlan.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Your Personalized Action Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionPlan.map((item: any, i: number) => {
                  const p = (item.priority || "optional") as PriorityKey;
                  return (
                    <div key={i} className={`flex gap-4 p-4 rounded-xl border-l-4 ${PRIORITY_STYLE[p]}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${PRIORITY_BADGE[p]}`}>{PRIORITY_LABEL[p]}</span>
                          {item.timeframe && <span className="text-xs text-muted-foreground">{item.timeframe}</span>}
                        </div>
                        <p className="text-sm font-semibold text-foreground">{item.action}</p>
                        {item.impact && <p className="text-xs text-muted-foreground mt-0.5">{item.impact}</p>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Document audit */}
          <div className="grid md:grid-cols-2 gap-4">
            {(result.missingDocuments ?? []).length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Missing Documents
                    <Badge className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px]">{result.missingDocuments.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {result.missingDocuments.map((d: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      {d}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Required Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {(result.requiredDocuments ?? []).map((d: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    {d}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Country-specific concerns */}
          {(result.countrySpecificConcerns ?? []).length > 0 && (
            <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                  <Flag className="w-4 h-4" /> {form.destinationCountry} — Embassy Concerns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.countrySpecificConcerns.map((c: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-800 text-sm">
                    <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <span className="text-orange-800 dark:text-orange-300">{c}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Improvement tips */}
          {(result.improvementTips ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Improvement Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-2">
                {result.improvementTips.map((t: string, i: number) => (
                  <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                    <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{t}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Final recommendation */}
          {result.finalRecommendation && (
            <Card className={`border-2 ${score >= 60 ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800" : score >= 40 ? "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800" : "border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800"}`}>
              <CardContent className="p-5 flex gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${score >= 60 ? "bg-emerald-100 dark:bg-emerald-900/50" : score >= 40 ? "bg-amber-100 dark:bg-amber-900/50" : "bg-red-100 dark:bg-red-900/50"}`}>
                  <BadgeCheck className={`w-5 h-5 ${score >= 60 ? "text-emerald-600 dark:text-emerald-400" : score >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`} />
                </div>
                <div>
                  <p className="font-bold text-sm mb-1">Final Recommendation</p>
                  <p className="text-sm leading-relaxed text-foreground">{result.finalRecommendation}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer & actions */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{result.disclaimer}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button className="gap-2" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}
              onClick={() => { setResult(null); setStep(1); setForm({ ...BLANK }); }}>
              <RefreshCw className="w-4 h-4" /> New Deep Check
            </Button>
            <Link href="/history">
              <Button variant="outline" className="gap-2">View History</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ===================== UPGRADE / NO ACCESS =====================
  if (!hasAccess) {
    return (
      <DashboardLayout title="Deep Check" subtitle="Embassy-style AI visa risk analysis">
        <div className="max-w-3xl space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-semibold">50% Discount</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Deep Visa Risk Analysis</h1>
              <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
                Go beyond a basic score. Our AI runs an embassy-style deep analysis — risk severity breakdown, dimension scoring, action plan, and embassy intelligence.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/payment/deep-check">
                  <Button className="bg-white text-blue-900 hover:bg-blue-50 font-semibold gap-2" data-testid="button-upgrade">
                    <Crown className="w-4 h-4 text-amber-500" /> Get Deep Check — ₹500 only <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/check">
                  <Button variant="ghost" className="text-white hover:bg-white/10 gap-2">
                    <Sparkles className="w-4 h-4" /> Try Basic Check at ₹0
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          {[
            { icon: Brain, title: "AI Analysis", desc: "Every deep check uses advanced AI to review embassy evaluation patterns, consular decision criteria, and your full applicant profile." },
            { icon: BarChart3, title: "5-Dimension Scoring", desc: "Scores across Financial Strength, Document Completeness, Travel History, Home Country Ties, and Visa Profile Match." },
            { icon: AlertTriangle, title: "Severity-Tagged Risk Flags", desc: "Each risk factor is tagged Critical / High / Medium / Low with specific mitigation advice — exactly how a consular officer would weigh it." },
            { icon: ClipboardList, title: "Personalized Action Plan", desc: "Prioritized action items (Immediate / Before Applying / Optional) with estimated approval chance improvement for each action." },
            { icon: Flag, title: "Embassy Intelligence", desc: "Country-specific insight on how your destination's embassy actually processes applications from your nationality." },
            { icon: Download, title: "Full PDF Report", desc: "Export your complete visa analysis as a professional PDF — perfect for sharing with a consultant or keeping as a record." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-5 flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{title}</h3>
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  // ===================== MULTI-STEP FORM =====================
  const currentStep = STEPS[step - 1];
  const StepIcon = currentStep.icon;
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  // Per-step required-field check
  const STEP_REQUIRED: Record<number, { key: string; label: string }[]> = {
    1: [{ key: "nationality", label: "Nationality" }, { key: "dateOfBirth", label: "Date of Birth" }],
    2: [
      { key: "destinationCountry", label: "Destination Country" },
      { key: "visaType", label: "Visa Type" },
      { key: "tripDuration", label: "Trip Duration" },
    ],
    3: [{ key: "employmentStatus", label: "Employment Status" }],
    4: [{ key: "bankBalance", label: "Bank Balance" }],
    5: [{ key: "previousVisaRefusals", label: "Previous Visa Refusals" }],
  };

  const canAdvance = (): boolean => {
    const required = STEP_REQUIRED[step] ?? [];
    if (!required.every(r => !!form[r.key])) return false;
    if (step === 1 && validateAdultApplicantDob(form.dateOfBirth)) return false;
    return true;
  };

  const getMissingLabels = (): string => {
    const required = STEP_REQUIRED[step] ?? [];
    return required.filter(r => !form[r.key]).map(r => r.label).join(", ");
  };

  const nextStep = () => {
    if (!canAdvance()) {
      const dobError = step === 1 ? validateAdultApplicantDob(form.dateOfBirth) : null;
      toast({
        title: dobError ? "Invalid date of birth" : "Required fields missing",
        description: dobError ?? `Please fill in: ${getMissingLabels()}`,
        variant: "destructive",
      });
      return;
    }
    if (step < STEPS.length) setStep(s => s + 1);
  };
  const prevStep = () => { if (step > 1) setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!form.nationality || !form.destinationCountry || !form.visaType) {
      toast({ title: "Required fields missing", description: "Please fill in at least nationality, destination, and visa type.", variant: "destructive" });
      return;
    }
    const dobError = validateAdultApplicantDob(form.dateOfBirth);
    if (dobError) {
      toast({ title: "Invalid date of birth", description: dobError, variant: "destructive" });
      return;
    }
    if (!consentChecked) { setConsentError("Please agree to the Terms & Conditions before running the check"); return; }
    setConsentError("");
    // Serialize visa holdings into form before submitting
    const enrichedForm = {
      ...form,
      currentVisaHoldings: visaHoldings.length > 0
        ? visaHoldings.map(v => `${v.region} (${v.status})`).join("; ")
        : "None",
    };
    setIsSubmitting(true);
    try {
      // Start Claude API call immediately — runs in parallel with the animation timer
      const [res] = await Promise.all([
        apiRequest("POST", "/api/b2c/deep-check", { formData: enrichedForm }),
        new Promise(resolve => setTimeout(resolve, DEEP_MIN_PROGRESS_MS)),
      ]);
      const data = await res.json();

      // Flash all steps as completed for 900ms before revealing the result
      setAnalysisStep(DEEP_PROGRESS_STEPS.length);
      await new Promise(resolve => setTimeout(resolve, 900));

      setResult(data.result);
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/checks"] });

      // Auto-save profile from form data
      try {
        await apiRequest("PUT", "/api/b2c/profile", {
          nationality: form.nationality,
          passportCountry: form.passportCountry,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          maritalStatus: form.maritalStatus,
          countryOfResidence: form.countryOfResidence,
          employmentStatus: form.employmentStatus,
          jobTitle: form.jobTitle,
          companyName: form.companyName,
          yearsInJob: form.yearsInJob,
          monthlyIncome: form.monthlyIncome,
          sourceOfIncome: form.sourceOfIncome,
          bankBalance: form.bankBalance,
          tripFunding: form.tripFunding,
          countriesVisited: form.countriesVisited,
          previousVisaRefusals: form.previousVisaRefusals,
          hasBankStatement: form.hasBankStatement === "Yes",
          hasTaxReturn: form.hasTaxReturn === "Yes",
          hasSalarySlips: form.hasSalarySlips === "Yes",
          hasCreditCard: form.hasCreditCard === "Yes",
          hasProperty: form.hasProperty === "Yes",
          familyInHomeCountry: form.familyInHomeCountry === "Yes",
          propertyInHomeCountry: form.propertyInHomeCountry === "Yes",
        });
        await queryClient.invalidateQueries({ queryKey: ["/api/b2c/profile"] });
      } catch (_) {}
    } catch (err: any) {
      const msg: string = err.message || "";
      if (msg.toLowerCase().includes("sign in") || msg.toLowerCase().includes("not authenticated") || msg.startsWith("401")) {
        queryClient.setQueryData(["/api/b2c/auth/me"], null);
        toast({ title: "Session expired", description: "Please sign in again to continue.", variant: "destructive" });
        setLocation("/sign-in");
      } else {
        toast({ title: "Deep Check failed", description: msg || "Please try again.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===================== PROGRESS SCREEN =====================
  if (isSubmitting) {
    return (
      <DashboardLayout title="Analyzing Your Visa Profile" subtitle="Deep Check — please wait">
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4055FF]/20 to-[#FF2060]/10 blur-2xl scale-150" />
            <img src="/logo-loading.gif" alt="Analyzing..." className="relative w-32 h-32 object-contain drop-shadow-xl" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-slate-800">AI is running your deep analysis</h2>
            <p className="text-sm text-slate-500">{form.nationality} → {form.destinationCountry} · {form.visaType}</p>
            <p className="text-xs text-slate-400 transition-all duration-500">{loadMessage}</p>
          </div>

          <div className="w-full space-y-2.5">
            {DEEP_PROGRESS_STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm transition-all duration-300 ${
                  i < analysisStep
                    ? "bg-emerald-50/70 border-emerald-100"
                    : i === analysisStep
                      ? "bg-white border-[#4055FF]/20"
                      : "bg-white border-slate-100 opacity-75"
                }`}
              >
                {i < analysisStep ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </span>
                ) : i === analysisStep ? (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#4055FF] border-t-transparent animate-spin" />
                ) : (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-400">
                    {i + 1}
                  </span>
                )}
                <span className="text-sm text-slate-600">{s}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center">This usually takes 20–40 seconds</p>
        </div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout title="New Deep Check" subtitle={`Step ${step} of ${STEPS.length} — ${currentStep.title}`}>
      <div className="max-w-5xl">
        {/* Pro badge */}
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
          <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
          <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">Deep Check — AI Analysis</span>
          <span className="ml-auto text-xs text-purple-500">More thorough than basic check</span>
        </div>

        {/* Step pills */}
        <div className="mb-5">
          <div className="flex flex-nowrap md:flex-wrap items-center gap-1.5 overflow-x-auto md:overflow-visible pb-2 mb-3">
            {STEPS.map(s => {
              const SIcon = s.icon;
              const done = s.n < step;
              const active = s.n === step;
              return (
                <div key={s.n} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${done ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : active ? `${s.bg} ${s.color} shadow-sm dark:bg-opacity-20` : "bg-white dark:bg-slate-800 text-muted-foreground border border-muted"}`}>
                  {done ? <CheckCircle className="w-3 h-3" /> : <SIcon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{s.n}</span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7033F0,#4055FF,#FF2060)" }} />
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="p-6 md:p-8">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className={`w-10 h-10 rounded-xl ${currentStep.bg} dark:bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
                <StepIcon className={`w-5 h-5 ${currentStep.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Step {step} of {STEPS.length}</p>
                <h2 className="font-bold text-lg">{currentStep.title}</h2>
              </div>
            </div>

            {/* ===== STEP 1: Personal Profile ===== */}
            {step === 1 && (
              <div className="grid sm:grid-cols-2 gap-4">

                {/* ── Applicant Type ───────────────────────────────────────────── */}
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                    Applicant Type
                  </Label>
                  <div className="flex gap-3">
                    {[
                      { value: "individual", label: "Individual", icon: User, desc: "Just yourself" },
                      { value: "family", label: "Family", icon: Users, desc: "You + spouse / children" },
                    ].map(opt => {
                      const Ic = opt.icon;
                      const selected = (form.applicantType || "individual") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            set("applicantType")(opt.value);
                            if (opt.value === "individual") {
                              set("spouseName")("");
                              set("spouseNationality")("");
                              set("childrenTraveling")("");
                              set("childrenAges")("");
                            }
                          }}
                          className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? "border-purple-400 bg-purple-50 dark:bg-purple-950/20"
                              : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? "bg-purple-600" : "bg-slate-100 dark:bg-slate-800"}`}>
                            <Ic className={`w-4 h-4 ${selected ? "text-white" : "text-slate-400"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${selected ? "text-purple-800 dark:text-purple-200" : "text-slate-700 dark:text-slate-300"}`}>{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                          {selected && <CheckCircle className="w-4 h-4 text-purple-500 ml-auto flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Family details (spouse + children) ──────────────────────── */}
                {(form.applicantType || "individual") === "family" && (
                  <>
                    <div className="sm:col-span-2">
                      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">Family Members Traveling</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Spouse / Partner Full Name</Label>
                            <Input value={form.spouseName || ""} onChange={e => set("spouseName")(e.target.value)} placeholder="e.g. Jane Smith" />
                          </div>
                          <SearchableSelect label="Spouse / Partner Nationality" value={form.spouseNationality || ""} onChange={set("spouseNationality")} options={COUNTRIES} placeholder="Select nationality…" />
                          <Sel label="Number of Children Traveling" val={form.childrenTraveling || ""} onChange={set("childrenTraveling")} opts={["0","1","2","3","4","5+"]} />
                          {form.childrenTraveling && form.childrenTraveling !== "0" && (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Children's Ages <span className="text-xs text-muted-foreground">(optional)</span></Label>
                              <Input value={form.childrenAges || ""} onChange={e => set("childrenAges")(e.target.value)} placeholder="e.g. 5, 8, 12" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Your Deep Check will cover all family members traveling together in a single assessment.</p>
                      </div>
                    </div>
                  </>
                )}

                <SearchableSelect label="Nationality *" required value={form.nationality || ""} onChange={set("nationality")} options={COUNTRIES} placeholder="Search nationality..." />
                <SearchableSelect label="Passport Issued By" value={form.passportCountry || ""} onChange={set("passportCountry")} options={COUNTRIES} placeholder="If different from nationality…" />
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Date of Birth
                    {form.dateOfBirth && (() => {
                      const age = getAge(form.dateOfBirth);
                      if (age === null || age < 0 || age > 120) return <span className="ml-2 text-xs text-red-500 font-semibold">Invalid date</span>;
                      return <span className="ml-2 text-xs text-muted-foreground">Age: {age} years</span>;
                    })()}
                  </Label>
                  <Input type="date" value={form.dateOfBirth || ""} min={MIN_DOB_ISO} max={TODAY_ISO}
                    onChange={e => set("dateOfBirth")(e.target.value)} />
                  {form.dateOfBirth && (() => {
                    const age = getAge(form.dateOfBirth);
                    if (age !== null && age < 3) return (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Applicant is too young to apply independently for most visa types.
                      </p>
                    );
                    if (age !== null && age < 18) return (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Minor applicant — parental/guardian consent documents will be required.
                      </p>
                    );
                    return null;
                  })()}
                </div>
                <Sel label="Gender" val={form.gender || ""} onChange={set("gender")} opts={["Male","Female","Non-binary","Prefer not to say"]} />
                <div>
                  <Sel label="Marital Status" val={form.maritalStatus || ""} onChange={val => { set("maritalStatus")(val); if (val === "Single") set("numberOfChildren")("0"); }} opts={["Single","Married","Divorced","Widowed","Separated"]} />
                </div>
                {form.maritalStatus !== "Single" && (
                  <Sel label="Number of Dependent Children" val={form.numberOfChildren || ""} onChange={set("numberOfChildren")} opts={["0","1","2","3","4","5+"]} />
                )}
                <SearchableSelect label="Country of Residence" value={form.countryOfResidence || ""} onChange={set("countryOfResidence")} options={COUNTRIES} placeholder="Where do you live now?" />
                <Sel label="Duration in Current Residence" val={form.monthsInCurrentResidence || ""} onChange={set("monthsInCurrentResidence")} opts={["Less than 6 months","6-12 months","1-3 years","3-5 years","5+ years"]} />
                <Sel label="Passport Validity Remaining" val={form.passportMonthsValid || ""} onChange={set("passportMonthsValid")} opts={["6-12 months","12-24 months","24-48 months","48+ months"]} />
                <div>
                  <Sel label="Dual Nationality?" val={form.hasDualNationality || ""} onChange={val => { set("hasDualNationality")(val); if (val === "No") set("dualNationalityCountry")(""); }} opts={YES_NO} />
                  {form.hasDualNationality === "Yes" && NO_DUAL_NATIONALITY_COUNTRIES.has(form.nationality) && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {form.nationality} does not officially recognise dual nationality. Declaring this may complicate your application.
                    </p>
                  )}
                </div>
                {form.hasDualNationality === "Yes" && (
                  <SearchableSelect label="Second Nationality" value={form.dualNationalityCountry || ""} onChange={set("dualNationalityCountry")} options={COUNTRIES} placeholder="Second passport country…" />
                )}
                <Sel label="Highest Education Level" val={form.educationLevel || ""} onChange={set("educationLevel")} opts={["High School","Bachelor's Degree","Master's Degree","PhD / Doctoral","Diploma / Certificate","Other"]} />
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Field of Study / Specialization</Label>
                  <Input value={form.fieldOfStudy || ""} onChange={e => set("fieldOfStudy")(e.target.value)} placeholder="e.g. Computer Science, Business, Medicine" />
                </div>
              </div>
            )}

            {/* ===== STEP 2: Travel Plan ===== */}
            {step === 2 && (
              <div className="space-y-4">
                {(() => {
                  const visaConf = getCountryVisaConfig(form.destinationCountry);
                  const catData = visaConf ? visaConf.categories[form.usVisaCategory || ""] : null;
                  return (
                    <>
                      {/* Row 1: Destination Country + info banner (structured) or Visa Type (simple) */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <SearchableSelect label="Destination Country *" required value={form.destinationCountry || ""} onChange={val => { set("destinationCountry")(val); set("usVisaCategory")(""); set("visaType")(""); }} options={COUNTRIES} placeholder="Search destination..." />
                          {form.destinationCountry && form.nationality && form.destinationCountry === form.nationality && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> You are a citizen of {form.nationality} — you do not need a visa to enter your own country.
                            </p>
                          )}
                        </div>
                        <div>
                          {visaConf ? (
                            <div className="flex items-center gap-2 h-full px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                              <span className="text-lg">{visaConf.flag}</span>
                              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">{visaConf.regionLabel} — select a category then specific type</p>
                            </div>
                          ) : (
                            <Sel label="Visa Type *" val={form.visaType || ""} onChange={val => { set("visaType")(val); set("usVisaCategory")(""); set("tripDuration")(""); }} opts={VISA_TYPES.filter(t => t !== "Schengen Visa" && t !== "Other")} />
                          )}
                        </div>
                      </div>

                      {/* Row 2 (structured countries only): Visa Category + Visa Type side by side */}
                      {visaConf && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Sel
                            label="Visa Category *"
                            val={form.usVisaCategory || ""}
                            onChange={val => {
                              set("usVisaCategory")(val);
                              set("visaType")("");
                            }}
                            opts={Object.keys(visaConf.categories)}
                          />
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              Visa Type *{!form.usVisaCategory && <span className="text-slate-400 font-normal ml-1">(select category first)</span>}
                            </label>
                            <select
                              disabled={!form.usVisaCategory}
                              value={form.visaType || ""}
                              onChange={e => set("visaType")(e.target.value)}
                              className="w-full h-10 px-3 text-sm border rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Select visa type…</option>
                              {(catData?.types || []).map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}

                      {/* Visa type applicability warnings */}
                      {form.visaType && (() => {
                        const age = getAge(form.dateOfBirth);
                        if (age !== null && age < 3 && ["Student Visa","Work Visa","Business Visa","Investor Visa"].includes(form.visaType)) return (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> A child under 3 cannot independently apply for a {form.visaType}.
                          </p>
                        );
                        if (age !== null && age < 18 && form.visaType === "Work Visa") return (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Most countries do not issue Work Visas to minors (under 18).
                          </p>
                        );
                        if (age !== null && age < 16 && form.visaType === "Student Visa") return (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Student visa for a child under 16 requires additional guardian/parental documentation.
                          </p>
                        );
                        return null;
                      })()}
                      {form.visaType === "Spouse / Family Visa" && form.maritalStatus === "Single" && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Spouse / Family Visa typically requires proof of marriage or legal partnership. Your marital status is "Single".
                        </p>
                      )}
                    </>
                  );
                })()}

                {/* Remaining Travel Plan fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                  <Sel label="Trip Duration *" val={form.tripDuration || ""} onChange={set("tripDuration")}
                    opts={form.visaType === "Transit Visa"
                      ? ["1–3 days","4–7 days"]
                      : ["1–3 days","4–7 days","8–14 days","15–30 days","1–3 months","More than 3 months"]} />
                  {form.visaType === "Transit Visa" && TRANSIT_LONG_DURATIONS.includes(form.tripDuration) && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Transit visas are for short stays only (typically 24–72 hours). Please correct the duration.
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Planned Travel Date</Label>
                  <Input type="date" value={form.plannedTravelDate || ""} min={TOMORROW}
                    onChange={e => set("plannedTravelDate")(e.target.value)} />
                  {form.plannedTravelDate && form.plannedTravelDate < TODAY_ISO && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Travel date cannot be in the past.
                    </p>
                  )}
                </div>
                {/* Entry Type — hidden for countries where it doesn't apply (structured visa systems + Ireland) */}
                {!getCountryVisaConfig(form.destinationCountry) && form.destinationCountry !== "Ireland" && (
                  <Sel label="Entry Type" val={form.entryType || ""} onChange={set("entryType")} opts={["Single Entry","Multiple Entry","Double Entry"]} />
                )}
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Specific Cities / Regions Planned</Label>
                  <Input value={form.specificCitiesPlanned || ""} onChange={e => set("specificCitiesPlanned")(e.target.value)} placeholder="e.g. Paris, Lyon, Nice" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Detailed Purpose of Visit</Label>
                  <Textarea value={form.purposeDetailedExplanation || ""} onChange={e => set("purposeDetailedExplanation")(e.target.value)} placeholder="Describe in detail why you are visiting, what you plan to do, and how this trip fits your personal/professional plans…" rows={3} />
                </div>
                {(form.visaType === "Conference / Event Visa" || form.visaType === "Business Visa") && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Event / Conference Name</Label>
                      <Input value={form.eventOrConferenceName || ""} onChange={e => set("eventOrConferenceName")(e.target.value)} placeholder="e.g. World Tourism Forum 2025" />
                    </div>
                    <DocToggle label="Conference / Event Invitation Letter?" val={form.hasConferenceInvitation || ""} onChange={set("hasConferenceInvitation")} />
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Inviting Company / Organisation</Label>
                      <Input value={form.invitingCompanyName || ""} onChange={e => set("invitingCompanyName")(e.target.value)} placeholder="e.g. Acme Corp GmbH" />
                    </div>
                  </>
                )}
                {form.visaType === "Student Visa" && (
                  <>
                    <div className="sm:col-span-2">
                      <SearchableSelect
                        label="Institution / University Name"
                        value={form.institutionName || ""}
                        onChange={set("institutionName")}
                        options={getUniversitiesForCountry(form.destinationCountry || "")}
                        placeholder={form.destinationCountry ? "Search or type institution name..." : "Select destination country first"}
                        allowCustom
                      />
                      {form.destinationCountry && getUniversitiesForCountry(form.destinationCountry).length === 0 && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No suggestions for {form.destinationCountry} — type your institution name directly.</p>
                      )}
                    </div>
                    <Sel label="Study Level" val={form.studyLevel || ""} onChange={set("studyLevel")} opts={["Undergraduate / Bachelor's","Postgraduate / Master's","PhD / Doctoral","Certificate / Diploma","Language Course"]} />
                    <DocToggle label="Acceptance letter received?" val={form.hasAcceptanceLetter || ""} onChange={set("hasAcceptanceLetter")} />
                    <Sel label="Scholarship / Financial Aid Available?" val={form.scholarshipAvailable || ""} onChange={set("scholarshipAvailable")} opts={YES_NO} />
                  </>
                )}
                {form.visaType === "Work Visa" && (
                  <>
                    <DocToggle label="Formal job offer letter available?" val={form.hasJobOffer || ""} onChange={set("hasJobOffer")} />
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Hiring Company Name</Label>
                      <Input value={form.hiringCompanyName || ""} onChange={e => set("hiringCompanyName")(e.target.value)} placeholder="e.g. TechCorp Ltd" />
                    </div>
                  </>
                )}
                {form.visaType === "Spouse / Family Visa" && (
                  <>
                    <Sel label="Relationship to Host" val={form.hostRelationship || ""} onChange={set("hostRelationship")} opts={["Spouse / Partner","Parent","Child","Sibling","Other relative"]} />
                    <Sel label="Host's Visa / Residency Status" val={form.hostVisaStatus || ""} onChange={set("hostVisaStatus")} opts={["Citizen","Permanent Resident","Valid Long-term Visa","Student Visa","Work Visa","Asylum Seeker"]} />
                  </>
                )}
                <div className="sm:col-span-2">
                  <DocToggle label="First-time visitor to this destination?" val={form.firstTimeVisitor || ""} onChange={set("firstTimeVisitor")} />
                </div>
              </div>
            </div>
            )}

            {/* ===== STEP 3: Employment & Income ===== */}
            {step === 3 && (() => {
              const isWorking = WORKING_STATUSES.includes(form.employmentStatus);
              const isEmployed = EMPLOYED_STATUSES.includes(form.employmentStatus);
              const isSelfEmployed = form.employmentStatus === "Self-employed / Business Owner" || form.employmentStatus === "Freelancer / Consultant";
              const isRetired = form.employmentStatus === "Retired";
              return (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Sel label="Employment Status *" val={form.employmentStatus || ""} onChange={set("employmentStatus")} opts={["Employed (Full-time)","Employed (Part-time)","Self-employed / Business Owner","Freelancer / Consultant","Student","Retired","Unemployed","Government Employee","Other"]} />
                  {isWorking && (
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Job Title</Label>
                      <Input value={form.jobTitle || ""} onChange={e => set("jobTitle")(e.target.value)} placeholder="e.g. Senior Software Engineer" />
                    </div>
                  )}
                  {isWorking && (
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Company / Employer Name</Label>
                      <Input value={form.companyName || ""} onChange={e => set("companyName")(e.target.value)} placeholder="e.g. Google India Ltd" />
                    </div>
                  )}
                  {isWorking && (
                    <Sel label="Years in Current Role" val={form.yearsInJob || ""} onChange={set("yearsInJob")} opts={["Less than 6 months","6 months – 1 year","1–2 years","2–5 years","5–10 years","More than 10 years"]} />
                  )}
                  <Sel label="Monthly Income (USD)" val={form.monthlyIncome || ""} onChange={set("monthlyIncome")} opts={["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"]} />
                  <Sel label="Monthly Living Expenses (USD)" val={form.monthlyExpenses || ""} onChange={set("monthlyExpenses")} opts={["Less than $500","$500 – $1,500","$1,500 – $3,000","More than $3,000"]} />
                  <Sel label="Primary Income Source" val={form.sourceOfIncome || ""} onChange={set("sourceOfIncome")} opts={getIncomeSourceOpts(form.employmentStatus)} />
                  {isEmployed && (
                    <DocToggle label="Employment contract available?" val={form.hasEmploymentContract || ""} onChange={set("hasEmploymentContract")} />
                  )}
                  {isEmployed && (
                    <DocToggle label="Salary slips available (last 3 months)?" val={form.hasSalarySlips || ""} onChange={set("hasSalarySlips")} />
                  )}
                  <DocToggle label="Tax return / ITR available?" val={form.hasTaxReturn || ""} onChange={set("hasTaxReturn")} />
                  {isSelfEmployed && (
                    <>
                      <DocToggle label="Business registration document?" val={form.hasBusinessRegistration || ""} onChange={set("hasBusinessRegistration")} />
                      <Sel label="Business Type" val={form.businessType || ""} onChange={set("businessType")} opts={["Technology / IT","Consulting","Retail / Trading","Healthcare","Education","Real Estate","Import / Export","Other"]} />
                    </>
                  )}
                  {isRetired && (
                    <DocToggle label="Pension / retirement documents available?" val={form.hasPensionDocs || ""} onChange={set("hasPensionDocs")} />
                  )}
                </div>
              );
            })()}

            {/* ===== STEP 4: Financial Depth ===== */}
            {step === 4 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Sel label="Bank Balance (USD) *" val={form.bankBalance || ""} onChange={set("bankBalance")} opts={["Less than $1,000","$1,000 – $3,000","$3,000 – $7,000","$7,000 – $15,000","$15,000 – $30,000","More than $30,000"]} />
                <DocToggle label="Bank statement available?" val={form.hasBankStatement || ""} onChange={val => { set("hasBankStatement")(val); if (val === "No") { set("bankStatementDuration")(""); set("hasBankTransactions")(""); set("hasLargeDeposits")(""); } }} />
                {form.hasBankStatement === "Yes" && (
                  <Sel label="Bank Statement Coverage" val={form.bankStatementDuration || ""} onChange={set("bankStatementDuration")} opts={["1 month","3 months","6 months","12 months"]} />
                )}
                {form.hasBankStatement === "Yes" && (
                  <Sel label="Bank Transaction Pattern" val={form.hasBankTransactions || ""} onChange={set("hasBankTransactions")} opts={["Regular and consistent","Mostly regular","Irregular / seasonal","Large unexplained deposits"]} />
                )}
                {form.hasBankStatement === "Yes" && (
                  <DocToggle label="Unexplained large deposits in account?" val={form.hasLargeDeposits || ""} onChange={set("hasLargeDeposits")} />
                )}
                <DocToggle label="Credit card available?" val={form.hasCreditCard || ""} onChange={set("hasCreditCard")} />
                <DocToggle label="Fixed deposits / term deposits?" val={form.hasFixedDeposits || ""} onChange={set("hasFixedDeposits")} />
                <DocToggle label="Investment portfolio (stocks / mutual funds)?" val={form.hasInvestments || ""} onChange={set("hasInvestments")} />
                {form.hasInvestments === "Yes" && (
                  <Sel label="Approximate Investment Value" val={form.investmentValue || ""} onChange={set("investmentValue")} opts={["Less than $5,000","$5,000 – $20,000","$20,000 – $50,000","More than $50,000"]} />
                )}
                <DocToggle label="Property / real estate owned?" val={form.hasProperty || ""} onChange={set("hasProperty")} />
                <Sel label="Trip Funding Source" val={form.tripFunding || ""} onChange={set("tripFunding")} opts={getTripFundingOpts(form.employmentStatus)} />
                {(form.tripFunding === "Family member" || form.tripFunding === "Sponsor / Host") && (
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Sponsor Details</Label>
                    <Input value={form.sponsorDetails || ""} onChange={e => set("sponsorDetails")(e.target.value)} placeholder="Name, relationship, their status" />
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 5: History & Current Visas ===== */}
            {step === 5 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Sel label="Total International Trips (lifetime)" val={form.numberOfTrips || ""} onChange={val => { set("numberOfTrips")(val); if (val === "None") { set("countriesVisited")(""); set("previousVisaApprovals")("None"); set("hasOverstay")("No"); set("hasDeportation")("No"); } }} opts={["None","1–2 trips","3–5 trips","6–10 trips","10+ trips"]} />
                <div>
                  {form.numberOfTrips === "None" ? (
                    <>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Countries Visited (last 3 years)</Label>
                      <div className="h-10 px-3 flex items-center text-sm text-muted-foreground bg-muted/50 border border-muted rounded-lg">No trips recorded</div>
                    </>
                  ) : (
                    <MultiSearchableSelect
                      label="Countries Visited (last 3 years)"
                      value={form.countriesVisited || ""}
                      onChange={set("countriesVisited")}
                      options={COUNTRIES}
                      placeholder="Select countries visited…"
                    />
                  )}
                </div>
                <div>
                  <Sel label="Previous Visa Approvals" val={form.previousVisaApprovals || ""} onChange={set("previousVisaApprovals")} opts={["None","1–2 visas approved","Several (3–5)","Many (6+)"]} />
                  {form.numberOfTrips === "None" && form.previousVisaApprovals && form.previousVisaApprovals !== "None" && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Cannot have prior visa approvals with zero international trips.
                    </p>
                  )}
                </div>
                <Sel label="Previous Visa Refusals *" val={form.previousVisaRefusals || ""} onChange={set("previousVisaRefusals")} opts={["No","Yes – once","Yes – multiple times"]} />
                {form.previousVisaRefusals && form.previousVisaRefusals !== "No" && (
                  <>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Refusal Reason (if known)</Label>
                      <Input value={form.refusalReason || ""} onChange={e => set("refusalReason")(e.target.value)} placeholder="e.g. Insufficient funds, ties to home country" />
                    </div>
                    <DocToggle label="Explanation letter prepared for refusal?" val={form.hasRefusalExplanationLetter || ""} onChange={set("hasRefusalExplanationLetter")} />
                  </>
                )}
                <div>
                  <DocToggle label="Any overstay history?" val={form.hasOverstay || ""} onChange={set("hasOverstay")} />
                  {form.numberOfTrips === "None" && form.hasOverstay === "Yes" && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Cannot have overstay history with zero international trips.
                    </p>
                  )}
                </div>
                <div>
                  <DocToggle label="Any deportation history?" val={form.hasDeportation || ""} onChange={set("hasDeportation")} />
                  {form.numberOfTrips === "None" && form.hasDeportation === "Yes" && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Cannot have deportation history with zero international trips.
                    </p>
                  )}
                </div>
                <DocToggle label="Any criminal record?" val={form.criminalRecord || ""} onChange={set("criminalRecord")} />
                <DocToggle label="Any immigration violations?" val={form.immigrationViolation || ""} onChange={set("immigrationViolation")} />
                {/* ── Multi-visa holdings ─────────────────────────── */}
                <div className="sm:col-span-2 space-y-2">
                  {/* Warn: already holds a valid visa for the destination country */}
                  {visaHoldings.some(vh =>
                    form.destinationCountry &&
                    vh.region.toLowerCase() === form.destinationCountry.toLowerCase() &&
                    (vh.status === "Currently valid" || vh.status === "Expires within 6 months")
                  ) && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          You already hold a valid {form.destinationCountry} visa
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                          Applying for the same visa type is likely unnecessary — wait until your current visa expires, or check if you need a different entry category (e.g. work vs tourist).
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Currently held valid visas
                      <span className="text-xs text-muted-foreground ml-1.5">(Holding strong-country visas boosts credibility)</span>
                    </Label>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-2.5"
                      onClick={() => setVisaHoldings(prev => [...prev, { region: "", status: "" }])}>
                      <Plus className="w-3.5 h-3.5" /> Add Visa
                    </Button>
                  </div>

                  {visaHoldings.length === 0 && (
                    <div className="text-sm text-muted-foreground border border-dashed border-muted rounded-lg px-4 py-3 text-center">
                      No visas added — click <span className="font-semibold">Add Visa</span> to record any active/recent visas
                    </div>
                  )}

                  {visaHoldings.map((vh, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Visa / Country Region</Label>
                        <select value={vh.region} onChange={e => setVisaHoldings(prev => prev.map((h, idx) => idx === i ? { ...h, region: e.target.value } : h))}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="">Select region…</option>
                          {VISA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Visa Status</Label>
                        <select value={vh.status} onChange={e => setVisaHoldings(prev => prev.map((h, idx) => idx === i ? { ...h, status: e.target.value } : h))}
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="">Select status…</option>
                          {VISA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => setVisaHoldings(prev => prev.filter((_, idx) => idx !== i))}
                        className="mt-5 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== STEP 6: Documents ===== */}
            {step === 6 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <DocToggle label="Return / onward ticket booked?" val={form.hasReturnTicket || ""} onChange={set("hasReturnTicket")} />
                <DocToggle label="Hotel / accommodation booked?" val={form.hasHotelBooking || ""} onChange={set("hasHotelBooking")} />
                <DocToggle label="Travel insurance policy?" val={form.hasTravelInsurance || ""} onChange={set("hasTravelInsurance")} />
                <DocToggle label="Day-wise travel itinerary?" val={form.hasItinerary || ""} onChange={set("hasItinerary")} />
                <DocToggle label="Invitation letter (host / company)?" val={form.hasInvitationLetter || ""} onChange={set("hasInvitationLetter")} />
                {EMPLOYED_STATUSES.includes(form.employmentStatus) && (
                  <DocToggle label="Leave approval / NOC from employer?" val={form.hasLeaveApproval || ""} onChange={set("hasLeaveApproval")} />
                )}
                <DocToggle label="Cover letter / personal statement?" val={form.hasCoverLetter || ""} onChange={set("hasCoverLetter")} />
                <DocToggle label="Active health / medical insurance?" val={form.hasHealthInsurance || ""} onChange={set("hasHealthInsurance")} />
                <DocToggle label="Police clearance certificate?" val={form.hasPoliceCharacterCertificate || ""} onChange={set("hasPoliceCharacterCertificate")} />
                <DocToggle label="Government-issued national ID?" val={form.hasGovtIssuedId || ""} onChange={set("hasGovtIssuedId")} />
              </div>
            )}

            {/* ===== STEP 7: Home Ties & Extra ===== */}
            {step === 7 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <DocToggle
                  label={form.maritalStatus === "Single" ? "Family members in home country?" : "Spouse / family in home country?"}
                  val={form.familyInHomeCountry || ""} onChange={set("familyInHomeCountry")} />
                <DocToggle label="Property / real estate in home country?" val={form.propertyInHomeCountry || ""} onChange={set("propertyInHomeCountry")} />
                <DocToggle label="Stable employment / active business at home?" val={form.stableEmploymentHome || ""} onChange={set("stableEmploymentHome")} />
                <DocToggle label="Ongoing education / study at home?" val={form.ongoingEducation || ""} onChange={set("ongoingEducation")} />
                <DocToggle label="Financial commitments at home (loans/EMI/rent)?" val={form.financialCommitmentsHome || ""} onChange={set("financialCommitmentsHome")} />
                <Sel label="Dependents in home country" val={form.dependentsHomeCountry || ""} onChange={set("dependentsHomeCountry")} opts={["None","1","2","3","4","5+"]} tooltip="Spouse, children, parents" />
                <Sel label="Contacts at destination country" val={form.destinationContacts || ""} onChange={set("destinationContacts")} opts={["None","Close relatives","Friends","Business contacts","Academic institution"]} />
                {form.destinationContacts && form.destinationContacts !== "None" && (
                  <Sel label="Their visa / residency status" val={form.destinationContactStatus || ""} onChange={set("destinationContactStatus")} opts={["Citizen","Permanent Resident","Long-term Work Visa","Student Visa","Temporary Visitor","Asylum Seeker"]} />
                )}
                <DocToggle label="Active public social media presence?" val={form.hasSocialMedia || ""} onChange={set("hasSocialMedia")} tooltip="LinkedIn, Instagram, Facebook showing travel history" />

                {/* Summary box */}
                <div className="sm:col-span-2 mt-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-800 dark:text-purple-200 text-sm">Ready for AI Analysis</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 leading-relaxed">
                        Your answers across all {STEPS.length} dimensions will be analyzed to generate a comprehensive embassy-style visa risk report with dimension scores, severity-tagged risk flags, and a personalized action plan.
                      </p>
                      {form.nationality && form.destinationCountry && (
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-2 font-medium">
                          Analyzing: {form.nationality} → {form.destinationCountry} ({form.visaType || "Visa type not selected"})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t">
              <Button variant="outline" onClick={prevStep} disabled={step === 1} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              {step < STEPS.length ? (
                <Button onClick={nextStep} className="gap-2" disabled={!canAdvance()}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-3">
                  <ConsentCheckbox
                    checked={consentChecked}
                    onChange={v => { setConsentChecked(v); setConsentError(""); }}
                    error={consentError}
                    context="deepcheck"
                  />
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2 px-6"
                  style={{ background: "linear-gradient(135deg,#7033F0,#4055FF,#FF2060)" }}
                  data-testid="button-run-deep-check"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Running AI Analysis…
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" /> Run Deep Check
                    </>
                  )}
                </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
