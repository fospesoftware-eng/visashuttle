import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatB2cPrice, getStoredB2cCurrency } from "@/lib/b2c-pricing";

const BRAND_GRADIENT = "linear-gradient(135deg,#4055FF 0%,#9033F5 50%,#FF2060 100%)";

type Step = {
  num: number;
  title: string;
  body: string;
  bullets?: string[];
  image?: string;
  imageAlt?: string;
  icon: React.ComponentType<{ className?: string }>;
};

const travelerSteps: Step[] = [
  {
    num: 1,
    title: "Open the Visa Shuttle home page",
    body:
      "Start at visashuttle.com. The home page shows live AI-powered visa scores for popular routes so you know exactly what you're going to get.",
    bullets: [
      "Click \"Check My Visa Chances — ₹0\" or \"Get My Score — ₹0\" on the right card",
      "No card details required to start",
      "Works on mobile, tablet and desktop",
    ],
    image: "/help-assets/01-home.jpg",
    imageAlt: "Visa Shuttle home page showing live visa scores",
    icon: PlayCircle,
  },
  {
    num: 2,
    title: "Create your free account",
    body:
      "We use phone OTP plus email so your check history is safe across devices. The whole sign-up takes about 30 seconds.",
    bullets: [
      "Enter your full name, email, phone number and a password",
      "Tap \"Send Verification Code\" — we'll text you a 4-digit code",
      "Accept the Terms and Privacy Policy and you're in",
    ],
    image: "/help-assets/02-check.jpg",
    imageAlt: "Sign-up form with phone verification",
    icon: UserPlus,
  },
  {
    num: 3,
    title: "Run your free Basic Check",
    body:
      "Tell us where you live, where you want to go, and a few quick details about your travel. Our AI looks at 14 factors and returns a probability score in seconds.",
    bullets: [
      "Choose nationality and destination country",
      "Pick visa type (Tourist, Student, Work, Business, Visit)",
      "Answer 6–8 short questions — no documents needed",
      "See your approval probability and a label (High / Good / Moderate / Low)",
    ],
    icon: Sparkles,
  },
  {
    num: 4,
    title: "Upgrade to Deep Check (optional)",
    body:
      "If you're serious about applying, Deep Check gives you an embassy-style risk assessment with 7 profile dimensions, a red-flag list, and a personalised action plan.",
    bullets: [
      "Fixed Deep Check pricing: USD 15, GBP 11, EUR 12, INR 1000, or AED 55",
      "Pay securely with Cashfree — UPI, cards, net banking",
      "Get a downloadable PDF report you can share with an agent",
      "Includes document checklist and improvement plan",
    ],
    image: "/help-assets/03-deep-check.jpg",
    imageAlt: "Deep Check upgrade page",
    icon: ShieldCheck,
  },
  {
    num: 5,
    title: "Track everything in your account",
    body:
      "Every check is saved to your dashboard. Re-open old reports, run new checks, or switch to a saved profile to skip the questions next time.",
    bullets: [
      "View all past Basic and Deep checks with date and score",
      "Re-download Deep Check PDFs anytime",
      "Save profile to autofill future checks",
      "Get email + SMS notifications when a new visa rule affects you",
    ],
    image: "/help-assets/05-pricing.jpg",
    imageAlt: "Pricing page showing Basic and Deep plans",
    icon: LayoutDashboard,
  },
];

