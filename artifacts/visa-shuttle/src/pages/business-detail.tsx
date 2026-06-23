import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  CheckCircle2,
  Code2,
  FileCheck2,
  Globe2,
  KeyRound,
  Layers3,
  LockKeyhole,
  Network,
  Palette,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UsersRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BusinessOfferKey = "api" | "enterprise" | "whitelabel" | "agentic";

const offerContent = {
  api: {
    eyebrow: "Business API",
    title: "Visa intelligence APIs for products, portals, and travel platforms",
    summary:
      "Connect Visa Shuttle checks, risk scores, fraud analysis, and document intelligence directly into your own app or customer workflow.",
    icon: Code2,
    gradient: "from-[#4055FF] via-[#5B55F6] to-[#FF2060]",
    primaryCta: "Request API Access",
    primaryHref: "/business/api/signup",
    secondaryCta: "Read API Docs",
    secondaryHref: "/docs/api",
    proof: ["Pay-as-you-go usage", "API keys and usage tracking", "Structured JSON responses"],
    features: [
      "Basic visa chance score API",
      "Deep profile analysis endpoint",
      "Visa Tools fraud-risk checks",
      "Document and input validation support",
      "Usage metering and wallet controls",
      "Developer-friendly API documentation",
      "Response fields for score, risk level, reasons, and next steps",
      "Built for travel apps, CRMs, agency websites, and marketplaces",
    ],
    workflow: [
      "Create a business account and generate API keys",
      "Send applicant profile, destination, visa type, or document text",
      "Receive structured scores, red flags, recommendations, and usage metadata",
    ],
    cards: [
      { icon: TerminalSquare, title: "Developer ready", body: "Simple endpoints, predictable payloads, and response formats designed for fast product integration." },
      { icon: KeyRound, title: "Controlled access", body: "Manage keys, usage, and wallet capacity from the business dashboard." },
      { icon: Network, title: "Composable workflows", body: "Use scoring, fraud detection, and document intelligence as separate product building blocks." },
    ],
  },
  enterprise: {
    eyebrow: "Enterprise Solutions",
    title: "Custom visa automation for high-volume organizations",
    summary:
      "A tailored operating layer for immigration firms, education consultants, travel groups, and platforms with complex visa workflows.",
    icon: Building2,
    gradient: "from-[#2438D9] via-[#4055FF] to-[#8B5CF6]",
    primaryCta: "Start Enterprise Enquiry",
    primaryHref: "/business/enterprise/signup",
    secondaryCta: "Explore Visa Desk",
    secondaryHref: "/business/visa-desk",
    proof: ["Custom workflows", "Role-based teams", "Operational reporting"],
    features: [
      "Custom dashboards for teams, branches, and operations",
      "Multi-user roles, permissions, and approval flows",
      "Advanced lead, customer, proposal, and application automation",
      "Custom reporting for application volume, revenue, and conversion",
      "Document checklist configuration by country and visa type",
      "Integrations with payment, email, SMS, and support workflows",
      "Migration support for existing agency or enterprise records",
      "Optional private implementation and onboarding support",
    ],
    workflow: [
      "Map your current visa operation and approval stages",
      "Configure Visa Desk modules, roles, checklists, payments, and reporting",
      "Launch with onboarding, staff training, and ongoing product support",
    ],
    cards: [
      { icon: UsersRound, title: "Built around teams", body: "Support branches, managers, counselors, and operations staff with clean role separation." },
      { icon: Layers3, title: "Workflow depth", body: "Shape leads, proposals, applications, payments, and documents around your real process." },
      { icon: ShieldCheck, title: "Production controls", body: "Designed for reliable data capture, audit history, and secure business operations." },
    ],
  },
  whitelabel: {
    eyebrow: "Whitelabel Solutions",
    title: "Launch your own branded visa portal powered by Visa Shuttle",
    summary:
      "Offer customer portals, proposal links, visa checks, document uploads, and application tracking under your agency or company brand.",
    icon: Palette,
    gradient: "from-[#4055FF] via-[#7C3AED] to-[#FF2060]",
    primaryCta: "Start Whitelabel Setup",
    primaryHref: "/business/whitelabel/signup",
    secondaryCta: "See Visa Desk Plans",
    secondaryHref: "/business/visa-desk",
    proof: ["Branded portal", "Customer proposal links", "Custom domain support"],
    features: [
      "Agency logo and brand appearance on customer-facing pages",
      "Public agency landing page for inbound enquiries",
      "Customer portal for uploads, messages, and application tracking",
      "Shareable proposal and payment links",
      "Offline and online payment collection support",
      "Custom domain support on eligible plans",
      "Remove Visa Shuttle branding on supported plans",
      "Flexible customer experience for proposals, documents, and status updates",
    ],
    workflow: [
      "Register your agency and choose the plan that fits your volume",
      "Configure logo, colors, payment details, checklists, and customer portal settings",
      "Share branded links with customers and manage everything from the agency dashboard",
    ],
    cards: [
      { icon: Globe2, title: "Your branded front door", body: "Give customers a professional portal experience with your agency identity up front." },
      { icon: WandSparkles, title: "Modern customer flow", body: "Collect details, payments, and documents through guided, mobile-friendly steps." },
      { icon: LockKeyhole, title: "Private workspace", body: "Agency data stays scoped to the logged-in agency workspace and customer links." },
    ],
  },
  agentic: {
    eyebrow: "Agentic Visa AI",
    title: "AI agents that help run visa operations from intake to action plan",
    summary:
      "Use AI-assisted workflows to read profiles, detect risks, recommend next steps, and support teams with faster visa decision preparation.",
    icon: Bot,
    gradient: "from-[#FF2060] via-[#7C3AED] to-[#4055FF]",
    primaryCta: "Request AI Workflow",
    primaryHref: "/business/agentic-visa-ai/signup",
    secondaryCta: "Explore Customizer",
    secondaryHref: "/app/customizer",
    proof: ["AI profile review", "Document gap detection", "Operational recommendations"],
    features: [
      "AI-assisted applicant profile review",
      "Deep risk analysis across visa decision dimensions",
      "Document gap and red-flag identification",
      "Suggested action plans for applicants and counselors",
      "Fraud-risk tools for visas, agencies, offers, and schemes",
      "Agency customizer workflow for requested automations",
      "Structured outputs for dashboards, reports, and customer messaging",
      "Human review friendly outputs with clear disclaimers and next steps",
    ],
    workflow: [
      "Capture customer profile, documents, and visa destination",
      "AI reviews data for risks, missing evidence, and recommended actions",
      "Your team uses the result to prepare applications faster and more consistently",
    ],
    cards: [
      { icon: Sparkles, title: "Smarter intake", body: "Turn raw customer details into structured risk signals and practical next steps." },
      { icon: FileCheck2, title: "Document intelligence", body: "Surface missing, weak, or inconsistent evidence before application submission." },
      { icon: Zap, title: "Team acceleration", body: "Help counselors work faster with AI summaries, recommendations, and check histories." },
    ],
  },
} satisfies Record<BusinessOfferKey, {
  eyebrow: string;
  title: string;
  summary: string;
  icon: typeof Code2;
  gradient: string;
  primaryCta: string;
  primaryHref: string;
  secondaryCta: string;
  secondaryHref: string;
  proof: string[];
  features: string[];
  workflow: string[];
  cards: Array<{ icon: typeof Code2; title: string; body: string }>;
}>;

