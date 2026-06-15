import { useState } from "react";
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
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CURRENCIES = [
  { code: "USD", symbol: "$", rate: 1, flag: "🇺🇸" },
  { code: "GBP", symbol: "£", rate: 0.79, flag: "🇬🇧" },
  { code: "EUR", symbol: "€", rate: 0.92, flag: "🇪🇺" },
  { code: "INR", symbol: "₹", rate: 83, flag: "🇮🇳" },
  { code: "AED", symbol: "AED ", rate: 3.67, flag: "🇦🇪" },
  { code: "BHD", symbol: "BHD ", rate: 0.38, flag: "🇧🇭" },
] as const;

type CurrencyCode = typeof CURRENCIES[number]["code"];

function convertPrice(usdAmount: number, curr: typeof CURRENCIES[number]): string {
  const val = usdAmount * curr.rate;
  if (curr.code === "INR") return `${curr.symbol}${Math.round(val).toLocaleString("en-IN")}`;
  if (curr.code === "BHD") return `${curr.symbol}${val.toFixed(3)}`;
  return `${curr.symbol}${Math.round(val)}`;
}

const additionalUserUsd = 6;

const plans = [
  {
    name: "Lite",
    eyebrow: "Startup agencies",
    usdPrice: 24,
    period: "/ month",
    summary: "Perfect for small visa agencies and startup consultants.",
    icon: Sparkles,
    gradient: "from-[#4055FF] to-[#00B4D8]",
    buttonGradient: "linear-gradient(135deg,#4055FF,#00B4D8)",
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
    usdPrice: 48,
    period: "/ month",
    summary: "Designed for growing agencies managing higher application volumes.",
    icon: Zap,
    gradient: "from-[#4055FF] to-[#9033F5]",
    buttonGradient: "linear-gradient(135deg,#4055FF,#9033F5)",
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
    usdPrice: 96,
    period: "/ month",
    summary: "Built for professional immigration firms and high-volume agencies.",
    icon: Crown,
    gradient: "from-[#FF2060] to-[#9033F5]",
    buttonGradient: "linear-gradient(135deg,#FF2060,#9033F5)",
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
  { icon: BarChart3, title: "Scalable Visa Desk plus visa automation" },
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

export default function VisaDeskPage() {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("USD");
  const curr = CURRENCIES.find((c) => c.code === currencyCode)!;

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[#F8FAFC]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(64,85,255,0.12),transparent_34%),radial-gradient(circle_at_90%_12%,rgba(255,32,96,0.08),transparent_30%),linear-gradient(180deg,#FFFFFF,#F8FAFC)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-20">
          <div>
            <Badge className="mb-5 border-[#4055FF]/15 bg-white text-[#4055FF] shadow-sm hover:bg-white">
              Visa Desk Pricing
            </Badge>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[#15236B] md:text-6xl">
              A modern Visa Desk for agencies that want cleaner growth.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Manage leads, proposals, applications, documents, payments and customer communication from one clean workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/business/visa-desk/signup">
                <Button size="lg" className="gap-2 rounded-2xl border-0 text-white shadow-lg shadow-[#4055FF]/20 hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}>
                  Start Visa Desk
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/business">
                <Button size="lg" variant="outline" className="gap-2 rounded-2xl border-slate-200 bg-white/80 text-[#15236B] shadow-sm hover:bg-white">
                  Explore business tools
                  <Globe className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              All prices are exclusive of GST. Additional users: {convertPrice(additionalUserUsd, curr)} / user / month.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -left-5 top-10 hidden h-24 w-24 animate-pulse rounded-full bg-[#4055FF]/10 blur-2xl md:block" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/70">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060]" />
              <div className="grid gap-3">
                {[
                  { label: "Applications this month", value: "482", icon: FileCheck, color: "text-[#4055FF]" },
                  { label: "Passport scans processed", value: "1,240", icon: ScanLine, color: "text-[#FF2060]" },
                  { label: "Customer updates sent", value: "8,910", icon: MessageSquare, color: "text-emerald-600" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
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
              <div className="mt-4 rounded-3xl border border-[#4055FF]/15 bg-gradient-to-br from-[#4055FF]/10 via-white to-[#FF2060]/10 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Recommended plan</p>
                    <p className="text-2xl font-black">Go</p>
                  </div>
                  <Badge className="border-0 bg-[#4055FF] text-white">Best value</Badge>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-foreground">
                  {["Visa Desk", "Payments", "SMS"].map((item) => (
                    <div key={item} className="rounded-lg border bg-background/70 px-2 py-3 font-semibold">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:py-18">
        <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Plans</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Choose the Visa Desk plan that fits your agency</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:flex-col md:items-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 justify-between gap-3 rounded-full bg-background px-4 shadow-sm">
                  <span className="flex items-center gap-2">
                    <span>{curr.flag}</span>
                    <span>{curr.code}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {CURRENCIES.map((currency) => (
                  <DropdownMenuItem
                    key={currency.code}
                    className="gap-2"
                    onClick={() => setCurrencyCode(currency.code)}
                  >
                    <span>{currency.flag}</span>
                    <span>{currency.code}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="rounded-full border bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground">
              Additional users: {convertPrice(additionalUserUsd, curr)} / user / month
            </div>
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
                  <span className="text-4xl font-black tracking-tight">{convertPrice(plan.usdPrice, curr)}</span>
                  <span className="pb-1 text-sm font-medium text-muted-foreground">{plan.period}</span>
                </div>
                <Link href={`/business/visa-desk/signup?plan=${plan.name.toLowerCase()}`}>
                  <Button className="mt-6 w-full gap-2 border-0 text-white hover:opacity-90" style={{ background: plan.buttonGradient }}>
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
        <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-[#4055FF]/15 bg-gradient-to-br from-[#4055FF]/10 via-background to-[#FF2060]/10 p-6 shadow-xl shadow-[#4055FF]/5 md:p-8">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Ready for agencies</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Start with Lite, scale to Power when your volume grows.</h2>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Invoicing</span>
                <span className="inline-flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments</span>
                <span className="inline-flex items-center gap-2"><Headphones className="h-4 w-4" /> Support</span>
              </div>
            </div>
            <Link href="/business/visa-desk/signup">
              <Button size="lg" className="gap-2 border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}>
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
