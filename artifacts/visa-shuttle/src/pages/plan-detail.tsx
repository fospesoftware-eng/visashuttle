import { Link } from "wouter";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coins,
  Download,
  FileSearch,
  Gauge,
  History,
  Layers3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import {
  B2C_CURRENCIES,
  B2C_CURRENCY_FLAGS,
  type B2cCurrency,
  type B2cPlan,
  formatB2cPrice,
  formatB2cPlanPrice,
  getStoredB2cCurrency,
  normalizeB2cPlans,
  storeB2cCurrency,
} from "@/lib/b2c-pricing";

type PlanKey = "free" | "deep" | "pro";

const planContent = {
  free: {
    routeName: "Basic Check",
    eyebrow: "Free plan",
    headline: "Start with a fast AI visa chance check",
    summary:
      "A quick, clean assessment for first-time users who want to understand their approval chance before spending time on a full application.",
    gradient: "from-[#2438D9] via-[#4055FF] to-[#7857FF]",
    accent: "text-[#4055FF]",
    icon: Gauge,
    primaryCta: "Start Basic Check",
    secondaryCta: "Compare Plans",
    secondaryHref: "/pricing",
    highlights: [
      "1 Basic Check",
      "Approval chance percentage",
      "Status label: High, Good, Moderate, or Low",
      "Strengths and risk factors",
      "Basic next steps",
      "100 Visa Tools credits",
    ],
    steps: [
      "Create your free account",
      "Answer the core visa profile questions",
      "Get your AI score and next steps",
    ],
    cards: [
      { icon: Sparkles, title: "Instant direction", body: "Know whether your profile looks strong, moderate, or risky before you go deeper." },
      { icon: ShieldCheck, title: "Risk factors", body: "See the biggest issues that may affect your visa confidence." },
      { icon: Coins, title: "Tools credits", body: "Use included credits for Visa Tools checks after signup." },
    ],
  },
  deep: {
    routeName: "Deep Check",
    eyebrow: "Most popular",
    headline: "Get embassy-style AI risk analysis before applying",
    summary:
      "Deep Check reviews your full profile across key visa decision dimensions and turns it into a practical improvement plan.",
    gradient: "from-[#4055FF] via-[#6E49FF] to-[#FF2060]",
    accent: "text-[#4055FF]",
    icon: Brain,
    primaryCta: "Get Deep Check",
    secondaryCta: "View Basic Check",
    secondaryHref: "/plans/basic-check",
    highlights: [
      "Full embassy-style risk analysis",
      "7 profile dimensions",
      "Individual and family applicant support",
      "Document gap analysis and action plan",
      "Red flag identification",
      "Personalized improvement plan",
      "PDF report download",
      "Check history and dashboard",
      "Priority support",
      "500 Visa Tools credits",
    ],
    steps: [
      "Complete the guided Deep Check profile",
      "AI reviews finances, travel history, ties, and documents",
      "Download your report and fix gaps before applying",
    ],
    cards: [
      { icon: FileSearch, title: "Document gaps", body: "Understand what is missing, weak, expired, or inconsistent before submission." },
      { icon: Download, title: "PDF report", body: "Keep a shareable action plan with score, red flags, strengths, and recommendations." },
      { icon: Mail, title: "Priority support", body: "Get higher-priority help when you need clarity around your result." },
    ],
  },
  pro: {
    routeName: "Pro Plan",
    eyebrow: "For frequent users",
    headline: "Run more checks with a monthly visa intelligence plan",
    summary:
      "Pro is built for users, families, and repeat applicants who need ongoing checks, Deep Checks, history, and larger Visa Tools capacity.",
    gradient: "from-[#FF2060] via-[#7C3AED] to-[#4055FF]",
    accent: "text-[#FF2060]",
    icon: Zap,
    primaryCta: "Start Pro Plan",
    secondaryCta: "View Deep Check",
    secondaryHref: "/plans/deep-check",
    highlights: [
      "Unlimited Basic checks",
      "10 Deep Checks every month",
      "1000 Visa Tools credits",
      "PDF report download",
      "Report email delivery",
      "Check history and dashboard",
      "Priority support",
    ],
    steps: [
      "Choose Pro and activate your monthly plan",
      "Run Basic and Deep Checks whenever needed",
      "Track reports, credits, and history from your dashboard",
    ],
    cards: [
      { icon: Layers3, title: "More capacity", body: "Ideal when you need multiple destination checks or family planning." },
      { icon: History, title: "Saved history", body: "Reopen past checks and compare how your profile improves over time." },
      { icon: LockKeyhole, title: "Dashboard access", body: "Manage checks, reports, and credits from your signed-in account." },
    ],
  },
} satisfies Record<PlanKey, {
  routeName: string;
  eyebrow: string;
  headline: string;
  summary: string;
  gradient: string;
  accent: string;
  icon: typeof Sparkles;
  primaryCta: string;
  secondaryCta: string;
  secondaryHref: string;
  highlights: string[];
  steps: string[];
  cards: Array<{ icon: typeof Sparkles; title: string; body: string }>;
}>;

