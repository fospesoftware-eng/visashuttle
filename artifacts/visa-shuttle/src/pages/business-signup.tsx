import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Building2, CheckCircle2, Code2, Mail, Palette, Phone, Sparkles, UserRound, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SignupType = "agency-crm" | "api" | "enterprise" | "whitelabel" | "agentic";

const SALES_EMAIL = "hello@visashuttle.com";

const signupContent = {
  "agency-crm": {
    title: "Start Agency CRM",
    eyebrow: "Agency CRM signup",
    description: "Tell us about your agency and preferred CRM plan. We will guide you through setup, payment, and activation.",
    icon: Building2,
    plans: ["Lite", "Go", "Power"],
    intentLabel: "Preferred CRM plan",
    intentPlaceholder: "Select a plan",
    outcome: "Agency workspace, CRM plan setup, payment guidance, and onboarding support.",
  },
  api: {
    title: "Request Business API Access",
    eyebrow: "Business API signup",
    description: "Share your product use case and expected API usage so we can prepare the right API setup for you.",
    icon: Code2,
    plans: ["Pay as you go", "Startup integration", "High volume platform", "Custom API plan"],
    intentLabel: "API usage type",
    intentPlaceholder: "Select usage type",
    outcome: "API key setup, usage guidance, documentation, and pricing fit.",
  },
  enterprise: {
    title: "Plan Enterprise Setup",
    eyebrow: "Enterprise solutions signup",
    description: "Tell us about your organization, workflow complexity, users, and volume so we can shape an enterprise implementation.",
    icon: Sparkles,
    plans: ["Multi-branch agency", "Education consultant network", "Immigration firm", "Travel group", "Other enterprise"],
    intentLabel: "Organization type",
    intentPlaceholder: "Select organization type",
    outcome: "Workflow discovery, solution design, pricing proposal, and implementation plan.",
  },
  whitelabel: {
    title: "Start Whitelabel Setup",
    eyebrow: "Whitelabel signup",
    description: "Share your brand, customer portal needs, and domain requirements so we can prepare your branded Visa Shuttle setup.",
    icon: Palette,
    plans: ["Agency portal", "Custom domain portal", "Remove branding", "Full agency website"],
    intentLabel: "Whitelabel need",
    intentPlaceholder: "Select setup type",
    outcome: "Brand setup, portal configuration, payment options, and launch checklist.",
  },
  agentic: {
    title: "Request Agentic Visa AI",
    eyebrow: "Agentic AI signup",
    description: "Describe the AI workflow you want, from intake analysis to document review, recommendations, or team automation.",
    icon: WandSparkles,
    plans: ["Applicant intake AI", "Document review AI", "Fraud risk AI", "Agency workflow AI", "Custom automation"],
    intentLabel: "AI workflow",
    intentPlaceholder: "Select workflow",
    outcome: "AI workflow scoping, effort estimate, implementation timeline, and next steps.",
  },
} satisfies Record<SignupType, {
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof Building2;
  plans: string[];
  intentLabel: string;
  intentPlaceholder: string;
  outcome: string;
}>;

export default function BusinessSignupPage({ type }: { type: SignupType }) {
  const content = signupContent[type];
  const Icon = content.icon;
  const initialIntent = useMemo(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    const matchedPlan = content.plans.find((item) => item.toLowerCase() === plan?.toLowerCase());
    return matchedPlan || content.plans[0];
  }, [content.plans]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    country: "",
    website: "",
    intent: initialIntent,
    volume: "",
    message: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = `Visa Shuttle ${content.title}: ${form.company || form.name || "New enquiry"}`;
    const body = [
      content.eyebrow,
      "",
      `Name: ${form.name || "-"}`,
      `Email: ${form.email || "-"}`,
      `Phone: ${form.phone || "-"}`,
      `Company / agency: ${form.company || "-"}`,
      `Country: ${form.country || "-"}`,
      `Website: ${form.website || "-"}`,
      `${content.intentLabel}: ${form.intent || "-"}`,
      `Expected monthly volume: ${form.volume || "-"}`,
      "",
      "Message:",
      form.message || "-",
    ].join("\n");
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(64,85,255,0.10),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(255,32,96,0.08),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4055FF]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#4055FF] shadow-sm">
              <Icon className="h-4 w-4" />
              {content.eyebrow}
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#15236B] md:text-6xl">{content.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">{content.description}</p>
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-black uppercase tracking-wide text-[#4055FF]">What happens next</p>
              <div className="mt-4 space-y-3">
                {[
                  "We review your business requirements.",
                  "Our team replies with the best setup path.",
                  content.outcome,
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <CardContent className="p-6 md:p-8">
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Name</Label>
                    <Input id="business-name" value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-email">Email</Label>
                    <Input id="business-email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@company.com" required />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-phone">Mobile</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input id="business-phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+91 98765 43210" className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-company">Company / agency</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input id="business-company" value={form.company} onChange={(event) => update("company", event.target.value)} placeholder="Company name" className="pl-9" required />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-country">Country</Label>
                    <Input id="business-country" value={form.country} onChange={(event) => update("country", event.target.value)} placeholder="India, UAE, UK..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-website">Website</Label>
                    <Input id="business-website" value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://example.com" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-intent">{content.intentLabel}</Label>
                    <Select value={form.intent} onValueChange={(value) => update("intent", value)}>
                      <SelectTrigger id="business-intent">
                        <SelectValue placeholder={content.intentPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {content.plans.map((plan) => (
                          <SelectItem key={plan} value={plan}>
                            {plan}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-volume">Expected monthly volume</Label>
                    <Input id="business-volume" value={form.volume} onChange={(event) => update("volume", event.target.value)} placeholder="e.g. 200 applications / 10k API calls" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-message">Requirements</Label>
                  <Textarea id="business-message" value={form.message} onChange={(event) => update("message", event.target.value)} placeholder="Tell us what you want to build or activate..." rows={6} />
                </div>

                <Button type="submit" className="w-full gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] text-white hover:opacity-90">
                  Submit request
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  This opens your email app with all details filled in.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

export function AgencyCrmSignupPage() {
  return <BusinessSignupPage type="agency-crm" />;
}

export function BusinessApiSignupPage() {
  return <BusinessSignupPage type="api" />;
}

export function EnterpriseSignupPage() {
  return <BusinessSignupPage type="enterprise" />;
}

export function WhitelabelSignupPage() {
  return <BusinessSignupPage type="whitelabel" />;
}

export function AgenticSignupPage() {
  return <BusinessSignupPage type="agentic" />;
}
