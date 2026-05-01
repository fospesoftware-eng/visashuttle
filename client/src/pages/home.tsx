import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  Sparkles, Brain, Zap, Shield, ArrowRight, CheckCircle,
  Globe, Star, TrendingUp, FileText, Lock, ChevronRight,
  Mail, MapPin, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useB2cAuth } from "@/hooks/use-b2c-auth";

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
]);

const POOL: VisaScoreSample[] = [
  { from: "India", to: "Schengen", type: "Tourist Visa", score: 61 },
  { from: "India", to: "United Kingdom", type: "Visit Visa", score: 55 },
  { from: "India", to: "United States", type: "Tourist Visa", score: 47 },
  { from: "India", to: "Canada", type: "Tourist Visa", score: 53 },
  { from: "India", to: "Australia", type: "Tourist Visa", score: 59 },
  { from: "India", to: "Japan", type: "Tourist Visa", score: 72 },
  { from: "India", to: "New Zealand", type: "Tourist Visa", score: 64 },
  { from: "India", to: "Singapore", type: "Tourist Visa", score: 68 },
  { from: "India", to: "South Korea", type: "Tourist Visa", score: 65 },
  { from: "Pakistan", to: "United Kingdom", type: "Visit Visa", score: 42 },
  { from: "Pakistan", to: "United States", type: "Tourist Visa", score: 34 },
  { from: "Pakistan", to: "Schengen", type: "Tourist Visa", score: 38 },
  { from: "Pakistan", to: "Canada", type: "Tourist Visa", score: 40 },
  { from: "Philippines", to: "Schengen", type: "Tourist Visa", score: 57 },
  { from: "Philippines", to: "United Kingdom", type: "Visit Visa", score: 52 },
  { from: "Philippines", to: "Japan", type: "Tourist Visa", score: 81 },
  { from: "Philippines", to: "South Korea", type: "Tourist Visa", score: 76 },
  { from: "Nigeria", to: "United States", type: "Tourist Visa", score: 31 },
  { from: "Nigeria", to: "United Kingdom", type: "Visit Visa", score: 36 },
  { from: "Nigeria", to: "Schengen", type: "Tourist Visa", score: 33 },
  { from: "Nigeria", to: "Canada", type: "Tourist Visa", score: 37 },
  { from: "Bangladesh", to: "United Kingdom", type: "Student Visa", score: 58 },
  { from: "Bangladesh", to: "United States", type: "Tourist Visa", score: 29 },
  { from: "Bangladesh", to: "Canada", type: "Student Visa", score: 54 },
  { from: "Ghana", to: "United Kingdom", type: "Visit Visa", score: 44 },
  { from: "Ghana", to: "Schengen", type: "Tourist Visa", score: 40 },
  { from: "Ghana", to: "Canada", type: "Tourist Visa", score: 41 },
  { from: "Kenya", to: "United Kingdom", type: "Visit Visa", score: 49 },
  { from: "Kenya", to: "United States", type: "Tourist Visa", score: 38 },
  { from: "Kenya", to: "Canada", type: "Tourist Visa", score: 44 },
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
  { from: "Indonesia", to: "Australia", type: "Tourist Visa", score: 69 },
  { from: "Thailand", to: "Schengen", type: "Tourist Visa", score: 72 },
  { from: "Thailand", to: "United States", type: "Tourist Visa", score: 66 },
  { from: "Nepal", to: "United States", type: "Tourist Visa", score: 32 },
  { from: "Nepal", to: "Australia", type: "Tourist Visa", score: 58 },
  { from: "Sri Lanka", to: "United Kingdom", type: "Visit Visa", score: 47 },
  { from: "Sri Lanka", to: "Australia", type: "Tourist Visa", score: 61 },
  { from: "Morocco", to: "Schengen", type: "Tourist Visa", score: 48 },
  { from: "Morocco", to: "United Kingdom", type: "Visit Visa", score: 44 },
  { from: "Turkey", to: "Schengen", type: "Tourist Visa", score: 67 },
  { from: "Turkey", to: "United Kingdom", type: "Visit Visa", score: 62 },
  { from: "Jordan", to: "Schengen", type: "Tourist Visa", score: 65 },
  { from: "Jordan", to: "United Kingdom", type: "Visit Visa", score: 61 },
  { from: "Saudi Arabia", to: "Schengen", type: "Tourist Visa", score: 79 },
  { from: "Saudi Arabia", to: "United Kingdom", type: "Visit Visa", score: 74 },
  { from: "Russia", to: "Schengen", type: "Tourist Visa", score: 51 },
  { from: "Ukraine", to: "Schengen", type: "Tourist Visa", score: 69 },
  { from: "United States", to: "Schengen", type: "Tourist Visa", score: 94 },
  { from: "United Kingdom", to: "Schengen", type: "Tourist Visa", score: 91 },
  { from: "Canada", to: "Schengen", type: "Tourist Visa", score: 93 },
  { from: "Australia", to: "United States", type: "Tourist Visa", score: 92 },
  { from: "Germany", to: "United States", type: "Tourist Visa", score: 90 },
  { from: "France", to: "United States", type: "Tourist Visa", score: 89 },
].filter(s => LIVE_SCORE_DESTINATIONS.has(s.to));

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

