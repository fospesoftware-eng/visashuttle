import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Brain, ChevronDown, CheckCircle, AlertCircle, TrendingUp,
  FileText, Lightbulb, Info, RefreshCw, ChevronLeft, ChevronRight,
  User, MapPin, CreditCard, Globe, Clock, Crown, Download, Lock,
  ArrowRight, Flag, Home, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SearchableSelect, MultiSearchableSelect } from "@/components/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

const COUNTRIES = ["Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belgium","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cyprus","Czech Republic","Denmark","Egypt","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Thailand","Tunisia","Turkey","Ukraine","United Arab Emirates","United Kingdom","United States","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

const OPTS = {
  gender: ["Male","Female","Non-binary","Prefer not to say"],
  maritalStatus: ["Single","Married","Divorced","Widowed","Separated"],
  dependents: ["None","1","2","3","4","5+"],
  visaType: ["Tourist Visa","Business Visa","Student Visa","Work Visa","Visit Visa","Transit Visa","Investor Visa","Spouse/Family Visa","Conference/Event Visa"],
  purposeOfTravel: ["Tourism & Sightseeing","Business Meeting","Study","Employment","Family Visit","Medical Treatment","Conference / Event","Transit","Wedding / Event","Investment"],
  tripDuration: ["1–3 days","4–7 days","8–14 days","15–30 days","1–3 months","More than 3 months"],
  entryType: ["Single Entry","Multiple Entry"],
  yesNo: ["Yes","No"],
  yesNoMaybe: ["Yes","No","Planning to get"],
  employmentStatus: ["Employed (Full-time)","Employed (Part-time)","Self-employed / Business Owner","Freelancer","Student","Retired","Unemployed","Government Employee","Other"],
  yearsInJob: ["Less than 1 year","1–2 years","2–5 years","5–10 years","More than 10 years"],
  monthlyIncome: ["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"],
  sourceOfIncome: ["Employment Salary","Business Revenue","Freelance / Consultancy","Investment Returns","Rental Income","Pension / Retirement","Family Support","Government Benefits"],
  bankBalance: ["Less than $1,000","$1,000 – $3,000","$3,000 – $7,000","$7,000 – $15,000","$15,000 – $30,000","More than $30,000"],
  statementDuration: ["1 month","3 months","6 months","12 months"],
  tripFunding: ["Self-funded","Employer / Company","Family member","Sponsor / Host","Scholarship / Grant","Business funds"],
  numberOfTrips: ["None","1–2 trips","3–5 trips","6–10 trips","10+ trips"],
  visaApprovals: ["None","1–2 visas approved","Several (3–5)","Many (6+)"],
  refusals: ["No","Yes – once","Yes – multiple times"],
};

interface FormData {
  nationality: string; passportCountry: string; dateOfBirth: string; gender: string;
  maritalStatus: string; countryOfResidence: string; dependentsHomeCountry: string;
  destinationCountry: string; visaType: string; purposeOfTravel: string;
  plannedTravelDate: string; tripDuration: string; entryType: string; firstTimeVisitor: string;
  employmentStatus: string; jobTitle: string; companyName: string; yearsInJob: string;
  monthlyIncome: string; sourceOfIncome: string; hasTaxReturn: string; hasSalarySlips: string;
  bankBalance: string; hasBankStatement: string; bankStatementDuration: string;
  hasLargeDeposits: string; hasCreditCard: string; hasProperty: string;
  tripFunding: string; sponsorDetails: string;
  countriesVisited: string; numberOfTrips: string; previousVisaApprovals: string;
  previousVisaRefusals: string; refusalReason: string; hasOverstay: string; hasDeportation: string;
  hasReturnTicket: string; hasHotelBooking: string; hasInvitationLetter: string;
  hasTravelInsurance: string; hasItinerary: string; hasLeaveApproval: string; hasCoverLetter: string;
  familyInHomeCountry: string; propertyInHomeCountry: string; stableEmploymentHome: string;
  ongoingEducation: string; financialCommitmentsHome: string; criminalRecord: string; immigrationViolation: string;
}

const EMPTY: FormData = {
  nationality: "", passportCountry: "", dateOfBirth: "", gender: "",
  maritalStatus: "", countryOfResidence: "", dependentsHomeCountry: "",
  destinationCountry: "", visaType: "", purposeOfTravel: "",
  plannedTravelDate: "", tripDuration: "", entryType: "", firstTimeVisitor: "",
  employmentStatus: "", jobTitle: "", companyName: "", yearsInJob: "",
  monthlyIncome: "", sourceOfIncome: "", hasTaxReturn: "", hasSalarySlips: "",
  bankBalance: "", hasBankStatement: "", bankStatementDuration: "",
  hasLargeDeposits: "", hasCreditCard: "", hasProperty: "",
  tripFunding: "", sponsorDetails: "",
  countriesVisited: "", numberOfTrips: "", previousVisaApprovals: "",
  previousVisaRefusals: "", refusalReason: "", hasOverstay: "", hasDeportation: "",
  hasReturnTicket: "", hasHotelBooking: "", hasInvitationLetter: "",
  hasTravelInsurance: "", hasItinerary: "", hasLeaveApproval: "", hasCoverLetter: "",
  familyInHomeCountry: "", propertyInHomeCountry: "", stableEmploymentHome: "",
  ongoingEducation: "", financialCommitmentsHome: "", criminalRecord: "", immigrationViolation: "",
};

const STEPS = [
  { n: 1, title: "Personal Profile", icon: User, color: "text-violet-600", bg: "bg-violet-50" },
  { n: 2, title: "Travel Plan", icon: MapPin, color: "text-[#4055FF]", bg: "bg-[#4055FF]/8" },
  { n: 3, title: "Employment & Income", icon: Star, color: "text-emerald-600", bg: "bg-emerald-50" },
  { n: 4, title: "Financial Strength", icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
  { n: 5, title: "Travel History", icon: Globe, color: "text-cyan-600", bg: "bg-cyan-50" },
  { n: 6, title: "Documents", icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
  { n: 7, title: "Home Country Ties", icon: Home, color: "text-rose-600", bg: "bg-rose-50" },
  { n: 8, title: "Review & Submit", icon: CheckCircle, color: "text-[#4055FF]", bg: "bg-[#4055FF]/8" },
];

interface AIResult {
  approvalChance: number; statusLabel: string; summary: string;
  strengths: string[]; riskFactors: string[]; missingDocuments: string[];
  requiredDocuments: string[]; countrySpecificConcerns: string[];
  improvementTips: string[]; nextSteps: string[];
  finalRecommendation: string; disclaimer: string;
}

function getColors(score: number) {
  if (score >= 80) return { grad: "from-emerald-500 to-teal-500", badge: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-100", bar: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-700" };
  if (score >= 60) return { grad: "from-[#4055FF] to-[#9033F5]", badge: "bg-[#4055FF]/10 text-[#4055FF]", ring: "ring-[#4055FF]/15", bar: "bg-[#4055FF]", light: "bg-[#4055FF]/8", text: "text-[#4055FF]" };
  if (score >= 40) return { grad: "from-amber-500 to-orange-400", badge: "bg-amber-100 text-amber-700", ring: "ring-amber-100", bar: "bg-amber-500", light: "bg-amber-50", text: "text-amber-700" };
  return { grad: "from-red-500 to-rose-400", badge: "bg-red-100 text-red-700", ring: "ring-red-100", bar: "bg-red-500", light: "bg-red-50", text: "text-red-700" };
}

function Sel({ label, val, onChange, opts, required, tooltip, testId }: { label: string; val: string; onChange: (v: string) => void; opts: string[]; required?: boolean; tooltip?: string; testId?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
        {tooltip && <span className="text-xs text-slate-400 italic">({tooltip})</span>}
      </div>
      <div className="relative">
        <select
          data-testid={testId || `select-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className="w-full h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:border-slate-300"
          value={val}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function DocToggle({ label, val, onChange, tooltip }: { label: string; val: string; onChange: (v: string) => void; tooltip?: string }) {
  const isYes = val === "Yes";
  const isNo = val === "No";
  return (
    <div className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${isYes ? "border-emerald-300 bg-emerald-50" : isNo ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {tooltip && <p className="text-xs text-slate-400 mt-0.5">{tooltip}</p>}
      </div>
      <div className="flex gap-1.5 flex-shrink-0 ml-3">
        {["Yes","No"].map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${val === opt
              ? opt === "Yes" ? "bg-emerald-500 text-white shadow-sm" : "bg-red-400 text-white shadow-sm"
              : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewSection({ title, icon: Icon, items }: { title: string; icon: any; items: [string, string][] }) {
  const filled = items.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#4055FF]" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      </div>
      <div className="space-y-1.5">
        {filled.map(([label, val]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="text-xs text-slate-500">{label}</span>
            <span className="text-xs font-medium text-slate-800 text-right max-w-[55%] break-words">{val}</span>
          </div>
        ))}
      </div>
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
  const [tab, setTab] = useState<"overview" | "docs" | "tips" | "country">("overview");
  const [profileUsed, setProfileUsed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/join");
  }, [user, authLoading]);

  const { data: savedProfile } = useQuery<any>({
    queryKey: ["/api/b2c/profile"],
    enabled: !!user,
  });

  // Auto pre-fill from saved profile on first load
  useEffect(() => {
    if (savedProfile?.nationality && !profileUsed) {
      applyProfile();
    }
  }, [savedProfile]);

  function applyProfile() {
    if (!savedProfile) return;
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
    setProfileUsed(true);
  }

  function set(field: keyof FormData) { return (val: string) => setForm(f => ({ ...f, [field]: val })); }

  function validateStep(): boolean {
    if (step === 1) return !!form.nationality;
    if (step === 2) return !!(form.destinationCountry && form.visaType && form.purposeOfTravel && form.tripDuration);
    if (step === 3) return !!(form.employmentStatus && form.monthlyIncome);
    if (step === 4) return !!(form.bankBalance && form.tripFunding);
    if (step === 5) return !!form.previousVisaRefusals;
    return true;
  }

  function next() {
    if (!validateStep()) {
      toast({ title: "Please fill required fields", description: "Complete the highlighted fields before continuing.", variant: "destructive" });
      return;
    }
    setStep(s => Math.min(8, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() { setStep(s => Math.max(1, s - 1)); }

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
      if (err.message?.includes("limit") || err.message?.includes("upgrade")) {
        setLocation("/pricing");
      } else {
        toast({ title: "Check failed", description: err.message || "Please try again.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() { setForm(EMPTY); setResult(null); setStep(1); setProfileUsed(false); }

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ===== RESULT SCREEN =====
  if (result) {
    const c = getColors(result.approvalChance);
    return (
      <DashboardLayout title="AI Visa Assessment" subtitle={`${form.visaType} → ${form.destinationCountry}`}>
        <div className="w-full max-w-5xl">
          {/* Score hero */}
          <Card className={`border-0 shadow-xl ring-2 ${c.ring} overflow-hidden mb-5`} data-testid="result-card">
            <div className={`bg-gradient-to-br ${c.grad} p-6 md:p-8 text-white`}>
              <div className="flex items-start gap-6 md:gap-10">
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-sm mb-1">AI Approval Estimate</p>
                  <h2 className="text-2xl font-bold mb-1 leading-tight">{form.visaType}</h2>
                  <div className="flex items-center gap-2 text-white/90 text-sm mb-3 flex-wrap">
                    <span>{form.nationality}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="font-semibold">{form.destinationCountry}</span>
                    <span>•</span>
                    <span>{form.purposeOfTravel}</span>
                  </div>
                  {aiProvider && aiProvider !== "mock" && (
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      Powered by {aiProvider === "openai" ? "OpenAI GPT-4" : "Claude AI"}
                    </Badge>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-5xl md:text-7xl font-black leading-none" data-testid="score-value">{result.approvalChance}%</div>
                  <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-bold ${c.badge}`}>{result.statusLabel}</div>
                </div>
              </div>
              <div className="mt-5 h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${result.approvalChance}%` }} />
              </div>
            </div>

            <CardContent className="p-6 bg-white">
              {/* Summary + final recommendation */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-5">
                <Brain className="w-5 h-5 text-[#4055FF] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-2" data-testid="result-summary">{result.summary}</p>
                  {result.finalRecommendation && (
                    <p className={`text-sm font-semibold ${c.text}`}>{result.finalRecommendation}</p>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                {([["overview","Overview"],["docs","Documents"],["tips","Action Plan"],["country","Country Info"]] as const).map(([t, label]) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-shrink-0 flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Strengths ({result.strengths.length})
                    </p>
                    <div className="space-y-1.5">
                      {result.strengths.map((s, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-800">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Risk Factors ({result.riskFactors.length})
                    </p>
                    <div className="space-y-1.5">
                      {result.riskFactors.map((r, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span className="text-red-800">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "docs" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[#4055FF] uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                      <FileText className="w-3.5 h-3.5" /> Required Documents
                    </p>
                    <div className="space-y-1.5">
                      {result.requiredDocuments?.map((d, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-[#4055FF]/8 border border-[#4055FF]/15 text-xs">
                          <CheckCircle className="w-3.5 h-3.5 text-[#4055FF] flex-shrink-0 mt-0.5" />
                          <span className="text-[#4055FF]/90">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Missing / Gaps
                    </p>
                    <div className="space-y-1.5">
                      {result.missingDocuments.length === 0 ? (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5" />
                          No major document gaps found!
                        </div>
                      ) : result.missingDocuments.map((d, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-amber-800">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "tips" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[#4055FF] uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                      <Lightbulb className="w-3.5 h-3.5" /> Improvement Tips
                    </p>
                    <div className="space-y-1.5">
                      {result.improvementTips?.map((t, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-[#4055FF]/8 border border-[#4055FF]/15 text-xs">
                          <Lightbulb className="w-3.5 h-3.5 text-[#4055FF] flex-shrink-0 mt-0.5" />
                          <span className="text-[#4055FF]/90">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Next Steps
                    </p>
                    <div className="space-y-1.5">
                      {result.nextSteps?.map((s, i) => (
                        <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                          <span className="text-slate-700">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === "country" && (
                <div>
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                    <Flag className="w-3.5 h-3.5" /> {form.destinationCountry} — Specific Requirements & Notes
                  </p>
                  <div className="space-y-2">
                    {(result.countrySpecificConcerns || []).map((c, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100 text-sm">
                        <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span className="text-orange-800">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-slate-50 border text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{result.disclaimer}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={resetForm} className="border-0 text-white hover:opacity-90 gap-2" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}} data-testid="button-new-check">
                  <RefreshCw className="w-4 h-4" /> New Check
                </Button>
                <Link href="/history">
                  <Button variant="outline" className="gap-2"><Clock className="w-4 h-4" /> View History</Button>
                </Link>
                {!user.deepCheckAccess && (
                  <Link href="/deep-check">
                    <Button variant="outline" className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                      <Crown className="w-4 h-4" /> Try Deep Check
                    </Button>
                  </Link>
                )}
                <Button variant="outline" disabled className="gap-2 text-slate-400 cursor-not-allowed">
                  <Download className="w-4 h-4" /> PDF (Pro only)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ===== FORM WIZARD =====
  const currentStep = STEPS[step - 1];
  const StepIcon = currentStep.icon;
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <DashboardLayout title="New Visa Check" subtitle={`Step ${step} of ${STEPS.length} — ${currentStep.title}`}>
      <div className="w-full max-w-3xl">

        {/* Limit warning */}
        {!canCheck && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Check limit reached</p>
              <p className="text-sm text-amber-700"><Link href="/pricing" className="underline font-medium">Upgrade your plan</Link> to run more visa checks.</p>
            </div>
          </div>
        )}

        {/* Profile used badge */}
        {profileUsed && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="font-medium">Using saved profile</span>
            <span className="text-emerald-600">— fields pre-filled from your profile</span>
          </div>
        )}

        {/* Step pills */}
        <div className="mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3">
            {STEPS.map(s => {
              const SIcon = s.icon;
              const done = s.n < step;
              const active = s.n === step;
              return (
                <div key={s.n} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${
                  done ? "bg-emerald-100 text-emerald-700" : active ? `${s.bg} ${s.color} shadow-sm` : "bg-white text-slate-400 border border-slate-100"
                }`}>
                  {done ? <CheckCircle className="w-3 h-3" /> : <SIcon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{s.n}</span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#4055FF,#FF2060)" }} />
          </div>
        </div>

        <Card className="bg-white shadow-sm border-slate-100">
          <CardContent className="p-6 md:p-8">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className={`w-10 h-10 rounded-xl ${currentStep.bg} flex items-center justify-center flex-shrink-0`}>
                <StepIcon className={`w-5 h-5 ${currentStep.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Step {step} of {STEPS.length}</p>
                <h2 className="font-bold text-slate-800 text-lg leading-tight">{currentStep.title}</h2>
              </div>
            </div>

            {/* Saved profile prompt (step 1 only when no auto-fill happened) */}
            {step === 1 && savedProfile?.nationality && !profileUsed && (
              <div className="mb-5 p-3 rounded-xl bg-[#4055FF]/8 border border-[#4055FF]/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#4055FF] flex-shrink-0" />
                  <span className="text-sm text-[#4055FF] font-medium">Saved profile available for <strong>{savedProfile.nationality}</strong></span>
                </div>
                <Button size="sm" variant="outline" className="border-[#4055FF]/30 text-[#4055FF] hover:bg-[#4055FF]/5 text-xs flex-shrink-0" onClick={() => { applyProfile(); toast({ title: "Profile applied!", description: "Your saved details have been pre-filled." }); }}>
                  Use Profile
                </Button>
              </div>
            )}

            {/* ===== STEP 1: Personal Profile ===== */}
            {step === 1 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <SearchableSelect label="Nationality" required value={form.nationality} onChange={set("nationality")} options={COUNTRIES} placeholder="Search nationality..." data-testid="select-nationality" />
                <SearchableSelect label="Passport Country" value={form.passportCountry} onChange={set("passportCountry")} options={COUNTRIES} placeholder="Search country..." />
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Date of Birth</Label>
                  <Input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth")(e.target.value)} className="border-slate-200 bg-slate-50 focus:bg-white" data-testid="input-dob" />
                </div>
                <Sel label="Gender" val={form.gender} onChange={set("gender")} opts={OPTS.gender} />
                <Sel label="Marital Status" val={form.maritalStatus} onChange={set("maritalStatus")} opts={OPTS.maritalStatus} />
                <SearchableSelect label="Country of Residence" value={form.countryOfResidence} onChange={set("countryOfResidence")} options={COUNTRIES} placeholder="Search country..." />
                <div className="sm:col-span-2">
                  <Sel label="Dependents in Home Country" val={form.dependentsHomeCountry} onChange={set("dependentsHomeCountry")} opts={OPTS.dependents} tooltip="spouse, children, parents" />
                </div>
              </div>
            )}

            {/* ===== STEP 2: Travel Plan ===== */}
            {step === 2 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <SearchableSelect label="Destination Country" required value={form.destinationCountry} onChange={set("destinationCountry")} options={COUNTRIES} placeholder="Search country..." data-testid="select-destination" />
                <Sel label="Visa Type" val={form.visaType} onChange={set("visaType")} opts={OPTS.visaType} required />
                <Sel label="Purpose of Travel" val={form.purposeOfTravel} onChange={set("purposeOfTravel")} opts={OPTS.purposeOfTravel} required />
                <Sel label="Trip Duration" val={form.tripDuration} onChange={set("tripDuration")} opts={OPTS.tripDuration} required />
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Planned Travel Date</Label>
                  <Input type="date" value={form.plannedTravelDate} onChange={e => set("plannedTravelDate")(e.target.value)} className="border-slate-200 bg-slate-50" data-testid="input-travel-date" />
                </div>
                <Sel label="Entry Type" val={form.entryType} onChange={set("entryType")} opts={OPTS.entryType} />
                <div className="sm:col-span-2">
                  <DocToggle label="First-time visitor to this destination?" val={form.firstTimeVisitor} onChange={set("firstTimeVisitor")} />
                </div>
              </div>
            )}

            {/* ===== STEP 3: Employment & Income ===== */}
            {step === 3 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Sel label="Employment Status" val={form.employmentStatus} onChange={set("employmentStatus")} opts={OPTS.employmentStatus} required />
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Job Title</Label>
                  <Input value={form.jobTitle} onChange={e => set("jobTitle")(e.target.value)} placeholder="e.g. Software Engineer" className="border-slate-200 bg-slate-50" data-testid="input-jobtitle" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Company / Employer Name</Label>
                  <Input value={form.companyName} onChange={e => set("companyName")(e.target.value)} placeholder="e.g. Acme Corp" className="border-slate-200 bg-slate-50" data-testid="input-company" />
                </div>
                <Sel label="Years in Current Role / Business" val={form.yearsInJob} onChange={set("yearsInJob")} opts={OPTS.yearsInJob} />
                <Sel label="Monthly Income (USD)" val={form.monthlyIncome} onChange={set("monthlyIncome")} opts={OPTS.monthlyIncome} required />
                <Sel label="Primary Source of Income" val={form.sourceOfIncome} onChange={set("sourceOfIncome")} opts={OPTS.sourceOfIncome} />
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3">
                  <DocToggle label="Salary slips available?" val={form.hasSalarySlips} onChange={set("hasSalarySlips")} tooltip="Last 3 months" />
                  <DocToggle label="Tax return available?" val={form.hasTaxReturn} onChange={set("hasTaxReturn")} tooltip="Latest year" />
                </div>
              </div>
            )}

            {/* ===== STEP 4: Financial Strength ===== */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Sel label="Approximate Bank Balance (USD)" val={form.bankBalance} onChange={set("bankBalance")} opts={OPTS.bankBalance} required />
                  <Sel label="Who is Funding the Trip?" val={form.tripFunding} onChange={set("tripFunding")} opts={OPTS.tripFunding} required />
                  {form.tripFunding === "Sponsor / Host" && (
                    <div className="sm:col-span-2">
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Sponsor Details</Label>
                      <Input value={form.sponsorDetails} onChange={e => set("sponsorDetails")(e.target.value)} placeholder="e.g. Relationship, country of sponsor" className="border-slate-200 bg-slate-50" />
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <DocToggle label="Bank statement available?" val={form.hasBankStatement} onChange={set("hasBankStatement")} tooltip="3–6 months" />
                  <Sel label="Statement covers how long?" val={form.bankStatementDuration} onChange={set("bankStatementDuration")} opts={OPTS.statementDuration} />
                  <DocToggle label="Any large recent deposits?" val={form.hasLargeDeposits} onChange={set("hasLargeDeposits")} tooltip="Unusual one-time transfers" />
                  <DocToggle label="Credit card available?" val={form.hasCreditCard} onChange={set("hasCreditCard")} />
                  <DocToggle label="Own property or assets?" val={form.hasProperty} onChange={set("hasProperty")} tooltip="Property, vehicle, investments" />
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Strong financial documentation is the single biggest factor in visa approval. A bank balance of $5,000+ consistent over 3 months is recommended for most tourist visas.</span>
                </div>
              </div>
            )}

            {/* ===== STEP 5: Travel History ===== */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Sel label="Total International Trips (lifetime)" val={form.numberOfTrips} onChange={set("numberOfTrips")} opts={OPTS.numberOfTrips} />
                  <Sel label="Previous Visa Approvals" val={form.previousVisaApprovals} onChange={set("previousVisaApprovals")} opts={OPTS.visaApprovals} />
                  <div className="sm:col-span-2">
                    <Sel label="Previous Visa Refusals?" val={form.previousVisaRefusals} onChange={set("previousVisaRefusals")} opts={OPTS.refusals} required />
                  </div>
                  {form.previousVisaRefusals !== "No" && form.previousVisaRefusals && (
                    <div className="sm:col-span-2">
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Refusal Reason (optional)</Label>
                      <Input value={form.refusalReason} onChange={e => set("refusalReason")(e.target.value)} placeholder="e.g. Insufficient financial proof, incomplete documents" className="border-slate-200 bg-slate-50" />
                    </div>
                  )}
                </div>
                <div>
                  <MultiSearchableSelect
                    label="Countries Visited in Last 3 Years"
                    value={form.countriesVisited}
                    onChange={set("countriesVisited")}
                    options={COUNTRIES}
                    placeholder="Search and select countries..."
                    data-testid="multi-countries"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <DocToggle label="Any previous overstay?" val={form.hasOverstay} onChange={set("hasOverstay")} tooltip="Stayed beyond visa expiry" />
                  <DocToggle label="Any deportation history?" val={form.hasDeportation} onChange={set("hasDeportation")} tooltip="Removed from a country" />
                </div>
              </div>
            )}

            {/* ===== STEP 6: Documents ===== */}
            {step === 6 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-4">Mark which documents you currently have or can obtain for this application.</p>
                <DocToggle label="Return ticket booked?" val={form.hasReturnTicket} onChange={set("hasReturnTicket")} tooltip="Even refundable is fine" />
                <DocToggle label="Hotel booking / accommodation?" val={form.hasHotelBooking} onChange={set("hasHotelBooking")} tooltip="Booking.com or similar confirmation" />
                <DocToggle label="Invitation letter from host?" val={form.hasInvitationLetter} onChange={set("hasInvitationLetter")} />
                <DocToggle label="Travel insurance?" val={form.hasTravelInsurance} onChange={set("hasTravelInsurance")} tooltip="Mandatory for Schengen, recommended everywhere" />
                <DocToggle label="Day-wise travel itinerary?" val={form.hasItinerary} onChange={set("hasItinerary")} tooltip="Planned daily schedule" />
                <DocToggle label="Leave approval / NOC from employer?" val={form.hasLeaveApproval} onChange={set("hasLeaveApproval")} tooltip="Required for employed applicants" />
                <DocToggle label="Cover letter / personal statement?" val={form.hasCoverLetter} onChange={set("hasCoverLetter")} tooltip="Explains travel purpose and home ties" />
              </div>
            )}

            {/* ===== STEP 7: Home Country Ties ===== */}
            {step === 7 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-4">Stronger home-country ties = lower immigration risk in the embassy's assessment.</p>
                <DocToggle label="Family members staying in home country?" val={form.familyInHomeCountry} onChange={set("familyInHomeCountry")} tooltip="Spouse, children, parents, etc." />
                <DocToggle label="Own property in home country?" val={form.propertyInHomeCountry} onChange={set("propertyInHomeCountry")} tooltip="Home, land, or real estate" />
                <DocToggle label="Stable employment / active business?" val={form.stableEmploymentHome} onChange={set("stableEmploymentHome")} tooltip="Ongoing role you'll return to" />
                <DocToggle label="Ongoing education or studies?" val={form.ongoingEducation} onChange={set("ongoingEducation")} tooltip="Enrolled in a program or course" />
                <DocToggle label="Financial commitments in home country?" val={form.financialCommitmentsHome} onChange={set("financialCommitmentsHome")} tooltip="EMI, loan, rent payments" />
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Risk & Compliance Declaration</p>
                  <div className="space-y-2">
                    <DocToggle label="Criminal record?" val={form.criminalRecord} onChange={set("criminalRecord")} tooltip="Any jurisdiction, at any time" />
                    <DocToggle label="Immigration violation history?" val={form.immigrationViolation} onChange={set("immigrationViolation")} tooltip="False documents, illegal entry, etc." />
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP 8: Review & Submit ===== */}
            {step === 8 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#4055FF]/8 border border-[#4055FF]/15">
                  <p className="text-sm font-semibold text-[#4055FF] mb-1">Ready to generate your AI visa assessment?</p>
                  <p className="text-sm text-[#4055FF]/80">Review your answers below, then click "Generate AI Visa Chance".</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <ReviewSection title="Personal Profile" icon={User} items={[["Nationality", form.nationality], ["Passport Country", form.passportCountry], ["Gender", form.gender], ["Marital Status", form.maritalStatus], ["Residence", form.countryOfResidence], ["Dependents", form.dependentsHomeCountry]]} />
                  <ReviewSection title="Travel Plan" icon={MapPin} items={[["Destination", form.destinationCountry], ["Visa Type", form.visaType], ["Purpose", form.purposeOfTravel], ["Duration", form.tripDuration], ["Entry Type", form.entryType], ["First Visit?", form.firstTimeVisitor]]} />
                  <ReviewSection title="Employment" icon={Star} items={[["Status", form.employmentStatus], ["Job Title", form.jobTitle], ["Company", form.companyName], ["Years in Role", form.yearsInJob], ["Income", form.monthlyIncome], ["Funding", form.tripFunding]]} />
                  <ReviewSection title="Financial" icon={CreditCard} items={[["Bank Balance", form.bankBalance], ["Bank Statement", form.hasBankStatement], ["Salary Slips", form.hasSalarySlips], ["Tax Return", form.hasTaxReturn], ["Credit Card", form.hasCreditCard], ["Property", form.hasProperty]]} />
                  <ReviewSection title="Travel History" icon={Globe} items={[["Total Trips", form.numberOfTrips], ["Prev. Approvals", form.previousVisaApprovals], ["Refusals", form.previousVisaRefusals], ["Overstay", form.hasOverstay], ["Countries", form.countriesVisited]]} />
                  <ReviewSection title="Home Ties" icon={Home} items={[["Family Home", form.familyInHomeCountry], ["Property Home", form.propertyInHomeCountry], ["Stable Job", form.stableEmploymentHome], ["Education", form.ongoingEducation], ["Financial Commitments", form.financialCommitmentsHome]]} />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canCheck}
                  className="w-full h-12 text-base font-semibold border-0 text-white hover:opacity-90 gap-2 mt-2"
                  style={{background:"linear-gradient(135deg,#4055FF,#9033F5,#FF2060)"}}
                  data-testid="button-submit-check"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI is analyzing your full visa profile...
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
            {step < 8 && (
              <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
                <Button variant="outline" onClick={back} disabled={step === 1} className="gap-2" data-testid="button-back">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <div className="text-xs text-slate-400">{step} / {STEPS.length}</div>
                <Button onClick={next} className="border-0 text-white hover:opacity-90 gap-2" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}} data-testid="button-next">
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            {step === 8 && (
              <div className="flex mt-5 pt-5 border-t border-slate-100">
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
