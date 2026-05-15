import { Link } from "wouter";
import { 
  Shield, Zap, FileCheck, Brain, Users, 
  CheckCircle, ArrowRight, Globe, Star, Code2, WalletCards, KeyRound, Activity,
  Building2, Sparkles, Layers3, BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Processing",
    description: "Intelligent document analysis and automated checklist generation saves hours of manual work."
  },
  {
    icon: FileCheck,
    title: "Smart Document Center",
    description: "Automatic quality checks, data extraction, and organized document management."
  },
  {
    icon: Users,
    title: "Customer Portal",
    description: "Self-service portal for applicants with real-time status updates and secure messaging."
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Enterprise-grade security with audit logs and data protection compliance."
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Streamlined workflows reduce visa processing time by up to 60%."
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Support for 190+ countries with up-to-date visa requirements database."
  }
];

const stats = [
  { value: "500+", label: "Travel Agencies" },
  { value: "50K+", label: "Visas Processed" },
  { value: "99.2%", label: "Success Rate" },
  { value: "24/7", label: "Support" }
];

const testimonials = [
  {
    quote: "Visa Shuttle transformed our agency. We process 3x more applications with the same team.",
    author: "Sarah Chen",
    role: "Owner, Global Travel Solutions",
    avatar: "SC"
  },
  {
    quote: "The AI document checker catches errors before submission. Our rejection rate dropped to near zero.",
    author: "Ahmed Hassan",
    role: "Operations Manager, Voyager Travel",
    avatar: "AH"
  },
  {
    quote: "Our customers love the real-time tracking. It reduced support calls by 70%.",
    author: "Maria Rodriguez",
    role: "CEO, Wanderlust Agency",
    avatar: "MR"
  }
];

const apiUseCases = [
  "Embed AI visa eligibility scores into your own app",
  "Run Deep Check and visa-requirement APIs without using the full agency CRM",
  "Create reseller API keys for partner agencies or travel portals",
  "Track usage, wallet balance, and endpoint pricing from one console",
];

const apiPlans = [
  { name: "Deep Check API", price: "Pay per analysis", icon: Brain, description: "Embassy-style risk scoring, document gaps, and improvement guidance." },
  { name: "Visa Requirements API", price: "Pay per lookup", icon: FileCheck, description: "Structured entry requirements and checklist data for customer journeys." },
  { name: "Reseller Keys", price: "Usage wallet", icon: KeyRound, description: "Issue scoped keys and monitor usage across branches or partner brands." },
];

const planCategories = [
  {
    name: "Agency CRM",
    icon: Building2,
    badge: "Best for visa teams",
    description: "Run leads, customers, proposals, documents, payments, and applications in one branded agency workspace.",
    plans: ["Starter", "Professional", "Enterprise"],
    cta: "Start agency workspace",
    href: "/agency-register",
  },
  {
    name: "Business API",
    icon: Code2,
    badge: "Pay as you go",
    description: "Add Visa Shuttle AI into your website, CRM, booking engine, or partner portal without changing your current system.",
    plans: ["Deep Check API", "Requirements API", "Reseller Keys"],
    cta: "Start API wallet",
    href: "/agency-register",
  },
  {
    name: "Enterprise Network",
    icon: Layers3,
    badge: "Custom rollout",
    description: "For large brands, multi-branch agencies, franchises, and reseller networks that need custom controls.",
    plans: ["Custom pricing", "Dedicated support", "SLA"],
    cta: "Contact sales",
    href: "/agency-register",
  },
];

