import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ConsentCheckbox } from "@/components/consent-checkbox";
import {
  Crown, Lock, Sparkles, CheckCircle, FileText, AlertCircle,
  TrendingUp, Download, Shield, ArrowRight, Zap, ChevronLeft,
  ChevronRight, Brain, User, Plane, CreditCard, Globe, Home,
  Info, RefreshCw, Flag, Star, AlertTriangle, Activity, BookOpen,
  Briefcase, BadgeCheck, BarChart3, ClipboardList, Plus, Trash2, Users,
  Mail, Loader2, Save, Clock3
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
import { formatB2cPrice, getStoredB2cCurrency } from "@/lib/b2c-pricing";

import { COUNTRIES, VISA_TYPES } from "@/shared/destinations";

const YES_NO = ["Yes", "No"];
const YES_NO_MAYBE = ["Yes", "No", "Planning to get"];
const DEEP_CHECK_DRAFT_KEY = "visa_shuttle_deep_check_draft_v2";

const STEPS = [
  { n: 1, title: "Personal Profile", icon: User, bg: "bg-blue-50", color: "text-blue-600" },
  { n: 2, title: "Travel Plan", icon: Plane, bg: "bg-purple-50", color: "text-purple-600" },
  { n: 3, title: "Visa Type Details", icon: BookOpen, bg: "bg-indigo-50", color: "text-indigo-600" },
  { n: 4, title: "Employment & Income", icon: Briefcase, bg: "bg-emerald-50", color: "text-emerald-600" },
  { n: 5, title: "Financial Depth", icon: CreditCard, bg: "bg-amber-50", color: "text-amber-600" },
  { n: 6, title: "History & Visas", icon: Globe, bg: "bg-rose-50", color: "text-rose-600" },
  { n: 7, title: "Documents", icon: FileText, bg: "bg-orange-50", color: "text-orange-600" },
  { n: 8, title: "Home Ties & Extra", icon: Home, bg: "bg-teal-50", color: "text-teal-600" },
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

const IELTS_BANDS = ["0.0","0.5","1.0","1.5","2.0","2.5","3.0","3.5","4.0","4.5","5.0","5.5","6.0","6.5","7.0","7.5","8.0","8.5","9.0"];
const TOEFL_TOTAL_BANDS = ["0–30","31–60","61–80","81–100","101–120"];
const TOEFL_SECTION_BANDS = ["0–8","9–16","17–24","25–30"];
const PTE_BANDS = ["10–29","30–42","43–50","51–58","59–65","66–75","76–84","85–90"];
const DUOLINGO_BANDS = ["10–55","60–85","90–115","120–135","140–160"];
const OET_GRADES = ["A","B","C+","C","D","E","Awaiting result"];

const STUDY_LANGUAGE_REQUIREMENTS: Record<string, { language: string; requirement: string }> = {
  "United States": { language: "English", requirement: "IELTS / TOEFL / Duolingo / PTE" },
  "Canada": { language: "English / French", requirement: "IELTS / TOEFL / PTE / TEF" },
  "United Kingdom": { language: "English", requirement: "IELTS UKVI / SELT / PTE" },
  "Australia": { language: "English", requirement: "IELTS / PTE / TOEFL" },
  "New Zealand": { language: "English", requirement: "IELTS / PTE" },
  "Ireland": { language: "English", requirement: "IELTS / TOEFL" },
  "Germany": { language: "German / English", requirement: "TestDaF / DSH / Goethe / IELTS / TOEFL / MOI" },
  "France": { language: "French / English", requirement: "DELF / DALF / TCF / IELTS" },
  "Italy": { language: "Italian / English", requirement: "CILS / CELI / IELTS" },
  "Spain": { language: "Spanish / English", requirement: "DELE / SIELE / IELTS" },
  "Portugal": { language: "Portuguese / English", requirement: "IELTS" },
  "Netherlands": { language: "English / Dutch", requirement: "IELTS / TOEFL" },
  "Belgium": { language: "Dutch / French / English", requirement: "IELTS or local language proof" },
  "Sweden": { language: "English", requirement: "IELTS / TOEFL" },
  "Norway": { language: "Norwegian / English", requirement: "IELTS / TOEFL" },
  "Denmark": { language: "Danish / English", requirement: "IELTS / TOEFL" },
  "Finland": { language: "Finnish / English", requirement: "IELTS / TOEFL" },
  "Austria": { language: "German", requirement: "German certificate or IELTS" },
  "Switzerland": { language: "German / French / Italian / English", requirement: "Depends on university language" },
  "Poland": { language: "Polish / English", requirement: "IELTS / MOI" },
  "Hungary": { language: "Hungarian / English", requirement: "IELTS / MOI" },
  "Czech Republic": { language: "Czech / English", requirement: "IELTS / MOI" },
  "Lithuania": { language: "English", requirement: "IELTS / MOI" },
  "Latvia": { language: "English", requirement: "IELTS / MOI" },
  "Estonia": { language: "English", requirement: "IELTS" },
  "Russia": { language: "Russian / English", requirement: "TORFL / IELTS" },
  "Turkey": { language: "Turkish / English", requirement: "IELTS / TOEFL" },
  "Georgia": { language: "English", requirement: "MOI / Interview / Often No IELTS" },
  "Armenia": { language: "English", requirement: "MOI / Interview" },
  "United Arab Emirates": { language: "English / Arabic", requirement: "IELTS / Internal Test" },
  "Saudi Arabia": { language: "Arabic / English", requirement: "IELTS for international universities" },
  "Qatar": { language: "English / Arabic", requirement: "IELTS / TOEFL" },
  "Singapore": { language: "English", requirement: "IELTS / TOEFL / PTE" },
  "Malaysia": { language: "English", requirement: "IELTS / MOI" },
  "Japan": { language: "Japanese / English", requirement: "JLPT / IELTS" },
  "South Korea": { language: "Korean / English", requirement: "TOPIK / IELTS" },
  "China": { language: "Chinese / English", requirement: "HSK / IELTS" },
  "Thailand": { language: "Thai / English", requirement: "IELTS for international programs" },
  "Vietnam": { language: "Vietnamese / English", requirement: "IELTS sometimes required" },
  "Philippines": { language: "English", requirement: "Usually No IELTS" },
  "Cyprus": { language: "English / Greek", requirement: "IELTS / MOI" },
  "Malta": { language: "English", requirement: "IELTS" },
};

const WORK_LANGUAGE_REQUIREMENTS: Record<string, { required: boolean; requirement: string; tests: string[] }> = {
  "United Kingdom": { required: true, requirement: "English evidence is required for most Skilled Worker, Health and Care Worker, and regulated routes. SELT / IELTS UKVI, IELTS, PTE, or approved equivalents may apply.", tests: ["SELT / IELTS UKVI","IELTS","PTE Academic","OET","Employer / regulator exemption","Other"] },
  "Canada": { required: true, requirement: "Language evidence is commonly required for immigration-linked work pathways and regulated occupations. IELTS, CELPIP/TEF, or employer/province-specific evidence may apply.", tests: ["IELTS","TEF / French test","Employer / regulator exemption","Other"] },
  "Australia": { required: true, requirement: "English evidence is commonly required for skilled, sponsored, and many regulated work routes. IELTS, PTE Academic, TOEFL, or OET may apply.", tests: ["IELTS","PTE Academic","TOEFL","OET","Employer / regulator exemption","Other"] },
  "New Zealand": { required: true, requirement: "English evidence is commonly required for skilled residence-linked routes and regulated occupations. IELTS, PTE, TOEFL, or OET may apply.", tests: ["IELTS","PTE Academic","TOEFL","OET","Employer / regulator exemption","Other"] },
  "Ireland": { required: true, requirement: "Language evidence is often checked for healthcare, education, and regulated occupations. IELTS, OET, or regulator-specific proof may apply.", tests: ["IELTS","OET","Employer / regulator exemption","Other"] },
  "United States": { required: false, requirement: "Most temporary employment visas do not require IELTS/TOEFL for the visa itself, but employers, licensing boards, healthcare roles, or academic employers may request proof.", tests: ["IELTS","TOEFL","OET","Employer / regulator exemption","Other"] },
  "Singapore": { required: false, requirement: "English tests are usually not a visa requirement, but employers or licensing bodies may request proof for regulated roles.", tests: ["IELTS","TOEFL","PTE Academic","Employer / regulator exemption","Other"] },
  "Malta": { required: true, requirement: "English evidence may be required for some employment and regulated routes. IELTS or approved equivalents may apply.", tests: ["IELTS","Employer / regulator exemption","Other"] },
};

const BLANK: Record<string, string> = {};

const STUDENT_DETAIL_KEYS = [
  "institutionName",
  "studyLevel",
  "courseName",
  "courseDuration",
  "courseStartDate",
  "hasAcceptanceLetter",
  "scholarshipAvailable",
  "annualTuitionFee",
  "tuitionPaid",
  "academicHighestQualification",
  "lastEducationScore",
  "studyGap",
  "englishTestType",
  "ieltsOverall",
  "ieltsListening",
  "ieltsReading",
  "ieltsWriting",
  "ieltsSpeaking",
  "pteOverall",
  "pteListening",
  "pteReading",
  "pteWriting",
  "pteSpeaking",
  "toeflTotal",
  "toeflListening",
  "toeflReading",
  "toeflWriting",
  "toeflSpeaking",
  "duolingoOverall",
  "duolingoLiteracy",
  "duolingoComprehension",
  "duolingoConversation",
  "duolingoProduction",
  "educationSponsor",
  "whyThisCourse",
  "postStudyPlan",
  "hasAcademicTranscripts",
  "hasSop",
  "hasFeeReceipt",
  "hasSponsorAffidavit",
];

const WORK_DETAIL_KEYS = [
  "currentJobTitle",
  "currentEmployerName",
  "occupationSector",
  "totalWorkExperience",
  "relevantWorkExperience",
  "currentSalary",
  "hasJobOffer",
  "hiringCompanyName",
  "offeredJobTitle",
  "offeredSalary",
  "employmentStartDate",
  "contractDuration",
  "jobSkillLevel",
  "jobMatchesExperience",
  "employerLicenseStatus",
  "workPermitSponsor",
  "recruitmentChannel",
  "hasSignedContract",
  "hasEmployerSponsorshipLetter",
  "hasQualificationProof",
  "hasExperienceLetters",
  "workEnglishTestStatus",
  "workEnglishTestType",
  "workIeltsOverall",
  "workIeltsListening",
  "workIeltsReading",
  "workIeltsWriting",
  "workIeltsSpeaking",
  "workPteOverall",
  "workPteListening",
  "workPteReading",
  "workPteWriting",
  "workPteSpeaking",
  "workToeflTotal",
  "workToeflListening",
  "workToeflReading",
  "workToeflWriting",
  "workToeflSpeaking",
  "oetOverallGrade",
  "oetListeningGrade",
  "oetReadingGrade",
  "oetWritingGrade",
  "oetSpeakingGrade",
  "oetTestDate",
  "hasLanguageScoreReport",
  "professionalRegistrationStatus",
  "languageRequirementNotes",
  "roleResponsibilities",
  "careerReasonForMove",
];

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
type DraftStatus = "idle" | "saving" | "saved" | "restored";

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

function isStudentVisaType(visaType = ""): boolean {
  const normalized = visaType.toLowerCase();
  return ["student", "study", "f-1", "m-1", "j-1", "tier 4"].some(term => normalized.includes(term));
}

function isWorkVisaType(visaType = ""): boolean {
  const normalized = visaType.toLowerCase();
  return ["work", "employment", "skilled worker", "temporary worker", "h-1b", "h1b", "l-1", "l1", "work permit"].some(term => normalized.includes(term));
}

function isLongStayProfileVisa(visaType = ""): boolean {
  return isStudentVisaType(visaType) || isWorkVisaType(visaType);
}

function isEnglishLanguageWorkDestination(country = ""): boolean {
  return Boolean(WORK_LANGUAGE_REQUIREMENTS[country]?.required);
}

function getWorkLanguageRequirement(country = "") {
  return WORK_LANGUAGE_REQUIREMENTS[country] ?? {
    required: false,
    requirement: "Language tests are usually not required for the work visa itself. Some employers, licensing bodies, or regulated occupations may still ask for proof.",
    tests: ["IELTS","PTE Academic","TOEFL","OET","Employer / regulator exemption","Other"],
  };
}

function getWorkLanguageOptions(form: Record<string, string>): string[] {
  const rule = getWorkLanguageRequirement(form.destinationCountry);
  if (isHealthcareOrRegulatedProfession(form)) {
    return Array.from(new Set(["OET", ...rule.tests, "Employer / regulator exemption", "Other"]));
  }
  return rule.tests;
}

function shouldShowWorkLanguageScores(status = ""): boolean {
  return ["Score available", "Booked / awaiting result", "Planning to take"].includes(status);
}

function isWorkLanguageRelevant(form: Record<string, string>): boolean {
  const rule = WORK_LANGUAGE_REQUIREMENTS[form.destinationCountry || ""];
  if (rule?.required) return true;
  return Boolean(rule && isHealthcareOrRegulatedProfession(form));
}

function isHealthcareOrRegulatedProfession(form: Record<string, string>): boolean {
  const text = [
    form.occupationSector,
    form.currentJobTitle,
    form.offeredJobTitle,
    form.jobSkillLevel,
  ].filter(Boolean).join(" ").toLowerCase();
  return /nurse|nursing|doctor|physician|dentist|pharmacist|health|caregiver|midwife|medical|regulated/.test(text);
}

function getStepDescription(step: number, visaType = ""): string {
  if (step === 1) return "Tell us who is applying so the AI can understand age, identity, family context, and passport strength.";
  if (step === 2) return "Choose the destination and visa route. We adapt the next questions based on the visa type.";
  if (step === 3 && isStudentVisaType(visaType)) return "Add course, university, academic, funding, and English-test details used in student visa decisions.";
  if (step === 3 && isWorkVisaType(visaType)) return "Add offer, profession, sponsor, experience, salary, IELTS/OET, and registration details used in work visa decisions.";
  if (step === 3) return "No extra visa-type screen is needed. Continue with the standard embassy-style profile checks.";
  if (step === 4) return "Employment, income source, and role stability help the AI measure credibility and return intent.";
  if (step === 5) return "Bank balance, statements, assets, and funding source help identify financial gaps before applying.";
  if (step === 6) return "Travel history, refusals, valid visas, and immigration records shape the risk profile.";
  if (step === 7) return "Document readiness is checked against common embassy expectations for your route.";
  return "Home ties, dependents, commitments, and destination contacts help complete the final risk picture.";
}

function selectedTestNeedsScores(testType = ""): boolean {
  return ["IELTS", "SELT / IELTS UKVI", "PTE", "PTE Academic", "TOEFL", "Duolingo", "OET"].includes(testType);
}

function getStudyLanguageRequirement(country = "") {
  return STUDY_LANGUAGE_REQUIREMENTS[country] ?? null;
}

function getStudyLanguageOptions(country = ""): string[] {
  const requirement = getStudyLanguageRequirement(country)?.requirement ?? "";
  const normalized = requirement.toLowerCase();
  const options: string[] = [];

  if (/ielts/.test(normalized)) options.push("IELTS");
  if (/pte/.test(normalized)) options.push("PTE");
  if (/toefl/.test(normalized)) options.push("TOEFL");
  if (/duolingo/.test(normalized)) options.push("Duolingo");
  if (/moi|medium of instruction/.test(normalized)) options.push("MOI / Medium of Instruction");
  if (/internal test/.test(normalized)) options.push("University internal test");
  if (/interview/.test(normalized)) options.push("University interview");
  if (/local language|german certificate|testdaf|dsh|goethe|delf|dalf|tcf|cils|celi|dele|siele|torfl|jlpt|topik|hsk|tef/.test(normalized)) {
    options.push("Local language certificate");
  }
  if (/selt|ukvi/.test(normalized)) options.push("SELT / IELTS UKVI");
  if (/no ielts|not required|usually no|often no|sometimes required|depends on university/.test(normalized)) {
    options.push("Not required / university exemption");
  }
  options.push("Planning to take", "Other");

  return Array.from(new Set(options.length ? options : ["IELTS", "TOEFL", "PTE", "Not required / university exemption", "Planning to take", "Other"]));
}

function isStudyLanguageUsuallyOptional(country = ""): boolean {
  const requirement = getStudyLanguageRequirement(country)?.requirement.toLowerCase() ?? "";
  return /no ielts|usually no|often no|sometimes required|depends on university|moi|interview/.test(requirement);
}

function missingStudentLanguageScoreLabels(form: Record<string, string>): string[] {
  if (!selectedTestNeedsScores(form.englishTestType)) return [];
  if (form.englishTestType === "IELTS" || form.englishTestType === "SELT / IELTS UKVI") {
    return [
      !form.ieltsOverall && "IELTS Overall",
      !form.ieltsListening && "IELTS Listening",
      !form.ieltsReading && "IELTS Reading",
      !form.ieltsWriting && "IELTS Writing",
      !form.ieltsSpeaking && "IELTS Speaking",
    ].filter(Boolean) as string[];
  }
  if (form.englishTestType === "TOEFL") {
    return [
      !form.toeflTotal && "TOEFL Total",
      !form.toeflListening && "TOEFL Listening",
      !form.toeflReading && "TOEFL Reading",
      !form.toeflWriting && "TOEFL Writing",
      !form.toeflSpeaking && "TOEFL Speaking",
    ].filter(Boolean) as string[];
  }
  if (form.englishTestType === "PTE") {
    return [
      !form.pteOverall && "PTE Overall",
      !form.pteListening && "PTE Listening",
      !form.pteReading && "PTE Reading",
      !form.pteWriting && "PTE Writing",
      !form.pteSpeaking && "PTE Speaking",
    ].filter(Boolean) as string[];
  }
  if (form.englishTestType === "Duolingo") {
    return [
      !form.duolingoOverall && "Duolingo Overall",
      !form.duolingoLiteracy && "Duolingo Literacy",
      !form.duolingoComprehension && "Duolingo Comprehension",
      !form.duolingoConversation && "Duolingo Conversation",
      !form.duolingoProduction && "Duolingo Production",
    ].filter(Boolean) as string[];
  }
  return [];
}

function missingWorkLanguageScoreLabels(form: Record<string, string>): string[] {
  if (!selectedTestNeedsScores(form.workEnglishTestType)) return [];
  if (form.workEnglishTestType === "IELTS") {
    return [
      !form.workIeltsOverall && "IELTS Overall",
      !form.workIeltsListening && "IELTS Listening",
      !form.workIeltsReading && "IELTS Reading",
      !form.workIeltsWriting && "IELTS Writing",
      !form.workIeltsSpeaking && "IELTS Speaking",
    ].filter(Boolean) as string[];
  }
  if (form.workEnglishTestType === "TOEFL") {
    return [
      !form.workToeflTotal && "TOEFL Total",
      !form.workToeflListening && "TOEFL Listening",
      !form.workToeflReading && "TOEFL Reading",
      !form.workToeflWriting && "TOEFL Writing",
      !form.workToeflSpeaking && "TOEFL Speaking",
    ].filter(Boolean) as string[];
  }
  if (form.workEnglishTestType === "PTE Academic") {
    return [
      !form.workPteOverall && "PTE Overall",
      !form.workPteListening && "PTE Listening",
      !form.workPteReading && "PTE Reading",
      !form.workPteWriting && "PTE Writing",
      !form.workPteSpeaking && "PTE Speaking",
    ].filter(Boolean) as string[];
  }
  if (form.workEnglishTestType === "OET") {
    return [
      !form.oetOverallGrade && "OET Overall / Lowest Grade",
      !form.oetListeningGrade && "OET Listening",
      !form.oetReadingGrade && "OET Reading",
      !form.oetWritingGrade && "OET Writing",
      !form.oetSpeakingGrade && "OET Speaking",
    ].filter(Boolean) as string[];
  }
  return [];
}

export default function DeepCheckPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Record<string, string>>({ ...BLANK });
  const [result, setResult] = useState<any>(null);
  const [resultCheckId, setResultCheckId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailingReport, setIsEmailingReport] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [visaHoldings, setVisaHoldings] = useState<VisaHolding[]>([]);
  const [loadMessage, setLoadMessage] = useState(LOAD_MESSAGES[0]);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [profileApplied, setProfileApplied] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Load saved profile
  const { data: savedProfile } = useQuery<any>({
    queryKey: ["/api/b2c/profile"],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || draftLoaded) return;
    try {
      const raw = localStorage.getItem(DEEP_CHECK_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.form && typeof draft.form === "object") {
          setForm({ ...BLANK, ...draft.form });
          if (Array.isArray(draft.visaHoldings)) setVisaHoldings(draft.visaHoldings);
          if (typeof draft.step === "number") setStep(Math.min(STEPS.length, Math.max(1, draft.step)));
          setProfileApplied(true);
          setDraftStatus("restored");
        }
      }
    } catch (_) {
      localStorage.removeItem(DEEP_CHECK_DRAFT_KEY);
    } finally {
      setDraftLoaded(true);
    }
  }, [user, draftLoaded]);

  useEffect(() => {
    if (!user || !draftLoaded || result || isSubmitting) return;
    const hasDraftData = Object.values(form).some(Boolean) || visaHoldings.length > 0 || step > 1;
    if (!hasDraftData) return;

    setDraftStatus("saving");
    const timer = window.setTimeout(() => {
      localStorage.setItem(DEEP_CHECK_DRAFT_KEY, JSON.stringify({
        form,
        visaHoldings,
        step,
        updatedAt: new Date().toISOString(),
      }));
      setDraftStatus("saved");
    }, 650);

    return () => window.clearTimeout(timer);
  }, [draftLoaded, form, isSubmitting, result, step, user, visaHoldings]);

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

  useEffect(() => {
    if (!isStudentVisaType(form.visaType) || !form.englishTestType) return;
    const allowed = getStudyLanguageOptions(form.destinationCountry || "");
    if (allowed.includes(form.englishTestType)) return;
    setForm(prev => ({
      ...prev,
      englishTestType: "",
      ieltsOverall: "",
      ieltsListening: "",
      ieltsReading: "",
      ieltsWriting: "",
      ieltsSpeaking: "",
      pteOverall: "",
      pteListening: "",
      pteReading: "",
      pteWriting: "",
      pteSpeaking: "",
      toeflTotal: "",
      toeflListening: "",
      toeflReading: "",
      toeflWriting: "",
      toeflSpeaking: "",
      duolingoOverall: "",
      duolingoLiteracy: "",
      duolingoComprehension: "",
      duolingoConversation: "",
      duolingoProduction: "",
    }));
  }, [form.destinationCountry, form.englishTestType, form.visaType]);

  useEffect(() => {
    if (!isWorkVisaType(form.visaType) || !form.workEnglishTestType) return;
    const allowed = getWorkLanguageOptions(form);
    if (allowed.includes(form.workEnglishTestType)) return;
    setForm(prev => ({
      ...prev,
      workEnglishTestType: "",
      workIeltsOverall: "",
      workIeltsListening: "",
      workIeltsReading: "",
      workIeltsWriting: "",
      workIeltsSpeaking: "",
      workPteOverall: "",
      workPteListening: "",
      workPteReading: "",
      workPteWriting: "",
      workPteSpeaking: "",
      workToeflTotal: "",
      workToeflListening: "",
      workToeflReading: "",
      workToeflWriting: "",
      workToeflSpeaking: "",
      oetOverallGrade: "",
      oetListeningGrade: "",
      oetReadingGrade: "",
      oetWritingGrade: "",
      oetSpeakingGrade: "",
    }));
  }, [form.destinationCountry, form.occupationSector, form.currentJobTitle, form.offeredJobTitle, form.jobSkillLevel, form.visaType, form.workEnglishTestType]);

  if (authLoading) return null;
  if (!user) { setLocation("/sign-in"); return null; }

  const set = (key: string) => (val: string) => setForm(prev => ({ ...prev, [key]: val }));
  const setVisaType = (val: string) => {
    setForm(prev => {
      const next = { ...prev, visaType: val, tripDuration: "" };
      const keepStudent = isStudentVisaType(val);
      const keepWork = isWorkVisaType(val);
      if (!keepStudent) STUDENT_DETAIL_KEYS.forEach(key => { next[key] = ""; });
      if (!keepWork) WORK_DETAIL_KEYS.forEach(key => { next[key] = ""; });
      return next;
    });
  };

  const hasAccess = user.deepCheckAccess;
  const deepCheckPrice = formatB2cPrice(getStoredB2cCurrency());
  const basicCheckPrice = formatB2cPrice(getStoredB2cCurrency(), 0);
  const paymentParams = new URLSearchParams(window.location.search);
  const showPaymentRetryNotice = paymentParams.get("payment") === "retry";
  const retryPlan = paymentParams.get("plan") === "pro" ? "pro" : "deep";
  const retryCurrency = paymentParams.get("currency") || getStoredB2cCurrency();
  const paymentStatus = paymentParams.get("status") || "";
  const paymentReason = paymentParams.get("reason") || "";
  const retryPaymentHref = `/payment/deep-check?plan=${retryPlan}&currency=${encodeURIComponent(retryCurrency)}`;

  const resetDeepCheck = () => {
    setResult(null);
    setResultCheckId(null);
    setStep(1);
    setForm({ ...BLANK });
    setVisaHoldings([]);
    setDraftStatus("idle");
    localStorage.removeItem(DEEP_CHECK_DRAFT_KEY);
  };

  const downloadDeepCheckReport = () => {
    if (!resultCheckId) {
      toast({ title: "Report is not ready", description: "Please run the Deep Check again to generate a downloadable report.", variant: "destructive" });
      return;
    }
    window.open(`/api/b2c/deep-checks/${resultCheckId}/pdf`, "_blank", "noopener,noreferrer");
  };

  const emailDeepCheckReport = async () => {
    if (!resultCheckId) {
      toast({ title: "Report is not ready", description: "Please run the Deep Check again to email the report.", variant: "destructive" });
      return;
    }
    setIsEmailingReport(true);
    try {
      await apiRequest("POST", `/api/b2c/deep-checks/${resultCheckId}/email`, {});
      toast({ title: "Report emailed", description: `Your Deep Check PDF was sent to ${user.email}.` });
    } catch (err: any) {
      toast({ title: "Email failed", description: err.message || "Please check email settings and try again.", variant: "destructive" });
    } finally {
      setIsEmailingReport(false);
    }
  };

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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadDeepCheckReport} disabled={!resultCheckId}>
                <Download className="w-3.5 h-3.5" /> Download PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={emailDeepCheckReport} disabled={!resultCheckId || isEmailingReport}>
                {isEmailingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Email PDF
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={resetDeepCheck}>
              <RefreshCw className="w-3.5 h-3.5" /> New Deep Check
              </Button>
            </div>
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
              onClick={resetDeepCheck}>
              <RefreshCw className="w-4 h-4" /> New Deep Check
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadDeepCheckReport} disabled={!resultCheckId}>
              <Download className="w-4 h-4" /> Download PDF
            </Button>
            <Button variant="outline" className="gap-2" onClick={emailDeepCheckReport} disabled={!resultCheckId || isEmailingReport}>
              {isEmailingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Email PDF
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
          {showPaymentRetryNotice && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
                    <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Payment was not completed</p>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                      {paymentStatus
                        ? `Your payment is currently ${paymentStatus}. Complete the payment to unlock Deep Check.`
                        : paymentReason || "Complete the payment to unlock Deep Check."}
                    </p>
                  </div>
                </div>
                <Link href={retryPaymentHref}>
                  <Button className="w-full sm:w-auto bg-amber-600 text-white hover:bg-amber-700">
                    Retry Payment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <Badge className="bg-white/10 text-white border-white/20 font-semibold">One-time payment</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Deep Visa Risk Analysis</h1>
              <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
                Go beyond a basic score. Our AI runs an embassy-style deep analysis — risk severity breakdown, dimension scoring, action plan, and embassy intelligence.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/payment/deep-check">
                  <Button className="bg-white text-blue-900 hover:bg-blue-50 font-semibold gap-2" data-testid="button-upgrade">
                    <Crown className="w-4 h-4 text-amber-500" /> Get Deep Check — {deepCheckPrice} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/check">
                  <Button variant="ghost" className="text-white hover:bg-white/10 gap-2">
                    <Sparkles className="w-4 h-4" /> Try Basic Check at {basicCheckPrice}
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
  const answeredFields = Object.values(form).filter(Boolean).length + visaHoldings.length;
  const draftLabel = draftStatus === "saving" ? "Saving draft..." : draftStatus === "restored" ? "Draft restored" : draftStatus === "saved" ? "Draft saved" : "Draft ready";
  const workVisaSelected = isWorkVisaType(form.visaType);
  const longStayProfileVisa = isLongStayProfileVisa(form.visaType);
  const workLanguageRelevant = workVisaSelected && isWorkLanguageRelevant(form);

  // Per-step required-field check
  const STEP_REQUIRED: Record<number, { key: string; label: string }[]> = {
    1: [{ key: "nationality", label: "Nationality" }, { key: "dateOfBirth", label: "Date of Birth" }],
    2: [
      { key: "destinationCountry", label: "Destination Country" },
      { key: "visaType", label: "Visa Type" },
      ...(!longStayProfileVisa ? [{ key: "tripDuration", label: "Trip Duration" }] : []),
    ],
    4: [{ key: "employmentStatus", label: "Employment Status" }],
    5: [{ key: "bankBalance", label: "Bank Balance" }],
    6: [{ key: "previousVisaRefusals", label: "Previous Visa Refusals" }],
  };

  const canAdvance = (): boolean => {
    const required = STEP_REQUIRED[step] ?? [];
    if (!required.every(r => !!form[r.key])) return false;
    if (step === 1 && validateAdultApplicantDob(form.dateOfBirth)) return false;
    if (step === 3 && isStudentVisaType(form.visaType)) {
      return Boolean(
        form.institutionName
        && form.studyLevel
        && form.courseName
        && form.hasAcceptanceLetter
        && missingStudentLanguageScoreLabels(form).length === 0
      );
    }
    if (step === 3 && isWorkVisaType(form.visaType)) {
      return Boolean(
        (form.currentJobTitle || form.jobTitle)
        && form.occupationSector
        && form.totalWorkExperience
        && form.hasJobOffer
        && form.hiringCompanyName
        && form.offeredJobTitle
        && form.offeredSalary
        && (!workLanguageRelevant || form.workEnglishTestStatus)
        && (!shouldShowWorkLanguageScores(form.workEnglishTestStatus) || form.workEnglishTestType)
        && missingWorkLanguageScoreLabels(form).length === 0
      );
    }
    return true;
  };

  const getMissingLabels = (): string => {
    if (step === 3 && isStudentVisaType(form.visaType)) {
      return [
        !form.institutionName && "University / Institution",
        !form.studyLevel && "Study Level",
        !form.courseName && "Course / Program Name",
        !form.hasAcceptanceLetter && "Acceptance Letter Status",
        ...missingStudentLanguageScoreLabels(form),
      ].filter(Boolean).join(", ");
    }
    if (step === 3 && isWorkVisaType(form.visaType)) {
      return [
        !(form.currentJobTitle || form.jobTitle) && "Current Job Title",
        !form.totalWorkExperience && "Total Work Experience",
        !form.hasJobOffer && "Job Offer Letter Status",
        !form.hiringCompanyName && "Hiring Company Name",
        !form.offeredJobTitle && "Offered Job Title",
        !form.offeredSalary && "Offered Salary",
        !form.occupationSector && "Profession / Occupation Sector",
        workLanguageRelevant && !form.workEnglishTestStatus && "English / OET Requirement Status",
        shouldShowWorkLanguageScores(form.workEnglishTestStatus) && !form.workEnglishTestType && "Language Test Type",
        ...missingWorkLanguageScoreLabels(form),
      ].filter(Boolean).join(", ");
    }
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
      visaTypeSpecificProfile: isStudentVisaType(form.visaType)
        ? [
            `Student visa profile`,
            `Institution: ${form.institutionName || "-"}`,
            `Course: ${form.courseName || "-"} (${form.studyLevel || "-"})`,
            `Academic score: ${form.lastEducationScore || "-"}`,
            `Study gap: ${form.studyGap || "-"}`,
            `Destination language rule: ${getStudyLanguageRequirement(form.destinationCountry)?.requirement || "-"}; main language: ${getStudyLanguageRequirement(form.destinationCountry)?.language || "-"}`,
            `English test: ${form.englishTestType || "-"}; IELTS ${form.ieltsOverall || "-"} L${form.ieltsListening || "-"} R${form.ieltsReading || "-"} W${form.ieltsWriting || "-"} S${form.ieltsSpeaking || "-"}; TOEFL total ${form.toeflTotal || "-"}; PTE overall ${form.pteOverall || "-"}; Duolingo overall ${form.duolingoOverall || "-"}`,
            `Funding: ${form.educationSponsor || "-"}, tuition: ${form.annualTuitionFee || "-"}, paid: ${form.tuitionPaid || "-"}`,
            `Acceptance letter: ${form.hasAcceptanceLetter || "-"}`,
          ].join("; ")
        : isWorkVisaType(form.visaType)
          ? [
              `Work visa profile`,
              `Current role: ${form.currentJobTitle || form.jobTitle || "-"} at ${form.currentEmployerName || form.companyName || "-"}`,
              `Profession: ${form.occupationSector || "-"}; professional registration: ${form.professionalRegistrationStatus || "-"}`,
              `Experience: ${form.totalWorkExperience || "-"} total, ${form.relevantWorkExperience || "-"} relevant`,
              `Offer: ${form.offeredJobTitle || "-"} at ${form.hiringCompanyName || "-"}, salary ${form.offeredSalary || "-"}`,
              `Job offer letter: ${form.hasJobOffer || "-"}`,
              `Sponsor: ${form.workPermitSponsor || "-"}, employer license: ${form.employerLicenseStatus || "-"}`,
              `Role match: ${form.jobMatchesExperience || "-"}`,
              `Destination work language rule: ${getWorkLanguageRequirement(form.destinationCountry).requirement}; required: ${getWorkLanguageRequirement(form.destinationCountry).required ? "Yes" : "Usually no"}`,
              `Language evidence: ${form.workEnglishTestStatus || "-"}; test: ${form.workEnglishTestType || "-"}; IELTS ${form.workIeltsOverall || "-"} L${form.workIeltsListening || "-"} R${form.workIeltsReading || "-"} W${form.workIeltsWriting || "-"} S${form.workIeltsSpeaking || "-"}; TOEFL total ${form.workToeflTotal || "-"}; PTE overall ${form.workPteOverall || "-"}; OET grade ${form.oetOverallGrade || "-"}; score report: ${form.hasLanguageScoreReport || "-"}`,
              `Professional registration: ${form.professionalRegistrationStatus || "-"}`,
            ].join("; ")
          : "Not applicable for selected visa type",
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
      setResultCheckId(data.check?.id ?? null);
      localStorage.removeItem(DEEP_CHECK_DRAFT_KEY);
      setDraftStatus("idle");
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
      <div className="mx-auto max-w-7xl space-y-5 pb-28 md:pb-8">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-white via-blue-50/70 to-fuchsia-50/60 p-5 shadow-xl shadow-primary/5 dark:from-slate-950 dark:via-blue-950/30 dark:to-fuchsia-950/20 md:p-7">
          <div className="absolute right-6 top-6 hidden h-28 w-28 rounded-full bg-[#4055FF]/10 blur-3xl md:block" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1.5 text-xs font-bold text-primary shadow-sm dark:bg-slate-900/70">
                <Brain className="h-3.5 w-3.5" />
                Deep Check AI Analysis
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-4xl">
                Build a stronger visa profile, step by step.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                Answer what you know. Visa Shuttle saves your draft, adapts questions by visa type, and turns your profile into an embassy-style AI risk report.
              </p>
            </div>
            <div className="grid min-w-[220px] gap-3 rounded-2xl border border-white/70 bg-white/75 p-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Completion</span>
                <span className="text-sm font-black text-foreground">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7033F0,#4055FF,#FF2060)" }} />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{answeredFields} answers captured</span>
                <span>Step {step}/{STEPS.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card className="border-primary/10 bg-card/95 shadow-sm">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Assessment path</p>
                    <p className="text-sm text-muted-foreground">Your AI profile map</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary">8 steps</Badge>
                </div>
                <div className="space-y-2">
                  {STEPS.map(s => {
                    const SIcon = s.icon;
                    const done = s.n < step;
                    const active = s.n === step;
                    return (
                      <button
                        key={s.n}
                        type="button"
                        onClick={() => { if (s.n <= step) setStep(s.n); }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                          active
                            ? "border-primary/30 bg-primary/10 shadow-sm"
                            : done
                              ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
                              : "border-transparent bg-muted/35 text-muted-foreground"
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                          {done ? <CheckCircle className="h-4 w-4" /> : <SIcon className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-foreground">{s.title}</span>
                          <span className="block text-xs text-muted-foreground">Step {s.n}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200/70 bg-blue-50/70 shadow-sm dark:border-blue-900 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#4055FF] shadow-sm dark:bg-slate-900">
                    {draftStatus === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-950 dark:text-blue-100">{draftLabel}</p>
                    <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-300">Your Deep Check draft is kept on this device until you submit or start again.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border bg-card/90 p-4 shadow-sm lg:hidden">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{currentStep.title}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7033F0,#4055FF,#FF2060)" }} />
              </div>
            </div>

            <Card className="overflow-hidden border-primary/10 bg-card/95 shadow-xl shadow-primary/5">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white px-5 py-5 dark:from-slate-900 dark:to-slate-950 md:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${currentStep.bg} dark:bg-opacity-20`}>
                      <StepIcon className={`h-6 w-6 ${currentStep.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Step {step} of {STEPS.length}</p>
                      <CardTitle className="mt-1 text-xl font-black">{currentStep.title}</CardTitle>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{getStepDescription(step, form.visaType)}</p>
                    </div>
                  </div>
                  <Badge className="w-fit border-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                    <Clock3 className="mr-1.5 h-3.5 w-3.5" />
                    5-8 min
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 md:p-8">
            {/* Step header */}
            <div className="hidden">
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
                          <SearchableSelect label="Destination Country *" required value={form.destinationCountry || ""} onChange={val => { set("destinationCountry")(val); set("usVisaCategory")(""); setVisaType(""); }} options={COUNTRIES} placeholder="Search destination..." />
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
                            <Sel label="Visa Type *" val={form.visaType || ""} onChange={val => { set("usVisaCategory")(""); setVisaType(val); }} opts={VISA_TYPES.filter(t => t !== "Schengen Visa" && t !== "Other")} />
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
                              setVisaType("");
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
                              onChange={e => setVisaType(e.target.value)}
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
                  {!isLongStayProfileVisa(form.visaType) ? (
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
                  ) : (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-800 dark:bg-indigo-950/20">
                      <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">
                        {isStudentVisaType(form.visaType) ? "Study duration is captured next" : "Employment duration is captured next"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-indigo-700 dark:text-indigo-300">
                        Trip duration is not used for {isStudentVisaType(form.visaType) ? "student" : "work"} visas. The next step captures course length, contract duration, start date, and sponsor details.
                      </p>
                    </div>
                  )}
                <div>
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                    {isLongStayProfileVisa(form.visaType) ? "Planned Arrival Date" : "Planned Travel Date"}
                  </Label>
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

            {/* ===== STEP 3: Visa Type Details ===== */}
            {step === 3 && (() => {
              const studentVisa = isStudentVisaType(form.visaType);
              const workVisa = isWorkVisaType(form.visaType);
              const universityOptions = getUniversitiesForCountry(form.destinationCountry || "");
              const studyLanguageRule = getStudyLanguageRequirement(form.destinationCountry || "");
              const studyLanguageOptions = getStudyLanguageOptions(form.destinationCountry || "");

              if (studentVisa) {
                return (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
                      <div className="flex gap-3">
                        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">Student visa academic profile</p>
                          <p className="mt-1 text-xs leading-5 text-indigo-700 dark:text-indigo-300">
                            Immigration officers check whether your course, academic history, English ability, funding, and future plan are credible and consistent.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <SearchableSelect
                          label="University / Institution Applied To *"
                          required
                          value={form.institutionName || ""}
                          onChange={set("institutionName")}
                          options={universityOptions}
                          placeholder={form.destinationCountry ? "Search or type university name..." : "Select destination country first"}
                          allowCustom
                        />
                        {form.destinationCountry && universityOptions.length === 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">No suggestions for {form.destinationCountry} yet — type the institution name directly.</p>
                        )}
                      </div>
                      <Sel label="Study Level *" val={form.studyLevel || ""} onChange={set("studyLevel")} opts={["Undergraduate / Bachelor's","Postgraduate / Master's","PhD / Doctoral","Certificate / Diploma","Language Course","Foundation / Pathway"]} />
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Course / Program Name *</Label>
                        <Input value={form.courseName || ""} onChange={e => set("courseName")(e.target.value)} placeholder="e.g. MSc Data Science" />
                      </div>
                      <Sel label="Course Duration" val={form.courseDuration || ""} onChange={set("courseDuration")} opts={["Less than 6 months","6–12 months","1 year","2 years","3 years","4+ years"]} />
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Course Start Date</Label>
                        <Input type="date" value={form.courseStartDate || ""} min={TOMORROW} onChange={e => set("courseStartDate")(e.target.value)} />
                      </div>
                      <Sel label="Highest Completed Qualification" val={form.academicHighestQualification || ""} onChange={set("academicHighestQualification")} opts={["High School / 12th","Diploma","Bachelor's Degree","Master's Degree","PhD / Doctoral","Other"]} />
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Latest Education Score / GPA</Label>
                        <Input value={form.lastEducationScore || ""} onChange={e => set("lastEducationScore")(e.target.value)} placeholder="e.g. 72%, 8.1 CGPA, 3.4 GPA" />
                      </div>
                      <Sel label="Study Gap After Last Education" val={form.studyGap || ""} onChange={set("studyGap")} opts={["No gap","Less than 1 year","1–2 years","2–5 years","More than 5 years"]} />
                      <div className="sm:col-span-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                        <div className="flex gap-3">
                          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="text-sm font-bold text-blue-950 dark:text-blue-100">
                              {form.destinationCountry || "Destination"} language requirement
                            </p>
                            <p className="mt-1 text-xs leading-5 text-blue-800 dark:text-blue-300">
                              {studyLanguageRule
                                ? `Main study language: ${studyLanguageRule.language}. Common requirement: ${studyLanguageRule.requirement}.`
                                : "Select a destination country to see country-specific language-test guidance."}
                            </p>
                            {form.destinationCountry && isStudyLanguageUsuallyOptional(form.destinationCountry) && (
                              <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                This destination may accept MOI, interview, internal test, or university exemption instead of IELTS. Confirm with the university before applying.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Sel
                        label="English Test Type"
                        val={form.englishTestType || ""}
                        onChange={(val: string) => {
                          setForm(prev => ({
                            ...prev,
                            englishTestType: val,
                            ieltsOverall: (val === "IELTS" || val === "SELT / IELTS UKVI") ? prev.ieltsOverall : "",
                            ieltsListening: (val === "IELTS" || val === "SELT / IELTS UKVI") ? prev.ieltsListening : "",
                            ieltsReading: (val === "IELTS" || val === "SELT / IELTS UKVI") ? prev.ieltsReading : "",
                            ieltsWriting: (val === "IELTS" || val === "SELT / IELTS UKVI") ? prev.ieltsWriting : "",
                            ieltsSpeaking: (val === "IELTS" || val === "SELT / IELTS UKVI") ? prev.ieltsSpeaking : "",
                            pteOverall: val === "PTE" ? prev.pteOverall : "",
                            pteListening: val === "PTE" ? prev.pteListening : "",
                            pteReading: val === "PTE" ? prev.pteReading : "",
                            pteWriting: val === "PTE" ? prev.pteWriting : "",
                            pteSpeaking: val === "PTE" ? prev.pteSpeaking : "",
                            toeflTotal: val === "TOEFL" ? prev.toeflTotal : "",
                            toeflListening: val === "TOEFL" ? prev.toeflListening : "",
                            toeflReading: val === "TOEFL" ? prev.toeflReading : "",
                            toeflWriting: val === "TOEFL" ? prev.toeflWriting : "",
                            toeflSpeaking: val === "TOEFL" ? prev.toeflSpeaking : "",
                            duolingoOverall: val === "Duolingo" ? prev.duolingoOverall : "",
                            duolingoLiteracy: val === "Duolingo" ? prev.duolingoLiteracy : "",
                            duolingoComprehension: val === "Duolingo" ? prev.duolingoComprehension : "",
                            duolingoConversation: val === "Duolingo" ? prev.duolingoConversation : "",
                            duolingoProduction: val === "Duolingo" ? prev.duolingoProduction : "",
                          }));
                        }}
                        opts={studyLanguageOptions}
                      />
                      {form.englishTestType === "IELTS" || form.englishTestType === "SELT / IELTS UKVI" ? (
                        <>
                          <Sel label={`${form.englishTestType === "SELT / IELTS UKVI" ? "SELT / IELTS UKVI" : "IELTS"} Overall Band *`} val={form.ieltsOverall || ""} onChange={set("ieltsOverall")} opts={IELTS_BANDS} />
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["ieltsListening", "Listening"],
                              ["ieltsReading", "Reading"],
                              ["ieltsWriting", "Writing"],
                              ["ieltsSpeaking", "Speaking"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Band *`} val={form[key] || ""} onChange={set(key)} opts={IELTS_BANDS} />
                            ))}
                          </div>
                        </>
                      ) : null}
                      {form.englishTestType === "TOEFL" && (
                        <>
                          <Sel label="TOEFL Total Score *" val={form.toeflTotal || ""} onChange={set("toeflTotal")} opts={TOEFL_TOTAL_BANDS} />
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["toeflListening", "Listening"],
                              ["toeflReading", "Reading"],
                              ["toeflWriting", "Writing"],
                              ["toeflSpeaking", "Speaking"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Score *`} val={form[key] || ""} onChange={set(key)} opts={TOEFL_SECTION_BANDS} />
                            ))}
                          </div>
                        </>
                      )}
                      {form.englishTestType === "PTE" && (
                        <>
                          <Sel label="PTE Overall Score *" val={form.pteOverall || ""} onChange={set("pteOverall")} opts={PTE_BANDS} />
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["pteListening", "Listening"],
                              ["pteReading", "Reading"],
                              ["pteWriting", "Writing"],
                              ["pteSpeaking", "Speaking"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Score *`} val={form[key] || ""} onChange={set(key)} opts={PTE_BANDS} />
                            ))}
                          </div>
                        </>
                      )}
                      {form.englishTestType === "Duolingo" && (
                        <>
                          <Sel label="Duolingo Overall Score *" val={form.duolingoOverall || ""} onChange={set("duolingoOverall")} opts={DUOLINGO_BANDS} />
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["duolingoLiteracy", "Literacy"],
                              ["duolingoComprehension", "Comprehension"],
                              ["duolingoConversation", "Conversation"],
                              ["duolingoProduction", "Production"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Score *`} val={form[key] || ""} onChange={set(key)} opts={DUOLINGO_BANDS} />
                            ))}
                          </div>
                        </>
                      )}
                      <Sel label="Education Funding Source" val={form.educationSponsor || ""} onChange={set("educationSponsor")} opts={["Self-funded","Parents / Family","Education loan","Scholarship","Employer sponsored","Mixed funding"]} />
                      <Sel label="Annual Tuition Fee (USD)" val={form.annualTuitionFee || ""} onChange={set("annualTuitionFee")} opts={["Less than $5,000","$5,000 – $10,000","$10,000 – $20,000","$20,000 – $40,000","More than $40,000"]} />
                      <Sel label="Tuition Paid / Deposit Status" val={form.tuitionPaid || ""} onChange={set("tuitionPaid")} opts={["Not paid yet","Partial deposit paid","First semester paid","Full year paid","Full course paid"]} />
                      <DocToggle label="Acceptance / offer letter received? *" val={form.hasAcceptanceLetter || ""} onChange={set("hasAcceptanceLetter")} />
                      <DocToggle label="Academic transcripts available?" val={form.hasAcademicTranscripts || ""} onChange={set("hasAcademicTranscripts")} />
                      <DocToggle label="Statement of Purpose prepared?" val={form.hasSop || ""} onChange={set("hasSop")} />
                      <DocToggle label="Fee receipt / tuition proof available?" val={form.hasFeeReceipt || ""} onChange={set("hasFeeReceipt")} />
                      <DocToggle label="Sponsor affidavit / financial support letter?" val={form.hasSponsorAffidavit || ""} onChange={set("hasSponsorAffidavit")} />
                      <Sel label="Scholarship / Financial Aid Available?" val={form.scholarshipAvailable || ""} onChange={set("scholarshipAvailable")} opts={YES_NO} />
                      <div className="sm:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Why this course and university?</Label>
                        <Textarea value={form.whyThisCourse || ""} onChange={e => set("whyThisCourse")(e.target.value)} rows={3} placeholder="Explain academic progression, why this course, why this institution, and why this country..." />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Post-study plan</Label>
                        <Textarea value={form.postStudyPlan || ""} onChange={e => set("postStudyPlan")(e.target.value)} rows={3} placeholder="Explain your intended career path and ties/plans after completing the course..." />
                      </div>
                    </div>
                  </div>
                );
              }

              if (workVisa) {
                const workLanguageRule = getWorkLanguageRequirement(form.destinationCountry || "");
                const workLanguageOptions = getWorkLanguageOptions(form);
                const showWorkLanguageScores = shouldShowWorkLanguageScores(form.workEnglishTestStatus);

                return (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                      <div className="flex gap-3">
                        <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Work visa employment profile</p>
                          <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
                            Immigration officers check if the role is genuine, your experience matches the job, the salary is realistic, and the employer can sponsor you.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Current Job Title *</Label>
                        <Input value={form.currentJobTitle || form.jobTitle || ""} onChange={e => set("currentJobTitle")(e.target.value)} placeholder="e.g. Senior Accountant" />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Current Employer / Company</Label>
                        <Input value={form.currentEmployerName || form.companyName || ""} onChange={e => set("currentEmployerName")(e.target.value)} placeholder="e.g. ABC Technologies Pvt Ltd" />
                      </div>
                      <Sel
                        label="Profession / Occupation Sector *"
                        val={form.occupationSector || ""}
                        onChange={val => {
                          set("occupationSector")(val);
                          if (!/health|nursing|medical|doctor|dentist|pharmacist|caregiver|regulated/i.test(val)) {
                            set("oetOverallGrade")("");
                            set("oetListeningGrade")("");
                            set("oetReadingGrade")("");
                            set("oetWritingGrade")("");
                            set("oetSpeakingGrade")("");
                          }
                        }}
                        opts={[
                          "Healthcare / Nursing",
                          "Doctor / Medical Practitioner",
                          "Dentist / Pharmacist / Allied Health",
                          "Caregiver / Aged Care",
                          "IT / Software",
                          "Engineering",
                          "Finance / Accounting",
                          "Hospitality / Tourism",
                          "Construction / Skilled Trades",
                          "Education / Teaching",
                          "Management / Executive",
                          "Other Regulated Profession",
                          "Other",
                        ]}
                      />
                      <Sel
                        label="Professional Registration / License Status"
                        val={form.professionalRegistrationStatus || ""}
                        onChange={set("professionalRegistrationStatus")}
                        opts={["Not applicable","Registered in home country","Applied in destination country","Destination registration approved","Registration not started","Not sure"]}
                      />
                      <Sel label="Total Work Experience *" val={form.totalWorkExperience || ""} onChange={set("totalWorkExperience")} opts={["Less than 1 year","1–2 years","2–5 years","5–10 years","10+ years"]} />
                      <Sel label="Relevant Experience for Offered Role" val={form.relevantWorkExperience || ""} onChange={set("relevantWorkExperience")} opts={["Less than 1 year","1–2 years","2–5 years","5–10 years","10+ years"]} />
                      <Sel label="Current Monthly Salary (USD)" val={form.currentSalary || ""} onChange={set("currentSalary")} opts={["Less than $500","$500 – $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","More than $10,000"]} />
                      <DocToggle label="Formal job offer letter received? *" val={form.hasJobOffer || ""} onChange={set("hasJobOffer")} />
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Hiring Company Name *</Label>
                        <Input value={form.hiringCompanyName || ""} onChange={e => set("hiringCompanyName")(e.target.value)} placeholder="e.g. TechCorp Ltd" />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Offered Job Title *</Label>
                        <Input value={form.offeredJobTitle || ""} onChange={e => set("offeredJobTitle")(e.target.value)} placeholder="e.g. Software Engineer" />
                      </div>
                      <Sel label="Offered Monthly Salary (USD) *" val={form.offeredSalary || ""} onChange={set("offeredSalary")} opts={["Less than $1,000","$1,000 – $2,500","$2,500 – $5,000","$5,000 – $10,000","$10,000 – $20,000","More than $20,000"]} />
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Employment Start Date</Label>
                        <Input type="date" value={form.employmentStartDate || ""} min={TOMORROW} onChange={e => set("employmentStartDate")(e.target.value)} />
                      </div>
                      <Sel label="Contract Duration" val={form.contractDuration || ""} onChange={set("contractDuration")} opts={["Less than 6 months","6–12 months","1–2 years","2–3 years","Permanent / open-ended"]} />
                      <Sel label="Job Skill Level" val={form.jobSkillLevel || ""} onChange={set("jobSkillLevel")} opts={["Entry level","Skilled / professional","Managerial","Specialist / shortage occupation","Executive"]} />
                      <Sel label="Role matches your education and experience?" val={form.jobMatchesExperience || ""} onChange={set("jobMatchesExperience")} opts={["Strong match","Partial match","Career change","Not sure"]} />
                      <Sel label="Employer license / sponsorship status" val={form.employerLicenseStatus || ""} onChange={set("employerLicenseStatus")} opts={["Licensed sponsor confirmed","Employer says license in process","Not confirmed","Not required for this route","Not sure"]} />
                      <Sel label="Who sponsors the work permit?" val={form.workPermitSponsor || ""} onChange={set("workPermitSponsor")} opts={["Employer","Recruitment agency","Self-sponsored","Government program","Not sure"]} />
                      <Sel label="How did you receive this offer?" val={form.recruitmentChannel || ""} onChange={set("recruitmentChannel")} opts={["Direct employer application","LinkedIn / job portal","Recruitment agency","Referral","Internal transfer","Other"]} />
                      <DocToggle label="Signed employment contract available?" val={form.hasSignedContract || ""} onChange={set("hasSignedContract")} />
                      <DocToggle label="Employer sponsorship letter available?" val={form.hasEmployerSponsorshipLetter || ""} onChange={set("hasEmployerSponsorshipLetter")} />
                      <DocToggle label="Qualification proof available?" val={form.hasQualificationProof || ""} onChange={set("hasQualificationProof")} />
                      <DocToggle label="Experience letters / references available?" val={form.hasExperienceLetters || ""} onChange={set("hasExperienceLetters")} />
                      <div className="sm:col-span-2 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                        <div className="flex gap-3">
                          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                              {form.destinationCountry || "Destination"} work language requirement
                            </p>
                            <p className="mt-1 text-xs leading-5 text-blue-700 dark:text-blue-300">
                              {workLanguageRule.requirement}
                            </p>
                            {!workLanguageRelevant && (
                              <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                Language test is optional for this profile unless your employer, licensing body, or job category asks for it.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {workLanguageRelevant && (
                        <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                            Language evidence likely matters for this profile
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-800 dark:text-amber-300">
                            {isHealthcareOrRegulatedProfession(form)
                              ? "Because this looks like healthcare, nursing, or another regulated profession, include IELTS/OET or destination registration evidence if available."
                              : `${form.destinationCountry || "This destination"} commonly checks English language evidence for many sponsored work routes.`}
                          </p>
                        </div>
                      )}
                      <Sel
                        label={workLanguageRelevant ? "English / OET Requirement Status *" : "English / OET Requirement Status"}
                        val={form.workEnglishTestStatus || ""}
                        onChange={val => {
                          set("workEnglishTestStatus")(val);
                          if (!shouldShowWorkLanguageScores(val)) {
                            set("workEnglishTestType")("");
                            set("workIeltsOverall")("");
                            set("workIeltsListening")("");
                            set("workIeltsReading")("");
                            set("workIeltsWriting")("");
                            set("workIeltsSpeaking")("");
                            set("workPteOverall")("");
                            set("workPteListening")("");
                            set("workPteReading")("");
                            set("workPteWriting")("");
                            set("workPteSpeaking")("");
                            set("workToeflTotal")("");
                            set("workToeflListening")("");
                            set("workToeflReading")("");
                            set("workToeflWriting")("");
                            set("workToeflSpeaking")("");
                            set("oetOverallGrade")("");
                            set("oetListeningGrade")("");
                            set("oetReadingGrade")("");
                            set("oetWritingGrade")("");
                            set("oetSpeakingGrade")("");
                          }
                        }}
                        opts={workLanguageRelevant
                          ? ["Score available","Booked / awaiting result","Planning to take","Not required / exempted","Not sure"]
                          : ["Not required / exempted","Score available","Booked / awaiting result","Planning to take","Not sure"]}
                      />
                      {showWorkLanguageScores && (
                        <Sel
                          label="Language Test Type *"
                          val={form.workEnglishTestType || ""}
                          onChange={val => {
                            set("workEnglishTestType")(val);
                            if (val !== "IELTS") {
                              set("workIeltsOverall")("");
                              set("workIeltsListening")("");
                              set("workIeltsReading")("");
                              set("workIeltsWriting")("");
                              set("workIeltsSpeaking")("");
                            }
                            if (val !== "PTE Academic") {
                              set("workPteOverall")("");
                              set("workPteListening")("");
                              set("workPteReading")("");
                              set("workPteWriting")("");
                              set("workPteSpeaking")("");
                            }
                            if (val !== "TOEFL") {
                              set("workToeflTotal")("");
                              set("workToeflListening")("");
                              set("workToeflReading")("");
                              set("workToeflWriting")("");
                              set("workToeflSpeaking")("");
                            }
                            if (val !== "OET") {
                              set("oetOverallGrade")("");
                              set("oetListeningGrade")("");
                              set("oetReadingGrade")("");
                              set("oetWritingGrade")("");
                              set("oetSpeakingGrade")("");
                            }
                          }}
                          opts={workLanguageOptions}
                        />
                      )}
                      {form.workEnglishTestType === "IELTS" && (
                        <>
                          <Sel label="IELTS Overall Band *" val={form.workIeltsOverall || ""} onChange={set("workIeltsOverall")} opts={IELTS_BANDS} />
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["workIeltsListening", "Listening"],
                              ["workIeltsReading", "Reading"],
                              ["workIeltsWriting", "Writing"],
                              ["workIeltsSpeaking", "Speaking"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Band *`} val={form[key] || ""} onChange={set(key)} opts={IELTS_BANDS} />
                            ))}
                          </div>
                        </>
                      )}
                      {form.workEnglishTestType === "TOEFL" && (
                        <>
                          <Sel label="TOEFL Total Score *" val={form.workToeflTotal || ""} onChange={set("workToeflTotal")} opts={TOEFL_TOTAL_BANDS} />
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["workToeflListening", "Listening"],
                              ["workToeflReading", "Reading"],
                              ["workToeflWriting", "Writing"],
                              ["workToeflSpeaking", "Speaking"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Score *`} val={form[key] || ""} onChange={set(key)} opts={TOEFL_SECTION_BANDS} />
                            ))}
                          </div>
                        </>
                      )}
                      {form.workEnglishTestType === "PTE Academic" && (
                        <>
                          <Sel label="PTE Overall Score *" val={form.workPteOverall || ""} onChange={set("workPteOverall")} opts={PTE_BANDS} />
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["workPteListening", "Listening"],
                              ["workPteReading", "Reading"],
                              ["workPteWriting", "Writing"],
                              ["workPteSpeaking", "Speaking"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Score *`} val={form[key] || ""} onChange={set(key)} opts={PTE_BANDS} />
                            ))}
                          </div>
                        </>
                      )}
                      {form.workEnglishTestType === "OET" && (
                        <>
                          <Sel label="OET Overall / Lowest Grade *" val={form.oetOverallGrade || ""} onChange={set("oetOverallGrade")} opts={OET_GRADES} />
                          <div>
                            <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">OET Test Date</Label>
                            <Input type="date" value={form.oetTestDate || ""} onChange={e => set("oetTestDate")(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                            {[
                              ["oetListeningGrade", "Listening"],
                              ["oetReadingGrade", "Reading"],
                              ["oetWritingGrade", "Writing"],
                              ["oetSpeakingGrade", "Speaking"],
                            ].map(([key, label]) => (
                              <Sel key={key} label={`${label} Grade *`} val={form[key] || ""} onChange={set(key)} opts={OET_GRADES} />
                            ))}
                          </div>
                        </>
                      )}
                      <DocToggle label="Language score report / exemption proof available?" val={form.hasLanguageScoreReport || ""} onChange={set("hasLanguageScoreReport")} />
                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Language / Registration Notes</Label>
                        <Input value={form.languageRequirementNotes || ""} onChange={e => set("languageRequirementNotes")(e.target.value)} placeholder="e.g. NMC CBT booked, OET B in all bands, IELTS waived by employer" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Role responsibilities and why employer needs you</Label>
                        <Textarea value={form.roleResponsibilities || ""} onChange={e => set("roleResponsibilities")(e.target.value)} rows={3} placeholder="Describe the offered role, responsibilities, required skills, and why you are suitable..." />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Reason for moving for this job</Label>
                        <Textarea value={form.careerReasonForMove || ""} onChange={e => set("careerReasonForMove")(e.target.value)} rows={3} placeholder="Explain career progression, salary change, employer fit, and long-term plan..." />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No extra wizard required for this visa type</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Continue to employment, finances, history, documents, and home ties. Those answers will still be used for your embassy-style risk analysis.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ===== STEP 4: Employment & Income ===== */}
            {step === 4 && (() => {
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

            {/* ===== STEP 5: Financial Depth ===== */}
            {step === 5 && (
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

            {/* ===== STEP 6: History & Current Visas ===== */}
            {step === 6 && (
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

            {/* ===== STEP 7: Documents ===== */}
            {step === 7 && (
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

            {/* ===== STEP 8: Home Ties & Extra ===== */}
            {step === 8 && (
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
            <div className="sticky bottom-0 z-20 -mx-5 -mb-5 mt-8 flex items-center justify-between gap-3 border-t bg-white/95 px-5 py-4 shadow-[0_-12px_32px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-slate-950/95 md:-mx-8 md:-mb-8 md:px-8">
              <Button variant="outline" onClick={prevStep} disabled={step === 1} className="gap-2 rounded-xl">
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              {step < STEPS.length ? (
                <div className="flex flex-col items-end gap-1">
                  <Button onClick={nextStep} className="gap-2 rounded-xl px-5" disabled={!canAdvance()} style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}>
                    Continue <ChevronRight className="w-4 h-4" />
                  </Button>
                  <span className="hidden text-[11px] text-muted-foreground sm:block">{draftLabel}</span>
                </div>
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
                  className="gap-2 rounded-xl px-6"
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
        </div>
      </div>
    </DashboardLayout>
  );
}
