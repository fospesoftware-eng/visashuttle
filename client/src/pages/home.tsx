import { useState } from "react";
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

const VISA_SAMPLES = [
  { from: "India", to: "UAE", type: "Tourist Visa", score: 88, label: "High Chance", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
  { from: "Pakistan", to: "UK", type: "Visit Visa", score: 42, label: "Moderate", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
  { from: "Philippines", to: "Schengen", type: "Tourist Visa", score: 57, label: "Good Chance", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  { from: "Nigeria", to: "USA", type: "Tourist Visa", score: 31, label: "Low Chance", color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
];

const STEPS = [
  { step: "01", icon: FileText, title: "Enter Your Travel Details", desc: "Share 14 key details about your nationality, visa type, finances, travel history, and trip plans." },
  { step: "02", icon: Brain, title: "AI Analyzes Your Profile", desc: "Our AI compares your profile against real approval patterns across thousands of visa cases globally." },
  { step: "03", icon: TrendingUp, title: "Get Your Instant Result", desc: "Receive a percentage score, status label, strengths, risks, and personalized next steps — in seconds." },
];

export default function HomePage() {
  const { user } = useB2cAuth();
  const [, setLocation] = useLocation();

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
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/business" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">For Agencies</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Link href="/account">
                <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0" data-testid="button-account">
                  My Account
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/sign-in"><Button variant="ghost" size="sm" data-testid="button-signin">Sign In</Button></Link>
                <Link href="/join"><Button size="sm" className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0" data-testid="button-join">Get Started Free</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-10 md:pt-24 md:pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/30 dark:via-background dark:to-cyan-950/20" />
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-cyan-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Visa Insights — Free to Start
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight">
                Check Your{" "}
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
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
                  className="gap-2 text-base bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0 shadow-lg shadow-blue-500/25"
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
                    <div key={av} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 border-2 border-white dark:border-background flex items-center justify-center text-white text-xs font-semibold">
                      {av}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">15,000+</span> travelers checked this month
                </p>
              </div>
            </div>

            {/* Right — Live sample results */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-3xl blur-xl scale-105" />
              <Card className="relative shadow-2xl rounded-2xl overflow-hidden border">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-4 text-white">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      <span className="font-semibold">Live AI Visa Scores</span>
                    </div>
                    <p className="text-blue-100 text-xs mt-0.5">Real-time estimates powered by AI</p>
                  </div>
                  <div className="divide-y">
                    {VISA_SAMPLES.map((s, i) => (
                      <div key={i} className="px-6 py-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium mb-0.5">
                            <span>{s.from}</span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span>{s.to}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{s.type}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-black">{s.score}%</div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-6 py-4 bg-muted/30 border-t">
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0 font-semibold"
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
          <Badge className="mb-5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100">
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
            <div className="hidden md:block absolute top-10 left-[33%] w-[34%] h-0.5 bg-gradient-to-r from-blue-300 to-cyan-300 dark:from-blue-700 dark:to-cyan-700" />
            {STEPS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                  <Icon className="w-9 h-9 text-white" />
                </div>
                <div className="absolute top-0 right-1/4 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
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
              { icon: Brain, title: "Real AI — Not Guesswork", desc: "Our AI is trained on real visa application patterns. No fixed rules — dynamic, data-driven scoring that reflects actual approval trends.", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
              { icon: Globe, title: "Global Coverage", desc: "Supports 100+ nationalities and destinations. Whether you're applying for Schengen, US, UK, UAE, or anywhere else — we've got you.", color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30" },
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
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 p-10 md:p-16 text-white shadow-2xl shadow-blue-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white/90 text-sm font-medium mb-6">
                <Star className="w-4 h-4 fill-white" />
                Start for free today
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Planning to Apply for a Visa?</h2>
              <p className="text-blue-100 mb-8 text-lg leading-relaxed max-w-xl mx-auto">
                Know your chances before you apply. Get a free AI-powered visa assessment — no credit card, no waiting.
              </p>
              <Button
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-lg text-base"
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
              <Link href="/business" className="hover:text-foreground transition-colors">For Agencies</Link>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
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
