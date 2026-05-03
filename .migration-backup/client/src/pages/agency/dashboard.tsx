import { Link } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Users, FileText, TrendingUp, Clock,
  AlertCircle, CheckCircle, ArrowRight, Plus, Loader2,
  DollarSign, Receipt, Wallet, AlertTriangle, Calendar as CalendarIcon,
  Globe, Target, FileCheck, XCircle, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { ProgressRing } from "@/components/progress-ring";
import { useCurrentUser } from "@/hooks/use-current-user";
import type {
  Case, Lead, ActivityLog, Invoice, Payment, Appointment, InvoiceSettings,
} from "@shared/schema";
import { APPOINTMENT_TYPES } from "@shared/schema";

function computeReadiness(c: Case): number {
  if (c.status === "approved") return 100;
  if (c.status === "submitted" || c.status === "under_review") return 85;
  if (c.status === "in_progress") return 60;
  if (c.status === "documents_required") return 40;
  return 20;
}

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format((cents || 0) / 100);
  } catch {
    return `${currency || "USD"} ${Math.round((cents || 0) / 100)}`;
  }
}

function timeUntil(d: Date): string {
  const ms = d.getTime() - Date.now();
  if (ms < 0) return "past";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `in ${days}d`;
}

type InvoiceStats = {
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  draftCount: number;
  sentCount: number;
  partialCount: number;
  paidCount: number;
  overdueCount: number;
  count: number;
};

type Analytics = {
  summary: {
    totalCases: number;
    activeCases: number;
    approvedCases: number;
    approvalRate: number;
    totalLeads: number;
    wonLeads: number;
    conversionRate: number;
    totalDocuments: number;
    docApprovalRate: number;
  };
  monthlyData: { month: string; cases: number; approved: number; leads: number }[];
  topDestinations: { country: string; applications: number }[];
  visaTypeData: { type: string; count: number }[];
  stageBreakdown: Record<string, number>;
};

const APPT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  APPOINTMENT_TYPES.map((t) => [t.value, t.label]),
);

