import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Briefcase, CheckCircle, TrendingUp, Users, FileText, Target } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { useCurrentUser } from "@/hooks/use-current-user";

const CHART_COLORS = [
  "hsl(188, 90%, 42%)",
  "hsl(200, 85%, 50%)",
  "hsl(340, 82%, 62%)",
  "hsl(260, 70%, 55%)",
  "hsl(150, 60%, 45%)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  borderRadius: "8px",
};

export default function ReportsPage() {
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;

  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "analytics"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/analytics`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const s = analytics?.summary ?? {};
  const monthlyData = analytics?.monthlyData ?? [];
  const topDestinations = analytics?.topDestinations ?? [];
  const visaTypeData = analytics?.visaTypeData ?? [];
  const stageBreakdown = analytics?.stageBreakdown ?? {};

  const leadStageData = ["new", "contacted", "qualified", "proposal", "won", "lost"].map(stage => ({
    stage: stage.charAt(0).toUpperCase() + stage.slice(1),
    count: stageBreakdown[stage] ?? 0,
  }));

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Reports & Analytics</h1>
          <p className="text-muted-foreground">Track your agency's performance and metrics.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatsCard title="Total Cases" value={String(s.totalCases ?? 0)} change={`${s.activeCases ?? 0} active`} changeType="positive" icon={Briefcase} />
            <StatsCard title="Approval Rate" value={`${s.approvalRate ?? 0}%`} change={`${s.approvedCases ?? 0} approved`} changeType="positive" icon={CheckCircle} />
            <StatsCard title="Total Leads" value={String(s.totalLeads ?? 0)} change={`${s.wonLeads ?? 0} won`} changeType="positive" icon={Users} />
            <StatsCard title="Conversion Rate" value={`${s.conversionRate ?? 0}%`} change="leads to won" changeType="positive" icon={TrendingUp} />
            <StatsCard title="Documents" value={String(s.totalDocuments ?? 0)} change={`${s.docApprovalRate ?? 0}% approved`} changeType="positive" icon={FileText} />
            <StatsCard title="Active Cases" value={String(s.activeCases ?? 0)} change="in progress" changeType="positive" icon={Target} />
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="visas" data-testid="tab-visas">Visa Types</TabsTrigger>
            <TabsTrigger value="leads" data-testid="tab-leads">Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Cases Over Time</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {isLoading ? <Skeleton className="h-full w-full" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Line type="monotone" dataKey="cases" stroke="hsl(188, 90%, 42%)" strokeWidth={2} dot={{ fill: "hsl(188, 90%, 42%)" }} name="Total Cases" />
                          <Line type="monotone" dataKey="approved" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ fill: "hsl(150, 60%, 45%)" }} name="Approved" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Leads Over Time</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {isLoading ? <Skeleton className="h-full w-full" /> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="leads" fill="hsl(340, 82%, 62%)" radius={[4, 4, 0, 0]} name="Leads" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {topDestinations.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Top Destination Countries</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topDestinations} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" allowDecimals={false} />
                        <YAxis dataKey="country" type="category" className="text-xs" width={110} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="applications" fill="hsl(200, 85%, 50%)" radius={[0, 4, 4, 0]} name="Applications" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="visas" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Visa Type Distribution</CardTitle></CardHeader>
                <CardContent>
                  {visaTypeData.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                  ) : (
                    <>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={visaTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="count">
                              {visaTypeData.map((_: any, i: number) => (
                                <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {visaTypeData.map((entry: any, i: number) => (
                          <div key={entry.type} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="text-xs">{entry.type} ({entry.count})</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Cases by Visa Type</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {visaTypeData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={visaTypeData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="type" className="text-xs" tick={{ fontSize: 10 }} />
                          <YAxis className="text-xs" allowDecimals={false} />
                          <Tooltip contentStyle={TOOLTIP_STYLE} />
                          <Bar dataKey="count" fill="hsl(188, 90%, 42%)" radius={[4, 4, 0, 0]} name="Cases" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold gradient-text">{s.conversionRate ?? 0}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Lead Conversion Rate</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.wonLeads ?? 0} won of {s.totalLeads ?? 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold gradient-text">{s.totalLeads ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total Leads</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold gradient-text">{s.wonLeads ?? 0}</p>
                  <p className="text-sm text-muted-foreground mt-1">Won Leads</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Leads by Stage</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadStageData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="stage" className="text-xs" />
                      <YAxis className="text-xs" allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill="hsl(260, 70%, 55%)" radius={[4, 4, 0, 0]} name="Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
