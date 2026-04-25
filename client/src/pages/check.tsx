import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Brain, ChevronDown, CheckCircle, AlertCircle, TrendingUp,
  FileText, Lightbulb, ArrowRight, Lock, Info, RefreshCw, ChevronLeft,
  ChevronRight, User, MapPin, CreditCard, Globe, Clock, Star, Download,
  BarChart3, Crown, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

const COUNTRIES = ["Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belgium","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cyprus","Czech Republic","Denmark","Egypt","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Thailand","Tunisia","Turkey","Ukraine","United Arab Emirates","United Kingdom","United States","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

const OPTS = {
  visaType: ["Tourist Visa","Business Visa","Student Visa","Work Visa","Visit Visa","Transit Visa"],
  purposeOfTravel: ["Tourism","Business Meeting","Study","Employment","Family Visit","Medical Treatment","Conference / Event","Other"],
  employmentStatus: ["Employed (Full-time)","Employed (Part-time)","Self-employed / Business Owner","Freelancer","Student","Retired","Unemployed","Other"],
  monthlyIncome: ["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"],
  tripFunding: ["Self-funded","Employer / Company","Family member","Sponsor","Scholarship / Grant"],
  bankBalance: ["Less than $1,000","$1,000 – $3,000","$3,000 – $7,000","$7,000 – $15,000","$15,000 – $30,000","More than $30,000"],
  yesNo: ["Yes","No"],
  yesNoPlanning: ["Yes","No","Planning to get"],
  previousTravel: ["None","1–2 countries","3–5 countries","5+ countries","Extensive (10+)"],
  visaApprovals: ["None","1–2 visas","Several (3–5)","Many (6+)"],
  refusals: ["No","Yes – once","Yes – multiple times"],
  overstay: ["No","Yes"],
  tripDuration: ["1–7 days","8–14 days","15–30 days","1–3 months","More than 3 months"],
  returnTicket: ["Yes","No","Not booked yet"],
  accommodation: ["Yes – hotel booked","Yes – invitation letter","No","Not arranged yet"],
  inviteLetter: ["Yes","No"],
};

interface FormData {
  // Step 1
  nationality: string; destinationCountry: string; visaType: string; purposeOfTravel: string;
  // Step 2
  age: string; employmentStatus: string; jobTitle: string; monthlyIncome: string; tripFunding: string;
  // Step 3
  bankBalance: string; hasBankStatement: string; hasIncomeProof: string; hasTaxReturn: string;
  // Step 4
  previousInternationalTravel: string; countriesVisited: string; previousVisaApprovals: string; previousVisaRefusals: string; overstayHistory: string;
  // Step 5
  tripDuration: string; returnTicket: string; accommodationProof: string; invitationLetter: string; travelInsurance: string;
}

const EMPTY: FormData = {
  nationality: "", destinationCountry: "", visaType: "", purposeOfTravel: "",
  age: "", employmentStatus: "", jobTitle: "", monthlyIncome: "", tripFunding: "",
  bankBalance: "", hasBankStatement: "", hasIncomeProof: "", hasTaxReturn: "",
  previousInternationalTravel: "", countriesVisited: "", previousVisaApprovals: "", previousVisaRefusals: "", overstayHistory: "",
  tripDuration: "", returnTicket: "", accommodationProof: "", invitationLetter: "", travelInsurance: "",
};

const STEPS = [
  { n: 1, title: "Travel Basics", icon: MapPin, fields: ["nationality","destinationCountry","visaType","purposeOfTravel"] },
  { n: 2, title: "Personal Details", icon: User, fields: ["age","employmentStatus","monthlyIncome","tripFunding"] },
  { n: 3, title: "Financial Strength", icon: CreditCard, fields: ["bankBalance","hasBankStatement","hasIncomeProof","hasTaxReturn"] },
  { n: 4, title: "Travel History", icon: Globe, fields: ["previousInternationalTravel","previousVisaRefusals","overstayHistory"] },
  { n: 5, title: "Trip Details", icon: Clock, fields: ["tripDuration","returnTicket","accommodationProof","travelInsurance"] },
  { n: 6, title: "Review & Submit", icon: CheckCircle, fields: [] },
];

interface AIResult {
  approvalChance: number; statusLabel: string; summary: string;
  strengths: string[]; riskFactors: string[]; missingDocuments: string[];
  requiredDocuments: string[]; improvementTips: string[]; nextSteps: string[];
  disclaimer: string;
}

function getColors(score: number) {
  if (score >= 80) return { gradient: "from-emerald-500 to-teal-500", light: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200", bar: "bg-emerald-500" };
  if (score >= 60) return { gradient: "from-blue-500 to-cyan-500", light: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700", ring: "ring-blue-200", bar: "bg-blue-500" };
  if (score >= 40) return { gradient: "from-amber-500 to-orange-400", light: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", ring: "ring-amber-200", bar: "bg-amber-500" };
  return { gradient: "from-red-500 to-rose-400", light: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700", ring: "ring-red-200", bar: "bg-red-500" };
}

function Sel({ label, val, onChange, opts, required }: { label: string; val: string; onChange: (v: string) => void; opts: string[]; required?: boolean }) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <div className="relative">
        <select className="w-full h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" value={val} onChange={e => onChange(e.target.value)}>
          <option value="">Select...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function TextInput({ label, val, onChange, placeholder, type, required }: { label: string; val: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      <Input type={type || "text"} value={val} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="border-slate-200 bg-slate-50 focus:bg-white" data-testid={`input-${label.toLowerCase().replace(/\s/g, "-")}`} />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

export default function CheckPage() {
  const { user, isLoading: authLoading, checksRemaining, canCheck } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [aiProvider, setAiProvider] = useState("");
  const [activeResultTab, setActiveResultTab] = useState<"overview" | "docs" | "tips">("overview");

  useEffect(() => {
    if (!authLoading && !user) setLocation("/join");
  }, [user, authLoading]);

  const { data: savedProfile } = useQuery<any>({
    queryKey: ["/api/b2c/profile"],
    enabled: !!user,
  });

  function set(field: keyof FormData) { return (val: string) => setForm(f => ({ ...f, [field]: val })); }

  function fillFromProfile() {
    if (!savedProfile) return;
    setForm(f => ({
      ...f,
      nationality: savedProfile.nationality || f.nationality,
      employmentStatus: savedProfile.employmentStatus || f.employmentStatus,
      jobTitle: savedProfile.jobTitle || f.jobTitle,
      monthlyIncome: savedProfile.monthlyIncome || f.monthlyIncome,
      bankBalance: savedProfile.bankBalance || f.bankBalance,
      previousInternationalTravel: savedProfile.previousTravel || f.previousInternationalTravel,
      previousVisaRefusals: savedProfile.previousVisaRefusals || f.previousVisaRefusals,
      countriesVisited: savedProfile.countriesVisited || f.countriesVisited,
    }));
    toast({ title: "Profile loaded!", description: "Your saved profile has been applied." });
  }

  function validateStep(): boolean {
    const required: Partial<Record<keyof FormData, boolean>> = {
      1: true, 2: true, 3: true, 4: true, 5: true,
    } as any;

    if (step === 1) return !!(form.nationality && form.destinationCountry && form.visaType && form.purposeOfTravel);
    if (step === 2) return !!(form.age && form.employmentStatus && form.monthlyIncome && form.tripFunding);
    if (step === 3) return !!(form.bankBalance);
    if (step === 4) return !!(form.previousInternationalTravel && form.previousVisaRefusals);
    if (step === 5) return !!(form.tripDuration && form.returnTicket && form.accommodationProof);
    return true;
  }

  function next() {
    if (!validateStep()) {
      toast({ title: "Please fill required fields", description: "Complete all required fields before continuing.", variant: "destructive" });
      return;
    }
    setStep(s => Math.min(6, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!canCheck) { setLocation("/pricing"); return; }
    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/b2c/check", { checkType: "basic", formData: form });
      const data = await res.json();
      setResult(data.result);
      setAiProvider(data.check?.aiProvider || "");
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/checks"] });
    } catch (err: any) {
      if (err.message?.includes("limit reached") || err.message?.includes("upgrade")) {
        setLocation("/pricing");
      } else {
        toast({ title: "Check failed", description: err.message || "Please try again.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setForm(EMPTY);
    setResult(null);
    setStep(1);
  }

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (result) {
    const c = getColors(result.approvalChance);
    return (
      <DashboardLayout title="Visa Assessment Result" subtitle={`${form.visaType} → ${form.destinationCountry}`}>
        <div className="max-w-4xl space-y-5">
          {/* Score hero */}
          <Card className={`border-0 shadow-xl ring-4 ${c.ring} overflow-hidden`} data-testid="result-card">
            <div className={`bg-gradient-to-br ${c.gradient} p-6 md:p-8 text-white`}>
              <div className="flex items-start gap-4 md:gap-8">
                <div className="flex-1">
                  <p className="text-white/70 text-sm font-medium mb-1">AI Approval Estimate</p>
                  <h2 className="text-xl md:text-2xl font-bold mb-1">{form.visaType} → {form.destinationCountry}</h2>
                  <p className="text-white/80 text-sm mb-3">{form.nationality} • {form.purposeOfTravel} • {form.tripDuration}</p>
                  {aiProvider && aiProvider !== "mock" && (
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      Powered by {aiProvider === "openai" ? "OpenAI GPT" : "Claude AI"}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-6xl md:text-7xl font-black leading-none" data-testid="score-value">{result.approvalChance}%</div>
                  <div className={`mt-2 px-3 py-1 rounded-full text-sm font-semibold ${c.badge}`}>{result.statusLabel}</div>
                </div>
              </div>
              <div className="mt-5 h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: `${result.approvalChance}%` }} />
              </div>
            </div>

            <CardContent className="p-6 bg-white">
              <div className="flex items-start gap-3 mb-5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed" data-testid="result-summary">{result.summary}</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-xl">
                {(["overview", "docs", "tips"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveResultTab(tab)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeResultTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {tab === "overview" ? "Overview" : tab === "docs" ? "Documents" : "Action Plan"}
                  </button>
                ))}
              </div>

              {activeResultTab === "overview" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5 mb-2.5">
                      <CheckCircle className="w-4 h-4" /> Strengths
                    </p>
                    <div className="space-y-2">
                      {result.strengths.map((s, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-800">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-2.5">
                      <AlertCircle className="w-4 h-4" /> Risk Factors
                    </p>
                    <div className="space-y-2">
                      {result.riskFactors.map((r, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-sm">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-red-800">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeResultTab === "docs" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2.5">
                      <FileText className="w-4 h-4 text-blue-600" /> Required Documents
                    </p>
                    <div className="space-y-1.5">
                      {(result.requiredDocuments || []).map((d, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                          <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-blue-800">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2.5">
                      <AlertCircle className="w-4 h-4" /> Missing / Gaps
                    </p>
                    <div className="space-y-1.5">
                      {result.missingDocuments.map((d, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-sm">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-amber-800">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeResultTab === "tips" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 flex items-center gap-1.5 mb-2.5">
                      <Lightbulb className="w-4 h-4" /> Improvement Tips
                    </p>
                    <div className="space-y-2">
                      {(result.improvementTips || []).map((t, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-sm">
                          <Lightbulb className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-blue-800">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Next Steps
                    </p>
                    <div className="space-y-2">
                      {(result.nextSteps || []).map((s, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                          <span className="text-slate-700">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-slate-50 border text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{result.disclaimer}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700 gap-2" data-testid="button-new-check">
                  <RefreshCw className="w-4 h-4" /> New Check
                </Button>
                <Link href="/history">
                  <Button variant="outline" className="gap-2">
                    <Clock className="w-4 h-4" /> View History
                  </Button>
                </Link>
                {!user.deepCheckAccess && (
                  <Link href="/deep-check">
                    <Button variant="outline" className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                      <Crown className="w-4 h-4" /> Try Deep Check
                    </Button>
                  </Link>
                )}
                {!user.deepCheckAccess && (
                  <Button variant="outline" className="gap-2 text-slate-400 cursor-not-allowed" disabled>
                    <Download className="w-4 h-4" /> PDF (Pro only)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const currentStep = STEPS[step - 1];
  const StepIcon = currentStep.icon;
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <DashboardLayout title="New Visa Check" subtitle={`Step ${step} of 6 — ${currentStep.title}`}>
      <div className="max-w-2xl">
        {/* Limit warning */}
        {!canCheck && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Check limit reached</p>
              <p className="text-sm text-amber-700">
                <Link href="/pricing" className="underline font-medium">Upgrade your plan</Link> to run more visa checks.
              </p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-5 overflow-x-auto pb-1">
              {STEPS.map(s => {
                const Icon = s.icon;
                const isDone = s.n < step;
                const isActive = s.n === step;
                return (
                  <div key={s.n} className="flex items-center gap-1.5 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                      isDone ? "bg-emerald-500 text-white" : isActive ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-400"
                    }`}>
                      {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <span>{s.n}</span>}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${isActive ? "text-blue-700" : isDone ? "text-emerald-600" : "text-slate-400"}`}>{s.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Card className="bg-white shadow-sm border-slate-100">
          <CardContent className="p-6 md:p-8">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">Step {step}: {currentStep.title}</h2>
                <p className="text-xs text-slate-400">
                  {step === 1 && "Where are you going and why?"}
                  {step === 2 && "Tell us about yourself"}
                  {step === 3 && "Your financial profile"}
                  {step === 4 && "Your travel background"}
                  {step === 5 && "Your trip specifics"}
                  {step === 6 && "Review all your answers before submitting"}
                </p>
              </div>
            </div>

            {/* Use saved profile (Step 1 only) */}
            {step === 1 && savedProfile?.nationality && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 font-medium">Saved profile available</span>
                </div>
                <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs" onClick={fillFromProfile}>
                  Use My Profile
                </Button>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Sel label="Nationality" val={form.nationality} onChange={set("nationality")} opts={COUNTRIES} required />
                <Sel label="Destination Country" val={form.destinationCountry} onChange={set("destinationCountry")} opts={COUNTRIES} required />
                <Sel label="Visa Type" val={form.visaType} onChange={set("visaType")} opts={OPTS.visaType} required />
                <Sel label="Purpose of Travel" val={form.purposeOfTravel} onChange={set("purposeOfTravel")} opts={OPTS.purposeOfTravel} required />
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <TextInput label="Age" val={form.age} onChange={set("age")} type="number" placeholder="e.g. 28" required />
                <Sel label="Employment Status" val={form.employmentStatus} onChange={set("employmentStatus")} opts={OPTS.employmentStatus} required />
                <TextInput label="Job Title (optional)" val={form.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Software Engineer" />
                <Sel label="Monthly Income (USD)" val={form.monthlyIncome} onChange={set("monthlyIncome")} opts={OPTS.monthlyIncome} required />
                <div className="sm:col-span-2">
                  <Sel label="Who is Funding the Trip?" val={form.tripFunding} onChange={set("tripFunding")} opts={OPTS.tripFunding} required />
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <Sel label="Approximate Bank Balance (USD)" val={form.bankBalance} onChange={set("bankBalance")} opts={OPTS.bankBalance} required />
                <div className="grid sm:grid-cols-3 gap-3">
                  <Sel label="Bank Statement Available?" val={form.hasBankStatement} onChange={set("hasBankStatement")} opts={OPTS.yesNo} />
                  <Sel label="Income Proof Available?" val={form.hasIncomeProof} onChange={set("hasIncomeProof")} opts={OPTS.yesNo} />
                  <Sel label="Tax Return Available?" val={form.hasTaxReturn} onChange={set("hasTaxReturn")} opts={OPTS.yesNo} />
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Strong financial documentation significantly boosts visa approval chances. Having bank statements and income proof is highly recommended.</span>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Sel label="Previous International Travel" val={form.previousInternationalTravel} onChange={set("previousInternationalTravel")} opts={OPTS.previousTravel} required />
                <Sel label="Previous Visa Approvals" val={form.previousVisaApprovals} onChange={set("previousVisaApprovals")} opts={OPTS.visaApprovals} />
                <Sel label="Previous Visa Refusals?" val={form.previousVisaRefusals} onChange={set("previousVisaRefusals")} opts={OPTS.refusals} required />
                <Sel label="Any Overstay History?" val={form.overstayHistory} onChange={set("overstayHistory")} opts={OPTS.overstay} />
                <div className="sm:col-span-2">
                  <TextInput label="Countries Visited (optional)" val={form.countriesVisited} onChange={set("countriesVisited")} placeholder="e.g. UAE, Malaysia, Turkey, UK" />
                </div>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Sel label="Trip Duration" val={form.tripDuration} onChange={set("tripDuration")} opts={OPTS.tripDuration} required />
                <Sel label="Return Ticket Booked?" val={form.returnTicket} onChange={set("returnTicket")} opts={OPTS.returnTicket} required />
                <Sel label="Hotel Booking / Invitation Letter?" val={form.accommodationProof} onChange={set("accommodationProof")} opts={OPTS.accommodation} required />
                <Sel label="Invitation Letter Available?" val={form.invitationLetter} onChange={set("invitationLetter")} opts={OPTS.inviteLetter} />
                <div className="sm:col-span-2">
                  <Sel label="Travel Insurance?" val={form.travelInsurance} onChange={set("travelInsurance")} opts={OPTS.yesNoPlanning} />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-sm font-semibold text-blue-800 mb-1">Ready to generate your AI visa assessment?</p>
                  <p className="text-sm text-blue-600">Double-check your details below, then click "Generate AI Visa Chance".</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="border-slate-100">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Travel Basics</p>
                      <ReviewRow label="Nationality" value={form.nationality} />
                      <ReviewRow label="Destination" value={form.destinationCountry} />
                      <ReviewRow label="Visa Type" value={form.visaType} />
                      <ReviewRow label="Purpose" value={form.purposeOfTravel} />
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Personal</p>
                      <ReviewRow label="Age" value={form.age} />
                      <ReviewRow label="Employment" value={form.employmentStatus} />
                      {form.jobTitle && <ReviewRow label="Job Title" value={form.jobTitle} />}
                      <ReviewRow label="Monthly Income" value={form.monthlyIncome} />
                      <ReviewRow label="Funding" value={form.tripFunding} />
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Financial</p>
                      <ReviewRow label="Bank Balance" value={form.bankBalance} />
                      <ReviewRow label="Bank Statement" value={form.hasBankStatement} />
                      <ReviewRow label="Income Proof" value={form.hasIncomeProof} />
                      <ReviewRow label="Tax Return" value={form.hasTaxReturn} />
                    </CardContent>
                  </Card>

                  <Card className="border-slate-100">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Trip & History</p>
                      <ReviewRow label="Prev. Travel" value={form.previousInternationalTravel} />
                      <ReviewRow label="Refusals" value={form.previousVisaRefusals} />
                      <ReviewRow label="Duration" value={form.tripDuration} />
                      <ReviewRow label="Return Ticket" value={form.returnTicket} />
                      <ReviewRow label="Accommodation" value={form.accommodationProof} />
                    </CardContent>
                  </Card>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canCheck}
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 gap-2"
                  data-testid="button-submit-check"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI is analyzing your visa profile...
                    </span>
                  ) : !canCheck ? (
                    <span className="flex items-center gap-2"><Lock className="w-5 h-5" /> Upgrade to Run More Checks</span>
                  ) : (
                    <span className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Generate AI Visa Chance</span>
                  )}
                </Button>
              </div>
            )}

            {/* Navigation */}
            {step < 6 && (
              <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={back}
                  disabled={step === 1}
                  className="gap-2"
                  data-testid="button-back"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={next}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                  data-testid="button-next"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {step === 6 && (
              <div className="flex items-center mt-5 pt-5 border-t border-slate-100">
                <Button variant="outline" onClick={back} className="gap-2" data-testid="button-back-review">
                  <ChevronLeft className="w-4 h-4" /> Edit Answers
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
