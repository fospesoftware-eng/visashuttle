import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, User, Calendar, FileText, 
  CheckCircle, AlertCircle, Clock, Send, Paperclip, Download,
  Brain, Lightbulb, RefreshCw, Copy, Check, ExternalLink, Share2,
  Loader2, MessageSquare, Flag, Users, Plus, Trash2, Pencil, Mail, FileDown,
  Phone, MapPin, Globe, BookOpen, Hash, StickyNote, Plane,
  DollarSign, ClipboardCheck, ListChecks, Receipt, ChevronLeft, ChevronRight
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
import { AppointmentsPanel } from "@/components/appointments-panel";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Case, Document, Message, ActivityLog, CaseCoTraveller, CoTravellerRelationship, Appointment, Invoice, InvoiceSettings } from "@workspace/db";
import { CO_TRAVELLER_RELATIONSHIPS } from "@/shared/schema-constants";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

const RELATIONSHIP_LABELS: Record<CoTravellerRelationship, string> = {
  spouse: "Spouse", child: "Child", parent: "Parent", sibling: "Sibling",
  grandparent: "Grandparent", in_law: "In-law", partner: "Partner",
  friend: "Friend", colleague: "Colleague", relative: "Other relative", other: "Other",
};

/**
 * Wraps a long, horizontally-overflowing tab strip and adds smooth
 * left/right chevron buttons + edge fade. The arrows auto-hide when the
 * strip is fully scrolled in that direction or fits without overflow.
 * Also auto-scrolls the active tab into view when it changes.
 */
