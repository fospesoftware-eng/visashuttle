import { Link } from "wouter";
import { useState } from "react";
import { CheckCircle, Sparkles, Crown, ArrowRight, Info, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import {
  B2C_CURRENCIES,
  B2C_CURRENCY_FLAGS,
  type B2cCurrency,
  type B2cPlan,
  formatB2cPrice,
  formatB2cPlanPrice,
  getStoredB2cCurrency,
  normalizeB2cPlans,
  storeB2cCurrency,
} from "@/lib/b2c-pricing";

const planVisuals: Record<string, any> = {
  free: { icon: Sparkles, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/40", border: "border", ctaVariant: "outline" as const },
  deep: { icon: Crown, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700", ctaVariant: "default" as const },
  pro: { icon: Zap, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", ctaVariant: "default" as const },
};

export default function PricingPage() {
  const { user } = useB2cAuth();
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());
  const basicPrice = formatB2cPrice(currency, 0);
  const { data: planData } = useQuery<B2cPlan[]>({ queryKey: ["/api/public/b2c-plans"] });
  const plans = normalizeB2cPlans(planData);
  const deepPlan = plans.find(plan => plan.planKey === "deep");
  const deepPrice = deepPlan ? formatB2cPlanPrice(deepPlan, currency) : formatB2cPrice(currency);

  function handleCurrencyChange(next: B2cCurrency) {
    setCurrency(next);
    storeB2cCurrency(next);
  }

  function getPlanHref(plan: B2cPlan) {
    if (plan.planKey === "free") return user ? "/account" : "/join";
    const path = `/payment/deep-check?plan=${plan.planKey}&currency=${currency}`;
    return user ? path : `/sign-in?next=${encodeURIComponent(path)}`;
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden px-4 py-16 md:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(64,85,255,0.10),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-5 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-3.5 h-3.5" />
              Simple, transparent pricing
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Start with Basic Check at {basicPrice}. Upgrade to Deep Check for a full embassy-style analysis at {deepPrice}.
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
                  <span className="mr-1.5">{B2C_CURRENCY_FLAGS[code]}</span>
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const visual = planVisuals[plan.planKey] || planVisuals.free;
              const Icon = visual.icon;
              const isCurrentPlan = user?.subscriptionPlan === plan.planKey || (plan.planKey === "free" && user?.subscriptionPlan === "free");
              const planPrice = formatB2cPlanPrice(plan, currency);
              const period = plan.billingType === "monthly" ? "/month" : plan.billingType === "one_time" ? "/check" : "";
              return (
                <Card
                  key={plan.name}
                  className={`relative flex h-full overflow-hidden bg-background/95 backdrop-blur ${visual.border} ${plan.planKey === "deep" ? "shadow-xl shadow-purple-500/10 ring-4 ring-purple-500/5" : "shadow-sm"}`}
                  data-testid={`card-plan-${plan.planKey}`}
                >
                  {plan.planKey === "deep" && (
                    <Badge className="absolute right-5 top-5 bg-purple-100 text-purple-700 border-0">Popular</Badge>
                  )}
                  <CardContent className="flex h-full w-full flex-col p-6 md:p-7">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${visual.bg}`}>
                      <Icon className={`w-6 h-6 ${visual.color}`} />
                    </div>
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="min-h-[44px] text-muted-foreground text-sm leading-6 mb-4">{plan.description}</p>
                    <div className="mb-6 flex flex-wrap items-end gap-x-2 gap-y-1">
                      <span className="text-4xl font-black tracking-tight">{plan.planKey === "free" ? basicPrice : planPrice}</span>
                      {period && <span className="text-muted-foreground text-sm mb-1">{period}</span>}
                    </div>
                    {plan.planKey === "pro" && (
                      <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                        10 Deep Checks + unlimited Basic checks
                      </div>
                    )}
                    {plan.planKey === "deep" && (
                      <div className="mb-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
                        One-time report purchase
                      </div>
                    )}

                    <div className="mb-6 flex-1 space-y-2.5">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-start gap-2.5 text-sm">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    {plan.conditions?.note && <p className="mb-5 text-xs leading-5 text-muted-foreground">{plan.conditions.note}</p>}

                    {isCurrentPlan ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Link href={getPlanHref(plan)}>
                        <Button
                          className={`w-full ${plan.planKey !== "free" ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white" : ""}`}
                          variant={visual.ctaVariant}
                          data-testid={`button-plan-${plan.planKey}`}
                        >
                          {plan.conditions?.cta || (plan.planKey === "free" ? "Start Free" : "Get Plan")}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 flex items-start gap-3 p-4 rounded-xl bg-background/90 border text-sm text-muted-foreground max-w-3xl mx-auto shadow-sm">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>
              Visa Shuttle provides AI-based estimation only and does not guarantee visa approval. Final decisions are made solely by the relevant embassy, consulate, or immigration authority.
            </span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4 bg-muted/30 border-t">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Is the Basic Check really free?", a: `Yes — every new account gets 1 Basic Check at ${basicPrice}. No credit card required.` },
              { q: "How accurate is the AI scoring?", a: "Our AI analyzes 14 key factors used by immigration authorities and provides a probability estimate. It's a guidance tool, not a legal guarantee." },
              { q: "What is the Deep Check?", a: "Deep Check asks detailed questions across 7 dimensions (personal profile, finances, travel history, home ties, and more) and returns an embassy-style risk analysis with an action plan. It also supports Family applications (spouse + children)." },
              { q: "How much does Deep Check cost?", a: `Deep Check is a one-time report purchase. Current ${currency} price: ${deepPrice}.` },
              { q: "What is included in Pro?", a: "Pro is a monthly plan with unlimited Basic checks, 10 Deep Checks, and 1000 Visa Tools Credit." },
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
