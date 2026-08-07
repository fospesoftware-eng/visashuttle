import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Brain, Zap, Shield, ArrowRight, CheckCircle,
  Globe, Star, TrendingUp, FileText, Lock,
  Flag, Map, Stamp, Compass, UserCheck, Wallet,
  Plane, ShieldAlert, CalendarCheck, TicketCheck,
  Hotel, CreditCard, FolderCheck, Bot,
} from "lucide-react";
import { SignalArt, type SignalKind } from "@/components/signal-art";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { POPULAR_DESTINATIONS, VISA_TYPES } from "@/shared/destinations";
import { formatB2cPrice, getStoredB2cCurrency } from "@/lib/b2c-pricing";
import { getEntryRequirement } from "@/shared/visa-free";

// ── Large pool of country-pair visa data ──────────────────────────────────────
type VisaScoreSample = {
  from: string;
  to: string;
  type: string;
  score: number;
  fromCode?: string | null;
  toCode?: string | null;
};

// Allowed live score destinations: Europe, North America, Australia, NZ, Japan, South Korea, Singapore
const LIVE_SCORE_DESTINATIONS = new Set([
  "United States", "Canada", "Schengen", "United Kingdom",
  "Australia", "New Zealand", "Japan", "South Korea", "Singapore",
  "Spain", "Italy", "Germany", "France", "Netherlands", "Switzerland", "Portugal", "Austria",
]);

