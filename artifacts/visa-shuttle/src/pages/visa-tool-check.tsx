import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronsUpDown,
  Coins,
  Download,
  FileText,
  Loader2,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  stripDataPrefix,
  tools,
  visaToolDisplayScore,
  visaToolScoreColor,
  visaToolScoreHelp,
  visaToolScoreLabel,
  visaToolScoreTitle,
  type VisaToolCheck,
} from "@/pages/visa-tools";

type AgencySuggestion = {
  name: string;
  country?: string;
  state?: string;
  district?: string;
  status?: string;
  raId?: string;
  source?: string;
  sourceType?: "registered" | "grievance";
  grievances?: number | null;
};

const SCHOLARSHIP_COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "New Zealand",
  "Germany",
  "France",
  "Netherlands",
  "Ireland",
  "Sweden",
  "Finland",
  "Norway",
  "Denmark",
  "Italy",
  "Spain",
  "Japan",
  "South Korea",
  "Singapore",
  "Switzerland",
  "United Arab Emirates",
];

const SCHOLARSHIP_NATIONALITIES = [
  "India",
  "United Arab Emirates",
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "New Zealand",
  "Singapore",
  "South Korea",
  "Japan",
  "Sri Lanka",
  "Bangladesh",
  "Nepal",
  "Pakistan",
  "Philippines",
  "Indonesia",
  "Malaysia",
  "Thailand",
  "Vietnam",
  "China",
  "Nigeria",
  "Kenya",
  "South Africa",
  "Ghana",
  "Egypt",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
];

const VISA_TOOL_TYPE_ALIASES: Record<string, string> = {
  fakevisa: "fake_visa",
  "fake-visa": "fake_visa",
  fake_visa_detector: "fake_visa",
  "fake-visa-detector": "fake_visa",
  rejectionrecovery: "rejection_recovery",
  "rejection-recovery": "rejection_recovery",
  fakeemploymentoffer: "fake_employment_offer",
  "fake-employment-offer": "fake_employment_offer",
  fake_employment_detector: "fake_employment_offer",
  "fake-employment-detector": "fake_employment_offer",
  fakeagency: "fake_agency",
  "fake-agency": "fake_agency",
  fake_agency_detector: "fake_agency",
  "fake-agency-detector": "fake_agency",
  fakevisascheme: "fake_visa_scheme",
  "fake-visa-scheme": "fake_visa_scheme",
  "fake-visa-schemes": "fake_visa_scheme",
  scholarshipfinder: "scholarship_finder",
  "scholarship-finder": "scholarship_finder",
  scholorship_finder: "scholarship_finder",
  "scholorship-finder": "scholarship_finder",
};

