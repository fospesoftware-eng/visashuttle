import visaData from "@/data/visa-rules.json";

export const data = visaData as any;

export const ALL_DESTINATIONS: string[] = (data.destinations as any[])
  .map((d: any) => d.destination)
  .sort((a: string, b: string) => a.localeCompare(b));

export const VALID_VISAS: { id: string; label: string; group: string }[] = [
  { id: "us visa",                                  label: "USA Visa (B1/B2, Tourist, Business)",        group: "Americas & Western" },
  { id: "us long-term multiple-entry visa",          label: "USA Long-Term Multiple-Entry Visa",          group: "Americas & Western" },
  { id: "us green card",                             label: "USA Green Card",                             group: "Americas & Western" },
  { id: "us residence permit",                       label: "USA Residence Permit",                       group: "Americas & Western" },
  { id: "canada visa",                               label: "Canada Visa",                                group: "Americas & Western" },
  { id: "canada residence permit",                   label: "Canada Residence Permit",                    group: "Americas & Western" },
  { id: "uk visa",                                   label: "UK Visit / Tourist Visa",                    group: "Europe" },
  { id: "uk long-term multiple-entry visa",          label: "UK Long-Term Multiple-Entry Visa",           group: "Europe" },
  { id: "uk residence permit",                       label: "UK Residence Permit / BRP",                  group: "Europe" },
  { id: "schengen visa",                             label: "Schengen Visa",                              group: "Europe" },
  { id: "schengen long-term multiple-entry visa",    label: "Schengen Long-Term Multiple-Entry Visa",     group: "Europe" },
  { id: "schengen residence permit",                 label: "Schengen Residence Permit",                  group: "Europe" },
  { id: "eu visa",                                   label: "EU Visa",                                    group: "Europe" },
  { id: "eu member state visa",                      label: "EU Member State Visa",                       group: "Europe" },
  { id: "eu residence permit",                       label: "EU Residence Permit",                        group: "Europe" },
  { id: "ireland visa",                              label: "Ireland Visa",                               group: "Europe" },
  { id: "ireland residence permit",                  label: "Ireland Residence Permit",                   group: "Europe" },
  { id: "australia visa",                            label: "Australia Visa",                             group: "Asia-Pacific" },
  { id: "australia residence permit",                label: "Australia Residence Permit",                 group: "Asia-Pacific" },
  { id: "new zealand visa",                          label: "New Zealand Visa",                           group: "Asia-Pacific" },
  { id: "new zealand residence permit",              label: "New Zealand Residence Permit",               group: "Asia-Pacific" },
  { id: "japan visa",                                label: "Japan Visa",                                 group: "Asia-Pacific" },
  { id: "japan residence permit",                    label: "Japan Residence Permit",                     group: "Asia-Pacific" },
  { id: "south korea visa",                          label: "South Korea Visa",                           group: "Asia-Pacific" },
  { id: "south korea residence permit",              label: "South Korea Residence Permit",               group: "Asia-Pacific" },
  { id: "singapore visa",                            label: "Singapore Visa",                             group: "Asia-Pacific" },
  { id: "singapore residence permit",                label: "Singapore Residence Permit",                 group: "Asia-Pacific" },
  { id: "uae visa",                                  label: "UAE Visa",                                   group: "GCC / Middle East" },
  { id: "uae residence permit",                      label: "UAE Residence Permit",                       group: "GCC / Middle East" },
  { id: "gcc visa",                                  label: "GCC Visa",                                   group: "GCC / Middle East" },
  { id: "gcc residence permit",                      label: "GCC Residence Permit",                       group: "GCC / Middle East" },
  { id: "gcc nationality",                           label: "GCC Nationality",                            group: "GCC / Middle East" },
  { id: "saudi arabia visa",                         label: "Saudi Arabia Visa",                          group: "GCC / Middle East" },
  { id: "saudi arabia residence permit",             label: "Saudi Arabia Residence Permit",              group: "GCC / Middle East" },
  { id: "kuwait residence permit",                   label: "Kuwait Residence Permit",                    group: "GCC / Middle East" },
  { id: "qatar residence permit",                    label: "Qatar Residence Permit",                     group: "GCC / Middle East" },
  { id: "bahrain residence permit",                  label: "Bahrain Residence Permit",                   group: "GCC / Middle East" },
  { id: "oman residence permit",                     label: "Oman Residence Permit",                      group: "GCC / Middle East" },
  { id: "russia visa",                               label: "Russia Visa",                                group: "Other" },
];

