import { Link } from "wouter";
import { ArrowRight, BadgeCheck, Brain, Building2, Globe2, Layers3, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const focusAreas = [
  {
    icon: Brain,
    title: "AI visa intelligence",
    body: "Readiness checks, risk scoring, document gaps, improvement plans, and fraud-risk signals for applicants before they submit.",
  },
  {
    icon: Layers3,
    title: "Agency operating system",
    body: "Leads, customers, proposals, applications, documents, invoices, payments, and branded customer portals in one workflow.",
  },
  {
    icon: Globe2,
    title: "Business infrastructure",
    body: "APIs, white-label portals, enterprise workflows, and agentic visa automation for platforms and high-volume teams.",
  },
];

const principles = [
  "Risk-based guidance, not approval guarantees",
  "Better preparation before money and time are committed",
  "Human-readable workflows for applicants and agencies",
  "Operational transparency across every visa journey",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F7F9FF] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200/70 px-4 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(64,85,255,0.14),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(255,32,96,0.10),transparent_28%),linear-gradient(180deg,#FFFFFF_0%,#F7F9FF_78%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4055FF]">Our Company</p>
          <div className="mt-7 grid gap-10 lg:grid-cols-[1fr_0.78fr] lg:items-end">
            <div>
              <h1 className="max-w-5xl text-5xl font-black leading-[0.98] tracking-tight text-[#101A4D] md:text-7xl">
                Visa Shuttle helps people and visa businesses move with more clarity.
              </h1>
            </div>
            <div>
              <p className="text-lg leading-8 text-slate-600">
                Visa Shuttle is an AI-powered visa intelligence and automation platform from Fospe Software Private Limited. We build tools for applicants, agencies, and businesses that need faster preparation, cleaner decisions, and more transparent visa workflows.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/pricing">
                  <Button className="h-12 gap-2 rounded-full border-0 bg-[#101A4D] px-6 text-white hover:bg-[#16246A]">
                    Explore plans
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/business">
                  <Button variant="outline" className="h-12 rounded-full border-slate-300 bg-white/70 px-6 text-[#101A4D] hover:bg-white">
                    For business
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-14 overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/60 shadow-2xl shadow-[#4055FF]/10 backdrop-blur">
            <div className="grid min-h-[360px] lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative overflow-hidden bg-[linear-gradient(135deg,#4055FF_0%,#5B55F6_36%,#9033F5_68%,#FF2060_100%)] p-8 text-white md:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.38),transparent_20%),radial-gradient(circle_at_76%_72%,rgba(255,255,255,0.22),transparent_24%)]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/16 px-4 py-2 text-sm font-bold backdrop-blur">
                    <Sparkles className="h-4 w-4" />
                    Product by Fospe
                  </div>
                  <div className="mt-20 max-w-2xl">
                    <p className="text-3xl font-black leading-tight md:text-5xl">
                      A single platform for readiness, verification, and visa operations.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 md:p-8">
                <div className="grid h-full gap-4">
                  {[
                    ["Product", "Visa Shuttle"],
                    ["Company", "Fospe Software Private Limited"],
                    ["Focus", "AI checks, Visa Desk, APIs, white-label workflows"],
                    ["Promise", "Clearer preparation before official submission"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex flex-col justify-center border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                      <p className="mt-2 text-xl font-black leading-tight text-[#101A4D]">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FF2060]">What we build</p>
              <h2 className="mt-5 text-4xl font-black tracking-tight text-[#101A4D] md:text-5xl">
                Visa tools that connect decision support with real operations.
              </h2>
            </div>
            <div className="grid gap-8">
              {focusAreas.map(({ icon: Icon, title, body }) => (
                <div key={title} className="grid gap-5 border-t border-slate-200 pt-8 md:grid-cols-[72px_1fr]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#4055FF] shadow-lg shadow-[#4055FF]/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#101A4D]">{title}</h3>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4055FF]">Why it matters</p>
            <h2 className="mt-5 text-4xl font-black tracking-tight text-[#101A4D] md:text-5xl">
              Visa journeys should not feel like guesswork.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Applicants need to know what is weak before they apply. Agencies need structured workflows that keep every document, payment, proposal, and customer update in sync.
            </p>
          </div>
          <div className="grid gap-3">
            {principles.map((item) => (
              <div key={item} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-[#F7F9FF] p-5">
                <BadgeCheck className="h-5 w-5 shrink-0 text-[#4055FF]" />
                <p className="font-bold text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "For individuals", body: "Basic checks, deep checks, fraud-risk tools, PDF reports, and check history for signed-in users." },
            { icon: Building2, title: "For agencies", body: "Visa Desk, customer portals, proposals, document uploads, invoicing, offline payments, and agency branding." },
            { icon: Globe2, title: "For platforms", body: "Business API, white-label solutions, enterprise workflows, and agentic visa AI for larger teams." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <Icon className="h-7 w-7 text-[#4055FF]" />
              <h3 className="mt-8 text-2xl font-black text-[#101A4D]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16 md:pb-24">
        <div className="mx-auto max-w-7xl rounded-[2.25rem] bg-[#101A4D] p-8 text-white md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white/50">Important note</p>
              <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
                We help with preparation. Official decisions remain with immigration authorities.
              </h2>
            </div>
            <Link href="/contact">
              <Button className="h-12 gap-2 rounded-full bg-white px-6 font-bold text-[#101A4D] hover:bg-white/90">
                Contact Visa Shuttle
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