export default function AgencyDashboard() {
  const { data: authData, isLoading: authLoading } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;

  const { data: cases = [], isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/tenants", tenantId, "cases"],
    enabled: !!tenantId,
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/tenants", tenantId, "leads"],
    enabled: !!tenantId,
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/tenants", tenantId, "activity-logs"],
    enabled: !!tenantId,
  });

  const { data: invoiceStats } = useQuery<InvoiceStats>({
    queryKey: ["/api/tenants", tenantId, "invoices", "stats"],
    enabled: !!tenantId,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/tenants", tenantId, "invoices"],
    enabled: !!tenantId,
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/tenants", tenantId, "payments"],
    enabled: !!tenantId,
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/tenants", tenantId, "appointments"],
    enabled: !!tenantId,
  });

  const { data: analytics } = useQuery<Analytics>({
    queryKey: ["/api/tenants", tenantId, "analytics"],
    enabled: !!tenantId,
  });

  const { data: invoiceSettings } = useQuery<InvoiceSettings>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
    enabled: !!tenantId,
  });

  const currency = invoiceSettings?.currency || "USD";

  // === Derived metrics ===
  const activeCases = cases.filter(c => !["approved", "rejected", "cancelled"].includes(c.status));
  const approvedCases = cases.filter(c => c.status === "approved");
  const rejectedCases = cases.filter(c => c.status === "rejected");
  const draftCases = cases.filter(c => c.status === "draft" || c.status === "pending");
  const docsRequiredCases = cases.filter(c => c.status === "documents_required");
  const successRate = (approvedCases.length + rejectedCases.length) > 0
    ? Math.round((approvedCases.length / (approvedCases.length + rejectedCases.length)) * 100)
    : 0;

  // This-month vs last-month case throughput, used for the change indicator
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const casesThisMonth = cases.filter(c => new Date(c.createdAt!) >= startOfThisMonth).length;
  const casesLastMonth = cases.filter(c => {
    const d = new Date(c.createdAt!);
    return d >= startOfLastMonth && d < startOfThisMonth;
  }).length;
  const monthDelta = casesThisMonth - casesLastMonth;

  // Recent
  const recentCases = useMemo(
    () => [...cases].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 5),
    [cases],
  );

  const recentActivity = useMemo(
    () => activityLogs.slice(-6).reverse().map(log => ({
      id: log.id,
      action: log.action.replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      description: typeof log.details === "object" && log.details !== null
        ? Object.values(log.details).filter(v => typeof v === "string").join(" · ")
        : "",
      user: { name: "System" },
      timestamp: new Date(log.createdAt!),
      type: log.action.includes("approved") ? "success" as const
        : log.action.includes("rejected") ? "error" as const
        : log.action.includes("warn") ? "warning" as const
        : "default" as const,
    })),
    [activityLogs],
  );

  // Upcoming appointments (next 7 days, scheduled or rescheduled only)
  const upcomingAppointments = useMemo(() => {
    const horizon = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return appointments
      .filter(a => {
        if (a.status !== "scheduled" && a.status !== "rescheduled") return false;
        const t = new Date(a.scheduledAt).getTime();
        return t >= Date.now() - 60 * 60 * 1000 && t <= horizon;
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  }, [appointments]);

  // Lead pipeline funnel
  const pipelineStages = [
    { key: "new",        label: "New",         color: "bg-slate-400" },
    { key: "contacted",  label: "Contacted",   color: "bg-blue-500" },
    { key: "qualified",  label: "Qualified",   color: "bg-violet-500" },
    { key: "proposal",   label: "Proposal",    color: "bg-amber-500" },
    { key: "won",        label: "Won",         color: "bg-emerald-500" },
    { key: "lost",       label: "Lost",        color: "bg-rose-500" },
  ];

  // Revenue totals — fall back to summing invoices client-side if /stats hasn't loaded yet.
  const billed = invoiceStats?.totalBilled ?? invoices.reduce((s, i) => s + i.total, 0);
  const paid = invoiceStats?.totalPaid ?? invoices.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoiceStats?.totalOutstanding ?? Math.max(0, billed - paid);
  const overdue = invoiceStats?.totalOverdue ?? 0;

  // Payments collected this month (from the payments stream)
  const paymentsThisMonth = payments
    .filter(p => p.paidAt && new Date(p.paidAt) >= startOfThisMonth)
    .reduce((s, p) => s + p.amount, 0);

  // Documents pending review across the agency
  const pendingDocsCount = analytics
    ? analytics.summary.totalDocuments - Math.round(
        analytics.summary.totalDocuments * (analytics.summary.docApprovalRate / 100),
      )
    : 0;

  // Monthly chart bounds
  const monthlyMax = analytics
    ? Math.max(1, ...analytics.monthlyData.map(m => Math.max(m.cases, m.leads)))
    : 1;

  const isLoading = authLoading || casesLoading || leadsLoading;
  const userName = authData?.user?.name || authData?.user?.email || "there";

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{userName}</span>! Here's what's happening today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="gap-2" data-testid="button-view-leads">
              <Link href="/app/leads"><Users className="w-4 h-4" /> Pipeline</Link>
            </Button>
            <Button asChild className="gap-2" data-testid="button-new-case">
              <Link href="/app/cases/new"><Plus className="w-4 h-4" /> New Application</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Top KPI row — applications */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Active Applications"
                value={String(activeCases.length)}
                change={monthDelta === 0
                  ? `${casesThisMonth} new this month`
                  : `${casesThisMonth} this month (${monthDelta > 0 ? "+" : ""}${monthDelta} vs last)`}
                changeType={monthDelta >= 0 ? "positive" : "negative"}
                icon={Briefcase}
              />
              <StatsCard
                title="Approved"
                value={String(approvedCases.length)}
                change={`${rejectedCases.length} rejected`}
                changeType="positive"
                icon={CheckCircle}
              />
              <StatsCard
                title="Active Leads"
                value={String(leads.length)}
                change={`${analytics?.summary.wonLeads ?? 0} won · ${analytics?.summary.conversionRate ?? 0}% conv.`}
                changeType="positive"
                icon={Users}
              />
              <StatsCard
                title="Success Rate"
                value={cases.length > 0 ? `${successRate}%` : "—"}
                change="approved / decided"
                changeType={successRate >= 70 ? "positive" : "negative"}
                icon={TrendingUp}
              />
            </div>

            {/* Revenue KPI row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Billed"
                value={fmtMoney(billed, currency)}
                change={`${invoiceStats?.count ?? invoices.length} invoices`}
                changeType="neutral"
                icon={Receipt}
              />
              <StatsCard
                title="Collected"
                value={fmtMoney(paid, currency)}
                change={`${fmtMoney(paymentsThisMonth, currency)} this month`}
                changeType="positive"
                icon={Wallet}
              />
              <StatsCard
                title="Outstanding"
                value={fmtMoney(outstanding, currency)}
                change={`${(invoiceStats?.sentCount ?? 0) + (invoiceStats?.partialCount ?? 0)} unpaid`}
                changeType={outstanding > 0 ? "negative" : "neutral"}
                icon={DollarSign}
              />
              <StatsCard
                title="Overdue"
                value={fmtMoney(overdue, currency)}
                change={`${invoiceStats?.overdueCount ?? 0} invoices past due`}
                changeType={overdue > 0 ? "negative" : "positive"}
                icon={AlertTriangle}
              />
            </div>

            {/* Main two-column area */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Monthly trend */}
                {analytics && analytics.monthlyData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">6-Month Trend</CardTitle>
                          <CardDescription>Applications, approvals and new leads each month.</CardDescription>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Cases</span>
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Approved</span>
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-violet-500 inline-block" /> Leads</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-6 gap-3 items-end h-40">
                        {analytics.monthlyData.map((m) => (
                          <div key={m.month} className="flex flex-col items-center gap-1.5">
                            <div className="flex items-end gap-0.5 h-32 w-full justify-center">
                              <div
                                title={`${m.cases} cases`}
                                className="w-2.5 rounded-sm bg-primary/70 transition-all"
                                style={{ height: `${(m.cases / monthlyMax) * 100}%`, minHeight: m.cases > 0 ? "4px" : "0" }}
                                data-testid={`bar-cases-${m.month}`}
                              />
                              <div
                                title={`${m.approved} approved`}
                                className="w-2.5 rounded-sm bg-emerald-500 transition-all"
                                style={{ height: `${(m.approved / monthlyMax) * 100}%`, minHeight: m.approved > 0 ? "4px" : "0" }}
                                data-testid={`bar-approved-${m.month}`}
                              />
                              <div
                                title={`${m.leads} leads`}
                                className="w-2.5 rounded-sm bg-violet-500 transition-all"
                                style={{ height: `${(m.leads / monthlyMax) * 100}%`, minHeight: m.leads > 0 ? "4px" : "0" }}
                                data-testid={`bar-leads-${m.month}`}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{m.month}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent applications */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg">Recent Applications</CardTitle>
                    <Button asChild variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-cases">
                      <Link href="/app/cases">View All <ArrowRight className="w-4 h-4" /></Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {recentCases.length === 0 ? (
                      <div className="text-center py-12">
                        <Briefcase className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-muted-foreground text-sm">No applications yet.</p>
                        <Button asChild size="sm" className="mt-3 gap-2">
                          <Link href="/app/cases/new"><Plus className="w-4 h-4" /> Create First Application</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentCases.map((c) => (
                          <Link key={c.id} href={`/app/cases/${c.id}`} asChild>
                            <a
                              className="flex items-center gap-4 p-3 rounded-lg hover-elevate cursor-pointer bg-muted/30 no-underline text-foreground"
                              data-testid={`case-row-${c.id}`}
                            >
                              <ProgressRing value={computeReadiness(c)} size={48} strokeWidth={4} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium truncate">{c.applicantName || "Untitled draft"}</span>
                                  <StatusBadge status={c.status} />
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="font-mono text-xs">{c.caseNumber}</span>
                                  <span>•</span>
                                  <span>{c.visaType}</span>
                                  <span>•</span>
                                  <span className="truncate">{c.destinationCountry}</span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            </a>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top destinations + visa types */}
                {analytics && (analytics.topDestinations.length > 0 || analytics.visaTypeData.length > 0) && (
                  <div className="grid gap-6 md:grid-cols-2">
                    {analytics.topDestinations.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="w-4 h-4" /> Top Destinations
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {analytics.topDestinations.map((d) => {
                            const pct = (d.applications / analytics.summary.totalCases) * 100;
                            return (
                              <div key={d.country} data-testid={`dest-row-${d.country}`}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="truncate">{d.country}</span>
                                  <span className="font-semibold tabular-nums">{d.applications}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}
                    {analytics.visaTypeData.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileCheck className="w-4 h-4" /> Top Visa Types
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {analytics.visaTypeData.map((v) => {
                            const pct = (v.count / analytics.summary.totalCases) * 100;
                            return (
                              <div key={v.type} data-testid={`visa-row-${v.type}`}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="truncate">{v.type}</span>
                                  <span className="font-semibold tabular-nums">{v.count}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Activity */}
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

              {/* Right column */}
              <div className="space-y-6">
                {/* Upcoming appointments */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      Upcoming Appointments
                    </CardTitle>
                    {appointments.length > 0 && (
                      <Badge variant="secondary" data-testid="badge-appointments-count">
                        {upcomingAppointments.length}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    {upcomingAppointments.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Nothing scheduled in the next 7 days.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingAppointments.map((a) => {
                          const when = new Date(a.scheduledAt);
                          return (
                            <Link key={a.id} href={`/app/cases/${a.caseId}`} asChild>
                              <a
                                className="block rounded-lg border p-3 hover-elevate no-underline text-foreground"
                                data-testid={`appointment-row-${a.id}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate flex items-center gap-1.5">
                                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                      {a.provider}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                      {APPT_TYPE_LABEL[a.appointmentType] ?? a.appointmentType}
                                      {a.location ? ` · ${a.location}` : ""}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="shrink-0 text-[10px]">
                                    {timeUntil(when)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {when.toLocaleString(undefined, {
                                    weekday: "short", month: "short", day: "numeric",
                                    hour: "numeric", minute: "2-digit",
                                  })}
                                </p>
                              </a>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status breakdown */}
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
                        { label: "In Progress",    filter: "in_progress",        color: "bg-blue-500" },
                        { label: "Docs Required",  filter: "documents_required", color: "bg-amber-500" },
                        { label: "Under Review",   filter: "under_review",       color: "bg-violet-500" },
                        { label: "Submitted",      filter: "submitted",          color: "bg-cyan-500" },
                        { label: "Approved",       filter: "approved",           color: "bg-emerald-500" },
                        { label: "Rejected",       filter: "rejected",           color: "bg-rose-500" },
                        { label: "Pending",        filter: "pending",            color: "bg-slate-400" },
                      ].map(({ label, filter, color }) => {
                        const count = cases.filter(c => c.status === filter).length;
                        const pct = cases.length > 0 ? (count / cases.length) * 100 : 0;
                        if (count === 0 && filter !== "in_progress" && filter !== "approved") return null;
                        return (
                          <div key={filter} data-testid={`status-row-${filter}`}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-semibold tabular-nums">{count}</span>
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

                {/* Lead pipeline */}
                {leads.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-violet-500" />
                        Lead Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pipelineStages.map(({ key, label, color }) => {
                        const count = leads.filter(l => l.stage === key).length;
                        const pct = leads.length > 0 ? (count / leads.length) * 100 : 0;
                        return (
                          <div key={key} data-testid={`pipeline-row-${key}`}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-semibold tabular-nums">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* At-a-glance numbers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">At a Glance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total cases</span>
                      <span className="font-semibold">{cases.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Drafts</span>
                      <span className="font-semibold">{draftCases.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Awaiting docs
                      </span>
                      <span className="font-semibold">{docsRequiredCases.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-violet-500" /> Pending docs review
                      </span>
                      <span className="font-semibold">{pendingDocsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" /> Total appointments
                      </span>
                      <span className="font-semibold">{appointments.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" /> Rejected
                      </span>
                      <span className="font-semibold">{rejectedCases.length}</span>
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
