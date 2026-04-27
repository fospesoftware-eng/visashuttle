import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import {
  PlaneTakeoff, Brain, ChevronDown, CheckCircle, AlertCircle,
  FileText, Info, RefreshCw, ChevronLeft, ChevronRight,
  User, MapPin, CreditCard, Globe, Clock, Crown, Download, Lock,
  ArrowRight, BadgeCheck
} from "lucide-react";
import { getEntryRequirement } from "@shared/visa-free";
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

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
  "Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize",
  "Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil",
  "Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad",
  "Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba",
  "Cyprus","Czech Republic",
  "Democratic Republic of Congo","Denmark","Djibouti","Dominica",
  "Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia",
  "Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala",
  "Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",
  "Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Korea","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru",
  "Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
  "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
  "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe",
];

const OPTS = {
  gender: ["Male","Female","Non-binary","Prefer not to say"],
  maritalStatus: ["Single","Married","Divorced","Widowed","Separated"],
  numberOfChildren: ["0","1","2","3","4","5+"],
  dependents: ["None","1","2","3","4","5+"],
  visaType: ["Tourist Visa","Business Visa","Student Visa","Work Visa","Visit Visa","Transit Visa","Investor Visa","Spouse / Family Visa","Conference / Event Visa","Medical Visa"],
  purposeOfTravel: ["Tourism & Sightseeing","Business Meeting","Study / Education","Employment","Family Visit","Medical Treatment","Conference / Event","Transit","Wedding / Social Event","Investment / Business Setup"],
  tripDuration: ["1–3 days","4–7 days","8–14 days","15–30 days","1–3 months","More than 3 months"],
  entryType: ["Single Entry","Multiple Entry","Double Entry"],
  yesNo: ["Yes","No"],
  yesNoMaybe: ["Yes","No","Planning to get"],
  employmentStatus: ["Employed (Full-time)","Employed (Part-time)","Self-employed / Business Owner","Freelancer / Consultant","Student","Retired","Unemployed","Government Employee","Other"],
  yearsInJob: ["Less than 6 months","6 months – 1 year","1–2 years","2–5 years","5–10 years","More than 10 years"],
  monthlyIncome: ["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"],
  sourceOfIncome: ["Employment Salary","Business Revenue","Freelance / Consultancy","Investment Returns","Rental Income","Pension / Retirement","Family Support","Government Benefits","Scholarship / Grant"],
  bankBalance: ["Less than $1,000","$1,000 – $3,000","$3,000 – $7,000","$7,000 – $15,000","$15,000 – $30,000","More than $30,000"],
  statementDuration: ["1 month","3 months","6 months","12 months"],
  tripFunding: ["Self-funded","Employer / Company","Family member","Sponsor / Host","Scholarship / Grant","Business funds"],
  numberOfTrips: ["None","1–2 trips","3–5 trips","6–10 trips","10+ trips"],
  visaApprovals: ["None","1–2 visas approved","Several (3–5)","Many (6+)"],
  refusals: ["No","Yes – once","Yes – multiple times"],
  hostRelationship: ["Spouse / Partner","Parent","Child","Sibling","Other relative","Friend","Business contact","Academic institution"],
  businessType: ["Retail / Trading","Technology / IT","Consulting / Advisory","Manufacturing","Healthcare / Medical","Hospitality / Tourism","Agriculture","Real Estate","Import / Export","Other"],
  studyLevel: ["High School / Secondary","Undergraduate / Bachelor's","Postgraduate / Master's","PhD / Doctoral","Certificate / Diploma","Language Course","Short Course / Training"],
};

// Maps each visa type to: { allowed purposes, recommended default }
const VISA_PURPOSE_MAP: Record<string, { allowed: string[]; default: string }> = {
  "Tourist Visa":          { allowed: ["Tourism & Sightseeing","Wedding / Social Event","Medical Treatment"], default: "Tourism & Sightseeing" },
  "Business Visa":         { allowed: ["Business Meeting","Conference / Event","Investment / Business Setup"], default: "Business Meeting" },
  "Student Visa":          { allowed: ["Study / Education"], default: "Study / Education" },
  "Work Visa":             { allowed: ["Employment"], default: "Employment" },
  "Visit Visa":            { allowed: ["Family Visit","Tourism & Sightseeing","Wedding / Social Event"], default: "Family Visit" },
  "Transit Visa":          { allowed: ["Transit"], default: "Transit" },
  "Investor Visa":         { allowed: ["Investment / Business Setup","Business Meeting"], default: "Investment / Business Setup" },
  "Spouse / Family Visa":  { allowed: ["Family Visit","Wedding / Social Event"], default: "Family Visit" },
  "Conference / Event Visa":{ allowed: ["Conference / Event","Business Meeting"], default: "Conference / Event" },
  "Medical Visa":          { allowed: ["Medical Treatment"], default: "Medical Treatment" },
};

