import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Globe, Plane, CheckCircle2, XCircle, Clock, Zap,
  AlertTriangle, Info, Search, ChevronDown, FileText, ExternalLink,
} from "lucide-react";
import {
  ALL_DESTINATIONS, VALID_VISAS, VISA_GROUPS,
  findDestination, findBestConditionalRule, getEntryConfig, normalizeStatus,
  isConditionalEVisa, DOCUMENT_LABELS, data,
} from "@/lib/visa-check-engine";

export default function VisaCheckPage() {
  const [destination, setDestination] = useState("");
  const [selectedVisas, setSelectedVisas] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [destSearch, setDestSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Americas & Western": true,
    "Europe": true,
    "Asia-Pacific": false,
    "GCC / Middle East": false,
    "Other": false,
  });

  const filteredDestinations = useMemo(
    () => ALL_DESTINATIONS.filter((d) => d.toLowerCase().includes(destSearch.toLowerCase())),
    [destSearch]
  );

  const toggleVisa = (id: string) =>
    setSelectedVisas((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );

  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const record = checked ? findDestination(destination) : null;
  const conditionalRule = record ? findBestConditionalRule(record, selectedVisas) : null;
  const effectiveStatus = conditionalRule?.rule_status ?? record?.base_entry.status ?? "";
  const cfg = effectiveStatus ? getEntryConfig(effectiveStatus) : null;
  const baseCfg = record ? getEntryConfig(record.base_entry.status) : null;
  const isConditional = !!conditionalRule;

  const effectiveMaxStay = isConditional
    ? conditionalRule!.max_stay_days
    : record?.base_entry.max_stay_days ?? null;
  const baseMaxStay = record?.base_entry.max_stay_days ?? null;

  const availableConditionals = record?.conditional_entry_rules ?? [];
  const allEligibleHeld = [...new Set(availableConditionals.flatMap((r) => r.eligible_if_holds))];

  const normalBase = record ? normalizeStatus(record.base_entry.status) : "";
  const normalEffective = normalizeStatus(effectiveStatus);
  const statusUpgrade = isConditional && normalBase !== normalEffective;
  const stayUpgrade = isConditional && (effectiveMaxStay ?? 0) > (baseMaxStay ?? 0);
  const showUpgradeBanner = isConditional && (statusUpgrade || stayUpgrade);

  const uniqueSources = record?.source_refs
    ? record.source_refs.filter(
        (s, i, arr) => arr.findIndex((x) => x.url === s.url || x.source_name === s.source_name) === i
      )
    : [];

  const documents = (record?.common_documents ?? []).map(
    (d) => DOCUMENT_LABELS[d] ?? d.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );

  return (
    <DashboardLayout type="agency">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visa Check</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Precise visa requirements for Indian passport holders across 257 destinations · MEA India data
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Travel Details
            </CardTitle>
            <CardDescription>
              Select the destination and any valid visas your client holds to see accurate entry requirements.
            </CardDescription>
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
                  <SelectItem value="India">🇮🇳 India — Ordinary Passport</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <Label>Destination Country</Label>
              <Select
                value={destination}
                onValueChange={(v) => { setDestination(v); setChecked(false); }}
              >
                <SelectTrigger data-testid="select-destination">
                  <SelectValue placeholder="Select a destination…" />
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
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                    {filteredDestinations.length === 0 && (
                      <div className="py-4 text-center text-sm text-muted-foreground">No results</div>
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Valid Visas — grouped */}
            <div className="space-y-2">
              <Label>
                Visas / Permits Held{" "}
                <span className="text-muted-foreground font-normal text-xs">(optional — unlocks conditional entry)</span>
              </Label>
              <div className="border rounded-lg divide-y overflow-hidden">
                {VISA_GROUPS.map((group) => {
                  const groupVisas = VALID_VISAS.filter((v) => v.group === group);
                  const selectedInGroup = groupVisas.filter((v) => selectedVisas.includes(v.id)).length;
                  return (
                    <Collapsible key={group} open={openGroups[group]} onOpenChange={() => toggleGroup(group)}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{group}</span>
                          {selectedInGroup > 0 && (
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">{selectedInGroup}</Badge>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openGroups[group] ? "rotate-180" : ""}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                          {groupVisas.map(({ id, label }) => (
                            <div key={id} className="flex items-center gap-2">
                              <Checkbox
                                id={`agency-visa-${id}`}
                                checked={selectedVisas.includes(id)}
                                onCheckedChange={() => toggleVisa(id)}
                                data-testid={`checkbox-visa-${id}`}
                              />
                              <label htmlFor={`agency-visa-${id}`} className="text-sm cursor-pointer text-foreground/80 hover:text-foreground leading-tight">
                                {label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={() => setChecked(true)}
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
        {checked && record && cfg && baseCfg && (
          <Card className={`border-2 ${cfg.border} ${cfg.bg}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-lg">🇮🇳 India → {record.destination}</CardTitle>
                  <CardDescription className="mt-0.5 flex items-center gap-2 flex-wrap">
                    Tourism / Business · Ordinary Passport
                    {record.confidence && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        record.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                        record.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {record.confidence === "high" ? "✓ High confidence" : "⚠ Verify before travel"}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {normalEffective === "visa_free" && <CheckCircle2 className="w-4 h-4" />}
                  {normalEffective === "visa_on_arrival" && <Plane className="w-4 h-4" />}
                  {normalEffective === "e_visa" && <Zap className="w-4 h-4" />}
                  {normalEffective === "visa_required" && <XCircle className="w-4 h-4" />}
                  {cfg.label}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Conditional upgrade banner */}
              {showUpgradeBanner && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Conditional Entry Unlocked</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      The visa/permit held unlocks a better entry option than the base requirement.
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {statusUpgrade && (
                        <>
                          <span className="text-xs text-amber-600">Base:</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${baseCfg.badgeBg} ${baseCfg.badgeText}`}>{baseCfg.label}</span>
                          <span className="text-xs text-amber-600">→ With visa:</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>{cfg.label}</span>
                        </>
                      )}
                      {!statusUpgrade && stayUpgrade && (
                        <>
                          <span className="text-xs text-amber-600">Base stay:</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">{baseMaxStay} days</span>
                          <span className="text-xs text-amber-600">→ With visa:</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">{effectiveMaxStay} days</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional e-visa hint (Turkey-style) */}
              {!isConditional && isConditionalEVisa(record.base_entry.status) && availableConditionals.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <Zap className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-purple-800">e-Visa Available With Qualifying Documents</p>
                    <p className="text-xs text-purple-700 mt-0.5">
                      Without a qualifying third-country visa, client must apply at the embassy. Select the visas held above to check e-Visa eligibility.
                    </p>
                  </div>
                </div>
              )}

              {/* Max stay */}
              {effectiveMaxStay !== null && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                  <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Maximum Stay</p>
                    <p className="text-sm font-semibold">{effectiveMaxStay} days</p>
                  </div>
                  {stayUpgrade && !statusUpgrade && (
                    <span className="ml-auto text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                      +{(effectiveMaxStay ?? 0) - (baseMaxStay ?? 0)} days vs base
                    </span>
                  )}
                </div>
              )}

              {/* Conditions */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Entry Conditions</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {isConditional ? conditionalRule!.conditions : record.base_entry.notes}
                </p>
              </div>

              {/* Documents */}
              {documents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Typical Documents Required
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {documents.map((doc) => (
                      <span key={doc} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-background border rounded-md text-foreground/70">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        {doc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Easier entry hint */}
              {!isConditional && !isConditionalEVisa(record.base_entry.status) && availableConditionals.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Better Entry Available</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Holders of the following documents may qualify for improved entry — tick them above:
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {allEligibleHeld.map((v, i) => (
                        <span key={i} className="text-[11px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Always verify with the destination embassy/consulate before travel. Visa rules change frequently and individual circumstances vary.
                </p>
              </div>

              {/* Sources */}
              {uniqueSources.length > 0 && (
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground/50 uppercase tracking-wide text-[10px]">Sources</p>
                  {uniqueSources.map((s, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                          {s.source_name}{s.last_updated ? ` (${s.last_updated})` : ""}
                        </a>
                      ) : (
                        <span>{s.source_name}{s.last_updated ? ` (${s.last_updated})` : ""}</span>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Dataset v{(data as any).metadata?.version ?? "0.2"} · Last checked: {record.last_checked ?? (data as any).metadata?.created ?? ""}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {checked && !record && destination && (
          <Card>
            <CardContent className="py-8 text-center">
              <XCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No data found for <strong>{destination}</strong>. Verify requirements with the embassy.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