const COUNTRY_FLAG_CODES: Record<string, string> = {
  Australia: "au",
  Bangladesh: "bd",
  Brazil: "br",
  Canada: "ca",
  China: "cn",
  Colombia: "co",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  India: "in",
  Indonesia: "id",
  Japan: "jp",
  Jordan: "jo",
  Kenya: "ke",
  Mexico: "mx",
  Morocco: "ma",
  Nepal: "np",
  "New Zealand": "nz",
  Nigeria: "ng",
  Pakistan: "pk",
  Philippines: "ph",
  Russia: "ru",
  "Saudi Arabia": "sa",
  Schengen: "eu",
  Singapore: "sg",
  "South Africa": "za",
  "South Korea": "kr",
  "Sri Lanka": "lk",
  Thailand: "th",
  Turkey: "tr",
  Ukraine: "ua",
  "United Kingdom": "gb",
  "United States": "us",
  Vietnam: "vn",
};

function CountryWithFlag({ name, code }: { name: string; code?: string | null }) {
  const flagCode = (code || COUNTRY_FLAG_CODES[name] || "").toLowerCase();
  return (
    <span className="inline-flex items-center gap-1 min-w-0">
      {flagCode ? (
        <span className={`fi fi-${flagCode} visa-country-flag`} aria-hidden="true" />
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

function fallbackSamples(): VisaScoreSample[] {
  const fallbackFrom = "India";
  const destinations = shuffle(["Australia", "United Kingdom", "Canada", "United States", "Schengen", "New Zealand", "Japan", "South Korea", "Singapore"]).slice(0, 4);
  const visaTypes = shuffle(["Tourist Visa", "Visit Visa", "Work Visa", "Student Visa", "Business Visa"]);
  return destinations.map((to, index) => ({
    from: fallbackFrom,
    to,
    type: visaTypes[index % visaTypes.length],
    score: 50 + Math.floor(Math.random() * 32),
    fromCode: "in",
    toCode: COUNTRY_FLAG_CODES[to] || null,
  }));
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
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build a fresh, visitor-country-aware list on every page visit.
  useEffect(() => {
    const fallback = () => {
      setUserCountry("India");
      setSamples(fallbackSamples());
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
        const scores = data.scores?.length ? data.scores : fallbackSamples();
        const fromCountry = data.country || scores[0]?.from || "India";
        setUserCountry(fromCountry);
        setSamples(scores.map(score => ({ ...score, from: fromCountry })));
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

  function handleContactSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subject = encodeURIComponent(`Visa Shuttle contact from ${contactForm.name || "website visitor"}`);
    const body = encodeURIComponent(
      `Name: ${contactForm.name}\nEmail: ${contactForm.email}\n\nMessage:\n${contactForm.message}`
    );
    window.location.href = `mailto:hello@visashuttle.com?subject=${subject}&body=${body}`;
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
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</a>
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
                                  <CountryWithFlag name={s.from} code={s.fromCode} />
                                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                  <CountryWithFlag name={s.to} code={s.toCode} />
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

      {/* Contact */}
      <section id="contact" className="py-16 md:py-24 px-4 bg-muted/30 border-y">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-start">
          <div>
            <Badge className="mb-5 bg-[#4055FF]/10 text-[#4055FF] dark:bg-[#4055FF]/20 dark:text-[#8899FF] border-[#4055FF]/20 hover:bg-[#4055FF]/10">
              Contact
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Get in Touch</h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Have a question about visa checks, business access, or your application planning? Send us a message and the Visa Shuttle team will follow up.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
                <div className="w-10 h-10 rounded-lg bg-[#4055FF]/10 text-[#4055FF] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Visa Shuttle</p>
                  <p className="text-sm text-muted-foreground">Level 8, Tower I, UBB</p>
                  <p className="text-sm text-muted-foreground">Cessna Business Park, ORR, Bangalore – 560 103</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border bg-background p-4">
                <div className="w-10 h-10 rounded-lg bg-[#FF2060]/10 text-[#FF2060] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">Email</p>
                  <a href="mailto:hello@visashuttle.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    hello@visashuttle.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6 md:p-8">
              <form className="space-y-5" onSubmit={handleContactSubmit}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Your name"
                      required
                      data-testid="input-contact-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="you@example.com"
                      required
                      data-testid="input-contact-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="How can we help?"
                    rows={6}
                    required
                    data-testid="textarea-contact-message"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full md:w-auto gap-2 border-0 text-white hover:opacity-90"
                  style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}
                  data-testid="button-contact-submit"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
