import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Briefcase, Users, FileText, TrendingUp, Clock, 
  AlertCircle, CheckCircle, ArrowRight, Plus, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { ProgressRing } from "@/components/progress-ring";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Case, Lead, ActivityLog } from "@shared/schema";

function computeReadiness(c: Case): number {
  if (c.status === "approved") return 100;
  if (c.status === "submitted" || c.status === "under_review") return 85;
  if (c.status === "in_progress") return 60;
  if (c.status === "documents_required") return 40;
  return 20;
}

export default function AgencyDashboard() {
  const { data: authData, isLoading: authLoading } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;

  const { data: cases = [], isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/tenants", tenantId, "cases"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/tenants", tenantId, "leads"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/leads`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/tenants", tenantId, "activity-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/activity-logs`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });

  const activeCases = cases.filter(c => !["approved", "rejected", "cancelled"].includes(c.status));
  const approvedCases = cases.filter(c => c.status === "approved");
  const successRate = cases.length > 0 ? Math.round((approvedCases.length / cases.length) * 100) : 0;
  const recentCases = [...cases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentActivity = activityLogs.slice(-5).reverse().map(log => ({
    id: log.id,
    action: log.action.replace(".", " ").replace(/\b\w/g, c => c.toUpperCase()),
    description: typeof log.details === "object" && log.details !== null
      ? Object.values(log.details).join(", ")
      : "",
    user: { name: "System" },
    timestamp: new Date(log.createdAt),
    type: log.action.includes("approved") ? "success" as const
      : log.action.includes("rejected") ? "error" as const
      : log.action.includes("warn") ? "warning" as const
      : "default" as const,
  }));

  const stats = [
    { title: "Active Applications", value: String(activeCases.length), change: `${cases.length} total`, changeType: "positive" as const, icon: Briefcase },
    { title: "Approved This Period", value: String(approvedCases.length), change: "visa grants", changeType: "positive" as const, icon: CheckCircle },
    { title: "Active Leads", value: String(leads.length), change: "in pipeline", changeType: "positive" as const, icon: Users },
    { title: "Success Rate", value: cases.length > 0 ? `${successRate}%` : "—", change: "approved / total", changeType: successRate >= 70 ? "positive" as const : "negative" as const, icon: TrendingUp },
  ];

  const isLoading = authLoading || casesLoading || leadsLoading;

  const userName = authData?.user?.name || authData?.user?.email || "there";

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{userName}</span>! Here's what's happening today.
            </p>
          </div>
          <Link href="/app/cases/new">
            <Button className="gap-2" data-testid="button-new-case">
              <Plus className="w-4 h-4" />
              New Application
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <StatsCard
                  key={stat.title}
                  title={stat.title}
                  value={stat.value}
                  change={stat.change}
                  changeType={stat.changeType}
                  icon={stat.icon}
                />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg">Recent Applications</CardTitle>
                    <Link href="/app/cases">
                      <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-cases">
                        View All
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {recentCases.length === 0 ? (
                      <div className="text-center py-12">
                        <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground text-sm">No applications yet.</p>
                        <Link href="/app/cases/new">
                          <Button size="sm" className="mt-3 gap-2">
                            <Plus className="w-4 h-4" /> Create First Application
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentCases.map((c) => (
                          <Link key={c.id} href={`/app/cases/${c.id}`}>
                            <div
                              className="flex items-center gap-4 p-3 rounded-lg hover-elevate cursor-pointer bg-muted/30"
                              data-testid={`case-row-${c.id}`}
                            >
                              <ProgressRing value={computeReadiness(c)} size={48} strokeWidth={4} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{c.applicantName}</span>
                                  <StatusBadge status={c.status} />
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="font-mono text-xs">{c.caseNumber}</span>
                                  <span>•</span>
                                  <span>{c.visaType}</span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {recentActivity.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Timeline items={recentActivity} />
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      Status Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { label: "In Progress", filter: "in_progress", color: "bg-blue-500" },
                        { label: "Docs Required", filter: "documents_required", color: "bg-amber-500" },
                        { label: "Under Review", filter: "under_review", color: "bg-violet-500" },
                        { label: "Approved", filter: "approved", color: "bg-emerald-500" },
                        { label: "Pending", filter: "pending", color: "bg-slate-400" },
                      ].map(({ label, filter, color }) => {
                        const count = cases.filter(c => c.status === filter).length;
                        const pct = cases.length > 0 ? (count / cases.length) * 100 : 0;
                        return (
                          <div key={filter}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-semibold">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total cases</span>
                      <span className="font-semibold">{cases.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Leads in pipeline</span>
                      <span className="font-semibold">{leads.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Success rate</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold">{cases.length > 0 ? `${successRate}%` : "—"}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Awaiting docs</span>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold">{cases.filter(c => c.status === "documents_required").length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
