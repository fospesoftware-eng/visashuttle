import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, CheckCircle, Sparkles, Globe, Shield, Zap, Phone, ArrowLeft, RotateCcw, ChevronDown, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

// ── Country Data ─────────────────────────────────────────────────────────────
interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { code: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { code: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", dial: "+420", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", dial: "+36", flag: "🇭🇺" },
  { code: "RO", name: "Romania", dial: "+40", flag: "🇷🇴" },
  { code: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { code: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
  { code: "RU", name: "Russia", dial: "+7", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", dial: "+380", flag: "🇺🇦" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "🇵🇭" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia", dial: "+62", flag: "🇮🇩" },
  { code: "TH", name: "Thailand", dial: "+66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", dial: "+84", flag: "🇻🇳" },
  { code: "HK", name: "Hong Kong", dial: "+852", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", dial: "+886", flag: "🇹🇼" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", dial: "+968", flag: "🇴🇲" },
  { code: "EG", name: "Egypt", dial: "+20", flag: "🇪🇬" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dial: "+254", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { code: "ET", name: "Ethiopia", dial: "+251", flag: "🇪🇹" },
  { code: "TZ", name: "Tanzania", dial: "+255", flag: "🇹🇿" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "PE", name: "Peru", dial: "+51", flag: "🇵🇪" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿" },
  { code: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { code: "IL", name: "Israel", dial: "+972", flag: "🇮🇱" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { code: "MA", name: "Morocco", dial: "+212", flag: "🇲🇦" },
];

// Timezone → ISO country code mapping
const TIMEZONE_COUNTRY: Record<string, string> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "Europe/London": "GB",
  "Asia/Dubai": "AE",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Asia/Singapore": "SG",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Europe/Amsterdam": "NL",
  "Europe/Lisbon": "PT",
  "Europe/Brussels": "BE",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Athens": "GR",
  "Europe/Istanbul": "TR",
  "Europe/Moscow": "RU",
  "Europe/Kiev": "UA",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  "Asia/Shanghai": "CN",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Manila": "PH",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Jakarta": "ID",
  "Asia/Bangkok": "TH",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Taipei": "TW",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "Africa/Accra": "GH",
  "Africa/Addis_Ababa": "ET",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Buenos_Aires": "AR",
  "America/Bogota": "CO",
  "America/Santiago": "CL",
  "America/Lima": "PE",
  "Pacific/Auckland": "NZ",
  "Europe/Dublin": "IE",
  "Asia/Jerusalem": "IL",
  "Africa/Casablanca": "MA",
};

function detectCountry(): Country {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const code = TIMEZONE_COUNTRY[tz];
  if (code) {
    const found = COUNTRIES.find(c => c.code === code);
    if (found) return found;
  }
  return COUNTRIES[0]; // Default India
}

// ── Country Selector Component ────────────────────────────────────────────────
function CountrySelector({ selected, onSelect }: { selected: Country; onSelect: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  // Deduplicate by dial+flag for display
  const seen = new Set<string>();
  const unique = filtered.filter(c => {
    const key = `${c.code}-${c.dial}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-1.5 h-10 px-3 rounded-l-md border border-r-0 bg-muted hover:bg-muted/80 transition-colors text-sm font-medium min-w-[90px] border-input"
        onClick={() => { setOpen(o => !o); setSearch(""); }}
        data-testid="button-country-selector"
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="text-muted-foreground">{selected.dial}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 rounded-xl border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4055FF]"
                data-testid="input-country-search"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-52">
            {unique.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No countries found</p>
            ) : (
              unique.map(c => (
                <button
                  key={c.code}
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${selected.code === c.code ? "bg-accent/50" : ""}`}
                  onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                  data-testid={`option-country-${c.code}`}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">{c.dial}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type Step = "info" | "otp";

export default function JoinPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>("info");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [country, setCountry] = useState<Country>(() => detectCountry());
  const [ipDetecting, setIpDetecting] = useState(true);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(data => {
        if (data?.country_code) {
          const found = COUNTRIES.find(c => c.code === data.country_code);
          if (found) setCountry(found);
        }
      })
      .catch(() => {})
      .finally(() => setIpDetecting(false));
  }, []);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    localPhone: "",
    password: "",
  });
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function getFullPhone() {
    const local = form.localPhone.replace(/\D/g, "");
    return `${country.dial}${local}`;
  }

  function startResendCountdown() {
    setResendCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function validateInfo() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    const localDigits = form.localPhone.replace(/\D/g, "");
    if (!localDigits) e.phone = "Phone number is required";
    else if (localDigits.length < 5) e.phone = "Enter a valid phone number";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "At least 8 characters required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSendOtp() {
    if (!validateInfo()) return;
    setIsLoading(true);
    const phone = getFullPhone();
    try {
      await apiRequest("POST", "/api/b2c/otp/send", { phone, email: form.email });
      setStep("otp");
      startResendCountdown();
      toast({ title: "Code sent!", description: `A 4-digit code was sent to ${phone}` });
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setIsLoading(true);
    const phone = getFullPhone();
    try {
      await apiRequest("POST", "/api/b2c/otp/send", { phone, email: form.email });
      setOtp(["", "", "", ""]);
      startResendCountdown();
      otpRefs.current[0]?.focus();
      toast({ title: "Code resent", description: "A new code was sent to your phone" });
    } catch (err: any) {
      toast({ title: "Failed to resend", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const next = [...otp];
    pasted.split("").forEach((char, i) => { next[i] = char; });
    setOtp(next);
    const lastFilled = Math.min(pasted.length, 3);
    otpRefs.current[lastFilled]?.focus();
  }

  async function handleVerifyAndRegister() {
    const code = otp.join("");
    if (code.length < 4) {
      toast({ title: "Enter the full code", description: "Please enter all 4 digits", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const phone = getFullPhone();
    try {
      await apiRequest("POST", "/api/b2c/otp/verify", { phone, otp: code });
      await apiRequest("POST", "/api/b2c/auth/register", {
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/b2c/auth/me"] });
      setLocation("/account");
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message || "Invalid or expired code", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const features = [
    { icon: Sparkles, text: "1 free AI visa check — no credit card needed" },
    { icon: Globe, text: "Covers 100+ nationalities and destination countries" },
    { icon: Shield, text: "Secure, private — your data is never shared" },
    { icon: Zap, text: "Results in seconds with actionable next steps" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col text-white p-10 xl:p-14 justify-between flex-shrink-0"
        style={{ background: "linear-gradient(160deg,#4055FF 0%,#9033F5 50%,#FF2060 100%)" }}
      >
        <Logo size="lg" showText variant="white" />
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Free to get started
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight">
            Know Your Visa Chances Before You Apply
          </h1>
          <p className="text-white/80 text-lg mb-10 leading-relaxed">
            Get a free AI-powered assessment of your visa approval probability in under 60 seconds.
          </p>
          <div className="space-y-5">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/60 text-sm">© {new Date().getFullYear()} Visa Shuttle. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-6 border-b lg:border-none">
          <div className="lg:hidden">
            <Logo size="md" />
          </div>
          <div className="hidden lg:block" />
          <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Already have an account? <span className="text-[#4055FF] font-medium">Sign in</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">

            {/* ── Step 1: Account Info ──────────────────────────────────── */}
            {step === "info" && (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1">Create your free account</h2>
                  <p className="text-muted-foreground">Get your first visa check free — no credit card needed</p>
                </div>

                <form onSubmit={e => { e.preventDefault(); handleSendOtp(); }} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      value={form.fullName}
                      onChange={e => { setForm(f => ({ ...f, fullName: e.target.value })); setErrors(er => ({ ...er, fullName: "" })); }}
                      className={errors.fullName ? "border-red-400" : ""}
                      data-testid="input-name"
                    />
                    {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: "" })); }}
                      className={errors.email ? "border-red-400" : ""}
                      data-testid="input-email"
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="localPhone">Phone Number</Label>
                      {ipDetecting && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 animate-pulse">
                          <MapPin className="w-3 h-3" />
                          Detecting location…
                        </span>
                      )}
                    </div>
                    <div className={`flex rounded-md ${errors.phone ? "ring-1 ring-red-400" : ""}`}>
                      <CountrySelector selected={country} onSelect={setCountry} />
                      <Input
                        id="localPhone"
                        type="tel"
                        placeholder="9876543210"
                        value={form.localPhone}
                        onChange={e => { setForm(f => ({ ...f, localPhone: e.target.value })); setErrors(er => ({ ...er, phone: "" })); }}
                        className="rounded-l-none border-l-0 focus-visible:ring-offset-0"
                        data-testid="input-phone"
                      />
                    </div>
                    {errors.phone
                      ? <p className="text-xs text-red-500">{errors.phone}</p>
                      : <p className="text-xs text-muted-foreground">We'll send a 4-digit verification code to this number</p>
                    }
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={form.password}
                        onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: "" })); }}
                        className={`pr-10 ${errors.password ? "border-red-400" : ""}`}
                        data-testid="input-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(s => !s)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold border-0 text-white hover:opacity-90 mt-2"
                    style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}
                    disabled={isLoading}
                    data-testid="button-send-otp"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending code...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Send Verification Code
                      </span>
                    )}
                  </Button>
                </form>

                <p className="text-xs text-center text-muted-foreground mt-5">
                  By signing up, you agree to our{" "}
                  <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                </p>

                <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                  <p className="text-sm text-center text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">Free plan includes:</span> 1 AI-powered visa check with full breakdown
                  </p>
                </div>
              </>
            )}

            {/* ── Step 2: OTP Verification ──────────────────────────────── */}
            {step === "otp" && (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                  onClick={() => { setStep("info"); setOtp(["", "", "", ""]); }}
                  data-testid="button-back-to-info"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="mb-8">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#4055FF20,#FF206020)" }}>
                    <Phone className="w-6 h-6 text-[#4055FF]" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Verify your phone</h2>
                  <p className="text-muted-foreground">
                    We sent a 4-digit code to{" "}
                    <span className="font-medium text-foreground">{getFullPhone()}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Enter verification code</Label>
                    <div className="flex gap-3 justify-center" data-testid="otp-input-group">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(i, e)}
                          onPaste={i === 0 ? handleOtpPaste : undefined}
                          className="w-16 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-background transition-all focus:outline-none focus:border-[#4055FF]"
                          style={{ borderColor: digit ? "#4055FF" : undefined }}
                          data-testid={`input-otp-${i}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">Tip: you can paste the full code at once</p>
                  </div>

                  <Button
                    className="w-full h-11 text-base font-semibold border-0 text-white hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}
                    disabled={isLoading || otp.join("").length < 4}
                    onClick={handleVerifyAndRegister}
                    data-testid="button-verify-create"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Verify &amp; Create Account
                      </span>
                    )}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Didn't receive the code?</p>
                    {resendCountdown > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Resend in <span className="font-medium text-foreground tabular-nums">{resendCountdown}s</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-[#4055FF] font-medium hover:underline flex items-center gap-1.5 mx-auto disabled:opacity-50"
                        onClick={handleResend}
                        disabled={isLoading}
                        data-testid="button-resend-otp"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
