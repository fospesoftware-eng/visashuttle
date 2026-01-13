import { Link } from "wouter";
import { 
  Briefcase, Users, FileText, TrendingUp, Clock, 
  AlertCircle, CheckCircle, ArrowRight, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { ProgressRing } from "@/components/progress-ring";

const stats = [
  { title: "Active Applications", value: "24", change: "+12% from last month", changeType: "positive" as const, icon: Briefcase },
  { title: "Pending Documents", value: "8", change: "3 urgent", changeType: "negative" as const, icon: FileText },
  { title: "New Leads", value: "15", change: "+5 this week", changeType: "positive" as const, icon: Users },
  { title: "Success Rate", value: "94%", change: "+2% improvement", changeType: "positive" as const, icon: TrendingUp },
];

const recentCases = [
  { id: "VS-2024-001", applicant: "John Smith", visaType: "Schengen Tourist", status: "in_progress", readiness: 75 },
  { id: "VS-2024-002", applicant: "Sarah Johnson", visaType: "UK Visitor", status: "documents_required", readiness: 45 },
  { id: "VS-2024-003", applicant: "Michael Brown", visaType: "UAE Tourist", status: "under_review", readiness: 90 },
  { id: "VS-2024-004", applicant: "Emily Davis", visaType: "US B1/B2", status: "pending", readiness: 20 },
];

const recentActivity = [
  { id: "1", action: "Document approved", description: "Passport scan for John Smith was verified", user: { name: "Agent Sarah" }, timestamp: new Date(Date.now() - 1000 * 60 * 30), type: "success" as const },
  { id: "2", action: "New case created", description: "Emily Davis - US B1/B2 Visa application", user: { name: "Agent Mike" }, timestamp: new Date(Date.now() - 1000 * 60 * 120), type: "default" as const },
  { id: "3", action: "Document requires attention", description: "Bank statement for Sarah Johnson needs clarification", user: { name: "AI Assistant" }, timestamp: new Date(Date.now() - 1000 * 60 * 180), type: "warning" as const },
  { id: "4", action: "Case submitted for review", description: "Michael Brown's UAE visa application submitted", user: { name: "Agent Sarah" }, timestamp: new Date(Date.now() - 1000 * 60 * 240), type: "success" as const },
];

const urgentTasks = [
  { id: "1", title: "Review passport scan", case: "VS-2024-002", deadline: "Today" },
  { id: "2", title: "Upload missing bank statement", case: "VS-2024-004", deadline: "Tomorrow" },
  { id: "3", title: "Follow up with customer", case: "VS-2024-001", deadline: "2 days" },
];

export default function AgencyDashboard() {
  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
          </div>
          <Link href="/app/cases/new">
            <Button className="gap-2" data-testid="button-new-case">
              <Plus className="w-4 h-4" />
              New Application
            </Button>
          </Link>
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
                <div className="space-y-4">
                  {recentCases.map((caseItem) => (
                    <Link key={caseItem.id} href={`/app/cases/${caseItem.id}`}>
                      <div 
                        className="flex items-center gap-4 p-3 rounded-lg hover-elevate cursor-pointer bg-muted/30"
                        data-testid={`case-row-${caseItem.id}`}
                      >
                        <ProgressRing value={caseItem.readiness} size={48} strokeWidth={4} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{caseItem.applicant}</span>
                            <StatusBadge status={caseItem.status} />
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{caseItem.id}</span>
                            <span>•</span>
                            <span>{caseItem.visaType}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline items={recentActivity} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Urgent Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {urgentTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover-elevate cursor-pointer"
                      data-testid={`task-${task.id}`}
                    >
                      <div className="mt-0.5">
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.case}</p>
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                        {task.deadline}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approved this month</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold">18</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average processing time</span>
                  <span className="font-semibold">4.2 days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Customer satisfaction</span>
                  <span className="font-semibold">4.8/5</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
