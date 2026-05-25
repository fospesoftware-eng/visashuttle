import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useB2cAuth } from "@/hooks/use-b2c-auth";

type ToolDetailKey = "fakeVisa" | "rejectionRecovery" | "fakeAgency" | "fakeEmployment";

const toolDetails = {
  fakeVisa: {
    eyebrow: "Fake Visa Detector",
    title: "Check visa copies for possible fraud indicators before you trust them",
    summary:
      "Upload a visa copy or paste visa details. Visa Shuttle reviews formatting, validity, seal, QR, category, and text inconsistencies using AI-assisted analysis.",
    icon: ShieldCheck,
    gradient: "from-[#4055FF] via-[#00B4D8] to-[#9033F5]",
    toolPath: "/visa-tools/fake_visa",
    proof: ["Visa copy review", "QR and URL text checks", "Risk-based result"],
    features: [
      "Destination country and visa type context",
      "Visa number, passport number, issue authority, and validity checks",
      "Formatting, spelling, stamp, seal, category, and QR/code risk signals",
      "Risk score, red flags, explanation, and recommended verification steps",
    ],
    workflow: ["Upload PDF, JPG, or PNG", "Add visible visa details or QR text", "Get a saved AI risk report"],
  },
  rejectionRecovery: {
    eyebrow: "Rejection Recovery",
    title: "Already rejected? Decode the real reason and plan your reapplication",
    summary:
      "Upload your rejection letter. We identify likely refusal reasons, explain what to fix, suggest how long to wait, and build a practical reapplication strategy.",
    icon: RefreshCcw,
    gradient: "from-[#4055FF] via-[#9033F5] to-[#FF2060]",
    toolPath: "/visa-tools/rejection_recovery",
    proof: ["Refusal reason decoding", "Wait-time guidance", "Reapplication strategy"],
    features: [
      "Upload refusal letters or paste officer notes and refusal codes",
      "Identify likely gaps in purpose, funds, ties, documents, or credibility",
      "Understand whether to reapply quickly or wait until evidence improves",
      "Get documents to fix, next steps, and a saved recovery report",
    ],
    workflow: ["Upload your rejection letter", "Add visa type, country, and refusal date", "Receive your recovery plan"],
  },
  fakeAgency: {
    eyebrow: "Fake Agency Detector",
    title: "Check an agency before paying fees or sharing documents",
    summary:
      "Review agency claims, website, email, phone, brochures, and agreements for suspicious signals such as guaranteed visas, payment pressure, or missing legal identity.",
    icon: Building2,
    gradient: "from-[#00B4D8] via-[#4055FF] to-[#9033F5]",
    toolPath: "/visa-tools/fake_agency",
    proof: ["Agency trust signals", "Domain and email checks", "Scam language review"],
    features: [
      "Website, phone, email, city, and social profile review",
      "Detect suspicious domain/email mismatch and generic claims",
      "Flag payment-first language and 100% guarantee promises",
      "Get trust indicators and recommended verification steps",
    ],
    workflow: ["Enter agency details", "Upload brochure or agreement if available", "Review the AI risk rating"],
  },
  fakeEmployment: {
    eyebrow: "Fake Employment Detector",
    title: "Analyze offer letters before you accept a job-linked visa promise",
    summary:
      "Upload an employment offer letter or recruiter message. Visa Shuttle checks salary realism, company details, email patterns, payment demands, and job/visa mismatch risks.",
    icon: BriefcaseBusiness,
    gradient: "from-[#9033F5] via-[#FF2060] to-[#FFB800]",
    toolPath: "/visa-tools/fake_employment_offer",
    proof: ["Offer letter review", "Employer verification checklist", "Recruiter risk signals"],
    features: [
      "Country, company, job title, salary, and recruiter context",
      "Detect unrealistic salary, missing registration details, and weak formatting",
      "Flag generic Gmail/Yahoo emails and suspicious payment demands",
      "Get questions to ask the employer or recruiter before proceeding",
    ],
    workflow: ["Upload the offer letter", "Add company and role details", "Get red flags and employer checks"],
  },
} satisfies Record<ToolDetailKey, {
  eyebrow: string;
  title: string;
  summary: string;
  icon: typeof ShieldCheck;
  gradient: string;
  toolPath: string;
  proof: string[];
  features: string[];
  workflow: string[];
}>;

function startHref(toolPath: string, isLoggedIn: boolean) {
  return isLoggedIn ? toolPath : `/sign-in?next=${encodeURIComponent(toolPath)}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`;
}