function getPurposeMismatch(visaType: string, purpose: string): string | null {
  if (!visaType || !purpose) return null;
  const map = VISA_PURPOSE_MAP[visaType];
  if (!map) return null;
  if (map.allowed.includes(purpose)) return null;
  return `"${purpose}" is not a typical purpose for a ${visaType}. Expected: ${map.allowed.join(", ")}.`;
}

interface FormData {
  // Step 1 - Personal Profile
  nationality: string; passportCountry: string; dateOfBirth: string; gender: string;
  maritalStatus: string; numberOfChildren: string; countryOfResidence: string; dependentsHomeCountry: string;
  // Step 2 - Travel Plan
  destinationCountry: string; visaType: string; purposeOfTravel: string;
  plannedTravelDate: string; tripDuration: string; entryType: string; firstTimeVisitor: string;
  // Visa-type conditional
  institutionName: string; studyLevel: string; hasAcceptanceLetter: string;
  hasJobOffer: string; hiringCompanyName: string;
  invitingCompanyName: string;
  hostRelationship: string; hostVisaStatus: string;
  transitFinalDestination: string;
  // Step 3 - Employment & Income
  employmentStatus: string; jobTitle: string; companyName: string; yearsInJob: string;
  monthlyIncome: string; sourceOfIncome: string; hasTaxReturn: string; hasSalarySlips: string;
  // Employment-type conditional
  businessType: string; hasBusinessRegistration: string;
  scholarshipAvailable: string; hasEnrollmentLetter: string;
  previousProfession: string; hasPensionDocs: string;
  // Step 4 - Financial Strength
  bankBalance: string; hasBankStatement: string; bankStatementDuration: string;
  hasLargeDeposits: string; hasCreditCard: string; hasProperty: string;
  tripFunding: string; sponsorDetails: string;
  // Step 5 - Travel History
  countriesVisited: string; numberOfTrips: string; previousVisaApprovals: string;
  previousVisaRefusals: string; refusalReason: string; hasOverstay: string; hasDeportation: string;
  // Step 6 - Documents
  hasReturnTicket: string; hasHotelBooking: string; hasInvitationLetter: string;
  hasTravelInsurance: string; hasItinerary: string; hasLeaveApproval: string; hasCoverLetter: string;
  // Step 7 - Home Ties & Risk
  familyInHomeCountry: string; propertyInHomeCountry: string; stableEmploymentHome: string;
  ongoingEducation: string; financialCommitmentsHome: string; criminalRecord: string; immigrationViolation: string;
}