const agencySteps: Step[] = [
  {
    num: 1,
    title: "Register your agency in 3 simple steps",
    body:
      "Go to /agency-register. The wizard collects your agency details, sets up your owner account, and gives you your white-label customer portal URL.",
    bullets: [
      "Step 1 — Agency name, slug (yourdomain.com/w/your-agency), and contact phone",
      "Step 2 — Admin account: name, email, password",
      "Step 3 — Review and launch — your portal goes live immediately",
    ],
    image: "/help-assets/06-agency-register.jpg",
    imageAlt: "Agency registration wizard",
    icon: UserPlus,
  },
  {
    num: 2,
    title: "Sign in to Visa Desk",
    body:
      "From any sign-in page click \"Visa Desk / Growth Hub Login\". You'll land on /app — your operational hub for leads, customers, cases and invoices.",
    bullets: [
      "Cross-tenant safe — staff only see their agency's data",
      "Role-based access: Owner, Manager, Staff",
      "Mobile responsive — manage cases from your phone",
    ],
    image: "/help-assets/07-signin.jpg",
    imageAlt: "Sign in screen with agency login button",
    icon: ShieldCheck,
  },
  {
    num: 3,
    title: "Capture leads and convert them to customers",
    body:
      "Add leads manually, import from CSV, or share your white-label portal link so customers self-register. Convert a hot lead to a customer with one click.",
    bullets: [
      "Lead pipeline with stages: New → Contacted → Qualified → Won",
      "Auto-capture from your branded subdomain or /w/ slug",
      "Notes, tasks, and reminders per lead",
      "Send Proposals (with online accept + signature) directly from a lead",
    ],
    image: "/help-assets/04-business.jpg",
    imageAlt: "Visa Shuttle for Business landing page",
    icon: Users,
  },
  {
    num: 4,
    title: "Open a case and run the AI Visa Stage",
    body:
      "Each customer can have multiple cases (one per trip). Open a case, run the Visa Stage, and our AI gives you the same Deep Check report — branded as your agency.",
    bullets: [
      "Document checklist auto-generated by destination + visa type",
      "Customer uploads via white-label portal — you review in-app",
      "Status workflow: Draft → Documents → Submitted → Approved / Rejected",
      "Auto-generated visa-ready PDF you can email to the embassy",
    ],
    icon: FileCheck2,
  },
  {
    num: 5,
    title: "Bill your customers — invoices, online payments, accounting",
    body:
      "Issue branded invoices, accept online payments through your own Cashfree account, and reconcile in the Accounting tab. Your customers pay you directly.",
    bullets: [
      "Branded invoice templates — your logo, GST number, terms",
      "Pay link: /pay/invoice/:token — UPI, cards, net banking",
      "Receipts auto-emailed; ledger updated in real time",
      "Export GSTR-1 ready CSV for your accountant",
    ],
    image: "/help-assets/05-pricing.jpg",
    imageAlt: "Plans and pricing surface",
    icon: CircleDollarSign,
  },
  {
    num: 6,
    title: "Plug visa intelligence into your own product (Agency API)",
    body:
      "Want to embed Visa Shuttle into your own app or website? Spin up an API key, top up your wallet, and call our public endpoints — no subscription, pay only per call.",
    bullets: [
      "Deep Check — $1.99 / call",
      "Visa Requirements — $0.25 / call",
      "Bearer-token auth, scoped keys, 60 req/min rate limit",
      "Wallet-based billing with detailed usage logs",
    ],
    image: "/help-assets/08-api-pricing.jpg",
    imageAlt: "Pay-per-call API pricing page",
    icon: KeyRound,
  },
];

const travelerFaqs = [
  {
    q: "Is Visa Shuttle a substitute for an actual visa application?",
    a: "No. Visa Shuttle is a decision-support tool. We tell you how likely your visa is to be approved and what to fix before applying. You still file your application through the embassy or VFS / VAC channel.",
  },
  {
    q: "Is the Basic Check really free?",
    a: "Yes. The Basic Check is ₹0 — no credit card needed. You only pay if you want a Deep Check. Pricing is USD 15, GBP 11, EUR 12, INR 1000, or AED 55.",
  },
  {
    q: "How accurate is the AI score?",
    a: "Our model is trained on visa-policy data and looks at 14 factors including nationality, finances, travel history, ties to home country, and purpose of travel. Treat the score as guidance — it cannot guarantee an embassy decision.",
  },
  {
    q: "What's the difference between Basic Check and Deep Check?",
    a: "Basic Check gives you a quick approval percentage and a High/Good/Moderate/Low label. Deep Check is a full embassy-style assessment with 7 profile dimensions, red flags, document checklist, action plan and a downloadable PDF.",
  },
  {
    q: "How is my data protected?",
    a: "All data is encrypted in transit and at rest. We never sell your data and you can delete your account at any time from Settings. See our Privacy Policy for full details.",
  },
  {
    q: "Can I use this for my whole family?",
    a: "Yes. Deep Check supports both Individual and Family applicants. For families, you'll be asked about each member's profile and we'll generate one combined report.",
  },
  {
    q: "I bought a Deep Check by mistake — can I get a refund?",
    a: "Yes — within 24 hours of purchase if you haven't downloaded the PDF report. See the Refund Policy page for the full terms.",
  },
];