export const VISA_GROUPS = [...new Set(VALID_VISAS.map((v) => v.group))];

export interface DestRecord {
  destination: string;
  passport_country?: string;
  base_entry: {
    status: string;
    max_stay_days: number | null;
    notes: string;
    purpose?: string[];
  };
  conditional_entry_rules: {
    rule_status: string;
    eligible_if_holds: string[];
    max_stay_days: number | null;
    conditions: string;
    purpose?: string[];
  }[];
  common_documents?: string[];
  source_refs?: { source_name: string; url?: string; last_updated?: string }[];
  confidence?: string;
  last_checked?: string;
}

export function findDestination(name: string): DestRecord | undefined {
  return (data.destinations as DestRecord[]).find(
    (d) => d.destination.toLowerCase() === name.toLowerCase()
  );
}

export function findBestConditionalRule(
  dest: DestRecord,
  selectedVisaIds: string[]
): DestRecord["conditional_entry_rules"][0] | null {
  if (!dest.conditional_entry_rules?.length || !selectedVisaIds.length) return null;
  for (const rule of dest.conditional_entry_rules) {
    const matched = rule.eligible_if_holds.some((held) =>
      selectedVisaIds.some((sel) => held.toLowerCase() === sel.toLowerCase())
    );
    if (matched) return rule;
  }
  return null;
}

export function normalizeStatus(status: string): string {
  if (!status) return "visa_required";
  if (status.includes("visa_free")) return "visa_free";
  if (status.includes("visa_on_arrival_or_eta") || status === "visa_on_arrival") return "visa_on_arrival";
  // conditional_e_visa = e-visa ONLY if holding a qualifying third-country visa; otherwise visa required
  if (status === "conditional_e_visa") return "visa_required";
  if (status.includes("e_visa") || status.includes("eta") || status.includes("pre_arrival")) return "e_visa";
  if (status.includes("visa_on_arrival")) return "visa_on_arrival";
  if (status.includes("visa_required")) return "visa_required";
  return "visa_required";
}

// Human-readable document labels
export const DOCUMENT_LABELS: Record<string, string> = {
  valid_passport: "Valid Passport",
  return_or_onward_ticket: "Return / Onward Ticket",
  proof_of_accommodation: "Proof of Accommodation",
  sufficient_funds: "Proof of Sufficient Funds",
  travel_insurance: "Travel Insurance",
  hotel_booking: "Hotel Booking",
  bank_statement: "Bank Statement",
  employment_letter: "Employment Letter",
  invitation_letter: "Invitation Letter",
  passport_photo: "Passport-Size Photo",
  medical_insurance: "Medical Insurance",
  onward_ticket: "Onward Ticket",
};

export const ENTRY_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string;
  badgeBg: string; badgeText: string; icon?: string;
}> = {
  visa_free: {
    label: "Visa Free",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
  },
  visa_on_arrival: {
    label: "Visa on Arrival",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
  },
  e_visa: {
    label: "e-Visa / ETA Required",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
  },
  visa_required: {
    label: "Visa Required",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
  },
};

export function getEntryConfig(status: string) {
  const norm = normalizeStatus(status);
  return ENTRY_CONFIG[norm] ?? ENTRY_CONFIG.visa_required;
}

// Turkey-style conditional e-visa: base is visa_required but e-visa available if holding qualifying docs
export function isConditionalEVisa(status: string): boolean {
  return status === "conditional_e_visa";
}
