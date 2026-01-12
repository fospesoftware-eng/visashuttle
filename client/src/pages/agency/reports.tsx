import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Briefcase, CheckCircle, Clock, TrendingUp, Users, DollarSign } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const monthlyData = [
  { month: "Jan", cases: 45, approved: 40, revenue: 12500 },
  { month: "Feb", cases: 52, approved: 48, revenue: 15200 },
  { month: "Mar", cases: 48, approved: 45, revenue: 14100 },
  { month: "Apr", cases: 61, approved: 55, revenue: 18300 },
  { month: "May", cases: 55, approved: 50, revenue: 16500 },
  { month: "Jun", cases: 67, approved: 62, revenue: 20100 },
];

const visaTypeData = [
  { type: "Schengen", count: 45, color: "hsl(188, 90%, 42%)" },
  { type: "UK Visitor", count: 32, color: "hsl(200, 85%, 50%)" },
  { type: "US B1/B2", count: 28, color: "hsl(340, 82%, 62%)" },
  { type: "Canada", count: 20, color: "hsl(260, 70%, 55%)" },
  { type: "Australia", count: 15, color: "hsl(150, 60%, 45%)" },
];

const countryData = [
  { country: "France", applications: 35 },
  { country: "United Kingdom", applications: 32 },
  { country: "United States", applications: 28 },
  { country: "Germany", applications: 22 },
  { country: "Canada", applications: 20 },
  { country: "Australia", applications: 15 },
];

const processingTimeData = [
  { range: "1-3 days", count: 45 },
  { range: "4-7 days", count: 85 },
  { range: "8-14 days", count: 35 },
  { range: "15+ days", count: 12 },
];

export default function ReportsPage() {
  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Reports & Analytics</h1>
            <p className="text-muted-foreground">Track your agency's performance and metrics.</p>
          </div>
          <Select defaultValue="6months">
            <SelectTrigger className="w-[180px]" data-testid="select-time-range">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Cases"
            value="328"
            change="+12% from last period"
            changeType="positive"
            icon={Briefcase}
          />
          <StatsCard
            title="Approval Rate"
            value="94.2%"
            change="+2.1% improvement"
            changeType="positive"
            icon={CheckCircle}
          />
          <StatsCard
            title="Avg. Processing"
            value="5.3 days"
            change="-0.8 days faster"
            changeType="positive"
            icon={Clock}
          />
          <StatsCard
            title="Revenue"
            value="$96,700"
            change="+18% from last period"
            changeType="positive"
            icon={DollarSign}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="visas" data-testid="tab-visas">Visa Types</TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cases Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
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
                          name="Total Cases"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="approved" 
                          stroke="hsl(150, 60%, 45%)" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(150, 60%, 45%)' }}
                          name="Approved"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [`$${value}`, 'Revenue']}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="hsl(340, 82%, 62%)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Destination Countries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={countryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="country" type="category" className="text-xs" width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="applications" 
                        fill="hsl(200, 85%, 50%)" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visas" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visa Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={visaTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="count"
                        >
                          {visaTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {visaTypeData.map((entry) => (
                      <div key={entry.type} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">{entry.type} ({entry.count})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Processing Time Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processingTimeData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="range" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(188, 90%, 42%)" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold gradient-text">94.2%</p>
                    <p className="text-sm text-muted-foreground mt-1">Approval Rate</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">+2.1% vs last period</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold gradient-text">5.3</p>
                    <p className="text-sm text-muted-foreground mt-1">Avg. Days to Process</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">-0.8 days vs last period</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold gradient-text">4.8</p>
                    <p className="text-sm text-muted-foreground mt-1">Customer Satisfaction</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">+0.2 vs last period</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
