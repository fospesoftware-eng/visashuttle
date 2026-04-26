import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe, Plane, CheckCircle2, XCircle, Clock, Zap,
  AlertTriangle, Info, ChevronDown, Search
} from "lucide-react";
import visaRulesData from "@/data/visa-rules.json";
import { Input } from "@/components/ui/input";

interface VisaRecord {
  origin_country: string;
  passport_type: string;
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
  requires_prior_use_of_third_country_visa: boolean;
  notes: string;
  source: string;
}

const data = visaRulesData as {
  records: VisaRecord[];
};

const ALL_DESTINATIONS = data.records
  .map((r) => r.destination_country)
  .sort((a, b) => a.localeCompare(b));

const VALID_VISAS: { id: string; label: string; keywords: string[] }[] = [
  { id: "us_b1b2",     label: "USA B1/B2 Visa",            keywords: ["US visa", "US long-term multiple-entry visa", "US visa/residence permit", "US entry eligibility"] },
  { id: "us_green",    label: "USA Green Card",             keywords: ["US Green Card", "US Green Card", "US visa/residence permit"] },
  { id: "uk_visa",     label: "UK Visit/Tourist Visa",      keywords: ["UK visa", "UK long-term multiple-entry visa", "UK visa/residence permit"] },
  { id: "uk_rp",       label: "UK Residence Permit",        keywords: ["UK visa/residence permit", "UK residence permit"] },
  { id: "schengen",    label: "Schengen Visa",              keywords: ["Schengen visa", "EU/Schengen visa", "Schengen visa/residence permit", "EU/Schengen multiple-entry visa", "EU/Schengen visa or residence permit"] },
  { id: "schengen_rp", label: "Schengen Residence Permit",  keywords: ["EU/Schengen visa or residence permit", "Schengen visa/residence permit", "EU/Schengen visa/residence permit"] },
  { id: "uae_visa",    label: "UAE Visa",                   keywords: ["UAE visa"] },
  { id: "uae_rp",      label: "UAE Residence Permit",       keywords: ["UAE visa", "GCC residence permit"] },
  { id: "canada",      label: "Canada Visa",                keywords: ["Canada visa", "Canada visa/residence permit", "EU entry eligibility"] },
  { id: "canada_rp",   label: "Canada Residence Permit",    keywords: ["Canada visa/residence permit"] },
  { id: "australia",   label: "Australia Visa",             keywords: ["Australia visa", "Australia visa/residence permit"] },
  { id: "australia_rp",label: "Australia Residence Permit", keywords: ["Australia visa/residence permit"] },
  { id: "japan",       label: "Japan Visa",                 keywords: ["Japan visa", "Japan visa/residence permit"] },
  { id: "south_korea", label: "South Korea Visa",           keywords: ["South Korea visa", "South Korea visa/residence permit"] },
  { id: "singapore",   label: "Singapore Visa",             keywords: ["Singapore visa", "Singapore visa/residence permit"] },
  { id: "nz",          label: "New Zealand Visa",           keywords: ["New Zealand visa", "New Zealand visa/residence permit"] },
  { id: "gcc_rp",      label: "GCC Residence Permit",       keywords: ["GCC residence permit", "GCC nationality/visa", "GCC visa"] },
  { id: "ksa",         label: "Saudi Arabia (KSA) Visa",   keywords: ["KSA visa"] },
  { id: "russia",      label: "Russia Visa",                keywords: ["Russia visa"] },
  { id: "ireland",     label: "Ireland Visa / Permit",      keywords: ["Ireland visa/residence permit"] },
];

type EntryType = "visa_free" | "visa_on_arrival" | "e_visa" | "eta" | "visa_required" | string;

