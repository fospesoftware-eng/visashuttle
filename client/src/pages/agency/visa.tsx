import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Stamp, Loader2, CheckCircle, XCircle, Search, ExternalLink,
  Clock, MessageSquare, Send, AlertCircle, RotateCcw, Plane,
} from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  VISA_PROCESSING_STATUSES, SUBMISSION_METHODS,
  type Case, type VisaProcessingStatus, type VisaStage,
} from "@shared/schema";

// ---- Status presentation helpers (icon + colour per sub-status) ----
const STATUS_TONE: Record<string, string> = {
  submitted_evisa:           "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  submitted_embassy:         "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  vfs_appointment_pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  vfs_appointment_completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  biometric_pending:         "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  biometric_completed:       "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  waiting_documents:         "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  application_delayed:       "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  passport_sent_collection:  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  passport_received:         "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function statusLabel(v: string | null | undefined): string {
  return VISA_PROCESSING_STATUSES.find((s) => s.value === v)?.label ?? "—";
}
function methodLabel(v: string | null | undefined): string {
  return SUBMISSION_METHODS.find((m) => m.value === v)?.label ?? "—";
}
function timeAgo(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return dt.toLocaleDateString();
}

// Statuses that imply free-form context (e.g. which docs are missing).
// We auto-open the comment textarea for these.
const COMMENT_REQUIRED = new Set<string>([
  "waiting_documents", "application_delayed",
]);

interface VisaStagePageProps {
  stage: VisaStage;
}

