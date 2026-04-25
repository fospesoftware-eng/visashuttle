import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Save, CheckCircle, Trash2, Calendar, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SearchableSelect, MultiSearchableSelect } from "@/components/searchable-select";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const COUNTRIES = ["Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belgium","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cyprus","Czech Republic","Denmark","Egypt","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Thailand","Tunisia","Turkey","Ukraine","United Arab Emirates","United Kingdom","United States","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

const EMPLOYMENT_OPTS = ["Employed (Full-time)","Employed (Part-time)","Self-employed / Business Owner","Freelancer","Student","Retired","Unemployed","Government Employee","Other"];
const GENDER_OPTS = ["Male","Female","Non-binary","Prefer not to say"];
const MARITAL_OPTS = ["Single","Married","Divorced","Widowed","Separated"];
const INCOME_OPTS = ["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"];
const BALANCE_OPTS = ["Less than $1,000","$1,000 – $3,000","$3,000 – $7,000","$7,000 – $15,000","$15,000 – $30,000","More than $30,000"];
const YEARS_OPTS = ["Less than 1 year","1–2 years","2–5 years","5–10 years","More than 10 years"];
const SOURCE_OPTS = ["Employment Salary","Business Revenue","Freelance / Consultancy","Investment Returns","Rental Income","Pension / Retirement","Family Support","Government Benefits"];
const FUNDING_OPTS = ["Self-funded","Employer / Company","Family member","Sponsor / Host","Scholarship / Grant","Business funds"];
const REFUSAL_OPTS = ["No","Yes – once","Yes – multiple times"];

interface ProfileForm {
  fullName: string; nationality: string; dateOfBirth: string; gender: string;
  maritalStatus: string; countryOfResidence: string; passportCountry: string;
  employmentStatus: string; jobTitle: string; companyName: string; yearsInJob: string;
  monthlyIncome: string; sourceOfIncome: string; bankBalance: string; tripFunding: string;
  countriesVisited: string; previousVisaRefusals: string;
  hasPassport: boolean; hasBankStatement: boolean; hasIncomeProof: boolean;
  hasTaxReturn: boolean; hasSalarySlips: boolean; hasCreditCard: boolean; hasProperty: boolean;
  familyInHomeCountry: boolean; propertyInHomeCountry: boolean;
}

const EMPTY: ProfileForm = {
  fullName: "", nationality: "", dateOfBirth: "", gender: "", maritalStatus: "",
  countryOfResidence: "", passportCountry: "", employmentStatus: "", jobTitle: "",
  companyName: "", yearsInJob: "", monthlyIncome: "", sourceOfIncome: "", bankBalance: "",
  tripFunding: "", countriesVisited: "", previousVisaRefusals: "",
  hasPassport: false, hasBankStatement: false, hasIncomeProof: false, hasTaxReturn: false,
  hasSalarySlips: false, hasCreditCard: false, hasProperty: false,
  familyInHomeCountry: false, propertyInHomeCountry: false,
};

function Sel({ label, val, onChange, opts }: { label: string; val: string; onChange: (v: string) => void; opts: string[] }) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</Label>
      <div className="relative">
        <select className="w-full h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" value={val} onChange={e => onChange(e.target.value)}>
          <option value="">Select...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all w-full ${checked ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
        {checked && <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />}
      </div>
      <div>
        <span className={`text-sm font-medium ${checked ? "text-blue-700" : "text-slate-600"}`}>{label}</span>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
    </button>
  );
}

function profileCompletion(f: ProfileForm): number {
  const textFields = [f.fullName, f.nationality, f.employmentStatus, f.monthlyIncome, f.bankBalance];
  const docFields = [f.hasPassport, f.hasBankStatement, f.hasIncomeProof || f.hasSalarySlips];
  const filled = textFields.filter(Boolean).length + docFields.filter(Boolean).length;
  return Math.round((filled / (textFields.length + docFields.length)) * 100);
}

