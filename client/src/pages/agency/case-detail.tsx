import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, FileText, 
  CheckCircle, AlertCircle, Clock, Send, Paperclip, Download,
  Brain, Lightbulb, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { ProgressRing } from "@/components/progress-ring";
import { Timeline } from "@/components/timeline";
import { UploadDropzone } from "@/components/upload-dropzone";

const caseData = {
  id: "VS-2024-001",
  applicant: {
    name: "John Smith",
    email: "john@email.com",
    phone: "+1 234 567 8901",
    nationality: "United States",
    passportNumber: "AB1234567",
    dateOfBirth: "1990-05-15"
  },
  visaType: "Schengen Tourist",
  destinationCountry: "France",
  travelDate: "2024-03-15",
  status: "in_progress",
  readinessScore: 75,
  createdAt: "2024-01-15",
  assignedTo: "Agent Sarah"
};

const documents = [
  { id: "1", name: "Passport Scan", type: "passport", status: "approved", qualityScore: 95 },
  { id: "2", name: "Photo", type: "photo", status: "approved", qualityScore: 88 },
  { id: "3", name: "Bank Statement", type: "bank_statement", status: "pending", qualityScore: null },
  { id: "4", name: "Flight Itinerary", type: "itinerary", status: "needs_reupload", qualityScore: 30 },
  { id: "5", name: "Hotel Booking", type: "accommodation", status: "pending", qualityScore: null },
];

const checklist = [
  { id: "1", item: "Valid Passport", completed: true },
  { id: "2", item: "Passport Photo (35x45mm)", completed: true },
  { id: "3", item: "Bank Statement (3 months)", completed: false },
  { id: "4", item: "Flight Reservation", completed: false },
  { id: "5", item: "Hotel Booking", completed: false },
  { id: "6", item: "Travel Insurance", completed: false },
  { id: "7", item: "Employment Letter", completed: false },
];

const activity = [
  { id: "1", action: "Passport scan approved", description: "Document passed all quality checks", user: { name: "AI System" }, timestamp: new Date(Date.now() - 1000 * 60 * 30), type: "success" as const },
  { id: "2", action: "Photo approved", description: "Meets biometric requirements", user: { name: "Agent Sarah" }, timestamp: new Date(Date.now() - 1000 * 60 * 60), type: "success" as const },
  { id: "3", action: "Flight itinerary rejected", description: "Document is blurry, please re-upload", user: { name: "AI System" }, timestamp: new Date(Date.now() - 1000 * 60 * 120), type: "error" as const },
  { id: "4", action: "Case created", description: "Schengen Tourist Visa application started", user: { name: "Agent Sarah" }, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), type: "default" as const },
];

const aiRecommendations = [
  { id: "1", priority: "high", action: "Request bank statement", reason: "Required for financial proof" },
  { id: "2", priority: "high", action: "Re-upload flight itinerary", reason: "Current document is not readable" },
  { id: "3", priority: "medium", action: "Add travel insurance", reason: "Mandatory for Schengen visa" },
  { id: "4", priority: "low", action: "Verify hotel dates", reason: "Should match flight itinerary" },
];

export default function CaseDetailPage() {
  const { id } = useParams();
  const [message, setMessage] = useState("");

  const completedItems = checklist.filter(item => item.completed).length;
  const checklistProgress = (completedItems / checklist.length) * 100;

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/app/cases">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold" data-testid="text-case-id">{caseData.id}</h1>
                <StatusBadge status={caseData.status} />
              </div>
              <p className="text-muted-foreground">{caseData.visaType} - {caseData.destinationCountry}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-send-reminder">
              <Send className="w-4 h-4 mr-2" />
              Send Reminder
            </Button>
            <Button data-testid="button-submit-application">
              Submit Application
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applicant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {caseData.applicant.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{caseData.applicant.name}</p>
                    <p className="text-sm text-muted-foreground">{caseData.applicant.nationality}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{caseData.applicant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{caseData.applicant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Travel: {caseData.travelDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  AI Readiness Score
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <ProgressRing value={caseData.readinessScore} size={100} strokeWidth={8} />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {caseData.readinessScore >= 80 ? "Ready to Submit" : 
                     caseData.readinessScore >= 50 ? "More Documents Needed" : "Just Getting Started"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {completedItems} of {checklist.length} items complete
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiRecommendations.map((rec) => (
                  <div key={rec.id} className="p-2 rounded-lg bg-muted/50 text-sm">
                    <p className="font-medium">{rec.action}</p>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList>
                <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
                <TabsTrigger value="checklist" data-testid="tab-checklist">Checklist</TabsTrigger>
                <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-base">Document Center</CardTitle>
                    <Button variant="outline" size="sm" data-testid="button-request-documents">
                      Request Documents
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <UploadDropzone onUpload={(files) => console.log(files)} />
                    
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id}
                          className="p-4 rounded-lg border bg-card hover-elevate"
                          data-testid={`document-${doc.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{doc.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{doc.type.replace('_', ' ')}</p>
                              </div>
                            </div>
                            <StatusBadge status={doc.status} />
                          </div>
                          {doc.qualityScore !== null && (
                            <div className="mt-3 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Quality</span>
                                <span className="font-medium">{doc.qualityScore}%</span>
                              </div>
                              <Progress value={doc.qualityScore} className="h-1.5" />
                            </div>
                          )}
                          <div className="mt-3 flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1">
                              <Download className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            {doc.status === "needs_reupload" && (
                              <Button variant="outline" size="sm" className="flex-1">
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Replace
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="checklist">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-base">Application Checklist</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {completedItems} / {checklist.length} complete
                      </span>
                    </div>
                    <Progress value={checklistProgress} className="h-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {checklist.map((item) => (
                        <div 
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            item.completed ? "bg-emerald-50 dark:bg-emerald-950/20" : "bg-muted/50"
                          }`}
                          data-testid={`checklist-item-${item.id}`}
                        >
                          {item.completed ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                          <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                            {item.item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Messages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-64 overflow-y-auto space-y-3 p-4 rounded-lg bg-muted/30">
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">SA</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-card p-3 rounded-lg rounded-tl-none max-w-[80%]">
                            <p className="text-sm">Hi John, please upload your bank statement for the last 3 months.</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Agent Sarah • 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <div className="flex-1 flex flex-col items-end">
                          <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none max-w-[80%]">
                            <p className="text-sm">Sure, I'll upload it today. Do you need anything else?</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">John Smith • 1 hour ago</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Textarea 
                        placeholder="Type a message..." 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[44px] max-h-32"
                        data-testid="input-message"
                      />
                      <Button size="icon" data-testid="button-send-message">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Timeline items={activity} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
