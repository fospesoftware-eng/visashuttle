import { Brain, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const usageData = [
  { day: "Mon", requests: 2450, tokens: 890000 },
  { day: "Tue", requests: 3120, tokens: 1020000 },
  { day: "Wed", requests: 2870, tokens: 945000 },
  { day: "Thu", requests: 3560, tokens: 1150000 },
  { day: "Fri", requests: 4010, tokens: 1280000 },
  { day: "Sat", requests: 1890, tokens: 620000 },
  { day: "Sun", requests: 1340, tokens: 450000 },
];

const tenantUsage = [
  { name: "Premier Travel Co", requests: 12500, quota: 15000, percentage: 83 },
  { name: "Voyager Travel Agency", requests: 9800, quota: 15000, percentage: 65 },
  { name: "Global Travel Solutions", requests: 14200, quota: 15000, percentage: 95 },
  { name: "Wanderlust Tours", requests: 4500, quota: 5000, percentage: 90 },
  { name: "Quick Visa Services", requests: 800, quota: 2000, percentage: 40 },
];

export default function AdminAIPage() {
  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Governance</h1>
          <p className="text-muted-foreground">Monitor AI usage and manage quotas across tenants.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total AI Requests"
            value="19,240"
            change="+15% this week"
            changeType="positive"
            icon={Brain}
          />
          <StatsCard
            title="Tokens Used"
            value="6.4M"
            change="64% of monthly quota"
            changeType="neutral"
            icon={Zap}
          />
          <StatsCard
            title="Avg Response Time"
            value="1.2s"
            change="-0.3s improvement"
            changeType="positive"
            icon={TrendingUp}
          />
          <StatsCard
            title="Quota Alerts"
            value="2"
            change="Tenants near limit"
            changeType="negative"
            icon={AlertTriangle}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Usage This Week</CardTitle>
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
                    dataKey="requests" 
                    stroke="hsl(188, 90%, 42%)" 
                    strokeWidth={2}
                    name="Requests"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tenant AI Quota Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenantUsage.map((tenant) => (
              <div key={tenant.name} className="space-y-2" data-testid={`tenant-usage-${tenant.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{tenant.name}</span>
                  <span className={`text-sm ${tenant.percentage >= 90 ? 'text-red-600 dark:text-red-400' : tenant.percentage >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                    {tenant.requests.toLocaleString()} / {tenant.quota.toLocaleString()} requests
                  </span>
                </div>
                <Progress 
                  value={tenant.percentage} 
                  className={`h-2 ${tenant.percentage >= 90 ? '[&>div]:bg-red-500' : tenant.percentage >= 75 ? '[&>div]:bg-amber-500' : ''}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