const STAGE_META: Record<VisaStage, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  emptyTitle: string;
  emptyDescription: string;
  accent: string; // utility tone for the header pill
}> = {
  not_started: {
    title: "Not Started",
    subtitle: "Applications still being prepared.",
    icon: Clock,
    emptyTitle: "Nothing here yet",
    emptyDescription: "Drafts and pending applications will appear here.",
    accent: "bg-muted text-muted-foreground",
  },
  processing: {
    title: "Visa Processing",
    subtitle: "Applications submitted and currently being processed by the embassy / VFS / eVisa portal.",
    icon: Loader2,
    emptyTitle: "No applications in processing",
    emptyDescription: "Once you submit an application from the wizard with a submission method, it'll appear here.",
    accent: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  approved: {
    title: "Approved Visas",
    subtitle: "Visa applications successfully approved.",
    icon: CheckCircle,
    emptyTitle: "No approved visas yet",
    emptyDescription: "Approved applications will appear here. Mark a case as 'Approved' from the Processing list.",
    accent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  rejected: {
    title: "Rejected Visas",
    subtitle: "Visa applications that were refused.",
    icon: XCircle,
    emptyTitle: "No rejected visas",
    emptyDescription: "Rejected applications will appear here so you can keep notes for the customer.",
    accent: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  },
};

export default function VisaStagePage({ stage }: VisaStagePageProps) {
  const { toast } = useToast();
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const meta = STAGE_META[stage];
  const Icon = meta.icon;

  const [search, setSearch] = useState("");
  const [statusEditCase, setStatusEditCase] = useState<Case | null>(null);
  const [pendingStatus, setPendingStatus] = useState<VisaProcessingStatus | "">("");
  const [pendingComment, setPendingComment] = useState("");

  // List the cases at the requested visa-stage. Re-fetch when stage prop changes
  // (the same component instance is rendered for /processing, /approved, /rejected).
  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ["/api/tenants", tenantId, "visa-cases", stage],
    queryFn: async () => {
      const res = await fetch(
        `/api/tenants/${tenantId}/visa-cases?stage=${stage}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to load visa cases");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // Single mutation handles all 3 actions (sub-status update, move to approved,
  // move to rejected) — the body shape is the same.
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/cases/${id}/visa-status`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "visa-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "cases"] });
      toast({ title: "Visa status updated" });
      setStatusEditCase(null);
      setPendingStatus("");
      setPendingComment("");
    },
    onError: (err: Error) => {
      toast({ title: "Could not update status", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) =>
      [c.caseNumber, c.referenceId, c.applicantName, c.destinationCountry, c.visaType, c.passportNumber]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [cases, search]);

  const openStatusDialog = (c: Case) => {
    setStatusEditCase(c);
    setPendingStatus((c.visaProcessingStatus as VisaProcessingStatus) ?? "");
    setPendingComment(c.visaStatusComment ?? "");
  };

  const submitStatusChange = () => {
    if (!statusEditCase) return;
    if (!pendingStatus) {
      toast({ title: "Pick a status", variant: "destructive" });
      return;
    }
    if (COMMENT_REQUIRED.has(pendingStatus) && !pendingComment.trim()) {
      toast({
        title: "A note is required",
        description: `Add a quick note explaining "${statusLabel(pendingStatus)}" so the team has context.`,
        variant: "destructive",
      });
      return;
    }
    updateStatusMutation.mutate({
      id: statusEditCase.id,
      body: {
        visaProcessingStatus: pendingStatus,
        visaStatusComment: pendingComment.trim() || null,
      },
    });
  };

  const moveToStage = (c: Case, target: VisaStage) => {
    updateStatusMutation.mutate({
      id: c.id,
      body: { visaStage: target },
    });
  };

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-lg ${meta.accent}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-visa-page-title">
                <Stamp className="w-5 h-5 text-muted-foreground" />
                {meta.title}
              </h1>
              <p className="text-muted-foreground text-sm max-w-xl">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" data-testid="badge-visa-count">
              {cases.length} {cases.length === 1 ? "case" : "cases"}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, case ID, passport, destination…"
                className="pl-9"
                data-testid="input-visa-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${meta.accent}`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="font-semibold">{meta.emptyTitle}</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">{meta.emptyDescription}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const subStatus = c.visaProcessingStatus;
              const tone = subStatus ? (STATUS_TONE[subStatus] ?? "bg-muted text-muted-foreground")
                                     : "bg-muted text-muted-foreground";
              return (
                <Card key={c.id} data-testid={`card-visa-case-${c.id}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Identity column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Link
                            href={`/app/cases/${c.id}`}
                            className="font-mono text-sm font-semibold hover:underline"
                            data-testid={`link-case-${c.id}`}
                          >
                            {c.caseNumber}
                          </Link>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {c.referenceId}
                          </Badge>
                          {stage === "processing" && subStatus && (
                            <Badge className={`${tone} border-0`} data-testid={`badge-substatus-${c.id}`}>
                              {statusLabel(subStatus)}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium truncate">{c.applicantName || "Untitled draft"}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Plane className="w-3 h-3" />
                            {c.destinationCountry} · {c.visaType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" /> {methodLabel(c.submissionMethod)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Updated {timeAgo(c.visaStatusUpdatedAt ?? c.updatedAt)}
                          </span>
                        </div>
                        {c.visaStatusComment && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1.5 flex items-start gap-1.5" data-testid={`text-comment-${c.id}`}>
                            <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="break-words">{c.visaStatusComment}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions column */}
                      <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                        {stage === "processing" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openStatusDialog(c)}
                              data-testid={`button-update-status-${c.id}`}
                            >
                              <Loader2 className="w-3.5 h-3.5 mr-1.5" /> Update Status
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                              onClick={() => moveToStage(c, "approved")}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-${c.id}`}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                              onClick={() => moveToStage(c, "rejected")}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reject-${c.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                            </Button>
                          </>
                        )}
                        {(stage === "approved" || stage === "rejected") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => moveToStage(c, "processing")}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-back-to-processing-${c.id}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Move back to Processing
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="sm" data-testid={`button-open-${c.id}`}>
                          <Link href={`/app/cases/${c.id}`}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Status update dialog */}
      <Dialog open={!!statusEditCase} onOpenChange={(o) => !o && setStatusEditCase(null)}>
        <DialogContent data-testid="dialog-update-status">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-4 h-4" />
              Update Visa Status
            </DialogTitle>
            <DialogDescription>
              {statusEditCase?.caseNumber} · {statusEditCase?.applicantName || "Untitled"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Processing status</label>
              <Select value={pendingStatus} onValueChange={(v) => setPendingStatus(v as VisaProcessingStatus)}>
                <SelectTrigger data-testid="select-processing-status">
                  <SelectValue placeholder="Choose a status…" />
                </SelectTrigger>
                <SelectContent>
                  {VISA_PROCESSING_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value} data-testid={`option-status-${s.value}`}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                Comment
                {COMMENT_REQUIRED.has(pendingStatus) && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                )}
              </label>
              <Textarea
                value={pendingComment}
                onChange={(e) => setPendingComment(e.target.value)}
                placeholder={
                  pendingStatus === "waiting_documents"
                    ? "Which documents are still needed? (e.g. updated bank statement, hotel booking)"
                    : pendingStatus === "application_delayed"
                    ? "What's the reason for the delay?"
                    : "Optional note for the team / customer"
                }
                rows={4}
                data-testid="textarea-status-comment"
              />
              {COMMENT_REQUIRED.has(pendingStatus) && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This status needs a short explanation so the customer + team know what's pending.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusEditCase(null)}
              data-testid="button-cancel-status"
            >
              Cancel
            </Button>
            <Button
              onClick={submitStatusChange}
              disabled={updateStatusMutation.isPending || !pendingStatus}
              data-testid="button-save-status"
            >
              {updateStatusMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