const pricingPlans = [
  {
    category: "Agency CRM",
    name: "Starter",
    price: "$49",
    period: "/mo",
    description: "For small agencies moving away from spreadsheets.",
    features: ["Up to 50 cases/month", "2 team members", "Basic document checks", "Email support"],
    cta: "Get Started Free",
    variant: "outline" as const,
  },
  {
    category: "Agency CRM",
    name: "Professional",
    price: "$149",
    period: "/mo",
    description: "For growing agencies that need AI checks and customer portals.",
    features: ["Up to 200 cases/month", "10 team members", "AI document analysis", "Customer portal", "Priority support"],
    cta: "Start Free Trial",
    variant: "default" as const,
    popular: true,
  },
  {
    category: "API",
    name: "Business API",
    price: "Pay as you go",
    period: "",
    description: "For businesses that want standalone visa intelligence APIs.",
    features: ["Deep Check API", "Visa requirements API", "Scoped API keys", "Usage wallet", "Reseller ready"],
    cta: "Start API Wallet",
    variant: "default" as const,
    highlighted: true,
  },
  {
    category: "Enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large operations with branches, custom controls, or reseller networks.",
    features: ["Unlimited cases", "Unlimited team members", "Custom AI training", "API access", "Dedicated support", "SLA guarantee"],
    cta: "Contact Sales",
    variant: "outline" as const,
  },
];

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted/35 via-background to-background py-16 md:py-24">
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium text-primary shadow-sm">
              <Sparkles className="h-4 w-4" />
              AI visa platform for agencies, enterprises, and API teams
            </div>
            
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
              A calmer, smarter way to run
              <span className="gradient-text block">visa business operations</span>
            </h1>
            
            <p className="mb-8 text-lg leading-8 text-muted-foreground md:text-xl">
              Convert visa inquiries into paid applications with branded portals, AI document checks, fee collection, and standalone pay-as-you-go APIs for your own digital products.
            </p>
            
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/agency-register">
                <Button size="lg" className="gap-2 text-base" data-testid="button-hero-cta">
                  Start Business Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#plans">
                <Button size="lg" variant="outline" className="gap-2 text-base" data-testid="button-view-plans">
                  Compare Plans
                  <Layers3 className="h-4 w-4" />
                </Button>
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border bg-background p-4 shadow-sm">
                  <p className="text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative lg:min-h-[560px]">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl">
              <div className="relative aspect-[4/3] min-h-[420px]">
                <img
                  src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=85"
                  alt="Business traveler preparing documents for an international trip"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/15 to-transparent" />
              </div>
            </div>

            <div className="absolute inset-x-4 bottom-4 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur md:inset-x-8 md:bottom-8">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-semibold">Agency workspace + Business API</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Start with your CRM, then add API usage when your business is ready to scale.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Checks</p>
                    <p className="font-semibold">AI</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Portal</p>
                    <p className="font-semibold">Live</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">API</p>
                    <p className="font-semibold">PAYG</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="models" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose how you want to grow
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Use Visa Shuttle as a full agency platform, as standalone APIs, or as a custom enterprise network.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planCategories.map((category) => (
              <Card key={category.name} className="group hover-elevate" data-testid={`card-business-model-${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <category.icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      {category.badge}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{category.name}</h3>
                  <p className="mb-5 text-sm leading-6 text-muted-foreground">{category.description}</p>
                  <div className="mb-6 flex flex-wrap gap-2">
                    {category.plans.map((plan) => (
                      <span key={plan} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                        {plan}
                      </span>
                    ))}
                  </div>
                  <Link href={category.href}>
                    <Button variant={category.name === "Business API" ? "default" : "outline"} className="w-full gap-2">
                      {category.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <BadgeCheck className="h-4 w-4" />
                Built for visa operations
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything a modern visa team needs
              </h2>
              <p className="text-lg text-muted-foreground">
                Convert inquiries faster, reduce document mistakes, and give customers a polished self-service experience from proposal to final status.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section id="business-api" className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-5">
                <Code2 className="h-4 w-4" />
                Business API - Pay as you go
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Use Visa Shuttle AI without moving your whole operation
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Standalone API plans let businesses add visa intelligence to existing websites, CRMs, booking engines, and partner portals. Add credits, create API keys, and pay only for the calls you use.
              </p>
              <div className="grid gap-3 mb-8">
                {apiUseCases.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/agency-register">
                  <Button size="lg" className="gap-2" data-testid="button-business-api-start">
                    Start API wallet
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/docs/api">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="button-business-api-docs">
                    View API docs
                    <Code2 className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-lg">
              <div className="grid gap-4">
                <div className="rounded-xl border bg-muted/30 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Wallet balance</p>
                      <p className="text-3xl font-bold">Pay-as-you-go</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <WalletCards className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-xs text-muted-foreground">Keys</p>
                      <p className="font-semibold">Scoped</p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-xs text-muted-foreground">Usage</p>
                      <p className="font-semibold">Live</p>
                    </div>
                    <div className="rounded-lg bg-background p-3">
                      <p className="text-xs text-muted-foreground">Billing</p>
                      <p className="font-semibold">Credits</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {apiPlans.map((plan) => (
                    <div key={plan.name} className="flex items-start gap-4 rounded-xl border bg-background p-4" data-testid={`card-api-plan-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <plan.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{plan.name}</h3>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {plan.price}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 rounded-xl border bg-primary/5 p-4 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4 text-primary" />
                  Monitor every endpoint call, spend, and partner key in the Business API dashboard.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="py-16 md:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <WalletCards className="h-4 w-4" />
                Categorized plans
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Pick the business plan that matches your model
              </h2>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Start with agency CRM, connect APIs when you need them, or build a larger enterprise rollout.
              </p>
            </div>
            <Link href="/agency-register">
              <Button size="lg" className="gap-2">
                Create Business Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-4">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative hover-elevate ${plan.popular || plan.highlighted ? "border-primary shadow-md" : ""}`}
                data-testid={`card-pricing-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {(plan.popular || plan.highlighted) && (
                  <div className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    {plan.popular ? "Most Popular" : "Standalone API"}
                  </div>
                )}
                <CardContent className="flex h-full flex-col p-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-normal text-primary">{plan.category}</p>
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="min-h-[48px] text-sm text-muted-foreground">{plan.description}</p>
                  <p className="my-6 text-3xl font-bold">
                    {plan.price}
                    {plan.period && <span className="text-base font-normal text-muted-foreground">{plan.period}</span>}
                  </p>
                  <ul className="mb-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/agency-register">
                    <Button variant={plan.variant} className="w-full" data-testid={`button-pricing-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Leading Agencies
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what travel professionals are saying about Visa Shuttle.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover-elevate" data-testid={`card-testimonial-${index}`}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 gradient-bg text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to turn visa demand into a smarter business?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Launch the agency workspace, connect the Business API, or start with both from one Visa Shuttle account.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/agency-register">
              <Button size="lg" variant="secondary" className="gap-2 text-base" data-testid="button-cta-final">
                Start Business Account
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="ghost" className="gap-2 text-base text-white/80 hover:text-white hover:bg-white/10" data-testid="button-cta-signin">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
