import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Brain,
  Check,
  CheckCircle,
  CreditCard,
  Crown,
  FileCheck,
  Globe,
  Headphones,
  MessageSquare,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Lite",
    eyebrow: "Startup agencies",
    price: "₹1,999",
    period: "/ month",
    summary: "Perfect for small visa agencies and startup consultants.",
    icon: Sparkles,
    gradient: "from-slate-900 to-slate-700",
    accent: "bg-slate-900",
    features: [
      "Up to 3 users",
      "Up to 100 applications / month",
      "Lead management",
      "Proposal management",
      "Visa application management",
      "Auto passport scanner",
      "AI visa check",
      "Invoicing",
      "Basic accounting",
      "Email notifications to customers",
      "Offline payment collection",
    ],
  },
  {
    name: "Go",
    eyebrow: "Growing agencies",
    price: "₹3,999",
    period: "/ month",
    summary: "Designed for growing agencies managing higher application volumes.",
    icon: Zap,
    gradient: "from-[#4055FF] to-[#9033F5]",
    accent: "bg-[#4055FF]",
    recommended: true,
    features: [
      "Everything in Lite",
      "Up to 5 users",
      "Up to 500 applications / month",
      "Agency visa landing page",
      "SMS notifications to customers",
      "Online payment collection",
      "UPI QR payments",
      "Remove Powered by Visa Shuttle branding",
    ],
  },
  {
    name: "Power",
    eyebrow: "Professional firms",
    price: "₹7,999",
    period: "/ month",
    summary: "Built for professional immigration firms and high-volume agencies.",
    icon: Crown,
    gradient: "from-[#FF2060] to-[#9033F5]",
    accent: "bg-[#FF2060]",
    features: [
      "Everything in Lite and Go",
      "Up to 10 users",
      "Unlimited applications / month",
      "Fully featured agency website",
      "Custom domain support",
      "WhatsApp integration",
      "Dedicated support executive",
      "1 hour custom development every month",
    ],
  },
];

const valueProps = [
  { icon: Brain, title: "AI-powered visa processing" },
  { icon: FileCheck, title: "Faster application handling" },
  { icon: MessageSquare, title: "Automated customer communication" },
  { icon: Users, title: "Built for agencies and consultants" },
  { icon: BarChart3, title: "Scalable CRM plus visa automation" },
  { icon: ShieldCheck, title: "Modern cloud-based infrastructure" },
  { icon: WalletCards, title: "India-friendly UPI, QR and online payments" },
];

const featureRows = [
  ["Users included", "3", "5", "10"],
  ["Applications / month", "100", "500", "Unlimited"],
  ["Lead management", true, true, true],
  ["Proposal management", true, true, true],
  ["Auto passport scanner", true, true, true],
  ["AI visa check", true, true, true],
  ["Email notifications", true, true, true],
  ["SMS notifications", false, true, true],
  ["Online payments", false, true, true],
  ["UPI QR payments", false, true, true],
  ["Remove branding", false, true, true],
  ["Agency website", false, false, true],
  ["Custom domain", false, false, true],
  ["WhatsApp integration", false, false, true],
  ["Dedicated support", false, false, true],
  ["Monthly custom development", false, false, "1 hour"],
] as const;

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-300 ring-1 ring-slate-200">
        <X className="h-4 w-4" />
      </span>
    );
  }
  return <span className="text-sm font-semibold text-foreground">{value}</span>;
}

