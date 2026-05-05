import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
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
  mode?: "form" | "result";
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

const NATIONALITY_COUNTRIES = JOURNEY_COUNTRIES;

const TRAVELDOC_DATA_NOTE =
  "Live worldwide entry requirements require a licensed TravelDoc/IATA Timatic provider feed. This screen is ready for that data source and uses Visa Shuttle's verified India dataset where available.";

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

function buildRequirementChecklist(status: string, maxStay: number | null | undefined, visaType: string) {
  const normalized = normalizeStatus(status);
  const visaRequired = normalized === "visa_required";
  const onlineVisa = normalized === "e_visa";
  const arrivalVisa = normalized === "visa_on_arrival";
  const visaFree = normalized === "visa_free";

  return [
    {
      title: "Passport",
      detail: "Passport should normally be valid for 6 months after arrival and have at least 2 blank pages.",
      tone: "neutral",
    },
    {
      title: "Visa / authorization",
      detail: visaRequired
        ? `${visaType || "Correct visa type"} should be approved before travel. Airline check-in may deny boarding without proof.`
        : onlineVisa
          ? "Online authorization or eVisa should be obtained before travel where required by the destination."
          : arrivalVisa
            ? "Visa may be issued on arrival, subject to airline acceptance, fees, and border officer discretion."
            : "Visa-free entry may be available for the stated purpose and stay duration.",
      tone: visaFree ? "success" : visaRequired ? "danger" : "warning",
    },
    {
      title: "Stay limit",
      detail: maxStay ? `Maximum stay shown by current rule data: ${maxStay} days.` : "Stay duration must be verified with the destination authority.",
      tone: "neutral",
    },
    {
      title: "Proof of trip",
      detail: "Carry return/onward ticket, accommodation proof, travel purpose evidence, and sufficient funds.",
      tone: "neutral",
    },
    {
      title: "Health / insurance",
      detail: "Some destinations require travel insurance, vaccination proof, or health declarations depending on route and season.",
      tone: "neutral",
    },
  ];
}

function providerPendingChecklist(nationality: string, fromCountry: string, toCountry: string, visaType: string) {
  return [
    {
      title: "Provider data needed",
      detail: `Connect a licensed TravelDoc/IATA Timatic feed to return exact rules for ${nationality} passport holders travelling from ${fromCountry} to ${toCountry}.`,
      tone: "warning",
    },
    {
      title: "Visa / authorization",
      detail: `${visaType || "Selected visa type"} must be validated against official rules before ticketing or check-in.`,
      tone: "neutral",
    },
    {
      title: "Transit rules",
      detail: "Transit visa and airside/landside transfer rules can differ by airport, terminal, ticket type, and baggage collection.",
      tone: "neutral",
    },
    {
      title: "Document conditions",
      detail: "Passport validity, blank pages, residence permits, previous visas, and return ticket rules should be checked in the live provider response.",
      tone: "neutral",
    },
  ];
}

function checklistToneClass(tone: string) {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-border bg-background text-foreground";
}

function getInitialParam(name: string, fallback = "") {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(name) || fallback;
}

