import { Link } from "wouter";
import { ArrowRight, BadgeCheck, Brain, Building2, Globe2, Layers3, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pillars = [
  { icon: Brain, title: "Visa intelligence", body: "AI-assisted checks for approval chance, risk signals, document gaps, and improvement plans." },
  { icon: ShieldCheck, title: "Fraud prevention", body: "Tools that help users and agencies identify possible fake visas, offers, agencies, and schemes." },
  { icon: Layers3, title: "Agency automation", body: "CRM, proposals, applications, payments, customer portals, and branded workflows for visa teams." },
  { icon: Globe2, title: "Business infrastructure", body: "APIs, white-label portals, and enterprise workflows for platforms and high-volume operators." },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(64,85,255,0.12),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(255,32,96,0.08),transparent_30%),linear-gradient(180deg,#FFFFFF,#F8FAFC)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <Badge className="mb-5 border-[#4055FF]/15 bg-white text-[#4055FF] shadow-sm hover:bg-white">Our Company</Badge>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[#15236B] md:text-6xl">
              Visa Shuttle is a Fospe product built for smarter visa decisions.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Visa Shuttle is an AI-powered visa intelligence platform from Fospe Software Private Limited. We help
              individuals understand visa readiness and help agencies run cleaner, faster, more transparent visa operations.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing">
                <Button size="lg" className="gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] text-white shadow-lg shadow-[#4055FF]/20 hover:opacity-90">
                  Explore for individuals
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/business">
                <Button size="lg" variant="outline" className="rounded-2xl border-slate-200 bg-white/80 text-[#15236B] shadow-sm hover:bg-white">
                  Explore business
                </Button>
              </Link>
            </div>
          </div>

          <Card className="relative overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060]" />
            <CardContent className="p-6 md:p-8">
              <div className="grid gap-3">
                {[
                  ["Product", "Visa Shuttle"],
                  ["Company", "Fospe Software Private Limited"],
                  ["Focus", "AI visa checks, agency CRM, business APIs"],
                  ["Principle", "Risk-based guidance, never approval guarantees"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-lg font-black text-[#15236B]">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-wide text-[#4055FF]">What we build</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B] md:text-4xl">
              A connected visa platform for applicants and businesses.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="rounded-3xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4055FF]/10 text-[#4055FF]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-[#15236B]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#FF2060]">Why it matters</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#15236B]">Visa decisions need clarity before submission.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: UsersRound, title: "For applicants", body: "Understand readiness and risks before paying for applications or travel plans." },
              { icon: Building2, title: "For agencies", body: "Move customers from lead to application with cleaner records, checklists, payments, and documents." },
              { icon: Sparkles, title: "For platforms", body: "Add visa intelligence into products using APIs, workflows, and white-label experiences." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-[#F8FAFC] p-5">
                <Icon className="mb-4 h-6 w-6 text-[#4055FF]" />
                <p className="font-black text-[#15236B]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-br from-[#2438D9] via-[#4055FF] to-[#FF2060] p-6 text-white shadow-2xl shadow-[#4055FF]/20 md:p-8">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight md:text-4xl">Build your visa workflow with confidence.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
                Visa Shuttle provides AI-assisted guidance only. Final decisions are always made by official visa and immigration authorities.
              </p>
            </div>
            <Link href="/contact">
              <Button size="lg" className="gap-2 rounded-2xl bg-white text-[#2438D9] hover:bg-white/90">
                Contact us
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
