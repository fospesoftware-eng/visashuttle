import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Brain, ChevronDown, CheckCircle, AlertCircle, TrendingUp,
  FileText, CreditCard, MapPin, Lightbulb, ArrowRight, Lock, BarChart3,
  Info, Home, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Azerbaijan","Bahrain","Bangladesh",
  "Belgium","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cyprus",
  "Czech Republic","Denmark","Egypt","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana",
  "Greece","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan",
  "Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lithuania","Luxembourg","Malaysia","Malta","Mexico",
  "Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan",
  "Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Serbia","Singapore",
  "Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland",
  "Syria","Taiwan","Thailand","Tunisia","Turkey","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"
];

const SELECT_OPTS = {
  visaType: ["Tourist Visa","Business Visa","Student Visa","Work Visa","Visit Visa","Transit Visa"],
  purposeOfTravel: ["Tourism","Business Meeting","Study","Employment","Family Visit","Medical Treatment","Conference / Event","Other"],
  employmentStatus: ["Employed (Full-time)","Employed (Part-time)","Self-employed / Business Owner","Freelancer","Student","Retired","Unemployed","Other"],
  monthlyIncome: ["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"],
  bankBalance: ["Less than $1,000","$1,000 – $3,000","$3,000 – $7,000","$7,000 – $15,000","$15,000 – $30,000","More than $30,000"],
  previousInternationalTravel: ["None","1–2 countries","3–5 countries","5+ countries","Extensive (10+)"],
  previousVisaRefusals: ["No","Yes – once","Yes – multiple times"],
  tripDuration: ["1–7 days","8–14 days","15–30 days","1–3 months","More than 3 months"],
  returnTicket: ["Yes","No","Not booked yet"],
  accommodationProof: ["Yes – hotel booked","Yes – invitation letter","No","Not arranged yet"],
  tripFunding: ["Self-funded","Employer / Company","Family member","Sponsor","Scholarship / Grant"],
};

interface FormData {
  nationality: string;
  destinationCountry: string;
  visaType: string;
  purposeOfTravel: string;
  age: string;
  employmentStatus: string;
  monthlyIncome: string;
  bankBalance: string;
  previousInternationalTravel: string;
  previousVisaRefusals: string;
  tripDuration: string;
  returnTicket: string;
  accommodationProof: string;
  tripFunding: string;
}

const EMPTY_FORM: FormData = {
  nationality: "", destinationCountry: "", visaType: "", purposeOfTravel: "",
  age: "", employmentStatus: "", monthlyIncome: "", bankBalance: "",
  previousInternationalTravel: "", previousVisaRefusals: "",
  tripDuration: "", returnTicket: "", accommodationProof: "", tripFunding: "",
};

interface AIResult {
  approvalChance: number;
  statusLabel: string;
  summary: string;
  strengths: string[];
  riskFactors: string[];
  missingDocuments: string[];
  recommendations: string[];
  disclaimer: string;
}

