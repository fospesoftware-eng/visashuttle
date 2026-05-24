import { Link } from "wouter";
import { useState } from "react";
import { CheckCircle, Sparkles, Crown, ArrowRight, Info, Zap, ShieldCheck, Gauge, FileText, Coins } from "lucide-react";
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
  free: { icon: Sparkles, color: "text-slate-700", bg: "bg-slate-100 dark:bg-slate-800/40", border: "border-slate-200", ctaVariant: "outline" as const, eyebrow: "Start here" },
  deep: { icon: Crown, color: "text-[#4055FF]", bg: "bg-[#4055FF]/10", border: "border-[#4055FF]/35", ctaVariant: "default" as const, eyebrow: "Most popular" },
  pro: { icon: Zap, color: "text-[#FF2060]", bg: "bg-[#FF2060]/10", border: "border-[#FF2060]/25", ctaVariant: "default" as const, eyebrow: "Power users" },
};

export default function PricingPage() {
  const { user } = useB2cAuth();
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());
  const basicPrice = formatB2cPrice(currency, 0);
  const { data: planData } = useQuery<B2cPlan[]>({ queryKey: ["/api/public/b2c-plans"] });
  const plans = normalizeB2cPlans(planData);
  const freePlan = plans.find(plan => plan.planKey === "free");
  const deepPlan = plans.find(plan => plan.planKey === "deep");
  const proPlan = plans.find(plan => plan.planKey === "pro");
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

  function getPlanDetailHref(plan: B2cPlan) {
    if (plan.planKey === "free") return "/plans/basic-check";
    if (plan.planKey === "deep") return "/plans/deep-check";
    return "/plans/pro";
  }

  const comparisonRows = [
    { label: "Basic checks", free: "1", deep: "1", pro: "Unlimited*" },
    { label: "Deep checks", free: "—", deep: "1", pro: "10" },
    {
      label: "Visa Tools credits",
      free: String(freePlan?.visaToolsCredits ?? 0),
      deep: String(deepPlan?.visaToolsCredits ?? 0),
      pro: String(proPlan?.visaToolsCredits ?? 0),
    },
    { label: "PDF reports", free: "—", deep: "Included", pro: "Included" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(64,85,255,0.10),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(255,32,96,0.08),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4055FF]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#4055FF] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Transparent B2C pricing
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                Choose the visa intelligence level you need
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Start free, unlock a detailed embassy-style Deep Check, or use Pro when you need repeated checks and more Visa Tools credits.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Currency</p>
                  <p className="text-sm font-semibold text-slate-800">Default is USD. Switch anytime.</p>
                </div>
                <Badge variant="outline" className="bg-slate-50">{B2C_CURRENCY_FLAGS[currency]} {currency}</Badge>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {B2C_CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleCurrencyChange(code)}
                    className={`rounded-xl px-2 py-2 text-sm font-bold transition ${
                      currency === code
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="block text-base leading-none">{B2C_CURRENCY_FLAGS[code]}</span>
                    <span className="mt-1 block text-[11px]">{code}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const visual = planVisuals[plan.planKey] || planVisuals.free;
              const Icon = visual.icon;
              const isCurrentPlan = user?.subscriptionPlan === plan.planKey || (plan.planKey === "free" && user?.subscriptionPlan === "free");
              const planPrice = formatB2cPlanPrice(plan, currency);
              const period = plan.billingType === "monthly" ? "/month" : plan.billingType === "one_time" ? "/check" : "";
              const stats = [
                { icon: Gauge, label: "Basic", value: plan.basicCheckLimit >= 9999 ? "Unlimited" : plan.basicCheckLimit },
                { icon: FileText, label: "Deep", value: plan.deepCheckLimit },
                { icon: Coins, label: "Tools", value: plan.visaToolsCredits },
              ];
              return (
                <Card
                  key={plan.name}
                  className={`relative flex h-full overflow-hidden rounded-3xl bg-white ${visual.border} ${plan.planKey === "deep" ? "shadow-2xl shadow-[#4055FF]/10 ring-4 ring-[#4055FF]/10" : "shadow-sm"}`}
                  data-testid={`card-plan-${plan.planKey}`}
                >
                  {plan.planKey === "deep" && (
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060]" />
                  )}
                  <CardContent className="flex h-full w-full flex-col p-6 md:p-8">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${visual.bg}`}>
                        <Icon className={`h-6 w-6 ${visual.color}`} />
                      </div>
                      <Badge variant={plan.planKey === "deep" ? "default" : "outline"} className={plan.planKey === "deep" ? "border-0 bg-[#4055FF] text-white" : "bg-slate-50"}>
                        {visual.eyebrow}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-950">{plan.name}</h3>
                    <p className="mt-2 min-h-[54px] text-sm leading-6 text-slate-600">{plan.description}</p>
                    <div className="my-6 flex flex-wrap items-end gap-x-2 gap-y-1">
                      <span className="text-5xl font-black tracking-tight text-slate-950">{plan.planKey === "free" ? basicPrice : planPrice}</span>
                      {period && <span className="pb-1.5 text-sm font-semibold text-slate-500">{period}</span>}
                    </div>
                    <div className="mb-6 grid grid-cols-3 gap-2">
                      {stats.map(({ icon: StatIcon, label, value }) => (
                        <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <StatIcon className="mb-2 h-4 w-4 text-[#4055FF]" />
                          <p className="text-[11px] font-semibold uppercase text-slate-400">{label}</p>
                          <p className="mt-0.5 text-sm font-black text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    {(plan.planKey === "pro" || plan.planKey === "deep") && (
                      <div className={`mb-5 rounded-2xl border p-3 text-xs font-semibold ${plan.planKey === "pro" ? "border-[#FF2060]/20 bg-[#FF2060]/5 text-[#A3113E]" : "border-[#4055FF]/20 bg-[#4055FF]/5 text-[#273CCF]"}`}>
                        {plan.planKey === "pro" ? "Best for frequent applicants and families." : "Best for one serious application decision."}
                      </div>
                    )}

                    <div className="mb-6 flex-1 space-y-2.5">
                      {plan.features.map(f => (
                        <div key={f} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                          <span className="min-w-0">{f}</span>
                        </div>
                      ))}
                    </div>
                    {plan.conditions?.note && <p className="mb-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{plan.conditions.note}</p>}

                    {isCurrentPlan ? (
                      <Button className="h-11 w-full rounded-xl" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Link href={getPlanHref(plan)}>
                        <Button
                          className={`h-11 w-full rounded-xl ${plan.planKey !== "free" ? "bg-gradient-to-r from-[#4055FF] to-[#FF2060] hover:opacity-90 border-0 text-white" : ""}`}
                          variant={visual.ctaVariant}
                          data-testid={`button-plan-${plan.planKey}`}
                        >
                          {plan.conditions?.cta || (plan.planKey === "free" ? "Start Free" : "Get Plan")}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                    <Link href={getPlanDetailHref(plan)}>
                      <Button variant="ghost" className="mt-2 h-10 w-full rounded-xl text-slate-600 hover:text-slate-950">
                        View plan details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-px bg-slate-200 md:grid-cols-5">
              <div className="bg-slate-50 p-4 md:col-span-1">
                <p className="text-sm font-black text-slate-900">Quick comparison</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Plan limits and included credits.</p>
              </div>
              {comparisonRows.map(row => (
                <div key={row.label} className="bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm font-bold text-slate-800">
                    <span>{row.free}</span>
                    <span className="text-[#4055FF]">{row.deep}</span>
                    <span className="text-[#FF2060]">{row.pro}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase text-slate-400">
                    <span>Free</span><span>Deep</span><span>Pro</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#4055FF]" />
            <span>Visa Shuttle provides AI-based estimation only and does not guarantee visa approval. Final decisions are made solely by the relevant embassy, consulate, or immigration authority.</span>
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
              { q: "What is included in Pro?", a: `Pro is a monthly plan with unlimited Basic checks, ${proPlan?.deepCheckLimit ?? 10} Deep Checks, and ${proPlan?.visaToolsCredits ?? 0} Visa Tools Credit.` },
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
