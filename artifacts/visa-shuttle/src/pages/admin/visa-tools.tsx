import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, FileSearch, ShieldAlert, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function riskClass(level?: string | null) {
  const value = String(level || "").toLowerCase();
  if (value.includes("critical")) return "bg-red-100 text-red-700 border-red-200";
  if (value.includes("high")) return "bg-orange-100 text-orange-700 border-orange-200";
  if (value.includes("medium")) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

export default function AdminVisaToolsPage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/visa-tools/stats"],
  });

  const usage = useMemo(() => Object.entries(data?.usageByTool || {}), [data]);
  const risks = useMemo(() => Object.entries(data?.riskBreakdown || {}), [data]);

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-[#4055FF]/10 via-background to-[#FF2060]/10 p-6">
          <Badge className="mb-3 border-0 bg-[#4055FF] text-white">Visa Tools</Badge>
          <h1 className="text-3xl font-black tracking-tight">Visa Tools Monitoring</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track AI-assisted fraud-risk checks, suspicious cases, and tool usage across B2C users.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#4055FF]/10 text-[#4055FF]">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-muted-foreground">Total checks</p>
                  <p className="mt-1 text-3xl font-black">{data?.totalChecks || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-muted-foreground">Suspicious cases</p>
                  <p className="mt-1 text-3xl font-black">{data?.suspiciousCases || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF2060]/10 text-[#FF2060]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-muted-foreground">Tool types used</p>
                  <p className="mt-1 text-3xl font-black">{usage.length}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Tool usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {usage.map(([label, count]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-sm font-medium">{label}</span>
                  <Badge variant="secondary">{String(count)}</Badge>
                </div>
              ))}
              {!usage.length && <p className="text-sm text-muted-foreground">No checks yet.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4" /> Risk breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {risks.map(([level, count]) => (
                <div key={level} className="flex items-center justify-between rounded-xl border p-3">
                  <Badge className={riskClass(level)}>{level}</Badge>
                  <span className="text-sm font-semibold">{String(count)} checks</span>
                </div>
              ))}
              {!risks.length && <p className="text-sm text-muted-foreground">No risk data yet.</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Visa Tools checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Tool</th>
                    <th className="py-3 pr-4 font-medium">Country</th>
                    <th className="py-3 pr-4 font-medium">Risk</th>
                    <th className="py-3 pr-4 font-medium">Score</th>
                    <th className="py-3 pr-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentChecks || []).map((check: any) => (
                    <tr key={check.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{check.claudeResponseJson?.tool_label || check.toolType}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{check.country || "-"}</td>
                      <td className="py-3 pr-4"><Badge className={riskClass(check.riskLevel)}>{check.riskLevel || "Unknown"}</Badge></td>
                      <td className="py-3 pr-4 font-semibold">{check.riskScore ?? "-"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{check.createdAt ? new Date(check.createdAt).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