function getScoreColors(score: number) {
  if (score >= 80) return { gradient: "from-emerald-500 to-teal-500", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-800" };
  if (score >= 60) return { gradient: "from-blue-500 to-cyan-500", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", ring: "ring-blue-200 dark:ring-blue-800" };
  if (score >= 40) return { gradient: "from-amber-500 to-orange-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-800" };
  return { gradient: "from-red-500 to-rose-500", badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", ring: "ring-red-200 dark:ring-red-800" };
}

function CountryInput({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label} {required && <span className="text-red-500">*</span>}</Label>
      <div className="relative">
        <select
          className="w-full h-10 pl-3 pr-10 text-sm border border-input rounded-md bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select country...</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function SelectInput({ label, field, value, onChange, required }: { label: string; field: keyof typeof SELECT_OPTS; value: string; onChange: (v: string) => void; required?: boolean }) {
  const opts = SELECT_OPTS[field];
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label} {required && <span className="text-red-500">*</span>}</Label>
      <div className="relative">
        <select
          className="w-full h-10 pl-3 pr-10 text-sm border border-input rounded-md bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

export default function CheckPage() {
  const { user, isLoading: authLoading, checksRemaining, canCheck } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [aiProvider, setAiProvider] = useState("");

  useEffect(() => {
    if (!authLoading && !user) setLocation("/join");
  }, [user, authLoading]);

  function set(field: keyof FormData) {
    return (value: string) => setForm(f => ({ ...f, [field]: value }));
  }

  function validate() {
    const required: (keyof FormData)[] = ["nationality","destinationCountry","visaType","purposeOfTravel","age","employmentStatus","monthlyIncome","bankBalance","previousInternationalTravel","previousVisaRefusals","tripDuration","returnTicket","accommodationProof","tripFunding"];
    const e: Partial<FormData> = {};
    required.forEach(f => { if (!form[f]) (e as any)[f] = "Required"; });
    if (form.age && (isNaN(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 120)) e.age = "Enter a valid age";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) { toast({ title: "Please fill all required fields", variant: "destructive" }); return; }
    if (!canCheck) { setLocation("/pricing"); return; }

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/b2c/check", { checkType: "basic", formData: form });
      const data = await res.json();
      setResult(data.result);
      setAiProvider(data.check?.aiProvider || "");
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/checks"] });
      setTimeout(() => document.getElementById("result-section")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      if (err.message?.includes("limit reached") || err.message?.includes("upgrade")) {
        setLocation("/pricing");
      } else {
        toast({ title: "Check failed", description: err.message || "Please try again", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setResult(null);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const colors = result ? getScoreColors(result.approvalChance) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${canCheck ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span>{checksRemaining > 0 ? `${checksRemaining} check${checksRemaining !== 1 ? "s" : ""} remaining` : "No checks left"}</span>
              </div>
            )}
            <Link href="/account">
              <Button variant="ghost" size="sm" data-testid="button-account">
                <Home className="w-4 h-4 mr-1.5" />
                My Account
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Limit warning */}
        {user && !canCheck && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Check limit reached</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                You've used all {user.checkLimit} free check{user.checkLimit !== 1 ? "s" : ""}.{" "}
                <Link href="/pricing" className="underline font-medium">Upgrade your plan</Link> to run more checks.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {!result && (
          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3.5 h-3.5" />
                AI Visa Approval Check
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Check Your Visa Chances</h1>
              <p className="text-muted-foreground">Fill in the details below. Our AI will analyze 14 key factors to estimate your approval probability.</p>
            </div>

            <Card className="shadow-lg">
              <CardContent className="p-6 md:p-8">
                {/* Section 1: Trip Details */}
                <div className="mb-8">
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-5 pb-3 border-b">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Trip Details
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <CountryInput label="Your Nationality" value={form.nationality} onChange={set("nationality")} required />
                    <CountryInput label="Destination Country" value={form.destinationCountry} onChange={set("destinationCountry")} required />
                    <SelectInput label="Visa Type" field="visaType" value={form.visaType} onChange={set("visaType")} required />
                    <SelectInput label="Purpose of Travel" field="purposeOfTravel" value={form.purposeOfTravel} onChange={set("purposeOfTravel")} required />
                    <SelectInput label="Trip Duration" field="tripDuration" value={form.tripDuration} onChange={set("tripDuration")} required />
                    <SelectInput label="Return Ticket Booked?" field="returnTicket" value={form.returnTicket} onChange={set("returnTicket")} required />
                    <SelectInput label="Hotel Booking / Invitation Letter?" field="accommodationProof" value={form.accommodationProof} onChange={set("accommodationProof")} required />
                    <SelectInput label="Who is Funding the Trip?" field="tripFunding" value={form.tripFunding} onChange={set("tripFunding")} required />
                  </div>
                </div>

                {/* Section 2: Personal & Financial */}
                <div className="mb-8">
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-5 pb-3 border-b">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Personal & Financial Profile
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Age <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        placeholder="e.g. 28"
                        value={form.age}
                        onChange={e => { setForm(f => ({ ...f, age: e.target.value })); setErrors(er => ({ ...er, age: "" })); }}
                        min={1} max={120}
                        className={errors.age ? "border-red-400" : ""}
                        data-testid="input-age"
                      />
                      {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
                    </div>
                    <SelectInput label="Employment Status" field="employmentStatus" value={form.employmentStatus} onChange={set("employmentStatus")} required />
                    <SelectInput label="Monthly Income (USD)" field="monthlyIncome" value={form.monthlyIncome} onChange={set("monthlyIncome")} required />
                    <SelectInput label="Approximate Bank Balance (USD)" field="bankBalance" value={form.bankBalance} onChange={set("bankBalance")} required />
                  </div>
                </div>

                {/* Section 3: Travel History */}
                <div className="mb-8">
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-5 pb-3 border-b">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Travel & Visa History
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <SelectInput label="Previous International Travel" field="previousInternationalTravel" value={form.previousInternationalTravel} onChange={set("previousInternationalTravel")} required />
                    <SelectInput label="Previous Visa Refusals?" field="previousVisaRefusals" value={form.previousVisaRefusals} onChange={set("previousVisaRefusals")} required />
                  </div>
                </div>

                {Object.keys(errors).length > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Please fill in all required fields before submitting
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0"
                  disabled={isSubmitting || !canCheck}
                  data-testid="button-submit-check"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      AI is analyzing your profile...
                    </span>
                  ) : !canCheck ? (
                    <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Upgrade to Run More Checks</span>
                  ) : (
                    <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Check My Visa Chances</span>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  This uses {checksRemaining} of your remaining {checksRemaining > 1 ? "checks" : "check"}.
                </p>
              </CardContent>
            </Card>
          </form>
        )}

        {/* Result */}
        {result && colors && (
          <div id="result-section">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Your Visa Assessment</h1>
              <Button variant="outline" size="sm" onClick={resetForm} data-testid="button-new-check">
                <RefreshCw className="w-4 h-4 mr-1.5" />
                New Check
              </Button>
            </div>

            {/* Main score card */}
            <Card className={`border-2 ring-4 ${colors.ring} shadow-xl mb-6`} data-testid="result-card">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${colors.gradient} p-6 md:p-8 text-white rounded-t-lg`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-white/70 text-sm font-medium mb-1">AI Approval Estimate</p>
                      <h2 className="text-2xl font-bold mb-1">
                        {form.visaType} → {form.destinationCountry}
                      </h2>
                      <p className="text-white/80 text-sm">{form.nationality} • {form.purposeOfTravel}</p>
                      {aiProvider && aiProvider !== "mock" && (
                        <Badge className="mt-2 bg-white/20 text-white border-0 text-xs">
                          Powered by {aiProvider === "openai" ? "OpenAI GPT" : "Claude AI"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-6xl md:text-7xl font-black leading-none" data-testid="score-value">
                        {result.approvalChance}%
                      </div>
                      <div className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${colors.badge}`}>
                        {result.statusLabel}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-5 h-3 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${result.approvalChance}%` }} />
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  {/* Summary */}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">AI Assessment</p>
                      <p className="text-muted-foreground text-sm leading-relaxed" data-testid="result-summary">{result.summary}</p>
                    </div>
                  </div>

                  {/* Strengths & Risk Factors */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-1.5 mb-3 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        Strengths
                      </p>
                      <div className="space-y-2">
                        {result.strengths.map((s, i) => (
                          <div key={i} className="flex gap-2 text-sm p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm flex items-center gap-1.5 mb-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        Risk Factors
                      </p>
                      <div className="space-y-2">
                        {result.riskFactors.map((r, i) => (
                          <div key={i} className="flex gap-2 text-sm p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Missing Documents */}
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Documents to Prepare
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {result.missingDocuments.map((d, i) => (
                        <div key={i} className="flex gap-2 text-sm p-2.5 rounded-lg bg-muted/50 border">
                          <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <p className="font-semibold text-sm flex items-center gap-1.5 mb-3">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Recommendations
                    </p>
                    <div className="space-y-2">
                      {result.recommendations.map((r, i) => (
                        <div key={i} className="flex gap-2.5 text-sm p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                          <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{result.disclaimer}</span>
                  </div>

                  {/* CTA */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {canCheck ? (
                      <Button onClick={resetForm} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0" data-testid="button-check-again">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Check Another Visa
                      </Button>
                    ) : (
                      <Link href="/pricing" className="flex-1">
                        <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Upgrade for More Checks
                        </Button>
                      </Link>
                    )}
                    <Link href="/account">
                      <Button variant="outline" className="flex-1 sm:flex-none" data-testid="button-view-history">
                        View History
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <footer className="py-6 border-t mt-8 px-4">
        <p className="text-xs text-center text-muted-foreground max-w-2xl mx-auto">
          Visa Shuttle provides AI-based estimation only. It does not guarantee visa approval. Final decisions are made only by the relevant embassy, consulate, or immigration authority.
        </p>
      </footer>
    </div>
  );
}