function getInitialHeldVisas() {
  const held = getInitialParam("held");
  return held ? held.split(",").filter(Boolean).map(decodeURIComponent) : [];
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

export function TravelDocVisaCheck({ surface = "public", mode = "form" }: TravelDocVisaCheckProps) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [documentType, setDocumentType] = useState(getInitialParam("doc", DOCUMENT_TYPES[0]));
  const [nationality, setNationality] = useState(getInitialParam("nat", "India"));
  const [residence, setResidence] = useState(getInitialParam("res", "India"));
  const [fromCountry, setFromCountry] = useState(getInitialParam("from", "India"));
  const [toCountry, setToCountry] = useState(getInitialParam("to"));
  const [transferCountry, setTransferCountry] = useState(getInitialParam("via"));
  const [showTransfer, setShowTransfer] = useState(Boolean(getInitialParam("via")));
  const [visaType, setVisaType] = useState(getInitialParam("visa"));
  const [purpose, setPurpose] = useState(getInitialParam("purpose", PURPOSES[0]));
  const [passportValidity, setPassportValidity] = useState(getInitialParam("validity", PASSPORT_VALIDITY[0]));
  const [departureDate, setDepartureDate] = useState(getInitialParam("date"));
  const [selectedVisas, setSelectedVisas] = useState<string[]>(getInitialHeldVisas);
  const checked = mode === "result";
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Americas & Western": true,
    Europe: true,
    "Asia-Pacific": false,
    "GCC / Middle East": false,
    Other: false,
  });

  const destinationVisaTypes = useMemo(() => visaTypeOptions(toCountry), [toCountry]);
  const destinationVisaGroups = useMemo(() => visaTypeGroups(toCountry), [toCountry]);

  const hasLocalRuleData = nationality === "India";
  const record = checked && hasLocalRuleData ? findDestination(toCountry) : null;
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

  const canCheck = Boolean(documentType && nationality && fromCountry && toCountry);
  const canGoNext = currentStep === 0
    ? Boolean(documentType && nationality)
    : currentStep === 1
      ? Boolean(fromCountry && toCountry)
      : canCheck;
  const providerDataNeeded = checked && canCheck && !hasLocalRuleData;
  const requirementChecklist = record
    ? buildRequirementChecklist(effectiveStatus, effectiveMaxStay, visaType)
    : providerDataNeeded
      ? providerPendingChecklist(nationality, fromCountry, toCountry, visaType)
      : [];

  function handleDestinationChange(value: string) {
    setToCountry(value);
    const nextTypes = visaTypeOptions(value);
    if (!nextTypes.includes(visaType)) {
      setVisaType(nextTypes[0] ?? "");
    }
  }

  function toggleVisa(id: string) {
    setSelectedVisas((previous) =>
      previous.includes(id) ? previous.filter((visa) => visa !== id) : [...previous, id],
    );
  }

  function toggleGroup(group: string) {
    setOpenGroups((previous) => ({ ...previous, [group]: !previous[group] }));
  }

  function goToResults() {
    if (!canCheck) return;
    const params = new URLSearchParams({
      doc: documentType,
      nat: nationality,
      res: residence,
      from: fromCountry,
      to: toCountry,
      visa: visaType,
      purpose,
      validity: passportValidity,
      date: departureDate,
    });
    if (showTransfer && transferCountry) params.set("via", transferCountry);
    if (selectedVisas.length) params.set("held", selectedVisas.map(encodeURIComponent).join(","));
    const base = surface === "dashboard" ? "/app/visa-check" : "/visa-check";
    setLocation(`${base}/results?${params.toString()}`);
  }

  function goBackToForm() {
    setLocation(surface === "dashboard" ? "/app/visa-check" : "/visa-check");
  }

  function nextStep() {
    if (!canGoNext) return;
    setCurrentStep((step) => Math.min(step + 1, 2));
  }

  function previousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  const shellClass = surface === "dashboard"
    ? "space-y-6"
    : "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8";

  return (
    <div className={shellClass}>
      <div className={surface === "dashboard" ? "space-y-6" : "space-y-8"}>
        {surface === "public" && mode === "form" && (
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

        {surface === "dashboard" && mode === "form" && (
          <div>
            <h1 className="text-2xl font-bold text-foreground">Visa Check</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Advanced route, passport, destination, and visa-type check for agency teams.
            </p>
          </div>
        )}

        {mode === "result" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" className="gap-2" onClick={goBackToForm}>
              <ArrowLeft className="h-4 w-4" />
              New search
            </Button>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">Travel requirement result</p>
              <p className="text-xs text-muted-foreground">{nationality} passport · {fromCountry} to {toCountry || "destination"}</p>
            </div>
          </div>
        )}

        {mode === "form" && (
        <div className="mx-auto max-w-3xl">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardContent className="p-0">
              <div className="border-b bg-gradient-to-r from-[#4055FF]/5 via-background to-[#FF2060]/5 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Check travel requirements</p>
                    <p className="text-xs text-muted-foreground">Same core flow as TravelDoc: document, nationality, route, transfer, result.</p>
                  </div>
                  <Badge variant="secondary" className="gap-1.5">
                    <Route className="h-3.5 w-3.5" />
                    {fromCountry || "From"} <ArrowRight className="h-3 w-3" /> {toCountry || "Destination"}
                  </Badge>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    { label: "Document", icon: FileText },
                    { label: "Route", icon: Plane },
                    { label: "Review", icon: ShieldCheck },
                  ].map((step, index) => {
                    const Icon = step.icon;
                    const active = currentStep === index;
                    const complete = currentStep > index;
                    return (
                      <button
                        key={step.label}
                        type="button"
                        onClick={() => setCurrentStep(index)}
                        className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition-colors ${
                          active
                            ? "border-[#4055FF] bg-[#4055FF] text-white"
                            : complete
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6 p-4 sm:p-5">
                {currentStep === 0 && (
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
                )}

                {currentStep === 2 && (
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
                )}

                {currentStep === 1 && (
                <>
                <div className="grid gap-4 md:grid-cols-2">
                  <CountrySelect
                    label="I'm leaving from"
                    value={fromCountry}
                    onValueChange={(value) => { setFromCountry(value); }}
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
                        onValueChange={(value) => { setTransferCountry(value); }}
                        placeholder="Select transfer country"
                        items={JOURNEY_COUNTRIES}
                        testId="select-transfer-country"
                      />
                    </div>
                  )}
                </div>
                </>
                )}

                {currentStep === 2 && (
                <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Visa / permit type <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Select value={visaType} onValueChange={(value) => { setVisaType(value); }} disabled={!toCountry}>
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
                    <Select value={purpose} onValueChange={(value) => { setPurpose(value); }}>
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

                <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-semibold">Documents / visas already held</p>
                    <p className="mt-1 text-xs text-muted-foreground">Optional. Add qualifying documents for conditional entry checks.</p>
                  </div>
                  <div className="divide-y overflow-hidden rounded-lg border bg-background">
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
                            <div className="grid gap-2 p-3 sm:grid-cols-2">
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
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Departure date</Label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(event) => { setDepartureDate(event.target.value); }}
                      className="h-12 bg-background"
                      data-testid="input-departure-date"
                    />
                  </div>
                </div>
                </>
                )}

                {!hasLocalRuleData && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {TRAVELDOC_DATA_NOTE}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <Button variant="outline" onClick={previousStep} disabled={currentStep === 0}>
                    Back
                  </Button>
                  {currentStep < 2 ? (
                    <Button
                      className="border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] px-6 text-white hover:opacity-95"
                      disabled={!canGoNext}
                      onClick={nextStep}
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] px-6 text-white hover:opacity-95"
                      disabled={!canCheck}
                      onClick={goToResults}
                      data-testid="button-check-visa"
                    >
                      Check requirements
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border border-[#4055FF]/15 bg-[#4055FF]/[0.03] p-4">
                  <div className="flex gap-3">
                    <CircleHelp className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#4055FF]" />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Checks passport nationality, route, destination, transfer points, maximum stay, documents, conditional entry options, transit notes, and source confidence.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        )}

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
                    <Badge variant="outline">{visaType || "Visa type not selected"}</Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{nationality} passport holders travelling to {record.destination}</h2>
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

                  {requirementChecklist.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Detailed requirement checks
                      </p>
                      <div className="mt-2 grid gap-2">
                        {requirementChecklist.map((item) => (
                          <div key={item.title} className={`rounded-lg border p-3 ${checklistToneClass(item.tone)}`}>
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="mt-1 text-xs leading-5 opacity-80">{item.detail}</p>
                          </div>
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
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="mb-3 gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {fromCountry}
                    {transferCountry && showTransfer ? ` via ${transferCountry}` : ""}
                    <ArrowRight className="h-3 w-3" />
                    {toCountry}
                  </Badge>
                  <h2 className="text-xl font-bold text-foreground">Live provider data required</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {TRAVELDOC_DATA_NOTE}
                  </p>
                </div>
                <Badge className="border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 hover:bg-amber-50">
                  TravelDoc/Timatic feed not connected
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatPill icon={Globe2} label="Nationality" value={nationality} />
                <StatPill icon={FileText} label="Visa type" value={visaType || "Not selected"} />
                <StatPill icon={CalendarDays} label="Departure" value={compactDate(departureDate)} />
                <StatPill icon={Plane} label="Transfer" value={showTransfer && transferCountry ? transferCountry : "None selected"} />
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {requirementChecklist.map((item) => (
                  <div key={item.title} className={`rounded-lg border p-3 ${checklistToneClass(item.tone)}`}>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 opacity-80">{item.detail}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  To make this match TravelDoc exactly, connect an authorized TravelDoc or IATA Timatic API account. Scraping the live rules database is not reliable and may violate provider terms.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
