import { CalendarDays, Globe2, Newspaper, PlaneTakeoff, Sparkles } from "lucide-react";

const updates = [
  {
    country: "United Kingdom",
    title: "Visitor visa evidence trends to watch",
    category: "Approval signals",
    gradient: "from-[#4055FF] via-[#5B55F6] to-[#A78BFA]",
    summary: "Monitoring bank balance consistency, employment ties, invitation letters, and travel-purpose evidence patterns.",
  },
  {
    country: "Schengen Area",
    title: "Short-stay document readiness notes",
    category: "Documents",
    gradient: "from-[#FF2060] via-[#9033F5] to-[#4055FF]",
    summary: "Tracking common readiness signals around travel insurance, itinerary quality, accommodation, and proof of funds.",
  },
  {
    country: "Canada",
    title: "Temporary resident profile strength",
    category: "Risk profile",
    gradient: "from-[#0EA5E9] via-[#4055FF] to-[#9033F5]",
    summary: "Watching applicant ties, financial clarity, travel history, and purpose-of-visit evidence across temporary routes.",
  },
  {
    country: "Australia",
    title: "Visitor and student application watchlist",
    category: "Intent signals",
    gradient: "from-[#10B981] via-[#4055FF] to-[#FF2060]",
    summary: "Summarizing risk areas around genuine temporary entrant signals, employment history, study intent, and sponsor records.",
  },
];

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-[#F7F9FF] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 py-16 md:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(64,85,255,0.14),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(255,32,96,0.10),transparent_28%),linear-gradient(180deg,#FFFFFF,#F7F9FF)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4055FF]">Updates</p>
          <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <h1 className="max-w-5xl text-5xl font-black leading-[0.98] tracking-tight text-[#101A4D] md:text-7xl">
              Daily visa approval and policy intelligence.
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              A country-focused update feed for visa approval changes, documentation signals, risk trends, and operational alerts. SaaS Admin can manage the update workflow and daily publishing pipeline.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { icon: CalendarDays, label: "Daily publishing cadence" },
              { icon: Globe2, label: "Country-by-country watch" },
              { icon: Sparkles, label: "AI-assisted editorial drafts" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="border-t border-slate-200 pt-5">
                <Icon className="h-6 w-6 text-[#4055FF]" />
                <p className="mt-4 text-lg font-black text-[#101A4D]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="overflow-hidden rounded-[2.25rem] border border-white/80 bg-white shadow-2xl shadow-[#4055FF]/10">
              <div className="relative min-h-[420px] bg-gradient-to-br from-[#4055FF] via-[#7137EA] to-[#FF2060] p-8 text-white md:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(255,255,255,0.34),transparent_24%),radial-gradient(circle_at_82%_78%,rgba(255,255,255,0.20),transparent_26%)]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18 backdrop-blur">
                    <Newspaper className="h-7 w-7" />
                  </div>
                  <div className="mt-28">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-white/70">Featured watch</p>
                    <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight md:text-5xl">
                      Policy movement, translated into practical preparation signals.
                    </h2>
                  </div>
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              {updates.map((update) => (
                <article key={update.country} className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[170px_1fr]">
                  <div className={`relative min-h-36 overflow-hidden rounded-3xl bg-gradient-to-br ${update.gradient}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.38),transparent_28%)]" />
                    <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/18 text-white backdrop-blur">
                      <PlaneTakeoff className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="self-center">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      <span>{update.country}</span>
                      <span className="text-[#4055FF]">{update.category}</span>
                    </div>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-[#101A4D]">{update.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{update.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Updates are informational and should be verified against official embassy, consulate, immigration, or government sources before action. Visa Shuttle does not provide legal or government confirmation.
          </p>
        </div>
      </section>
    </main>
  );
}
