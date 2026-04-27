import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Brain, Zap, Shield, ArrowRight, CheckCircle,
  Globe, Star, TrendingUp, FileText, Lock, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useB2cAuth } from "@/hooks/use-b2c-auth";

// ── Large pool of country-pair visa data ──────────────────────────────────────
const POOL: { from: string; to: string; type: string; score: number }[] = [
  { from: "India", to: "UAE", type: "Tourist Visa", score: 88 },
  { from: "India", to: "Schengen", type: "Tourist Visa", score: 61 },
  { from: "India", to: "United Kingdom", type: "Visit Visa", score: 55 },
  { from: "India", to: "United States", type: "Tourist Visa", score: 47 },
  { from: "India", to: "Canada", type: "Tourist Visa", score: 53 },
  { from: "India", to: "Australia", type: "Tourist Visa", score: 59 },
  { from: "Pakistan", to: "United Kingdom", type: "Visit Visa", score: 42 },
  { from: "Pakistan", to: "UAE", type: "Tourist Visa", score: 74 },
  { from: "Pakistan", to: "United States", type: "Tourist Visa", score: 34 },
  { from: "Pakistan", to: "Schengen", type: "Tourist Visa", score: 38 },
  { from: "Philippines", to: "Schengen", type: "Tourist Visa", score: 57 },
  { from: "Philippines", to: "United Kingdom", type: "Visit Visa", score: 52 },
  { from: "Philippines", to: "Japan", type: "Tourist Visa", score: 81 },
  { from: "Philippines", to: "UAE", type: "Tourist Visa", score: 79 },
  { from: "Nigeria", to: "United States", type: "Tourist Visa", score: 31 },
  { from: "Nigeria", to: "United Kingdom", type: "Visit Visa", score: 36 },
  { from: "Nigeria", to: "Schengen", type: "Tourist Visa", score: 33 },
  { from: "Nigeria", to: "UAE", type: "Tourist Visa", score: 68 },
  { from: "Bangladesh", to: "UAE", type: "Work Visa", score: 76 },
  { from: "Bangladesh", to: "United Kingdom", type: "Student Visa", score: 58 },
  { from: "Bangladesh", to: "United States", type: "Tourist Visa", score: 29 },
  { from: "Ghana", to: "United Kingdom", type: "Visit Visa", score: 44 },
  { from: "Ghana", to: "Schengen", type: "Tourist Visa", score: 40 },
  { from: "Ghana", to: "Canada", type: "Tourist Visa", score: 41 },
  { from: "Kenya", to: "United Kingdom", type: "Visit Visa", score: 49 },
  { from: "Kenya", to: "UAE", type: "Tourist Visa", score: 72 },
  { from: "Kenya", to: "United States", type: "Tourist Visa", score: 38 },
  { from: "Ethiopia", to: "UAE", type: "Work Visa", score: 65 },
  { from: "Ethiopia", to: "United States", type: "Tourist Visa", score: 27 },
  { from: "South Africa", to: "United Kingdom", type: "Visit Visa", score: 71 },
  { from: "South Africa", to: "Schengen", type: "Tourist Visa", score: 68 },
  { from: "South Africa", to: "United States", type: "Tourist Visa", score: 63 },
  { from: "Brazil", to: "Schengen", type: "Tourist Visa", score: 74 },
  { from: "Brazil", to: "United States", type: "Tourist Visa", score: 66 },
  { from: "Brazil", to: "United Kingdom", type: "Visit Visa", score: 69 },
  { from: "Colombia", to: "United States", type: "Tourist Visa", score: 52 },
  { from: "Colombia", to: "Schengen", type: "Tourist Visa", score: 58 },
  { from: "Mexico", to: "United States", type: "Tourist Visa", score: 72 },
  { from: "Mexico", to: "Schengen", type: "Tourist Visa", score: 81 },
  { from: "China", to: "United States", type: "Tourist Visa", score: 55 },
  { from: "China", to: "Schengen", type: "Tourist Visa", score: 60 },
  { from: "China", to: "United Kingdom", type: "Visit Visa", score: 57 },
  { from: "Vietnam", to: "United States", type: "Tourist Visa", score: 45 },
  { from: "Vietnam", to: "Schengen", type: "Tourist Visa", score: 51 },
  { from: "Vietnam", to: "Japan", type: "Tourist Visa", score: 78 },
  { from: "Indonesia", to: "Schengen", type: "Tourist Visa", score: 63 },
  { from: "Indonesia", to: "United Kingdom", type: "Visit Visa", score: 59 },
  { from: "Thailand", to: "Schengen", type: "Tourist Visa", score: 72 },
  { from: "Thailand", to: "United States", type: "Tourist Visa", score: 66 },
  { from: "Nepal", to: "UAE", type: "Work Visa", score: 77 },
  { from: "Nepal", to: "United States", type: "Tourist Visa", score: 32 },
  { from: "Sri Lanka", to: "UAE", type: "Work Visa", score: 73 },
  { from: "Sri Lanka", to: "United Kingdom", type: "Visit Visa", score: 47 },
  { from: "Egypt", to: "UAE", type: "Tourist Visa", score: 83 },
  { from: "Egypt", to: "Schengen", type: "Tourist Visa", score: 46 },
  { from: "Morocco", to: "Schengen", type: "Tourist Visa", score: 48 },
  { from: "Morocco", to: "United Kingdom", type: "Visit Visa", score: 44 },
  { from: "Turkey", to: "Schengen", type: "Tourist Visa", score: 67 },
  { from: "Turkey", to: "United Kingdom", type: "Visit Visa", score: 62 },
  { from: "Iran", to: "UAE", type: "Tourist Visa", score: 54 },
  { from: "Iraq", to: "UAE", type: "Tourist Visa", score: 49 },
  { from: "Jordan", to: "Schengen", type: "Tourist Visa", score: 65 },
  { from: "Jordan", to: "United Kingdom", type: "Visit Visa", score: 61 },
  { from: "Lebanon", to: "UAE", type: "Tourist Visa", score: 71 },
  { from: "Lebanon", to: "Schengen", type: "Tourist Visa", score: 55 },
  { from: "Saudi Arabia", to: "Schengen", type: "Tourist Visa", score: 79 },
  { from: "Russia", to: "Schengen", type: "Tourist Visa", score: 51 },
  { from: "Ukraine", to: "Schengen", type: "Tourist Visa", score: 69 },
  { from: "Kazakhstan", to: "UAE", type: "Tourist Visa", score: 82 },
  { from: "Uzbekistan", to: "UAE", type: "Work Visa", score: 70 },
  { from: "United States", to: "Schengen", type: "Tourist Visa", score: 94 },
  { from: "United Kingdom", to: "Schengen", type: "Tourist Visa", score: 91 },
  { from: "Canada", to: "Schengen", type: "Tourist Visa", score: 93 },
  { from: "Australia", to: "United States", type: "Tourist Visa", score: 92 },
  { from: "Germany", to: "United States", type: "Tourist Visa", score: 90 },
  { from: "France", to: "United States", type: "Tourist Visa", score: 89 },
];

