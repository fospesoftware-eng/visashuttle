import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileText,
  Globe2,
  Info,
  Landmark,
  MapPin,
  Plane,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_DESTINATIONS,
  DOCUMENT_LABELS,
  VALID_VISAS,
  VISA_GROUPS,
  data,
  findBestConditionalRule,
  findDestination,
  getEntryConfig,
  isConditionalEVisa,
  normalizeStatus,
} from "@/lib/visa-check-engine";
import {
  GENERIC_VISA_TYPES,
  getCountryVisaConfig,
  getCountryVisaTypes,
} from "@/shared/visa-catalog";

type TravelDocVisaCheckProps = {
  surface?: "public" | "dashboard";
};

const DOCUMENT_TYPES = [
  "Ordinary passport",
  "Diplomatic passport",
  "Official passport",
  "Seaman book",
  "Refugee travel document",
];

const PASSPORT_VALIDITY = [
  "6+ months after arrival",
  "3-6 months after arrival",
  "Less than 3 months",
  "Not sure",
];

const PURPOSES = [
  "Tourism & sightseeing",
  "Business meeting",
  "Family / friends visit",
  "Study / education",
  "Employment",
  "Transit",
  "Medical treatment",
  "Conference / event",
];

const JOURNEY_COUNTRIES = Array.from(new Set(["India", "Schengen Area", ...ALL_DESTINATIONS]))
  .sort((a, b) => a.localeCompare(b));

const NATIONALITY_COUNTRIES = ["India"];

function compactDate(dateValue: string) {
  if (!dateValue) return "Not selected";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateValue));
}

function humanStatus(status: string) {
  return getEntryConfig(status).label;
}

function countrySearchFilter(items: string[], query: string) {
  const clean = query.trim().toLowerCase();
  if (!clean) return items;
  return items.filter((item) => item.toLowerCase().includes(clean));
}

function visaTypeOptions(destination: string) {
  if (!destination) return GENERIC_VISA_TYPES;
  return getCountryVisaTypes(destination);
}

function visaTypeGroups(destination: string) {
  const config = getCountryVisaConfig(destination);
  if (!config) {
    return [{ label: "Common Visa Types", types: GENERIC_VISA_TYPES }];
  }
  return Object.entries(config.categories).map(([label, value]) => ({
    label,
    types: value.types,
  }));
}