function VisaToolDetailPage({ toolKey }: { toolKey: ToolDetailKey }) {
  const { user } = useB2cAuth();
  const detail = toolDetails[toolKey];
  const Icon = detail.icon;
  const href = startHref(detail.toolPath, !!user);

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 py-14 dark:border-slate-800 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(64,85,255,0.14),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(255,32,96,0.10),transparent_30%),linear-gradient(180deg,#FFFFFF,#F8FAFC)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(64,85,255,0.22),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(255,32,96,0.16),transparent_30%),linear-gradient(180deg,#020617,#0F172A)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <Badge className="mb-5 border-[#4055FF]/15 bg-white text-[#4055FF] shadow-sm hover:bg-white dark:border-[#4055FF]/30 dark:bg-slate-900 dark:text-blue-300">
              {detail.eyebrow}
            </Badge>
            <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${detail.gradient} text-white shadow-2xl shadow-[#4055FF]/20`}>
              <Icon className="h-8 w-8" />
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[#15236B] dark:text-white md:text-6xl">{detail.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">{detail.summary}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={href}>
                <Button size="lg" className="w-full gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] text-white shadow-lg shadow-[#4055FF]/20 hover:opacity-90 sm:w-auto">
                  {user ? "Start Check" : "Sign in to Start"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/visa-tools">
                <Button size="lg" variant="outline" className="w-full rounded-2xl border-slate-200 bg-white/80 text-[#15236B] shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto">
                  View Visa Tools
                </Button>
              </Link>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-2xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${detail.gradient}`} />
            <CardContent className="p-6 md:p-8">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">What this helps with</p>
              <div className="mt-5 space-y-3">
                {detail.proof.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <BadgeCheck className="h-5 w-5 shrink-0 text-[#4055FF]" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/35 dark:text-amber-200">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm leading-6">
                    AI-assisted analysis only. Always verify with official government, employer, or registered agency sources.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#4055FF]">Capabilities</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B] dark:text-white md:text-4xl">What the AI checks</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Designed for applicants who need a practical second look before trusting a document, agency, offer, or reapplication plan.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {detail.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-12 dark:border-slate-800 dark:bg-slate-900/60 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm font-black uppercase tracking-wide text-[#FF2060]">Workflow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B] dark:text-white">How it works</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {detail.workflow.map((step, index) => (
              <Card key={step} className="rounded-3xl border-slate-200 bg-[#F8FAFC] shadow-sm dark:border-slate-800 dark:bg-slate-950/50">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4055FF] to-[#FF2060] text-lg font-black text-white shadow-lg shadow-[#4055FF]/20">
                    {index + 1}
                  </div>
                  <p className="text-base font-bold leading-7 text-slate-800 dark:text-slate-100">{step}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[
            { icon: Upload, title: "Upload or paste", body: "Use a document upload, screenshot, letter, message, or plain text details." },
            { icon: LockKeyhole, title: "Signed-in and saved", body: "Run checks inside your B2C dashboard and keep the report in your history." },
            { icon: FileText, title: "Report ready", body: "Review score, red flags, explanation, and next steps, then download or print." },
          ].map(({ icon: CardIcon, title, body }) => (
            <Card key={title} className="group overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <CardContent className="p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4055FF]/10 text-[#4055FF] transition group-hover:scale-110 dark:bg-[#4055FF]/20 dark:text-blue-300">
                  <CardIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#15236B] dark:text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2438D9] via-[#4055FF] to-[#FF2060] p-6 text-white shadow-2xl shadow-[#4055FF]/20 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.18),transparent_34%),radial-gradient(circle_at_86%_100%,rgba(255,255,255,0.16),transparent_30%)]" />
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight md:text-4xl">Ready to run this check?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Start inside Visa Tools. If you are not signed in, we will take you to login first and bring you back.
              </p>
            </div>
            <Link href={href}>
              <Button size="lg" className="w-full gap-2 rounded-2xl bg-white text-[#2438D9] shadow-lg shadow-white/10 hover:bg-white/90 md:w-auto">
                {user ? "Open Tool" : "Sign in to Start"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export function FakeVisaDetectorPage() {
  return <VisaToolDetailPage toolKey="fakeVisa" />;
}

export function RejectionRecoveryPage() {
  return <VisaToolDetailPage toolKey="rejectionRecovery" />;
}

export function FakeAgencyDetectorPage() {
  return <VisaToolDetailPage toolKey="fakeAgency" />;
}

export function FakeEmploymentDetectorPage() {
  return <VisaToolDetailPage toolKey="fakeEmployment" />;
}
