import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, ArrowRight, CheckCircle2, Globe, Shield, Clock,
  Phone, Mail, MessageCircle, Star, Plane, FileText,
  Upload, Bell, ChevronRight, Building2, Users, Award,
  Zap, HeartHandshake, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tenant } from "@workspace/db";

const VISA_SERVICES = [
  { icon: "🇬🇧", name: "UK Visa", types: ["Visitor", "Student", "Work"] },
  { icon: "🇪🇺", name: "Schengen Visa", types: ["Tourist", "Business", "Transit"] },
  { icon: "🇺🇸", name: "US Visa", types: ["B1/B2", "F1 Student", "Work"] },
  { icon: "🇨🇦", name: "Canada Visa", types: ["Visitor", "Study Permit", "PR"] },
  { icon: "🇦🇪", name: "UAE Visa", types: ["Tourist", "Transit", "Business"] },
  { icon: "🇦🇺", name: "Australia Visa", types: ["ETA", "Visitor", "Student"] },
];

const STEPS = [
  {
    step: "01",
    icon: Users,
    title: "Create Your Account",
    desc: "Sign up with just your email — no password needed. We send you a secure one-time code."
  },
  {
    step: "02",
    icon: FileText,
    title: "Link Your Application",
    desc: "Use the reference ID from your agency to instantly connect your visa application."
  },
  {
    step: "03",
    icon: Upload,
    title: "Upload & Track",
    desc: "Upload required documents, chat with your agent, and follow your application in real time."
  },
];

const TRUST_SIGNALS = [
  { icon: Shield, label: "Bank-level Security", desc: "All documents encrypted end-to-end" },
  { icon: Clock, label: "Real-time Updates", desc: "Instant status notifications" },
  { icon: HeartHandshake, label: "Expert Guidance", desc: "Dedicated agent support" },
  { icon: Award, label: "High Approval Rate", desc: "Thorough document review" },
];