const agencyFaqs = [
  {
    q: "How is Visa Shuttle priced for agencies?",
    a: "Plans start at Starter and go up to Professional and Enterprise. Each plan has a monthly fee and includes a quota of cases, customer seats and AI checks. The Agency API platform is billed separately on a pay-per-call basis.",
  },
  {
    q: "Do my customers see Visa Shuttle branding?",
    a: "No. Your customer-facing portal lives at yourdomain.com/w/your-slug (or your own subdomain) with your logo, your colours, and your terms. We work in the background.",
  },
  {
    q: "Can my staff have separate logins?",
    a: "Yes. Add staff from Settings → Users. Roles available: Owner (full access including billing), Manager (no billing), Staff (case-level access only). All actions are audit-logged.",
  },
  {
    q: "How does payment collection work?",
    a: "You connect your own Cashfree account in Settings → Integrations. Money flows directly from your customers to your bank account — Visa Shuttle never holds your funds.",
  },
  {
    q: "Can I resell the Visa Shuttle API to my own clients?",
    a: "Yes. From Business → API → Resellers, mint a sub-key for any child agency. Their usage debits their wallet and your reseller wallet earns the markup automatically.",
  },
  {
    q: "What integrations are supported out of the box?",
    a: "Cashfree (payments), MSG91 / MessageCentral (SMS / OTP), Anthropic (AI), Email (SMTP). All keys are stored encrypted and managed from your agency Settings — never shared across tenants.",
  },
  {
    q: "Is there an API rate limit?",
    a: "Yes — 60 requests per minute per API key. Responses include X-RateLimit-Remaining and Retry-After headers so your client can back off automatically. Need higher limits? Contact sales.",
  },
  {
    q: "Can I import my existing customers and cases?",
    a: "Yes. From Customers → Import you can upload a CSV. Cases can be migrated through the API or with the bulk import tool — contact support and we'll help you onboard in under a day.",
  },
];

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center" id={`step-${step.num}`}>
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: BRAND_GRADIENT }}
          >
            {step.num}
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            Step {step.num}
          </Badge>
        </div>
        <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
        <p className="text-muted-foreground mb-4 leading-relaxed">{step.body}</p>
        {step.bullets && (
          <ul className="space-y-2">
            {step.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="order-first md:order-last">
        {step.image ? (
          <div className="rounded-xl overflow-hidden border shadow-lg bg-muted/30">
            <img
              src={step.image}
              alt={step.imageAlt || step.title}
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed bg-muted/30 aspect-[16/10] flex items-center justify-center">
            <div className="text-center p-8">
              <Icon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">In-app screen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HelpPage() {
  const [tab, setTab] = useState<"travelers" | "agencies">("travelers");
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());

  useEffect(() => {
    initAutoDetectedCurrency().then((detected) => setCurrency(detected));
    const handleCurrencyEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.currency) setCurrency(detail.currency);
    };
    window.addEventListener("visashuttle:currency-changed", handleCurrencyEvent);
    return () => window.removeEventListener("visashuttle:currency-changed", handleCurrencyEvent);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "agencies" || hash === "travelers") setTab(hash);
  }, []);

  const handleTabChange = (v: string) => {
    if (v === "travelers" || v === "agencies") {
      setTab(v);
      window.history.replaceState(null, "", `#${v}`);
    }
  };

  const basicCheckPrice = formatB2cPrice(currency, 0);
  const deepCheckPrice = formatB2cPrice(currency);

  const travelerFaqsWithCurrency = travelerFaqs.map((faq) =>
    faq.q === "Is the Basic Check really free?"
      ? { ...faq, a: `Yes. The Basic Check is ${basicCheckPrice} — no credit card needed. You only pay if you want a Deep Check (${deepCheckPrice}).` }
      : faq
  );
  const travelerStepsWithCurrency = travelerSteps.map((step) =>
    step.num === 1
      ? { ...step, bullets: [`Click "Check My Visa Chances — ${basicCheckPrice}" or "Get My Score — ${basicCheckPrice}" on the right card`, ...step.bullets.slice(1)] }
      : step
  );
  const faqs = tab === "travelers" ? travelerFaqsWithCurrency : agencyFaqs;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20 text-center">
          <Badge
            className="mb-4 border-0 text-white"
            style={{ background: BRAND_GRADIENT }}
          >
            Help &amp; FAQ
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Get up and running in minutes
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Step-by-step walkthroughs for travelers checking their visa odds and
            for travel agencies running their visa business on Visa Shuttle.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="border-0 text-white"
              style={{ background: BRAND_GRADIENT }}
              onClick={() => handleTabChange("travelers")}
            >
              I'm a Traveler
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleTabChange("agencies")}
            >
              I run a Travel Agency
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Tabs + steps */}
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <div className="flex justify-center mb-10">
            <TabsList className="h-12">
              <TabsTrigger value="travelers" className="text-base px-6 gap-2">
                <Sparkles className="w-4 h-4" />
                For Travelers (B2C)
              </TabsTrigger>
              <TabsTrigger value="agencies" className="text-base px-6 gap-2">
                <Users className="w-4 h-4" />
                For Agencies (B2B)
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="travelers" className="space-y-16 sm:space-y-20">
            {travelerStepsWithCurrency.map((s) => (
              <StepCard key={s.num} step={s} />
            ))}
          </TabsContent>

          <TabsContent value="agencies" className="space-y-16 sm:space-y-20">
            {agencySteps.map((s) => (
              <StepCard key={s.num} step={s} />
            ))}
          </TabsContent>
        </Tabs>

        {/* CTA strip between steps and FAQ */}
        <Card className="mt-16 border-0 text-white" style={{ background: BRAND_GRADIENT }}>
          <CardContent className="p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-1">
                {tab === "travelers"
                  ? "Ready to check your visa chances?"
                  : "Ready to launch your agency on Visa Shuttle?"}
              </h3>
              <p className="text-white/85">
                {tab === "travelers"
                  ? `Free Basic Check at ${basicCheckPrice} — no card needed.`
                  : "Set up your branded portal in 3 simple steps."}
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              {tab === "travelers" ? (
                <>
                  <Link href="/check">
                    <Button size="lg" variant="secondary" className="font-semibold">
                      Start Basic Check {basicCheckPrice}
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-foreground">
                      See pricing
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/agency-register">
                    <Button size="lg" variant="secondary" className="font-semibold">
                      Register your agency
                    </Button>
                  </Link>
                  <Link href="/business">
                    <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-foreground">
                      View features
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-3 gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              {tab === "travelers" ? "Traveler questions" : "Agency questions"}
            </h2>
            <p className="text-muted-foreground">
              Can't find what you're looking for? Email us at{" "}
              <a
                href="mailto:support@visashuttle.com"
                className="underline underline-offset-2 hover:text-foreground"
              >
                support@visashuttle.com
              </a>
              .
            </p>
          </div>

          <Accordion type="single" collapsible className="bg-background border rounded-xl px-4">
            {faqs.map((f, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className={i === faqs.length - 1 ? "border-b-0" : ""}
              >
                <AccordionTrigger className="text-left text-base font-semibold">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            <Card>
              <CardContent className="p-6 flex items-start gap-3">
                <Mail className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-semibold mb-1">Email support</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Get a reply within 24 hours on business days.
                  </p>
                  <a
                    href="mailto:support@visashuttle.com"
                    className="text-sm font-medium underline underline-offset-2"
                  >
                    support@visashuttle.com
                  </a>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-start gap-3">
                <LifeBuoy className="w-5 h-5 mt-0.5 text-primary" />
                <div>
                  <div className="font-semibold mb-1">For agencies</div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Onboarding help, custom plans, API access.
                  </p>
                  <Link
                    href="/business"
                    className="text-sm font-medium underline underline-offset-2"
                  >
                    Talk to sales
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

    </div>
  );
}