const EMPTY: FormData = {
  nationality: "", passportCountry: "", dateOfBirth: "", gender: "",
  maritalStatus: "", numberOfChildren: "", countryOfResidence: "", dependentsHomeCountry: "",
  destinationCountry: "", visaType: "", purposeOfTravel: "",
  plannedTravelDate: "", tripDuration: "", entryType: "", firstTimeVisitor: "",
  institutionName: "", studyLevel: "", hasAcceptanceLetter: "",
  hasJobOffer: "", hiringCompanyName: "",
  invitingCompanyName: "",
  hostRelationship: "", hostVisaStatus: "",
  transitFinalDestination: "",
  employmentStatus: "", jobTitle: "", companyName: "", yearsInJob: "",
  monthlyIncome: "", sourceOfIncome: "", hasTaxReturn: "", hasSalarySlips: "",
  businessType: "", hasBusinessRegistration: "",
  scholarshipAvailable: "", hasEnrollmentLetter: "",
  previousProfession: "", hasPensionDocs: "",
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
  { n: 1, title: "Travel Details", icon: PlaneTakeoff, color: "text-[#4055FF]", bg: "bg-[#4055FF]/8" },
  { n: 2, title: "About You", icon: User, color: "text-emerald-600", bg: "bg-emerald-50" },
  { n: 3, title: "Review & Submit", icon: CheckCircle, color: "text-violet-600", bg: "bg-violet-50" },
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

// Helper predicates for conditional logic
const isEmployedFull = (s: string) => ["Employed (Full-time)", "Employed (Part-time)", "Government Employee"].includes(s);
const isSelfEmployed = (s: string) => ["Self-employed / Business Owner", "Freelancer / Consultant"].includes(s);
const isStudent = (s: string) => s === "Student";
const isRetired = (s: string) => s === "Retired";
const isUnemployed = (s: string) => s === "Unemployed";
const hasChildren = (ms: string) => ["Married", "Divorced", "Widowed", "Separated"].includes(ms);

function Sel({ label, val, onChange, opts, required, tooltip, testId }: { label: string; val: string; onChange: (v: string) => void; opts: string[]; required?: boolean; tooltip?: string; testId?: string }) {
  const hasValue = val !== "";
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Label className="text-sm font-medium text-slate-700">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {tooltip && <span className="text-xs text-slate-400 italic">({tooltip})</span>}
      </div>
      <div className="relative">
        <select
          data-testid={testId || `select-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className={`w-full h-10 pl-3 pr-9 text-sm border rounded-lg appearance-none cursor-pointer transition-all outline-none
            ${hasValue
              ? "border-[#4055FF]/40 bg-[#4055FF]/5 text-slate-800 ring-1 ring-[#4055FF]/20"
              : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
            }
            focus:border-[#4055FF] focus:ring-2 focus:ring-[#4055FF]/20 focus:bg-white`}
          value={val}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Choose an option…</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${hasValue ? "text-[#4055FF]" : "text-slate-400"}`} />
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
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);
  const [aiProvider, setAiProvider] = useState("");
  const [tab, setTab] = useState<"overview" | "docs" | "tips" | "country">("overview");
  const [profileUsed, setProfileUsed] = useState(false);
  const [entryReq, setEntryReq] = useState<"visa_free" | "visa_on_arrival" | "resident" | null>(null);

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

  // Detect visa-free / VOA / resident when relevant fields change
  useEffect(() => {
    if (form.nationality && form.destinationCountry) {
      setEntryReq(getEntryRequirement(
        form.nationality,
        form.destinationCountry,
        { passportCountry: form.passportCountry, countryOfResidence: form.countryOfResidence }
      ));
    } else {
      setEntryReq(null);
    }
  }, [form.nationality, form.destinationCountry, form.passportCountry, form.countryOfResidence]);

  // Auto-set purpose of travel when visa type changes
  useEffect(() => {
    if (!form.visaType) return;
    const map = VISA_PURPOSE_MAP[form.visaType];
    if (!map) return;
    // Only auto-set if purpose is empty OR it's now a mismatch
    if (!form.purposeOfTravel || !map.allowed.includes(form.purposeOfTravel)) {
      setForm(f => ({ ...f, purposeOfTravel: map.default }));
    }
  }, [form.visaType]);

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
    if (step === 1) return !!(form.nationality && form.destinationCountry && form.visaType && form.purposeOfTravel && form.tripDuration);
    if (step === 2) return !!(form.employmentStatus && form.monthlyIncome && form.bankBalance && form.previousVisaRefusals);
    return true;
  }

  function next() {
    if (!validateStep()) {
      toast({ title: "Please fill required fields", description: "Complete the highlighted fields before continuing.", variant: "destructive" });
      return;
    }
    setStep(s => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() { setStep(s => Math.max(1, s - 1)); }

  const MIN_PROGRESS_MS = 12000; // always show progress for at least 12 seconds

  async function handleSubmit() {
    if (!canCheck) { setLocation("/pricing"); return; }
    if (!consentChecked) { setConsentError("Please agree to the Terms & Conditions before submitting"); return; }
    setConsentError("");
    setIsSubmitting(true);
    try {
      const [res] = await Promise.all([
        apiRequest("POST", "/api/b2c/check", { checkType: "basic", formData: form }),
        new Promise(resolve => setTimeout(resolve, MIN_PROGRESS_MS)),
      ]);
      const data = await (res as Response).json();
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <img src="/logo-loading.gif" alt="Loading..." className="w-20 h-20 object-contain" />
      <p className="text-sm text-slate-500 font-medium">Loading your profile…</p>
    </div>
  );

  // ===== PROGRESS SCREEN (basic check analyzing) =====
  if (isSubmitting) {
    const steps = [
      "Reviewing your travel details…",
      "Assessing financial strength…",
      "Checking document readiness…",
      "Comparing against embassy requirements…",
      "Calculating your approval estimate…",
    ];
    return (
      <DashboardLayout title="Analyzing Your Visa Profile" subtitle="Basic Check — please wait">
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-8">
          {/* Animated logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4055FF]/20 to-[#FF2060]/10 blur-2xl scale-150" />
            <img src="/logo-loading.gif" alt="Analyzing..." className="relative w-32 h-32 object-contain drop-shadow-xl" />
          </div>

          {/* Headline */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-slate-800">AI is reviewing your profile</h2>
            <p className="text-sm text-slate-500">{form.nationality} → {form.destinationCountry} · {form.visaType}</p>
          </div>

          {/* Step checklist */}
          <div className="w-full space-y-2.5">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-[#4055FF] border-t-transparent animate-spin" style={{ animationDuration: `${1.2 + i * 0.3}s` }} />
                <span className="text-sm text-slate-600">{s}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center">This usually takes 10–15 seconds</p>
        </div>
      </DashboardLayout>
    );
  }

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

              {/* Tabs — basic check shows Overview + Documents only */}
              <div className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                {([["overview","Overview"],["docs","Documents"]] as const).map(([t, label]) => (
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
    <DashboardLayout title="Free Visa Check" subtitle={`Step ${step} of ${STEPS.length} — ${currentStep.title}`}>
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

            {/* ===== STEP 1: Travel Details ===== */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <SearchableSelect label="Your Nationality *" required value={form.nationality} onChange={set("nationality")} options={COUNTRIES} placeholder="Search your passport country..." data-testid="select-nationality" />
                  <SearchableSelect label="Destination Country *" required value={form.destinationCountry} onChange={set("destinationCountry")} options={COUNTRIES} placeholder="Where are you going?" data-testid="select-destination" />
                </div>

                {/* Visa-free / VOA banner */}
                {entryReq === "visa_free" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                    <BadgeCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-800 text-sm">Visa-Free Entry!</p>
                      <p className="text-sm text-emerald-700">{form.nationality} citizens do not need a visa to enter {form.destinationCountry}. You can proceed and confirm this with our AI check.</p>
                    </div>
                  </div>
                )}
                {entryReq === "visa_on_arrival" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
                    <PlaneTakeoff className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800 text-sm">Visa on Arrival Available</p>
                      <p className="text-sm text-blue-700">{form.nationality} citizens can get a visa on arrival at {form.destinationCountry}. Approval rate is very high. Complete the check to see full details.</p>
                    </div>
                  </div>
                )}
                {entryReq === "resident" && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 border-2 border-purple-200">
                    <BadgeCheck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-800 text-sm">You Already Reside Here — No Visa Required</p>
                      <p className="text-sm text-purple-700">Your country of residence is {form.destinationCountry}. You already hold a valid residence permit. No new visa application is needed — simply re-enter on your existing status.</p>
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <Sel label="Visa Type *" val={form.visaType} onChange={set("visaType")} opts={OPTS.visaType} required testId="select-visa-type" />
                  <Sel label="Purpose of Travel *" val={form.purposeOfTravel} onChange={set("purposeOfTravel")} opts={OPTS.purposeOfTravel} required />
                </div>

                {/* Mismatch warning */}
                {(() => {
                  const mismatch = getPurposeMismatch(form.visaType, form.purposeOfTravel);
                  return mismatch ? (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Purpose & visa type mismatch</p>
                        <p className="text-xs text-amber-700 mt-0.5">{mismatch}</p>
                        <button
                          type="button"
                          className="mt-1.5 text-xs font-semibold text-amber-800 underline underline-offset-2"
                          onClick={() => setForm(f => ({ ...f, purposeOfTravel: VISA_PURPOSE_MAP[f.visaType]?.default || f.purposeOfTravel }))}
                        >
                          Auto-fix to "{VISA_PURPOSE_MAP[form.visaType]?.default}"
                        </button>
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="grid sm:grid-cols-2 gap-4">
                  <Sel label="Trip Duration *" val={form.tripDuration} onChange={set("tripDuration")} opts={OPTS.tripDuration} required />
                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Planned Travel Date</Label>
                    <Input type="date" value={form.plannedTravelDate} onChange={e => set("plannedTravelDate")(e.target.value)} className="border-slate-200 bg-slate-50 focus:bg-white focus:border-[#4055FF] focus:ring-2 focus:ring-[#4055FF]/20" data-testid="input-travel-date" />
                  </div>
                  <SearchableSelect label="Country of Residence" value={form.countryOfResidence} onChange={set("countryOfResidence")} options={COUNTRIES} placeholder="Where do you currently live?" />
                  <Sel label="Marital Status" val={form.maritalStatus} onChange={set("maritalStatus")} opts={OPTS.maritalStatus} />
                </div>

                {/* Visa-type extras */}
                {form.visaType === "Student Visa" && (
                  <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-4">
                    <p className="sm:col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Student Visa Details</p>
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Institution / University Name</Label>
                      <Input value={form.institutionName} onChange={e => set("institutionName")(e.target.value)} placeholder="e.g. University of Toronto" className="border-slate-200 bg-slate-50 focus:bg-white focus:border-[#4055FF]" data-testid="input-institution" />
                    </div>
                    <Sel label="Study Level" val={form.studyLevel} onChange={set("studyLevel")} opts={OPTS.studyLevel} />
                  </div>
                )}
                {form.visaType === "Work Visa" && (
                  <div className="border-t border-slate-100 pt-4">
                    <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Hiring Company Name</Label>
                    <Input value={form.hiringCompanyName} onChange={e => set("hiringCompanyName")(e.target.value)} placeholder="Company offering you the job" className="border-slate-200 bg-slate-50 focus:bg-white focus:border-[#4055FF]" data-testid="input-hiring-company" />
                  </div>
                )}
                {form.visaType === "Spouse / Family Visa" && (
                  <div className="border-t border-slate-100 pt-4">
                    <Sel label="Your relationship to the host" val={form.hostRelationship} onChange={set("hostRelationship")} opts={OPTS.hostRelationship} />
                  </div>
                )}
                {form.visaType === "Transit Visa" && (
                  <div className="border-t border-slate-100 pt-4">
                    <SearchableSelect label="Final Destination Country" value={form.transitFinalDestination} onChange={set("transitFinalDestination")} options={COUNTRIES} placeholder="Where are you ultimately heading?" />
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 2: About You ===== */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Sel label="Employment Status *" val={form.employmentStatus} onChange={set("employmentStatus")} opts={OPTS.employmentStatus} required testId="select-employment-status" />
                  </div>
                  {isEmployedFull(form.employmentStatus) && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Job Title</Label>
                        <Input value={form.jobTitle} onChange={e => set("jobTitle")(e.target.value)} placeholder="e.g. Senior Accountant" className="border-slate-200 bg-slate-50 focus:bg-white focus:border-[#4055FF]" data-testid="input-jobtitle" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Employer Name</Label>
                        <Input value={form.companyName} onChange={e => set("companyName")(e.target.value)} placeholder="e.g. Emirates NBD" className="border-slate-200 bg-slate-50 focus:bg-white focus:border-[#4055FF]" data-testid="input-company" />
                      </div>
                    </>
                  )}
                  {isSelfEmployed(form.employmentStatus) && (
                    <div>
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Business Name</Label>
                      <Input value={form.companyName} onChange={e => set("companyName")(e.target.value)} placeholder="e.g. My Consulting LLC" className="border-slate-200 bg-slate-50 focus:bg-white focus:border-[#4055FF]" data-testid="input-company-self" />
                    </div>
                  )}
                  <Sel label="Monthly Income (USD) *" val={form.monthlyIncome} onChange={set("monthlyIncome")} opts={OPTS.monthlyIncome} required />
                  <Sel label="Approximate Bank Balance (USD) *" val={form.bankBalance} onChange={set("bankBalance")} opts={OPTS.bankBalance} required />
                  <Sel label="Trip Funded By" val={form.tripFunding} onChange={set("tripFunding")} opts={OPTS.tripFunding} />
                  <div className="sm:col-span-2">
                    <Sel label="Previous Visa Refusals? *" val={form.previousVisaRefusals} onChange={set("previousVisaRefusals")} opts={OPTS.refusals} required />
                  </div>
                  {form.previousVisaRefusals && form.previousVisaRefusals !== "No" && (
                    <div className="sm:col-span-2">
                      <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Refusal Reason (optional)</Label>
                      <Input value={form.refusalReason} onChange={e => set("refusalReason")(e.target.value)} placeholder="e.g. Insufficient financial proof, incomplete documents" className="border-slate-200 bg-slate-50" />
                    </div>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-2">Documents you have ready</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <DocToggle label="Bank statement (3+ months)?" val={form.hasBankStatement} onChange={set("hasBankStatement")} />
                  <DocToggle label="Return / onward ticket booked?" val={form.hasReturnTicket} onChange={set("hasReturnTicket")} />
                  <DocToggle label="Travel insurance?" val={form.hasTravelInsurance} onChange={set("hasTravelInsurance")} />
                  <DocToggle label="Hotel / accommodation booking?" val={form.hasHotelBooking} onChange={set("hasHotelBooking")} />
                  {isEmployedFull(form.employmentStatus) && (
                    <DocToggle label="Salary slips available?" val={form.hasSalarySlips} onChange={set("hasSalarySlips")} tooltip="Last 3 months" />
                  )}
                  {isEmployedFull(form.employmentStatus) && (
                    <DocToggle label="Leave approval / NOC?" val={form.hasLeaveApproval} onChange={set("hasLeaveApproval")} tooltip="From your employer" />
                  )}
                  {isSelfEmployed(form.employmentStatus) && (
                    <DocToggle label="Business registration?" val={form.hasBusinessRegistration} onChange={set("hasBusinessRegistration")} />
                  )}
                  <DocToggle label="Family members in home country?" val={form.familyInHomeCountry} onChange={set("familyInHomeCountry")} tooltip="Shows ties to home" />
                </div>

                {isUnemployed(form.employmentStatus) && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Unemployment significantly impacts visa chances. Prepare strong financial proof and a clear explanation in your cover letter.</span>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 3: Review & Submit ===== */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#4055FF]/8 border border-[#4055FF]/15">
                  <p className="text-sm font-semibold text-[#4055FF] mb-1">Ready to generate your AI visa assessment?</p>
                  <p className="text-sm text-[#4055FF]/80">Review your answers below, then click "Generate AI Visa Chance".</p>
                </div>

                {entryReq && (
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    entryReq === "visa_free" ? "bg-emerald-50 border-emerald-200" :
                    entryReq === "resident" ? "bg-purple-50 border-purple-200" :
                    "bg-blue-50 border-blue-200"
                  }`}>
                    <BadgeCheck className={`w-4 h-4 flex-shrink-0 ${
                      entryReq === "visa_free" ? "text-emerald-600" :
                      entryReq === "resident" ? "text-purple-600" :
                      "text-blue-600"
                    }`} />
                    <span className={`text-sm font-semibold ${
                      entryReq === "visa_free" ? "text-emerald-800" :
                      entryReq === "resident" ? "text-purple-800" :
                      "text-blue-800"
                    }`}>
                      {entryReq === "visa_free" ? "Visa-Free Entry Detected" :
                       entryReq === "resident" ? "Already Resident — No New Visa Required" :
                       "Visa on Arrival Detected"} — {form.nationality} → {form.destinationCountry}
                    </span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <ReviewSection title="Travel Details" icon={PlaneTakeoff} items={[["Nationality", form.nationality], ["Destination", form.destinationCountry], ["Visa Type", form.visaType], ["Purpose", form.purposeOfTravel], ["Duration", form.tripDuration], ["Travel Date", form.plannedTravelDate], ["Residence", form.countryOfResidence], ["Marital Status", form.maritalStatus]]} />
                  <ReviewSection title="About You" icon={User} items={[["Employment", form.employmentStatus], ["Job Title", form.jobTitle], ["Company", form.companyName], ["Monthly Income", form.monthlyIncome], ["Bank Balance", form.bankBalance], ["Trip Funded By", form.tripFunding], ["Refusals", form.previousVisaRefusals]]} />
                  <ReviewSection title="Documents" icon={FileText} items={[["Bank Statement", form.hasBankStatement], ["Return Ticket", form.hasReturnTicket], ["Travel Insurance", form.hasTravelInsurance], ["Hotel Booking", form.hasHotelBooking], ["Salary Slips", form.hasSalarySlips], ["Leave Approval", form.hasLeaveApproval], ["Family Home", form.familyInHomeCountry]]} />
                </div>

                <ConsentCheckbox
                  checked={consentChecked}
                  onChange={v => { setConsentChecked(v); setConsentError(""); }}
                  error={consentError}
                  context="check"
                />

                <Button
                  onClick={handleSubmit}
                  disabled={!canCheck}
                  className="w-full h-12 text-base font-semibold border-0 text-white hover:opacity-90 gap-2 mt-2"
                  style={{background:"linear-gradient(135deg,#4055FF,#9033F5,#FF2060)"}}
                  data-testid="button-submit-check"
                >
                  {!canCheck ? (
                    <span className="flex items-center gap-2"><Lock className="w-5 h-5" /> Upgrade to Run More Checks</span>
                  ) : (
                    <span className="flex items-center gap-2"><PlaneTakeoff className="w-5 h-5" /> Generate AI Visa Assessment</span>
                  )}
                </Button>
              </div>
            )}

            {/* Navigation */}
            {step < 3 && (
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
            {step === 3 && (
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
