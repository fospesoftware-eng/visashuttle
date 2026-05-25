import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Coins,
  CreditCard,
  GraduationCap,
  Hotel,
  LineChart,
  Megaphone,
  Plane,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const audience = [
  { icon: Plane, title: "Travel Agencies" },
  { icon: ShieldCheck, title: "Immigration Consultants" },
  { icon: GraduationCap, title: "Study Abroad Agencies" },
  { icon: Plane, title: "Flight Booking Companies" },
  { icon: Hotel, title: "Hotel & Accommodation Providers" },
  { icon: Sparkles, title: "Holiday & Tour Operators" },
  { icon: BadgeCheck, title: "Travel Insurance Providers" },
  { icon: CreditCard, title: "Forex & International Payments" },
];

const features = [
  {
    icon: Users,
    title: "Lead Exchange",
    body: "Receive high-intent inquiries from users who have just completed visa eligibility, approval chance, or travel planning checks.",
    points: ["Targeted leads", "Visa category filters", "Destination based matching", "Dashboard lead management"],
  },
  {
    icon: Megaphone,
    title: "Display Campaigns",
    body: "Promote listings, banners, sponsored recommendations, and featured services across the Visa Shuttle ecosystem.",
    points: ["Business listings", "Banner promotions", "Sponsored placements", "Featured services"],
  },
  {
    icon: Coins,
    title: "Credit Wallet",
    body: "Top up credits and use them instantly for lead unlocks, campaign clicks, and sponsored visibility.",
    points: ["Lead unlocks", "Campaign clicks", "Sponsored visibility", "Flexible budget control"],
  },
];

const matchingExamples = [
  ["Student Visa", "Study Abroad Agencies"],
  ["Tourist Visa", "Holiday Packages & Hotels"],
  ["Immigration Visa", "Immigration Consultants"],
  ["Work Visa", "Recruitment and travel services"],
];

const whyChoose = [
  { icon: Target, title: "High Intent Audience", body: "Reach users already planning international travel, education, tourism, or immigration." },
  { icon: Sparkles, title: "AI-Powered Recommendations", body: "Your services are matched to the right audience using visa type, destination, and travel purpose." },
  { icon: BarChart3, title: "Performance Tracking", body: "Track clicks, impressions, lead activity, and campaign performance in real time." },
  { icon: LineChart, title: "Flexible Budgeting", body: "Start with any budget, top up credits when needed, and scale campaigns as results grow." },
];

const comingSoon = [
  "AI smart campaign optimization",
  "Automated lead matching",
  "Country-based targeting",
  "Premium featured listings",
  "Conversion analytics",
  "Business verification badge",
  "API integrations",
  "WhatsApp lead notifications",
  "Real-time campaign insights",
  "Smart audience segmentation",
];

const dashboardItems = [
  "Credit Wallet",
  "Campaign Management",
  "Lead Inbox",
  "Click Analytics",
  "Billing & Invoices",
  "Profile Management",
];

function AnimatedOrbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[430px]" aria-hidden="true">
      <div className="absolute inset-8 rounded-full border border-[#4055FF]/15 dark:border-white/10" />
      <div className="absolute inset-20 rounded-full border border-[#FF2060]/15 dark:border-[#FF2060]/20" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] bg-gradient-to-br from-[#4055FF] via-[#9033F5] to-[#FF2060] p-1 shadow-2xl shadow-[#4055FF]/20">
        <div className="flex h-full w-full items-center justify-center rounded-[1.75rem] bg-white/95 dark:bg-slate-950">
          <Sparkles className="h-12 w-12 text-[#4055FF]" />
        </div>
      </div>
      {[
        { icon: Target, label: "Match", className: "left-2 top-20 animate-bounce [animation-duration:4s]" },
        { icon: Users, label: "Leads", className: "right-0 top-10 animate-pulse" },
        { icon: Megaphone, label: "Ads", className: "bottom-14 right-8 animate-bounce [animation-duration:5s]" },
        { icon: Coins, label: "Credits", className: "bottom-8 left-8 animate-pulse" },
      ].map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`absolute ${item.className}`}>
            <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-3 py-2 text-sm font-bold text-slate-800 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/85 dark:text-white">
              <Icon className="h-4 w-4 text-[#FF2060]" />
              {item.label}
            </div>
          </div>
        );
      })}
      <div className="absolute inset-x-10 bottom-0 rounded-3xl border border-slate-200 bg-white/75 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <span>Campaign flow</span>
          <span>Live</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060]" />
        </div>
      </div>
    </div>
  );
}

