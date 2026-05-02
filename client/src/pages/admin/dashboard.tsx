import { Link } from "wouter";
import { Building2, Users, FileText, Activity, AlertCircle, TrendingUp, Globe, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

function StatsSkeletons() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: activityLogs } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-logs"],
  });

  const { data: weekData = [], isLoading: weekLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/weekly-activity"],
  });

  const timelineItems = (activityLogs ?? []).slice(0, 5).map((log: any) => ({
    id: log.id,
    action: log.action.replace(/\./g, ": ").replace(/_/g, " "),
    description: log.details ? JSON.stringify(log.details).slice(0, 80).replace(/[{}\"]/g, "") : "",
    timestamp: new Date(log.createdAt),
    type: log.action.includes("deleted") || log.action.includes("suspended")
      ? "warning" as const
      : log.action.includes("created") || log.action.includes("approved")
      ? "success" as const
      : "default" as const,
  }));

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Platform Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor platform health and manage all agencies.</p>
        </div>

        {statsLoading ? <StatsSkeletons /> : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.tenantCount ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total Agencies</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{stats?.activeTenantCount ?? 0} active</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.agencyUserCount ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Agency Users</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stats?.b2cUserCount ?? 0} B2C users</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalCases ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total Cases</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.activityToday ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Events Today</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plan breakdown + chart */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Platform Activity (This Week)</CardTitle>
            </CardHeader>
            <CardContent>
              {weekLoading ? (
                <Skeleton className="h-[260px] rounded-xl" />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weekData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" tick={{ fontSize: 12 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} />
                      <Line type="monotone" dataKey="cases" stroke="hsl(240, 80%, 65%)" strokeWidth={2} dot={{ fill: "hsl(240,80%,65%)" }} name="Cases" />
                      <Line type="monotone" dataKey="checks" stroke="hsl(340, 82%, 62%)" strokeWidth={2} dot={{ fill: "hsl(340,82%,62%)" }} name="Activity Logs" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {statsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                ["starter","professional","enterprise"].map(plan => {
                  const count = stats?.planBreakdown?.[plan] ?? 0;
                  const total = stats?.tenantCount || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={plan} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize font-medium">{plan}</span>
                        <span className="text-muted-foreground">{count} agencies</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${plan === "enterprise" ? "bg-primary" : plan === "professional" ? "bg-purple-500" : "bg-slate-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent agencies */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">Recent Agencies</CardTitle>
              <Link href="/admin/tenants">
                <a className="text-sm text-primary hover:underline">View all →</a>
              </Link>
            </CardHeader>
            <CardContent>
              {tenantsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : (
                <div className="space-y-2">
                  {(tenants ?? []).slice(0, 5).map((tenant: any) => (
                    <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors" data-testid={`tenant-row-${tenant.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{tenant.plan} · {tenant.userCount ?? 0} users · {tenant.caseCount ?? 0} cases</p>
                        </div>
                      </div>
                      <StatusBadge status={tenant.status} />
                    </div>
                  ))}
                  {(tenants ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No agencies yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineItems.length > 0 ? (
                <Timeline items={timelineItems} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">Manage Agencies</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">Review, approve and configure agency accounts.</p>
                <Link href="/admin/tenants"><a className="text-sm text-blue-800 dark:text-blue-200 font-medium hover:underline mt-2 inline-block">Open Agencies →</a></Link>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-purple-800 dark:text-purple-200">Manage Users</p>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-0.5">Agency staff and B2C visa checker accounts.</p>
                <Link href="/admin/users"><a className="text-sm text-purple-800 dark:text-purple-200 font-medium hover:underline mt-2 inline-block">Open Users →</a></Link>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Audit Logs</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">Review all administrative actions taken on the platform.</p>
                <Link href="/admin/audit"><a className="text-sm text-amber-800 dark:text-amber-200 font-medium hover:underline mt-2 inline-block">View Logs →</a></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
