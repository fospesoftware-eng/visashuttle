import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  FileText,
  Globe2,
  Loader2,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ToolType = "fake_visa" | "fake_employment_offer" | "fake_agency" | "fake_visa_scheme";

export type VisaToolType = ToolType;

export type VisaToolCheck = {
  id: string;
  toolType: ToolType;
  country: string | null;
  inputSummary: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  claudeResponseJson: any;
  createdAt: string;
};

export const tools: Array<{
  type: ToolType;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  fields: Array<{ key: string; label: string; placeholder?: string; type?: string }>;
  textLabel: string;
}> = [
  {
    type: "fake_visa",
    title: "Fake Visa Detector",
    description: "Check visa copies or visa details for formatting, category, seal, QR and validity risk signals.",
    icon: ShieldCheck,
    gradient: "from-[#4055FF] to-[#00B4D8]",
    textLabel: "Paste visa details, QR text, URL text, stamp text or visible notes",
    fields: [
      { key: "destinationCountry", label: "Destination country", placeholder: "Canada" },
      { key: "visaType", label: "Visa type", placeholder: "Visitor visa" },
      { key: "passportNumber", label: "Passport number optional", placeholder: "Optional" },
      { key: "visaNumber", label: "Visa number optional", placeholder: "Optional" },
      { key: "issuingAuthority", label: "Issuing authority", placeholder: "Embassy / consulate / immigration office" },
      { key: "dateOfIssue", label: "Date of issue", type: "date" },
      { key: "dateOfExpiry", label: "Date of expiry", type: "date" },
    ],
  },
  {
    type: "fake_employment_offer",
    title: "Fake Employment Offer Letter Detector",
    description: "Review offer letters for salary realism, company details, recruiter claims and payment demands.",
    icon: BriefcaseBusiness,
    gradient: "from-[#9033F5] to-[#FF2060]",
    textLabel: "Paste offer letter text, email content, recruiter message or salary details",
    fields: [
      { key: "country", label: "Country", placeholder: "United Kingdom" },
      { key: "companyName", label: "Company name", placeholder: "Company Ltd" },
      { key: "jobTitle", label: "Job title", placeholder: "Care assistant" },
      { key: "salaryOffered", label: "Salary offered", placeholder: "GBP 32,000 per year" },
      { key: "recruiterName", label: "Recruiter / agency name", placeholder: "Recruiter or agency" },
    ],
  },
  {
    type: "fake_agency",
    title: "Fake Agency Detector",
    description: "Analyze agency claims, website, contact details, domain patterns and trust indicators.",
    icon: Building2,
    gradient: "from-[#00B4D8] to-[#4055FF]",
    textLabel: "Paste brochure, agreement, ad copy, claims or conversation text",
    fields: [
      { key: "agencyName", label: "Agency name", placeholder: "Agency name" },
      { key: "website", label: "Website", placeholder: "https://example.com" },
      { key: "phone", label: "Phone number", placeholder: "+91..." },
      { key: "email", label: "Email", placeholder: "contact@example.com" },
      { key: "countryCity", label: "Country / city", placeholder: "India, Bangalore" },
      { key: "socialLinks", label: "Social media links", placeholder: "Instagram, Facebook, LinkedIn" },
    ],
  },
  {
    type: "fake_visa_scheme",
    title: "Fake Visa Schemes",
    description: "Check agent messages, WhatsApp screenshots or brochures for guaranteed approval and scam pressure signals.",
    icon: ShieldAlert,
    gradient: "from-[#FF2060] to-[#FFB800]",
    textLabel: "Paste agent message, WhatsApp text, scheme copy or payment instructions",
    fields: [
      { key: "country", label: "Country", placeholder: "Australia" },
      { key: "schemeTitle", label: "Scheme title / name", placeholder: "Guaranteed work visa package" },
      { key: "feesRequested", label: "Fees requested", placeholder: "INR 2,50,000 advance" },
      { key: "processingTime", label: "Promised processing time", placeholder: "7 days" },
    ],
  },
];

