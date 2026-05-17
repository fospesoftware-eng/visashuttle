import { useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import {
  Shield, Zap, FileCheck, Brain, Users,
  CheckCircle, ArrowRight, Globe, Star, Code2,
  WalletCards, KeyRound, Activity, Building2,
  Sparkles, Layers3, BadgeCheck, ChevronRight,
  BarChart3, Lock, Cpu, Terminal, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Animation helpers ──────────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Abstract SVG Illustrations ─────────────────────────────────────────────

function HeroDashboardArt() {
  return (
    <svg viewBox="0 0 520 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden>
      {/* Background card */}
      <rect x="8" y="8" width="504" height="384" rx="20" fill="url(#bg)" opacity="0.04" />
      <rect x="8" y="8" width="504" height="384" rx="20" stroke="url(#borderGrad)" strokeWidth="1.5" />

      {/* Top bar */}
      <rect x="8" y="8" width="504" height="52" rx="20" fill="url(#topBar)" />
      <rect x="8" y="40" width="504" height="20" fill="url(#topBar)" />
      <circle cx="36" cy="34" r="7" fill="#FF2060" opacity="0.7" />
      <circle cx="56" cy="34" r="7" fill="#FFB800" opacity="0.7" />
      <circle cx="76" cy="34" r="7" fill="#00D67F" opacity="0.7" />
      <rect x="110" y="26" width="120" height="16" rx="8" fill="white" opacity="0.08" />
      <rect x="420" y="26" width="72" height="16" rx="8" fill="url(#btnGrad)" opacity="0.9" />

      {/* Sidebar */}
      <rect x="8" y="60" width="100" height="332" rx="0" fill="white" opacity="0.025" />
      <rect x="8" y="60" width="100" height="332" />
      <rect x="8" y="60" width="100" height="332" fill="url(#sidebarFill)" />
      {[88, 116, 144, 172, 200, 228].map((y, i) => (
        <g key={y}>
          <rect x="20" y={y} width="14" height="14" rx="4" fill="url(#iconGrad)" opacity={i === 1 ? "0.9" : "0.35"} />
          <rect x="40" y={y + 2} width={i === 1 ? 48 : 36} height="10" rx="5" fill="white" opacity={i === 1 ? "0.22" : "0.1"} />
          {i === 1 && <rect x="18" y={y - 2} width="4" height="18" rx="2" fill="url(#accentLine)" />}
        </g>
      ))}

      {/* Main area - stat cards row */}
      <rect x="120" y="70" width="118" height="72" rx="12" fill="white" opacity="0.04" stroke="url(#cardBorder)" strokeWidth="1" />
      <rect x="248" y="70" width="118" height="72" rx="12" fill="white" opacity="0.04" stroke="url(#cardBorder)" strokeWidth="1" />
      <rect x="376" y="70" width="116" height="72" rx="12" fill="url(#activeCard)" opacity="0.9" stroke="url(#activeCardBorder)" strokeWidth="1" />

      {/* Card 1 content */}
      <rect x="132" y="82" width="42" height="7" rx="3.5" fill="white" opacity="0.25" />
      <rect x="132" y="96" width="66" height="14" rx="5" fill="white" opacity="0.6" />
      <rect x="132" y="118" width="38" height="7" rx="3.5" fill="#00D67F" opacity="0.7" />

      {/* Card 2 content */}
      <rect x="260" y="82" width="52" height="7" rx="3.5" fill="white" opacity="0.25" />
      <rect x="260" y="96" width="46" height="14" rx="5" fill="white" opacity="0.6" />
      <rect x="260" y="118" width="44" height="7" rx="3.5" fill="#FFB800" opacity="0.7" />

      {/* Card 3 active content */}
      <rect x="388" y="82" width="52" height="7" rx="3.5" fill="white" opacity="0.5" />
      <rect x="388" y="96" width="60" height="14" rx="5" fill="white" opacity="0.95" />
      <rect x="388" y="118" width="40" height="7" rx="3.5" fill="white" opacity="0.5" />

      {/* Chart area */}
      <rect x="120" y="154" width="248" height="130" rx="12" fill="white" opacity="0.03" stroke="url(#cardBorder)" strokeWidth="1" />
      <rect x="132" y="166" width="80" height="9" rx="4.5" fill="white" opacity="0.35" />
      {/* Mini bar chart */}
      {[8, 22, 14, 34, 18, 42, 28, 50, 36, 54].map((h, i) => (
        <rect
          key={i}
          x={134 + i * 22}
          y={250 - h}
          width="14"
          height={h}
          rx="4"
          fill={i === 9 ? "url(#barActive)" : "url(#barNormal)"}
          opacity={0.5 + i * 0.05}
        />
      ))}
      <line x1="132" y1="252" x2="356" y2="252" stroke="white" strokeOpacity="0.08" strokeWidth="1" />

      {/* Activity feed */}
      <rect x="376" y="154" width="116" height="130" rx="12" fill="white" opacity="0.03" stroke="url(#cardBorder)" strokeWidth="1" />
      <rect x="388" y="164" width="56" height="8" rx="4" fill="white" opacity="0.35" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="396" cy={186 + i * 24} r="6" fill="url(#dotGrad)" opacity={1 - i * 0.15} />
          <rect x="408" y={181 + i * 24} width={50 - i * 8} height="6" rx="3" fill="white" opacity={0.35 - i * 0.06} />
          <rect x="408" y={191 + i * 24} width={36 - i * 5} height="5" rx="2.5" fill="white" opacity={0.15 - i * 0.03} />
        </g>
      ))}

      {/* Bottom row */}
      <rect x="120" y="296" width="178" height="80" rx="12" fill="white" opacity="0.03" stroke="url(#cardBorder)" strokeWidth="1" />
      <rect x="308" y="296" width="184" height="80" rx="12" fill="white" opacity="0.03" stroke="url(#cardBorder)" strokeWidth="1" />
      {/* Donut chart stub */}
      <circle cx="186" cy="338" r="22" stroke="url(#donutBack)" strokeWidth="10" fill="none" />
      <circle cx="186" cy="338" r="22" stroke="url(#donutFront)" strokeWidth="10" fill="none" strokeDasharray="90 48" strokeDashoffset="24" strokeLinecap="round" />
      <rect x="217" y="320" width="60" height="8" rx="4" fill="white" opacity="0.3" />
      <rect x="217" y="334" width="44" height="8" rx="4" fill="white" opacity="0.2" />
      <rect x="217" y="348" width="50" height="8" rx="4" fill="white" opacity="0.15" />
      {/* Sparkline */}
      <polyline points="320,356 338,340 356,348 374,328 392,335 410,318 428,325 446,312 464,319 480,306" stroke="url(#sparkline)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="320,356 338,340 356,348 374,328 392,335 410,318 428,325 446,312 464,319 480,306 480,376 320,376" fill="url(#sparklineFill)" opacity="0.15" />

      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="520" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="1" stopColor="#FF2060" />
        </linearGradient>
        <linearGradient id="borderGrad" x1="0" y1="0" x2="520" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" stopOpacity="0.4" /><stop offset="0.5" stopColor="#9033F5" stopOpacity="0.3" /><stop offset="1" stopColor="#FF2060" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="topBar" x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" stopOpacity="0.12" /><stop offset="1" stopColor="#9033F5" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="sidebarFill" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" stopOpacity="0.06" /><stop offset="1" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="btnGrad" x1="0" y1="0" x2="72" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="1" stopColor="#9033F5" />
        </linearGradient>
        <linearGradient id="iconGrad" x1="0" y1="0" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="1" stopColor="#9033F5" />
        </linearGradient>
        <linearGradient id="accentLine" x1="0" y1="0" x2="0" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="1" stopColor="#FF2060" />
        </linearGradient>
        <linearGradient id="cardBorder" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="white" stopOpacity="0.12" /><stop offset="1" stopColor="white" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="activeCard" x1="0" y1="0" x2="116" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="1" stopColor="#9033F5" />
        </linearGradient>
        <linearGradient id="activeCardBorder" x1="0" y1="0" x2="116" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9033F5" stopOpacity="0.8" /><stop offset="1" stopColor="#FF2060" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="barNormal" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="#4055FF" stopOpacity="0.6" /><stop offset="1" stopColor="#9033F5" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="barActive" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="#FF2060" /><stop offset="1" stopColor="#9033F5" />
        </linearGradient>
        <linearGradient id="dotGrad" x1="0" y1="0" x2="12" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="1" stopColor="#FF2060" />
        </linearGradient>
        <linearGradient id="donutBack" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="white" stopOpacity="0.08" /><stop offset="1" stopColor="white" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="donutFront" x1="164" y1="316" x2="208" y2="360" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="0.5" stopColor="#9033F5" /><stop offset="1" stopColor="#FF2060" />
        </linearGradient>
        <linearGradient id="sparkline" x1="320" y1="0" x2="480" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" /><stop offset="0.5" stopColor="#9033F5" /><stop offset="1" stopColor="#FF2060" />
        </linearGradient>
        <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop stopColor="#9033F5" stopOpacity="0.4" /><stop offset="1" stopColor="#9033F5" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ApiTerminalArt() {
  return (
    <svg viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden>
      <rect width="480" height="320" rx="16" fill="url(#termBg)" />
      <rect width="480" height="320" rx="16" stroke="url(#termBorder)" strokeWidth="1.5" />
      {/* Title bar */}
      <rect width="480" height="44" rx="16" fill="white" fillOpacity="0.04" />
      <rect y="28" width="480" height="16" fill="white" fillOpacity="0.04" />
      <circle cx="22" cy="22" r="6" fill="#FF2060" fillOpacity="0.7" />
      <circle cx="40" cy="22" r="6" fill="#FFB800" fillOpacity="0.7" />
      <circle cx="58" cy="22" r="6" fill="#00D67F" fillOpacity="0.7" />
      <rect x="180" y="15" width="120" height="14" rx="7" fill="white" fillOpacity="0.06" />
      <rect x="196" y="19" width="60" height="6" rx="3" fill="white" fillOpacity="0.2" />

      {/* Line 1 - comment */}
      <rect x="24" y="60" width="8" height="8" rx="2" fill="#9033F5" fillOpacity="0.6" />
      <rect x="36" y="62" width="200" height="6" rx="3" fill="white" fillOpacity="0.15" />

      {/* Line 2 - method */}
      <rect x="24" y="80" width="36" height="8" rx="3" fill="#4055FF" fillOpacity="0.8" />
      <rect x="66" y="82" width="14" height="6" rx="3" fill="white" fillOpacity="0.5" />
      <rect x="86" y="82" width="120" height="6" rx="3" fill="#FF2060" fillOpacity="0.7" />

      {/* Line 3 */}
      <rect x="40" y="100" width="24" height="8" rx="3" fill="#9033F5" fillOpacity="0.6" />
      <rect x="70" y="102" width="8" height="6" rx="2" fill="white" fillOpacity="0.3" />
      <rect x="84" y="102" width="80" height="6" rx="3" fill="#00D67F" fillOpacity="0.7" />

      {/* Line 4 */}
      <rect x="40" y="120" width="36" height="8" rx="3" fill="#9033F5" fillOpacity="0.6" />
      <rect x="82" y="122" width="8" height="6" rx="2" fill="white" fillOpacity="0.3" />
      <rect x="96" y="122" width="60" height="6" rx="3" fill="#FFB800" fillOpacity="0.7" />

      {/* Line 5 */}
      <rect x="40" y="140" width="48" height="8" rx="3" fill="#9033F5" fillOpacity="0.6" />
      <rect x="94" y="142" width="8" height="6" rx="2" fill="white" fillOpacity="0.3" />
      <rect x="108" y="142" width="100" height="6" rx="3" fill="#FF2060" fillOpacity="0.5" />

      {/* Divider */}
      <line x1="24" y1="168" x2="456" y2="168" stroke="white" strokeOpacity="0.06" strokeWidth="1" />

      {/* Response block */}
      <rect x="24" y="180" width="72" height="9" rx="4.5" fill="#00D67F" fillOpacity="0.8" />
      <rect x="104" y="182" width="52" height="6" rx="3" fill="white" fillOpacity="0.25" />

      {/* Response fields */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="40" y={200 + i * 22} width={44 + i * 8} height="7" rx="3.5" fill="#4055FF" fillOpacity={0.5 - i * 0.05} />
          <rect x={90 + i * 8} y={202 + i * 22} width={80 - i * 10} height="5" rx="2.5" fill="white" fillOpacity={0.3 - i * 0.04} />
        </g>
      ))}

      {/* Blinking cursor */}
      <rect x="24" y="294" width="3" height="14" rx="1.5" fill="#4055FF" fillOpacity="0.9">
        <animate attributeName="opacity" values="1;0;1" dur="1.2s" repeatCount="indefinite" />
      </rect>
      <rect x="32" y="298" width="100" height="6" rx="3" fill="white" fillOpacity="0.12" />

      <defs>
        <linearGradient id="termBg" x1="0" y1="0" x2="480" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0a0f1e" /><stop offset="1" stopColor="#0d0820" />
        </linearGradient>
        <linearGradient id="termBorder" x1="0" y1="0" x2="480" y2="320" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4055FF" stopOpacity="0.4" /><stop offset="0.5" stopColor="#9033F5" stopOpacity="0.2" /><stop offset="1" stopColor="#FF2060" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

const stats = [
  { value: "500+", label: "Travel Agencies", sub: "worldwide" },
  { value: "50K+", label: "Visas Processed", sub: "and counting" },
  { value: "99.2%", label: "Success Rate", sub: "industry leading" },
  { value: "60%", label: "Time Saved", sub: "per application" },
];

const features = [
  { icon: Brain, title: "AI Document Analysis", description: "Automatic quality checks, data extraction, and gap detection before submission." },
  { icon: Users, title: "Customer Portal", description: "Branded self-service portal with real-time status and secure document upload." },
  { icon: FileCheck, title: "Smart Checklists", description: "AI-generated, country-specific document checklists updated in real time." },
  { icon: Shield, title: "Audit-Ready", description: "Full audit trails, role-based access, and enterprise-grade data protection." },
  { icon: Zap, title: "Workflow Automation", description: "Automate follow-ups, reminders, and status transitions across your team." },
  { icon: Globe, title: "190+ Countries", description: "Live visa requirement database with embassy-level accuracy and coverage." },
];

const planCategories = [
  {
    name: "Business API",
    icon: Code2,
    badge: "Pay as you go",
    color: "from-[#9033F5] to-[#FF2060]",
    description: "Add Visa Shuttle AI into your website, CRM, booking engine, or partner portal without changing your current system.",
    plans: ["Deep Check API · $1.99/call", "Requirements API · $0.25/call", "Reseller Keys · Usage wallet"],
    cta: "Start API wallet",
    href: "/agency-register",
  },
  {
    name: "Agency CRM",
    icon: Building2,
    badge: "Best for visa teams",
    color: "from-[#4055FF] to-[#9033F5]",
    description: "Run leads, customers, proposals, documents, payments, and applications in one branded workspace.",
    plans: ["Lite · ₹1,999/mo", "Go · ₹3,999/mo", "Power · ₹7,999/mo"],
    cta: "View CRM plans",
    href: "/business/agency-crm",
    highlight: true,
  },
  {
    name: "Enterprise",
    icon: Layers3,
    badge: "Custom rollout",
    color: "from-[#FF2060] to-[#4055FF]",
    description: "For large brands, multi-branch agencies, franchises, and reseller networks that need custom controls.",
    plans: ["Custom pricing", "Dedicated support", "SLA guarantee"],
    cta: "Contact sales",
    href: "/agency-register",
  },
];

// ── Currency switcher ──────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", symbol: "$",  rate: 1,     flag: "🇺🇸" },
  { code: "GBP", symbol: "£",  rate: 0.79,  flag: "🇬🇧" },
  { code: "EUR", symbol: "€",  rate: 0.92,  flag: "🇪🇺" },
  { code: "INR", symbol: "₹",  rate: 83,    flag: "🇮🇳" },
  { code: "AED", symbol: "AED ", rate: 3.67, flag: "🇦🇪" },
] as const;
type CurrencyCode = typeof CURRENCIES[number]["code"];

function convertPrice(usdAmount: number, curr: typeof CURRENCIES[number]): string {
  const val = usdAmount * curr.rate;
  if (curr.code === "INR") return `${curr.symbol}${Math.round(val).toLocaleString("en-IN")}`;
  return `${curr.symbol}${Math.round(val)}`;
}

const pricingPlans = [
  {
    category: "Agency CRM",
    name: "Starter",
    usdPrice: 49,
    period: "/mo",
    description: "For small agencies moving away from spreadsheets.",
    features: ["50 cases/month", "2 team members", "Document checks", "Email support"],
    cta: "Get started free",
    accent: false,
  },
  {
    category: "Agency CRM",
    name: "Professional",
    usdPrice: 149,
    period: "/mo",
    description: "For growing agencies that need AI and customer portals.",
    features: ["200 cases/month", "10 team members", "AI document analysis", "Customer portal", "Priority support"],
    cta: "Start free trial",
    accent: true,
    popular: true,
  },
  {
    category: "Business API",
    name: "API",
    usdPrice: null,
    period: "",
    description: "Standalone visa intelligence APIs. Add credits, use only what you need.",
    features: ["Deep Check API", "Visa Requirements API", "Scoped API keys", "Usage wallet", "Reseller ready"],
    cta: "Start API wallet",
    accent: true,
    api: true,
  },
  {
    category: "Enterprise",
    name: "Enterprise",
    usdPrice: null,
    period: "",
    description: "For large operations, branches, custom controls, or reseller networks.",
    features: ["Unlimited cases", "Unlimited members", "Custom AI training", "Dedicated support", "SLA"],
    cta: "Contact sales",
    accent: false,
  },
];

const testimonials = [
  {
    quote: "We process 3× more applications with the same team. The AI checks alone saved us 15 hours a week.",
    author: "Sarah Chen",
    role: "Owner, Global Travel Solutions",
    initials: "SC",
  },
  {
    quote: "The AI document checker catches errors before submission. Our rejection rate dropped to near zero.",
    author: "Ahmed Hassan",
    role: "Operations Manager, Voyager Travel",
    initials: "AH",
  },
  {
    quote: "Our customers love real-time tracking. Support calls dropped 70% in the first month.",
    author: "Maria Rodriguez",
    role: "CEO, Wanderlust Agency",
    initials: "MR",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function BusinessPage() {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("USD");
  const curr = CURRENCIES.find(c => c.code === currencyCode) ?? CURRENCIES[0];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-14 md:pb-24">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-[#4055FF]/10 blur-[100px]" />
          <div className="absolute top-1/3 right-0 h-[400px] w-[400px] rounded-full bg-[#FF2060]/8 blur-[90px]" />
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[#9033F5]/7 blur-[80px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left */}
            <div>
              <FadeUp delay={0}>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-[#4055FF]" />
                  AI platform for visa agencies, enterprises & API teams
                </div>
              </FadeUp>

              <FadeUp delay={0.08}>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
                  The smarter<br />
                  <span className="gradient-text">visa business</span><br />
                  platform
                </h1>
              </FadeUp>

              <FadeUp delay={0.16}>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-8">
                  Convert inquiries into paid applications with branded portals, AI document checks, fee collection, and pay-as-you-go APIs for your own digital products.
                </p>
              </FadeUp>

              <FadeUp delay={0.22}>
                <div className="flex flex-col sm:flex-row gap-3 mb-12">
                  <Link href="/agency-register">
                    <Button size="lg" className="gap-2 h-12 px-6 text-base font-semibold bg-gradient-to-r from-[#4055FF] to-[#9033F5] hover:opacity-90 border-0">
                      Start for free
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#plans">
                    <Button size="lg" variant="outline" className="gap-2 h-12 px-6 text-base">
                      View plans
                    </Button>
                  </a>
                </div>
              </FadeUp>

              <FadeUp delay={0.28}>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <p className="text-2xl font-bold gradient-text">{s.value}</p>
                      <p className="text-xs font-medium text-foreground mt-0.5">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </FadeUp>
            </div>

            {/* Right — abstract dashboard art */}
            <FadeIn delay={0.18} className="relative lg:h-[420px]">
              <div className="relative h-[340px] lg:h-full">
                {/* Glow behind art */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#4055FF]/15 via-[#9033F5]/10 to-[#FF2060]/12 blur-2xl scale-95" />
                <div className="relative h-full drop-shadow-2xl">
                  <HeroDashboardArt />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── MODELS ── */}
      <section id="models" className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <FadeUp>
            <div className="mb-14 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">How you want to grow</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                One platform, three ways in
              </h2>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-5">
            {planCategories.map((cat, i) => (
              <FadeUp key={cat.name} delay={i * 0.1}>
                <div className={`group relative h-full rounded-2xl border bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${cat.highlight ? "border-primary/40 shadow-md shadow-primary/10" : ""}`}>
                  {cat.highlight && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060]" />
                  )}
                  {/* Gradient icon */}
                  <div className="p-6 pb-0">
                    <div className={`mb-5 h-12 w-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg`}>
                      <cat.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-xl font-semibold">{cat.name}</h3>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{cat.badge}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{cat.description}</p>
                    <ul className="space-y-2 mb-6">
                      {cat.plans.map((p) => (
                        <li key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${cat.color} flex-shrink-0`} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-6 pb-6">
                    <Link href={cat.href}>
                      <Button
                        variant={cat.highlight ? "default" : "outline"}
                        className={`w-full gap-2 ${cat.highlight ? "bg-gradient-to-r from-[#4055FF] to-[#9033F5] border-0 hover:opacity-90" : ""}`}
                      >
                        {cat.cta}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO ── */}
      <section id="features" className="py-12 md:py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-[1fr_1.6fr] gap-16 items-start">
            <FadeUp>
              <div className="lg:sticky lg:top-24">
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Platform features</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Everything a modern visa team needs
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  From first inquiry to final approval — one platform reduces mistakes, speeds up processing, and gives clients a polished experience.
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background rounded-xl border p-4">
                  <BadgeCheck className="h-4 w-4 text-[#4055FF] flex-shrink-0" />
                  Trusted by 500+ agencies in 40+ countries
                </div>
              </div>
            </FadeUp>

            {/* Bento grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <FadeUp key={f.title} delay={i * 0.07}>
                  <div className="group rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4055FF]/15 to-[#9033F5]/15 text-[#4055FF] group-hover:from-[#4055FF]/25 group-hover:to-[#9033F5]/25 transition-colors">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── API SECTION ── */}
      <section id="business-api" className="py-12 md:py-16 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Terminal art */}
            <FadeIn className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#4055FF]/10 via-transparent to-[#FF2060]/10 blur-2xl" />
              <div className="relative h-[280px] sm:h-[340px]">
                <ApiTerminalArt />
              </div>
              {/* Floating badge */}
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-3 top-6 rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold">Live endpoint</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">200 OK · 142ms</p>
              </motion.div>
              <motion.div
                animate={{ y: [4, -4, 4] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute -left-3 bottom-10 rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur"
              >
                <p className="text-[10px] text-muted-foreground font-medium">Monthly calls</p>
                <p className="text-sm font-bold gradient-text">12,480</p>
              </motion.div>
            </FadeIn>

            {/* Content */}
            <FadeUp className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Business API</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Add visa intelligence without rebuilding your stack
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Standalone API plans let you embed visa AI into your existing website, CRM, booking engine, or partner portal. Add credits, create scoped keys, and pay only for the calls you use.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  { icon: Cpu, label: "Deep Check API", desc: "Embassy-style risk scoring, document gaps, and action plans.", price: "$1.99/call" },
                  { icon: FileCheck, label: "Visa Requirements API", desc: "Structured entry requirements and checklist data.", price: "$0.25/call" },
                  { icon: KeyRound, label: "Reseller Keys", desc: "Issue scoped keys for branches or partner brands.", price: "Usage wallet" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-4 rounded-xl border bg-card p-4">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#4055FF]/15 to-[#9033F5]/15 flex items-center justify-center text-[#4055FF] flex-shrink-0">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold">{item.label}</span>
                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">{item.price}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/agency-register">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-[#4055FF] to-[#9033F5] border-0 hover:opacity-90">
                    Start API wallet
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/api-docs">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Terminal className="h-4 w-4" />
                    View API docs
                  </Button>
                </Link>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="plans" className="py-12 md:py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <FadeUp>
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Pricing</p>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
                  Simple, transparent plans
                </h2>
                <p className="text-muted-foreground max-w-lg">
                  Start with the plan that fits your model. Upgrade or add API access as you grow.
                </p>
              </div>
              {/* Currency switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-muted/60 transition-colors whitespace-nowrap">
                    <span>{curr.flag}</span>
                    <span>{curr.code}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[130px]">
                  {CURRENCIES.map((c) => (
                    <DropdownMenuItem
                      key={c.code}
                      onSelect={() => setCurrencyCode(c.code)}
                      className={`gap-2 font-medium ${currencyCode === c.code ? "text-primary" : ""}`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pricingPlans.map((plan, i) => {
              const displayPrice = plan.usdPrice != null
                ? convertPrice(plan.usdPrice, curr)
                : plan.name === "API" ? "PAYG" : "Custom";
              const showPeriod = plan.usdPrice != null && plan.period;
              return (
                <FadeUp key={plan.name} delay={i * 0.08}>
                  <div className={`relative flex flex-col h-full rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${plan.accent ? "border-primary/40 shadow-md" : ""}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#4055FF] to-[#9033F5] px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                        Most popular
                      </div>
                    )}
                    {plan.api && (
                      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-[#9033F5] via-[#FF2060] to-[#4055FF]" />
                    )}
                    {plan.accent && !plan.popular && !plan.api && (
                      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-[#4055FF] to-[#9033F5]" />
                    )}

                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{plan.category}</p>
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-5 flex-grow-0 min-h-[40px]">{plan.description}</p>

                    <div className="mb-6">
                      <span className="text-4xl font-bold tracking-tight">{displayPrice}</span>
                      {showPeriod && <span className="text-base text-muted-foreground ml-1">{plan.period}</span>}
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[#4055FF]" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link href="/agency-register" className="mt-auto">
                      <Button
                        className={`w-full ${plan.accent ? "bg-gradient-to-r from-[#4055FF] to-[#9033F5] border-0 hover:opacity-90 text-white" : ""}`}
                        variant={plan.accent ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <FadeUp>
            <div className="mb-14 text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Testimonials</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Trusted by leading agencies
              </h2>
            </div>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="group relative rounded-2xl border bg-card p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-[#4055FF] via-[#9033F5] to-[#FF2060] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed mb-6 text-sm">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#4055FF] to-[#9033F5] flex items-center justify-center text-xs font-bold text-white shadow-md">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <FadeUp>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4055FF] via-[#9033F5] to-[#FF2060] p-12 md:p-16 text-center">
              {/* Abstract geometric shapes */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-80 rounded-full bg-white/5 blur-2xl" />
                {/* Grid lines */}
                <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 114} y1="0" x2={i * 114} y2="400" stroke="white" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 100} x2="800" y2={i * 100} stroke="white" strokeWidth="0.5" />
                  ))}
                </svg>
              </div>
              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-widest text-white/70 mb-4">Get started today</p>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                  Ready to modernize your<br className="hidden md:block" /> visa operations?
                </h2>
                <p className="text-white/75 text-lg max-w-xl mx-auto mb-8">
                  Join 500+ agencies already using Visa Shuttle. Free to start, no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/agency-register">
                    <Button size="lg" className="gap-2 bg-white text-[#4055FF] hover:bg-white/90 font-semibold h-12 px-8 border-0">
                      Create free account
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href="#plans">
                    <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10 h-12 px-8 bg-transparent">
                      Compare plans
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

    </div>
  );
}