function CurrencySwitcher({ currency, onChange }: { currency: B2cCurrency; onChange: (currency: B2cCurrency) => void }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {B2C_CURRENCIES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={`rounded-xl px-2 py-2 text-xs font-black transition ${
              currency === code ? "bg-white text-[#2438D9] shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="block text-base leading-none">{B2C_CURRENCY_FLAGS[code]}</span>
            <span className="mt-1 block">{code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlanDetailPage({ planKey }: { planKey: PlanKey }) {
  const { user } = useB2cAuth();
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());
  const { data: planData } = useQuery<B2cPlan[]>({ queryKey: ["/api/public/b2c-plans"] });
  const plans = normalizeB2cPlans(planData);
  const plan = plans.find((item) => item.planKey === planKey);
  const content = planContent[planKey];
  const Icon = content.icon;

  const price = useMemo(() => {
    if (planKey === "free") return formatB2cPrice(currency, 0);
    return plan ? formatB2cPlanPrice(plan, currency) : formatB2cPrice(currency);
  }, [currency, plan, planKey]);

  const period = plan?.billingType === "monthly" ? "/month" : plan?.billingType === "one_time" ? "/check" : "";
  const checkoutPath = planKey === "free" ? "/join" : `/payment/deep-check?plan=${planKey}&currency=${currency}`;
  const primaryHref = user ? (planKey === "free" ? "/account" : checkoutPath) : planKey === "free" ? "/join" : `/sign-in?next=${encodeURIComponent(checkoutPath)}`;

  function handleCurrencyChange(next: B2cCurrency) {
    setCurrency(next);
    storeB2cCurrency(next);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className={`relative overflow-hidden bg-gradient-to-br ${content.gradient} px-4 py-14 text-white md:py-20`}>
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute left-[8%] top-16 h-32 w-32 animate-pulse rounded-full border border-white/20" />
          <div className="absolute right-[12%] top-20 h-20 w-20 animate-bounce rounded-3xl border border-white/15 [animation-duration:4s]" />
          <div className="absolute bottom-8 left-[42%] h-24 w-24 animate-pulse rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <Badge className="mb-5 border-white/20 bg-white/15 text-white hover:bg-white/15">{content.eyebrow}</Badge>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15 shadow-2xl backdrop-blur">
              <Icon className="h-8 w-8" />
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">{content.headline}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 md:text-lg">{content.summary}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref}>
                <Button size="lg" className="w-full gap-2 rounded-2xl bg-white text-[#2438D9] shadow-lg shadow-white/10 hover:bg-white/90 sm:w-auto">
                  {content.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={content.secondaryHref}>
                <Button size="lg" variant="outline" className="w-full rounded-2xl border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto">
                  {content.secondaryCta}
                </Button>
              </Link>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[2rem] border-white/20 bg-white/12 text-white shadow-2xl backdrop-blur-xl">
            <CardContent className="p-6 md:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-white/60">{content.routeName}</p>
                  <div className="mt-2 flex flex-wrap items-end gap-x-2">
                    <span className="text-5xl font-black tracking-tight">{price}</span>
                    {period && <span className="pb-1.5 text-sm font-bold text-white/65">{period}</span>}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/15 p-3">
                  <CircleDollarSign className="h-6 w-6" />
                </div>
              </div>
              <CurrencySwitcher currency={currency} onChange={handleCurrencyChange} />
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/12 p-3">
                  <Gauge className="mb-2 h-4 w-4" />
                  <p className="text-[11px] font-bold uppercase text-white/55">Basic</p>
                  <p className="text-sm font-black">{plan?.basicCheckLimit && plan.basicCheckLimit >= 9999 ? "Unlimited" : plan?.basicCheckLimit ?? (planKey === "free" ? 1 : 1)}</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <FileSearch className="mb-2 h-4 w-4" />
                  <p className="text-[11px] font-bold uppercase text-white/55">Deep</p>
                  <p className="text-sm font-black">{plan?.deepCheckLimit ?? (planKey === "pro" ? 10 : planKey === "deep" ? 1 : 0)}</p>
                </div>
                <div className="rounded-2xl bg-white/12 p-3">
                  <Coins className="mb-2 h-4 w-4" />
                  <p className="text-[11px] font-bold uppercase text-white/55">Credits</p>
                  <p className="text-sm font-black">{plan?.visaToolsCredits ?? (planKey === "pro" ? 1000 : planKey === "deep" ? 500 : 100)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className={`text-sm font-black uppercase tracking-wide ${content.accent}`}>Included features</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B] md:text-4xl">Everything this plan unlocks</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Built for clear decisions, practical next steps, and a smoother path before you commit to an application.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.highlights.map((feature) => (
              <div key={feature} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-semibold leading-6 text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-sm font-black uppercase tracking-wide ${content.accent}`}>How it works</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B]">From signup to smarter decision</h2>
            </div>
            <Link href={primaryHref}>
              <Button className="w-full gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] text-white hover:opacity-90 md:w-auto">
                {content.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {content.steps.map((step, index) => (
              <Card key={step} className="rounded-3xl border-slate-200 bg-[#F8FAFC] shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4055FF] to-[#FF2060] text-lg font-black text-white shadow-lg shadow-[#4055FF]/20">
                    {index + 1}
                  </div>
                  <p className="text-base font-bold leading-7 text-slate-900">{step}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {content.cards.map(({ icon: CardIcon, title, body }) => (
            <Card key={title} className="group overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <CardContent className="p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4055FF]/10 text-[#4055FF] transition group-hover:scale-110">
                  <CardIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black tracking-tight text-[#15236B]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
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
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  <Star className="mr-1 h-3.5 w-3.5" />
                  AI-assisted
                </Badge>
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  Fast results
                </Badge>
                <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" />
                  Saved dashboard
                </Badge>
              </div>
              <h2 className="text-2xl font-black tracking-tight md:text-4xl">Ready to check your visa confidence?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Visa Shuttle provides AI-based estimation only. Final visa decisions are made by the relevant embassy,
                consulate, or immigration authority.
              </p>
            </div>
            <Link href={primaryHref}>
              <Button size="lg" className="w-full gap-2 rounded-2xl bg-white text-[#2438D9] shadow-lg shadow-white/10 hover:bg-white/90 md:w-auto">
                {content.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export function BasicCheckPlanPage() {
  return <PlanDetailPage planKey="free" />;
}

export function DeepCheckPlanPage() {
  return <PlanDetailPage planKey="deep" />;
}

export function ProPlanPage() {
  return <PlanDetailPage planKey="pro" />;
}
