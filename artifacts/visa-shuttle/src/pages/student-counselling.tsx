import { Link } from "wouter";
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const featureCards = [
  {
    icon: LayoutDashboard,
    title: "Counselling dashboard",
    body: "Track new enquiries, active counselling cases, pending documents, admission-ready students, high-risk profiles, follow-ups, and upcoming sessions.",
  },
  {
    icon: UsersRound,
    title: "Student profiles",
    body: "Capture academic history, English tests, sponsor details, budget, destination preference, intake, course goals, refusals, and travel history.",
  },
  {
    icon: GraduationCap,
    title: "Course shortlisting",
    body: "Shortlist destination countries, universities, courses, intakes, tuition fees, eligibility notes, admission probability, and visa risk notes.",
  },
  {
    icon: FileText,
    title: "Admission workflow",
    body: "Track applications, offer letters, conditional offer requirements, fee payment status, CAS, COE, I-20, deadlines, and notes.",
  },
  {
    icon: UploadCloud,
    title: "Student document portal",
    body: "Students can use a secure portal link to view progress, upload requested documents, and track document status.",
  },
  {
    icon: Brain,
    title: "AI-assisted assessment",
    body: "Generate profile strength, admission readiness, visa readiness, risk factors, missing information, next steps, and editable SOP drafts.",
  },
];

const workflow = [
  "Create student enquiry",
  "Build counselling profile",
  "Schedule session",
  "Shortlist course and university",
  "Collect documents",
  "Track admission",
  "Prepare visa readiness",
  "Move to Visa Desk application",
];

const metrics = [
  ["17", "Pipeline stages"],
  ["14+", "Document checklist types"],
  ["3", "Readiness scores"],
  ["1", "Student portal link"],
];

export default function StudentCounsellingPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b bg-[#F8FAFC] dark:bg-background">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(64,85,255,0.15),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(255,32,96,0.11),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.98))] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(64,85,255,0.18),transparent_34%),radial-gradient(circle_at_85%_8%,rgba(255,32,96,0.14),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <Badge className="mb-5 border-[#4055FF]/15 bg-white text-[#4055FF] shadow-sm hover:bg-white dark:bg-card">
              Visa Desk Counselling Beta
            </Badge>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight text-[#15236B] dark:text-foreground md:text-6xl">
              Student visa counselling built into Visa Desk.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-muted-foreground">
              Manage student enquiries, counselling sessions, course shortlists, admissions, documents, AI profile assessment, SOP drafts, and visa-readiness from one clean agency workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/business/visa-desk/signup">
                <Button size="lg" className="gap-2 rounded-2xl border-0 text-white shadow-lg shadow-[#4055FF]/20 hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}>
                  Start Visa Desk
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/business/visa-desk">
                <Button size="lg" variant="outline" className="gap-2 rounded-2xl bg-white/80 text-[#15236B] shadow-sm hover:bg-white dark:bg-card dark:text-foreground">
                  See Visa Desk plans
                  <GraduationCap className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -right-6 top-4 h-28 w-28 rounded-full bg-[#FF2060]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border bg-white p-5 shadow-2xl shadow-slate-200/70 dark:bg-card dark:shadow-none">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060]" />
              <div className="grid gap-3">
                {[
                  { icon: Sparkles, label: "New student enquiries", value: "42" },
                  { icon: CalendarClock, label: "Counselling sessions", value: "18" },
                  { icon: ShieldCheck, label: "Visa-ready students", value: "11" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border bg-slate-50 p-4 dark:bg-background/60">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#4055FF] shadow-sm dark:bg-card">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="text-2xl font-black text-[#15236B] dark:text-foreground">{item.value}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {metrics.map(([value, label]) => (
                  <div key={label} className="rounded-2xl bg-gradient-to-br from-[#4055FF]/10 to-[#FF2060]/10 p-4">
                    <p className="text-2xl font-black text-[#15236B] dark:text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 max-w-3xl">
          <Badge variant="outline" className="mb-3">What agencies get</Badge>
          <h2 className="text-3xl font-black tracking-tight">A counselling operating layer for study abroad teams.</h2>
          <p className="mt-3 text-muted-foreground">
            Built for student visa counselling agencies that need structured profiles, document collection, admission tracking, and visa-readiness before moving students into applications.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#4055FF]/10 text-[#4055FF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y bg-slate-50/70 dark:bg-card/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <Badge className="mb-3 bg-[#4055FF]/10 text-[#4055FF] hover:bg-[#4055FF]/10">Workflow</Badge>
            <h2 className="text-3xl font-black tracking-tight">From enquiry to visa-ready.</h2>
            <p className="mt-3 text-muted-foreground">
              Counselling connects with the existing Visa Desk workflow, so a visa-ready student can become a customer or application without duplicate work.
            </p>
            <Link href="/business/visa-desk/signup">
              <Button className="mt-6 gap-2 rounded-2xl">
                Create Visa Desk account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workflow.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border bg-background p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4055FF]/10 text-sm font-black text-[#4055FF]">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="rounded-[2rem] border bg-gradient-to-br from-[#15236B] via-[#4055FF] to-[#FF2060] p-8 text-white shadow-xl shadow-[#4055FF]/20 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-sm">
                <ListChecks className="h-4 w-4" />
                Student counselling beta
              </div>
              <h2 className="text-3xl font-black tracking-tight">Add counselling to your Visa Desk workspace.</h2>
              <p className="mt-3 max-w-2xl text-white/80">
                Start with leads, counselling profiles, shortlists, documents, AI readiness, and student portal support in one platform.
              </p>
            </div>
            <Link href="/business/visa-desk/signup">
              <Button size="lg" className="gap-2 rounded-2xl bg-white text-[#15236B] hover:bg-white/90">
                Start Visa Desk
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
