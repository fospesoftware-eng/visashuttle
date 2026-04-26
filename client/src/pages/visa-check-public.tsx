import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Globe, Plane, CheckCircle2, XCircle, Clock, Zap,
  AlertTriangle, Info, Search, ChevronRight, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import visaRulesData from "@/data/visa-rules.json";

interface VisaRecord {
  origin_country: string;
  destination_country: string;
  base_entry_type: string;
  max_stay_days: number | null;
  purpose_scope: string;
  base_conditions: string;
  conditional_unlock_available: boolean;
  eligible_if_holds: string;
  conditional_entry_type: string;
  conditional_max_stay_days: number | string | null;
  conditional_conditions: string;
  notes: string;
  source: string;
}

const data = visaRulesData as { records: VisaRecord[]; version_date: string };

const ALL_DESTINATIONS = data.records
  .map((r) => r.destination_country)
  .sort((a, b) => a.localeCompare(b));

const VALID_VISAS = [
  { id: "us_b1b2",      label: "USA B1/B2 Visa",             keywords: ["US visa", "US long-term multiple-entry visa", "US visa/residence permit", "US entry eligibility"] },
  { id: "us_green",     label: "USA Green Card",              keywords: ["US Green Card", "US visa/residence permit"] },
  { id: "uk_visa",      label: "UK Visit / Tourist Visa",     keywords: ["UK visa", "UK long-term multiple-entry visa", "UK visa/residence permit"] },
  { id: "uk_rp",        label: "UK Residence Permit",         keywords: ["UK visa/residence permit", "UK residence permit"] },
  { id: "schengen",     label: "Schengen Visa",               keywords: ["Schengen visa", "EU/Schengen visa", "Schengen visa/residence permit", "EU/Schengen multiple-entry visa", "EU/Schengen visa or residence permit"] },
  { id: "schengen_rp",  label: "Schengen Residence Permit",   keywords: ["EU/Schengen visa or residence permit", "Schengen visa/residence permit", "EU/Schengen visa/residence permit"] },
  { id: "uae_visa",     label: "UAE Visa",                    keywords: ["UAE visa"] },
  { id: "uae_rp",       label: "UAE Residence Permit",        keywords: ["UAE visa", "GCC residence permit"] },
  { id: "canada",       label: "Canada Visa",                 keywords: ["Canada visa", "Canada visa/residence permit", "EU entry eligibility"] },
  { id: "canada_rp",    label: "Canada Residence Permit",     keywords: ["Canada visa/residence permit"] },
  { id: "australia",    label: "Australia Visa",              keywords: ["Australia visa", "Australia visa/residence permit"] },
  { id: "australia_rp", label: "Australia Residence Permit",  keywords: ["Australia visa/residence permit"] },
  { id: "japan",        label: "Japan Visa",                  keywords: ["Japan visa", "Japan visa/residence permit"] },
  { id: "south_korea",  label: "South Korea Visa",            keywords: ["South Korea visa", "South Korea visa/residence permit"] },
  { id: "singapore",    label: "Singapore Visa",              keywords: ["Singapore visa", "Singapore visa/residence permit"] },
  { id: "nz",           label: "New Zealand Visa",            keywords: ["New Zealand visa", "New Zealand visa/residence permit"] },
  { id: "gcc_rp",       label: "GCC Residence Permit",        keywords: ["GCC residence permit", "GCC nationality/visa", "GCC visa"] },
  { id: "ksa",          label: "Saudi Arabia (KSA) Visa",     keywords: ["KSA visa"] },
  { id: "russia",       label: "Russia Visa",                 keywords: ["Russia visa"] },
  { id: "ireland",      label: "Ireland Visa / Permit",       keywords: ["Ireland visa/residence permit"] },
];

