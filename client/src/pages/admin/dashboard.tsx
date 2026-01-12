import { Link } from "wouter";
import { Building2, Users, FileText, TrendingUp, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const stats = [
  { title: "Total Tenants", value: "48", change: "+3 this month", changeType: "positive" as const, icon: Building2 },
  { title: "Active Users", value: "1,247", change: "+12% from last month", changeType: "positive" as const, icon: Users },
  { title: "Total Cases", value: "3,892", change: "+156 this week", changeType: "positive" as const, icon: FileText },
  { title: "Platform Revenue", value: "$89.4K", change: "+18% MoM", changeType: "positive" as const, icon: TrendingUp },
];

const recentTenants = [
  { id: "1", name: "Global Travel Solutions", plan: "professional", status: "active", cases: 145, createdAt: "2024-01-10" },
  { id: "2", name: "Voyager Travel Agency", plan: "enterprise", status: "active", cases: 312, createdAt: "2024-01-08" },
  { id: "3", name: "Quick Visa Services", plan: "starter", status: "pending", cases: 0, createdAt: "2024-01-12" },
  { id: "4", name: "Wanderlust Tours", plan: "professional", status: "active", cases: 89, createdAt: "2024-01-05" },
];

const systemActivity = [
  { id: "1", action: "New tenant registered", description: "Quick Visa Services signed up for Starter plan", timestamp: new Date(Date.now() - 1000 * 60 * 30), type: "default" as const },
  { id: "2", action: "VKB template updated", description: "Schengen Tourist visa requirements updated", timestamp: new Date(Date.now() - 1000 * 60 * 120), type: "success" as const },
  { id: "3", action: "AI quota exceeded", description: "Global Travel Solutions exceeded monthly AI quota", timestamp: new Date(Date.now() - 1000 * 60 * 180), type: "warning" as const },
  { id: "4", action: "Tenant plan upgraded", description: "Voyager Travel upgraded to Enterprise plan", timestamp: new Date(Date.now() - 1000 * 60 * 240), type: "success" as const },
];

const usageData = [
  { day: "Mon", cases: 245, documents: 890 },
  { day: "Tue", cases: 312, documents: 1020 },
  { day: "Wed", cases: 287, documents: 945 },
  { day: "Thu", cases: 356, documents: 1150 },
  { day: "Fri", cases: 401, documents: 1280 },
  { day: "Sat", cases: 189, documents: 620 },
  { day: "Sun", cases: 134, documents: 450 },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">SaaS Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform health and manage tenants.</p>
        </div>

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
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Platform Usage (This Week)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cases" 
                      stroke="hsl(188, 90%, 42%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(188, 90%, 42%)' }}
                      name="Cases"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="documents" 
                      stroke="hsl(340, 82%, 62%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(340, 82%, 62%)' }}
                      name="Documents"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                System Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline items={systemActivity} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">Recent Tenants</CardTitle>
            <Link href="/admin/tenants">
              <a className="text-sm text-primary hover:underline">View all</a>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTenants.map((tenant) => (
                <div 
                  key={tenant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover-elevate"
                  data-testid={`tenant-row-${tenant.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{tenant.plan} Plan</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{tenant.cases} cases</p>
                      <p className="text-xs text-muted-foreground">Since {tenant.createdAt}</p>
                    </div>
                    <StatusBadge status={tenant.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">VKB Update Pending</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  3 visa template updates are awaiting your review in the knowledge base.
                </p>
                <Link href="/admin/vkb">
                  <a className="text-sm text-amber-800 dark:text-amber-200 font-medium hover:underline mt-2 inline-block">
                    Review Updates
                  </a>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">AI Usage Report</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  2 tenants are approaching their monthly AI quota limits.
                </p>
                <Link href="/admin/ai">
                  <a className="text-sm text-blue-800 dark:text-blue-200 font-medium hover:underline mt-2 inline-block">
                    View AI Governance
                  </a>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