export default function GrowthHubPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(64,85,255,0.16),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(255,32,96,0.14),transparent_28%),linear-gradient(180deg,rgba(0,180,216,0.08),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 lg:grid-cols-[1fr_0.82fr] lg:py-24">
          <div>
            <Badge className="mb-5 border-0 bg-[#4055FF]/10 text-[#4055FF] dark:bg-white/10 dark:text-white">
              Visa Shuttle Growth Hub
            </Badge>
            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-normal text-slate-950 dark:text-white md:text-6xl">
              Grow your business with AI-powered visa leads.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Connect your services with users actively planning international travel, education, tourism, and immigration through Visa Shuttle.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact?topic=growth-hub">
                <Button size="lg" className="w-full gap-2 border-0 text-white sm:w-auto" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}>
                  Join Growth Hub
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact?topic=growth-hub">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
          <AnimatedOrbit />
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-[#4055FF]">Who can join</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">Built for travel and immigration businesses.</h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audience.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#4055FF]/10 text-[#4055FF] dark:bg-white/10 dark:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-950 dark:text-white">{item.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-50 px-4 py-16 dark:bg-slate-950/50">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#FF2060]">How it works</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">Smart matching after every visa check.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              After a user completes their visa eligibility or approval chance check, Visa Shuttle recommends relevant business services based on visa type, destination country, travel purpose, and AI recommendation matching.
            </p>
          </div>
          <div className="grid gap-3">
            {matchingExamples.map(([visaType, service], index) => (
              <div key={visaType} className="flex items-center gap-4 rounded-2xl border bg-background p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4055FF] to-[#FF2060] text-sm font-black text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950 dark:text-white">{visaType}</p>
                  <p className="text-sm text-muted-foreground">{service}</p>
                </div>
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-[#4055FF]">Available features</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">Leads, campaigns, and credits in one growth system.</h2>
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4055FF] to-[#FF2060] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">{feature.title}</h3>
                  <p className="mt-3 min-h-[84px] leading-7 text-muted-foreground">{feature.body}</p>
                  <div className="mt-5 grid gap-2">
                    {feature.points.map((point) => (
                      <div key={point} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <BadgeCheck className="h-4 w-4 text-emerald-500" />
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl bg-gradient-to-br from-[#4055FF] via-[#9033F5] to-[#FF2060] p-8 text-white">
            <p className="text-sm font-bold uppercase tracking-widest text-white/70">Why Growth Hub</p>
            <h2 className="mt-3 text-3xl font-black">Reach high-intent users at the right moment.</h2>
            <p className="mt-4 leading-7 text-white/80">
              Visa Shuttle Growth Hub connects global visa applicants with trusted travel and immigration services using AI-powered lead exchange and business promotion.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact?topic=growth-hub">
                <Button className="w-full bg-white text-[#4055FF] hover:bg-white/90 sm:w-auto">Start Campaign</Button>
              </Link>
              <Link href="/contact?topic=growth-hub">
                <Button variant="outline" className="w-full border-white/35 bg-white/10 text-white hover:bg-white/20 sm:w-auto">Add Credits</Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {whyChoose.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border bg-card p-5 shadow-sm">
                  <Icon className="mb-4 h-6 w-6 text-[#4055FF]" />
                  <h3 className="font-black text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y bg-slate-50 px-4 py-16 dark:bg-slate-950/50">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#4055FF]">Business dashboard</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">Everything a growth partner needs.</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {dashboardItems.map((item) => (
                <div key={item} className="rounded-xl border bg-background px-4 py-3 text-sm font-bold text-slate-800 shadow-sm dark:text-white">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-[#FF2060]">Coming soon</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">More automation for partners.</h2>
            <div className="mt-7 flex flex-wrap gap-2">
              {comingSoon.map((item) => (
                <span key={item} className="rounded-full border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border bg-card p-8 text-center shadow-sm md:p-12">
          <Building2 className="mx-auto mb-5 h-10 w-10 text-[#4055FF]" />
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">Join Visa Shuttle Growth Hub</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">
            Start reaching high-intent visa applicants through AI-powered lead exchange and display campaigns.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/contact?topic=growth-hub"><Button className="border-0 text-white" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}>Join Growth Hub</Button></Link>
            <Link href="/contact?topic=growth-hub"><Button variant="outline">Start Campaign</Button></Link>
            <Link href="/contact?topic=growth-hub"><Button variant="outline">Add Credits</Button></Link>
            <Link href="/contact?topic=growth-hub"><Button variant="outline">Contact Sales</Button></Link>
          </div>
          <p className="mx-auto mt-7 max-w-3xl text-sm leading-6 text-muted-foreground">
            Visa Shuttle Growth Hub is an AI-powered lead exchange and business promotion platform connecting global visa applicants with trusted travel and immigration services.
          </p>
        </div>
      </section>
    </main>
  );
}
