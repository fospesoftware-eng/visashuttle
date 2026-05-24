import { CalendarDays, Globe2, Newspaper, PlaneTakeoff, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const updates = [
  {
    country: "United Kingdom",
    title: "Visitor visa evidence trends to watch",
    date: "Daily update",
    image: "from-[#4055FF] via-[#5B55F6] to-[#A78BFA]",
    summary: "Auto-generated monitoring card for bank balance consistency, employment ties, and travel-purpose evidence changes.",
  },
  {
    country: "Schengen Area",
    title: "Short-stay documentation readiness signals",
    date: "Daily update",
    image: "from-[#FF2060] via-[#9033F5] to-[#4055FF]",
    summary: "Tracks common changes across travel insurance, itinerary, accommodation, and proof-of-funds expectations.",
  },
  {
    country: "Canada",
    title: "Temporary resident profile strength notes",
    date: "Daily update",
    image: "from-[#0EA5E9] via-[#4055FF] to-[#9033F5]",
    summary: "Highlights applicant ties, funds, travel history, and purpose-of-visit evidence patterns for review.",
  },
  {
    country: "Australia",
    title: "Visitor and student application watchlist",
    date: "Daily update",
    image: "from-[#10B981] via-[#4055FF] to-[#FF2060]",
    summary: "Summarizes risk areas around genuine temporary entrant signals, employment, study intent, and sponsor records.",
  },
];

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden border-b border-slate-200 px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(64,85,255,0.12),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(255,32,96,0.08),transparent_30%),linear-gradient(180deg,#FFFFFF,#F8FAFC)]" />
        <div className="relative mx-auto max-w-7xl">
          <Badge className="mb-5 border-[#4055FF]/15 bg-white text-[#4055FF] shadow-sm hover:bg-white">
            Updates
          </Badge>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight text-[#15236B] md:text-6xl">
            Daily visa approval and policy watch updates.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            A newsroom-style feed for country-specific visa approval changes, document readiness signals, and operational alerts. The automation surface is ready for daily generated update publishing from SaaS Admin.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: CalendarDays, label: "Daily cadence" },
              { icon: Globe2, label: "Country-focused" },
              { icon: Sparkles, label: "AI-assisted drafts" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Icon className="mb-2 h-5 w-5 text-[#4055FF]" />
                <p className="text-sm font-black text-[#15236B]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-2">
            {updates.map((update) => (
              <Card key={update.country} className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className={`relative h-48 bg-gradient-to-br ${update.image}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,0.30),transparent_35%)]" />
                  <div className="absolute bottom-5 left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur">
                    <PlaneTakeoff className="h-6 w-6" />
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <Badge variant="outline" className="bg-slate-50">{update.country}</Badge>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{update.date}</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-[#15236B]">{update.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{update.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-4 py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-3xl border border-[#4055FF]/15 bg-[#4055FF]/5 p-6 md:flex-row md:items-center">
          <Newspaper className="h-8 w-8 shrink-0 text-[#4055FF]" />
          <div>
            <p className="font-black text-[#15236B]">Publisher note</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Updates are informational and should be verified against official embassy, consulate, immigration, or government sources before taking action.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
