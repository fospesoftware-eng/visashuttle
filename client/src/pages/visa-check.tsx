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
  AlertTriangle, Info, Search, ChevronDown,
} from "lucide-react";
import {
  ALL_DESTINATIONS, VALID_VISAS, VISA_GROUPS,
  findDestination, findBestConditionalRule, getEntryConfig, normalizeStatus, data
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

  const availableConditionals = record?.conditional_entry_rules ?? [];
  const allEligibleHeld = availableConditionals.flatMap((r) => r.eligible_if_holds);
  const statusIsSame = record && normalizeStatus(record.base_entry.status) === normalizeStatus(effectiveStatus);

  return (
    <DashboardLayout type="agency">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visa Check</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Instantly check visa requirements for Indian passport holders across 257 destinations.
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
                  <CardDescription className="mt-0.5">Tourism / Business · Ordinary Passport</CardDescription>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border font-semibold text-sm ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {normalizeStatus(effectiveStatus) === "visa_free" && <CheckCircle2 className="w-4 h-4" />}
                  {normalizeStatus(effectiveStatus) === "visa_on_arrival" && <Plane className="w-4 h-4" />}
                  {normalizeStatus(effectiveStatus) === "e_visa" && <Zap className="w-4 h-4" />}
                  {normalizeStatus(effectiveStatus) === "visa_required" && <XCircle className="w-4 h-4" />}
                  {cfg.label}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isConditional && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Conditional Entry Unlocked</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      The visa/permit held unlocks a better entry option than the base requirement.
                    </p>
                    {!statusIsSame && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-amber-600">Base:</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${baseCfg.badgeBg} ${baseCfg.badgeText}`}>{baseCfg.label}</span>
                        <span className="text-xs text-amber-600">→ With visa:</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>{cfg.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {effectiveMaxStay !== null && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                  <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Maximum Stay</p>
                    <p className="text-sm font-semibold">{effectiveMaxStay} days</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Entry Conditions</p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {isConditional ? conditionalRule!.conditions : record.base_entry.notes}
                </p>
              </div>

              {!isConditional && availableConditionals.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Easier Entry Available</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Holders of the following visa/permit may qualify for simpler entry — tick them above:
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {allEligibleHeld.map((v, i) => (
                        <span key={i} className="text-[11px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Always verify with the destination embassy/consulate before travel. Visa rules change frequently.
                </p>
              </div>

              {record.source_refs && record.source_refs.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Sources: {record.source_refs.map((s) => s.source_name).join(" · ")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {checked && !record && destination && (
          <Card>
            <CardContent className="py-8 text-center">
              <XCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No data found for <strong>{destination}</strong>.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
