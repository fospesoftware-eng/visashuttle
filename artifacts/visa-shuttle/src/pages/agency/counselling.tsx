import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Brain,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ListChecks,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest } from "@/lib/queryClient";

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
  { key: "dashboard", label: "Dashboard", description: "Overview metrics and pipeline", icon: BarChart3 },
  { key: "students", label: "Students", description: "Profiles and enquiries", icon: Users },
  { key: "sessions", label: "Sessions", description: "Counselling appointments", icon: CalendarClock },
  { key: "shortlists", label: "Shortlists", description: "Courses and universities", icon: GraduationCap },
  { key: "admissions", label: "Admissions", description: "Offer and application workflow", icon: ClipboardCheck },
  { key: "documents", label: "Documents", description: "Student document checklist", icon: FileText },
  { key: "readiness", label: "Visa Readiness", description: "Risk and action plan", icon: ShieldAlert },
  { key: "tasks", label: "Tasks", description: "Follow-ups and reminders", icon: ListChecks },
  { key: "ai", label: "AI Assessment", description: "Profile and SOP outputs", icon: Brain },
  { key: "portal", label: "Student Portal", description: "Secure student-facing link", icon: BookOpen },
] as const;

const statusLabel = (value: string) => STATUSES.find(([key]) => key === value)?.[1] ?? value.replace(/_/g, " ");

