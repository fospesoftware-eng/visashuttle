import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Copy,
  Edit2,
  ExternalLink,
  FileText,
  GraduationCap,
  ListChecks,
  Loader2,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest } from "@/lib/queryClient";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUSES = [
  ["new_enquiry", "New Enquiry"],
  ["profile_created", "Profile Created"],
  ["counselling_scheduled", "Counselling Scheduled"],
  ["counselling_completed", "Counselling Completed"],
  ["course_shortlisted", "Course Shortlisted"],
  ["university_shortlisted", "University Shortlisted"],
  ["documents_pending", "Documents Pending"],
  ["admission_application_ready", "Admission Application Ready"],
  ["admission_applied", "Admission Applied"],
  ["offer_received", "Offer Received"],
  ["fee_payment_pending", "Fee Payment Pending"],
  ["visa_preparation", "Visa Preparation"],
  ["visa_ready", "Visa Ready"],
  ["visa_applied", "Visa Applied"],
  ["visa_approved", "Visa Approved"],
  ["visa_refused", "Visa Refused"],
  ["closed_not_interested", "Closed / Not Interested"],
] as const;

const COUNSELLING_MENUS = [
  { key: "dashboard", label: "Dashboard", description: "Overview metrics", icon: BarChart3 },
  { key: "students", label: "Students", description: "Profiles & enquiries", icon: Users },
  { key: "sessions", label: "Sessions", description: "Counselling appointments", icon: CalendarClock },
  { key: "shortlists", label: "Shortlists", description: "Courses & universities", icon: GraduationCap },
  { key: "admissions", label: "Admissions", description: "Offer & application", icon: ClipboardCheck },
  { key: "documents", label: "Documents", description: "Student documents", icon: FileText },
  { key: "readiness", label: "Visa Readiness", description: "Risk & action plan", icon: ShieldAlert },
  { key: "tasks", label: "Tasks", description: "Follow-ups & reminders", icon: ListChecks },
  { key: "ai", label: "AI Centre", description: "Assessment & SOP", icon: Brain },
  { key: "portal", label: "Student Portal", description: "Student-facing link", icon: BookOpen },
] as const;

const SESSION_MODES = ["video", "phone", "in_person", "whatsapp"] as const;
const SESSION_STATUSES = ["scheduled", "completed", "cancelled", "rescheduled"] as const;
const SHORTLIST_STATUSES = ["suggested", "shortlisted", "applied", "offer_received", "rejected", "deferred"] as const;
const ADMISSION_STATUSES = ["not_started", "in_progress", "submitted", "under_review", "conditional_offer", "unconditional_offer", "rejected", "deferred"] as const;
const OFFER_STATUSES = ["not_received", "conditional", "unconditional", "rejected"] as const;
const TASK_TYPES = ["follow_up", "document_request", "session_reminder", "fee_reminder", "visa_appointment", "other"] as const;
const TASK_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;
const DOC_STATUSES = ["pending", "received", "verified", "rejected", "expired"] as const;

const statusLabel = (v: string) => STATUSES.find(([k]) => k === v)?.[1] ?? v.replace(/_/g, " ");
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const riskClass: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
function scoreTone(s: number) { return s >= 75 ? "text-emerald-600" : s >= 50 ? "text-amber-600" : "text-red-600"; }
function docStatusColor(s: string) {
  return { received: "bg-emerald-100 text-emerald-700", verified: "bg-blue-100 text-blue-700", rejected: "bg-red-100 text-red-700", expired: "bg-orange-100 text-orange-700", pending: "bg-slate-100 text-slate-600" }[s] ?? "bg-slate-100 text-slate-600";
}
function toDatetimeLocal(d: any) { if (!d) return ""; try { return new Date(d).toISOString().slice(0, 16); } catch { return ""; } }

// ─── Main Component ──────────────────────────────────────────────────────────

