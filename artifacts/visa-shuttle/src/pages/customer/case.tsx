import { CheckCircle, Clock, FileText, Calendar, MapPin, Plane } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerLayout } from "@/components/layouts/customer-layout";
import { Stepper } from "@/components/stepper";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { Progress } from "@/components/ui/progress";

const caseData = {
  id: "VS-2024-001",
  visaType: "Schengen Tourist",
  country: "France",
  status: "in_progress",
  travelDate: "March 15, 2024",
  createdAt: "January 15, 2024",
  estimatedCompletion: "February 28, 2024"
};

const steps = [
  { id: "profile", title: "Profile Complete" },
  { id: "documents", title: "Documents" },
  { id: "review", title: "Under Review" },
  { id: "submitted", title: "Submitted" },
  { id: "approved", title: "Approved" },
];

const checklist = [
  { id: "1", item: "Valid Passport", completed: true, note: "Expires 2028" },
  { id: "2", item: "Passport Photo (35x45mm)", completed: true },
  { id: "3", item: "Bank Statement (3 months)", completed: false, note: "Required" },
  { id: "4", item: "Flight Reservation", completed: false, note: "Needs re-upload" },
  { id: "5", item: "Hotel Booking", completed: false },
  { id: "6", item: "Travel Insurance", completed: false },
  { id: "7", item: "Employment Letter", completed: false },
];

const activity = [
  { id: "1", action: "Photo approved", description: "Meets all biometric requirements", timestamp: new Date(Date.now() - 1000 * 60 * 60), type: "success" as const },
  { id: "2", action: "Passport scan approved", description: "Document verified successfully", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), type: "success" as const },
  { id: "3", action: "Flight itinerary rejected", description: "Document is blurry, please re-upload a clearer version", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), type: "error" as const },
  { id: "4", action: "Application started", description: "Schengen Tourist Visa for France", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), type: "default" as const },
];

export default function CustomerCasePage() {
  const completedItems = checklist.filter(item => item.completed).length;
  const progress = (completedItems / checklist.length) * 100;

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">My Visa Application</h1>
          <p className="text-muted-foreground">Case ID: {caseData.id}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={caseData.status} />
                </div>
                <h2 className="text-xl font-semibold">{caseData.visaType}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  {caseData.country}
                </div>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Plane className="w-4 h-4" />
                  Travel: {caseData.travelDate}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Est. completion: {caseData.estimatedCompletion}
                </div>
              </div>
            </div>
            <Stepper steps={steps} currentStep={1} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Document Checklist</CardTitle>
              <span className="text-sm text-muted-foreground">{completedItems}/{checklist.length} complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    item.completed ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-muted/50"
                  }`}
                  data-testid={`checklist-item-${item.id}`}
                >
                  <div className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                    )}
                    <div>
                      <span className={item.completed ? "text-muted-foreground" : ""}>{item.item}</span>
                      {item.note && (
                        <p className={`text-xs ${item.completed ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400"}`}>
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                  {!item.completed && (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline items={activity} />
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