function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CountrySelect({
  label,
  value,
  onValueChange,
  placeholder,
  items,
  disabled,
  testId,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  items: string[];
  disabled?: boolean;
  testId: string;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => countrySearchFilter(items, search), [items, search]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-12 bg-background" data-testid={testId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="sticky top-0 z-10 border-b bg-popover p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="Search country..."
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="h-64">
            {filtered.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No country found</p>
            )}
          </ScrollArea>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TravelDocVisaCheck({ surface = "public" }: TravelDocVisaCheckProps) {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [nationality, setNationality] = useState("India");
  const [residence, setResidence] = useState("India");
  const [fromCountry, setFromCountry] = useState("India");
  const [toCountry, setToCountry] = useState("");
  const [transferCountry, setTransferCountry] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [visaType, setVisaType] = useState("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [passportValidity, setPassportValidity] = useState(PASSPORT_VALIDITY[0]);
  const [departureDate, setDepartureDate] = useState("");
  const [selectedVisas, setSelectedVisas] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Americas & Western": true,
    Europe: true,
    "Asia-Pacific": false,
    "GCC / Middle East": false,
    Other: false,
  });

  const destinationVisaTypes = useMemo(() => visaTypeOptions(toCountry), [toCountry]);
  const destinationVisaGroups = useMemo(() => visaTypeGroups(toCountry), [toCountry]);

  const record = checked ? findDestination(toCountry) : null;
  const conditionalRule = record ? findBestConditionalRule(record, selectedVisas) : null;
  const effectiveStatus = conditionalRule?.rule_status ?? record?.base_entry.status ?? "";
  const cfg = effectiveStatus ? getEntryConfig(effectiveStatus) : null;
  const baseCfg = record ? getEntryConfig(record.base_entry.status) : null;
  const normalEffective = normalizeStatus(effectiveStatus);
  const normalBase = record ? normalizeStatus(record.base_entry.status) : "";
  const isConditional = !!conditionalRule;
  const effectiveMaxStay = isConditional
    ? conditionalRule!.max_stay_days
    : record?.base_entry.max_stay_days ?? null;
  const baseMaxStay = record?.base_entry.max_stay_days ?? null;
  const availableConditionals = record?.conditional_entry_rules ?? [];
  const allEligibleHeld = [...new Set(availableConditionals.flatMap((rule) => rule.eligible_if_holds))];
  const statusUpgrade = isConditional && normalBase !== normalEffective;
  const stayUpgrade = isConditional && (effectiveMaxStay ?? 0) > (baseMaxStay ?? 0);
  const documents = (record?.common_documents ?? []).map(
    (doc) => DOCUMENT_LABELS[doc] ?? doc.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
  );
  const uniqueSources = record?.source_refs
    ? record.source_refs.filter(
        (source, index, arr) =>
          arr.findIndex((candidate) => candidate.url === source.url || candidate.source_name === source.source_name) === index,
      )
    : [];

  const canCheck = Boolean(nationality && fromCountry && toCountry && visaType && purpose);
  const isIndiaOnlyWarning = nationality !== "India";

  function handleDestinationChange(value: string) {
    setToCountry(value);
    setChecked(false);
    const nextTypes = visaTypeOptions(value);
    if (!nextTypes.includes(visaType)) {
      setVisaType(nextTypes[0] ?? "");
    }
  }

  function toggleVisa(id: string) {
    setSelectedVisas((previous) =>
      previous.includes(id) ? previous.filter((visa) => visa !== id) : [...previous, id],
    );
    setChecked(false);
  }

  function toggleGroup(group: string) {
    setOpenGroups((previous) => ({ ...previous, [group]: !previous[group] }));
  }

  const shellClass = surface === "dashboard"
    ? "space-y-6"
    : "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8";

  return (
    <div className={shellClass}>
      <div className={surface === "dashboard" ? "space-y-6" : "space-y-8"}>
        {surface === "public" && (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="space-y-4">
              <Badge className="w-fit border-[#4055FF]/20 bg-[#4055FF]/10 text-[#4055FF] hover:bg-[#4055FF]/10">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Advanced Visa Requirement Checker
              </Badge>
              <div className="max-w-2xl space-y-3">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                  Check travel documents before the airport queue.
                </h1>
                <p className="text-base leading-7 text-muted-foreground sm:text-lg">
                  A TravelDoc-style flow for passport, departure, destination, transfer point, visa type, and held documents.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-3 shadow-sm">
              <StatPill icon={Globe2} label="Destinations" value={`${ALL_DESTINATIONS.length}+`} />
              <StatPill icon={FileText} label="Visa Types" value={`${destinationVisaTypes.length}`} />
              <StatPill icon={ShieldCheck} label="Dataset" value={`v${(data as any).metadata?.version ?? "0.2"}`} />
            </div>
          </section>
        )}

        {surface === "dashboard" && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Visa Check</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Advanced route, passport, destination, and visa-type check for agency teams.
            </p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-0">
              <div className="border-b bg-muted/30 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Trip details</p>
                    <p className="text-xs text-muted-foreground">Select each field to calculate entry requirements.</p>
                  </div>
                  <Badge variant="secondary" className="gap-1.5">
                    <Route className="h-3.5 w-3.5" />
                    {fromCountry || "From"} <ArrowRight className="h-3 w-3" /> {toCountry || "Destination"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-6 p-4 sm:p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>My travel document is</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="h-12 bg-background" data-testid="select-document-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <CountrySelect
                    label="Nationality"
                    value={nationality}
                    onValueChange={setNationality}
                    placeholder="Select nationality"
                    items={NATIONALITY_COUNTRIES}
                    testId="select-nationality"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CountrySelect
                    label="Country of residence"
                    value={residence}
                    onValueChange={setResidence}
                    placeholder="Select residence"
                    items={JOURNEY_COUNTRIES}
                    testId="select-residence"
                  />
                  <div className="space-y-2">
                    <Label>Passport validity</Label>
                    <Select value={passportValidity} onValueChange={setPassportValidity}>
                      <SelectTrigger className="h-12 bg-background" data-testid="select-passport-validity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PASSPORT_VALIDITY.map((validity) => (
                          <SelectItem key={validity} value={validity}>{validity}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <CountrySelect
                    label="I'm leaving from"
                    value={fromCountry}
                    onValueChange={(value) => { setFromCountry(value); setChecked(false); }}
                    placeholder="Select departure country"
                    items={JOURNEY_COUNTRIES}
                    testId="select-from-country"
                  />
                  <CountrySelect
                    label="I'm going to"
                    value={toCountry}
                    onValueChange={handleDestinationChange}
                    placeholder="Select destination country"
                    items={ALL_DESTINATIONS}
                    testId="select-to-country"
                  />
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => setShowTransfer((open) => !open)}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Plane className="h-4 w-4 text-[#4055FF]" />
                      Add a connecting / transfer point
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showTransfer ? "rotate-180" : ""}`} />
                  </button>
                  {showTransfer && (
                    <div className="mt-3">
                      <CountrySelect
                        label="Transfer country"
                        value={transferCountry}
                        onValueChange={(value) => { setTransferCountry(value); setChecked(false); }}
                        placeholder="Select transfer country"
                        items={JOURNEY_COUNTRIES}
                        testId="select-transfer-country"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Visa / permit type</Label>
                    <Select value={visaType} onValueChange={(value) => { setVisaType(value); setChecked(false); }} disabled={!toCountry}>
                      <SelectTrigger className="h-12 bg-background" data-testid="select-visa-type">
                        <SelectValue placeholder={toCountry ? "Select visa type" : "Select destination first"} />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="max-h-72">
                          {destinationVisaGroups.map((group) => (
                            <div key={group.label}>
                              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {group.label}
                              </p>
                              {group.types.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </div>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Purpose of travel</Label>
                    <Select value={purpose} onValueChange={(value) => { setPurpose(value); setChecked(false); }}>
                      <SelectTrigger className="h-12 bg-background" data-testid="select-purpose">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PURPOSES.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <Label>Departure date</Label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(event) => { setDepartureDate(event.target.value); setChecked(false); }}
                      className="h-12 bg-background"
                      data-testid="input-departure-date"
                    />
                  </div>
                  <Button
                    className="h-12 min-w-44 border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] px-6 text-white hover:opacity-95"
                    disabled={!canCheck || isIndiaOnlyWarning}
                    onClick={() => setChecked(true)}
                    data-testid="button-check-visa"
                  >
                    Check requirements
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>

                {isIndiaOnlyWarning && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    Visa Shuttle currently validates requirements for Indian ordinary passport holders.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-border/80 shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div>
                  <p className="text-sm font-semibold">Documents / visas already held</p>
                  <p className="mt-1 text-xs text-muted-foreground">Optional. Some countries unlock easier entry if you hold a qualifying visa.</p>
                </div>
                <div className="divide-y overflow-hidden rounded-lg border">
                  {VISA_GROUPS.map((group) => {
                    const groupVisas = VALID_VISAS.filter((visa) => visa.group === group);
                    const selectedCount = groupVisas.filter((visa) => selectedVisas.includes(visa.id)).length;
                    return (
                      <Collapsible key={group} open={openGroups[group]} onOpenChange={() => toggleGroup(group)}>
                        <CollapsibleTrigger className="flex w-full items-center justify-between bg-muted/30 px-3 py-2.5 text-left hover:bg-muted/50">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {group}
                            {selectedCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{selectedCount}</Badge>}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openGroups[group] ? "rotate-180" : ""}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 p-3">
                            {groupVisas.map((visa) => (
                              <label key={visa.id} className="flex cursor-pointer items-start gap-2 text-sm leading-tight text-foreground/80">
                                <Checkbox
                                  checked={selectedVisas.includes(visa.id)}
                                  onCheckedChange={() => toggleVisa(visa.id)}
                                  data-testid={`checkbox-held-visa-${visa.id}`}
                                />
                                <span>{visa.label}</span>
                              </label>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#4055FF]/15 bg-[#4055FF]/[0.03]">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <CircleHelp className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#4055FF]" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">What this checks</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Passport nationality, route, destination, visa type, transfer point, maximum stay, documents, conditional visa-free/eVisa options, and source confidence.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {checked && record && cfg && baseCfg && (
          <Card className={`overflow-hidden border-2 ${cfg.border} ${cfg.bg}`}>
            <CardContent className="p-0">
              <div className="grid gap-4 border-b bg-background/70 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {fromCountry}
                      {transferCountry && showTransfer ? ` via ${transferCountry}` : ""}
                      <ArrowRight className="h-3 w-3" />
                      {record.destination}
                    </Badge>
                    <Badge variant="outline">{documentType}</Badge>
                    <Badge variant="outline">{visaType}</Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">India passport holders travelling to {record.destination}</h2>
                  <p className="text-sm text-muted-foreground">
                    Purpose: {purpose} · Residence: {residence} · Departure: {compactDate(departureDate)}
                  </p>
                </div>
                <div className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {normalEffective === "visa_free" && <CheckCircle2 className="h-5 w-5" />}
                  {normalEffective === "visa_on_arrival" && <Plane className="h-5 w-5" />}
                  {normalEffective === "e_visa" && <Zap className="h-5 w-5" />}
                  {normalEffective === "visa_required" && <XCircle className="h-5 w-5" />}
                  {cfg.label}
                </div>
              </div>

              <div className="grid gap-5 p-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatPill icon={Timer} label="Maximum stay" value={effectiveMaxStay ? `${effectiveMaxStay} days` : "Check embassy"} />
                    <StatPill icon={CalendarDays} label="Passport validity" value={passportValidity} />
                    <StatPill icon={Landmark} label="Base requirement" value={humanStatus(record.base_entry.status)} />
                    <StatPill icon={BadgeCheck} label="Confidence" value={record.confidence === "high" ? "High" : "Verify"} />
                  </div>

                  {(statusUpgrade || stayUpgrade) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-start gap-2">
                        <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Better entry unlocked</p>
                          <p className="mt-1 text-xs leading-5 text-amber-700">
                            Your selected held document changes the standard requirement from {baseCfg.label} to {cfg.label}
                            {stayUpgrade ? ` and may allow ${effectiveMaxStay} days of stay` : ""}.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isConditional && isConditionalEVisa(record.base_entry.status) && availableConditionals.length > 0 && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                      <p className="text-sm font-semibold text-purple-800">e-Visa may be available with qualifying documents</p>
                      <p className="mt-1 text-xs leading-5 text-purple-700">
                        Select any valid third-country visa or residence permit you hold to check conditional eVisa eligibility.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entry conditions</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/80">
                      {isConditional ? conditionalRule!.conditions : record.base_entry.notes}
                    </p>
                  </div>

                  {documents.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        Typical documents
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {documents.map((document) => (
                          <span key={document} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-foreground/75">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            {document}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isConditional && !isConditionalEVisa(record.base_entry.status) && availableConditionals.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-blue-800">Conditional entry may be available</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {allEligibleHeld.map((visa) => (
                              <span key={visa} className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                                {visa}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border bg-background/80 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                      <p className="text-xs leading-5 text-muted-foreground">
                        Visa rules change frequently. Always verify with the destination embassy, consulate, airline, or immigration authority before travel.
                      </p>
                    </div>
                  </div>

                  {uniqueSources.length > 0 && (
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      <p className="font-semibold uppercase tracking-wide text-foreground/50">Sources</p>
                      {uniqueSources.map((source, index) => (
                        <p key={`${source.source_name}-${index}`}>
                          {source.url ? (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {source.source_name}
                            </a>
                          ) : source.source_name}
                          {source.last_updated ? ` · ${source.last_updated}` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {checked && !record && toCountry && (
          <Card>
            <CardContent className="py-10 text-center">
              <XCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No rule data found for <strong>{toCountry}</strong>. Please verify requirements with the destination embassy.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