function ScrollableTabBar({ children, activeValue }: { children: React.ReactNode; activeValue: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  // Bring the active tab into view smoothly when it changes.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-state="active"]');
    if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeValue]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Edge fade gradients to hint at overflow (rendered BEFORE the
          chevron buttons so the buttons stack above them visually). */}
      <div
        className={`pointer-events-none absolute left-0 top-0 h-full w-10 z-10 bg-gradient-to-r from-background to-transparent transition-opacity ${
          canLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 h-full w-10 z-10 bg-gradient-to-l from-background to-transparent transition-opacity ${
          canRight ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        onClick={() => scrollBy(-220)}
        aria-label="Scroll tabs left"
        data-testid="button-tabs-scroll-left"
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border bg-background shadow-sm flex items-center justify-center transition-opacity hover:bg-accent ${
          canLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(220)}
        aria-label="Scroll tabs right"
        data-testid="button-tabs-scroll-right"
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border bg-background shadow-sm flex items-center justify-center transition-opacity hover:bg-accent ${
          canRight ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <div
        ref={scrollerRef}
        className="overflow-x-auto scroll-smooth no-scrollbar px-9"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
    </div>
  );
}

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
  } catch {
    return `${currency || "USD"} ${((cents || 0) / 100).toFixed(2)}`;
  }
}

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

type CoTravellerFormState = {
  name: string;
  relationship: CoTravellerRelationship | "";
  dob: string;
  passportNumber: string;
  nationality: string;
  notes: string;
};

const emptyCoTravellerForm: CoTravellerFormState = {
  name: "", relationship: "", dob: "", passportNumber: "", nationality: "", notes: "",
};

// Visa Copy upload — only rendered when the case has reached visaStage
// "approved". Stored inline as a data URL (≤ 2 MB) the same way appointment
// confirmations are. Replace clears + re-uploads in one action; Remove POSTs
// nulls so the card returns to its empty-state.
function VisaCopyCard({ caseId, caseData }: { caseId: string; caseData: Case }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: { visaCopyFileUrl: string | null; visaCopyFileName: string | null }) => {
      const res = await apiRequest("PATCH", `/api/cases/${caseId}/visa-copy`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
    onError: (e: Error) => toast({ title: "Could not save visa copy", description: e.message, variant: "destructive" }),
  });

  const handleFile = (file: File) => {
    if (file.size > 2_000_000) {
      toast({ title: "File too large", description: "Visa copy must be under 2 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => mutation.mutate({
      visaCopyFileUrl: String(reader.result || ""),
      visaCopyFileName: file.name,
    });
    reader.readAsDataURL(file);
  };

  const has = !!caseData.visaCopyFileUrl;

  return (
    <Card className="mb-4 border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20" data-testid="card-visa-copy">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Approved Visa Copy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {has ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-background border p-3">
              <div className="min-w-0 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate" data-testid="text-visa-copy-name">
                  {caseData.visaCopyFileName || "visa-copy"}
                </span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(caseData.visaCopyFileUrl!, "_blank", "noopener,noreferrer")}
                  data-testid="button-view-visa-copy"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Remove the visa copy?")) {
                      mutation.mutate({ visaCopyFileUrl: null, visaCopyFileName: null });
                    }
                  }}
                  disabled={mutation.isPending}
                  data-testid="button-remove-visa-copy"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              </div>
            </div>
            <Label className="text-xs text-muted-foreground">Replace with a new file</Label>
            <Input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              disabled={mutation.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
              data-testid="input-replace-visa-copy"
            />
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Upload the final approved visa (PDF or image, up to 2 MB) so the applicant can download it from the customer portal.
            </p>
            <Input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              disabled={mutation.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
              data-testid="input-upload-visa-copy"
            />
            {mutation.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CoTravellersCard({ caseId }: { caseId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = todayISO();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CaseCoTraveller | null>(null);
  const [form, setForm] = useState<CoTravellerFormState>(emptyCoTravellerForm);

  const { data: travellers = [], isLoading } = useQuery<CaseCoTraveller[]>({
    queryKey: ["/api/cases", caseId, "co-travellers"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/co-travellers`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!caseId,
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyCoTravellerForm);
    setDialogOpen(true);
  };

  const openEdit = (t: CaseCoTraveller) => {
    setEditing(t);
    setForm({
      name: t.name,
      relationship: (t.relationship as CoTravellerRelationship) ?? "",
      dob: t.dob ?? "",
      passportNumber: t.passportNumber ?? "",
      nationality: t.nationality ?? "",
      notes: t.notes ?? "",
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        relationship: form.relationship,
        dob: form.dob || null,
        passportNumber: form.passportNumber.trim() || null,
        nationality: form.nationality.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const res = await apiRequest("PATCH", `/api/co-travellers/${editing.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", `/api/cases/${caseId}/co-travellers`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "co-travellers"] });
      setDialogOpen(false);
      toast({ title: editing ? "Co-traveller updated" : "Co-traveller added" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save co-traveller", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/co-travellers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases", caseId, "co-travellers"] });
      toast({ title: "Co-traveller removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not remove", description: err.message, variant: "destructive" });
    },
  });

  const validateAndSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!form.relationship) {
      toast({ title: "Relationship is required", variant: "destructive" });
      return;
    }
    if (form.dob) {
      const d = new Date(form.dob);
      if (isNaN(d.getTime()) || d > new Date()) {
        toast({ title: "Date of birth cannot be in the future", variant: "destructive" });
        return;
      }
    }
    saveMutation.mutate();
  };

  return (
    <Card data-testid="card-co-travellers">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" /> Co-Travellers
          {travellers.length > 0 && (
            <span className="text-xs bg-muted rounded-full px-1.5">{travellers.length}</span>
          )}
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={openAdd}
              data-testid="button-add-co-traveller"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" data-testid="dialog-co-traveller">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit co-traveller" : "Add co-traveller"}</DialogTitle>
              <DialogDescription>
                Anyone travelling on the same trip as the applicant.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Full name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="As written in passport"
                  data-testid="input-dialog-co-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Relationship *</Label>
                <Select
                  value={form.relationship || undefined}
                  onValueChange={(v) => setForm({ ...form, relationship: v as CoTravellerRelationship })}
                >
                  <SelectTrigger data-testid="select-dialog-co-relationship">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {CO_TRAVELLER_RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>{RELATIONSHIP_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Date of birth</Label>
                  <Input
                    type="date"
                    value={form.dob}
                    max={today}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    data-testid="input-dialog-co-dob"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Passport number</Label>
                  <Input
                    value={form.passportNumber}
                    onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
                    data-testid="input-dialog-co-passport"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  data-testid="input-dialog-co-nationality"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  rows={2}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  data-testid="input-dialog-co-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-dialog-cancel">
                Cancel
              </Button>
              <Button
                onClick={validateAndSubmit}
                disabled={saveMutation.isPending}
                data-testid="button-dialog-save"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                {editing ? "Save changes" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : travellers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No co-travellers added. Click + to add a spouse, child or other companion.
          </p>
        ) : (
          travellers.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border p-2.5 text-xs space-y-1 hover-elevate"
              data-testid={`item-co-traveller-${t.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-muted-foreground capitalize">
                    {RELATIONSHIP_LABELS[(t.relationship as CoTravellerRelationship)] ?? t.relationship}
                  </p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => openEdit(t)}
                    data-testid={`button-edit-co-traveller-${t.id}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Remove ${t.name} from this case?`)) deleteMutation.mutate(t.id);
                    }}
                    data-testid={`button-delete-co-traveller-${t.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {(t.dob || t.passportNumber || t.nationality || t.passportGender) && (
                <div className="text-muted-foreground space-y-0.5 pt-1 border-t">
                  {t.dob && <p>DOB: {t.dob}</p>}
                  {t.passportNumber && <p className="font-mono">{t.passportNumber}</p>}
                  {(t.nationality || t.passportGender) && (
                    <p>
                      {t.nationality}
                      {t.nationality && t.passportGender ? " · " : ""}
                      {t.passportGender}
                    </p>
                  )}
                </div>
              )}
              {(t.passportSurname || t.passportGivenName || t.passportMiddleName) && (
                <div className="text-muted-foreground space-y-0.5 pt-1 border-t">
                  <p className="font-medium uppercase text-[10px] tracking-wide">Passport name</p>
                  {t.passportSurname && <p>Surname: {t.passportSurname}</p>}
                  {t.passportGivenName && <p>Given: {t.passportGivenName}</p>}
                  {t.passportMiddleName && <p>Middle: {t.passportMiddleName}</p>}
                </div>
              )}
              {(t.passportDateOfIssue || t.passportDateOfExpiry || t.passportPlaceOfIssue || t.passportPlaceOfBirth) && (
                <div className="text-muted-foreground space-y-0.5 pt-1 border-t">
                  {t.passportDateOfIssue && <p>Issued: {t.passportDateOfIssue}</p>}
                  {t.passportDateOfExpiry && <p>Expires: {t.passportDateOfExpiry}</p>}
                  {t.passportPlaceOfIssue && <p>Place of issue: {t.passportPlaceOfIssue}</p>}
                  {t.passportPlaceOfBirth && <p>Place of birth: {t.passportPlaceOfBirth}</p>}
                </div>
              )}
              {t.notes && (
                <p className="text-muted-foreground italic pt-1 border-t">{t.notes}</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

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
  const [location, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("destination");
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // The wizard redirects here with `?submitted=1` after a successful create
  // so we can show the post-submission success banner with PDF / Email actions.
  // Wouter's location string excludes the search part, so read it off window.
  const justSubmitted = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("submitted") === "1";

  const { data: authData } = useCurrentUser();
  const agencySlug = authData?.tenantSlug || (typeof window !== "undefined" ? localStorage.getItem("agency_tenant_slug") : "") || "";

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

  // Document mode: "self" = per-item checklist upload, "ai" = bulk drop + AI analysis
  const [docMode, setDocMode] = useState<"self" | "ai">("self");
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiResult, setAiResult] = useState<any>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const aiAnalyzeMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const res = await fetch(`/api/cases/${id}/documents/ai-analyze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileNames: files.map(f => f.name) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "AI analysis failed");
      return res.json();
    },
    onSuccess: (data) => { setAiResult(data); },
    onError: (e: Error) => toast({ title: "AI Analysis Failed", description: e.message, variant: "destructive" }),
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

  // Wizard-step tab data: co-travellers, appointments, invoices, invoice settings (for currency)
  const { data: coTravellers = [] } = useQuery<CaseCoTraveller[]>({
    queryKey: ["/api/cases", id, "co-travellers"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}/co-travellers`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: caseAppointments = [] } = useQuery<Appointment[]>({
    queryKey: ["/api/cases", id, "appointments"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}/appointments`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  // Document checklist for Self Mode — nationality-aware
  const caseNationality = (caseData as any)?.passportNationality || (caseData as any)?.nationality || "";
  const { data: docChecklist, isLoading: checklistLoading } = useQuery<any>({
    queryKey: ["/api/tenants", caseData?.tenantId, "document-checklist", caseData?.destinationCountry, caseData?.visaType, caseNationality],
    queryFn: async () => {
      if (!caseData?.tenantId || !caseData?.destinationCountry || !caseData?.visaType) return null;
      const params = new URLSearchParams({
        country: caseData.destinationCountry,
        visaType: caseData.visaType,
        ...(caseNationality ? { nationality: caseNationality } : {}),
      });
      const res = await fetch(
        `/api/tenants/${caseData.tenantId}/application-settings/checklists?${params}`,
        { credentials: "include" }
      );
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!caseData?.tenantId && !!caseData?.destinationCountry && !!caseData?.visaType,
  });

  const { data: caseInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/cases", id, "invoices"],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}/invoices`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: invoiceSettings } = useQuery<InvoiceSettings>({
    queryKey: ["/api/tenants", caseData?.tenantId, "invoice-settings"],
    queryFn: async () => {
      if (!caseData?.tenantId) return null as any;
      const res = await fetch(`/api/tenants/${caseData.tenantId}/invoice-settings`, { credentials: "include" });
      if (!res.ok) return null as any;
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

  const initials = (caseData.applicantName || "Untitled draft").split(" ").map(n => n[0]).join("").toUpperCase();

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
              asChild
              data-testid="button-download-pdf"
            >
              <a href={`/api/cases/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileDown className="w-4 h-4 mr-2" />
                Download PDF
              </a>
            </Button>
            <EmailCaseDialog caseData={caseData} />
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

        {/* Post-submission success banner — shown when redirected here from
            the wizard with ?submitted=1. Hidden after the user navigates away. */}
        {justSubmitted && (
          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">Application submitted successfully</p>
                <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
                  Download a PDF copy or email it directly to the applicant. The case is now in
                  <Link href="/app/visa/processing" className="font-medium underline mx-1">Visa → Processing</Link>.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/app/cases/${id}`, { replace: true })}
                data-testid="button-dismiss-success"
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Left sidebar */}
          <div className="space-y-4">
            {/* Applicant info — surfaces every field captured by the
                new-application wizard so the case-detail screen mirrors
                what the agent submitted in step 2. */}
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
                  <div className="min-w-0">
                    <p className="font-semibold truncate" data-testid="text-applicant-name">
                      {caseData.applicantName || "Untitled draft"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {caseData.visaType}{caseData.destinationCountry ? ` · ${caseData.destinationCountry}` : ""}
                    </p>
                  </div>
                </div>

                {/* Identity & travel dates */}
                <div className="space-y-1.5 text-sm">
                  {caseData.applicantDob && (
                    <div className="flex items-center gap-2 text-muted-foreground" data-testid="row-applicant-dob">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>DOB: {caseData.applicantDob}</span>
                    </div>
                  )}
                  {caseData.travelDate && (
                    <div className="flex items-center gap-2 text-muted-foreground" data-testid="row-applicant-travel">
                      <Plane className="w-3.5 h-3.5 shrink-0" />
                      <span>Travel: {new Date(caseData.travelDate as any).toLocaleDateString()}</span>
                    </div>
                  )}
                  {caseData.referenceId && (
                    <div className="flex items-center gap-2 text-muted-foreground" data-testid="row-applicant-ref">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono text-xs">{caseData.referenceId}</span>
                    </div>
                  )}
                </div>

                {/* Customer contact — captured in wizard step 2 */}
                {((caseData as any).customerEmail || (caseData as any).customerPhone) && (
                  <div className="space-y-1.5 text-sm pt-3 border-t">
                    {(caseData as any).customerEmail && (
                      <div className="flex items-center gap-2 text-muted-foreground" data-testid="row-applicant-email">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <a
                          href={`mailto:${(caseData as any).customerEmail}`}
                          className="truncate hover:underline"
                        >
                          {(caseData as any).customerEmail}
                        </a>
                      </div>
                    )}
                    {(caseData as any).customerPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground" data-testid="row-applicant-phone">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <a
                          href={`tel:${(caseData as any).customerPhone}`}
                          className="hover:underline"
                        >
                          {(caseData as any).customerPhone}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Passport block — only renders when at least one of the
                    structured passport fields is set. */}
                {(caseData.passportNumber || caseData.passportSurname || caseData.passportGivenName
                  || caseData.passportNationality || caseData.passportGender
                  || caseData.passportDateOfIssue || caseData.passportDateOfExpiry
                  || caseData.passportPlaceOfIssue || caseData.passportPlaceOfBirth
                  || caseData.passportFileUrl) && (
                  <div className="space-y-1.5 text-sm pt-3 border-t" data-testid="block-passport">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3" /> Passport
                    </p>
                    {caseData.passportNumber && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono">{caseData.passportNumber}</span>
                      </div>
                    )}
                    {(caseData.passportSurname || caseData.passportGivenName || caseData.passportMiddleName) && (
                      <div className="text-muted-foreground space-y-0.5 pl-5">
                        {caseData.passportSurname && <p className="text-xs">Surname: <span className="text-foreground">{caseData.passportSurname}</span></p>}
                        {caseData.passportGivenName && <p className="text-xs">Given: <span className="text-foreground">{caseData.passportGivenName}</span></p>}
                        {caseData.passportMiddleName && <p className="text-xs">Middle: <span className="text-foreground">{caseData.passportMiddleName}</span></p>}
                      </div>
                    )}
                    {(caseData.passportNationality || caseData.passportGender) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {caseData.passportNationality}
                          {caseData.passportNationality && caseData.passportGender ? " · " : ""}
                          {caseData.passportGender}
                        </span>
                      </div>
                    )}
                    {caseData.passportDateOfIssue && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Issued: {caseData.passportDateOfIssue}</span>
                      </div>
                    )}
                    {caseData.passportDateOfExpiry && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Expires: {caseData.passportDateOfExpiry}</span>
                      </div>
                    )}
                    {caseData.passportPlaceOfIssue && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>Place of issue: {caseData.passportPlaceOfIssue}</span>
                      </div>
                    )}
                    {caseData.passportPlaceOfBirth && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>Place of birth: {caseData.passportPlaceOfBirth}</span>
                      </div>
                    )}
                    {caseData.passportFileUrl && (
                      <a
                        href={caseData.passportFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        data-testid="link-passport-file"
                      >
                        <Paperclip className="w-3 h-3" /> View passport upload
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Application details — destination/visa/priority/submission/notes
                so the agent sees everything submitted in wizard steps 1, 3, 7. */}
            {(caseData.destinationCountry || caseData.visaType || caseData.priority
              || caseData.submissionMethod || caseData.notes) && (
              <Card data-testid="card-application-details">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Application Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {caseData.destinationCountry && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      <span>{caseData.destinationCountry}</span>
                    </div>
                  )}
                  {caseData.visaType && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>{caseData.visaType}</span>
                    </div>
                  )}
                  {caseData.priority && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Flag className="w-3.5 h-3.5 shrink-0" />
                      <span className="capitalize">Priority: {caseData.priority}</span>
                    </div>
                  )}
                  {caseData.submissionMethod && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Send className="w-3.5 h-3.5 shrink-0" />
                      <span className="uppercase">{caseData.submissionMethod}</span>
                    </div>
                  )}
                  {caseData.notes && (
                    <div className="pt-2 mt-2 border-t" data-testid="block-internal-notes">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1">
                        <StickyNote className="w-3 h-3" /> Internal notes
                      </p>
                      <p className="text-xs whitespace-pre-wrap">{caseData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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

            {/* Co-Travellers */}
            <CoTravellersCard caseId={id!} />

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
                  Share with <span className="font-medium text-foreground">{caseData.applicantName || "this applicant"}</span> to let them upload docs and track progress.
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
            {/* Visa copy upload — only after the case is approved. Stored
                inline as a data URL (≤2 MB) to mirror appointment confirmations. */}
            {caseData.visaStage === "approved" && (
              <VisaCopyCard caseId={id!} caseData={caseData} />
            )}
            <Tabs
              defaultValue="destination"
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <ScrollableTabBar activeValue={activeTab}>
                <TabsList className="w-max">
                  <TabsTrigger value="destination" data-testid="tab-destination">
                    <MapPin className="w-3.5 h-3.5 mr-1.5" /> Destination
                  </TabsTrigger>
                  <TabsTrigger value="applicant-tab" data-testid="tab-applicant">
                    <User className="w-3.5 h-3.5 mr-1.5" /> Applicant
                  </TabsTrigger>
                  <TabsTrigger value="travel" data-testid="tab-travel">
                    <Plane className="w-3.5 h-3.5 mr-1.5" /> Travel
                  </TabsTrigger>
                  <TabsTrigger value="co-travellers" data-testid="tab-co-travellers">
                    <Users className="w-3.5 h-3.5 mr-1.5" /> Co-Travellers
                    {coTravellers.length > 0 && (
                      <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{coTravellers.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="appointments" data-testid="tab-appointments">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Appointments
                    {caseAppointments.length > 0 && (
                      <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{caseAppointments.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="documents" data-testid="tab-documents">
                    <ListChecks className="w-3.5 h-3.5 mr-1.5" /> Documents
                    {documents.length > 0 && (
                      <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{documents.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="fees" data-testid="tab-fees">
                    <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Fees
                    {caseInvoices.length > 0 && (
                      <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{caseInvoices.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="review" data-testid="tab-review">
                    <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Review
                  </TabsTrigger>
                  <TabsTrigger value="messages" data-testid="tab-messages">
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Messages
                    {messages.length > 0 && (
                      <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{messages.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="activity" data-testid="tab-activity">
                    <Clock className="w-3.5 h-3.5 mr-1.5" /> Activity
                  </TabsTrigger>
                </TabsList>
              </ScrollableTabBar>

              {/* === Destination & Visa (wizard step 1) === */}
              <TabsContent value="destination" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Destination &amp; Visa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Destination Country</dt>
                        <dd className="font-medium" data-testid="field-destination-country">
                          {caseData.destinationCountry || <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Visa Type</dt>
                        <dd className="font-medium" data-testid="field-visa-type">
                          {caseData.visaType || <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Priority</dt>
                        <dd className="font-medium capitalize" data-testid="field-priority">
                          {caseData.priority || "normal"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reference ID</dt>
                        <dd className="font-mono text-xs" data-testid="field-reference">
                          {caseData.referenceId || <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* === Applicant (wizard step 2) === */}
              <TabsContent value="applicant-tab" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4" /> Applicant Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Full Name</dt>
                        <dd className="font-medium">{caseData.applicantName || <span className="text-muted-foreground">—</span>}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Date of Birth</dt>
                        <dd className="font-medium">{caseData.applicantDob || <span className="text-muted-foreground">—</span>}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
                        <dd className="font-medium break-all">{(caseData as any).customerEmail || <span className="text-muted-foreground">—</span>}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phone</dt>
                        <dd className="font-medium">{(caseData as any).customerPhone || <span className="text-muted-foreground">—</span>}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {(caseData.passportNumber || caseData.passportSurname || caseData.passportGivenName
                  || caseData.passportNationality || caseData.passportFileUrl) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Passport
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Passport Number</dt>
                          <dd className="font-mono">{caseData.passportNumber || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Nationality</dt>
                          <dd className="font-medium">{caseData.passportNationality || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Surname</dt>
                          <dd className="font-medium">{caseData.passportSurname || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Given Name</dt>
                          <dd className="font-medium">{caseData.passportGivenName || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Gender</dt>
                          <dd className="font-medium">{caseData.passportGender || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Place of Birth</dt>
                          <dd className="font-medium">{caseData.passportPlaceOfBirth || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Date of Issue</dt>
                          <dd className="font-medium">{caseData.passportDateOfIssue || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Date of Expiry</dt>
                          <dd className="font-medium">{caseData.passportDateOfExpiry || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Place of Issue</dt>
                          <dd className="font-medium">{caseData.passportPlaceOfIssue || <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                        {caseData.passportFileUrl && (
                          <div className="sm:col-span-2 pt-2">
                            <a
                              href={caseData.passportFileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                              data-testid="link-passport-file-tab"
                            >
                              <Paperclip className="w-3.5 h-3.5" /> View passport upload
                            </a>
                          </div>
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* === Travel (wizard step 3) === */}
              <TabsContent value="travel" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plane className="w-4 h-4" /> Travel Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Travel Date</dt>
                        <dd className="font-medium">
                          {caseData.travelDate
                            ? new Date(caseData.travelDate as any).toLocaleDateString()
                            : <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Return Date</dt>
                        <dd className="font-medium">
                          {(caseData as any).returnDate
                            ? new Date((caseData as any).returnDate).toLocaleDateString()
                            : <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Purpose of Travel</dt>
                        <dd className="font-medium">
                          {(caseData as any).travelPurpose || <span className="text-muted-foreground">—</span>}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Itinerary / Notes</dt>
                        <dd className="whitespace-pre-wrap text-sm">
                          {(caseData as any).itinerary || caseData.notes
                            || <span className="text-muted-foreground">No travel notes recorded.</span>}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* === Co-Travellers (wizard step 4) === */}
              <TabsContent value="co-travellers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" /> Co-Travellers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {coTravellers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No co-travellers on this application.</p>
                        <p className="text-xs mt-1">You can add them from the sidebar Co-Travellers card.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {coTravellers.map((ct) => (
                          <div
                            key={ct.id}
                            className="rounded-lg border p-3 bg-muted/20"
                            data-testid={`co-traveller-${ct.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold">{ct.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {ct.relationship ? RELATIONSHIP_LABELS[ct.relationship as CoTravellerRelationship] : "Relative"}
                                  {ct.dob ? ` · DOB ${ct.dob}` : ""}
                                  {ct.nationality ? ` · ${ct.nationality}` : ""}
                                </p>
                                {ct.passportNumber && (
                                  <p className="text-xs font-mono text-muted-foreground mt-1">
                                    Passport: {ct.passportNumber}
                                  </p>
                                )}
                                {ct.notes && (
                                  <p className="text-xs mt-1 whitespace-pre-wrap">{ct.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* === Appointments (wizard step 5) === */}
              <TabsContent value="appointments" className="space-y-4">
                <AppointmentsPanel
                  caseId={caseData.id}
                  destinationCountry={caseData.destinationCountry}
                />
              </TabsContent>

              {/* Documents tab */}
              <TabsContent value="documents" className="space-y-4">
                {/* Mode toggle */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-muted w-fit">
                    <button
                      onClick={() => { setDocMode("self"); setAiResult(null); setAiFiles([]); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${docMode === "self" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      data-testid="button-doc-mode-self"
                    >
                      <ListChecks className="w-4 h-4" />
                      Self Mode
                    </button>
                    <button
                      onClick={() => { setDocMode("ai"); setAiResult(null); setAiFiles([]); }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${docMode === "ai" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      data-testid="button-doc-mode-ai"
                    >
                      <Brain className="w-4 h-4" />
                      AI Mode
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestDocumentsMutation.mutate()}
                    disabled={requestDocumentsMutation.isPending}
                    data-testid="button-request-documents"
                  >
                    {requestDocumentsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                    Request Documents
                  </Button>
                </div>

                {/* ── SELF MODE ── */}
                {docMode === "self" && (
                  <div className="space-y-4">
                    {/* Checklist */}
                    {checklistLoading ? (
                      <Card>
                        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {caseNationality ? `Generating ${caseNationality} → ${caseData?.destinationCountry} checklist with AI…` : "Loading document checklist…"}
                        </CardContent>
                      </Card>
                    ) : docChecklist?.checklist && docChecklist.checklist.length > 0 ? (
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <CardTitle className="text-sm flex items-center gap-2">
                                <ListChecks className="w-4 h-4 text-blue-600" />
                                Required Documents
                              </CardTitle>
                              <p className="text-xs text-muted-foreground mt-1">
                                {caseNationality && <span className="font-medium text-foreground">{caseNationality}</span>}
                                {caseNationality && " → "}
                                <span className="font-medium text-foreground">{caseData?.destinationCountry}</span>
                                {" · "}{caseData?.visaType}
                                {docChecklist.source === "ai" && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-blue-600"><Brain className="w-3 h-3" />AI-generated</span>
                                )}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs font-normal shrink-0">
                              {documents.filter(d => d.status === "approved").length} / {docChecklist.checklist.filter((i: any) => i.required !== false).length} required complete
                            </Badge>
                          </div>

                          {/* Quick navigation anchors */}
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {docChecklist.checklist.map((item: any, idx: number) => {
                              const name = item.name || item.documentType || `Doc ${idx + 1}`;
                              const matched = documents.find((d: Document) =>
                                d.name?.toLowerCase().includes(name.toLowerCase().slice(0, 8)) ||
                                (d.type || "").toLowerCase().replace(/_/g, " ").includes(name.toLowerCase().slice(0, 8))
                              );
                              return (
                                <a
                                  key={idx}
                                  href={`#doc-item-${idx}`}
                                  onClick={(e) => { e.preventDefault(); document.getElementById(`doc-item-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                                  className={`text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors ${matched?.status === "approved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : matched ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                                >
                                  {idx + 1}. {name.length > 18 ? name.slice(0, 18) + "…" : name}
                                </a>
                              );
                            })}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          {docChecklist.checklist.map((item: any, idx: number) => {
                            const name = item.name || item.documentType || `Document ${idx + 1}`;
                            const matched = documents.find((d: Document) =>
                              d.name?.toLowerCase().includes(name.toLowerCase().slice(0, 8)) ||
                              (d.type || "").toLowerCase().replace(/_/g, " ").includes(name.toLowerCase().slice(0, 8))
                            );
                            return (
                              <div key={idx} id={`doc-item-${idx}`} className={`flex items-start gap-3 p-3 rounded-lg border scroll-mt-4 transition-all ${matched?.status === "approved" ? "bg-emerald-50/40 border-emerald-100" : matched ? "bg-amber-50/40 border-amber-100" : "bg-card"}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${matched?.status === "approved" ? "bg-emerald-100 text-emerald-600" : matched ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                                  {matched?.status === "approved" ? <CheckCircle className="w-3.5 h-3.5" /> : matched ? <Clock className="w-3.5 h-3.5" /> : <span>{idx + 1}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold">{name}</p>
                                  {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                                  {matched ? (
                                    <p className={`text-xs mt-1 font-medium flex items-center gap-1 ${matched.status === "approved" ? "text-emerald-600" : "text-amber-600"}`}>
                                      <FileText className="w-3 h-3" /> {matched.name} — {matched.status === "approved" ? "Approved" : matched.status === "pending" ? "Pending review" : matched.status.replace(/_/g, " ")}
                                    </p>
                                  ) : (
                                    <p className="text-xs mt-1 text-slate-400 italic">Not yet uploaded</p>
                                  )}
                                </div>
                                <Badge variant="outline" className={`text-xs shrink-0 mt-0.5 ${item.required !== false ? "border-red-200 text-red-600" : "border-slate-200 text-slate-500"}`}>
                                  {item.required !== false ? "Required" : "Optional"}
                                </Badge>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    ) : !checklistLoading && caseData?.destinationCountry && caseData?.visaType ? (
                      <Card className="border-dashed">
                        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          No checklist available for {caseData.destinationCountry} {caseData.visaType}. You can configure one in Agency Settings → Application Settings.
                        </CardContent>
                      </Card>
                    ) : null}

                    {/* Upload zone */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Upload Documents</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <UploadDropzone onUpload={(files) => files.length > 0 && uploadDocumentsMutation.mutate(files)} />

                        {docsLoading ? (
                          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
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
                                <div key={doc.id} className="p-4 rounded-xl border bg-card hover-elevate transition-all" data-testid={`document-${doc.id}`}>
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
                                    <Icon className="w-3.5 h-3.5" />{cfg.label}
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
                                        <Button variant="ghost" size="sm" className="flex-1 text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => updateDocStatusMutation.mutate({ docId: doc.id, status: "approved" })} data-testid={`button-approve-doc-${doc.id}`}>
                                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                        </Button>
                                        <Button variant="ghost" size="sm" className="flex-1 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => updateDocStatusMutation.mutate({ docId: doc.id, status: "needs_reupload" })} data-testid={`button-reject-doc-${doc.id}`}>
                                          <AlertCircle className="w-3 h-3 mr-1" /> Reject
                                        </Button>
                                      </>
                                    )}
                                    {doc.status === "approved" && (
                                      <Button variant="ghost" size="sm" className="flex-1 text-xs h-7" onClick={() => { if (doc.fileUrl) window.open(doc.fileUrl, "_blank", "noopener,noreferrer"); else toast({ title: "No file attached" }); }} data-testid={`button-download-doc-${doc.id}`}>
                                        <Download className="w-3 h-3 mr-1" /> Download
                                      </Button>
                                    )}
                                    {doc.status === "needs_reupload" && (
                                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7" disabled={requestSingleDocMutation.isPending} onClick={() => requestSingleDocMutation.mutate(doc)} data-testid={`button-request-doc-${doc.id}`}>
                                        {requestSingleDocMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
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
                  </div>
                )}

                {/* ── AI MODE ── */}
                {docMode === "ai" && (
                  <div className="space-y-4">
                    <Card className="border-blue-100">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Brain className="w-4 h-4 text-blue-600" />
                          AI Document Analysis
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          Drop all available documents. AI will identify each file, detect missing required documents, and flag expired ones — based on the destination country and visa type.
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Drop zone */}
                        <div
                          className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50/40 hover:bg-blue-50/70 transition-colors cursor-pointer"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dropped = Array.from(e.dataTransfer.files);
                            setAiFiles(prev => {
                              const names = new Set(prev.map(f => f.name));
                              return [...prev, ...dropped.filter(f => !names.has(f.name))];
                            });
                            setAiResult(null);
                          }}
                          onClick={() => aiFileInputRef.current?.click()}
                          data-testid="ai-dropzone"
                        >
                          <Brain className="w-10 h-10 mx-auto mb-3 text-blue-400" />
                          <p className="text-sm font-medium text-blue-700">Drop all your documents here</p>
                          <p className="text-xs text-blue-500 mt-1">or click to browse — PDF, JPG, PNG, DOCX accepted</p>
                          <input
                            ref={aiFileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                            className="hidden"
                            onChange={(e) => {
                              const picked = Array.from(e.target.files || []);
                              setAiFiles(prev => {
                                const names = new Set(prev.map(f => f.name));
                                return [...prev, ...picked.filter(f => !names.has(f.name))];
                              });
                              setAiResult(null);
                              e.target.value = "";
                            }}
                          />
                        </div>

                        {/* File list */}
                        {aiFiles.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-muted-foreground">{aiFiles.length} file{aiFiles.length !== 1 ? "s" : ""} selected</p>
                              <button className="text-xs text-red-500 hover:underline" onClick={() => { setAiFiles([]); setAiResult(null); }}>Clear all</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {aiFiles.map((f, i) => (
                                <span key={i} className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 text-blue-700">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  {f.name}
                                  <button className="ml-1 text-blue-400 hover:text-red-500" onClick={() => setAiFiles(prev => prev.filter((_, j) => j !== i))}>×</button>
                                </span>
                              ))}
                            </div>
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
                              onClick={() => aiAnalyzeMutation.mutate(aiFiles)}
                              disabled={aiAnalyzeMutation.isPending}
                              data-testid="button-ai-analyze"
                            >
                              {aiAnalyzeMutation.isPending ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing with AI…</>
                              ) : (
                                <><Brain className="w-4 h-4 mr-2" /> Analyse Documents with AI</>
                              )}
                            </Button>
                          </div>
                        )}

                        {/* AI Result */}
                        {aiResult && (
                          <div className="space-y-4 pt-2">
                            {/* Summary bar */}
                            <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${aiResult.summary?.overallStatus === "complete" ? "bg-emerald-50 border-emerald-200" : aiResult.summary?.overallStatus === "action_required" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${aiResult.summary?.overallStatus === "complete" ? "text-emerald-700" : aiResult.summary?.overallStatus === "action_required" ? "text-red-700" : "text-amber-700"}`}>
                                  {aiResult.summary?.overallStatus === "complete" ? "✓ All documents complete" : aiResult.summary?.overallStatus === "action_required" ? "⚠ Action required" : "Documents incomplete"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {aiResult.summary?.identified ?? 0} identified · {aiResult.summary?.expired ?? 0} expired · {aiResult.summary?.missing ?? 0} missing
                                </p>
                              </div>
                              {aiResult.country && <Badge variant="outline" className="text-xs">{aiResult.country} · {aiResult.visaType}</Badge>}
                            </div>

                            {/* Identified documents */}
                            {aiResult.identified?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Identified Documents</p>
                                <div className="space-y-2">
                                  {aiResult.identified.map((item: any, i: number) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.status === "valid" ? "bg-emerald-100 text-emerald-600" : item.status === "expired" || item.status === "likely_expired" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                                        {item.status === "valid" ? <CheckCircle className="w-3 h-3" /> : item.status === "expired" || item.status === "likely_expired" ? <AlertCircle className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{item.documentType}</p>
                                        <p className="text-xs text-muted-foreground">{item.fileName}</p>
                                        {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                                        {item.expiryDate && <p className={`text-xs mt-0.5 font-medium ${item.status === "expired" || item.status === "likely_expired" ? "text-red-600" : "text-emerald-600"}`}>Expiry: {item.expiryDate}</p>}
                                      </div>
                                      <Badge variant="outline" className={`text-xs shrink-0 ${item.status === "valid" ? "border-emerald-200 text-emerald-700" : item.status === "expired" || item.status === "likely_expired" ? "border-red-200 text-red-700" : "border-slate-200 text-slate-600"}`}>
                                        {item.status === "likely_expired" ? "Likely Expired" : item.status === "unrecognised" ? "Unrecognised" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Missing documents */}
                            {aiResult.missing?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Missing Documents</p>
                                <div className="space-y-2">
                                  {aiResult.missing.map((item: any, i: number) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-red-100 bg-red-50/40">
                                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-red-800">{item.documentType}</p>
                                        {item.notes && <p className="text-xs text-red-600 mt-0.5">{item.notes}</p>}
                                      </div>
                                      <Badge variant="outline" className={`text-xs shrink-0 ${item.priority === "required" ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700"}`}>
                                        {item.priority === "required" ? "Required" : "Recommended"}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Button variant="outline" size="sm" className="w-full" onClick={() => { setAiResult(null); setAiFiles([]); }}>
                              <RefreshCw className="w-4 h-4 mr-2" /> Re-analyse
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* === Fees (wizard step 7) === */}
              <TabsContent value="fees" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Fees &amp; Invoices
                    </CardTitle>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      data-testid="button-create-invoice"
                    >
                      <Link href={`/app/accounting/invoices?caseId=${caseData.id}`}>
                        <Receipt className="w-3.5 h-3.5 mr-1.5" /> Manage Invoices
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {caseInvoices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No invoices yet for this application.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const totalBilled = caseInvoices.reduce((s, i) => s + (i.total || 0), 0);
                          const totalPaid = caseInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
                          const outstanding = Math.max(0, totalBilled - totalPaid);
                          const cur = invoiceSettings?.currency || "USD";
                          return (
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="rounded-lg border p-3">
                                <p className="text-xs text-muted-foreground">Billed</p>
                                <p className="font-semibold tabular-nums" data-testid="text-fees-billed">{formatMoney(totalBilled, cur)}</p>
                              </div>
                              <div className="rounded-lg border p-3">
                                <p className="text-xs text-muted-foreground">Paid</p>
                                <p className="font-semibold tabular-nums text-emerald-600" data-testid="text-fees-paid">{formatMoney(totalPaid, cur)}</p>
                              </div>
                              <div className="rounded-lg border p-3">
                                <p className="text-xs text-muted-foreground">Outstanding</p>
                                <p className="font-semibold tabular-nums text-amber-600" data-testid="text-fees-outstanding">{formatMoney(outstanding, cur)}</p>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="space-y-2">
                          {caseInvoices.map((inv) => (
                            <Link key={inv.id} href={`/app/accounting/invoices/${inv.id}`} asChild>
                              <a
                                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover-elevate no-underline text-foreground"
                                data-testid={`invoice-row-${inv.id}`}
                              >
                                <div className="min-w-0">
                                  <p className="font-mono text-sm font-semibold">{inv.invoiceNumber}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {inv.issuedAt ? new Date(inv.issuedAt as any).toLocaleDateString() : "—"}
                                    {inv.dueDate ? ` · due ${new Date(inv.dueDate as any).toLocaleDateString()}` : ""}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-semibold tabular-nums">
                                    {formatMoney(inv.total || 0, invoiceSettings?.currency || "USD")}
                                  </p>
                                  <Badge variant="outline" className="text-[10px] capitalize">{inv.status}</Badge>
                                </div>
                              </a>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* === Review (wizard step 8) === */}
              <TabsContent value="review" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4" /> Application Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="mt-1"><StatusBadge status={caseData.status} /></div>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Co-Travellers</p>
                        <p className="font-semibold tabular-nums" data-testid="review-cotravellers-count">{coTravellers.length}</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Appointments</p>
                        <p className="font-semibold tabular-nums" data-testid="review-appointments-count">{caseAppointments.length}</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">Documents</p>
                        <p className="font-semibold tabular-nums">
                          <span className="text-emerald-600">{documents.filter(d => d.status === "approved").length}</span>
                          <span className="text-muted-foreground"> / {documents.length}</span>
                        </p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm pt-2 border-t">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Submission Method</dt>
                        <dd className="font-medium uppercase">{caseData.submissionMethod || <span className="text-muted-foreground normal-case">—</span>}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Priority</dt>
                        <dd className="font-medium capitalize">{caseData.priority || "normal"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Created</dt>
                        <dd className="font-medium">{caseData.createdAt ? new Date(caseData.createdAt).toLocaleString() : "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Last Updated</dt>
                        <dd className="font-medium">{caseData.updatedAt ? new Date(caseData.updatedAt).toLocaleString() : "—"}</dd>
                      </div>
                      {caseData.notes && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Internal Notes</dt>
                          <dd className="text-sm whitespace-pre-wrap">{caseData.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Messages tab */}
              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Conversation with {caseData.applicantName || "applicant"}
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
                                  {isAgent ? "You" : (caseData.applicantName || "Applicant")} · {timeAgo(msg.createdAt)}
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

// ---------------------------------------------------------------------------
// EmailCaseDialog — sends the case-summary PDF to the applicant by email.
// Mirrors the invoice email pattern: optimistically uses the configured
// transport (Resend) on the server; if the server returns a `fallback.mailto`
// link (no transport configured), open it so the agent can send manually.
// ---------------------------------------------------------------------------
function EmailCaseDialog({ caseData }: { caseData: Case }) {
  const [open, setOpen] = useState(false);
  // customerEmail isn't part of the typed Case schema yet (added via payload
  // pass-through in MemStorage) — cast for now so the dialog can pre-fill.
  const [to, setTo] = useState((caseData as any).customerEmail || "");
  const [subject, setSubject] = useState(
    `Your visa application — ${caseData.caseNumber}`,
  );
  const [body, setBody] = useState(
    `Hi ${caseData.applicantName || "there"},\n\n` +
      `Please find attached a copy of your visa application (${caseData.caseNumber}) ` +
      `for ${caseData.visaType}${caseData.destinationCountry ? ` to ${caseData.destinationCountry}` : ""}.\n\n` +
      `We'll keep you posted as the application progresses.\n\nThank you.`,
  );
  const { toast } = useToast();

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cases/${caseData.id}/email`, {
        to: to.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      // Server returns `{ fallback: { mailto } }` when no email transport is
      // configured — open the user's mail client as a graceful degradation.
      if (data?.fallback?.mailto) {
        window.location.href = data.fallback.mailto;
        toast({
          title: "Opened your mail client",
          description: "No email service is configured — drafted the message in your mail app.",
        });
      } else {
        toast({ title: "Email sent", description: `Sent to ${to}` });
      }
      setOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-email-applicant">
          <Mail className="w-4 h-4 mr-2" />
          Email Applicant
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-email-applicant">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email application to applicant
          </DialogTitle>
          <DialogDescription>
            We'll attach the case summary PDF for {caseData.caseNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="email-to" className="text-sm">To</Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              data-testid="input-email-to"
            />
          </div>
          <div>
            <Label htmlFor="email-subject" className="text-sm">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-email-subject"
            />
          </div>
          <div>
            <Label htmlFor="email-body" className="text-sm">Message</Label>
            <Textarea
              id="email-body"
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              data-testid="textarea-email-body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="button-email-cancel">
            Cancel
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !to.trim()}
            data-testid="button-email-send"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
