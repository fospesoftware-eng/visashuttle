import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BadgeCheck, Clock, Download, FileText, Loader2, SearchCheck, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { riskColor, tools, type VisaToolCheck } from "@/pages/visa-tools";

function ToolReport({ check }: { check: VisaToolCheck }) {
  const output = check.claudeResponseJson || {};

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <Badge className={riskColor(check.riskLevel)}>{check.riskLevel || "Risk"}</Badge>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">{tools.find((tool) => tool.type === check.toolType)?.title || check.toolType}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{check.inputSummary || "Visa Tools check"}</p>
          <div className="mt-5 rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-5">
            <p className="text-sm text-slate-500">Risk score</p>
            <p className="text-6xl font-black text-slate-900">{check.riskScore ?? output.risk_score ?? 0}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500" style={{ width: `${check.riskScore ?? output.risk_score ?? 0}%` }} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {new Date(check.createdAt).toLocaleString()}
          </div>
          <Button variant="outline" className="mt-5 gap-2" onClick={() => window.print()}>
            <Download className="h-4 w-4" />
            Download Report PDF
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-5 p-5">
          {output.official_registry_check && (
            <section className={`rounded-xl border p-4 ${
              output.official_registry_check.matched && output.official_registry_check.is_active
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">MEA/eMigrate Reputed RA Registry</h3>
                <Badge className={output.official_registry_check.matched && output.official_registry_check.is_active
                  ? "border-0 bg-emerald-100 text-emerald-700"
                  : "border-0 bg-amber-100 text-amber-700"
                }>
                  {output.official_registry_check.status || "Not found"}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {output.official_registry_check.matched
                  ? `${output.official_registry_check.agency_name || "Agency"} ${output.official_registry_check.raid ? `(${output.official_registry_check.raid})` : ""} is listed in the MEA/eMigrate reputed Recruiting Agents report with status: ${output.official_registry_check.status || "Not listed"}.`
                  : output.official_registry_check.note}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Source updated as on {output.official_registry_check.updated_as_on}. This confirms a registry signal only; verify the exact offer, contact person, payment request, and official government records before proceeding.
              </p>
            </section>
          )}

          {output.unregistered_agency_grievance_check && (
            <section className={`rounded-xl border p-4 ${
              output.unregistered_agency_grievance_check.matched
                ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-slate-50"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Unregistered Agency Grievance List</h3>
                <Badge className={output.unregistered_agency_grievance_check.matched
                  ? "border-0 bg-red-100 text-red-700"
                  : "border-0 bg-slate-100 text-slate-700"
                }>
                  {output.unregistered_agency_grievance_check.status || "Not found"}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {output.unregistered_agency_grievance_check.matched
                  ? `${output.unregistered_agency_grievance_check.agency_name || "Agency"} appears in the grievance list for unregistered agencies${output.unregistered_agency_grievance_check.grievance_count ? ` with ${output.unregistered_agency_grievance_check.grievance_count} grievance${output.unregistered_agency_grievance_check.grievance_count === 1 ? "" : "s"}` : ""}.`
                  : output.unregistered_agency_grievance_check.note}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Source updated as on {output.unregistered_agency_grievance_check.updated_as_on}. This is a serious risk signal when matched; verify through official MEA/eMigrate channels before any payment.
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldAlert className="h-4 w-4 text-orange-500" /> Red flags</h3>
            <div className="space-y-2">
              {(output.red_flags || []).length ? output.red_flags.map((item: string) => (
                <div key={item} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-800">{item}</div>
              )) : <p className="text-sm text-slate-500">No major red flags returned by AI.</p>}
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><BadgeCheck className="h-4 w-4 text-emerald-500" /> Positive indicators</h3>
            <div className="space-y-2">
              {(output.positive_indicators || []).map((item: string) => (
                <div key={item} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{item}</div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-slate-50 p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-900">Explanation</h3>
            <p className="text-sm leading-6 text-slate-600">{output.explanation || output.summary}</p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-bold text-slate-900">Recommended next steps</h3>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function VisaToolsHistoryPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useB2cAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/sign-in?next=${encodeURIComponent("/visa-tools/history")}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`);
    }
  }, [isLoading, user, setLocation]);

  const { data: history = [], isLoading: historyLoading } = useQuery<VisaToolCheck[]>({
    queryKey: ["/api/b2c/visa-tools/checks"],
    enabled: !!user,
  });

  if (isLoading || !user) {
    return (
      <DashboardLayout title="Visa Tools History" subtitle="Saved AI risk checks">
        <div className="flex min-h-[55vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4055FF]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Visa Tools History" subtitle="Every completed Visa Tools check is saved under your account">
      <div className="space-y-5">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/visa-tools")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Visa Tools
        </Button>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            {historyLoading ? (
              <div className="flex min-h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#4055FF]" />
              </div>
            ) : history.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {history.map((check) => (
                  <button key={check.id} onClick={() => setLocation(`/visa-tools/history/${check.id}`)} className="rounded-xl border bg-white p-4 text-left transition hover:border-[#4055FF] hover:shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Badge variant="secondary">{tools.find((tool) => tool.type === check.toolType)?.title || check.toolType}</Badge>
                      <Badge className={riskColor(check.riskLevel)}>{check.riskLevel || "Risk"}</Badge>
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
              </div>
            ) : (
              <div className="rounded-2xl border bg-slate-50 p-10 text-center">
                <SearchCheck className="mx-auto mb-3 h-8 w-8 text-[#4055FF]" />
                <h2 className="text-lg font-black text-slate-900">No saved checks yet</h2>
                <p className="mt-2 text-sm text-slate-500">Run any Visa Tools module and it will appear here automatically.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export function VisaToolsHistoryDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/visa-tools/history/:id");
  const { user, isLoading } = useB2cAuth();
  const id = params?.id;

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation(`/sign-in?next=${encodeURIComponent(window.location.pathname)}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`);
    }
  }, [isLoading, user, setLocation]);

  const { data: check, isLoading: checkLoading, isError } = useQuery<VisaToolCheck>({
    queryKey: [`/api/b2c/visa-tools/checks/${id}`],
    enabled: !!user && !!id,
  });

  if (isLoading || !user || checkLoading) {
    return (
      <DashboardLayout title="Visa Tools Report" subtitle="Loading saved check">
        <div className="flex min-h-[55vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4055FF]" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !check) {
    return (
      <DashboardLayout title="Visa Tools Report" subtitle="Saved check">
        <Card className="max-w-xl border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-red-500" />
            <h2 className="text-lg font-black text-slate-900">Report not found</h2>
            <p className="mt-2 text-sm text-slate-500">This saved check is not available on your account.</p>
            <Button className="mt-5" onClick={() => setLocation("/visa-tools/history")}>Back to history</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Visa Tools Report" subtitle={tools.find((tool) => tool.type === check.toolType)?.title || check.toolType}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setLocation("/visa-tools/history")}>
            <ArrowLeft className="h-4 w-4" />
            Back to history
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation(`/visa-tools/${check.toolType}`)}>Run this tool again</Button>
        </div>
        <ToolReport check={check} />
      </div>
    </DashboardLayout>
  );
}