export default function AgencyCrmPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(64,85,255,0.12),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(255,32,96,0.10),transparent_28%),linear-gradient(180deg,hsl(var(--background)),rgba(64,85,255,0.04))]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
          <div>
            <Badge className="mb-5 border-[#4055FF]/20 bg-[#4055FF]/10 text-[#4055FF] hover:bg-[#4055FF]/10">
              Agency CRM Pricing
            </Badge>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
              Visa automation CRM built for agencies that move fast.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Manage leads, proposals, applications, documents, payments and customer communication from one clean workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/agency-register">
                <Button size="lg" className="gap-2 border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}>
                  Start agency CRM
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/business">
                <Button size="lg" variant="outline" className="gap-2">
                  Explore business tools
                  <Globe className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">All prices are exclusive of GST. Additional users: ₹500 / user / month.</p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-card p-4 shadow-2xl shadow-[#4055FF]/10">
              <div className="grid gap-3">
                {[
                  { label: "Applications this month", value: "482", icon: FileCheck, color: "text-[#4055FF]" },
                  { label: "Passport scans processed", value: "1,240", icon: ScanLine, color: "text-[#FF2060]" },
                  { label: "Customer updates sent", value: "8,910", icon: MessageSquare, color: "text-emerald-600" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-4 rounded-xl border bg-background p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                        <Icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="text-2xl font-black">{item.value}</p>
                      </div>
                      <BadgeCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-xl bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/60">Recommended plan</p>
                    <p className="text-2xl font-black">Go</p>
                  </div>
                  <Badge className="border-0 bg-white text-slate-950">Best value</Badge>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                  {["CRM", "Payments", "SMS"].map((item) => (
                    <div key={item} className="rounded-lg bg-white/10 px-2 py-3 font-semibold">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:py-18">
        <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Plans</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Choose the CRM plan that fits your agency</h2>
          </div>
          <div className="rounded-full border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground">
            Additional users: ₹500 / user / month
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div key={plan.name} className={`relative rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${plan.recommended ? "border-[#4055FF]/50 ring-4 ring-[#4055FF]/10" : ""}`}>
                {plan.recommended && (
                  <Badge className="absolute -top-3 left-6 border-0 bg-[#4055FF] text-white">Recommended</Badge>
                )}
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${plan.gradient} text-white shadow-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{plan.eyebrow}</p>
                <h3 className="mt-2 text-3xl font-black">{plan.name}</h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-muted-foreground">{plan.summary}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  <span className="pb-1 text-sm font-medium text-muted-foreground">{plan.period}</span>
                </div>
                <Link href="/agency-register">
                  <Button className="mt-6 w-full gap-2 border-0 text-white hover:opacity-90" style={{ background: plan.recommended ? "linear-gradient(135deg,#4055FF,#9033F5)" : "linear-gradient(135deg,#111827,#374151)" }}>
                    Get {plan.name}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y bg-muted/25">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Why Visa Shuttle</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">A cleaner operating system for visa teams</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {valueProps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border bg-background p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#4055FF]/10 text-[#4055FF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold leading-6">{item.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:py-18">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Comparison</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Recommended plan comparison</h2>
          </div>
          <Badge variant="secondary" className="w-fit">All prices exclusive of GST</Badge>
        </div>
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-5 py-4 text-left font-bold">Feature</th>
                  <th className="px-5 py-4 text-center font-bold">Lite</th>
                  <th className="px-5 py-4 text-center font-bold text-[#4055FF]">Go</th>
                  <th className="px-5 py-4 text-center font-bold">Power</th>
                </tr>
              </thead>
              <tbody>
                {featureRows.map(([feature, lite, go, power]) => (
                  <tr key={feature} className="border-b last:border-0">
                    <td className="px-5 py-4 font-medium">{feature}</td>
                    <td className="px-5 py-4 text-center"><FeatureValue value={lite} /></td>
                    <td className="px-5 py-4 text-center bg-[#4055FF]/[0.03]"><FeatureValue value={go} /></td>
                    <td className="px-5 py-4 text-center"><FeatureValue value={power} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl bg-slate-950 p-6 text-white md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/50">Ready for agencies</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Start with Lite, scale to Power when your volume grows.</h2>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/70">
                <span className="inline-flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Invoicing</span>
                <span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments</span>
                <span className="inline-flex items-center gap-2"><Headphones className="h-4 w-4" /> Support</span>
              </div>
            </div>
            <Link href="/agency-register">
              <Button size="lg" className="gap-2 bg-white text-slate-950 hover:bg-white/90">
                Create agency account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
