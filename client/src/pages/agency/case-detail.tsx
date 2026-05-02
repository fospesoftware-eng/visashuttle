import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, User, Calendar, FileText, 
  CheckCircle, AlertCircle, Clock, Send, Paperclip, Download,
  Brain, Lightbulb, RefreshCw, Copy, Check, ExternalLink, Share2,
  Loader2, MessageSquare, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { ProgressRing } from "@/components/progress-ring";
import { Timeline } from "@/components/timeline";
import { UploadDropzone } from "@/components/upload-dropzone";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Case, Document, Message, ActivityLog } from "@shared/schema";

function computeReadiness(c: Case): number {
  if (c.status === "approved") return 100;
  if (c.status === "submitted" || c.status === "under_review") return 85;
  if (c.status === "in_progress") return 60;
  if (c.status === "documents_required") return 40;
  return 20;
}

const docStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending Review", color: "text-amber-600", icon: Clock },
  approved: { label: "Approved", color: "text-emerald-600", icon: CheckCircle },
  rejected: { label: "Rejected", color: "text-red-600", icon: AlertCircle },
  needs_reupload: { label: "Needs Reupload", color: "text-orange-600", icon: AlertCircle },
};

function timeAgo(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: authData } = useCurrentUser();
  const agencySlug = authData?.tenantSlug || localStorage.getItem("agency_tenant_slug") || "demo-agency";

  const { data: caseData, isLoading: caseLoading } = useQuery<Case>({
    queryKey: ["/api/cases", id],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Case not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<Document[]>({
    queryKey: ["/api/cases", id, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}/documents`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["/api/cases", id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/tenants", caseData?.tenantId, "activity-logs"],
    queryFn: async () => {
      if (!caseData?.tenantId) return [];
      const res = await fetch(`/api/tenants/${caseData.tenantId}/activity-logs`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!caseData?.tenantId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/cases/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, senderRole: "agent", senderId: authData?.user?.id }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "messages"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const updateCaseStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Status updated" });
    },
  });

  const updateDocStatusMutation = useMutation({
    mutationFn: async ({ docId, status }: { docId: string; status: string }) => {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "documents"] });
      toast({ title: "Document status updated" });
    },
  });

  function inferDocType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes("passport")) return "passport";
    if (lower.includes("photo") || /\.(jpg|jpeg|png)$/i.test(filename)) return "photo";
    if (lower.includes("bank") || lower.includes("statement")) return "bank_statement";
    if (lower.includes("employ") || lower.includes("letter")) return "employment_letter";
    if (lower.includes("invit")) return "invitation_letter";
    if (lower.includes("itinerary") || lower.includes("flight")) return "flight_itinerary";
    if (lower.includes("hotel") || lower.includes("accommodation")) return "hotel_booking";
    return "other";
  }

  const uploadDocumentsMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!caseData) throw new Error("Case not loaded");
      const results = await Promise.all(
        files.map(async (file) => {
          const res = await fetch(`/api/cases/${id}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              tenantId: caseData.tenantId,
              name: file.name,
              type: inferDocType(file.name),
              status: "pending",
              fileUrl: null,
              notes: `Uploaded by agent (${(file.size / 1024).toFixed(0)} KB)`,
            }),
          });
          if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
          return res.json();
        })
      );
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "documents"] });
      toast({
        title: "Documents added",
        description: `${results.length} file${results.length !== 1 ? "s" : ""} attached to this case.`,
      });
    },
    onError: (e: Error) => {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    },
  });

  const requestSingleDocMutation = useMutation({
    mutationFn: async (doc: Document) => {
      const docLabel = doc.name || (doc.type || "document").replace(/_/g, " ");
      const content = `Hi ${caseData?.applicantName || ""}, the previously uploaded "${docLabel}" needs to be re-uploaded. Please log in to your portal and upload a fresh copy at your earliest convenience.`;
      const msgRes = await fetch(`/api/cases/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, senderRole: "agent", senderId: authData?.user?.id }),
      });
      if (!msgRes.ok) throw new Error("Failed to send request");
      return msgRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "messages"] });
      toast({ title: "Re-upload requested", description: "Customer has been notified via portal message." });
    },
    onError: (e: Error) => {
      toast({ title: "Could not send request", description: e.message, variant: "destructive" });
    },
  });

  const requestDocumentsMutation = useMutation({
    mutationFn: async () => {
      const content = `Hello ${caseData?.applicantName || ""}, please upload the remaining documents for your ${caseData?.visaType || "visa"} application via your portal at your earliest convenience. Let us know if you have any questions.`;
      const msgRes = await fetch(`/api/cases/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, senderRole: "agent", senderId: authData?.user?.id }),
      });
      if (!msgRes.ok) throw new Error("Failed to send message to customer");
      // Also flip case status so it shows up correctly
      const patchRes = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "documents_required" }),
      });
      if (!patchRes.ok) throw new Error("Message sent, but failed to update case status");
      return msgRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", id] });
      if (caseData?.tenantId) {
        queryClient.invalidateQueries({ queryKey: ["/api/tenants", caseData.tenantId, "cases"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tenants", caseData.tenantId, "activity-logs"] });
      }
      toast({
        title: "Request sent",
        description: "Customer notified via portal message and case marked as documents required.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Could not send request", description: e.message, variant: "destructive" });
    },
  });

  if (caseLoading) {
    return (
      <DashboardLayout type="agency">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout type="agency">
        <div className="text-center py-32">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">Case not found</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/app/cases">Back to Applications</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const readiness = computeReadiness(caseData);
  const customerPortalLink = caseData.referenceId
    ? `${window.location.origin}/w/${agencySlug}/login?ref=${caseData.referenceId}`
    : `${window.location.origin}/w/${agencySlug}/login`;

  const copyPortalLink = () => {
    navigator.clipboard.writeText(customerPortalLink);
    setLinkCopied(true);
    toast({ title: "Link copied!", description: "Share this link with your customer." });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const activityItems = activityLogs
    .filter(log => log.entityId === id || log.entityType === "case")
    .slice(-8).reverse()
    .map(log => ({
      id: log.id,
      action: log.action.replace(".", " ").replace(/\b\w/g, c => c.toUpperCase()),
      description: typeof log.details === "object" && log.details !== null
        ? Object.values(log.details).join(", ")
        : "",
      user: { name: "System" },
      timestamp: new Date(log.createdAt),
      type: log.action.includes("approved") ? "success" as const
        : log.action.includes("rejected") ? "error" as const
        : "default" as const,
    }));

  const initials = caseData.applicantName.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" data-testid="button-back">
              <Link href="/app/cases">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold font-mono" data-testid="text-case-id">{caseData.caseNumber}</h1>
                <StatusBadge status={caseData.status} />
                {caseData.priority === "urgent" && (
                  <Badge variant="destructive" className="gap-1">
                    <Flag className="w-3 h-3" /> Urgent
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">{caseData.visaType}{caseData.destinationCountry ? ` — ${caseData.destinationCountry}` : ""}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateCaseStatusMutation.mutate("under_review")}
              disabled={updateCaseStatusMutation.isPending}
              data-testid="button-mark-review"
            >
              <Clock className="w-4 h-4 mr-2" />
              Mark Under Review
            </Button>
            <Button
              size="sm"
              onClick={() => updateCaseStatusMutation.mutate("submitted")}
              disabled={updateCaseStatusMutation.isPending}
              data-testid="button-submit-application"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Application
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left sidebar */}
          <div className="space-y-4">
            {/* Applicant info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" /> Applicant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{caseData.applicantName}</p>
                    <p className="text-xs text-muted-foreground">{caseData.visaType}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {caseData.applicantDob && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>DOB: {caseData.applicantDob}</span>
                    </div>
                  )}
                  {caseData.travelDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Travel: {caseData.travelDate}</span>
                    </div>
                  )}
                  {caseData.referenceId && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono text-xs">{caseData.referenceId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Readiness score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Readiness Score
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <ProgressRing value={readiness} size={90} strokeWidth={8} />
                <div className="text-center">
                  <p className="text-sm font-semibold">
                    {readiness >= 85 ? "Ready to Submit" : readiness >= 60 ? "Getting There" : "Needs Attention"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {documents.filter(d => d.status === "approved").length} / {documents.length} docs approved
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            {documents.some(d => ["rejected", "needs_reupload", "pending"].includes(d.status)) && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {documents.filter(d => ["rejected", "needs_reupload"].includes(d.status)).map(doc => (
                    <div key={doc.id} className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-xs">
                      <p className="font-medium text-amber-800 dark:text-amber-300">{doc.name}</p>
                      <p className="text-amber-600 dark:text-amber-400">Needs replacement</p>
                    </div>
                  ))}
                  {documents.filter(d => d.status === "pending").map(doc => (
                    <div key={doc.id} className="p-2 rounded-lg bg-muted/50 text-xs">
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-muted-foreground">Awaiting review</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Customer Self-Service link */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary" />
                  Customer Portal Link
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Share with <span className="font-medium text-foreground">{caseData.applicantName}</span> to let them upload docs and track progress.
                </p>
                <div className="flex gap-1.5">
                  <Input
                    readOnly
                    value={customerPortalLink}
                    className="text-xs font-mono h-8 bg-background"
                    data-testid="input-customer-portal-link"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 shrink-0"
                    onClick={copyPortalLink}
                    data-testid="button-copy-portal-link"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => window.open(customerPortalLink, "_blank")}
                  data-testid="button-open-portal-link"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Portal
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main content — tabs */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList>
                <TabsTrigger value="documents" data-testid="tab-documents">
                  Documents
                  {documents.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{documents.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="messages" data-testid="tab-messages">
                  Messages
                  {messages.length > 0 && (
                    <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{messages.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
              </TabsList>

              {/* Documents tab */}
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-base">Document Center</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => requestDocumentsMutation.mutate()}
                      disabled={requestDocumentsMutation.isPending}
                      data-testid="button-request-documents"
                    >
                      {requestDocumentsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <MessageSquare className="w-4 h-4 mr-2" />
                      )}
                      Request Documents
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <UploadDropzone onUpload={(files) => files.length > 0 && uploadDocumentsMutation.mutate(files)} />

                    {docsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No documents uploaded yet</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {documents.map((doc) => {
                          const cfg = docStatusConfig[doc.status] || docStatusConfig.pending;
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={doc.id}
                              className="p-4 rounded-xl border bg-card hover-elevate transition-all"
                              data-testid={`document-${doc.id}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">{doc.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{(doc.type || "").replace(/_/g, " ")}</p>
                                  </div>
                                </div>
                              </div>

                              <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color} mb-3`}>
                                <Icon className="w-3.5 h-3.5" />
                                {cfg.label}
                              </div>

                              {doc.qualityScore !== null && doc.qualityScore !== undefined && (
                                <div className="space-y-1 mb-3">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Quality</span>
                                    <span className="font-semibold">{doc.qualityScore}%</span>
                                  </div>
                                  <Progress value={doc.qualityScore} className="h-1.5" />
                                </div>
                              )}

                              <div className="flex gap-2">
                                {doc.status === "pending" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex-1 text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      onClick={() => updateDocStatusMutation.mutate({ docId: doc.id, status: "approved" })}
                                      data-testid={`button-approve-doc-${doc.id}`}
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="flex-1 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => updateDocStatusMutation.mutate({ docId: doc.id, status: "needs_reupload" })}
                                      data-testid={`button-reject-doc-${doc.id}`}
                                    >
                                      <AlertCircle className="w-3 h-3 mr-1" /> Reject
                                    </Button>
                                  </>
                                )}
                                {doc.status === "approved" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 text-xs h-7"
                                    onClick={() => {
                                      if (doc.fileUrl) {
                                        window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
                                      } else {
                                        toast({
                                          title: "No file attached",
                                          description: "This document was logged without an uploaded file.",
                                        });
                                      }
                                    }}
                                    data-testid={`button-download-doc-${doc.id}`}
                                  >
                                    <Download className="w-3 h-3 mr-1" /> Download
                                  </Button>
                                )}
                                {doc.status === "needs_reupload" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-xs h-7"
                                    disabled={requestSingleDocMutation.isPending}
                                    onClick={() => requestSingleDocMutation.mutate(doc)}
                                    data-testid={`button-request-doc-${doc.id}`}
                                  >
                                    {requestSingleDocMutation.isPending ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-3 h-3 mr-1" />
                                    )}
                                    Request Again
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Messages tab */}
              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Conversation with {caseData.applicantName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="h-72 overflow-y-auto space-y-3 p-4 rounded-xl bg-muted/30">
                      {msgsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                          <p className="text-sm">No messages yet. Start the conversation.</p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isAgent = msg.senderRole === "agent" || msg.senderRole === "agency_owner" || msg.senderRole === "agency_staff";
                          return (
                            <div key={msg.id} className={`flex gap-3 ${isAgent ? "justify-end" : ""}`}>
                              {!isAgent && (
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
                                </Avatar>
                              )}
                              <div className={`max-w-[75%] ${isAgent ? "items-end" : ""} flex flex-col`}>
                                <div className={`p-3 rounded-xl text-sm ${
                                  isAgent
                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                    : "bg-card border rounded-tl-none"
                                }`}>
                                  {msg.content}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 px-1">
                                  {isAgent ? "You" : caseData.applicantName} · {timeAgo(msg.createdAt)}
                                </p>
                              </div>
                              {isAgent && (
                                <Avatar className="w-8 h-8 shrink-0">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {(authData?.user?.name || "AG").split(" ").map(n => n[0]).join("").slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Textarea
                        placeholder="Type a message to the applicant…"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[44px] max-h-32 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && message.trim()) {
                            e.preventDefault();
                            sendMessageMutation.mutate(message.trim());
                          }
                        }}
                        data-testid="input-message"
                      />
                      <Button
                        size="icon"
                        className="shrink-0"
                        disabled={!message.trim() || sendMessageMutation.isPending}
                        onClick={() => sendMessageMutation.mutate(message.trim())}
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Press Enter to send · Shift+Enter for new line</p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity tab */}
              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activityItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No activity logged yet</p>
                      </div>
                    ) : (
                      <Timeline items={activityItems} />
                    )}
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