export default function SavedProfilePage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
  }, [user, authLoading]);

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/b2c/profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || "",
        nationality: profile.nationality || "",
        dateOfBirth: profile.dateOfBirth || "",
        gender: profile.gender || "",
        maritalStatus: profile.maritalStatus || "",
        countryOfResidence: profile.countryOfResidence || "",
        passportCountry: profile.passportCountry || "",
        employmentStatus: profile.employmentStatus || "",
        jobTitle: profile.jobTitle || "",
        companyName: profile.companyName || "",
        yearsInJob: profile.yearsInJob || "",
        monthlyIncome: profile.monthlyIncome || "",
        sourceOfIncome: profile.sourceOfIncome || "",
        bankBalance: profile.bankBalance || "",
        tripFunding: profile.tripFunding || "",
        countriesVisited: profile.countriesVisited || "",
        previousVisaRefusals: profile.previousVisaRefusals || "",
        hasPassport: profile.hasPassport || false,
        hasBankStatement: profile.hasBankStatement || false,
        hasIncomeProof: profile.hasIncomeProof || false,
        hasTaxReturn: profile.hasTaxReturn || false,
        hasSalarySlips: profile.hasSalarySlips || false,
        hasCreditCard: profile.hasCreditCard || false,
        hasProperty: profile.hasProperty || false,
        familyInHomeCountry: profile.familyInHomeCountry || false,
        propertyInHomeCountry: profile.propertyInHomeCountry || false,
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await apiRequest("PUT", "/api/b2c/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Profile saved!", description: "Your traveler profile has been updated and will auto-fill future checks." });
    },
    onError: () => toast({ title: "Save failed", description: "Please try again.", variant: "destructive" }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/b2c/profile", {});
      return res.json();
    },
    onSuccess: () => {
      setForm(EMPTY);
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/profile"] });
      toast({ title: "Profile cleared", description: "All saved profile data has been removed." });
    },
  });

  function set(field: keyof ProfileForm) {
    return (value: string | boolean) => setForm(f => ({ ...f, [field]: value }));
  }

  if (authLoading || !user) return null;

  const comp = profileCompletion(form);
  const lastUpdated = profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <DashboardLayout title="Saved Profile" subtitle="Auto-fills your future visa checks">
      <div className="w-full max-w-3xl">
        {/* Header card */}
        <Card className="mb-5 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4" />
                  <h2 className="font-semibold">Traveler Profile</h2>
                  {comp >= 50 && <Badge className="bg-white/20 text-white border-0 text-xs">Auto-fill Active</Badge>}
                </div>
                <p className="text-blue-100 text-sm">Complete your profile once — all future visa checks will be pre-filled automatically.</p>
                {lastUpdated && (
                  <div className="flex items-center gap-1.5 mt-2 text-blue-200 text-xs">
                    <Calendar className="w-3 h-3" />
                    Last updated: {lastUpdated}
                  </div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-4xl font-black">{comp}%</div>
                <div className="text-blue-100 text-xs">complete</div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${comp}%` }} />
            </div>
          </div>
        </Card>

        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
          {/* Personal Details */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center"><User className="w-3.5 h-3.5 text-violet-600" /></div>
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name</Label>
                <Input value={form.fullName} onChange={e => set("fullName")(e.target.value)} placeholder="As on passport" className="border-slate-200 bg-slate-50 focus:bg-white" data-testid="input-fullname" />
              </div>
              <SearchableSelect label="Nationality" value={form.nationality} onChange={set("nationality") as (v: string) => void} options={COUNTRIES} placeholder="Search nationality..." data-testid="select-nationality" />
              <SearchableSelect label="Passport Country" value={form.passportCountry} onChange={set("passportCountry") as (v: string) => void} options={COUNTRIES} placeholder="Search country..." />
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth")(e.target.value)} className="border-slate-200 bg-slate-50" data-testid="input-dob" />
              </div>
              <Sel label="Gender" val={form.gender} onChange={set("gender") as (v: string) => void} opts={GENDER_OPTS} />
              <Sel label="Marital Status" val={form.maritalStatus} onChange={set("maritalStatus") as (v: string) => void} opts={MARITAL_OPTS} />
              <SearchableSelect label="Country of Residence" value={form.countryOfResidence} onChange={set("countryOfResidence") as (v: string) => void} options={COUNTRIES} placeholder="Search country..." />
            </CardContent>
          </Card>

          {/* Employment */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                Employment & Income
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 grid sm:grid-cols-2 gap-3">
              <Sel label="Employment Status" val={form.employmentStatus} onChange={set("employmentStatus") as (v: string) => void} opts={EMPLOYMENT_OPTS} />
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Job Title</Label>
                <Input value={form.jobTitle} onChange={e => set("jobTitle")(e.target.value)} placeholder="e.g. Software Engineer" className="border-slate-200 bg-slate-50" data-testid="input-jobtitle" />
              </div>
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Company Name</Label>
                <Input value={form.companyName} onChange={e => set("companyName")(e.target.value)} placeholder="e.g. Acme Corp" className="border-slate-200 bg-slate-50" />
              </div>
              <Sel label="Years in Current Role" val={form.yearsInJob} onChange={set("yearsInJob") as (v: string) => void} opts={YEARS_OPTS} />
              <Sel label="Monthly Income (USD)" val={form.monthlyIncome} onChange={set("monthlyIncome") as (v: string) => void} opts={INCOME_OPTS} />
              <Sel label="Source of Income" val={form.sourceOfIncome} onChange={set("sourceOfIncome") as (v: string) => void} opts={SOURCE_OPTS} />
            </CardContent>
          </Card>

          {/* Financial */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                Financial Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 grid sm:grid-cols-2 gap-3">
              <Sel label="Bank Balance (USD)" val={form.bankBalance} onChange={set("bankBalance") as (v: string) => void} opts={BALANCE_OPTS} />
              <Sel label="Trip Funding" val={form.tripFunding} onChange={set("tripFunding") as (v: string) => void} opts={FUNDING_OPTS} />
            </CardContent>
          </Card>

          {/* Travel History */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064" /></svg>
                </div>
                Travel History
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <MultiSearchableSelect label="Countries Visited (last 3 years)" value={form.countriesVisited} onChange={set("countriesVisited") as (v: string) => void} options={COUNTRIES} placeholder="Search and select countries..." />
              <Sel label="Previous Visa Refusals" val={form.previousVisaRefusals} onChange={set("previousVisaRefusals") as (v: string) => void} opts={REFUSAL_OPTS} />
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-white border-slate-100 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                Documents Available
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-xs text-slate-500 mb-3">Mark documents you currently have — speeds up future checks</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Toggle checked={form.hasPassport} onChange={set("hasPassport") as (v: boolean) => void} label="Valid Passport" desc="6+ months validity" />
                <Toggle checked={form.hasBankStatement} onChange={set("hasBankStatement") as (v: boolean) => void} label="Bank Statement" desc="3–6 months" />
                <Toggle checked={form.hasSalarySlips} onChange={set("hasSalarySlips") as (v: boolean) => void} label="Salary Slips" desc="Last 3 months" />
                <Toggle checked={form.hasTaxReturn} onChange={set("hasTaxReturn") as (v: boolean) => void} label="Tax Return" desc="Latest year" />
                <Toggle checked={form.hasCreditCard} onChange={set("hasCreditCard") as (v: boolean) => void} label="Credit Card" />
                <Toggle checked={form.hasProperty} onChange={set("hasProperty") as (v: boolean) => void} label="Property / Assets" />
                <Toggle checked={form.familyInHomeCountry} onChange={set("familyInHomeCountry") as (v: boolean) => void} label="Family in Home Country" />
                <Toggle checked={form.propertyInHomeCountry} onChange={set("propertyInHomeCountry") as (v: boolean) => void} label="Own Property at Home" />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="submit" disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700 gap-2" data-testid="button-save-profile">
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />Saving...
                </span>
              ) : (
                <><Save className="w-4 h-4" />Save Profile</>
              )}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" />Saved!
              </span>
            )}
            {profile && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 text-red-500 border-red-200 hover:bg-red-50 ml-auto"
                onClick={() => { if (confirm("Clear all saved profile data?")) clearMutation.mutate(); }}
                data-testid="button-clear-profile"
              >
                <Trash2 className="w-4 h-4" />
                Clear Profile
              </Button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
