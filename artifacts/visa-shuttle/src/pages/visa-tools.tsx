import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Download,
  FileText,
  Globe2,
  Loader2,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ToolType = "fake_visa" | "fake_employment_offer" | "fake_agency" | "fake_visa_scheme";

type VisaToolCheck = {
  id: string;
  toolType: ToolType;
  country: string | null;
  inputSummary: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  claudeResponseJson: any;
  createdAt: string;
};

const tools: Array<{
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

function riskColor(level?: string | null) {
  const normalized = String(level || "").toLowerCase();
  if (normalized.includes("critical")) return "bg-red-100 text-red-700 border-red-200";
  if (normalized.includes("high")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (normalized.includes("medium")) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

function stripDataPrefix(dataUrl: string) {
  return dataUrl.replace(/^data:[^;]+;base64,/, "");
}

export default function VisaToolsPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useB2cAuth();
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState(tools[0]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [manualText, setManualText] = useState("");
  const [file, setFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const [result, setResult] = useState<VisaToolCheck | null>(null);

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

  const analyzeMutation = useMutation({
    mutationFn: async () => {
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
      toast({ title: "Analysis complete", description: "Your Visa Tools report is ready." });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const selectedHistory = useMemo(() => result || history[0] || null, [history, result]);
  const output = selectedHistory?.claudeResponseJson || {};
  const ActiveIcon = activeTool.icon;

  function selectTool(tool: typeof tools[number]) {
    setActiveTool(tool);
    setFields({});
    setManualText("");
    setFile(null);
    setResult(null);
  }

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

  return (
    <DashboardLayout title="Visa Tools" subtitle="AI-assisted fraud-risk checks">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-[#4055FF]/10 via-white to-[#FF2060]/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-3 border-0 bg-[#4055FF] text-white">Signed-in users only</Badge>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Visa Tools</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Analyze visas, offer letters, agencies and visa schemes for possible fraud indicators. Results are risk-based and need official verification.
              </p>
            </div>
            <div className="rounded-xl border bg-white/80 p-3 text-sm text-slate-600">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-[#4055FF]/5 px-3 py-2">
                <span className="text-xs font-semibold text-slate-600">Credits remaining</span>
                <span className="text-sm font-black text-[#4055FF]">{credits?.remainingCredits ?? 0}</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                <span>This is AI-assisted analysis only, not legal or government verification.</span>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setLocation("/payment/visa-tools-credits")}>
                Buy additional credits
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => setLocation("/visa-tools/visa-check")}
            className="rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#4055FF] hover:shadow-lg"
            data-testid="card-visa-check-tool"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#4055FF] to-[#9033F5] text-white">
              <Globe2 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900">Visa Check</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Check destination entry requirements, visa type, passport validity and route conditions in a guided flow.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#4055FF]">
              Open Visa Check <ArrowRight className="h-3 w-3" />
            </span>
          </button>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const active = activeTool.type === tool.type;
            return (
              <button
                key={tool.type}
                onClick={() => selectTool(tool)}
                className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${active ? "border-[#4055FF] ring-4 ring-[#4055FF]/10" : ""}`}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900">{tool.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{tool.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#4055FF]">
                  Start Check <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            );
          })}
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
                  <p className="text-sm text-slate-500">Guided check form</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {activeTool.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type || "text"}
                      placeholder={field.placeholder}
                      value={fields[field.key] || ""}
                      onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1.5">
                <Label>{activeTool.textLabel}</Label>
                <Textarea
                  rows={6}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Paste the suspicious text, visible document wording, email content, WhatsApp message, QR/URL text, or any relevant details..."
                />
              </div>

              <div className="mt-4 rounded-xl border border-dashed bg-slate-50 p-4">
                <Label className="mb-2 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[#4055FF]" />
                  Upload PDF, JPG or PNG document
                </Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={onFileChange} />
                <p className="mt-2 text-xs text-slate-500">Max 8 MB. Virus/malware scan placeholder is logged server-side. Documents are not exposed publicly.</p>
                {file && <p className="mt-2 text-sm font-medium text-slate-700">{file.name}</p>}
              </div>

              <Button
                className="mt-5 gap-2 border-0 text-white hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}
                disabled={analyzeMutation.isPending || (credits?.remainingCredits ?? 0) < (credits?.creditsPerCheck ?? 100)}
                onClick={() => analyzeMutation.mutate()}
              >
                {analyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchCheck className="h-4 w-4" />}
                {analyzeMutation.isPending ? "Checking with AI..." : (credits?.remainingCredits ?? 0) < (credits?.creditsPerCheck ?? 100) ? "Buy credits to run check" : "Run Check"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Result</h3>
                  <p className="text-sm text-slate-500">Confidence score, red flags and next steps</p>
                </div>
                {selectedHistory && <Badge className={riskColor(selectedHistory.riskLevel)}>{selectedHistory.riskLevel || "Risk"}</Badge>}
              </div>

              {!selectedHistory ? (
                <div className="rounded-2xl border bg-slate-50 p-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#4055FF]" />
                  <p className="text-sm text-slate-500">Run a check to see the risk report here.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-5">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Risk score</p>
                        <p className="text-5xl font-black text-slate-900">{selectedHistory.riskScore ?? output.risk_score ?? 0}</p>
                      </div>
                      <div className="text-right text-sm text-slate-500">0 safe-ish<br />100 highest risk</div>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500" style={{ width: `${selectedHistory.riskScore ?? output.risk_score ?? 0}%` }} />
                    </div>
                  </div>

                  <section>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldAlert className="h-4 w-4 text-orange-500" /> Red flags</h4>
                    <div className="space-y-2">
                      {(output.red_flags || []).length ? output.red_flags.map((item: string) => (
                        <div key={item} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-800">{item}</div>
                      )) : <p className="text-sm text-slate-500">No major red flags returned by AI.</p>}
                    </div>
                  </section>

                  <section>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><BadgeCheck className="h-4 w-4 text-emerald-500" /> Positive indicators</h4>
                    <div className="space-y-2">
                      {(output.positive_indicators || []).map((item: string) => (
                        <div key={item} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{item}</div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border bg-slate-50 p-4">
                    <h4 className="mb-2 text-sm font-bold text-slate-900">Explanation</h4>
                    <p className="text-sm leading-6 text-slate-600">{output.explanation || output.summary}</p>
                  </section>

                  <section>
                    <h4 className="mb-2 text-sm font-bold text-slate-900">Recommended next steps</h4>
                    <div className="space-y-2">
                      {(output.recommended_next_steps || []).map((item: string) => (
                        <div key={item} className="flex gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-slate-700">
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#4055FF]" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    {output.disclaimer || "This is an AI-assisted risk analysis only. Please verify with official government or employer sources."}
                  </div>

                  <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                    <Download className="h-4 w-4" />
                    Download Report PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-lg font-black text-slate-900">Previous Visa Tools Checks</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {history.map((check) => (
                <button key={check.id} onClick={() => setResult(check)} className="rounded-xl border bg-white p-4 text-left transition hover:border-[#4055FF]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Badge variant="secondary">{tools.find((t) => t.type === check.toolType)?.title || check.toolType}</Badge>
                    <Badge className={riskColor(check.riskLevel)}>{check.riskLevel}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[#4055FF]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{check.inputSummary || "Visa Tools check"}</p>
                      <p className="text-xs text-slate-500">{new Date(check.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))}
              {!history.length && <p className="text-sm text-slate-500">No Visa Tools history yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
