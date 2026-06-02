import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { CheckCircle2, FileText, GraduationCap, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function StudentCounsellingPortalPage() {
  const [, params] = useRoute("/student-counselling/:token");
  const token = params?.token ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const [upload, setUpload] = useState<Record<string, { fileName: string; fileUrl: string; notes: string }>>({});

  const portalQuery = useQuery<any>({
    queryKey: ["/api/counselling-portal", token],
    queryFn: async () => {
      const res = await fetch(`/api/counselling-portal/${token}`);
      if (!res.ok) throw new Error("Student portal link is unavailable");
      return res.json();
    },
    enabled: !!token,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, data }: any) => (await apiRequest("PATCH", `/api/counselling-portal/${token}/documents/${id}`, data)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/counselling-portal", token] });
      toast({ title: "Document marked as uploaded" });
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  if (portalQuery.isLoading) {
    return <div className="min-h-screen bg-background p-6 text-center text-muted-foreground">Loading counselling portal...</div>;
  }

  if (portalQuery.isError || !portalQuery.data) {
    return <div className="min-h-screen bg-background p-6 text-center text-destructive">This student portal link is unavailable.</div>;
  }

  const { student, tenant, documents = [], shortlists = [], sessions = [], admissions = [], tasks = [], assessments = [] } = portalQuery.data;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_32%),hsl(var(--background))]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card/90 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">{tenant?.name ?? "Visa Shuttle Counselling"}</p>
            <h1 className="text-2xl font-bold">Welcome, {student.fullName}</h1>
            <p className="text-sm text-muted-foreground">Track your counselling progress, recommendations, documents, and visa readiness.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Score label="Profile" value={student.profileStrengthScore ?? 0} />
            <Score label="Admission" value={student.admissionReadinessScore ?? 0} />
            <Score label="Visa" value={student.visaReadinessScore ?? 0} />
          </div>
        </div>

        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="shortlists">Recommendations</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="readiness">Visa Readiness</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="grid gap-3 md:grid-cols-2">
            {documents.map((doc: any) => {
              const draft = upload[doc.id] ?? { fileName: doc.fileName ?? "", fileUrl: doc.fileUrl ?? "", notes: doc.notes ?? "" };
              return (
                <Card key={doc.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" />{doc.documentType}</CardTitle>
                    <CardDescription>{doc.required ? "Required" : "Optional"} · {doc.status}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <Label>File name</Label>
                      <Input value={draft.fileName} onChange={(e) => setUpload({ ...upload, [doc.id]: { ...draft, fileName: e.target.value } })} placeholder="passport.pdf" />
                      <Label>Secure file URL / upload reference</Label>
                      <Input value={draft.fileUrl} onChange={(e) => setUpload({ ...upload, [doc.id]: { ...draft, fileUrl: e.target.value } })} placeholder="Paste uploaded file URL or reference" />
                      <Label>Notes</Label>
                      <Textarea value={draft.notes} onChange={(e) => setUpload({ ...upload, [doc.id]: { ...draft, notes: e.target.value } })} placeholder="Any note for counsellor" />
                    </div>
                    <Button className="w-full gap-2" onClick={() => uploadMutation.mutate({ id: doc.id, data: draft })}><UploadCloud className="h-4 w-4" />Submit document</Button>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="shortlists" className="grid gap-3 md:grid-cols-2">
            {shortlists.map((item: any) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">{item.courseName}</CardTitle>
                  <CardDescription>{item.institutionName} · {item.destinationCountry}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Intake: {item.intake || "TBA"}</p>
                  <p>Tuition: {item.tuitionFee || "TBA"}</p>
                  <Badge variant="outline">{item.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="progress" className="grid gap-3 md:grid-cols-3">
            <ProgressList title="Shared sessions" icon={GraduationCap} items={sessions} labelKey="nextAction" fallback="Counselling session" />
            <ProgressList title="Admissions" icon={CheckCircle2} items={admissions} labelKey="applicationStatus" fallback="Admission workflow" />
            <ProgressList title="Tasks" icon={FileText} items={tasks} labelKey="title" fallback="Task" />
          </TabsContent>

          <TabsContent value="readiness" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle>Visa readiness</CardTitle>
                <CardDescription>AI-assisted outputs are for guidance only and must be reviewed by your counsellor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className={`text-4xl font-bold ${scoreTone(student.visaReadinessScore ?? 0)}`}>{student.visaReadinessScore ?? 0}%</p>
                {assessments.map((item: any) => (
                  <pre key={item.id} className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">{item.generatedText || JSON.stringify(item.responseJson, null, 2)}</pre>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className={`text-lg font-bold ${scoreTone(value)}`}>{value}%</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ProgressList({ title, icon: Icon, items, labelKey, fallback }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No items yet.</p> : items.map((item: any) => (
          <div key={item.id} className="rounded-lg border p-2 text-sm">{item[labelKey] || fallback}</div>
        ))}
      </CardContent>
    </Card>
  );
}