const ENTRY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  visa_free:       { label: "Visa Free",        color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" /> },
  visa_on_arrival: { label: "Visa on Arrival",  color: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200",    icon: <Plane className="w-6 h-6 text-blue-600" /> },
  e_visa:          { label: "e-Visa",           color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200",  icon: <Zap className="w-6 h-6 text-purple-600" /> },
  eta:             { label: "ETA",              color: "text-purple-700", bg: "bg-purple-50",  border: "border-purple-200",  icon: <Zap className="w-6 h-6 text-purple-600" /> },
  visa_required:   { label: "Visa Required",    color: "text-red-700",   bg: "bg-red-50",     border: "border-red-200",     icon: <XCircle className="w-6 h-6 text-red-600" /> },
};

function getEntryConfig(type: string) {
  if (type.includes("visa_free"))       return ENTRY_CONFIG.visa_free;
  if (type.includes("visa_on_arrival") || type === "visa_on_arrival/e_visa") return ENTRY_CONFIG.visa_on_arrival;
  if (type.includes("e_visa") || type.includes("eta")) return ENTRY_CONFIG.e_visa;
  if (type.includes("visa_required"))   return ENTRY_CONFIG.visa_required;
  return ENTRY_CONFIG[type] ?? { label: type, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", icon: <Info className="w-6 h-6 text-slate-500" /> };
}

function holdsMatch(eligible: string, keywords: string[]): boolean {
  if (!eligible) return false;
  const lower = eligible.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export default function VisaCheckPublicPage() {
  const [destination, setDestination] = useState("");
  const [selectedVisas, setSelectedVisas] = useState<string[]>([]);
  const [result, setResult] = useState<{ record: VisaRecord; effective_entry_type: string; is_conditional: boolean } | null>(null);
  const [checked, setChecked] = useState(false);
  const [destSearch, setDestSearch] = useState("");

  const filteredDestinations = useMemo(
    () => ALL_DESTINATIONS.filter((d) => d.toLowerCase().includes(destSearch.toLowerCase())),
    [destSearch]
  );

  const selectedKeywords = useMemo(
    () => VALID_VISAS.filter((v) => selectedVisas.includes(v.id)).flatMap((v) => v.keywords),
    [selectedVisas]
  );

  const toggleVisa = (id: string) =>
    setSelectedVisas((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);

  const handleCheck = () => {
    if (!destination) return;
    const record = data.records.find(
      (r) => r.destination_country.toLowerCase() === destination.toLowerCase()
    );
    if (!record) { setResult(null); setChecked(true); return; }

    let effective_entry_type = record.base_entry_type;
    let is_conditional = false;
    if (record.conditional_unlock_available && selectedKeywords.length > 0) {
      if (holdsMatch(record.eligible_if_holds, selectedKeywords) && record.conditional_entry_type) {
        effective_entry_type = record.conditional_entry_type;
        is_conditional = true;
      }
    }
    setResult({ record, effective_entry_type, is_conditional });
    setChecked(true);
  };

  const cfg = result ? getEntryConfig(result.effective_entry_type) : null;
  const baseCfg = result ? getEntryConfig(result.record.base_entry_type) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
            <Link href="/visa-check" className="text-sm font-medium text-foreground transition-colors">Visa Check</Link>
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/business" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">For Agencies</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/sign-in"><Button variant="ghost" size="sm" data-testid="button-signin">Sign In</Button></Link>
            <Link href="/join">
              <Button size="sm" className="border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }} data-testid="button-join">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-6 md:pt-16 md:pb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4055FF]/5 via-background to-[#FF2060]/5" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4055FF]/10 text-[#4055FF] text-sm font-medium mb-4 border border-[#4055FF]/20">
            <Globe className="w-3.5 h-3.5" />
            Free Visa Requirement Checker
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Do You Need a Visa?
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Instantly check visa requirements for Indian passport holders travelling to 200+ destinations — including conditional entry unlocks based on visas you already hold.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-2xl mx-auto px-4 pb-16 space-y-6">
        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Enter Travel Details</CardTitle>
            <CardDescription>Select where you're going and any valid visas you hold to get the most accurate result.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Nationality */}
            <div className="space-y-1.5">
              <Label>Nationality</Label>
              <Select value="India" disabled>
                <SelectTrigger className="bg-muted/50" data-testid="select-nationality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">🇮🇳 India</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Currently supports Indian ordinary passport holders only.</p>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <Label>Destination Country</Label>
              <Select
                value={destination}
                onValueChange={(v) => { setDestination(v); setChecked(false); setResult(null); }}
              >
                <SelectTrigger data-testid="select-destination">
                  <SelectValue placeholder="Select a country…" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2 pt-1 sticky top-0 bg-popover z-10">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={destSearch}
                        onChange={(e) => setDestSearch(e.target.value)}
                        placeholder="Search country…"
                        className="pl-8 h-8 text-sm"
                        data-testid="input-destination-search"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-56">
                    {filteredDestinations.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                    {filteredDestinations.length === 0 && (
                      <div className="py-4 text-center text-sm text-muted-foreground">No results</div>
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Valid Visas */}
            <div className="space-y-2">
              <Label>
                Valid Visas / Permits You Hold{" "}
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Selecting these may unlock easier entry options for some destinations.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/30">
                {VALID_VISAS.map(({ id, label }) => (
                  <div key={id} className="flex items-center gap-2">
                    <Checkbox
                      id={`visa-${id}`}
                      checked={selectedVisas.includes(id)}
                      onCheckedChange={() => toggleVisa(id)}
                      data-testid={`checkbox-visa-${id}`}
                    />
                    <label
                      htmlFor={`visa-${id}`}
                      className="text-sm cursor-pointer text-foreground/80 hover:text-foreground transition-colors leading-tight"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCheck}
              disabled={!destination}
              className="w-full text-white border-0 hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#4055FF,#7033F0)" }}
              data-testid="button-check-visa"
            >
              <Globe className="w-4 h-4 mr-2" />
              Check Visa Requirements
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {checked && result && cfg && baseCfg && (
          <Card className={`border-2 ${cfg.border} ${cfg.bg}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-xl">
                    🇮🇳 India → {result.record.destination_country}
                  </CardTitle>
                  <CardDescription className="mt-1">{result.record.purpose_scope}</CardDescription>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-base ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {cfg.icon}
                  {cfg.label}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conditional unlock */}
              {result.is_conditional && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Conditional Entry Unlocked</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Because of the visa(s) you hold, you qualify for easier entry than the standard requirement.
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-amber-600">Base requirement:</span>
                      <Badge variant="outline" className={`text-xs ${baseCfg.color} border-current`}>{baseCfg.label}</Badge>
                      <span className="text-xs text-amber-600">→ Upgraded to:</span>
                      <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>{cfg.label}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Max stay */}
              {(result.record.max_stay_days || result.record.conditional_max_stay_days) && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                  <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Maximum Stay</p>
                    <p className="text-sm font-semibold">
                      {result.is_conditional && result.record.conditional_max_stay_days
                        ? `${result.record.conditional_max_stay_days} days`
                        : result.record.max_stay_days
                        ? `${result.record.max_stay_days} days`
                        : "Check with embassy for duration"}
                    </p>
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Entry Conditions</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {result.is_conditional && result.record.conditional_conditions
                    ? result.record.conditional_conditions
                    : result.record.base_conditions}
                </p>
              </div>

              {/* Eligible if holds but not unlocked */}
              {result.record.conditional_unlock_available && result.record.eligible_if_holds && !result.is_conditional && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Easier Entry May Be Available</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      If you hold any of the following, tick the checkboxes above to unlock a simpler entry process:
                    </p>
                    <p className="text-xs text-blue-800 mt-1 font-medium">{result.record.eligible_if_holds}</p>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-background/80 border">
                <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{result.record.notes}</p>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Source: {result.record.source} · Data as of {data.version_date}
              </p>
            </CardContent>
          </Card>
        )}

        {checked && !result && (
          <Card>
            <CardContent className="py-10 text-center">
              <XCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No data found for the selected destination.</p>
            </CardContent>
          </Card>
        )}

        {/* Footer note */}
        <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-2">
          <Shield className="w-3.5 h-3.5" />
          <span>Data sourced from MEA India (Feb 2026). Always verify with the destination embassy before travel.</span>
        </div>
      </section>
    </div>
  );
}