export function riskColor(level?: string | null) {
  const normalized = String(level || "").toLowerCase();
  if (normalized.includes("critical")) return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/45 dark:text-red-200 dark:border-red-800/70";
  if (normalized.includes("high")) return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/45 dark:text-orange-200 dark:border-orange-800/70";
  if (normalized.includes("medium")) return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/45 dark:text-amber-200 dark:border-amber-800/70";
  return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/45 dark:text-emerald-200 dark:border-emerald-800/70";
}

export function stripDataPrefix(dataUrl: string) {
  return dataUrl.replace(/^data:[^;]+;base64,/, "");
}

export default function VisaToolsPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useB2cAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/sign-in?next=${encodeURIComponent("/visa-tools")}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`);
    }
  }, [isLoading, user, setLocation]);

  const { data: history = [] } = useQuery<VisaToolCheck[]>({
    queryKey: ["/api/b2c/visa-tools/checks"],
    enabled: !!user,
  });
  const { data: credits } = useQuery<{ remainingCredits: number; creditsPerCheck: number; usedCredits: number; purchasedCredits: number; includedCredits: number }>({
    queryKey: ["/api/b2c/visa-tools/credits"],
    enabled: !!user,
  });

  if (isLoading || !user) {
    return (
      <DashboardLayout title="Visa Tools" subtitle="Secure fraud-risk analysis">
        <div className="flex min-h-[55vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4055FF]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Visa Tools" subtitle="AI-assisted fraud-risk checks">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-[#4055FF]/10 via-white to-[#FF2060]/10 p-5 shadow-sm dark:border-slate-800 dark:from-[#4055FF]/20 dark:via-slate-950 dark:to-[#FF2060]/15">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#4055FF]/10 blur-3xl dark:bg-[#4055FF]/20" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-[#FF2060]/10 blur-3xl dark:bg-[#FF2060]/15" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-3 border-0 bg-[#4055FF] text-white">Signed-in users only</Badge>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Visa Tools</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Analyze visas, offer letters, agencies and visa schemes for possible fraud indicators. Results are risk-based and need official verification.
              </p>
            </div>
            <div className="rounded-xl border border-white/70 bg-white/85 p-3 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-[#4055FF]/5 px-3 py-2 dark:bg-[#4055FF]/15">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Credits remaining</span>
                <span className="text-sm font-black text-[#4055FF] dark:text-blue-300">{credits?.remainingCredits ?? 0}</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                <span>This is AI-assisted analysis only, not legal or government verification.</span>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => setLocation("/payment/visa-tools-credits")}>
                Buy additional credits
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setLocation("/visa-tools/visa-check")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#4055FF] hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-[#4055FF]"
            data-testid="card-visa-check-tool"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4055FF] to-[#9033F5] text-white">
              <Globe2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-950 dark:text-white">Visa Check</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Check destination entry requirements, visa type, passport validity and route conditions in a guided flow.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#4055FF] dark:text-blue-300">
              Open Visa Check <ArrowRight className="h-3 w-3" />
            </span>
          </button>
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.type}
                onClick={() => setLocation(`/visa-tools/${tool.type}`)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#4055FF] hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-[#4055FF]"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-950 dark:text-white">{tool.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{tool.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#4055FF] dark:text-blue-300">
                  Start Check <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>

        <Card className="border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-950 dark:text-white">Previous Visa Tools Checks</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Every completed scan is saved under your account.</p>
              </div>
              <Button variant="outline" size="sm" className="dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => setLocation("/visa-tools/history")}>Open full history</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {history.map((check) => (
                <button key={check.id} onClick={() => setLocation(`/visa-tools/history/${check.id}`)} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#4055FF] dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-[#4055FF]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge variant="secondary">{tools.find((t) => t.type === check.toolType)?.title || check.toolType}</Badge>
                    <Badge className={riskColor(check.riskLevel)}>{check.riskLevel}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#4055FF]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{check.inputSummary || "Visa Tools check"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(check.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
              {!history.length && <p className="text-sm text-slate-500 dark:text-slate-400">No Visa Tools history yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
