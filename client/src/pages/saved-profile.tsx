import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Save, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const COUNTRIES = ["Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belgium","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cyprus","Czech Republic","Denmark","Egypt","Estonia","Ethiopia","Finland","France","Georgia","Germany","Ghana","Greece","Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lithuania","Luxembourg","Malaysia","Malta","Mexico","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Thailand","Tunisia","Turkey","Ukraine","United Arab Emirates","United Kingdom","United States","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe"];

const EMPLOYMENT_OPTS = ["Employed (Full-time)","Employed (Part-time)","Self-employed / Business Owner","Freelancer","Student","Retired","Unemployed","Other"];
const INCOME_OPTS = ["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"];
const BALANCE_OPTS = ["Less than $1,000","$1,000 – $3,000","$3,000 – $7,000","$7,000 – $15,000","$15,000 – $30,000","More than $30,000"];
const TRAVEL_OPTS = ["None","1–2 countries","3–5 countries","5+ countries","Extensive (10+)"];
const REFUSAL_OPTS = ["No","Yes – once","Yes – multiple times"];

interface ProfileData {
  fullName: string;
  nationality: string;
  dateOfBirth: string;
  passportCountry: string;
  employmentStatus: string;
  jobTitle: string;
  monthlyIncome: string;
  bankBalance: string;
  previousTravel: string;
  countriesVisited: string;
  previousVisaRefusals: string;
  hasPassport: boolean;
  hasBankStatement: boolean;
  hasIncomeProof: boolean;
  hasTaxReturn: boolean;
}

const EMPTY: ProfileData = {
  fullName: "", nationality: "", dateOfBirth: "", passportCountry: "",
  employmentStatus: "", jobTitle: "", monthlyIncome: "", bankBalance: "",
  previousTravel: "", countriesVisited: "", previousVisaRefusals: "",
  hasPassport: false, hasBankStatement: false, hasIncomeProof: false, hasTaxReturn: false,
};

function SelectField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">{label}</Label>
      <div className="relative">
        <select
          className="w-full h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">{placeholder || "Select..."}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${checked ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checked ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
        {checked && <CheckCircle className="w-3.5 h-3.5 text-white fill-white" />}
      </div>
      <span className={`text-sm font-medium ${checked ? "text-blue-700" : "text-slate-600"}`}>{label}</span>
    </button>
  );
}

function completion(p: ProfileData): number {
  const fields = [p.fullName, p.nationality, p.employmentStatus, p.monthlyIncome, p.bankBalance];
  const docs = [p.hasPassport, p.hasBankStatement, p.hasIncomeProof];
  const filled = fields.filter(Boolean).length + docs.filter(Boolean).length;
  return Math.round((filled / (fields.length + docs.length)) * 100);
}

export default function SavedProfilePage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileData>(EMPTY);
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
        passportCountry: profile.passportCountry || "",
        employmentStatus: profile.employmentStatus || "",
        jobTitle: profile.jobTitle || "",
        monthlyIncome: profile.monthlyIncome || "",
        bankBalance: profile.bankBalance || "",
        previousTravel: profile.previousTravel || "",
        countriesVisited: profile.countriesVisited || "",
        previousVisaRefusals: profile.previousVisaRefusals || "",
        hasPassport: profile.hasPassport || false,
        hasBankStatement: profile.hasBankStatement || false,
        hasIncomeProof: profile.hasIncomeProof || false,
        hasTaxReturn: profile.hasTaxReturn || false,
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const res = await apiRequest("PUT", "/api/b2c/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Profile saved!", description: "Your traveler profile has been updated." });
    },
    onError: () => toast({ title: "Save failed", description: "Please try again.", variant: "destructive" }),
  });

  function set(field: keyof ProfileData) {
    return (value: string | boolean) => setForm(f => ({ ...f, [field]: value }));
  }

  if (authLoading || !user) return null;

  const comp = completion(form);

  return (
    <DashboardLayout title="Saved Profile" subtitle="Your reusable traveler details">
      <div className="max-w-3xl">
        {/* Completion */}
        <Card className="mb-6 bg-gradient-to-r from-blue-600 to-cyan-500 border-0 text-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold mb-1">Profile Completion</p>
              <p className="text-blue-100 text-sm">Complete your profile to auto-fill future visa checks</p>
              <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${comp}%` }} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black">{comp}%</span>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-5">
          {/* Personal */}
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <User className="w-4 h-4 text-blue-600" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Full Name</Label>
                <Input value={form.fullName} onChange={e => set("fullName")(e.target.value)} placeholder="As shown on passport" className="border-slate-200 bg-slate-50 focus:bg-white" data-testid="input-fullname" />
              </div>
              <SelectField label="Nationality" value={form.nationality} onChange={set("nationality") as (v: string) => void} options={COUNTRIES} placeholder="Select nationality" />
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth")(e.target.value)} className="border-slate-200 bg-slate-50" data-testid="input-dob" />
              </div>
              <SelectField label="Passport Country" value={form.passportCountry} onChange={set("passportCountry") as (v: string) => void} options={COUNTRIES} placeholder="Select country" />
            </CardContent>
          </Card>

          {/* Employment */}
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Employment & Finances
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <SelectField label="Employment Status" value={form.employmentStatus} onChange={set("employmentStatus") as (v: string) => void} options={EMPLOYMENT_OPTS} />
              <div>
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Job Title</Label>
                <Input value={form.jobTitle} onChange={e => set("jobTitle")(e.target.value)} placeholder="e.g. Software Engineer" className="border-slate-200 bg-slate-50" data-testid="input-jobtitle" />
              </div>
              <SelectField label="Monthly Income (USD)" value={form.monthlyIncome} onChange={set("monthlyIncome") as (v: string) => void} options={INCOME_OPTS} />
              <SelectField label="Approximate Bank Balance (USD)" value={form.bankBalance} onChange={set("bankBalance") as (v: string) => void} options={BALANCE_OPTS} />
            </CardContent>
          </Card>

          {/* Travel */}
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                Travel History
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <SelectField label="Previous International Travel" value={form.previousTravel} onChange={set("previousTravel") as (v: string) => void} options={TRAVEL_OPTS} />
              <SelectField label="Previous Visa Refusals" value={form.previousVisaRefusals} onChange={set("previousVisaRefusals") as (v: string) => void} options={REFUSAL_OPTS} />
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Countries Visited (optional)</Label>
                <Input value={form.countriesVisited} onChange={e => set("countriesVisited")(e.target.value)} placeholder="e.g. UAE, Malaysia, Turkey" className="border-slate-200 bg-slate-50" data-testid="input-countries" />
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-white border-slate-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Common Documents Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-3">Mark which documents you currently have ready</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Toggle checked={form.hasPassport} onChange={set("hasPassport") as (v: boolean) => void} label="Valid Passport" />
                <Toggle checked={form.hasBankStatement} onChange={set("hasBankStatement") as (v: boolean) => void} label="Bank Statement (3-6 months)" />
                <Toggle checked={form.hasIncomeProof} onChange={set("hasIncomeProof") as (v: boolean) => void} label="Income Proof / Salary Slips" />
                <Toggle checked={form.hasTaxReturn} onChange={set("hasTaxReturn") as (v: boolean) => void} label="Tax Return (latest)" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
              data-testid="button-save-profile"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
