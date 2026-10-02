import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Building2, Users, FileText, Activity, TrendingUp, TrendingDown,
  DollarSign, CheckCircle2, ArrowUpRight, Sparkles, Zap, MessageSquare,
  CreditCard, Globe2, ShieldCheck, Stamp, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

type Period = 7 | 30 | 90;

const PLAN_COLORS: Record<string, string> = {
  lite: "hsl(220, 9%, 60%)",
  go: "hsl(258, 78%, 62%)",
  power: "hsl(240, 80%, 60%)",
  starter: "hsl(220, 9%, 60%)",
  professional: "hsl(258, 78%, 62%)",
  enterprise: "hsl(240, 80%, 60%)",
};

const VISA_FUNNEL_COLORS = {
  notStarted: "hsl(220, 9%, 70%)",
  processing: "hsl(38, 92%, 55%)",
  approved:   "hsl(150, 65%, 45%)",
  rejected:   "hsl(0, 72%, 60%)",
};

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function deltaPct(now: number, prev: number): number | null {
  if (prev === 0) return now === 0 ? 0 : null;
  return (now - prev) / prev;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-muted-foreground">new</span>;
  }
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"
      }`}
    >
      <Icon className="w-3 h-3" />
      {positive ? "+" : ""}{Math.round(value * 100)}%
    </span>
  );
}

interface KpiTileProps {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  icon: React.ElementType;
  iconClass?: string;
  spark?: number[];
  sparkColor?: string;
  testId?: string;
}

function KpiTile({ label, value, delta, hint, icon: Icon, iconClass, spark, sparkColor, testId }: KpiTileProps) {
  const sparkData = (spark ?? []).map((v, i) => ({ i, v }));
  return (
    <Card className="overflow-hidden" data-testid={testId}>
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Icon className={`w-3.5 h-3.5 ${iconClass ?? "text-muted-foreground"}`} />
            {label}
          </div>
          {delta !== undefined && <DeltaBadge value={delta} />}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-semibold tabular-nums leading-none">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
          </div>
          {sparkData.length > 1 && (
            <div className="h-8 w-20 -mb-1 -mr-1 opacity-90">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={sparkColor ?? "hsl(var(--primary))"}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{children}</h2>
      {action}
    </div>
  );
}

function HBar({ label, value, total, color, sub }: { label: string; value: number; total: number; color: string; sub?: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value}{sub ? <span className="ml-1 text-xs">{sub}</span> : null}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function HealthRow({ icon: Icon, label, ok, detail }: { icon: React.ElementType; label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0 border-border/50">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
          ok ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
             : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
        }`}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{detail}</p>
        </div>
      </div>
      <Badge variant={ok ? "secondary" : "outline"} className={`text-xs font-medium ${
        ok ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border-transparent"
           : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
      }`}>
        {ok ? "Ready" : "Setup"}
      </Badge>
    </div>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>(30);

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/stats?days=${period}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load stats");
      return r.json();
    },
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const { data: activityLogs } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-logs"],
  });

  const { data: weekData = [], isLoading: weekLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/weekly-activity", period],
    queryFn: async () => {
      const r = await fetch(`/api/admin/weekly-activity?days=${period}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load activity");
      return r.json();
    },
  });

  const sparkCases     = useMemo(() => weekData.map((d: any) => d.cases ?? 0), [weekData]);
  const sparkChecks    = useMemo(() => weekData.map((d: any) => d.checks ?? 0), [weekData]);
  const sparkApprovals = useMemo(() => weekData.map((d: any) => d.approvals ?? 0), [weekData]);
  const sparkTenants   = useMemo(() => weekData.map((d: any) => d.newTenants ?? 0), [weekData]);

  const planChartData = useMemo(() => {
    const pb = stats?.planBreakdown ?? {};
    return ["lite", "go", "power"]
      .filter((p) => (pb[p] ?? 0) > 0)
      .map((p) => ({ name: p[0].toUpperCase() + p.slice(1), value: pb[p], plan: p }));
  }, [stats]);

  const totalFunnel = useMemo(() => {
    const f = stats?.visaFunnel;
    if (!f) return 0;
    return f.notStarted + f.processing + f.approved + f.rejected;
  }, [stats]);

  const topDestTotal = useMemo(
    () => (stats?.topDestinations ?? []).reduce((s: number, d: any) => s + d.count, 0) || 1,
    [stats],
  );

  const periodLabel = period === 7 ? "7 days" : period === 30 ? "30 days" : "90 days";

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Platform Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats?.generatedAt
                ? `Last updated ${formatDistanceToNow(new Date(stats.generatedAt))} ago · trailing ${periodLabel}`
                : `Trailing ${periodLabel}`}
            </p>
          </div>
          <div className="inline-flex items-center rounded-lg border bg-card p-1 self-start md:self-auto" data-testid="period-selector">
            {([7, 30, 90] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                data-testid={`button-period-${p}`}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {/* KPI strip — 6 tiles */}
        {statsLoading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <KpiTile
              testId="kpi-tenants"
              label="Agencies"
              value={String(stats?.tenantCount ?? 0)}
              delta={deltaPct(stats?.newTenantsThisPeriod ?? 0, stats?.newTenantsPrev ?? 0)}
              hint={`${stats?.activeTenantCount ?? 0} active · ${stats?.newTenantsThisPeriod ?? 0} new`}
              icon={Building2}
              iconClass="text-primary"
              spark={sparkTenants}
              sparkColor="hsl(258, 78%, 62%)"
            />
            <KpiTile
              testId="kpi-mrr"
              label="MRR"
              value={fmtMoney(stats?.mrr ?? 0)}
              delta={deltaPct(stats?.mrr ?? 0, stats?.mrrPrev ?? 0)}
              hint="Active plans · USD"
              icon={DollarSign}
              iconClass="text-emerald-600"
              spark={sparkTenants}
              sparkColor="hsl(150, 65%, 45%)"
            />
            <KpiTile
              testId="kpi-cases"
              label="Cases"
              value={String(stats?.totalCases ?? 0)}
              delta={deltaPct(stats?.newCasesThisPeriod ?? 0, stats?.newCasesPrev ?? 0)}
              hint={`${stats?.newCasesThisPeriod ?? 0} new this ${periodLabel.replace(" days","d")}`}
              icon={FileText}
              iconClass="text-purple-600"
              spark={sparkCases}
              sparkColor="hsl(258, 78%, 62%)"
            />
            <KpiTile
              testId="kpi-approval"
              label="Approval"
              value={fmtPct(stats?.approvalRate ?? 0)}
              delta={deltaPct(stats?.approvalRate ?? 0, stats?.approvalRatePrev ?? 0)}
              hint={`${stats?.decidedThisPeriod ?? 0} decided`}
              icon={CheckCircle2}
              iconClass="text-emerald-600"
              spark={sparkApprovals}
              sparkColor="hsl(150, 65%, 45%)"
            />
            <KpiTile
              testId="kpi-users"
              label="Users"
              value={String((stats?.agencyUserCount ?? 0) + (stats?.b2cUserCount ?? 0))}
              delta={deltaPct(stats?.newUsersThisPeriod ?? 0, stats?.newUsersPrev ?? 0)}
              hint={`${stats?.agencyUserCount ?? 0} agency · ${stats?.b2cUserCount ?? 0} B2C`}
              icon={Users}
              iconClass="text-blue-600"
              spark={sparkChecks}
              sparkColor="hsl(220, 70%, 55%)"
            />
            <KpiTile
              testId="kpi-events"
              label="Events Today"
              value={String(stats?.activityToday ?? 0)}
              hint="Audit log entries"
              icon={Activity}
              iconClass="text-amber-600"
              spark={sparkChecks}
              sparkColor="hsl(38, 92%, 55%)"
            />
          </div>
        )}

        {/* Activity area + Plan donut */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle className="text-base">Platform Activity</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  New cases, approvals & audit events over the last {periodLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <LegendDot color="hsl(258, 78%, 62%)" label="Cases" />
                <LegendDot color="hsl(150, 65%, 45%)" label="Approvals" />
                <LegendDot color="hsl(38, 92%, 55%)" label="Events" />
              </div>
            </CardHeader>
            <CardContent>
              {weekLoading ? (
                <Skeleton className="h-[260px] rounded-xl" />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weekData} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gCases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(258, 78%, 62%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(258, 78%, 62%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(150, 65%, 45%)" stopOpacity={0.30} />
                          <stop offset="100%" stopColor="hsl(150, 65%, 45%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gEvents" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                        interval={period === 90 ? 6 : period === 30 ? 2 : 0}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area type="monotone" dataKey="cases" stroke="hsl(258, 78%, 62%)" strokeWidth={2} fill="url(#gCases)" name="Cases" />
                      <Area type="monotone" dataKey="approvals" stroke="hsl(150, 65%, 45%)" strokeWidth={2} fill="url(#gApp)" name="Approvals" />
                      <Area type="monotone" dataKey="checks" stroke="hsl(38, 92%, 55%)" strokeWidth={1.5} fill="url(#gEvents)" name="Events" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Plan Mix</CardTitle>
              <p className="text-xs text-muted-foreground">Distribution across {stats?.tenantCount ?? 0} agencies</p>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[260px] rounded-xl" />
              ) : planChartData.length === 0 ? (
                <div className="h-[260px] flex flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <Building2 className="w-8 h-8 opacity-30 mb-2" />
                  No tenants yet
                </div>
              ) : (
                <div className="h-[260px] flex flex-col">
                  <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {planChartData.map((entry) => (
                            <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-semibold tabular-nums">{stats?.tenantCount ?? 0}</span>
                      <span className="text-xs text-muted-foreground">agencies</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-3">
                    {planChartData.map((p) => (
                      <div key={p.plan} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PLAN_COLORS[p.plan] }} />
                          <span className="capitalize">{p.plan}</span>
                        </div>
                        <span className="text-muted-foreground tabular-nums">{p.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Operational health row — funnel, destinations, integrations */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stamp className="w-4 h-4 text-primary" />
                Visa Funnel
              </CardTitle>
              <p className="text-xs text-muted-foreground">All cases by current stage</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {statsLoading ? (
                <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 rounded" />)}</div>
              ) : !stats?.visaFunnel ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No data</p>
              ) : (
                <>
                  <HBar label="Not started" value={stats.visaFunnel.notStarted} total={totalFunnel} color={VISA_FUNNEL_COLORS.notStarted} />
                  <HBar label="Processing" value={stats.visaFunnel.processing} total={totalFunnel} color={VISA_FUNNEL_COLORS.processing} />
                  <HBar label="Approved"   value={stats.visaFunnel.approved}   total={totalFunnel} color={VISA_FUNNEL_COLORS.approved} />
                  <HBar label="Rejected"   value={stats.visaFunnel.rejected}   total={totalFunnel} color={VISA_FUNNEL_COLORS.rejected} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-600" />
                Top Destinations
              </CardTitle>
              <p className="text-xs text-muted-foreground">By case volume across all agencies</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 rounded" />)}</div>
              ) : (stats?.topDestinations ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No cases yet</p>
              ) : (
                stats.topDestinations.map((d: any) => (
                  <HBar
                    key={d.country}
                    label={d.country}
                    value={d.count}
                    total={topDestTotal}
                    color="hsl(220, 70%, 55%)"
                    sub="cases"
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                System Health
              </CardTitle>
              <p className="text-xs text-muted-foreground">Integrations & infrastructure</p>
            </CardHeader>
            <CardContent className="py-1">
              {statsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded" />)}</div>
              ) : (
                <>
                  <HealthRow
                    icon={CreditCard}
                    label="Payment Gateway"
                    ok={(stats?.integrationsHealth?.gateway?.configuredTenants ?? 0) > 0}
                    detail={
                      stats?.integrationsHealth?.gateway?.configuredTenants > 0
                        ? `${stats.integrationsHealth.gateway.configuredTenants} of ${stats.integrationsHealth.gateway.totalTenants} agencies (${stats.integrationsHealth.gateway.liveTenants} live)`
                        : "No agencies configured yet"
                    }
                  />
                  <HealthRow
                    icon={MessageSquare}
                    label="SMS Provider"
                    ok={!!stats?.integrationsHealth?.sms?.configured}
                    detail={stats?.integrationsHealth?.sms?.configured ? "MessageCentral · global" : "Not configured"}
                  />
                  <HealthRow
                    icon={Sparkles}
                    label="AI Engine"
                    ok={!!stats?.integrationsHealth?.ai?.configured}
                    detail={stats?.integrationsHealth?.ai?.configured ? "AI engine connected" : "API key missing"}
                  />
                </>
              )}
              <div className="pt-3 mt-2 border-t border-border/50">
                <Link href="/admin/settings">
                  <a className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline" data-testid="link-system-settings">
                    Configure integrations <ArrowUpRight className="w-3 h-3" />
                  </a>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row — Top agencies + Recent activity */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-base">Top Agencies</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Ranked by total case volume</p>
              </div>
              <Link href="/admin/tenants">
                <a className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1" data-testid="link-all-agencies">
                  View all <ArrowUpRight className="w-3 h-3" />
                </a>
              </Link>
            </CardHeader>
            <CardContent>
              {tenantsLoading || statsLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : (stats?.topAgencies ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No agencies yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {(stats?.topAgencies ?? []).map((t: any, idx: number) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                      data-testid={`agency-row-${t.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
                        <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                             style={{ backgroundColor: `${PLAN_COLORS[t.plan] ?? PLAN_COLORS.lite}20` }}>
                          <Building2 className="w-4 h-4" style={{ color: PLAN_COLORS[t.plan] ?? PLAN_COLORS.lite }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate capitalize">
                            {t.plan} · {t.recentCaseCount} new in {periodLabel.replace(" days","d")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">{t.caseCount}</p>
                          <p className="text-xs text-muted-foreground">cases</p>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Activity
              </CardTitle>
              <Link href="/admin/audit">
                <a className="text-xs font-medium text-primary hover:underline" data-testid="link-all-audit">
                  Audit log
                </a>
              </Link>
            </CardHeader>
            <CardContent>
              {!activityLogs ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
              ) : activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activityLogs.slice(0, 6).map((log: any) => {
                    const isWarn = /deleted|suspended|failed/.test(log.action);
                    const isOk   = /created|approved|completed/.test(log.action);
                    const dotClass = isWarn
                      ? "bg-rose-500"
                      : isOk
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/40";
                    return (
                      <li key={log.id} className="flex items-start gap-3" data-testid={`activity-${log.id}`}>
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">
                            {log.action.replace(/\./g, ": ").replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
