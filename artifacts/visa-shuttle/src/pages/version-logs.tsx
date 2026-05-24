import { Link } from "wouter";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const versions = [
  {
    slug: "visa-tools-and-b2c-plans",
    version: "v1.8",
    date: "May 2026",
    title: "Visa Tools, credits, and B2C plan upgrades",
    bullets: ["Fake Visa Detector and fraud-risk tools", "Free, Deep Check, and Pro plan detail pages", "Visa Tools credits and admin credit management"],
  },
  {
    slug: "agency-crm-customer-portals",
    version: "v1.7",
    date: "May 2026",
    title: "Agency CRM proposal and customer portal improvements",
    bullets: ["Proposal links with customer upload flow", "Offline payment and agency branding settings", "Customer, leads, and application workflow refinements"],
  },
  {
    slug: "payments-and-public-pages",
    version: "v1.6",
    date: "May 2026",
    title: "Payments, public policy pages, and business pages",
    bullets: ["Cashfree payment gateway settings", "Terms, Refund, Data, and Integration policy pages", "Business API, Enterprise, Whitelabel, and Agentic AI pages"],
  },
];

export function VersionLogsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(64,85,255,0.12),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(255,32,96,0.08),transparent_30%),linear-gradient(180deg,#FFFFFF,#F8FAFC)]" />
        <div className="relative mx-auto max-w-7xl">
          <Badge className="mb-5 border-[#4055FF]/15 bg-white text-[#4055FF] shadow-sm hover:bg-white">Version Logs</Badge>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight text-[#15236B] md:text-6xl">
            Product updates and release notes.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Follow the major Visa Shuttle product changes across B2C visa intelligence, agency CRM, business APIs, payments, and admin tools.
          </p>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-5">
          {versions.map((entry) => (
            <Link key={entry.slug} href={`/version-logs/${entry.slug}`}>
              <Card className="cursor-pointer rounded-3xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <CardContent className="grid gap-5 p-6 md:grid-cols-[180px_1fr_auto] md:items-center">
                  <div>
                    <Badge className="border-0 bg-[#4055FF] text-white">{entry.version}</Badge>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{entry.date}</p>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#15236B]">{entry.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{entry.bullets.join(" · ")}</p>
                  </div>
                  <ArrowRight className="hidden h-5 w-5 text-[#4055FF] md:block" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export function VersionLogDetailPage({ params }: { params?: { slug?: string } }) {
  const entry = versions.find((item) => item.slug === params?.slug) || versions[0];
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-14 md:py-20">
      <article className="mx-auto max-w-4xl">
        <Link href="/version-logs" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#4055FF]">
          <GitBranch className="h-4 w-4" />
          All version logs
        </Link>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Badge className="border-0 bg-[#4055FF] text-white">{entry.version}</Badge>
            <span className="text-sm font-bold text-slate-400">{entry.date}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#15236B] md:text-5xl">{entry.title}</h1>
          <div className="mt-8 space-y-4">
            {entry.bullets.map((bullet) => (
              <div key={bullet} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#FF2060]" />
                <p className="text-sm font-semibold leading-6 text-slate-700">{bullet}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm leading-6 text-slate-500">
            These notes summarize major visible product updates. Smaller fixes, infrastructure changes, and operational improvements may ship between listed releases.
          </p>
        </div>
      </article>
    </main>
  );
}