export default function AgencyHomePage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();

  const { data: tenant, isLoading, error } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="text-center max-w-sm">
          <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Agency Not Found</h1>
          <p className="text-muted-foreground">The travel agency you're looking for doesn't exist or may have moved.</p>
        </div>
      </div>
    );
  }

  const primary = tenant.primaryColor || "#00B4D8";
  const secondary = tenant.secondaryColor || "#E056A0";
  const accent = tenant.accentColor || "#0096C7";

  const goToLogin = () => setLocation(`/w/${slug}/login`);
  const goToSignup = () => setLocation(`/w/${slug}/login`);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 border-b bg-white/95 dark:bg-slate-950/95 backdrop-blur"
        style={{ borderBottomColor: `${primary}25` }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <span className="agency-logo-shell">
                <img src={tenant.logoUrl} alt={tenant.name} className="agency-logo-flex agency-logo-flex-sm" />
              </span>
            ) : (
              <span className="text-xl font-bold" style={{ color: primary }}>{tenant.name}</span>
            )}
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToLogin}
              data-testid="button-nav-login"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={goToSignup}
              style={{ backgroundColor: primary }}
              className="text-white"
              data-testid="button-nav-signup"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6"
        style={{
          background: `linear-gradient(135deg, ${primary}12 0%, ${secondary}10 50%, ${accent}08 100%)`
        }}
      >
        {/* Background blobs */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${primary}, transparent)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${secondary}, transparent)` }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="max-w-3xl">
            <Badge
              className="mb-6 px-3 py-1 text-sm font-medium border-0"
              style={{ backgroundColor: `${primary}18`, color: primary }}
              data-testid="badge-agency-name"
            >
              ✈ {tenant.name}
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Your Visa Journey,{" "}
              <span
                style={{
                  background: `linear-gradient(90deg, ${primary}, ${secondary})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Made Simple
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              We handle every step of your visa application — from document preparation to submission — so you can focus on planning your trip.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="text-base h-13 px-8 text-white shadow-lg gap-2"
                style={{ backgroundColor: primary }}
                onClick={goToSignup}
                data-testid="button-hero-signup"
              >
                Start Your Application
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base h-13 px-8 gap-2"
                onClick={goToLogin}
                data-testid="button-hero-track"
              >
                <FileText className="w-4 h-4" />
                Track Existing Application
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8">
              {["No hidden fees", "Fast processing", "Expert agents"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4" style={{ color: primary }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ───────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 border-y bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST_SIGNALS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${primary}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: primary }} />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────────── */}
      <section id="services" className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge
              className="mb-4 px-3 py-1 text-sm border-0"
              style={{ backgroundColor: `${primary}15`, color: primary }}
            >
              What We Offer
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Visa Services We Specialise In
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From tourist visas to long-term residency, we've got every destination covered.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VISA_SERVICES.map((service) => (
              <div
                key={service.name}
                className="group rounded-2xl border bg-card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                style={{ borderColor: `${primary}20` }}
                onClick={goToSignup}
                data-testid={`card-service-${service.name.replace(/\s/g, "-").toLowerCase()}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{service.icon}</span>
                  <h3 className="font-bold text-lg text-foreground">{service.name}</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {service.types.map((type) => (
                    <span
                      key={type}
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${primary}12`, color: primary }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
                <div
                  className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all"
                  style={{ color: primary }}
                >
                  Apply now <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-20 px-4 sm:px-6"
        style={{ background: `linear-gradient(135deg, ${primary}08, ${secondary}06)` }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <Badge
              className="mb-4 px-3 py-1 text-sm border-0"
              style={{ backgroundColor: `${primary}15`, color: primary }}
            >
              Simple Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              How the Customer Portal Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Stay in the loop at every stage of your application with our self-service portal.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative text-center">
                {/* connector line */}
                {step !== "03" && (
                  <div
                    className="hidden md:block absolute top-8 left-1/2 w-full h-px"
                    style={{ background: `linear-gradient(90deg, ${primary}50, transparent)` }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div
                    className="text-xs font-mono font-bold mb-2 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${primary}15`, color: primary }}
                  >
                    STEP {step}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Button
              size="lg"
              className="text-white gap-2 shadow-lg"
              style={{ backgroundColor: primary }}
              onClick={goToSignup}
              data-testid="button-hiw-cta"
            >
              <Zap className="w-4 h-4" />
              Get Started Free
            </Button>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ───────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge
                className="mb-4 px-3 py-1 text-sm border-0"
                style={{ backgroundColor: `${primary}15`, color: primary }}
              >
                Why Choose Us
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5">
                Everything you need for a successful visa application
              </h2>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Our team of experienced visa consultants and AI-powered platform ensures every document is correct, every form is complete, and every application has the best chance of approval.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, text: "AI-powered document quality checks before submission" },
                  { icon: Bell, text: "Real-time status updates via email and portal" },
                  { icon: MessageCircle, text: "Direct chat with your assigned agent" },
                  { icon: Globe, text: "Multi-country expertise with local knowledge" },
                  { icon: Clock, text: "Average 24-hour document review turnaround" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: `${primary}15` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: primary }} />
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "500+", label: "Visas Approved" },
                { value: "98%", label: "Success Rate" },
                { value: "24h", label: "Avg. Review Time" },
                { value: "50+", label: "Countries Covered" },
              ].map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl p-6 text-center border"
                  style={{ borderColor: `${primary}20`, background: `${primary}06` }}
                  data-testid={`stat-${label.replace(/\s/g, "-").toLowerCase()}`}
                >
                  <p
                    className="text-4xl font-extrabold mb-1"
                    style={{ color: primary }}
                  >
                    {value}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────── */}
      <section
        className="py-20 px-4 sm:px-6 text-white"
        style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <Plane className="w-12 h-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to start your visa journey?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Join hundreds of travellers who've successfully obtained their visas through {tenant.name}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-white font-semibold text-base gap-2"
              style={{ color: primary }}
              onClick={goToSignup}
              data-testid="button-cta-signup"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/50 text-white hover:bg-white/10 text-base gap-2"
              onClick={goToLogin}
              data-testid="button-cta-login"
            >
              <FileText className="w-4 h-4" />
              Track Application
            </Button>
          </div>
        </div>
      </section>

      {/* ── CONTACT / FOOTER ────────────────────────────────── */}
      <footer
        id="contact"
        className="py-12 px-4 sm:px-6 bg-slate-900 text-white"
      >
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              {tenant.logoUrl ? (
                <span className="agency-logo-shell agency-logo-shell-on-brand mb-4">
                  <img src={tenant.logoUrl} alt={tenant.name} className="agency-logo-flex agency-logo-flex-sm brightness-0 invert" />
                </span>
              ) : (
                <h3 className="text-xl font-bold mb-4" style={{ color: primary }}>{tenant.name}</h3>
              )}
              <p className="text-slate-400 text-sm leading-relaxed">
                Professional visa consultancy helping travellers navigate the visa process with confidence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Our Services</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                {VISA_SERVICES.slice(0, 4).map(s => (
                  <li key={s.name}>{s.icon} {s.name}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">Get in Touch</h4>
              <div className="space-y-3 text-sm text-slate-400">
                {tenant.contactEmail && (
                  <a
                    href={`mailto:${tenant.contactEmail}`}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    data-testid="link-contact-email"
                  >
                    <Mail className="w-4 h-4" style={{ color: primary }} />
                    {tenant.contactEmail}
                  </a>
                )}
                {tenant.contactPhone && (
                  <a
                    href={`tel:${tenant.contactPhone}`}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    data-testid="link-contact-phone"
                  >
                    <Phone className="w-4 h-4" style={{ color: primary }} />
                    {tenant.contactPhone}
                  </a>
                )}
                {tenant.whatsappNumber && (
                  <a
                    href={`https://wa.me/${tenant.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    data-testid="link-contact-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4 text-green-400" />
                    WhatsApp Us
                  </a>
                )}
                {!tenant.contactEmail && !tenant.contactPhone && !tenant.whatsappNumber && (
                  <p className="text-slate-500 italic">Contact details coming soon</p>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} {tenant.name}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                className="text-white gap-2"
                style={{ backgroundColor: primary }}
                onClick={goToSignup}
                data-testid="button-footer-signup"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              {tenant.showPoweredBy && (
                <span className="text-slate-600 text-xs">
                  Powered by <span className="font-semibold text-slate-400">Visa Shuttle</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
