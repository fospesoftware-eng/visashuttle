import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Download,
  FileText,
  Loader2,
  SearchCheck,
  ShieldAlert,
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
import { riskColor, stripDataPrefix, tools, type VisaToolCheck } from "@/pages/visa-tools";

function ResultPanel({ check }: { check: VisaToolCheck | null }) {
  const output = check?.claudeResponseJson || {};

  return (
    <Card className="border border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Result</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Confidence score, red flags and next steps</p>
          </div>
          {check && <Badge className={riskColor(check.riskLevel)}>{check.riskLevel || "Risk"}</Badge>}
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">Risk score</p>
                  <p className="text-5xl font-black text-slate-950 dark:text-white">{check.riskScore ?? output.risk_score ?? 0}</p>
                </div>
                <div className="text-right text-sm text-slate-500 dark:text-slate-400">0 lower risk<br />100 highest risk</div>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500" style={{ width: `${check.riskScore ?? output.risk_score ?? 0}%` }} />
              </div>
            </div>

            {output.official_registry_check && (
              <section className={`rounded-xl border p-4 ${
                output.official_registry_check.matched && output.official_registry_check.is_active
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/70 dark:bg-emerald-950/30"
                  : "border-amber-200 bg-amber-50 dark:border-amber-800/70 dark:bg-amber-950/30"
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">MEA/eMigrate RA Registry</h4>
                  <Badge className={output.official_registry_check.matched && output.official_registry_check.is_active
                    ? "border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"
                    : "border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200"
                  }>
                    {output.official_registry_check.status || "Not found"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {output.official_registry_check.matched
                    ? `${output.official_registry_check.agency_name || "Agency"} ${output.official_registry_check.raid ? `(${output.official_registry_check.raid})` : ""} is listed in the MEA/eMigrate Recruiting Agents report.`
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

            <Button variant="outline" className="gap-2 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100 dark:hover:bg-slate-800" onClick={() => window.print()}>
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
  const activeTool = tools.find((tool) => tool.type === params?.toolType);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [manualText, setManualText] = useState("");
  const [file, setFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);
  const [result, setResult] = useState<VisaToolCheck | null>(null);
  const agencyNameQuery = fields.agencyName || "";
  const { data: agencySuggestions = [] } = useQuery<Array<{ name: string; state: string; grievances: number | null }>>({
    queryKey: ["/api/b2c/visa-tools/agency-name-suggestions", agencyNameQuery],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/b2c/visa-tools/agency-name-suggestions?q=${encodeURIComponent(agencyNameQuery)}`);
      return res.json();
    },
    enabled: activeTool?.type === "fake_agency" && agencyNameQuery.trim().length >= 2,
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

              <div className="grid gap-4 md:grid-cols-2">
                {activeTool.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type || "text"}
                      placeholder={field.placeholder}
                      value={fields[field.key] || ""}
                      onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      list={activeTool.type === "fake_agency" && field.key === "agencyName" ? "unregistered-agency-suggestions" : undefined}
                    />
                    {activeTool.type === "fake_agency" && field.key === "agencyName" && (
                      <datalist id="unregistered-agency-suggestions">
                        {agencySuggestions.map((agency) => (
                          <option key={`${agency.name}-${agency.state}-${agency.grievances ?? ""}`} value={agency.name}>
                            {agency.state}{agency.grievances ? ` - ${agency.grievances} grievance${agency.grievances === 1 ? "" : "s"}` : ""}
                          </option>
                        ))}
                      </datalist>
                    )}
                  </div>
                ))}
              </div>

              {activeTool.type === "fake_agency" && agencySuggestions.length > 0 && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800/70 dark:bg-red-950/35 dark:text-red-200">
                  Agency name suggestions include entries from the “Unregistered Agencies against which Grievances Received” list. Selecting one will include that status in the AI check.
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
