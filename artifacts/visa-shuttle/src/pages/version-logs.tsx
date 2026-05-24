import { Link } from "wouter";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";

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
    <main className="min-h-screen bg-[#F7F9FF] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(64,85,255,0.14),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(255,32,96,0.10),transparent_28%),linear-gradient(180deg,#FFFFFF,#F7F9FF)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4055FF]">Version Logs</p>
          <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <h1 className="max-w-5xl text-5xl font-black leading-[0.98] tracking-tight text-[#101A4D] md:text-7xl">
              Product releases, written clearly.
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              Follow major Visa Shuttle improvements across B2C visa intelligence, agency CRM, business APIs, payments, admin tools, and customer portals.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-0 overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-xl shadow-[#4055FF]/8">
            {versions.map((entry) => (
              <Link key={entry.slug} href={`/version-logs/${entry.slug}`}>
                <article className="grid cursor-pointer gap-6 border-b border-slate-200 p-6 transition hover:bg-[#F7F9FF] last:border-b-0 md:grid-cols-[190px_1fr_auto] md:items-center md:p-8">
                  <div>
                    <p className="text-3xl font-black text-[#4055FF]">{entry.version}</p>
                    <p className="mt-2 text-sm font-bold text-slate-400">{entry.date}</p>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-[#101A4D] md:text-3xl">{entry.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{entry.bullets.join(" · ")}</p>
                  </div>
                  <ArrowRight className="hidden h-5 w-5 text-[#4055FF] md:block" />
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function VersionLogDetailPage({ params }: { params?: { slug?: string } }) {
  const entry = versions.find((item) => item.slug === params?.slug) || versions[0];

  return (
    <main className="min-h-screen bg-[#F7F9FF] px-4 py-16 text-slate-950 md:py-24">
      <article className="mx-auto max-w-5xl">
        <Link href="/version-logs" className="mb-8 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#4055FF]">
          <GitBranch className="h-4 w-4" />
          All version logs
        </Link>

        <div className="overflow-hidden rounded-[2.25rem] border border-slate-200 bg-white shadow-xl shadow-[#4055FF]/8">
          <div className="bg-gradient-to-br from-[#4055FF] via-[#7137EA] to-[#FF2060] p-8 text-white md:p-12">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white/60">{entry.date}</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">{entry.title}</h1>
            <p className="mt-6 text-2xl font-black text-white/80">{entry.version}</p>
          </div>

          <div className="p-6 md:p-10">
            <div className="grid gap-4">
              {entry.bullets.map((bullet) => (
                <div key={bullet} className="grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-[48px_1fr]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4055FF]/10 text-[#4055FF]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="self-center text-base font-bold leading-7 text-slate-700">{bullet}</p>
                </div>
              ))}
            </div>

            <p className="mt-10 max-w-3xl text-sm leading-6 text-slate-500">
              These notes summarize major visible product updates. Smaller fixes, infrastructure changes, and operational improvements may ship between listed releases.
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}