function downloadVisaToolReportPdf(checkId: string) {
  const link = document.createElement("a");
  link.href = `/api/b2c/visa-tools/checks/${checkId}/pdf`;
  link.download = "";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function normalizeVisaToolType(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();
  const normalized = raw.replace(/\s+/g, "_");
  return VISA_TOOL_TYPE_ALIASES[normalized] || VISA_TOOL_TYPE_ALIASES[normalized.replace(/_/g, "-")] || normalized;
}

const SCHOLARSHIP_FIELD_OPTIONS = [
  "Computer Science / AI / Data Science",
  "Engineering",
  "Medicine / Healthcare",
  "Nursing",
  "Business / Management",
  "Finance / Accounting",
  "Law / Public Policy",
  "Education",
  "Hospitality / Tourism",
  "Architecture / Design",
  "Social Sciences",
  "Agriculture / Environment",
  "Arts / Media",
  "Pure Sciences",
];

const SCHOLARSHIP_PROFILE_OPTIONS = {
  degree: ["Bachelor's", "Master's", "PhD / Doctoral", "Diploma / Certificate", "Postgraduate Diploma"],
  currentEducation: ["Grade 12 / Higher Secondary", "Bachelor's completed", "Bachelor's final year", "Master's completed", "Master's final year", "Working professional", "Research scholar"],
  gpaBand: ["90%+ / GPA 3.8+", "80-89% / GPA 3.3-3.79", "70-79% / GPA 2.8-3.29", "60-69% / GPA 2.4-2.79", "Below 60% / GPA below 2.4"],
  englishTest: ["Not taken yet", "IELTS", "TOEFL", "PTE", "Duolingo", "Exempt / Medium of instruction"],
  testScoreBand: ["Excellent", "Strong", "Average", "Below requirement", "Awaiting result", "Not applicable"],
  budgetBand: ["Under USD 5,000/year", "USD 5,000-10,000/year", "USD 10,000-20,000/year", "USD 20,000-35,000/year", "Above USD 35,000/year"],
  fundingNeed: ["Full scholarship needed", "Major tuition waiver needed", "Partial scholarship enough", "Living-cost support needed", "Merit scholarship preferred", "Any funding support"],
  achievementLevel: ["International awards / publications", "National awards / strong portfolio", "University topper / leadership", "Good academic profile", "Limited achievements"],
  researchLevel: ["Published research", "Research assistant / thesis", "Capstone projects", "Industry projects", "No research yet"],
  workExperience: ["No experience", "Internships only", "1-2 years", "3-5 years", "5+ years"],
  intake: ["Fall 2026", "Spring 2027", "Fall 2027", "Rolling intake", "Not decided"],
  familyIncome: ["Low income / need-based profile", "Moderate income", "Stable family support", "High income", "Prefer not to say"],
  studyMode: ["Full-time on campus", "Part-time", "Online / hybrid", "Research program"],
  scholarshipPriority: ["Maximum funding", "Best-ranked university", "Fast admission", "Lower visa risk", "Work rights / PR pathway", "Country preference"],
};

const COUNTRY_SCHOLARSHIP_HINTS: Record<string, { programs: string[]; note: string }> = {
  "United States": {
    programs: ["Fulbright Foreign Student Program", "University assistantships", "Need-aware university grants", "STEM department funding"],
    note: "Strong fit for graduate assistantships, research funding and high-merit profiles.",
  },
  Canada: {
    programs: ["Vanier Canada Graduate Scholarships", "Ontario Graduate Scholarship", "University entrance awards", "Research assistantships"],
    note: "Best results usually need strong academics, supervisor fit or university-level awards.",
  },
  "United Kingdom": {
    programs: ["Chevening", "Commonwealth Scholarships", "GREAT Scholarships", "University fee waivers"],
    note: "Competitive national awards reward leadership, clear goals and strong academic evidence.",
  },
  Australia: {
    programs: ["Australia Awards", "Research Training Program", "Destination Australia", "University international scholarships"],
    note: "Research applicants and high-merit students often get the strongest funding options.",
  },
  Germany: {
    programs: ["DAAD scholarships", "Deutschlandstipendium", "Erasmus+", "Foundation scholarships"],
    note: "Low-tuition public universities plus DAAD can reduce total study cost substantially.",
  },
  France: {
    programs: ["Eiffel Excellence Scholarship", "Campus France programs", "Erasmus+", "Institution grants"],
    note: "Good for master's and engineering profiles with strong academic records.",
  },
  Netherlands: {
    programs: ["NL Scholarship", "Orange Tulip Scholarship", "Erasmus+", "University excellence scholarships"],
    note: "Partial funding is common; full funding is more selective.",
  },
  Ireland: {
    programs: ["Government of Ireland International Education Scholarships", "University global excellence awards", "Research scholarships"],
    note: "Good for strong academic profiles and industry-aligned programs.",
  },
  Japan: {
    programs: ["MEXT Scholarship", "JASSO scholarships", "University tuition waivers"],
    note: "MEXT is a high-value path but needs careful embassy/university route timing.",
  },
  "South Korea": {
    programs: ["Global Korea Scholarship", "University tuition waivers", "STEM lab funding"],
    note: "Good fit for strong academics, language readiness and research-oriented students.",
  },
  Singapore: {
    programs: ["University merit scholarships", "Research scholarships", "ASEAN scholarships"],
    note: "Highly competitive; strongest for excellent academics and STEM/research profiles.",
  },
};

function ScholarshipSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="bg-white dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ScholarshipFinderForm({
  fields,
  setFields,
  manualText,
  setManualText,
}: {
  fields: Record<string, string>;
  setFields: Dispatch<SetStateAction<Record<string, string>>>;
  manualText: string;
  setManualText: (value: string) => void;
}) {
  const update = (key: string, value: string) => setFields((prev) => ({ ...prev, [key]: value }));
  const selectedCountries = (fields.preferredCountries || "")
    .split(",")
    .map((country) => country.trim())
    .filter(Boolean);
  const firstCountry = selectedCountries[0];
  const countryHint = firstCountry ? COUNTRY_SCHOLARSHIP_HINTS[firstCountry] : null;
  const profileCompleteness = [
    "nationality",
    "targetDegree",
    "fieldOfStudy",
    "preferredCountries",
    "gpaBand",
    "englishTest",
    "budgetBand",
    "fundingNeed",
    "achievementLevel",
    "intake",
  ].filter((key) => fields[key]).length;
  const readinessPercent = Math.round((profileCompleteness / 10) * 100);

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#4055FF]/10 via-white to-emerald-50 p-4 dark:border-slate-800 dark:from-[#4055FF]/20 dark:via-slate-950 dark:to-emerald-950/20">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge className="mb-3 border-0 bg-emerald-600 text-white">Scholarship capacity finder</Badge>
            <h3 className="text-xl font-black text-slate-950 dark:text-white">Build a scholarship-ready student profile</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Choose the strongest academic, budget and destination details. Visa Shuttle will use these inputs to assess capacity and shortlist realistic global funding options.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Profile readiness</span>
              <span className="text-lg font-black text-[#4055FF] dark:text-blue-300">{readinessPercent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-[#4055FF] via-[#00B4D8] to-emerald-500" style={{ width: `${readinessPercent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              More dropdown fields completed means cleaner automated scholarship matching.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Student name</Label>
          <Input value={fields.studentName || ""} onChange={(event) => update("studentName", event.target.value)} placeholder="Student full name" />
        </div>
        <ScholarshipSelect label="Nationality" value={fields.nationality} placeholder="Select nationality" options={SCHOLARSHIP_NATIONALITIES} onChange={(value) => update("nationality", value)} />
        <ScholarshipSelect label="Current education level" value={fields.currentEducation} placeholder="Select current education" options={SCHOLARSHIP_PROFILE_OPTIONS.currentEducation} onChange={(value) => update("currentEducation", value)} />
        <ScholarshipSelect label="Target degree" value={fields.targetDegree} placeholder="Select target degree" options={SCHOLARSHIP_PROFILE_OPTIONS.degree} onChange={(value) => update("targetDegree", value)} />
        <ScholarshipSelect label="Field of study" value={fields.fieldOfStudy} placeholder="Select field" options={SCHOLARSHIP_FIELD_OPTIONS} onChange={(value) => update("fieldOfStudy", value)} />
        <ScholarshipSelect label="GPA / percentage band" value={fields.gpaBand} placeholder="Select academic band" options={SCHOLARSHIP_PROFILE_OPTIONS.gpaBand} onChange={(value) => update("gpaBand", value)} />
        <ScholarshipSelect label="English test" value={fields.englishTest} placeholder="Select test status" options={SCHOLARSHIP_PROFILE_OPTIONS.englishTest} onChange={(value) => update("englishTest", value)} />
        <ScholarshipSelect label="English score band" value={fields.testScoreBand} placeholder="Select score band" options={SCHOLARSHIP_PROFILE_OPTIONS.testScoreBand} onChange={(value) => update("testScoreBand", value)} />
        <ScholarshipSelect label="Annual study budget" value={fields.budgetBand} placeholder="Select budget" options={SCHOLARSHIP_PROFILE_OPTIONS.budgetBand} onChange={(value) => update("budgetBand", value)} />
        <ScholarshipSelect label="Funding requirement" value={fields.fundingNeed} placeholder="Select funding need" options={SCHOLARSHIP_PROFILE_OPTIONS.fundingNeed} onChange={(value) => update("fundingNeed", value)} />
        <ScholarshipSelect label="Achievement strength" value={fields.achievementLevel} placeholder="Select achievement level" options={SCHOLARSHIP_PROFILE_OPTIONS.achievementLevel} onChange={(value) => update("achievementLevel", value)} />
        <ScholarshipSelect label="Research / project strength" value={fields.researchLevel} placeholder="Select research level" options={SCHOLARSHIP_PROFILE_OPTIONS.researchLevel} onChange={(value) => update("researchLevel", value)} />
        <ScholarshipSelect label="Work experience" value={fields.workExperience} placeholder="Select experience" options={SCHOLARSHIP_PROFILE_OPTIONS.workExperience} onChange={(value) => update("workExperience", value)} />
        <ScholarshipSelect label="Target intake" value={fields.intake} placeholder="Select intake" options={SCHOLARSHIP_PROFILE_OPTIONS.intake} onChange={(value) => update("intake", value)} />
        <ScholarshipSelect label="Family income context" value={fields.familyIncome} placeholder="Select income context" options={SCHOLARSHIP_PROFILE_OPTIONS.familyIncome} onChange={(value) => update("familyIncome", value)} />
        <ScholarshipSelect label="Study mode" value={fields.studyMode} placeholder="Select study mode" options={SCHOLARSHIP_PROFILE_OPTIONS.studyMode} onChange={(value) => update("studyMode", value)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-[#4055FF]" />
          <h4 className="font-bold text-slate-950 dark:text-white">Destination preference</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SCHOLARSHIP_COUNTRIES.map((country) => {
            const selected = selectedCountries.includes(country);
            return (
              <button
                key={country}
                type="button"
                onClick={() => {
                  const next = selected
                    ? selectedCountries.filter((item) => item !== country)
                    : [...selectedCountries, country];
                  update("preferredCountries", next.join(", "));
                }}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                  selected
                    ? "border-[#4055FF] bg-[#4055FF] text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#4055FF] hover:text-[#4055FF] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
                )}
              >
                {country}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-3 flex items-center gap-2">
            <Coins className="h-4 w-4 text-emerald-600" />
            <h4 className="font-bold text-slate-950 dark:text-white">Automated scholarship hints</h4>
          </div>
          {countryHint ? (
            <div className="space-y-3">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{countryHint.note}</p>
              <div className="flex flex-wrap gap-2">
                {countryHint.programs.map((program) => (
                  <Badge key={program} variant="secondary" className="rounded-full">{program}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Select at least one destination country to see automated scholarship program hints.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#4055FF]" />
            <h4 className="font-bold text-slate-950 dark:text-white">Scholarship strategy inputs</h4>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ScholarshipSelect label="Priority" value={fields.scholarshipPriority} placeholder="Select priority" options={SCHOLARSHIP_PROFILE_OPTIONS.scholarshipPriority} onChange={(value) => update("scholarshipPriority", value)} />
            <div className="space-y-1.5">
              <Label>Target universities or course</Label>
              <Input value={fields.targetUniversities || ""} onChange={(event) => update("targetUniversities", event.target.value)} placeholder="Optional: universities, course names" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Additional notes for AI scholarship matching</Label>
        <Textarea
          rows={5}
          value={manualText}
          onChange={(event) => setManualText(event.target.value)}
          placeholder="Paste SOP summary, academic marks, extracurriculars, awards, research papers, portfolio links, financial limits, country preferences, or scholarship notes."
        />
      </div>

      <div className="rounded-2xl border border-[#4055FF]/20 bg-[#4055FF]/5 p-4 text-sm leading-6 text-slate-700 dark:border-[#4055FF]/35 dark:bg-[#4055FF]/10 dark:text-slate-200">
        <div className="mb-2 flex items-center gap-2 font-bold text-slate-950 dark:text-white">
          <Sparkles className="h-4 w-4 text-[#4055FF]" />
          What the AI will calculate
        </div>
        Student capacity score, scholarship fit level, recommended countries, potential funding matches, eligibility gaps, funding strategy and application timeline.
      </div>
    </div>
  );
}

function isActiveRaStatus(status?: string) {
  const value = (status || "").toLowerCase();
  if (!value) return false;
  if (/\b(expired|dormant|cancelled|canceled|suspended|de-activated|deactivated)\b/.test(value)) return false;
  return /\bactive\b/.test(value);
}

function AgencyNameDropdown({
  value,
  manualMode,
  suggestions,
  search,
  onSearchChange,
  onSelect,
  onManualMode,
  onListMode,
  onManualValueChange,
}: {
  value: string;
  manualMode: boolean;
  suggestions: AgencySuggestion[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (agency: AgencySuggestion) => void;
  onManualMode: () => void;
  onListMode: () => void;
  onManualValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = suggestions.find((agency) => agency.name === value);
  const selectedIsWarning = Boolean(selected && selected.sourceType === "registered" && !isActiveRaStatus(selected.status));

  if (manualMode) {
    return (
      <div className="space-y-2">
        <Input
          value={value}
          onChange={(event) => onManualValueChange(event.target.value)}
          placeholder="Enter agency name manually"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-xs font-semibold text-[#4055FF] hover:bg-transparent hover:text-[#2337E8]"
          onClick={() => { onListMode(); onManualValueChange(""); onSearchChange(""); }}
        >
          Search uploaded agency list again
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) onSearchChange(value || search); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between bg-background px-3 font-normal"
        >
          <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
            {value || "Select agency from uploaded list"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search agency name..."
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            <CommandEmpty>No agency found in uploaded lists.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none-of-the-above"
                onSelect={() => {
                  onManualMode();
                  setOpen(false);
                }}
                className="items-start border-b border-border/70 py-3"
              >
                <Check className="mt-0.5 h-4 w-4 opacity-0" />
                <div>
                  <p className="font-semibold">None of the above</p>
                  <p className="mt-1 text-xs text-muted-foreground">Enter agency name manually</p>
                </div>
              </CommandItem>
              {suggestions.map((agency) => (
                <CommandItem
                  key={`${agency.sourceType}-${agency.name}-${agency.raId || agency.state || ""}`}
                  value={agency.name}
                  onSelect={() => {
                    onSelect(agency);
                    setOpen(false);
                  }}
                  className="items-start py-3"
                >
                  <Check className={cn("mt-0.5 h-4 w-4", value === agency.name ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{agency.name}</span>
                      {agency.raId && <Badge variant="outline" className="text-[10px]">{agency.raId}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[agency.source, agency.status, agency.country, agency.state, agency.district].filter(Boolean).join(" · ")}
                      {agency.grievances ? ` · ${agency.grievances} grievance${agency.grievances === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-1 h-auto px-0 text-xs font-semibold text-[#4055FF] hover:bg-transparent hover:text-[#2337E8]"
        onClick={onManualMode}
      >
        None of the above? Add manually
      </Button>
      {selected && (
        <p className={cn(
          "mt-1.5 text-xs",
          selected.sourceType === "grievance" || selectedIsWarning ? "text-red-600 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300",
        )}>
          {selected.sourceType === "grievance"
            ? `Selected from grievance list${selected.grievances ? ` · ${selected.grievances} grievance${selected.grievances === 1 ? "" : "s"}` : ""}.`
            : selectedIsWarning
              ? `Selected from MEA/eMigrate RA registry${selected.raId ? ` · ${selected.raId}` : ""} · warning: ${selected.status || "not active"}.`
              : `Selected from MEA/eMigrate RA registry${selected.raId ? ` · ${selected.raId}` : ""}.`}
        </p>
      )}
    </Popover>
  );
}

function ResultPanel({ check }: { check: VisaToolCheck | null }) {
  const output = check?.claudeResponseJson || {};
  const displayScore = check ? visaToolDisplayScore(check) : 0;

  return (
    <Card className="border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Result</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Confidence score, red flags and next steps</p>
          </div>
          {check && (
            <Badge className={visaToolScoreColor(check.toolType, displayScore)}>
              {visaToolScoreLabel(check.toolType, displayScore)}
            </Badge>
          )}
        </div>

        {!check ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-950/50">
            <SearchCheck className="mx-auto mb-3 h-8 w-8 text-[#4055FF]" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Run this check to see the saved risk report here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-800 dark:from-slate-950/80 dark:to-slate-900">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {visaToolScoreTitle(check.toolType)}
                  </p>
                  <p className="text-5xl font-black text-slate-950 dark:text-white">
                    {displayScore}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                  {visaToolScoreHelp(check.toolType)}<br />
                  80+ is a positive signal
                </div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4055FF] via-[#00B4D8] to-emerald-500"
                  style={{ width: `${displayScore}%` }}
                />
              </div>
            </div>

            {check.toolType === "scholarship_finder" && (
              <section className="rounded-xl border border-[#4055FF]/20 bg-[#4055FF]/5 p-4 dark:border-[#4055FF]/30 dark:bg-[#4055FF]/10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-950 dark:text-white">Student scholarship capacity</h4>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{output.scholarship_fit_level || "AI-assisted capacity assessment"}</p>
                  </div>
                  <Badge className="border-0 bg-[#4055FF] text-white">{output.student_capacity_score ?? displayScore}% capacity</Badge>
                </div>
                {(output.recommended_countries || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(output.recommended_countries || []).map((country: string) => (
                      <Badge key={country} variant="outline">{country}</Badge>
                    ))}
                  </div>
                )}
              </section>
            )}

            {check.toolType === "scholarship_finder" && (output.scholarship_matches || []).length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Scholarship availability matches</h4>
                <div className="grid gap-3">
                  {(output.scholarship_matches || []).map((item: any, index: number) => (
                    <div key={`${item.scholarship_name || item.country || index}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950 dark:text-white">{item.scholarship_name || "Scholarship opportunity"}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{[item.country, item.provider, item.funding_type].filter(Boolean).join(" · ")}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">{item.fit_score ?? "Fit"}%</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.eligibility_notes || item.estimated_coverage || "Review official eligibility criteria before applying."}</p>
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                        <span>Coverage: {item.estimated_coverage || "Varies"}</span>
                        <span>Deadline: {item.deadline_guidance || "Check official page"}</span>
                        <span className="sm:col-span-2">Search: {item.official_search_terms || "official scholarship page"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {check.toolType === "scholarship_finder" && (output.eligibility_gaps || []).length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Eligibility gaps to improve</h4>
                <div className="space-y-2">
                  {(output.eligibility_gaps || []).map((item: string) => (
                    <div key={item} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">{item}</div>
                  ))}
                </div>
              </section>
            )}

            {check.toolType === "scholarship_finder" && (output.funding_strategy || []).length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Funding strategy</h4>
                <div className="space-y-2">
                  {(output.funding_strategy || []).map((item: string) => (
                    <div key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#4055FF]" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {check.toolType === "scholarship_finder" && (output.application_timeline || []).length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Application timeline</h4>
                <div className="space-y-2">
                  {(output.application_timeline || []).map((item: string) => (
                    <div key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#4055FF]" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {output.official_registry_check && (
              <section className={`rounded-xl border p-4 ${
                output.official_registry_check.matched && output.official_registry_check.is_active
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/70 dark:bg-emerald-950/30"
                  : output.official_registry_check.matched
                    ? "border-red-200 bg-red-50 dark:border-red-800/70 dark:bg-red-950/30"
                    : "border-amber-200 bg-amber-50 dark:border-amber-800/70 dark:bg-amber-950/30"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">MEA/eMigrate Reputed RA Registry</h4>
                  <Badge className={output.official_registry_check.matched && output.official_registry_check.is_active
                    ? "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
                    : output.official_registry_check.matched
                      ? "border-0 bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200"
                      : "border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"
                  }>
                    {output.official_registry_check.status || "Not found"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {output.official_registry_check.matched
                    ? `${output.official_registry_check.agency_name || "Agency"} ${output.official_registry_check.raid ? `(${output.official_registry_check.raid})` : ""} is listed in the MEA/eMigrate reputed Recruiting Agents report with status: ${output.official_registry_check.status || "Not listed"}.`
                    : output.official_registry_check.note}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Source updated as on {output.official_registry_check.updated_as_on}. This confirms a registry signal only; verify the exact offer, contact person, payment request, and official government records before proceeding.
                </p>
              </section>
            )}

            {output.unregistered_agency_grievance_check && (
              <section className={`rounded-xl border p-4 ${
                output.unregistered_agency_grievance_check.matched
                  ? "border-red-200 bg-red-50 dark:border-red-800/70 dark:bg-red-950/35"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">Unregistered Agency Grievance List</h4>
                  <Badge className={output.unregistered_agency_grievance_check.matched
                    ? "border-0 bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200"
                    : "border-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }>
                    {output.unregistered_agency_grievance_check.status || "Not found"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {output.unregistered_agency_grievance_check.matched
                    ? `${output.unregistered_agency_grievance_check.agency_name || "Agency"} appears in the grievance list for unregistered agencies${output.unregistered_agency_grievance_check.grievance_count ? ` with ${output.unregistered_agency_grievance_check.grievance_count} grievance${output.unregistered_agency_grievance_check.grievance_count === 1 ? "" : "s"}` : ""}.`
                    : output.unregistered_agency_grievance_check.note}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Source updated as on {output.unregistered_agency_grievance_check.updated_as_on}. This is a serious risk signal when matched; verify through official MEA/eMigrate channels before any payment.
                </p>
              </section>
            )}

            <section>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white"><ShieldAlert className="h-4 w-4 text-orange-500" /> Red flags</h4>
              <div className="space-y-2">
                {(output.red_flags || []).length ? output.red_flags.map((item: string) => (
                  <div key={item} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-800/70 dark:bg-orange-950/40 dark:text-orange-200">{item}</div>
                )) : <p className="text-sm text-slate-500 dark:text-slate-400">No major red flags returned by AI.</p>}
              </div>
            </section>

            {(output.real_refusal_reasons || []).length > 0 && (
              <section>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white"><FileText className="h-4 w-4 text-[#4055FF]" /> Likely refusal reasons</h4>
                <div className="space-y-2">
                  {(output.real_refusal_reasons || []).map((item: string) => (
                    <div key={item} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200">{item}</div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white"><BadgeCheck className="h-4 w-4 text-emerald-500" /> Positive indicators</h4>
              <div className="space-y-2">
                {(output.positive_indicators || []).map((item: string) => (
                  <div key={item} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200">{item}</div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
              <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Explanation</h4>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{output.explanation || output.summary}</p>
            </section>

            {(output.wait_time_guidance || output.reapplication_strategy?.length) && (
              <section className="rounded-xl border border-[#4055FF]/20 bg-[#4055FF]/5 p-4 dark:border-[#4055FF]/30 dark:bg-[#4055FF]/10">
                <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Reapplication strategy</h4>
                {output.wait_time_guidance && (
                  <p className="mb-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{output.wait_time_guidance}</p>
                )}
                <div className="space-y-2">
                  {(output.reapplication_strategy || []).map((item: string) => (
                    <div key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#4055FF]" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Recommended next steps</h4>
              <div className="space-y-2">
                {(output.recommended_next_steps || []).map((item: string) => (
                  <div key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#4055FF]" />
                    {item}
                  </div>
                ))}
              </div>
            </section>

            {(output.documents_to_fix || []).length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-slate-950 dark:text-white">Documents to fix</h4>
                <div className="space-y-2">
                  {(output.documents_to_fix || []).map((item: string) => (
                    <div key={item} className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#4055FF]" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200">
              {output.disclaimer || "This is an AI-assisted risk analysis only. Please verify with official government or employer sources."}
            </div>

            <Button variant="outline" className="gap-2 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => downloadVisaToolReportPdf(check.id)}>
              <Download className="h-4 w-4" />
              Download Report PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VisaToolCheckPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ toolType: string }>("/visa-tools/:toolType");
  const { user, isLoading } = useB2cAuth();
  const { toast } = useToast();
  const normalizedToolType = normalizeVisaToolType(params?.toolType);
  const activeTool = tools.find((tool) => tool.type === normalizedToolType);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [agencySearch, setAgencySearch] = useState("");
  const [agencyManualMode, setAgencyManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const [file, setFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const [result, setResult] = useState<VisaToolCheck | null>(null);
  const { data: agencySuggestions = [] } = useQuery<AgencySuggestion[]>({
    queryKey: ["/api/b2c/visa-tools/agency-name-suggestions", agencySearch],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/b2c/visa-tools/agency-name-suggestions?q=${encodeURIComponent(agencySearch)}`);
      return res.json();
    },
    enabled: activeTool?.type === "fake_agency",
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/sign-in?next=${encodeURIComponent(window.location.pathname)}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`);
    }
  }, [isLoading, user, setLocation]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!activeTool) throw new Error("Invalid Visa Tools check type");
      const res = await apiRequest("POST", "/api/b2c/visa-tools/analyze", {
        toolType: activeTool.type,
        fields,
        manualText,
        file,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data.check);
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/visa-tools/checks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/b2c/visa-tools/credits"] });
      toast({ title: "Analysis complete", description: "Your Visa Tools report has been saved to history." });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(selected.type)) {
      toast({ title: "Unsupported file", description: "Upload PDF, JPG or PNG only.", variant: "destructive" });
      return;
    }
    if (selected.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum upload size is 8 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFile({
      name: selected.name,
      type: selected.type,
      size: selected.size,
      base64: stripDataPrefix(String(reader.result || "")),
    });
    reader.readAsDataURL(selected);
  }

  if (isLoading || !user) {
    return (
      <DashboardLayout title="Visa Tools" subtitle="Secure fraud-risk analysis">
        <div className="flex min-h-[55vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4055FF]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!activeTool) {
    return (
      <DashboardLayout title="Visa Tools" subtitle="Tool not found">
        <Card className="max-w-xl border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
            <h2 className="text-lg font-black text-slate-900">Tool not found</h2>
            <p className="mt-2 text-sm text-slate-500">Please select a valid Visa Tools module.</p>
            <Button className="mt-5" onClick={() => setLocation("/visa-tools")}>Back to Visa Tools</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const ActiveIcon = activeTool.icon;

  return (
    <DashboardLayout title={activeTool.title} subtitle="Visa Tools guided AI risk check">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/visa-tools")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Visa Tools
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/visa-tools/history")}>View check history</Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${activeTool.gradient} text-white`}>
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{activeTool.title}</h3>
                  <p className="text-sm text-slate-500">{activeTool.description}</p>
                </div>
              </div>

              {activeTool.type === "scholarship_finder" ? (
                <ScholarshipFinderForm
                  fields={fields}
                  setFields={setFields}
                  manualText={manualText}
                  setManualText={setManualText}
                />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeTool.fields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label>{field.label}</Label>
                        {activeTool.type === "fake_agency" && field.key === "agencyName" ? (
                          <AgencyNameDropdown
                            value={fields.agencyName || ""}
                            manualMode={agencyManualMode}
                            suggestions={agencySuggestions}
                            search={agencySearch}
                            onSearchChange={setAgencySearch}
                            onManualMode={() => {
                              setAgencyManualMode(true);
                              setFields((prev) => ({ ...prev, agencyName: agencySearch || prev.agencyName || "" }));
                            }}
                            onListMode={() => setAgencyManualMode(false)}
                            onManualValueChange={(value) => setFields((prev) => ({ ...prev, agencyName: value }))}
                            onSelect={(agency) => setFields((prev) => ({
                              ...prev,
                              agencyName: agency.name,
                              raId: agency.raId || prev.raId || "",
                              country: agency.country || "India",
                              city: agency.district || agency.state || prev.city || "",
                            }))}
                          />
                        ) : (
                          <Input
                            type={field.type || "text"}
                            placeholder={field.placeholder}
                            value={fields[field.key] || ""}
                            onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {activeTool.type === "fake_agency" && agencySuggestions.length > 0 && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800/70 dark:bg-red-950/35 dark:text-red-200">
                      Agency dropdown is powered by the uploaded MEA/eMigrate registered/reputed Recruiting Agents report and the “Unregistered Agencies against which Grievances Received” list. Selecting one includes registry status, city/state, and grievance status in the AI check.
                    </div>
                  )}

                  <div className="mt-4 space-y-1.5">
                    <Label>{activeTool.textLabel}</Label>
                    <Textarea
                      rows={6}
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Paste the suspicious text, visible document wording, email content, WhatsApp message, QR/URL text, or any relevant details..."
                    />
                  </div>
                </>
              )}

              <div className="mt-4 rounded-xl border border-dashed bg-slate-50 p-4">
                <Label className="mb-2 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#4055FF]" />
                  Upload PDF, JPG or PNG document
                </Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={onFileChange} />
                <p className="mt-2 text-xs text-slate-500">Max 8 MB. Virus/malware scan placeholder is logged server-side. Documents are not exposed publicly.</p>
                {file && <p className="mt-2 text-sm font-medium text-slate-700">{file.name}</p>}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>This is AI-assisted analysis only. It must not be treated as legal, employer, agency, or government verification.</span>
              </div>

              <Button
                className="mt-5 gap-2 border-0 text-white hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}
                disabled={analyzeMutation.isPending}
                onClick={() => analyzeMutation.mutate()}
              >
                {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                {analyzeMutation.isPending ? "Checking with AI..." : "Run Check"}
              </Button>
            </CardContent>
          </Card>

          <ResultPanel check={result} />
        </div>
      </div>
    </DashboardLayout>
  );
}
