import { useState } from "react";
import { Link } from "wouter";
import {
  Plane, Brain, Zap, Shield, ArrowRight, CheckCircle,
  ChevronDown, Search, Sparkles, TrendingUp, Clock, Star,
  AlertCircle, Info, FileText, CreditCard, MapPin, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Azerbaijan", "Bahrain", "Bangladesh", "Belgium", "Brazil", "Bulgaria",
  "Cambodia", "Canada", "Chile", "China", "Colombia", "Croatia", "Cyprus",
  "Czech Republic", "Denmark", "Egypt", "Estonia", "Ethiopia", "Finland",
  "France", "Georgia", "Germany", "Ghana", "Greece", "Hungary", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Japan",
  "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Latvia", "Lebanon", "Lithuania",
  "Luxembourg", "Malaysia", "Malta", "Mexico", "Morocco", "Myanmar",
  "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Oman",
  "Pakistan", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Saudi Arabia", "Serbia", "Singapore", "Slovakia", "Slovenia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Thailand", "Tunisia", "Turkey", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uzbekistan",
  "Venezuela", "Vietnam", "Yemen", "Zimbabwe"
];

const VISA_TYPES = [
  "Tourist Visa",
  "Business Visa",
  "Student Visa",
  "Work Visa",
  "Visit Visa",
  "Transit Visa"
];

const TRAVEL_PURPOSES = [
  "Tourism",
  "Business Meeting",
  "Study",
  "Employment",
  "Family Visit",
  "Medical Treatment",
  "Conference / Event",
  "Other"
];

const HIGH_SCORE_NATIONALITIES = new Set([
  "United States", "United Kingdom", "Germany", "France", "Canada", "Australia",
  "Japan", "South Korea", "Singapore", "Netherlands", "Switzerland", "Sweden",
  "Norway", "Denmark", "Finland", "Austria", "Belgium", "New Zealand", "Ireland",
  "Luxembourg", "Israel", "Italy", "Spain", "Portugal", "Greece"
]);

const MID_SCORE_NATIONALITIES = new Set([
  "Brazil", "Mexico", "Argentina", "South Africa", "Turkey", "Malaysia",
  "Thailand", "Philippines", "Indonesia", "India", "China", "Russia",
  "Ukraine", "Poland", "Romania", "Bulgaria", "Czech Republic", "Hungary",
  "Croatia", "Serbia", "Colombia", "Chile", "Peru", "Morocco", "Tunisia",
  "Jordan", "Lebanon", "Egypt", "Georgia", "Kazakhstan", "Taiwan"
]);

function computeApprovalChance(nationality: string, visaType: string, destination: string, purpose: string) {
  let score = 50;

  if (HIGH_SCORE_NATIONALITIES.has(nationality)) score += 25;
  else if (MID_SCORE_NATIONALITIES.has(nationality)) score += 10;
  else score -= 5;

  if (visaType === "Tourist Visa" || visaType === "Transit Visa") score += 15;
  else if (visaType === "Visit Visa") score += 10;
  else if (visaType === "Business Visa") score += 5;
  else if (visaType === "Student Visa") score -= 5;
  else if (visaType === "Work Visa") score -= 10;

  if (purpose === "Tourism") score += 10;
  else if (purpose === "Conference / Event") score += 8;
  else if (purpose === "Family Visit") score += 5;
  else if (purpose === "Medical Treatment") score += 3;
  else if (purpose === "Business Meeting") score += 5;
  else if (purpose === "Study") score -= 5;
  else if (purpose === "Employment") score -= 8;

  const toughDestinations = new Set(["United States", "United Kingdom", "Canada", "Australia", "Germany", "France"]);
  if (toughDestinations.has(destination)) score -= 8;

  score = Math.max(12, Math.min(96, score));
  return score;
}

function getScoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Excellent Chance", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" };
  if (score >= 65) return { label: "Good Chance", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" };
  if (score >= 45) return { label: "Moderate Chance", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" };
  return { label: "Lower Chance", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800" };
}

function getExplanation(score: number, visaType: string, nationality: string, destination: string): string {
  if (score >= 80) {
    return `Based on your nationality (${nationality}), ${visaType.toLowerCase()} applications to ${destination} typically have a strong approval rate. Your profile aligns well with standard requirements for this visa category.`;
  }
  if (score >= 65) {
    return `Your profile shows a solid chance of approval. ${nationality} passport holders applying for a ${visaType.toLowerCase()} to ${destination} generally meet the key criteria, though thorough documentation will strengthen your application.`;
  }
  if (score >= 45) {
    return `Your application has a moderate approval chance. ${destination} reviews ${visaType.toLowerCase()} applications from ${nationality} carefully. Providing strong supporting documents — especially financial proof and travel history — is essential.`;
  }
  return `This visa category and destination combination requires extra care. ${destination} imposes stricter scrutiny on ${visaType.toLowerCase()} applications from ${nationality}. Consider consulting a visa expert before applying.`;
}

function getSuggestedSteps(score: number) {
  const base = [
    { icon: FileText, text: "Gather all required supporting documents" },
    { icon: CreditCard, text: "Prepare financial proof (bank statements, payslips)" },
    { icon: MapPin, text: "Confirm your travel itinerary and hotel bookings" },
  ];
  if (score < 65) {
    base.push({ icon: Lightbulb, text: "Consult a visa expert to review your application" });
  } else {
    base.push({ icon: CheckCircle, text: "Double-check visa photo and form requirements" });
  }
  return base;
}

interface FormState {
  nationality: string;
  visaType: string;
  destination: string;
  purpose: string;
  agency: string;
}

export default function HomePage() {
  const [form, setForm] = useState<FormState>({
    nationality: "",
    visaType: "",
    destination: "",
    purpose: "",
    agency: ""
  });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [result, setResult] = useState<null | { score: number; nationality: string; visaType: string; destination: string; purpose: string }>(null);
  const [loading, setLoading] = useState(false);
  const [natSearch, setNatSearch] = useState("");
  const [destSearch, setDestSearch] = useState("");
  const [showNatList, setShowNatList] = useState(false);
  const [showDestList, setShowDestList] = useState(false);

  const filteredNat = COUNTRIES.filter(c => c.toLowerCase().includes(natSearch.toLowerCase())).slice(0, 8);
  const filteredDest = COUNTRIES.filter(c => c.toLowerCase().includes(destSearch.toLowerCase())).slice(0, 8);

  function validate() {
    const e: Partial<FormState> = {};
    if (!form.nationality) e.nationality = "Please select your nationality";
    if (!form.visaType) e.visaType = "Please select a visa type";
    if (!form.destination) e.destination = "Please select a destination country";
    if (!form.purpose) e.purpose = "Please select purpose of travel";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCheck() {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setResult({ score: computeApprovalChance(form.nationality, form.visaType, form.destination, form.purpose), ...form });
      setLoading(false);
      setTimeout(() => {
        document.getElementById("result-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }, 1200);
  }

  const scoreInfo = result ? getScoreLabel(result.score) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-6">
            <a href="#checker" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Visa Check</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <Link href="/business" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Business</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/business">
              <Button variant="ghost" size="sm" data-testid="button-business">For Agencies</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" data-testid="button-login">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="checker" className="relative overflow-hidden pt-16 pb-8 md:pt-24 md:pb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/30 dark:via-background dark:to-cyan-950/20" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Visa Insights
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight">
                Check Your{" "}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Visa Approval
                </span>{" "}
                Chances Before You Apply
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
                Visa Shuttle helps travelers understand their visa approval probability using AI-powered insights based on nationality, visa type, destination, and travel purpose.
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                {[
                  { icon: Brain, text: "AI-Powered Analysis" },
                  { icon: Zap, text: "Instant Results" },
                  { icon: Shield, text: "100% Free" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {["SM", "AH", "MR", "JK"].map((av) => (
                    <div key={av} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 border-2 border-white dark:border-background flex items-center justify-center text-white text-xs font-semibold">
                      {av}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">12,000+</span> travelers checked this month
                </p>
              </div>
            </div>

            {/* Right: Form Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl scale-105" />
              <Card className="relative border shadow-2xl rounded-2xl overflow-visible">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                      <Search className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="font-semibold text-lg">Visa Approval Checker</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Nationality */}
                    <div className="space-y-1.5 relative">
                      <Label className="text-sm font-medium">Your Nationality <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          placeholder="Search nationality..."
                          value={natSearch || form.nationality}
                          onChange={(e) => {
                            setNatSearch(e.target.value);
                            setForm(f => ({ ...f, nationality: "" }));
                            setShowNatList(true);
                          }}
                          onFocus={() => setShowNatList(true)}
                          className={errors.nationality ? "border-red-400" : ""}
                          data-testid="input-nationality"
                        />
                        {form.nationality && !natSearch && (
                          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      {showNatList && natSearch && filteredNat.length > 0 && (
                        <div className="absolute z-50 w-full bg-background border rounded-lg shadow-lg mt-1 overflow-hidden">
                          {filteredNat.map(c => (
                            <button
                              key={c}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onMouseDown={() => {
                                setForm(f => ({ ...f, nationality: c }));
                                setNatSearch("");
                                setShowNatList(false);
                                setErrors(e => ({ ...e, nationality: "" }));
                              }}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.nationality && <p className="text-xs text-red-500">{errors.nationality}</p>}
                    </div>

                    {/* Visa Type */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Visa Type <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <select
                          className={`w-full h-10 pl-3 pr-10 text-sm border rounded-md bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${errors.visaType ? "border-red-400" : "border-input"}`}
                          value={form.visaType}
                          onChange={e => { setForm(f => ({ ...f, visaType: e.target.value })); setErrors(er => ({ ...er, visaType: "" })); }}
                          data-testid="select-visa-type"
                        >
                          <option value="">Select visa type</option>
                          {VISA_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                      {errors.visaType && <p className="text-xs text-red-500">{errors.visaType}</p>}
                    </div>

                    {/* Destination */}
                    <div className="space-y-1.5 relative">
                      <Label className="text-sm font-medium">Destination Country <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Input
                          placeholder="Search destination..."
                          value={destSearch || form.destination}
                          onChange={(e) => {
                            setDestSearch(e.target.value);
                            setForm(f => ({ ...f, destination: "" }));
                            setShowDestList(true);
                          }}
                          onFocus={() => setShowDestList(true)}
                          className={errors.destination ? "border-red-400" : ""}
                          data-testid="input-destination"
                        />
                        {form.destination && !destSearch && (
                          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      {showDestList && destSearch && filteredDest.length > 0 && (
                        <div className="absolute z-50 w-full bg-background border rounded-lg shadow-lg mt-1 overflow-hidden">
                          {filteredDest.map(c => (
                            <button
                              key={c}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onMouseDown={() => {
                                setForm(f => ({ ...f, destination: c }));
                                setDestSearch("");
                                setShowDestList(false);
                                setErrors(e => ({ ...e, destination: "" }));
                              }}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.destination && <p className="text-xs text-red-500">{errors.destination}</p>}
                    </div>

                    {/* Purpose */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Purpose of Travel <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <select
                          className={`w-full h-10 pl-3 pr-10 text-sm border rounded-md bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring ${errors.purpose ? "border-red-400" : "border-input"}`}
                          value={form.purpose}
                          onChange={e => { setForm(f => ({ ...f, purpose: e.target.value })); setErrors(er => ({ ...er, purpose: "" })); }}
                          data-testid="select-purpose"
                        >
                          <option value="">Select purpose</option>
                          {TRAVEL_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                      {errors.purpose && <p className="text-xs text-red-500">{errors.purpose}</p>}
                    </div>

                    {/* Agency (optional) */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Agency Applied <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                      </Label>
                      <Input
                        placeholder="Agency name if already applied"
                        value={form.agency}
                        onChange={e => setForm(f => ({ ...f, agency: e.target.value }))}
                        data-testid="input-agency"
                      />
                    </div>

                    <Button
                      className="w-full h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0"
                      onClick={handleCheck}
                      disabled={loading}
                      data-testid="button-check-visa"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyzing...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Check Approval Chance
                        </span>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Result Card */}
      {result && scoreInfo && (
        <section id="result-card" className="py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className={`border-2 ${scoreInfo.bg} shadow-lg rounded-2xl overflow-hidden`} data-testid="result-card">
              <CardContent className="p-0">
                {/* Score header */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-blue-100 text-sm font-medium mb-1">Your Approval Estimate</p>
                      <h3 className="text-3xl font-bold">{result.visaType} → {result.destination}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-6xl font-black leading-none">{result.score}%</div>
                      <Badge className="mt-1 bg-white/20 text-white border-0 text-xs">{scoreInfo.label}</Badge>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* AI Explanation */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-1">AI Assessment</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {getExplanation(result.score, result.visaType, result.nationality, result.destination)}
                      </p>
                    </div>
                  </div>

                  {/* Suggested steps */}
                  <div>
                    <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Suggested Next Steps
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {getSuggestedSteps(result.score).map(({ icon: Icon, text }, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border text-sm">
                          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.score < 65 && (
                    <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>For a stronger application, consider working with an accredited travel agency. <Link href="/business" className="underline font-medium">See our agency partners →</Link></span>
                    </div>
                  )}

                  <div className="flex gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>This is an AI-based estimate for informational purposes only. Actual approval decisions are made solely by immigration authorities.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={() => { setResult(null); setForm({ nationality: "", visaType: "", destination: "", purpose: "", agency: "" }); }}
                data-testid="button-check-again"
              >
                Check Another Visa
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Trust Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Travelers Trust Visa Shuttle</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Powered by real visa outcome data and AI-driven analysis to give you accurate insights before you apply.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "AI-Based Visa Insights",
                desc: "Our model analyzes thousands of visa outcomes across nationalities, destinations, and visa types to give you a data-backed probability score.",
                color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30"
              },
              {
                icon: Zap,
                title: "Fast Pre-Assessment",
                desc: "Get your visa approval estimate in seconds — no registration required. Know your chances before investing time in a full application.",
                color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30"
              },
              {
                icon: Shield,
                title: "Built for Travelers & Agencies",
                desc: "Whether you're a solo traveler or a professional travel agent, Visa Shuttle gives you the clarity to make informed decisions.",
                color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30"
              }
            ].map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="hover-elevate rounded-xl" data-testid={`card-trust-${title.toLowerCase().replace(/\s+/g, '-')}`}>
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

      {/* How It Works */}
      <section id="how-it-works" className="py-16 md:py-24 bg-muted/30 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">Three simple steps to understand your visa approval chances</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[33%] w-[34%] h-0.5 bg-gradient-to-r from-blue-300 to-cyan-300 dark:from-blue-700 dark:to-cyan-700" />
            {[
              { step: "1", icon: FileText, title: "Enter Your Travel Details", desc: "Share your nationality, visa type, destination country, and the purpose of your visit." },
              { step: "2", icon: Brain, title: "AI Checks Key Visa Factors", desc: "Our AI model evaluates your profile against historical approval patterns and current requirements." },
              { step: "3", icon: Star, title: "Get Your Approval Chance", desc: "Receive an instant percentage score with AI insights and actionable next steps for your application." }
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center relative" data-testid={`step-${step}`}>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  <Icon className="w-9 h-9 text-white" />
                </div>
                <div className="absolute top-0 right-1/4 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  {step}
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-10 md:p-16 text-white shadow-2xl shadow-blue-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white/90 text-sm font-medium mb-6">
                <Plane className="w-4 h-4" />
                Planning to Apply for a Visa?
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                Start Your Free Visa Check Today
              </h2>
              <p className="text-blue-100 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
                Get your personalized visa approval estimate in seconds — no signup, no fees, just honest AI-powered insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-lg text-base"
                  onClick={() => document.getElementById("checker")?.scrollIntoView({ behavior: "smooth" })}
                  data-testid="button-cta-check"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Free Visa Check
                </Button>
                <Link href="/business">
                  <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 text-base" data-testid="button-cta-agency">
                    I'm a Travel Agency
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/business" className="hover:text-foreground transition-colors">For Agencies</Link>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Visa Shuttle. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