function BusinessOfferPage({ offerKey }: { offerKey: BusinessOfferKey }) {
  const offer = offerContent[offerKey];
  const Icon = offer.icon;

  return (
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800 px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(64,85,255,0.12),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(255,32,96,0.08),transparent_30%),linear-gradient(180deg,#FFFFFF,#F8FAFC)] dark:bg-[radial-gradient(circle_at_14%_0%,rgba(64,85,255,0.18),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(255,32,96,0.12),transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <Badge className="mb-5 border-[#4055FF]/15 bg-white dark:bg-slate-800 dark:border-[#4055FF]/30 text-[#4055FF] shadow-sm hover:bg-white dark:hover:bg-slate-700">{offer.eyebrow}</Badge>
            <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${offer.gradient} text-white shadow-2xl shadow-[#4055FF]/20`}>
              <Icon className="h-8 w-8" />
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[#15236B] dark:text-white md:text-6xl">{offer.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">{offer.summary}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={offer.primaryHref}>
                <Button size="lg" className="w-full gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] text-white shadow-lg shadow-[#4055FF]/20 hover:opacity-90 sm:w-auto">
                  {offer.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={offer.secondaryHref}>
                <Button size="lg" variant="outline" className="w-full rounded-2xl border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-[#15236B] dark:text-white shadow-sm hover:bg-white dark:hover:bg-slate-800 sm:w-auto">
                  {offer.secondaryCta}
                </Button>
              </Link>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-[2rem] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-200/70 dark:shadow-none">
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${offer.gradient}`} />
            <CardContent className="p-6 md:p-8">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Designed for</p>
              <div className="mt-5 space-y-3">
                {offer.proof.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                    <BadgeCheck className="h-5 w-5 shrink-0 text-[#4055FF]" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-3xl border border-[#4055FF]/15 dark:border-[#4055FF]/25 bg-gradient-to-br from-[#4055FF]/10 via-white dark:via-slate-800 to-[#FF2060]/10 p-5">
                <p className="text-sm font-bold uppercase tracking-wide text-[#4055FF]">Business outcome</p>
                <p className="mt-3 text-2xl font-black leading-tight text-[#15236B] dark:text-white">
                  Faster decisions, cleaner operations, and stronger customer workflows.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#4055FF]">Capabilities</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B] dark:text-white md:text-4xl">What you get</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Each solution is built to blend AI visa intelligence with the practical tools businesses need to operate at scale.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {offer.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="text-sm font-black uppercase tracking-wide text-[#FF2060]">Workflow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B] dark:text-white">How it works</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {offer.workflow.map((step, index) => (
              <Card key={step} className="rounded-3xl border-slate-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-slate-800 shadow-sm">
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
          {offer.cards.map(({ icon: CardIcon, title, body }) => (
            <Card key={title} className="group overflow-hidden rounded-3xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <CardContent className="p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4055FF]/10 text-[#4055FF] transition group-hover:scale-110">
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
              <h2 className="text-2xl font-black tracking-tight md:text-4xl">Ready to build with Visa Shuttle?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
                Tell us your use case and we will guide you to the right business plan, API setup, Visa Desk workflow, or enterprise implementation.
              </p>
            </div>
            <Link href={offer.primaryHref}>
              <Button size="lg" className="w-full gap-2 rounded-2xl bg-white text-[#2438D9] shadow-lg shadow-white/10 hover:bg-white/90 md:w-auto">
                {offer.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export function BusinessApiDetailPage() {
  return <BusinessOfferPage offerKey="api" />;
}

export function EnterpriseSolutionsPage() {
  return <BusinessOfferPage offerKey="enterprise" />;
}

export function WhitelabelSolutionsPage() {
  return <BusinessOfferPage offerKey="whitelabel" />;
}

export function AgenticVisaAiPage() {
  return <BusinessOfferPage offerKey="agentic" />;
}
