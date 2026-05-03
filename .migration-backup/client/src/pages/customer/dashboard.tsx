import { Link } from "wouter";
import { CheckCircle, Clock, AlertCircle, ArrowRight, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerLayout } from "@/components/layouts/customer-layout";
import { Stepper } from "@/components/stepper";
import { ProgressRing } from "@/components/progress-ring";
import { StatusBadge } from "@/components/status-badge";

const caseData = {
  id: "VS-2024-001",
  visaType: "Schengen Tourist",
  country: "France",
  status: "in_progress",
  readinessScore: 75,
  travelDate: "March 15, 2024"
};

const steps = [
  { id: "profile", title: "Profile Complete", description: "Personal information" },
  { id: "documents", title: "Documents", description: "Upload required files" },
  { id: "review", title: "Under Review", description: "Agency verification" },
  { id: "submitted", title: "Submitted", description: "Sent to embassy" },
  { id: "approved", title: "Approved", description: "Visa granted" },
];

const requiredDocs = [
  { id: "1", name: "Passport Scan", status: "approved" },
  { id: "2", name: "Photo", status: "approved" },
  { id: "3", name: "Bank Statement", status: "pending" },
  { id: "4", name: "Flight Itinerary", status: "needs_reupload" },
  { id: "5", name: "Hotel Booking", status: "pending" },
];

const recentMessages = [
  { id: "1", from: "Agent Sarah", message: "Please upload your bank statement for the last 3 months.", time: "2 hours ago", unread: true },
  { id: "2", from: "Agent Sarah", message: "Your passport scan has been approved.", time: "1 day ago", unread: false },
];

export default function CustomerDashboard() {
  const approvedCount = requiredDocs.filter(d => d.status === "approved").length;
  const pendingCount = requiredDocs.filter(d => d.status === "pending" || d.status === "needs_reupload").length;

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" data-testid="text-greeting">Hello, John!</h1>
          <p className="text-muted-foreground">Track your visa application progress below.</p>
        </div>

        <Card className="gradient-subtle">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{caseData.id}</span>
                  <StatusBadge status={caseData.status} />
                </div>
                <p className="text-lg font-semibold">{caseData.visaType} - {caseData.country}</p>
                <p className="text-sm text-muted-foreground">Travel date: {caseData.travelDate}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <ProgressRing value={caseData.readinessScore} size={80} strokeWidth={6} />
                  <p className="text-xs text-muted-foreground mt-1">Readiness</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Application Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Stepper steps={steps} currentStep={1} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-base">Required Documents</CardTitle>
              <Link href="/customer/upload">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-documents">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{approvedCount} Approved</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span>{pendingCount} Pending</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {requiredDocs.slice(0, 3).map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      data-testid={`doc-item-${doc.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{doc.name}</span>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  ))}
                </div>
                {pendingCount > 0 && (
                  <Link href="/customer/upload">
                    <Button className="w-full gap-2" data-testid="button-upload-documents">
                      <FileText className="w-4 h-4" />
                      Upload Documents
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-base">Messages</CardTitle>
              <Link href="/customer/messages">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-messages">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMessages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`p-3 rounded-lg ${msg.unread ? "bg-primary/5 border border-primary/20" : "bg-muted/50"}`}
                    data-testid={`message-item-${msg.id}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{msg.from}</span>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                  </div>
                ))}
                <Link href="/customer/messages">
                  <Button variant="outline" className="w-full gap-2" data-testid="button-send-message">
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Action Required</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please upload your bank statement and re-upload your flight itinerary to continue with your application.
              </p>
              <Link href="/customer/upload">
                <Button size="sm" className="mt-2" data-testid="button-action-required">
                  Upload Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
