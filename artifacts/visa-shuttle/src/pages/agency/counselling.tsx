import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  CalendarClock,
  CheckCircle2,
  FileText,
  GraduationCap,
  ListChecks,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  UserRound,
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
  const tenantId = current?.user?.tenantId;
  const qc = useQueryClient();
  const { toast } = useToast();
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
      if (!res.ok) throw new Error("Could not load counselling students");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const statsQuery = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "counselling", "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/counselling/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load counselling stats");
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
    mutationFn: async () => (await apiRequest("POST", `/api/tenants/${tenantId}/counselling/students`, {
      ...form,
      preferredDestinations: splitList(form.preferredDestinations),
    })).json(),
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
  const filtered = useMemo(() => students.filter((student) => {
    const haystack = `${student.fullName} ${student.email ?? ""} ${student.phone ?? ""} ${student.preferredCourse ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === "all" || student.status === statusFilter);
  }), [students, search, statusFilter]);
  const selected = detailQuery.data;

  const statCards = [
    ["Total counselling leads", stats.totalLeads ?? 0, UserRound],
    ["New enquiries", stats.newEnquiries ?? 0, Sparkles],
    ["Active cases", stats.activeCases ?? 0, GraduationCap],
    ["Awaiting documents", stats.awaitingDocuments ?? 0, FileText],
    ["Admission ready", stats.admissionReady ?? 0, CheckCircle2],
    ["Visa-ready students", stats.visaReady ?? 0, ShieldAlert],
    ["High-risk profiles", stats.highRisk ?? 0, ShieldAlert],
    ["Follow-ups due today", stats.followUpsDueToday ?? 0, CalendarClock],
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map(([label, value, Icon]) => (
            <Card key={label} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Student Pipeline</CardTitle>
                <CardDescription>Status-based counselling workflow for enquiries through visa outcome.</CardDescription>
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