const ENTRY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  visa_free:      { label: "Visa Free",       color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" /> },
  visa_on_arrival:{ label: "Visa on Arrival", color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",       icon: <Plane className="w-5 h-5 text-blue-600" /> },
  e_visa:         { label: "e-Visa",          color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",   icon: <Zap className="w-5 h-5 text-purple-600" /> },
  eta:            { label: "ETA",             color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",   icon: <Zap className="w-5 h-5 text-purple-600" /> },
  visa_required:  { label: "Visa Required",   color: "text-red-700",     bg: "bg-red-50 border-red-200",         icon: <XCircle className="w-5 h-5 text-red-600" /> },
};

function getEntryConfig(type: string) {
  if (type.includes("visa_free")) return ENTRY_CONFIG.visa_free;
  if (type.includes("visa_on_arrival") || type === "visa_on_arrival/e_visa") return ENTRY_CONFIG.visa_on_arrival;
  if (type.includes("e_visa") || type.includes("eta")) return ENTRY_CONFIG.e_visa;
  if (type.includes("visa_required")) return ENTRY_CONFIG.visa_required;
  return ENTRY_CONFIG[type] ?? { label: type, color: "text-slate-700", bg: "bg-slate-50 border-slate-200", icon: <Info className="w-5 h-5 text-slate-500" /> };
}

function holdsMatchesEligible(eligible: string, selectedKeywords: string[]): boolean {
  if (!eligible) return false;
  const lowerEligible = eligible.toLowerCase();
  return selectedKeywords.some((kw) => lowerEligible.includes(kw.toLowerCase()));
}

export default function VisaCheckPage() {
  const [nationality] = useState("India");
  const [destination, setDestination] = useState<string>("");
  const [selectedVisas, setSelectedVisas] = useState<string[]>([]);
  const [result, setResult] = useState<{ record: VisaRecord; effective_entry_type: string; is_conditional: boolean } | null>(null);
  const [searched, setSearched] = useState(false);
  const [destSearch, setDestSearch] = useState("");

  const filteredDestinations = useMemo(
    () => ALL_DESTINATIONS.filter((d) => d.toLowerCase().includes(destSearch.toLowerCase())),
    [destSearch]
  );

  const selectedKeywords = useMemo(
    () => VALID_VISAS.filter((v) => selectedVisas.includes(v.id)).flatMap((v) => v.keywords),
    [selectedVisas]
  );

  const toggleVisa = (id: string) => {
    setSelectedVisas((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleCheck = () => {
    if (!destination) return;
    const record = data.records.find(
      (r) => r.destination_country.toLowerCase() === destination.toLowerCase()
    );
    if (!record) return;

    let effective_entry_type = record.base_entry_type;
    let is_conditional = false;

    if (record.conditional_unlock_available && selectedKeywords.length > 0) {
      const matches = holdsMatchesEligible(record.eligible_if_holds, selectedKeywords);
      if (matches && record.conditional_entry_type) {
        effective_entry_type = record.conditional_entry_type;
        is_conditional = true;
      }
    }

    setResult({ record, effective_entry_type, is_conditional });
    setSearched(true);
  };

  const cfg = result ? getEntryConfig(result.effective_entry_type) : null;
  const baseCfg = result ? getEntryConfig(result.record.base_entry_type) : null;

  return (
    <DashboardLayout type="agency">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visa Check</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Check visa requirements for Indian passport holders based on destination and existing visas held.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Travel Details
            </CardTitle>
            <CardDescription>
              Select the destination country and any valid visas you currently hold to get accurate entry requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nationality */}
            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality</Label>
              <Select value={nationality} disabled>
                <SelectTrigger id="nationality" data-testid="select-nationality" className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="India">🇮🇳 India</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Currently supports Indian ordinary passport holders only.</p>
            </div>

            {/* Destination / Residence */}
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destination Country (Residence)</Label>
              <Select value={destination} onValueChange={(v) => { setDestination(v); setSearched(false); setResult(null); }}>
                <SelectTrigger id="destination" data-testid="select-destination">
                  <SelectValue placeholder="Select a country…" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2 pt-1 sticky top-0 bg-popover">
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
                      <SelectItem key={country} value={country} data-testid={`option-country-${country}`}>
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
              <Label>Valid Visas / Permits You Hold <span className="text-muted-foreground font-normal">(optional — for conditional entry unlock)</span></Label>
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
                      className="text-sm leading-none cursor-pointer text-foreground/80 hover:text-foreground transition-colors"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
              {selectedVisas.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedVisas.length} visa{selectedVisas.length > 1 ? "s" : ""} selected — may unlock easier entry for some destinations.
                </p>
              )}
            </div>

            <Button
              onClick={handleCheck}
              disabled={!destination}
              className="w-full"
              data-testid="button-check-visa"
            >
              <Globe className="w-4 h-4 mr-2" />
              Check Visa Requirements
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {searched && result && cfg && baseCfg && (
          <Card className={`border-2 ${cfg.bg}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-lg">
                    {nationality} → {result.record.destination_country}
                  </CardTitle>
                  <CardDescription className="mt-0.5">{result.record.purpose_scope}</CardDescription>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm ${cfg.bg} ${cfg.color}`}>
                  {cfg.icon}
                  {cfg.label}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Conditional unlock badge */}
              {result.is_conditional && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Conditional Entry Unlocked</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Because of the visa(s) you hold, you qualify for a better entry option than the base requirement.
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-amber-600">Base:</span>
                      <Badge variant="outline" className={`text-xs ${baseCfg.color} border-current`}>{baseCfg.label}</Badge>
                      <span className="text-xs text-amber-600">→ Upgraded to:</span>
                      <Badge variant="outline" className={`text-xs ${cfg.color} border-current`}>{cfg.label}</Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Stay duration */}
              {(result.record.max_stay_days || result.record.conditional_max_stay_days) && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-background border">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Maximum Stay</p>
                    <p className="text-sm font-semibold">
                      {result.is_conditional && result.record.conditional_max_stay_days
                        ? `${result.record.conditional_max_stay_days} days`
                        : result.record.max_stay_days
                        ? `${result.record.max_stay_days} days`
                        : "Check with embassy"}
                    </p>
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entry Conditions</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {result.is_conditional && result.record.conditional_conditions
                    ? result.record.conditional_conditions
                    : result.record.base_conditions}
                </p>
              </div>

              {/* Eligible if holds */}
              {result.record.conditional_unlock_available && result.record.eligible_if_holds && !result.is_conditional && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Easier Entry Available</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      If you hold any of the following, you may qualify for a simpler entry process:
                    </p>
                    <p className="text-xs text-blue-700 mt-1 font-medium">{result.record.eligible_if_holds}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{result.record.notes}</p>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Source: {result.record.source} · Data as of {(visaRulesData as any).version_date}
              </p>
            </CardContent>
          </Card>
        )}

        {searched && !result && (
          <Card>
            <CardContent className="py-8 text-center">
              <XCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No data found for the selected destination.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