const riskClass: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function CounsellingPage() {
  const { data: current } = useCurrentUser();
  const tenantId = current?.user?.tenantId || current?.tenant?.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState<(typeof COUNSELLING_MENUS)[number]["key"]>("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    nationality: "",
    currentCountry: "",
    preferredDestinations: "",
    preferredIntake: "",
    preferredCourse: "",
    budgetRange: "",
    leadSource: "",
    status: "new_enquiry",
  });
  const [quick, setQuick] = useState({ title: "", notes: "", dueDate: "", institutionName: "", courseName: "", destinationCountry: "" });

  const studentsQuery = useQuery<any[]>({
    queryKey: ["/api/tenants", tenantId, "counselling", "students"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/counselling/students`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not load counselling students");
      }
      return res.json();
    },
    enabled: !!tenantId,
  });

  const statsQuery = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "counselling", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/counselling/stats`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not load counselling stats");
      }
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
      if (!tenantId) throw new Error("Agency account is not linked to a tenant. Please sign in again.");
      return (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students`, {
        ...form,
        preferredDestinations: splitList(form.preferredDestinations),
      })).json();
    },
    onSuccess: (student: any) => {
      setCreateOpen(false);
      setSelectedId(student.id);
      setForm({ fullName: "", email: "", phone: "", whatsappNumber: "", nationality: "", currentCountry: "", preferredDestinations: "", preferredIntake: "", preferredCourse: "", budgetRange: "", leadSource: "", status: "new_enquiry" });
      refresh();
      toast({ title: "Student profile created", description: "Counselling checklist and beta scoring are ready." });
    },
    onError: (e: any) => toast({ title: "Unable to create student", description: e.message, variant: "destructive" }),
  });

  const updateStudentMutation = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PATCH", `/api/tenants/${tenantId}/counselling/students/${id}`, data)).json(),
    onSuccess: refresh,
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const addRecordMutation = useMutation({
    mutationFn: async ({ collection, data }: any) => (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students/${selectedId}/${collection}`, data)).json(),
    onSuccess: () => {
      setQuick({ title: "", notes: "", dueDate: "", institutionName: "", courseName: "", destinationCountry: "" });
      refresh();
      toast({ title: "Counselling record added" });
    },
    onError: (e: any) => toast({ title: "Could not add record", description: e.message, variant: "destructive" }),
  });

  const aiMutation = useMutation({
    mutationFn: async (type: "assessment" | "sop") => {
      const path = type === "assessment" ? "ai-assessment" : "sop-draft";
      return (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students/${selectedId}/${path}`, {})).json();
    },
    onSuccess: () => {
      refresh();
      toast({ title: "Beta AI output generated", description: "Saved under AI Assessment for counsellor review." });
    },
    onError: (e: any) => toast({ title: "AI action failed", description: e.message, variant: "destructive" }),
  });

  const portalMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students/${selectedId}/portal`, {})).json(),
    onSuccess: (data: any) => {
      refresh();
      toast({ title: "Student portal enabled", description: data.portalUrl });
    },
  });

  const students = studentsQuery.data ?? [];
  const stats = statsQuery.data ?? {};
  const statusSummary = useMemo(() => STATUSES.map(([value, label]) => ({
    value,
    label,
    count: students.filter((student) => student.status === value).length,
  })).filter((item) => item.count > 0).slice(0, 7), [students]);
  const destinationSummary = useMemo(() => {
    const counts = new Map<string, number>();
    students.forEach((student) => (student.preferredDestinations ?? []).forEach((country: string) => {
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [students]);
  const readinessSummary = useMemo(() => {
    const buckets = [
      { label: "High readiness", color: "bg-emerald-500", count: students.filter((student) => (student.visaReadinessScore ?? 0) >= 75).length },
      { label: "Moderate", color: "bg-amber-500", count: students.filter((student) => (student.visaReadinessScore ?? 0) >= 50 && (student.visaReadinessScore ?? 0) < 75).length },
      { label: "Needs work", color: "bg-red-500", count: students.filter((student) => (student.visaReadinessScore ?? 0) < 50).length },
    ];
    return buckets;
  }, [students]);
  const filtered = useMemo(() => students.filter((student) => {
    const haystack = `${student.fullName} ${student.email ?? ""} ${student.phone ?? ""} ${student.preferredCourse ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === "all" || student.status === statusFilter);
  }), [students, search, statusFilter]);
  const selected = detailQuery.data;
  const setupError = studentsQuery.error instanceof Error
    ? studentsQuery.error.message
    : statsQuery.error instanceof Error
      ? statsQuery.error.message
      : "";
  const activeMenuMeta = COUNSELLING_MENUS.find((item) => item.key === activeMenu) ?? COUNSELLING_MENUS[0];

  const statCards = [
    ["Total counselling leads", stats.totalLeads ?? 0, UserRound, "from-[#4055FF]/15 to-[#00B4D8]/10"],
    ["New enquiries", stats.newEnquiries ?? 0, Sparkles, "from-[#FF2060]/15 to-[#9033F5]/10"],
    ["Active cases", stats.activeCases ?? 0, GraduationCap, "from-emerald-500/15 to-[#4055FF]/10"],
    ["Awaiting documents", stats.awaitingDocuments ?? 0, FileText, "from-amber-500/15 to-orange-500/10"],
    ["Admission ready", stats.admissionReady ?? 0, CheckCircle2, "from-cyan-500/15 to-emerald-500/10"],
    ["Visa-ready students", stats.visaReady ?? 0, ShieldAlert, "from-violet-500/15 to-[#4055FF]/10"],
    ["High-risk profiles", stats.highRisk ?? 0, ShieldAlert, "from-red-500/15 to-[#FF2060]/10"],
    ["Follow-ups due today", stats.followUpsDueToday ?? 0, CalendarClock, "from-sky-500/15 to-indigo-500/10"],
  ] as const;

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Counselling</h1>
              <Badge className="bg-primary/10 text-primary">Beta</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Student visa counselling, admissions, documents, and visa-readiness in one VisaDesk workflow.</p>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />New student</Button>
        </div>

        <div className="rounded-2xl border bg-card p-2 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {COUNSELLING_MENUS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveMenu(item.key)}
                className={`min-w-[145px] rounded-xl px-3 py-2 text-left transition ${
                  activeMenu === item.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <span className={`mt-0.5 block truncate text-[11px] ${activeMenu === item.key ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {setupError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200">
            <p className="font-bold">Counselling setup is not complete</p>
            <p className="mt-1">{setupError}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(([label, value, Icon, gradient]) => (
            <Card key={label} className="overflow-hidden border-border/70 shadow-sm">
              <CardContent className={`relative flex items-center gap-3 bg-gradient-to-br ${gradient} p-4`}>
                <div className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/25 blur-2xl dark:bg-white/5" />
                <div className="rounded-xl bg-background/80 p-2 text-primary shadow-sm"><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Counselling pipeline</CardTitle>
                  <CardDescription>Live status spread across student enquiries and active counselling files.</CardDescription>
                </div>
                <Badge variant="secondary">{students.length} students</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(statusSummary.length ? statusSummary : [{ label: "No status data", count: 0, value: "empty" }]).map((item, index) => {
                const max = Math.max(...statusSummary.map((row) => row.count), 1);
                const width = item.count ? Math.max(12, Math.round((item.count / max) * 100)) : 5;
                return (
                  <div key={item.value} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060] transition-all duration-700"
                        style={{ width: `${width}%`, transitionDelay: `${index * 60}ms` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Destination mix</CardTitle>
              <CardDescription>Most requested student destinations in this agency workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {destinationSummary.length ? destinationSummary.map(([country, count], index) => {
                const max = Math.max(...destinationSummary.map(([, value]) => value), 1);
                return (
                  <div key={country} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-semibold">{country}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#00B4D8] to-emerald-500 transition-all duration-700" style={{ width: `${Math.max(18, Math.round((count / max) * 100))}%` }} />
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Create students to see destination trends.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {readinessSummary.map((bucket) => {
            const total = Math.max(students.length, 1);
            const percent = Math.round((bucket.count / total) * 100);
            return (
              <Card key={bucket.label} className="border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{bucket.label}</p>
                      <p className="text-xs text-muted-foreground">{bucket.count} student{bucket.count === 1 ? "" : "s"}</p>
                    </div>
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <div className={`absolute inset-0 rounded-full ${bucket.color} opacity-20`} />
                      <span className="relative text-sm font-black">{percent}%</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${bucket.color} transition-all duration-700`} style={{ width: `${percent}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>{activeMenuMeta.label}</CardTitle>
                <CardDescription>{activeMenuMeta.description}. Status-based counselling workflow for enquiries through visa outcome.</CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="sm:w-[230px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeMenu === "dashboard" || activeMenu === "students" ? (
                <>
                  {filtered.map((student) => (
                    <button key={student.id} onClick={() => setSelectedId(student.id)} className={`w-full rounded-lg border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 ${selectedId === student.id ? "border-primary bg-primary/5" : "border-border"}`}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{student.fullName}</p>
                          <p className="text-xs text-muted-foreground">{student.email || "No email"} · {student.phone || "No phone"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{student.preferredCourse || "Course not selected"} · {(student.preferredDestinations ?? []).join(", ") || "Destination pending"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="capitalize">{statusLabel(student.status)}</Badge>
                          <Badge className={riskClass[student.riskLevel] ?? riskClass.medium}>{student.riskLevel || "medium"} risk</Badge>
                          <span className={`text-sm font-bold ${scoreTone(student.visaReadinessScore ?? 0)}`}>{student.visaReadinessScore ?? 0}% visa ready</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {!studentsQuery.isLoading && filtered.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No counselling students found.</div>
                  )}
                </>
              ) : (
                <CounsellingMenuWorkspace activeMenu={activeMenu} selected={selected} students={filtered} onSelectStudent={setSelectedId} />
              )}
            </CardContent>
          </Card>

          <Card className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-auto">
            <CardHeader>
              <CardTitle>{selected?.student?.fullName ?? "Student Detail"}</CardTitle>
              <CardDescription>{selected ? "Profile, sessions, admissions, documents, tasks, and AI outputs." : "Select a student to manage the counselling workflow."}</CardDescription>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <div className="rounded-xl bg-muted/40 p-8 text-center text-sm text-muted-foreground">Counselling detail will appear here.</div>
              ) : (
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="grid h-auto grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="workflow">Workflow</TabsTrigger>
                    <TabsTrigger value="ai">AI</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {["profileStrengthScore", "admissionReadinessScore", "visaReadinessScore"].map((key) => (
                        <div key={key} className="rounded-lg bg-muted/40 p-3">
                          <p className={`text-lg font-bold ${scoreTone(selected.student[key] ?? 0)}`}>{selected.student[key] ?? 0}%</p>
                          <p className="text-[11px] text-muted-foreground">{key.replace(/([A-Z])/g, " $1").replace("Score", "")}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-muted-foreground">Status:</span> {statusLabel(selected.student.status)}</p>
                      <p><span className="text-muted-foreground">Intake:</span> {selected.student.preferredIntake || "Not set"}</p>
                      <p><span className="text-muted-foreground">Budget:</span> {selected.student.budgetRange || "Not set"}</p>
                      <p><span className="text-muted-foreground">Portal:</span> {selected.student.portalEnabled ? "Enabled" : "Disabled"}</p>
                    </div>
                    <Select value={selected.student.status} onValueChange={(status) => updateStudentMutation.mutate({ id: selected.student.id, data: { ...selected.student, status } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  </TabsContent>
                  <TabsContent value="workflow" className="space-y-3">
                    <QuickAdd title="Add task" icon={ListChecks} quick={quick} setQuick={setQuick} onSubmit={() => addRecordMutation.mutate({ collection: "tasks", data: { title: quick.title || "Follow-up", notes: quick.notes, dueDate: quick.dueDate } })} />
                    <QuickAdd title="Add session" icon={CalendarClock} quick={quick} setQuick={setQuick} onSubmit={() => addRecordMutation.mutate({ collection: "sessions", data: { scheduledAt: quick.dueDate, meetingNotes: quick.notes, nextAction: quick.title } })} />
                    <QuickAdd title="Add shortlist" icon={GraduationCap} quick={quick} setQuick={setQuick} showCourse onSubmit={() => addRecordMutation.mutate({ collection: "shortlists", data: { institutionName: quick.institutionName, courseName: quick.courseName, destinationCountry: quick.destinationCountry, eligibilityNotes: quick.notes } })} />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Documents</h4>
                      {(selected.documents ?? []).slice(0, 6).map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between rounded-lg border p-2 text-xs">
                          <span>{doc.documentType}</span>
                          <Badge variant={doc.status === "received" ? "default" : "outline"}>{doc.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="ai" className="space-y-3">
                    <Button className="w-full gap-2" onClick={() => aiMutation.mutate("assessment")} disabled={aiMutation.isPending}><Brain className="h-4 w-4" />Run profile assessment</Button>
                    <Button className="w-full gap-2" variant="outline" onClick={() => aiMutation.mutate("sop")} disabled={aiMutation.isPending}><Sparkles className="h-4 w-4" />Generate editable SOP draft</Button>
                    <Button className="w-full" variant="secondary" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>Enable Student Portal</Button>
                    <div className="space-y-2">
                      {(selected.assessments ?? []).map((item: any) => (
                        <div key={item.id} className="rounded-lg border p-3 text-xs">
                          <div className="mb-1 flex items-center justify-between">
                            <Badge variant="outline">{item.assessmentType}</Badge>
                            <span className={scoreTone(item.visaReadinessScore ?? 0)}>{item.visaReadinessScore ?? 0}%</span>
                          </div>
                          <pre className="max-h-48 whitespace-pre-wrap rounded bg-muted/50 p-2 font-sans">{item.generatedText || JSON.stringify(item.responseJson, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New counselling student</DialogTitle>
            <DialogDescription>Create a student profile with beta checklist, scoring, and portal support.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={form.fullName} onChange={(fullName) => setForm({ ...form, fullName })} />
            <Field label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
            <Field label="Phone" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
            <Field label="WhatsApp" value={form.whatsappNumber} onChange={(whatsappNumber) => setForm({ ...form, whatsappNumber })} />
            <Field label="Nationality" value={form.nationality} onChange={(nationality) => setForm({ ...form, nationality })} />
            <Field label="Current country" value={form.currentCountry} onChange={(currentCountry) => setForm({ ...form, currentCountry })} />
            <Field label="Preferred destinations" value={form.preferredDestinations} onChange={(preferredDestinations) => setForm({ ...form, preferredDestinations })} placeholder="Canada, Australia" />
            <Field label="Preferred intake" value={form.preferredIntake} onChange={(preferredIntake) => setForm({ ...form, preferredIntake })} />
            <Field label="Preferred course" value={form.preferredCourse} onChange={(preferredCourse) => setForm({ ...form, preferredCourse })} />
            <Field label="Budget range" value={form.budgetRange} onChange={(budgetRange) => setForm({ ...form, budgetRange })} />
            <Field label="Lead source" value={form.leadSource} onChange={(leadSource) => setForm({ ...form, leadSource })} />
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!form.fullName || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? "Creating..." : "Create student"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function CounsellingMenuWorkspace({ activeMenu, selected, students, onSelectStudent }: {
  activeMenu: string;
  selected: any;
  students: any[];
  onSelectStudent: (id: string) => void;
}) {
  if (!selected) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
          <p className="font-semibold">Select a student to open this module</p>
          <p className="mt-1 text-sm text-muted-foreground">The {COUNSELLING_MENUS.find((item) => item.key === activeMenu)?.label} workspace is student-specific.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {students.slice(0, 6).map((student) => (
            <button key={student.id} onClick={() => onSelectStudent(student.id)} className="rounded-xl border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-primary/5">
              <p className="font-semibold">{student.fullName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{student.preferredCourse || "Course pending"} · {(student.preferredDestinations ?? []).join(", ") || "Destination pending"}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="outline">{statusLabel(student.status)}</Badge>
                <span className={`text-xs font-bold ${scoreTone(student.visaReadinessScore ?? 0)}`}>{student.visaReadinessScore ?? 0}% ready</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const student = selected.student;
  const rowsByMenu: Record<string, { title: string; description: string; icon: any; rows: any[]; empty: string; render: (item: any) => JSX.Element }> = {
    sessions: {
      title: "Counselling appointments",
      description: "Calls, notes, recommendations and next actions.",
      icon: CalendarClock,
      rows: selected.sessions ?? [],
      empty: "No counselling sessions yet.",
      render: (item) => (
        <RecordCard key={item.id} title={item.nextAction || item.status || "Counselling session"} meta={[item.mode, item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "No date"].filter(Boolean).join(" · ")} badge={item.status} text={item.meetingNotes || item.recommendations} />
      ),
    },
    shortlists: {
      title: "Course and university shortlist",
      description: "Program options, admission probability and visa notes.",
      icon: GraduationCap,
      rows: selected.shortlists ?? [],
      empty: "No course shortlist yet.",
      render: (item) => (
        <RecordCard key={item.id} title={item.institutionName} meta={`${item.courseName} · ${item.destinationCountry}`} badge={`${item.admissionProbability ?? 50}%`} text={item.eligibilityNotes || item.visaRiskNotes} />
      ),
    },
    admissions: {
      title: "Admissions workflow",
      description: "Application status, offer letter, fee and deadlines.",
      icon: ClipboardCheck,
      rows: selected.admissions ?? [],
      empty: "No admission tracker yet.",
      render: (item) => (
        <RecordCard key={item.id} title={item.applicationStatus?.replace(/_/g, " ") || "Admission"} meta={item.admissionDeadline ? `Deadline ${new Date(item.admissionDeadline).toLocaleDateString()}` : "No deadline"} badge={item.offerLetterStatus} text={item.notes || item.countryDocumentStatus} />
      ),
    },
    documents: {
      title: "Document checklist",
      description: "Required student documents and upload status.",
      icon: FileText,
      rows: selected.documents ?? [],
      empty: "No document checklist yet.",
      render: (item) => (
        <RecordCard key={item.id} title={item.documentType} meta={item.required ? "Required" : "Optional"} badge={item.status} text={item.notes || item.fileName} />
      ),
    },
    tasks: {
      title: "Tasks and follow-ups",
      description: "Counsellor actions needed to move the case forward.",
      icon: ListChecks,
      rows: selected.tasks ?? [],
      empty: "No tasks yet.",
      render: (item) => (
        <RecordCard key={item.id} title={item.title} meta={item.dueDate ? `Due ${new Date(item.dueDate).toLocaleString()}` : item.taskType} badge={item.status} text={item.notes} />
      ),
    },
    ai: {
      title: "AI assessment outputs",
      description: "Profile assessment and editable SOP drafts.",
      icon: Brain,
      rows: selected.assessments ?? [],
      empty: "No AI assessments yet.",
      render: (item) => (
        <RecordCard key={item.id} title={item.assessmentType?.replace(/_/g, " ") || "AI output"} meta={`${item.admissionReadinessScore ?? 0}% admission · ${item.visaReadinessScore ?? 0}% visa`} badge={item.riskLevel} text={item.generatedText || item.responseJson?.summary || item.responseJson?.profileStrengthSummary} />
      ),
    },
    portal: {
      title: "Student portal",
      description: "Student-facing checklist and shared updates.",
      icon: BookOpen,
      rows: [{ id: "portal", ...student }],
      empty: "Portal details unavailable.",
      render: (item) => (
        <RecordCard key="portal" title={item.portalEnabled ? "Portal enabled" : "Portal disabled"} meta={item.portalToken ? `/student-counselling/${item.portalToken}` : "Generate portal link from the detail panel"} badge={item.portalEnabled ? "Active" : "Inactive"} text="Students can view shared sessions, shortlists, admission progress, document checklist and AI guidance from the portal." />
      ),
    },
  };

  if (activeMenu === "readiness") {
    const scores = [
      ["Profile strength", student.profileStrengthScore ?? 0, "bg-[#4055FF]"],
      ["Admission readiness", student.admissionReadinessScore ?? 0, "bg-[#00B4D8]"],
      ["Visa readiness", student.visaReadinessScore ?? 0, "bg-emerald-500"],
    ] as const;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Visa readiness for {student.fullName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Risk level, scoring dimensions and improvement focus.</p>
            </div>
            <Badge className={riskClass[student.riskLevel] ?? riskClass.medium}>{student.riskLevel || "medium"} risk</Badge>
          </div>
        </div>
        {scores.map(([label, score, color]) => (
          <div key={label} className="rounded-xl border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{label}</span>
              <span className={`font-bold ${scoreTone(score)}`}>{score}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200">
          Improve readiness by completing required documents, reviewing sponsor proof, and adding course-specific SOP notes.
        </div>
      </div>
    );
  }

  const config = rowsByMenu[activeMenu] ?? rowsByMenu.documents;
  const Icon = config.icon;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-[#FF2060]/10 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold">{config.title}</h3>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>
      {config.rows.length ? config.rows.map(config.render) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{config.empty}</div>
      )}
    </div>
  );
}

function RecordCard({ title, meta, badge, text }: { title: string; meta?: string; badge?: string; text?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">{title}</p>
          {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
        </div>
        {badge && <Badge variant="outline" className="capitalize">{String(badge).replace(/_/g, " ")}</Badge>}
      </div>
      {text && <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{text}</p>}
    </div>
  );
}

function QuickAdd({ title, icon: Icon, quick, setQuick, onSubmit, showCourse = false }: any) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" />{title}</div>
      {showCourse && (
        <div className="mb-2 grid gap-2">
          <Input placeholder="Destination country" value={quick.destinationCountry} onChange={(e) => setQuick({ ...quick, destinationCountry: e.target.value })} />
          <Input placeholder="University / college" value={quick.institutionName} onChange={(e) => setQuick({ ...quick, institutionName: e.target.value })} />
          <Input placeholder="Course / program" value={quick.courseName} onChange={(e) => setQuick({ ...quick, courseName: e.target.value })} />
        </div>
      )}
      {!showCourse && <Input className="mb-2" placeholder="Title / next action" value={quick.title} onChange={(e) => setQuick({ ...quick, title: e.target.value })} />}
      <Input className="mb-2" type="datetime-local" value={quick.dueDate} onChange={(e) => setQuick({ ...quick, dueDate: e.target.value })} />
      <Textarea className="mb-3 min-h-20" placeholder="Notes" value={quick.notes} onChange={(e) => setQuick({ ...quick, notes: e.target.value })} />
      <Button size="sm" variant="outline" onClick={onSubmit}>Add</Button>
    </div>
  );
}
