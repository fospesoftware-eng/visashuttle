import { Link } from "wouter";
import { useState } from "react";
import { CheckCircle, Sparkles, Crown, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import {
  B2C_CURRENCIES,
  B2C_DEEP_CHECK_PRICES,
  type B2cCurrency,
  formatB2cPrice,
  getStoredB2cCurrency,
  storeB2cCurrency,
} from "@/lib/b2c-pricing";

const plans = [
  {
    name: "Basic Check",
    key: "free",
    icon: Sparkles,
    price: "₹0",
    originalPrice: null,
    period: "",
    description: "Basic Check for a quick AI visa score",
    badge: null,
    color: "text-slate-600",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border",
    features: [
      "1 Basic Check",
      "Approval chance percentage",
      "Status label (High / Good / Moderate / Low)",
      "Strengths & risk factors",
      "Basic next steps",
    ],
    limitations: ["No check history", "No Deep Check", "No PDF report"],
    cta: "Start Basic Check",
    ctaVariant: "outline" as const,
    href: "/join",
  },
  {
    name: "Deep Check",
    key: "pro",
    icon: Crown,
    price: "",
    originalPrice: null,
    period: "/check",
    description: "Embassy-style deep analysis for serious applicants",
    badge: null,
    color: "text-purple-600",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    border: "border-purple-300 dark:border-purple-700",
    features: [
      "Full embassy-style risk analysis",
      "Deep Check with 7 profile dimensions",
      "Individual & Family applicant support",
      "Document gap analysis & action plan",
      "Red flag identification",
      "Personalized improvement plan",
      "PDF report download",
      "Check history & dashboard",
      "Priority support",
    ],
    limitations: [],
    cta: "Get Deep Check",
    ctaVariant: "default" as const,
    href: "/join",
  },
];

export default function PricingPage() {
  const { user } = useB2cAuth();
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());
  const deepPrice = formatB2cPrice(currency);
  const deepCheckPath = `/payment/deep-check?currency=${currency}`;
  const deepCheckHref = user ? deepCheckPath : `/sign-in?next=${encodeURIComponent(deepCheckPath)}`;

  function handleCurrencyChange(next: B2cCurrency) {
    setCurrency(next);
    storeB2cCurrency(next);
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-5 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3.5 h-3.5" />
              Simple, transparent pricing
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Start with Basic Check at ₹0. Upgrade to Deep Check for a full embassy-style analysis at {deepPrice}.
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border bg-background p-2 shadow-sm">
              <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Currency</span>
              {B2C_CURRENCIES.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleCurrencyChange(code)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                    currency === code
                      ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = user?.subscriptionPlan === plan.key;
              return (
                <Card
                  key={plan.name}
                  className={`relative ${plan.border} ${plan.badge ? "shadow-xl shadow-purple-500/10" : "shadow"}`}
                  data-testid={`card-plan-${plan.key}`}
                >
                  <CardContent className="p-6 md:p-7">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.bg}`}>
                      <Icon className={`w-6 h-6 ${plan.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                    <div className="mb-6 flex items-end gap-2">
                      <span className="text-4xl font-black">{plan.key === "pro" ? deepPrice : plan.price}</span>
                      {plan.period && <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>}
                    </div>
                    {plan.key === "pro" && (
                      <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
                        Fixed price in {currency}: {formatB2cPrice(currency, B2C_DEEP_CHECK_PRICES[currency].amount)}
                      </div>
                    )}

                    <div className="space-y-2.5 mb-6">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                      {plan.limitations.map(f => (
                        <div key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center text-muted-foreground/50 font-bold">—</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    {isCurrentPlan ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Link href={plan.key === "pro" ? deepCheckHref : user ? "/account" : plan.href}>
                        <Button
                          className={`w-full ${plan.badge ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white" : ""}`}
                          variant={plan.ctaVariant}
                          data-testid={`button-plan-${plan.key}`}
                        >
                          {plan.cta}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 flex items-start gap-3 p-4 rounded-xl bg-muted/50 border text-sm text-muted-foreground max-w-2xl mx-auto">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>
              Visa Shuttle provides AI-based estimation only and does not guarantee visa approval. Final decisions are made solely by the relevant embassy, consulate, or immigration authority.
            </span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-muted/30 border-t">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is the Basic Check really free?", a: "Yes — every new account gets 1 Basic Check at ₹0. No credit card required." },
              { q: "How accurate is the AI scoring?", a: "Our AI analyzes 14 key factors used by immigration authorities and provides a probability estimate. It's a guidance tool, not a legal guarantee." },
              { q: "What is the Deep Check?", a: "Deep Check asks detailed questions across 7 dimensions (personal profile, finances, travel history, home ties, and more) and returns an embassy-style risk analysis with an action plan. It also supports Family applications (spouse + children)." },
              { q: "How much does Deep Check cost?", a: "Deep Check is a one-time report purchase. Choose your currency before checkout: USD 15, GBP 11, EUR 12, INR 1000, or AED 55." },
              { q: "Can I check for my family?", a: "Yes. The Deep Check supports Family applicants, covering the primary applicant, spouse, and children traveling together in a single assessment." },
            ].map(({ q, a }) => (
              <div key={q} className="p-5 rounded-xl bg-background border">
                <h4 className="font-semibold mb-2">{q}</h4>
                <p className="text-muted-foreground text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