export default function CounsellingPage() {
  const { data: current } = useCurrentUser();
  const tenantId = current?.user?.tenantId || current?.tenant?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [activeMenu, setActiveMenu] = useState<(typeof COUNSELLING_MENUS)[number]["key"]>("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  // Dialogs
  const [sessionDialog, setSessionDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [shortlistDialog, setShortlistDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [admissionDialog, setAdmissionDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [docNotesDialog, setDocNotesDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [sopViewDialog, setSopViewDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; collection: string; id: string; label: string } | null>(null);

  // Create student form
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", whatsappNumber: "", nationality: "", currentCountry: "",
    preferredDestinations: "", preferredIntake: "", preferredCourse: "", budgetRange: "", leadSource: "", status: "new_enquiry",
  });

  const studentsQuery = useQuery<any[]>({
    queryKey: ["/api/tenants", tenantId, "counselling", "students"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/counselling/students`, { credentials: "include" });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || "Could not load counselling students"); }
      return res.json();
    },
    enabled: !!tenantId,
  });

  const statsQuery = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "counselling", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/counselling/stats`, { credentials: "include" });
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error || "Could not load counselling stats"); }
      return res.json();
    },
    enabled: !!tenantId,
  });

  const detailQuery = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "counselling", "students", selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/counselling/students/${selectedId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load student detail");
      return res.json();
    },
    enabled: !!tenantId && !!selectedId,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "counselling"] });
    if (selectedId) qc.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "counselling", "students", selectedId] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Agency account is not linked to a tenant.");
      return (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students`, {
        ...form,
        preferredDestinations: form.preferredDestinations.split(",").map(s => s.trim()).filter(Boolean),
      })).json();
    },
    onSuccess: (student: any) => {
      setCreateOpen(false);
      setSelectedId(student.id);
      setForm({ fullName: "", email: "", phone: "", whatsappNumber: "", nationality: "", currentCountry: "", preferredDestinations: "", preferredIntake: "", preferredCourse: "", budgetRange: "", leadSource: "", status: "new_enquiry" });
      refresh();
      toast({ title: "Student profile created" });
    },
    onError: (e: any) => toast({ title: "Unable to create student", description: e.message, variant: "destructive" }),
  });

  const updateStudentMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("PATCH", `/api/tenants/${tenantId}/counselling/students/${selectedId}`, data)).json(),
    onSuccess: () => { refresh(); toast({ title: "Profile updated" }); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const addRecordMutation = useMutation({
    mutationFn: async ({ collection, data }: any) =>
      (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students/${selectedId}/${collection}`, data)).json(),
    onSuccess: () => { refresh(); toast({ title: "Record added" }); },
    onError: (e: any) => toast({ title: "Could not add record", description: e.message, variant: "destructive" }),
  });

  const updateRecordMutation = useMutation({
    mutationFn: async ({ collection, id, data }: any) =>
      (await apiRequest("PATCH", `/api/tenants/${tenantId}/counselling/${collection}/${id}`, data)).json(),
    onSuccess: () => { refresh(); toast({ title: "Updated" }); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async ({ collection, id }: any) =>
      (await apiRequest("DELETE", `/api/tenants/${tenantId}/counselling/${collection}/${id}`, undefined)).json(),
    onSuccess: () => { setDeleteConfirm(null); refresh(); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const aiMutation = useMutation({
    mutationFn: async (type: "assessment" | "sop") =>
      (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students/${selectedId}/${type === "assessment" ? "ai-assessment" : "sop-draft"}`, {})).json(),
    onSuccess: (data: any) => {
      refresh();
      if (data.assessmentType === "sop_draft") setSopViewDialog({ open: true, item: data });
      toast({ title: "AI output generated" });
    },
    onError: (e: any) => toast({ title: "AI action failed", description: e.message, variant: "destructive" }),
  });

  const portalMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students/${selectedId}/portal`, {})).json(),
    onSuccess: (data: any) => { refresh(); toast({ title: "Student portal enabled", description: data.portalUrl }); },
  });

  const students = studentsQuery.data ?? [];
  const stats = statsQuery.data ?? {};
  const selected = detailQuery.data;
  const setupError = studentsQuery.error instanceof Error ? studentsQuery.error.message : "";

  const filtered = useMemo(() => students.filter(s => {
    const hay = `${s.fullName} ${s.email ?? ""} ${s.phone ?? ""} ${s.preferredCourse ?? ""}`.toLowerCase();
    return hay.includes(search.toLowerCase()) && (statusFilter === "all" || s.status === statusFilter);
  }), [students, search, statusFilter]);

  const statusSummary = useMemo(() => STATUSES.map(([value, label]) => ({
    value, label, count: students.filter(s => s.status === value).length,
  })).filter(i => i.count > 0).slice(0, 7), [students]);

  const destinationSummary = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach(s => (s.preferredDestinations ?? []).forEach((c: string) => counts.set(c, (counts.get(c) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [students]);

  const statCards = [
    ["Total leads", stats.totalLeads ?? 0, UserRound, "from-[#4055FF]/15 to-[#00B4D8]/10"],
    ["New enquiries", stats.newEnquiries ?? 0, Sparkles, "from-[#FF2060]/15 to-[#9033F5]/10"],
    ["Active cases", stats.activeCases ?? 0, GraduationCap, "from-emerald-500/15 to-[#4055FF]/10"],
    ["Awaiting docs", stats.awaitingDocuments ?? 0, FileText, "from-amber-500/15 to-orange-500/10"],
    ["Admission ready", stats.admissionReady ?? 0, CheckCircle2, "from-cyan-500/15 to-emerald-500/10"],
    ["Visa-ready", stats.visaReady ?? 0, ShieldAlert, "from-violet-500/15 to-[#4055FF]/10"],
    ["High-risk", stats.highRisk ?? 0, ShieldAlert, "from-red-500/15 to-[#FF2060]/10"],
    ["Follow-ups today", stats.followUpsDueToday ?? 0, CalendarClock, "from-sky-500/15 to-indigo-500/10"],
  ] as const;

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Student Counselling</h1>
            <p className="mt-1 text-sm text-muted-foreground">Study abroad counselling — from enquiry to visa approval.</p>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New Student</Button>
        </div>

        {/* Nav */}
        <div className="rounded-2xl border bg-card p-2 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {COUNSELLING_MENUS.map(item => (
              <button key={item.key} type="button" onClick={() => setActiveMenu(item.key)}
                className={`min-w-[130px] rounded-xl px-3 py-2 text-left transition ${activeMenu === item.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <span className="flex items-center gap-2 text-sm font-bold"><item.icon className="h-4 w-4" />{item.label}</span>
                <span className={`mt-0.5 block truncate text-[11px] ${activeMenu === item.key ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{item.description}</span>
              </button>
            ))}
          </div>
        </div>

        {setupError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200">
            <p className="font-bold">Setup incomplete</p><p className="mt-1">{setupError}</p>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {activeMenu === "dashboard" && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(([label, value, Icon, gradient]) => (
                <Card key={label} className="overflow-hidden border-border/70 shadow-sm">
                  <CardContent className={`relative flex items-center gap-3 bg-gradient-to-br ${gradient} p-4`}>
                    <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/25 blur-2xl dark:bg-white/5" />
                    <div className="rounded-xl bg-background/80 p-2 text-primary shadow-sm"><Icon className="h-4 w-4" /></div>
                    <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-border/70 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Pipeline</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(statusSummary.length ? statusSummary : [{ label: "No data", count: 0, value: "empty" }]).map((item, i) => {
                    const max = Math.max(...statusSummary.map(r => r.count), 1);
                    return (
                      <div key={item.value} className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="font-semibold">{item.label}</span><span className="text-muted-foreground">{item.count}</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060] transition-all duration-700" style={{ width: `${item.count ? Math.max(12, Math.round((item.count / max) * 100)) : 5}%`, transitionDelay: `${i * 60}ms` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Destination Mix</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {destinationSummary.length ? destinationSummary.map(([country, count], i) => {
                    const max = Math.max(...destinationSummary.map(([, v]) => v), 1);
                    return (
                      <div key={country} className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{i + 1}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between text-sm"><span className="truncate font-semibold">{country}</span><span className="text-muted-foreground">{count}</span></div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#00B4D8] to-emerald-500 transition-all duration-700" style={{ width: `${Math.max(18, Math.round((count / max) * 100))}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  }) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Create students to see destination trends.</div>}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── STUDENT LIST ── */}
        {(activeMenu === "students" || activeMenu === "sessions" || activeMenu === "shortlists" || activeMenu === "admissions" || activeMenu === "documents" || activeMenu === "readiness" || activeMenu === "tasks" || activeMenu === "ai" || activeMenu === "portal") && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
            {/* Left: list or workspace */}
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{COUNSELLING_MENUS.find(m => m.key === activeMenu)?.label}</CardTitle>
                  {activeMenu === "sessions" && selectedId && (
                    <Button size="sm" className="gap-1.5" onClick={() => setSessionDialog({ open: true })}><Plus className="h-3.5 w-3.5" />Add Session</Button>
                  )}
                  {activeMenu === "shortlists" && selectedId && (
                    <Button size="sm" className="gap-1.5" onClick={() => setShortlistDialog({ open: true })}><Plus className="h-3.5 w-3.5" />Add Course</Button>
                  )}
                  {activeMenu === "admissions" && selectedId && (
                    <Button size="sm" className="gap-1.5" onClick={() => setAdmissionDialog({ open: true })}><Plus className="h-3.5 w-3.5" />Add Application</Button>
                  )}
                  {activeMenu === "tasks" && selectedId && (
                    <Button size="sm" className="gap-1.5" onClick={() => setTaskDialog({ open: true })}><Plus className="h-3.5 w-3.5" />Add Task</Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search students…" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeMenu === "students" ? (
                  <>
                    {filtered.map(s => (
                      <button key={s.id} onClick={() => setSelectedId(s.id)}
                        className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 ${selectedId === s.id ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-semibold">{s.fullName}</p>
                            <p className="text-xs text-muted-foreground">{s.email || "No email"} · {s.phone || "No phone"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{s.preferredCourse || "Course pending"} · {(s.preferredDestinations ?? []).join(", ") || "Destination pending"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="capitalize">{statusLabel(s.status)}</Badge>
                            <Badge className={riskClass[s.riskLevel] ?? riskClass.medium}>{s.riskLevel || "medium"} risk</Badge>
                            <span className={`text-xs font-bold ${scoreTone(s.visaReadinessScore ?? 0)}`}>{s.visaReadinessScore ?? 0}% ready</span>
                          </div>
                        </div>
                      </button>
                    ))}
                    {!studentsQuery.isLoading && filtered.length === 0 && (
                      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No students found.</div>
                    )}
                  </>
                ) : (
                  <WorkspaceView
                    activeMenu={activeMenu}
                    selected={selected}
                    students={filtered}
                    selectedId={selectedId}
                    onSelectStudent={id => setSelectedId(id)}
                    onEditSession={item => setSessionDialog({ open: true, item })}
                    onDeleteSession={item => setDeleteConfirm({ open: true, collection: "sessions", id: item.id, label: "session" })}
                    onEditShortlist={item => setShortlistDialog({ open: true, item })}
                    onDeleteShortlist={item => setDeleteConfirm({ open: true, collection: "shortlists", id: item.id, label: "shortlist" })}
                    onEditAdmission={item => setAdmissionDialog({ open: true, item })}
                    onDeleteAdmission={item => setDeleteConfirm({ open: true, collection: "admissions", id: item.id, label: "application" })}
                    onEditTask={item => setTaskDialog({ open: true, item })}
                    onDeleteTask={item => setDeleteConfirm({ open: true, collection: "tasks", id: item.id, label: "task" })}
                    onCompleteTask={(item) => updateRecordMutation.mutate({ collection: "tasks", id: item.id, data: { status: "completed" } })}
                    onDocStatusChange={(item, status) => updateRecordMutation.mutate({ collection: "documents", id: item.id, data: { status } })}
                    onDocNotes={item => setDocNotesDialog({ open: true, item })}
                    onRunAi={() => aiMutation.mutate("assessment")}
                    onRunSop={() => aiMutation.mutate("sop")}
                    onViewSop={item => setSopViewDialog({ open: true, item })}
                    onEnablePortal={() => portalMutation.mutate()}
                    aiPending={aiMutation.isPending}
                    portalPending={portalMutation.isPending}
                  />
                )}
              </CardContent>
            </Card>

            {/* Right: student detail */}
            <StudentDetailPanel
              selected={selected}
              selectedId={selectedId}
              onUpdateStatus={status => selected?.student && updateStudentMutation.mutate({ ...selected.student, status })}
              onEditProfile={() => setEditProfileOpen(true)}
            />
          </div>
        )}
      </div>

      {/* ── DIALOGS ── */}

      {/* Create student */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Student</DialogTitle><DialogDescription>Create a counselling profile with scoring and portal support.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <FF label="Full name *" value={form.fullName} onChange={v => setForm({ ...form, fullName: v })} />
            <FF label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
            <FF label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
            <FF label="WhatsApp" value={form.whatsappNumber} onChange={v => setForm({ ...form, whatsappNumber: v })} />
            <FF label="Nationality" value={form.nationality} onChange={v => setForm({ ...form, nationality: v })} />
            <FF label="Current country" value={form.currentCountry} onChange={v => setForm({ ...form, currentCountry: v })} />
            <FF label="Preferred destinations" value={form.preferredDestinations} onChange={v => setForm({ ...form, preferredDestinations: v })} placeholder="Canada, Australia" />
            <FF label="Preferred intake" value={form.preferredIntake} onChange={v => setForm({ ...form, preferredIntake: v })} placeholder="Sep 2025" />
            <FF label="Preferred course" value={form.preferredCourse} onChange={v => setForm({ ...form, preferredCourse: v })} />
            <FF label="Budget range" value={form.budgetRange} onChange={v => setForm({ ...form, budgetRange: v })} placeholder="USD 20,000–30,000/yr" />
            <FF label="Lead source" value={form.leadSource} onChange={v => setForm({ ...form, leadSource: v })} />
            <div className="space-y-1.5">
              <Label>Initial status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!form.fullName || createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit full profile */}
      {selected?.student && (
        <EditProfileDialog
          open={editProfileOpen}
          student={selected.student}
          onClose={() => setEditProfileOpen(false)}
          onSave={data => { updateStudentMutation.mutate(data); setEditProfileOpen(false); }}
        />
      )}

      {/* Session dialog */}
      <SessionDialog
        open={sessionDialog.open}
        item={sessionDialog.item}
        onClose={() => setSessionDialog({ open: false })}
        onSave={data => {
          if (sessionDialog.item) updateRecordMutation.mutate({ collection: "sessions", id: sessionDialog.item.id, data });
          else addRecordMutation.mutate({ collection: "sessions", data });
          setSessionDialog({ open: false });
        }}
      />

      {/* Shortlist dialog */}
      <ShortlistDialog
        open={shortlistDialog.open}
        item={shortlistDialog.item}
        onClose={() => setShortlistDialog({ open: false })}
        onSave={data => {
          if (shortlistDialog.item) updateRecordMutation.mutate({ collection: "shortlists", id: shortlistDialog.item.id, data });
          else addRecordMutation.mutate({ collection: "shortlists", data });
          setShortlistDialog({ open: false });
        }}
      />

      {/* Admission dialog */}
      <AdmissionDialog
        open={admissionDialog.open}
        item={admissionDialog.item}
        shortlists={selected?.shortlists ?? []}
        onClose={() => setAdmissionDialog({ open: false })}
        onSave={data => {
          if (admissionDialog.item) updateRecordMutation.mutate({ collection: "admissions", id: admissionDialog.item.id, data });
          else addRecordMutation.mutate({ collection: "admissions", data });
          setAdmissionDialog({ open: false });
        }}
      />

      {/* Task dialog */}
      <TaskDialog
        open={taskDialog.open}
        item={taskDialog.item}
        onClose={() => setTaskDialog({ open: false })}
        onSave={data => {
          if (taskDialog.item) updateRecordMutation.mutate({ collection: "tasks", id: taskDialog.item.id, data });
          else addRecordMutation.mutate({ collection: "tasks", data });
          setTaskDialog({ open: false });
        }}
      />

      {/* Doc notes dialog */}
      <DocNotesDialog
        open={docNotesDialog.open}
        item={docNotesDialog.item}
        onClose={() => setDocNotesDialog({ open: false })}
        onSave={data => { updateRecordMutation.mutate({ collection: "documents", id: docNotesDialog.item.id, data }); setDocNotesDialog({ open: false }); }}
      />

      {/* SOP viewer */}
      <SopViewDialog
        open={sopViewDialog.open}
        item={sopViewDialog.item}
        onClose={() => setSopViewDialog({ open: false })}
      />

      {/* Delete confirm */}
      {deleteConfirm && (
        <Dialog open={deleteConfirm.open} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete {deleteConfirm.label}?</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteRecordMutation.isPending} onClick={() => deleteRecordMutation.mutate({ collection: deleteConfirm.collection, id: deleteConfirm.id })}>
                {deleteRecordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}

// ─── Student Detail Panel ─────────────────────────────────────────────────────

function StudentDetailPanel({ selected, selectedId, onUpdateStatus, onEditProfile }: any) {
  if (!selectedId) {
    return (
      <Card className="xl:sticky xl:top-20">
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          Select a student to view their counselling profile.
        </CardContent>
      </Card>
    );
  }
  if (!selected) {
    return (
      <Card className="xl:sticky xl:top-20">
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  const s = selected.student;
  return (
    <Card className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-auto">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{s.fullName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{s.nationality || "Nationality not set"} · {s.email || "No email"}</p>
          </div>
          <Button size="sm" variant="ghost" className="gap-1.5 h-7 px-2" onClick={onEditProfile}>
            <Edit2 className="h-3.5 w-3.5" />Edit
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[["Profile", s.profileStrengthScore ?? 0], ["Admission", s.admissionReadinessScore ?? 0], ["Visa", s.visaReadinessScore ?? 0]].map(([label, score]) => (
            <div key={label} className="rounded-lg bg-muted/40 p-2 text-center">
              <p className={`text-lg font-black ${scoreTone(Number(score))}`}>{score}%</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className={riskClass[s.riskLevel] ?? riskClass.medium}>{s.riskLevel || "medium"} risk</Badge>
          <Badge variant="outline" className="capitalize">{statusLabel(s.status)}</Badge>
        </div>
        <Select value={s.status} onValueChange={onUpdateStatus}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}</SelectContent>
        </Select>

        <div className="space-y-1.5 text-sm">
          {[
            ["Course", s.preferredCourse],
            ["Destinations", (s.preferredDestinations ?? []).join(", ")],
            ["Intake", s.preferredIntake],
            ["Budget", s.budgetRange],
            ["Phone", s.phone],
            ["WhatsApp", s.whatsappNumber],
          ].map(([l, v]) => v ? (
            <div key={l} className="flex gap-2">
              <span className="text-muted-foreground shrink-0 w-24">{l}:</span>
              <span className="font-medium truncate">{v}</span>
            </div>
          ) : null)}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            ["Sessions", (selected.sessions ?? []).length],
            ["Shortlists", (selected.shortlists ?? []).length],
            ["Tasks", (selected.tasks ?? []).filter((t: any) => t.status === "open").length + " open"],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg border p-2 text-center">
              <p className="font-bold text-sm">{v}</p>
              <p className="text-[11px] text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>

        {/* Portal link */}
        {s.portalEnabled && s.portalToken && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">Portal Active</p>
            <div className="flex items-center gap-2">
              <code className="text-[10px] truncate flex-1 text-emerald-800 dark:text-emerald-300">/student-counselling/{s.portalToken}</code>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/student-counselling/${s.portalToken}`); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Workspace Views ──────────────────────────────────────────────────────────

function WorkspaceView({ activeMenu, selected, students, selectedId, onSelectStudent, onEditSession, onDeleteSession, onEditShortlist, onDeleteShortlist, onEditAdmission, onDeleteAdmission, onEditTask, onDeleteTask, onCompleteTask, onDocStatusChange, onDocNotes, onRunAi, onRunSop, onViewSop, onEnablePortal, aiPending, portalPending }: any) {
  if (!selected) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-dashed bg-muted/30 p-5 text-center">
          <p className="font-semibold text-sm">Select a student to open this module</p>
          <p className="mt-1 text-xs text-muted-foreground">Click any student below to see their {COUNSELLING_MENUS.find(m => m.key === activeMenu)?.label} data.</p>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {students.slice(0, 6).map((s: any) => (
            <button key={s.id} onClick={() => onSelectStudent(s.id)} className="rounded-xl border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-primary/5">
              <p className="font-semibold text-sm">{s.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.preferredCourse || "Course pending"} · {(s.preferredDestinations ?? []).join(", ") || "Destination pending"}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="outline" className="text-xs">{statusLabel(s.status)}</Badge>
                <span className={`text-xs font-bold ${scoreTone(s.visaReadinessScore ?? 0)}`}>{s.visaReadinessScore ?? 0}% ready</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const student = selected.student;

  if (activeMenu === "sessions") {
    const rows = selected.sessions ?? [];
    return (
      <div className="space-y-3">
        {rows.length === 0 && <EmptyDashed text="No counselling sessions yet. Add the first session." />}
        {rows.map((item: any) => (
          <div key={item.id} className="rounded-xl border p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{(item.mode || "video").replace(/_/g, " ")}</Badge>
                  <Badge className={item.status === "completed" ? "bg-emerald-100 text-emerald-700" : item.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}>{item.status}</Badge>
                  {item.sharedWithStudent && <Badge className="bg-purple-100 text-purple-700">Shared</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{fmtDateTime(item.scheduledAt)}{item.followUpDate ? ` · Follow-up: ${fmtDate(item.followUpDate)}` : ""}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEditSession(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDeleteSession(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            {item.meetingNotes && <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/40 rounded-lg p-2">{item.meetingNotes}</p>}
            {item.nextAction && <p className="text-xs font-semibold text-primary">Next: {item.nextAction}</p>}
            {item.recommendations && <p className="text-xs text-muted-foreground">Recommendations: {item.recommendations}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (activeMenu === "shortlists") {
    const rows = selected.shortlists ?? [];
    return (
      <div className="space-y-3">
        {rows.length === 0 && <EmptyDashed text="No course shortlist yet. Add courses and universities." />}
        {rows.map((item: any) => (
          <div key={item.id} className="rounded-xl border p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.institutionName}</p>
                <p className="text-xs text-muted-foreground">{item.courseName} · {item.destinationCountry}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`text-sm font-black ${scoreTone(item.admissionProbability ?? 50)}`}>{item.admissionProbability ?? 50}%</div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEditShortlist(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDeleteShortlist(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{(item.status || "suggested").replace(/_/g, " ")}</Badge>
              {item.intake && <Badge variant="secondary">{item.intake}</Badge>}
              {item.tuitionFee && <span className="text-xs text-muted-foreground">Tuition: {item.tuitionFee}</span>}
              {item.scholarshipAvailable && <Badge className="bg-emerald-100 text-emerald-700">Scholarship available</Badge>}
            </div>
            {item.eligibilityNotes && <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">{item.eligibilityNotes}</p>}
            {item.visaRiskNotes && <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">Visa: {item.visaRiskNotes}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (activeMenu === "admissions") {
    const rows = selected.admissions ?? [];
    return (
      <div className="space-y-3">
        {rows.length === 0 && <EmptyDashed text="No admission applications tracked yet." />}
        {rows.map((item: any) => {
          const sl = (selected.shortlists ?? []).find((s: any) => s.id === item.shortlistId);
          return (
            <div key={item.id} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  {sl && <p className="font-semibold text-sm">{sl.institutionName} · {sl.courseName}</p>}
                  <Badge className="mt-1 capitalize" variant="outline">{(item.applicationStatus || "not_started").replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEditAdmission(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onDeleteAdmission(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-muted-foreground">Offer: <span className="font-medium capitalize">{(item.offerLetterStatus || "not_received").replace(/_/g, " ")}</span></span>
                <span className="text-muted-foreground">Fee: <span className="font-medium capitalize">{(item.feePaymentStatus || "pending").replace(/_/g, " ")}</span></span>
                {item.admissionDeadline && <span className="text-muted-foreground">Deadline: <span className="font-medium">{fmtDate(item.admissionDeadline)}</span></span>}
              </div>
              {item.notes && <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">{item.notes}</p>}
              {item.conditionalOfferConditions && <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">Conditions: {item.conditionalOfferConditions}</p>}
            </div>
          );
        })}
      </div>
    );
  }

  if (activeMenu === "documents") {
    const rows = selected.documents ?? [];
    const received = rows.filter((d: any) => d.status === "received" || d.status === "verified").length;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">{received} / {rows.length} documents received</p>
            <p className="text-xs text-muted-foreground">Click a document to update status or add notes.</p>
          </div>
          <div className="w-24">
            <Progress value={rows.length ? Math.round((received / rows.length) * 100) : 0} className="h-2" />
          </div>
        </div>
        {rows.map((item: any) => (
          <div key={item.id} className="rounded-xl border p-3 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.status === "received" || item.status === "verified" ? "bg-emerald-500" : item.status === "rejected" || item.status === "expired" ? "bg-red-500" : "bg-amber-400"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.documentType}</p>
              {item.notes && <p className="text-xs text-muted-foreground truncate">{item.notes}</p>}
              {item.expiryDate && <p className="text-[11px] text-muted-foreground">Expires: {fmtDate(item.expiryDate)}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={item.status} onValueChange={status => onDocStatusChange(item, status)}>
                <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDocNotes(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeMenu === "readiness") {
    const scores = [
      ["Profile Strength", student.profileStrengthScore ?? 0, "bg-[#4055FF]"],
      ["Admission Readiness", student.admissionReadinessScore ?? 0, "bg-[#00B4D8]"],
      ["Visa Readiness", student.visaReadinessScore ?? 0, "bg-emerald-500"],
    ] as const;
    const docs = selected.documents ?? [];
    const missing = docs.filter((d: any) => d.required && d.status === "pending").map((d: any) => d.documentType);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{student.fullName} — Visa Readiness</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Risk level, scoring and improvement plan.</p>
            </div>
            <Badge className={riskClass[student.riskLevel] ?? riskClass.medium}>{student.riskLevel || "medium"} risk</Badge>
          </div>
        </div>
        {scores.map(([label, score, color]) => (
          <div key={label} className="rounded-xl border p-4">
            <div className="mb-2 flex justify-between">
              <span className="font-semibold text-sm">{label}</span>
              <span className={`font-bold text-sm ${scoreTone(score)}`}>{score}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
        {missing.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Missing documents ({missing.length})</p>
            {missing.slice(0, 6).map((d: string) => <p key={d} className="text-xs text-amber-700 dark:text-amber-400">· {d}</p>)}
            {missing.length > 6 && <p className="text-xs text-amber-600">+{missing.length - 6} more</p>}
          </div>
        )}
        {[student.previousVisaRefusals && "Previous visa refusal on record — strong explanation letter required.", student.educationGap && "Education gap detected — supporting documents and explanation needed.", !student.workExperience && "No work experience — explain employability and study motivation.", !student.sponsorDetails?.name && "No sponsor details — add financial evidence to improve visa readiness."].filter(Boolean).map((tip, i) => (
          <div key={i} className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3">
            <p className="text-xs text-red-700 dark:text-red-400">{tip}</p>
          </div>
        ))}
      </div>
    );
  }

  if (activeMenu === "tasks") {
    const rows = selected.tasks ?? [];
    const open = rows.filter((t: any) => t.status === "open" || t.status === "in_progress");
    const done = rows.filter((t: any) => t.status === "completed" || t.status === "cancelled");
    return (
      <div className="space-y-3">
        {open.length === 0 && done.length === 0 && <EmptyDashed text="No tasks yet. Add follow-ups and reminders." />}
        {open.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Open ({open.length})</p>
            {open.map((item: any) => (
              <div key={item.id} className="rounded-xl border p-3 flex items-start gap-3">
                <button onClick={() => onCompleteTask(item)} className="mt-0.5 rounded-full border-2 border-muted-foreground/40 h-4 w-4 shrink-0 hover:border-emerald-500 transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap text-xs text-muted-foreground">
                    <span className="capitalize">{(item.taskType || "follow_up").replace(/_/g, " ")}</span>
                    {item.dueDate && <span>Due {fmtDate(item.dueDate)}</span>}
                  </div>
                  {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onEditTask(item)}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => onDeleteTask(item)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {done.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Completed ({done.length})</p>
            {done.map((item: any) => (
              <div key={item.id} className="rounded-xl border p-3 flex items-center gap-3 opacity-60">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through text-muted-foreground">{item.title}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => onDeleteTask(item)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeMenu === "ai") {
    const assessments = selected.assessments ?? [];
    const latestAssessment = assessments.find((a: any) => a.assessmentType === "profile_assessment");
    const sopDrafts = assessments.filter((a: any) => a.assessmentType === "sop_draft");
    const r = latestAssessment?.responseJson ?? {};
    return (
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Button className="gap-2 h-12" onClick={onRunAi} disabled={aiPending}>
            {aiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            Run AI Assessment
          </Button>
          <Button variant="outline" className="gap-2 h-12" onClick={onRunSop} disabled={aiPending}>
            {aiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate SOP Draft
          </Button>
        </div>

        {latestAssessment && (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Latest Assessment</p>
            {r.profileStrengthSummary && (
              <div className="rounded-xl border p-4 bg-gradient-to-br from-[#4055FF]/5 to-[#9033F5]/5">
                <p className="text-sm leading-relaxed">{r.profileStrengthSummary}</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {r.strengths?.length > 0 && (
                <div className="rounded-xl border p-3 space-y-1.5">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Strengths</p>
                  {r.strengths.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">· {s}</p>)}
                </div>
              )}
              {r.riskFactors?.length > 0 && (
                <div className="rounded-xl border p-3 space-y-1.5">
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" />Risk Factors</p>
                  {r.riskFactors.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">· {s}</p>)}
                </div>
              )}
            </div>
            {r.universityRecommendations?.length > 0 && (
              <div className="rounded-xl border p-3 space-y-2">
                <p className="text-xs font-bold text-[#4055FF] flex items-center gap-1"><Star className="h-3.5 w-3.5" />University Recommendations</p>
                {r.universityRecommendations.map((u: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                    <div className="w-6 h-6 rounded-full bg-[#4055FF]/15 flex items-center justify-center text-xs font-black text-[#4055FF] shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold">{u.name} <span className="text-muted-foreground font-normal">· {u.country}</span></p>
                      <p className="text-[11px] text-muted-foreground">{u.course}{u.rank ? ` · ${u.rank}` : ""}</p>
                      {u.reason && <p className="text-[11px] text-muted-foreground mt-0.5">{u.reason}</p>}
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${scoreTone(u.probability ?? 50)}`}>{u.probability ?? 50}%</Badge>
                  </div>
                ))}
              </div>
            )}
            {r.recommendedNextSteps?.length > 0 && (
              <div className="rounded-xl border p-3 space-y-1">
                <p className="text-xs font-bold flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />Recommended Next Steps</p>
                {r.recommendedNextSteps.map((s: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-[#4055FF] font-bold shrink-0">{i + 1}.</span>{s}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sopDrafts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">SOP Drafts ({sopDrafts.length})</p>
            {sopDrafts.map((draft: any) => (
              <div key={draft.id} className="rounded-xl border p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{draft.responseJson?.institution || "SOP Draft"}</p>
                  <p className="text-xs text-muted-foreground">{draft.responseJson?.course} · {draft.responseJson?.country} · {fmtDate(draft.createdAt)}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => onViewSop(draft)}>
                  <ExternalLink className="h-3.5 w-3.5" />View
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeMenu === "portal") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-[#FF2060]/10 p-5">
          <h3 className="font-bold">{student.fullName} — Student Portal</h3>
          <p className="text-sm text-muted-foreground mt-1">Share a secure portal link so the student can view sessions, shortlists, documents, and progress.</p>
        </div>
        {student.portalEnabled && student.portalToken ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span className="font-bold text-emerald-700 dark:text-emerald-400">Portal is active</span>
            </div>
            <div className="rounded-lg bg-white dark:bg-slate-900 border p-3">
              <p className="text-xs text-muted-foreground mb-1">Portal URL</p>
              <code className="text-xs break-all">{window.location.origin}/student-counselling/{student.portalToken}</code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/student-counselling/${student.portalToken}`)}>
                <Copy className="h-3.5 w-3.5" />Copy link
              </Button>
              <a href={`/student-counselling/${student.portalToken}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5"><ExternalLink className="h-3.5 w-3.5" />Preview portal</Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-semibold">Portal not enabled</p>
              <p className="text-sm text-muted-foreground mt-1">Enable to share a student-facing link with progress, sessions, and documents.</p>
            </div>
            <Button onClick={onEnablePortal} disabled={portalPending} className="gap-2">
              {portalPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}Enable Student Portal
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Sub-dialogs ──────────────────────────────────────────────────────────────

function SessionDialog({ open, item, onClose, onSave }: any) {
  const [f, setF] = useState<any>({});
  const isEdit = !!item;
  useState(() => { if (open) setF(item ? { ...item, scheduledAt: toDatetimeLocal(item.scheduledAt), followUpDate: toDatetimeLocal(item.followUpDate) } : { mode: "video", status: "scheduled", sharedWithStudent: false }); });
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Session" : "Add Session"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Mode</Label>
              <Select value={f.mode || "video"} onValueChange={v => setF({ ...f, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SESSION_MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={f.status || "scheduled"} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SESSION_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date &amp; Time</Label><Input type="datetime-local" value={f.scheduledAt || ""} onChange={e => setF({ ...f, scheduledAt: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Follow-up Date</Label><Input type="datetime-local" value={f.followUpDate || ""} onChange={e => setF({ ...f, followUpDate: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Next Action</Label><Input placeholder="e.g. Prepare 3 shortlists" value={f.nextAction || ""} onChange={e => setF({ ...f, nextAction: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Meeting Notes</Label><Textarea className="min-h-24" placeholder="Session notes, student goals discussed…" value={f.meetingNotes || ""} onChange={e => setF({ ...f, meetingNotes: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Recommendations</Label><Textarea className="min-h-16" placeholder="Counsellor recommendations…" value={f.recommendations || ""} onChange={e => setF({ ...f, recommendations: e.target.value })} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="text-sm font-medium">Share with student</p><p className="text-xs text-muted-foreground">Visible in student portal</p></div>
            <Switch checked={!!f.sharedWithStudent} onCheckedChange={v => setF({ ...f, sharedWithStudent: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(f)}>{isEdit ? "Save Changes" : "Add Session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShortlistDialog({ open, item, onClose, onSave }: any) {
  const [f, setF] = useState<any>({});
  const isEdit = !!item;
  useState(() => { if (open) setF(item || { admissionProbability: 50, status: "suggested", scholarshipAvailable: false }); });
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Shortlist" : "Add to Shortlist"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <FF label="Institution / University *" value={f.institutionName || ""} onChange={v => setF({ ...f, institutionName: v })} />
          <FF label="Course / Program *" value={f.courseName || ""} onChange={v => setF({ ...f, courseName: v })} />
          <FF label="Destination Country *" value={f.destinationCountry || ""} onChange={v => setF({ ...f, destinationCountry: v })} />
          <div className="grid grid-cols-2 gap-3">
            <FF label="Intake" value={f.intake || ""} onChange={v => setF({ ...f, intake: v })} placeholder="Sep 2025" />
            <FF label="Duration" value={f.duration || ""} onChange={v => setF({ ...f, duration: v })} placeholder="2 years" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FF label="Tuition Fee" value={f.tuitionFee || ""} onChange={v => setF({ ...f, tuitionFee: v })} placeholder="CAD 18,000/yr" />
            <FF label="Application Fee" value={f.applicationFee || ""} onChange={v => setF({ ...f, applicationFee: v })} placeholder="CAD 150" />
          </div>
          <div className="space-y-1.5">
            <Label>Admission Probability: {f.admissionProbability ?? 50}%</Label>
            <Input type="range" min={0} max={100} value={f.admissionProbability ?? 50} onChange={e => setF({ ...f, admissionProbability: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={f.status || "suggested"} onValueChange={v => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SHORTLIST_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm font-medium">Scholarship available</p>
            <Switch checked={!!f.scholarshipAvailable} onCheckedChange={v => setF({ ...f, scholarshipAvailable: v })} />
          </div>
          <div className="space-y-1.5"><Label>Eligibility Notes</Label><Textarea className="min-h-16" value={f.eligibilityNotes || ""} onChange={e => setF({ ...f, eligibilityNotes: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Visa Risk Notes</Label><Textarea className="min-h-16" value={f.visaRiskNotes || ""} onChange={e => setF({ ...f, visaRiskNotes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!f.institutionName || !f.courseName || !f.destinationCountry} onClick={() => onSave(f)}>{isEdit ? "Save Changes" : "Add to Shortlist"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdmissionDialog({ open, item, shortlists, onClose, onSave }: any) {
  const [f, setF] = useState<any>({});
  const isEdit = !!item;
  useState(() => { if (open) setF(item ? { ...item, applicationDate: toDatetimeLocal(item.applicationDate), admissionDeadline: toDatetimeLocal(item.admissionDeadline) } : { applicationStatus: "not_started", offerLetterStatus: "not_received", feePaymentStatus: "pending", documentsSubmitted: false }); });
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Application" : "Track Application"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {shortlists.length > 0 && (
            <div className="space-y-1.5"><Label>Link to shortlist</Label>
              <Select value={f.shortlistId || ""} onValueChange={v => setF({ ...f, shortlistId: v })}>
                <SelectTrigger><SelectValue placeholder="Select shortlist…" /></SelectTrigger>
                <SelectContent>
                  {shortlists.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.institutionName} — {s.courseName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Application Status</Label>
              <Select value={f.applicationStatus || "not_started"} onValueChange={v => setF({ ...f, applicationStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ADMISSION_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Offer Status</Label>
              <Select value={f.offerLetterStatus || "not_received"} onValueChange={v => setF({ ...f, offerLetterStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OFFER_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Application Date</Label><Input type="datetime-local" value={f.applicationDate || ""} onChange={e => setF({ ...f, applicationDate: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Deadline</Label><Input type="datetime-local" value={f.admissionDeadline || ""} onChange={e => setF({ ...f, admissionDeadline: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Fee Payment Status</Label>
            <Select value={f.feePaymentStatus || "pending"} onValueChange={v => setF({ ...f, feePaymentStatus: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["pending", "partial", "paid", "waived"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Conditional Offer Conditions</Label><Textarea className="min-h-16" value={f.conditionalOfferConditions || ""} onChange={e => setF({ ...f, conditionalOfferConditions: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea className="min-h-16" value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm font-medium">Documents submitted</p>
            <Switch checked={!!f.documentsSubmitted} onCheckedChange={v => setF({ ...f, documentsSubmitted: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(f)}>{isEdit ? "Save Changes" : "Track Application"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ open, item, onClose, onSave }: any) {
  const [f, setF] = useState<any>({});
  const isEdit = !!item;
  useState(() => { if (open) setF(item ? { ...item, dueDate: toDatetimeLocal(item.dueDate) } : { taskType: "follow_up", status: "open" }); });
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <FF label="Task Title *" value={f.title || ""} onChange={v => setF({ ...f, title: v })} placeholder="e.g. Request IELTS certificate" />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={f.taskType || "follow_up"} onValueChange={v => setF({ ...f, taskType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={f.status || "open"} onValueChange={v => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Due Date</Label><Input type="datetime-local" value={f.dueDate || ""} onChange={e => setF({ ...f, dueDate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea className="min-h-16" value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!f.title} onClick={() => onSave(f)}>{isEdit ? "Save Changes" : "Add Task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocNotesDialog({ open, item, onClose, onSave }: any) {
  const [f, setF] = useState<any>({});
  useState(() => { if (open && item) setF({ notes: item.notes || "", expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "" }); });
  if (!open || !item) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{item.documentType}</DialogTitle><DialogDescription>Add notes or expiry date for this document.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Expiry Date</Label><Input type="date" value={f.expiryDate || ""} onChange={e => setF({ ...f, expiryDate: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea className="min-h-24" value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(f)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SopViewDialog({ open, item, onClose }: any) {
  const { toast } = useToast();
  if (!open || !item) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>SOP Draft</DialogTitle>
          <DialogDescription>{item.responseJson?.institution || "Statement of Purpose"} · {item.responseJson?.country}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-lg bg-muted/40 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{item.generatedText || "No SOP text generated."}</pre>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(item.generatedText || ""); toast({ title: "Copied to clipboard" }); }} className="gap-2">
            <Copy className="h-4 w-4" />Copy
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Full Profile Dialog ─────────────────────────────────────────────────

function EditProfileDialog({ open, student, onClose, onSave }: any) {
  const [f, setF] = useState<any>({});
  const [tab, setTab] = useState("contact");
  useState(() => { if (open) setF({ ...student, preferredDestinations: (student.preferredDestinations ?? []).join(", ") }); });
  if (!open) return null;

  const handleSave = () => {
    onSave({ ...f, preferredDestinations: String(f.preferredDestinations || "").split(",").map((s: string) => s.trim()).filter(Boolean) });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Edit Student Profile — {student.fullName}</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-auto py-4">
            <TabsContent value="contact" className="mt-0 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <FF label="Full Name" value={f.fullName || ""} onChange={v => setF({ ...f, fullName: v })} />
                <FF label="Email" value={f.email || ""} onChange={v => setF({ ...f, email: v })} />
                <FF label="Phone" value={f.phone || ""} onChange={v => setF({ ...f, phone: v })} />
                <FF label="WhatsApp" value={f.whatsappNumber || ""} onChange={v => setF({ ...f, whatsappNumber: v })} />
                <FF label="Nationality" value={f.nationality || ""} onChange={v => setF({ ...f, nationality: v })} />
                <FF label="Current Country" value={f.currentCountry || ""} onChange={v => setF({ ...f, currentCountry: v })} />
                <FF label="Date of Birth" value={f.dateOfBirth || ""} onChange={v => setF({ ...f, dateOfBirth: v })} placeholder="YYYY-MM-DD" />
                <FF label="Lead Source" value={f.leadSource || ""} onChange={v => setF({ ...f, leadSource: v })} />
                <div className="sm:col-span-2"><FF label="Preferred Destinations (comma separated)" value={f.preferredDestinations || ""} onChange={v => setF({ ...f, preferredDestinations: v })} placeholder="Canada, Australia, UK" /></div>
                <FF label="Preferred Intake" value={f.preferredIntake || ""} onChange={v => setF({ ...f, preferredIntake: v })} placeholder="Sep 2025" />
                <FF label="Preferred Course" value={f.preferredCourse || ""} onChange={v => setF({ ...f, preferredCourse: v })} />
              </div>
            </TabsContent>
            <TabsContent value="academic" className="mt-0 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <FF label="Highest Qualification" value={f.academicHistory?.highestQualification || ""} onChange={v => setF({ ...f, academicHistory: { ...f.academicHistory, highestQualification: v } })} placeholder="Bachelor of Commerce" />
                <FF label="Institution" value={f.academicHistory?.institution || ""} onChange={v => setF({ ...f, academicHistory: { ...f.academicHistory, institution: v } })} />
                <FF label="Graduation Year" value={f.academicHistory?.graduationYear || ""} onChange={v => setF({ ...f, academicHistory: { ...f.academicHistory, graduationYear: v } })} />
                <FF label="GPA / Percentage" value={f.academicHistory?.gpa || ""} onChange={v => setF({ ...f, academicHistory: { ...f.academicHistory, gpa: v } })} placeholder="3.5 / 75%" />
                <FF label="Field of Study" value={f.academicHistory?.fieldOfStudy || ""} onChange={v => setF({ ...f, academicHistory: { ...f.academicHistory, fieldOfStudy: v } })} />
                <FF label="Medium of Instruction" value={f.academicHistory?.mediumOfInstruction || ""} onChange={v => setF({ ...f, academicHistory: { ...f.academicHistory, mediumOfInstruction: v } })} placeholder="English" />
              </div>
              <div className="space-y-1.5"><Label>Work Experience</Label><Textarea className="min-h-20" value={f.workExperience || ""} onChange={e => setF({ ...f, workExperience: e.target.value })} placeholder="Job title, company, duration…" /></div>
              <div className="space-y-1.5"><Label>Education Gap (if any)</Label><Textarea className="min-h-16" value={f.educationGap || ""} onChange={e => setF({ ...f, educationGap: e.target.value })} placeholder="Explain any gap years…" /></div>
              <div className="space-y-1.5"><Label>Previous Visa Refusals</Label><Textarea className="min-h-16" value={f.previousVisaRefusals || ""} onChange={e => setF({ ...f, previousVisaRefusals: e.target.value })} placeholder="Country, year, reason (if any)…" /></div>
              <div className="space-y-1.5"><Label>Travel History</Label><Textarea className="min-h-16" value={f.travelHistory || ""} onChange={e => setF({ ...f, travelHistory: e.target.value })} placeholder="Countries visited, purpose…" /></div>
            </TabsContent>
            <TabsContent value="tests" className="mt-0 space-y-4">
              <div className="rounded-xl border p-4 space-y-3">
                <p className="text-sm font-bold">English Tests</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Test Type</Label>
                    <Select value={f.englishTests?.type || ""} onValueChange={v => setF({ ...f, englishTests: { ...f.englishTests, type: v } })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{["IELTS", "TOEFL", "PTE", "Duolingo", "Cambridge", "None"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FF label="Overall Score" value={f.englishTests?.overallScore || ""} onChange={v => setF({ ...f, englishTests: { ...f.englishTests, overallScore: v } })} placeholder="7.5" />
                  <FF label="Test Date" value={f.englishTests?.testDate || ""} onChange={v => setF({ ...f, englishTests: { ...f.englishTests, testDate: v } })} placeholder="YYYY-MM-DD" />
                </div>
                <div className="grid sm:grid-cols-4 gap-3">
                  {["Listening", "Reading", "Writing", "Speaking"].map(band => (
                    <FF key={band} label={band} value={f.englishTests?.[band.toLowerCase()] || ""} onChange={v => setF({ ...f, englishTests: { ...f.englishTests, [band.toLowerCase()]: v } })} placeholder="7.0" />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-4 space-y-3">
                <p className="text-sm font-bold">Standardised Tests (GRE / GMAT / SAT)</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5"><Label>Test Type</Label>
                    <Select value={f.englishTests?.stdTestType || ""} onValueChange={v => setF({ ...f, englishTests: { ...f.englishTests, stdTestType: v } })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{["GRE", "GMAT", "SAT", "ACT", "None"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <FF label="Score" value={f.englishTests?.stdTestScore || ""} onChange={v => setF({ ...f, englishTests: { ...f.englishTests, stdTestScore: v } })} placeholder="320" />
                  <FF label="Test Date" value={f.englishTests?.stdTestDate || ""} onChange={v => setF({ ...f, englishTests: { ...f.englishTests, stdTestDate: v } })} placeholder="YYYY-MM-DD" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="financials" className="mt-0 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <FF label="Budget Range" value={f.budgetRange || ""} onChange={v => setF({ ...f, budgetRange: v })} placeholder="USD 20,000–30,000/yr" />
                <FF label="Sponsor Name" value={f.sponsorDetails?.name || ""} onChange={v => setF({ ...f, sponsorDetails: { ...f.sponsorDetails, name: v } })} />
                <FF label="Sponsor Relationship" value={f.sponsorDetails?.relationship || ""} onChange={v => setF({ ...f, sponsorDetails: { ...f.sponsorDetails, relationship: v } })} placeholder="Father, Self, Employer…" />
                <FF label="Sponsor Occupation" value={f.sponsorDetails?.occupation || ""} onChange={v => setF({ ...f, sponsorDetails: { ...f.sponsorDetails, occupation: v } })} />
                <FF label="Annual Income (sponsor)" value={f.sponsorDetails?.annualIncome || ""} onChange={v => setF({ ...f, sponsorDetails: { ...f.sponsorDetails, annualIncome: v } })} placeholder="USD 60,000" />
                <FF label="Bank Balance" value={f.sponsorDetails?.bankBalance || ""} onChange={v => setF({ ...f, sponsorDetails: { ...f.sponsorDetails, bankBalance: v } })} placeholder="USD 30,000" />
              </div>
              <div className="space-y-1.5"><Label>Financial Notes</Label><Textarea className="min-h-16" value={f.sponsorDetails?.notes || ""} onChange={e => setF({ ...f, sponsorDetails: { ...f.sponsorDetails, notes: e.target.value } })} placeholder="Property owned, loan sanctioned letter, etc." /></div>
            </TabsContent>
          </div>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Profile</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FF({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EmptyDashed({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