// Popular destinations per nationality (fallback if no IP match)
const NATIONALITY_DESTINATIONS: Record<string, string[]> = {
  "United Arab Emirates": ["United Kingdom", "Schengen", "United States"],
  "Saudi Arabia": ["Schengen", "United Kingdom", "United States"],
  "Qatar": ["Schengen", "United Kingdom", "United States"],
  "Kuwait": ["Schengen", "United Kingdom", "United States"],
  "Bahrain": ["Schengen", "United Kingdom", "United States"],
};

function scoreToLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "High Chance", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" };
  if (score >= 65) return { label: "Good Chance", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" };
  if (score >= 45) return { label: "Moderate", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" };
  return { label: "Low Chance", color: "text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STEPS = [
  { step: "01", icon: FileText, title: "Enter Your Travel Details", desc: "Share 14 key details about your nationality, visa type, finances, travel history, and trip plans." },
  { step: "02", icon: Brain, title: "AI Analyzes Your Profile", desc: "Our AI compares your profile against real approval patterns across thousands of visa cases globally." },
  { step: "03", icon: TrendingUp, title: "Get Your Instant Result", desc: "Receive a percentage score, status label, strengths, risks, and personalized next steps — in seconds." },
];

export default function HomePage() {
  const { user } = useB2cAuth();
  const [, setLocation] = useLocation();
  const [samples, setSamples] = useState<typeof POOL>([]);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0); // increments to trigger subtle "live" animation
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect user's country via IP geolocation, then build randomized list
  useEffect(() => {
    async function buildSamples(detected: string | null) {
      const rest = shuffle(POOL);

      let list: typeof POOL = [];

      if (detected) {
        // Find entries where `from` matches the detected country
        const fromUser = rest.filter(p => p.from.toLowerCase() === detected.toLowerCase());
        // Find entries for popular destinations in that country
        const popular = NATIONALITY_DESTINATIONS[detected];
        const fromPopular = popular
          ? popular.flatMap(dest => rest.filter(p => p.from === detected && p.to === dest)).slice(0, 1)
          : [];

        const userEntry = (fromUser.length > 0 ? fromUser : fromPopular)[0] ?? null;

        if (userEntry) {
          // User's country first, then 3 random different entries
          const others = rest.filter(p => p.from !== detected).slice(0, 3);
          list = [userEntry, ...others];
        } else {
          // Fallback: synthetic entry for user's country with a typical destination
          const synthDest = NATIONALITY_DESTINATIONS[detected]?.[0] ?? "Schengen";
          const base = 50 + Math.floor(Math.random() * 30);
          const synth = { from: detected, to: synthDest, type: "Tourist Visa", score: base };
          const others = rest.slice(0, 3);
          list = [synth, ...others];
        }
      } else {
        list = rest.slice(0, 4);
      }

      setSamples(list);
    }

    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => {
        const country: string = d?.country_name ?? "";
        setUserCountry(country || null);
        buildSamples(country || null);
      })
      .catch(() => buildSamples(null));

    // Pulse every 4s to simulate "live" updates (just a visual tick, no refetch)
    pulseRef.current = setInterval(() => setPulse(p => p + 1), 4000);
    return () => { if (pulseRef.current) clearInterval(pulseRef.current); };
  }, []);

  function handleCheckCTA() {
    if (user) setLocation("/check");
    else setLocation("/join");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <Link href="/visa-check" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Visa Check</Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/business" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">For Business</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Link href="/account">
                <Button size="sm" className="gap-2 border-0 text-white hover:opacity-90" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}} data-testid="button-account">
                  My Account
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in"><Button variant="ghost" size="sm" data-testid="button-signin">Sign In</Button></Link>
                <Link href="/join"><Button size="sm" className="border-0 text-white hover:opacity-90" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}} data-testid="button-join">Get Started Free</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-10 md:pt-24 md:pb-20">
        {/* Base gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#4055FF]/5 via-white to-[#FF2060]/5 dark:from-[#4055FF]/15 dark:via-background dark:to-[#FF2060]/10" />

        {/* Rotating aurora oval — tilted like a globe axis */}
        <div
          className="absolute top-1/2 left-1/2 w-[1000px] h-[420px] rounded-[50%] blur-3xl pointer-events-none"
          style={{
            background: "conic-gradient(from 0deg,#4055FF1a,#9033F512,#FF20600d,#4055FF00,#4055FF1a)",
            animation: "hero-aurora-rotate 50s linear infinite",
          }}
        />

        {/* Two soft colour orbs drifting on offset figure-8 paths */}
        <div
          className="absolute top-0 right-0 w-[640px] h-[640px] bg-[#FF2060]/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"
          style={{ animation: "hero-drift-a 24s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#4055FF]/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"
          style={{ animation: "hero-drift-b 30s ease-in-out infinite" }}
        />

        {/* SVG animated flight-path arcs — marching dashes like global travel routes */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1280 580"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Arc 1 — sweeps bottom-left to upper-right, brand blue */}
          <path
            d="M-80,480 Q280,60 660,260 Q900,400 1360,100"
            fill="none" stroke="#4055FF" strokeWidth="1.2" strokeOpacity="0.13"
            strokeDasharray="10 25"
            style={{ animation: "hero-flight-march 3s linear infinite" }}
          />
          {/* Arc 2 — shallower, offset, purple */}
          <path
            d="M-60,200 Q320,420 680,190 Q960,30 1340,320"
            fill="none" stroke="#9033F5" strokeWidth="1" strokeOpacity="0.10"
            strokeDasharray="10 25"
            style={{ animation: "hero-flight-march 4.5s linear infinite 1.2s" }}
          />
          {/* Arc 3 — tight S-curve, pink */}
          <path
            d="M120,520 Q380,140 700,350 Q980,530 1300,210"
            fill="none" stroke="#FF2060" strokeWidth="0.9" strokeOpacity="0.08"
            strokeDasharray="10 25"
            style={{ animation: "hero-flight-march 3.8s linear infinite 2.5s" }}
          />
          {/* Arc 4 — long flat sweep across mid-hero, blue again */}
          <path
            d="M-100,310 Q400,100 750,290 Q1050,450 1380,200"
            fill="none" stroke="#4055FF" strokeWidth="0.8" strokeOpacity="0.07"
            strokeDasharray="10 25"
            style={{ animation: "hero-flight-march 5.5s linear infinite 0.8s" }}
          />
        </svg>

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
                  {user ? "Run a Visa Check" : "Check My Visa Chances — Free"}
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
                  { icon: CheckCircle, text: "1 free check — no card needed" },
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
                          const { label, color } = scoreToLabel(s.score);
                          return (
                            <div
                              key={`${s.from}-${s.to}-${pulse}`}
                              className="px-6 py-4 flex items-center justify-between gap-3 transition-all"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-sm font-medium mb-0.5">
                                  <span className="truncate">{s.from}</span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate">{s.to}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{s.type}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xl font-black">{s.score}%</div>
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
                      {user ? "Check Your Visa" : "Get My Score — It's Free"}
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

      {/* 14 Factors */}
      <section className="py-14 md:py-20 px-4 bg-muted/30 border-y">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-5 bg-[#4055FF]/10 text-[#4055FF] dark:bg-[#4055FF]/20 dark:text-[#8899FF] border-[#4055FF]/20 hover:bg-[#4055FF]/10">
            14 Key Factors Analyzed
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">What the AI Looks At</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">The same factors immigration officers evaluate — now analyzed by AI in seconds.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "Nationality", "Destination Country", "Visa Type", "Purpose of Travel",
              "Age & Employment", "Monthly Income", "Bank Balance", "Travel History",
              "Visa Refusals", "Trip Duration", "Return Ticket", "Accommodation Proof",
              "Trip Funding", "Document Readiness",
            ].map((factor, i) => (
              <div
                key={factor}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border text-sm text-left"
                data-testid={`factor-${i}`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-xs">{factor}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">From your details to a full AI visa analysis in under 2 minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[33%] w-[34%] h-0.5" style={{background:"linear-gradient(90deg,#4055FF,#FF2060)"}} />
            {STEPS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center relative">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#4055FF]/20" style={{background:"linear-gradient(135deg,#4055FF,#9033F5,#FF2060)"}}>
                  <Icon className="w-9 h-9 text-white" />
                </div>
                <div className="absolute top-0 right-1/4 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{background:"#4055FF"}}>
                  {step.replace("0", "")}
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-14 md:py-20 bg-muted/30 border-y px-4">
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
      <section className="py-16 md:py-24 px-4">
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
                {user ? "Run a Visa Check" : "Start Free Visa Check"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/business" className="hover:text-foreground transition-colors">For Business</Link>
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy & Cookies</Link>
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              AI-based estimation only. Does not guarantee visa approval.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