function scoreToLabel(score: number, type?: string): { label: string; color: string } {
  if (score >= 100 || (type && type.includes("Visa Free"))) return { label: "Visa Free", color: "text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 font-bold" };
  if (score >= 80) return { label: "High Chance", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" };
  if (score >= 65) return { label: "Good Chance", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" };
  if (score >= 45) return { label: "Moderate", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" };
  return { label: "Low Chance", color: "text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" };
}

const COUNTRY_FLAG_CODES: Record<string, string> = {
  "Andorra": "ad",
  "United Arab Emirates": "ae",
  "UAE": "ae",
  "Afghanistan": "af",
  "Albania": "al",
  "Armenia": "am",
  "Argentina": "ar",
  "Austria": "at",
  "Australia": "au",
  "Azerbaijan": "az",
  "Bosnia and Herzegovina": "ba",
  "Bangladesh": "bd",
  "Belgium": "be",
  "Bulgaria": "bg",
  "Bahrain": "bh",
  "Bolivia": "bo",
  "Brazil": "br",
  "Bhutan": "bt",
  "Botswana": "bw",
  "Belarus": "by",
  "Belize": "bz",
  "Canada": "ca",
  "Switzerland": "ch",
  "Chile": "cl",
  "China": "cn",
  "Colombia": "co",
  "Costa Rica": "cr",
  "Cuba": "cu",
  "Cyprus": "cy",
  "Czech Republic": "cz",
  "Czechia": "cz",
  "Germany": "de",
  "Denmark": "dk",
  "Dominican Republic": "do",
  "Ecuador": "ec",
  "Estonia": "ee",
  "Egypt": "eg",
  "Spain": "es",
  "Ethiopia": "et",
  "Finland": "fi",
  "Fiji": "fj",
  "France": "fr",
  "United Kingdom": "gb",
  "UK": "gb",
  "Georgia": "ge",
  "Ghana": "gh",
  "Greece": "gr",
  "Guatemala": "gt",
  "Hong Kong": "hk",
  "Honduras": "hn",
  "Croatia": "hr",
  "Hungary": "hu",
  "Indonesia": "id",
  "Ireland": "ie",
  "Israel": "il",
  "India": "in",
  "Iraq": "iq",
  "Iran": "ir",
  "Iceland": "is",
  "Italy": "it",
  "Jamaica": "jm",
  "Jordan": "jo",
  "Japan": "jp",
  "Kenya": "ke",
  "Kyrgyzstan": "kg",
  "Cambodia": "kh",
  "South Korea": "kr",
  "Korea": "kr",
  "Kuwait": "kw",
  "Kazakhstan": "kz",
  "Laos": "la",
  "Lebanon": "lb",
  "Liechtenstein": "li",
  "Sri Lanka": "lk",
  "Lithuania": "lt",
  "Luxembourg": "lu",
  "Latvia": "lv",
  "Morocco": "ma",
  "Monaco": "mc",
  "Moldova": "md",
  "Montenegro": "me",
  "North Macedonia": "mk",
  "Myanmar": "mm",
  "Mongolia": "mn",
  "Maldives": "mv",
  "Mexico": "mx",
  "Malaysia": "my",
  "Nigeria": "ng",
  "Nicaragua": "ni",
  "Netherlands": "nl",
  "Norway": "no",
  "Nepal": "np",
  "New Zealand": "nz",
  "Oman": "om",
  "Panama": "pa",
  "Peru": "pe",
  "Philippines": "ph",
  "Pakistan": "pk",
  "Poland": "pl",
  "Portugal": "pt",
  "Paraguay": "py",
  "Qatar": "qa",
  "Romania": "ro",
  "Serbia": "rs",
  "Russia": "ru",
  "Rwanda": "rw",
  "Saudi Arabia": "sa",
  "Sweden": "se",
  "Singapore": "sg",
  "Slovenia": "si",
  "Slovakia": "sk",
  "San Marino": "sm",
  "Senegal": "sn",
  "El Salvador": "sv",
  "Thailand": "th",
  "Tajikistan": "tj",
  "Turkmenistan": "tm",
  "Tunisia": "tn",
  "Turkey": "tr",
  "Taiwan": "tw",
  "Tanzania": "tz",
  "Ukraine": "ua",
  "Uganda": "ug",
  "United States": "us",
  "USA": "us",
  "Uruguay": "uy",
  "Uzbekistan": "uz",
  "Vatican City": "va",
  "Venezuela": "ve",
  "Vietnam": "vn",
  "South Africa": "za",
  "Zimbabwe": "zw",
  "Schengen": "eu",
  "Schengen Area": "eu",
  "European Union": "eu",
};

function CountryWithFlag({ name, code }: { name: string; code?: string | null }) {
  const flagCode = (code || COUNTRY_FLAG_CODES[name] || "").toLowerCase();
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {flagCode ? (
        <span className={`fi fi-${flagCode} visa-country-flag shadow-sm rounded-sm`} aria-hidden="true" />
      ) : (
        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCountrySamples(fromCountry = "India"): VisaScoreSample[] {
  const fromCode = COUNTRY_FLAG_CODES[fromCountry] || "in";
  const candidates = ["Schengen", "United States", "United Kingdom", "Australia", "Japan", "Canada"];
  const selectedTo = candidates.filter(c => c !== fromCountry).slice(0, 4);

  return selectedTo.map((to, idx) => {
    const req = getEntryRequirement(fromCountry, to);
    const toCode = COUNTRY_FLAG_CODES[to] || "eu";

    if (req === "visa_free") {
      return {
        from: fromCountry,
        to,
        type: "Visa Free (No Visa Needed)",
        score: 100,
        fromCode,
        toCode,
      };
    }

    if (req === "visa_on_arrival") {
      return {
        from: fromCountry,
        to,
        type: "Visa on Arrival",
        score: 95,
        fromCode,
        toCode,
      };
    }

    const visaTypes = ["Tourist Visa", "Visit Visa", "Business Visa", "Student Visa"];
    const type = visaTypes[idx % visaTypes.length];
    const score = 52 + ((fromCountry.charCodeAt(0) * (idx + 1) * 7) % 32);

    return {
      from: fromCountry,
      to,
      type,
      score,
      fromCode,
      toCode,
    };
  });
}

const STEPS = [
  { step: "01", icon: FileText, title: "Enter Your Travel Details", desc: "Share 14 key details about your nationality, visa type, finances, travel history, and trip plans." },
  { step: "02", icon: Brain, title: "AI Analyzes Your Profile", desc: "Our AI compares your profile against real approval patterns across thousands of visa cases globally." },
  { step: "03", icon: TrendingUp, title: "Get Your Instant Result", desc: "Receive a percentage score, status label, strengths, risks, and personalized next steps — in seconds." },
];

export default function HomePage() {
  const { user } = useB2cAuth();
  const [, setLocation] = useLocation();
  const [samples, setSamples] = useState<VisaScoreSample[]>([]);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0); // increments to trigger subtle "live" animation
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const basicCheckPrice = formatB2cPrice(getStoredB2cCurrency(), 0);

  // Build a fresh, visitor-country-aware list on every page visit.
  useEffect(() => {
    const fallback = () => {
      setUserCountry("India");
      setSamples(buildCountrySamples("India"));
    };
    const controller = new AbortController();

    fetch("/api/public/live-visa-scores", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error("Unable to load live scores");
        return r.json();
      })
      .then((data: { country?: string | null; scores?: VisaScoreSample[] }) => {
        const fromCountry = data.country || "India";
        setUserCountry(fromCountry);

        let finalScores: VisaScoreSample[] = [];
        if (data.scores && data.scores.length > 0) {
          finalScores = data.scores.map(s => {
            const req = getEntryRequirement(fromCountry, s.to);
            const isFree = req === "visa_free";
            return {
              ...s,
              from: fromCountry,
              fromCode: COUNTRY_FLAG_CODES[fromCountry] || s.fromCode || null,
              toCode: COUNTRY_FLAG_CODES[s.to] || s.toCode || null,
              score: isFree ? 100 : s.score,
              type: isFree ? "Visa Free (No Visa Needed)" : s.type,
            };
          });
        } else {
          finalScores = buildCountrySamples(fromCountry);
        }

        setSamples(finalScores);
      })
      .catch(err => {
        if (err.name !== "AbortError") fallback();
      });

    // Pulse every 4s to simulate "live" updates (just a visual tick, no refetch)
    pulseRef.current = setInterval(() => setPulse(p => p + 1), 4000);
    return () => {
      controller.abort();
      if (pulseRef.current) clearInterval(pulseRef.current);
    };
  }, []);

  function handleCheckCTA() {
    if (user) setLocation("/check");
    else setLocation("/join");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-6 md:pt-24 md:pb-10">
        {/* Minimal premium aurora background */}
        <div className="hero-aurora-bg absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="hero-aurora-base" />
          <div className="hero-aurora-ribbon hero-aurora-ribbon-a" />
          <div className="hero-aurora-ribbon hero-aurora-ribbon-b" />
          <div className="hero-aurora-ribbon hero-aurora-ribbon-c" />
          <div className="hero-aurora-sheen" />
          <div className="hero-aurora-vignette" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4055FF]/10 dark:bg-[#4055FF]/20 text-[#4055FF] dark:text-[#8899FF] text-sm font-medium mb-6 border border-[#4055FF]/20">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Visa Insights — Free to Start
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight">
                Check Your{" "}
                <span className="bg-clip-text text-transparent" style={{backgroundImage:"linear-gradient(135deg,#4055FF,#9033F5,#FF2060)"}}>
                  Visa Approval
                </span>{" "}
                Chances Before You Apply
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
                Visa Shuttle uses AI to analyze 14 key factors — nationality, finances, travel history, and more — to give you a realistic visa approval probability in seconds.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Button
                  size="lg"
                  className="gap-2 text-base border-0 text-white shadow-lg hover:opacity-90 shadow-[#4055FF]/25"
                  style={{background:"linear-gradient(135deg,#4055FF,#9033F5,#FF2060)"}}
                  onClick={handleCheckCTA}
                  data-testid="button-hero-cta"
                >
                  <Sparkles className="w-5 h-5" />
                  {user ? "Run a Visa Check" : `Check My Visa Chances — ${basicCheckPrice}`}
                </Button>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="gap-2 text-base" data-testid="button-pricing">
                    See Pricing
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {[
                  { icon: CheckCircle, text: `Basic Check at ${basicCheckPrice} — no card needed` },
                  { icon: Shield, text: "Private & secure" },
                  { icon: Zap, text: "Results in seconds" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-emerald-500" />
                    {text}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-8">
                <div className="flex -space-x-2">
                  {["SM","AH","MR","JK","LW"].map((av) => (
                    <div key={av} className="w-8 h-8 rounded-full border-2 border-white dark:border-background flex items-center justify-center text-white text-xs font-semibold" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}>
                      {av}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">15,000+</span> travelers checked this month
                </p>
              </div>
            </div>

            {/* Right — Live AI Visa Scores card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4055FF]/15 to-[#FF2060]/15 rounded-3xl blur-xl scale-105" />
              <Card className="relative shadow-2xl rounded-2xl overflow-hidden border">
                <CardContent className="p-0">
                  {/* Card header */}
                  <div className="px-6 py-4 text-white" style={{background:"linear-gradient(135deg,#4055FF,#9033F5,#FF2060)"}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Live AI Visa Scores</span>
                      </div>
                      {/* Live pulse indicator */}
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                        </span>
                        <span className="text-xs text-white/80 font-medium">Live</span>
                      </div>
                    </div>
                    <p className="text-white/75 text-xs mt-0.5">
                      Real-time estimates powered by AI
                      {userCountry && <span> · Showing results for <strong className="text-white/90">{userCountry}</strong></span>}
                    </p>
                  </div>

                  {/* Rows */}
                  <div className="divide-y">
                    {samples.length === 0
                      ? Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="px-6 py-4 flex items-center justify-between gap-3 animate-pulse">
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                            </div>
                            <div className="space-y-1.5 text-right">
                              <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-12" />
                              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-16" />
                            </div>
                          </div>
                        ))
                      : samples.map((s) => {
                          const isVisaFree = s.score >= 100 || s.type.includes("Visa Free");
                          const { label, color } = scoreToLabel(s.score, s.type);
                          return (
                            <div
                              key={`${s.from}-${s.to}-${pulse}`}
                              className="px-6 py-4 flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-sm font-medium mb-0.5">
                                  <CountryWithFlag name={s.from} code={s.fromCode} />
                                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <CountryWithFlag name={s.to} code={s.toCode} />
                                </div>
                                <p className="text-xs text-muted-foreground">{s.type}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl font-black">{isVisaFree ? "100%" : `${s.score}%`}</div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                              </div>
                            </div>
                          );
                        })}
                  </div>

                  {/* CTA */}
                  <div className="px-6 py-4 bg-muted/30 border-t">
                    <Button
                      className="w-full border-0 text-white font-semibold hover:opacity-90"
                      style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}
                      onClick={handleCheckCTA}
                      data-testid="button-card-cta"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {user ? "Check Your Visa" : `Get My Score — ${basicCheckPrice}`}
                    </Button>
                    {!user && (
                      <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        Free account required — takes 30 seconds
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What the AI Looks At — single-row marquee carousel */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        {/* Inline keyframes — kept local to this section */}
        <style>{`
          @keyframes signal-marquee {
            from { transform: translate3d(0, 0, 0); }
            to   { transform: translate3d(-50%, 0, 0); }
          }
          .signal-marquee-track {
            animation: signal-marquee 50s linear infinite;
            will-change: transform;
          }
          .signal-marquee-track:hover { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) {
            .signal-marquee-track { animation: none; }
          }
          @keyframes signal-pulse-dot {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50%      { opacity: 1;   transform: scale(1.4); }
          }
        `}</style>

        {/* Ambient backdrop blends into the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.3]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 30%, rgba(64,85,255,0.10), transparent 45%), radial-gradient(circle at 82% 70%, rgba(255,32,96,0.08), transparent 45%)",
          }}
        />

        {/* Header */}
        <div className="relative max-w-3xl mx-auto text-center mb-14 md:mb-16 px-4">
          <div className="inline-flex items-center gap-2 mb-5 text-[11px] font-medium tracking-[0.22em] uppercase text-muted-foreground">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#4055FF]/60" />
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-[#4055FF]"
              style={{ animation: "signal-pulse-dot 2.4s ease-in-out infinite" }}
            />
            What the AI Looks At
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-[#FF2060]"
              style={{ animation: "signal-pulse-dot 2.4s ease-in-out infinite", animationDelay: "1.2s" }}
            />
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#FF2060]/60" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] mb-4">
            The signals behind{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060]">
              every decision.
            </span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The same factors immigration officers evaluate — now read by AI in seconds.
          </p>
        </div>

        {/* Marquee row of vertical cards */}
        <div
          className="relative w-full py-6"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          }}
        >
          <div className="signal-marquee-track flex w-max gap-5 md:gap-6">
            {(() => {
              const SIGNALS: Array<{ icon: typeof Flag; kind: SignalKind; title: string; desc: string }> = [
                { icon: Flag,          kind: "nationality", title: "Nationality Strength",     desc: "How your passport ranks against global mobility data — the first lens every consulate uses." },
                { icon: Map,           kind: "destination", title: "Destination Risk Mapping", desc: "Country-specific approval patterns and recent refusal trends shape your odds." },
                { icon: Stamp,         kind: "visatype",    title: "Visa Type Complexity",     desc: "Tourist, business, or study — each carries its own bar of scrutiny." },
                { icon: Compass,       kind: "intent",      title: "Travel Intent Clarity",    desc: "How clearly your purpose of travel reads to an officer in 30 seconds." },
                { icon: UserCheck,     kind: "profile",     title: "Profile Stability Score",  desc: "Age, employment and ties that signal a settled life back home." },
                { icon: Wallet,        kind: "finance",     title: "Financial Strength",       desc: "Income and balances measured against the real cost of your trip." },
                { icon: Plane,         kind: "footprint",   title: "Travel Footprint",         desc: "Past trips that build credibility with consulates over time." },
                { icon: ShieldAlert,   kind: "rejection",   title: "Rejection Risk Signals",   desc: "Prior refusals and the red-flag patterns AI is trained to catch." },
                { icon: CalendarCheck, kind: "triplogic",   title: "Trip Logic Evaluation",    desc: "Does the duration, route and itinerary actually make sense end-to-end?" },
                { icon: TicketCheck,   kind: "return",      title: "Return Assurance Check",   desc: "Onward tickets and return commitments verified before you submit." },
                { icon: Hotel,         kind: "stay",        title: "Stay Credibility Score",   desc: "Accommodation proof tested for plausibility against your itinerary." },
                { icon: CreditCard,    kind: "funding",     title: "Funding Transparency",     desc: "Who pays for the trip — and how cleanly that story is documented." },
                { icon: FolderCheck,   kind: "docs",        title: "Documentation Readiness",  desc: "Every required paper checked for completeness, currency and consistency." },
                { icon: Bot,           kind: "behavioral",  title: "Behavioral Pattern Match", desc: "AI compares your profile to thousands of real applicant outcomes." },
              ];
              // Duplicate for seamless infinite loop (translate -50%).
              return [...SIGNALS, ...SIGNALS].map(({ icon: Icon, kind, title, desc }, i) => (
                <article
                  key={`${title}-${i}`}
                  data-testid={i < SIGNALS.length ? `factor-${i}` : undefined}
                  className="group relative shrink-0 w-[260px] md:w-[280px] rounded-2xl overflow-hidden border border-border/60 bg-background/70 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-transparent hover:shadow-[0_24px_50px_-20px_rgba(64,85,255,0.45)] dark:hover:shadow-[0_24px_50px_-20px_rgba(144,51,245,0.55)] flex flex-col"
                >
                  {/* gradient border ring on hover */}
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-2xl p-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20"
                    style={{
                      background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)",
                      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />

                  {/* Brand-uniform SVG illustration */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <SignalArt
                      kind={kind}
                      className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    {/* Bottom fade so the artwork blends into the card body */}
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
                    />
                    {/* Floating icon chip */}
                    <span className="absolute top-3 left-3 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border/60 bg-background/80 backdrop-blur-md text-foreground shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-[6deg] group-hover:border-transparent group-hover:text-white group-hover:[background:linear-gradient(135deg,#4055FF,#9033F5,#FF2060)]">
                      <Icon className="w-[16px] h-[16px]" strokeWidth={1.9} />
                    </span>
                  </div>

                  {/* Text */}
                  <div className="relative px-5 pt-3 pb-5 flex-1 flex flex-col">
                    <h3 className="text-[15px] font-semibold tracking-tight leading-snug">
                      {title}
                    </h3>
                    <span
                      aria-hidden
                      className="block h-px w-6 my-2.5 origin-left scale-x-50 group-hover:scale-x-100 transition-transform duration-500"
                      style={{ background: "linear-gradient(90deg,#4055FF,#FF2060)" }}
                    />
                    <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </article>
              ));
            })()}
          </div>
        </div>

        {/* Footer cue */}
        <p className="relative mt-6 text-center text-[11px] tracking-[0.18em] uppercase text-muted-foreground/70">
          Hover to pause · Scrolls automatically
        </p>
      </section>

      {/* How It Works — animated journey */}
      <section id="how-it-works" className="relative py-10 md:py-14 px-4 overflow-hidden">
        {/* Inline keyframes — local to this section */}
        <style>{`
          @keyframes how-ring-spin { to { transform: rotate(360deg); } }
          @keyframes how-orb-float {
            0%, 100% { transform: translateY(0) scale(1); }
            50%      { transform: translateY(-4px) scale(1.02); }
          }
          @keyframes how-particle-bob {
            0%, 100% { transform: translateY(0); opacity: 0.55; }
            50%      { transform: translateY(-6px); opacity: 1; }
          }
          @keyframes how-line-flow {
            0%   { background-position: 220% 50%; }
            100% { background-position: -220% 50%; }
          }
          @keyframes how-pulse-travel {
            0%   { left: 0%;   opacity: 0; }
            8%   { opacity: 1; }
            92%  { opacity: 1; }
            100% { left: 100%; opacity: 0; }
          }
          @keyframes how-eyebrow-pulse {
            0%, 100% { opacity: 0.35; transform: scale(1); }
            50%      { opacity: 1;    transform: scale(1.4); }
          }
          .how-ring   { animation: how-ring-spin 14s linear infinite; transform-origin: 50% 50%; }
          .how-orb    { animation: how-orb-float 5s ease-in-out infinite; }
          .how-particle    { animation: how-particle-bob 3.4s ease-in-out infinite; }
          .how-particle-2  { animation-delay: 0.6s; animation-duration: 3.0s; }
          .how-particle-3  { animation-delay: 1.2s; animation-duration: 3.8s; }
          .how-line {
            background-image: linear-gradient(90deg,
              transparent 0%,
              rgba(64,85,255,0.35) 18%,
              #9033F5 50%,
              rgba(255,32,96,0.35) 82%,
              transparent 100%);
            background-size: 220% 100%;
            animation: how-line-flow 5s linear infinite;
          }
          .how-pulse        { animation: how-pulse-travel 3s linear infinite; }
          .how-pulse-2      { animation-delay: 1.5s; }
          .how-eyebrow-dot  { animation: how-eyebrow-pulse 2.4s ease-in-out infinite; }
          .how-eyebrow-dot-2{ animation-delay: 0.8s; }
          .how-eyebrow-dot-3{ animation-delay: 1.6s; }
          @media (prefers-reduced-motion: reduce) {
            .how-ring, .how-orb, .how-particle,
            .how-line, .how-pulse, .how-eyebrow-dot { animation: none; }
          }
        `}</style>

        {/* Soft brand wash */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(144,51,245,0.10), transparent 60%)",
          }}
        />

        <div className="max-w-5xl mx-auto">
          {/* Eyebrow + heading */}
          <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.24em] uppercase text-muted-foreground mb-3">
            <span
              className="how-eyebrow-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#4055FF" }}
            />
            <span>The Journey</span>
            <span
              className="how-eyebrow-dot how-eyebrow-dot-2 inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#9033F5" }}
            />
            <span>How It Works</span>
            <span
              className="how-eyebrow-dot how-eyebrow-dot-3 inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#FF2060" }}
            />
          </div>
          <div className="text-center mb-14 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              From details to a{" "}
              <span className="bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060] bg-clip-text text-transparent">
                decision
              </span>
              <br className="hidden md:block" /> — in seconds.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-md mx-auto">
              Three clean steps. A full AI visa analysis in under two minutes.
            </p>
          </div>

          {/* Steps */}
          <div className="relative grid md:grid-cols-3 gap-10 md:gap-6">
            {/* Animated connector — sits behind the icon tiles, runs through middle icon */}
            <div
              aria-hidden
              className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px how-line z-0 pointer-events-none"
            >
              <span
                className="how-pulse absolute -top-[3px] w-2 h-2 rounded-full"
                style={{ background: "#4055FF", boxShadow: "0 0 14px #4055FF" }}
              />
              <span
                className="how-pulse how-pulse-2 absolute -top-[3px] w-2 h-2 rounded-full"
                style={{ background: "#FF2060", boxShadow: "0 0 14px #FF2060" }}
              />
            </div>

            {STEPS.map(({ step, icon: Icon, title, desc }, i) => (
              <article
                key={step}
                className="group relative text-center z-10"
                data-testid={`step-${i}`}
              >
                {/* Icon tile cluster */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  {/* Rotating gradient arc ring */}
                  <svg
                    className="how-ring absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id={`how-ring-${i}`}
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%"   stopColor="#4055FF" />
                        <stop offset="50%"  stopColor="#9033F5" />
                        <stop offset="100%" stopColor="#FF2060" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke={`url(#how-ring-${i})`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="190 100"
                    />
                  </svg>

                  {/* Halo */}
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-full blur-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-90"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(144,51,245,0.45), transparent 70%)",
                    }}
                  />

                  {/* Inner orb with icon */}
                  <div
                    className="how-orb absolute inset-2 rounded-full flex items-center justify-center text-white shadow-lg shadow-[#4055FF]/30 transition-transform duration-500 group-hover:scale-110"
                    style={{
                      background:
                        "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)",
                    }}
                  >
                    <Icon className="w-9 h-9" strokeWidth={1.8} />
                  </div>

                  {/* Floating particles */}
                  <span
                    aria-hidden
                    className="how-particle absolute -top-1 right-2 w-2 h-2 rounded-full"
                    style={{ background: "#4055FF" }}
                  />
                  <span
                    aria-hidden
                    className="how-particle how-particle-2 absolute -bottom-1 left-3 w-1.5 h-1.5 rounded-full"
                    style={{ background: "#FF2060" }}
                  />
                  <span
                    aria-hidden
                    className="how-particle how-particle-3 absolute top-1/2 -right-2 w-1.5 h-1.5 rounded-full"
                    style={{ background: "#9033F5" }}
                  />
                </div>

                {/* Step number */}
                <div className="text-[11px] font-semibold tracking-[0.24em] uppercase mb-2">
                  <span className="bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060] bg-clip-text text-transparent">
                    Step {step}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2 tracking-tight">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                  {desc}
                </p>
              </article>
            ))}
          </div>

          {/* Foot note */}
          <p className="mt-14 text-center text-[11px] tracking-[0.18em] uppercase text-muted-foreground/70">
            No credit card · No download · ~120 seconds
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="py-10 md:py-14 bg-muted/30 border-y px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Travelers Trust Visa Shuttle</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: "Real AI — Not Guesswork", desc: "Our AI is trained on real visa application patterns. No fixed rules — dynamic, data-driven scoring that reflects actual approval trends.", color: "text-[#4055FF] bg-[#4055FF]/10 dark:bg-[#4055FF]/20" },
              { icon: Globe, title: "Global Coverage", desc: "Supports 100+ nationalities and destinations. Whether you're applying for Schengen, US, UK, UAE, or anywhere else — we've got you.", color: "text-[#9033F5] bg-[#9033F5]/10 dark:bg-[#9033F5]/20" },
              { icon: Shield, title: "Secure & Private", desc: "Your data is never sold or shared. All AI analysis happens securely on our servers. Your visa details stay with you.", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="hover-elevate rounded-xl">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden p-10 md:p-16 text-white shadow-2xl shadow-[#4055FF]/20" style={{background:"linear-gradient(135deg,#4055FF 0%,#9033F5 50%,#FF2060 100%)"}}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white/90 text-sm font-medium mb-6">
                <Star className="w-4 h-4 fill-white" />
                Start for free today
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Planning to Apply for a Visa?</h2>
              <p className="text-white/80 mb-8 text-lg leading-relaxed max-w-xl mx-auto">
                Know your chances before you apply. Get a free AI-powered visa assessment — no credit card, no waiting.
              </p>
              <Button
                size="lg"
                className="bg-white text-[#4055FF] hover:bg-white/90 font-semibold shadow-lg text-base"
                onClick={handleCheckCTA}
                data-testid="button-cta-final"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {user ? "Run a Visa Check" : `Start Basic Check ${basicCheckPrice}`}
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
