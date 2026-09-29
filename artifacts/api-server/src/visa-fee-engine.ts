// ============================================================
// VISA FEE ENGINE — core VisaShuttle module
// ------------------------------------------------------------
// Authoritative store of official government visa fees keyed by
// Country × Nationality × Visa Type × Visa Category. Each record
// carries the components that make up the "protected fee"
// (headline government fee + biometric fee + mandatory levy +
// other mandatory government charges), the INR equivalent via a
// configurable FX table, effective/last-verified dates and the
// official government source.
//
// The Visa Protection Plan consumes this module — it is never
// embedded inside the protection plan itself.
// ============================================================

export interface VisaFeeRecord {
  id: string;
  country: string;
  nationality: string; // "All" = default row for the destination
  visaType: string; // e.g. "B1/B2", "Short-stay (C)" — "*" = any visa type
  visaCategory: string; // e.g. "Tourist", "Business" — "*" = any category
  governmentFee: number; // minor units (cents) in feeCurrency
  feeCurrency: string;
  biometricFee: number; // minor units, 0 when not applicable
  mandatoryLevy: number; // minor units (e.g. immigration levy / IVL)
  otherMandatoryCharges: number; // minor units
  effectiveDate: string; // ISO date the fee took effect
  lastVerifiedAt: string; // ISO date VisaShuttle last verified at source
  officialSource: string; // official government page
  protectionSupported: boolean;
}

export interface PremiumBand {
  min: number;
  max: number;
  percent: number;
}

export interface ProtectionPricingSettings {
  visaProtectionMinScore: number;
  visaProtectionMinProtectedFeeInr: number;
  visaProtectionPremiumBands: PremiumBand[];
  visaProtectionDestinationRisk: Record<string, number>;
  visaFeeEngineFx?: Record<string, number>;
}

// ---------- seed data (amounts in minor units) ----------

export const VISA_FEE_TABLE: VisaFeeRecord[] = [
  {
    id: "usa-b1b2-all",
    country: "United States",
    nationality: "All",
    visaType: "B1/B2",
    visaCategory: "*",
    governmentFee: 18500,
    feeCurrency: "USD",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2023-06-17",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html",
    protectionSupported: true,
  },
  {
    id: "schengen-shortstay-c-all",
    country: "Schengen Area",
    nationality: "All",
    visaType: "Short-stay (C)",
    visaCategory: "*",
    governmentFee: 9000,
    feeCurrency: "EUR",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2024-06-11",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy/apply-visa_en",
    protectionSupported: true,
  },
  {
    id: "uk-visit-shortterm-all",
    country: "United Kingdom",
    nationality: "All",
    visaType: "Standard Visitor (6 months)",
    visaCategory: "*",
    governmentFee: 13500,
    feeCurrency: "GBP",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2026-04-08",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://www.gov.uk/visa-fees",
    protectionSupported: true,
  },
  {
    id: "uk-visit-longterm-2y-all",
    country: "United Kingdom",
    nationality: "All",
    visaType: "Standard Visitor (2 years)",
    visaCategory: "*",
    governmentFee: 40000,
    feeCurrency: "GBP",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2026-04-08",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://www.gov.uk/visa-fees",
    protectionSupported: true,
  },
  {
    id: "canada-visitor-all",
    country: "Canada",
    nationality: "All",
    visaType: "Visitor Visa (TRV)",
    visaCategory: "*",
    governmentFee: 10000,
    feeCurrency: "CAD",
    biometricFee: 8500,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2024-04-30",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://www.canada.ca/en/immigration-refugees-citizenship/services/apply-canada/fees.html",
    protectionSupported: true,
  },
  {
    id: "australia-visitor-600-all",
    country: "Australia",
    nationality: "All",
    visaType: "Visitor (subclass 600)",
    visaCategory: "*",
    governmentFee: 19000,
    feeCurrency: "AUD",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2024-07-01",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/fees-and-charges/current-visa-pricing",
    protectionSupported: true,
  },
  {
    id: "newzealand-visitor-all",
    country: "New Zealand",
    nationality: "All",
    visaType: "Visitor Visa",
    visaCategory: "*",
    governmentFee: 34100, // total incl. International Visitor Levy
    feeCurrency: "NZD",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2024-10-01",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://www.immigration.govt.nz/new-zealand-visas/preparing-a-visa-application/fees-and-timing",
    protectionSupported: true,
  },
  {
    id: "ireland-shortstay-c-all",
    country: "Ireland",
    nationality: "All",
    visaType: "Short Stay (C)",
    visaCategory: "*",
    governmentFee: 6000,
    feeCurrency: "EUR",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2024-07-22",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://www.irishimmigration.ie/visa-fees/",
    protectionSupported: true,
  },
  {
    id: "uae-tourist-30d-all",
    country: "United Arab Emirates",
    nationality: "All",
    visaType: "Tourist Visa (30 days)",
    visaCategory: "*",
    governmentFee: 35000,
    feeCurrency: "AED",
    biometricFee: 0,
    mandatoryLevy: 0,
    otherMandatoryCharges: 0,
    effectiveDate: "2024-01-01",
    lastVerifiedAt: "2026-09-01",
    officialSource: "https://icp.gov.ae/en/fee-details",
    protectionSupported: true,
  },
];

// Country aliases → canonical record country
const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "United States",
  us: "United States",
  usa: "United States",
  "united states of america": "United States",
  schengen: "Schengen Area",
  "schengen area": "Schengen Area",
  europe: "Schengen Area",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  "united kingdom": "United Kingdom",
  uae: "United Arab Emirates",
  dubai: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
};

const DEFAULT_RISK_FACTORS: Record<string, number> = {
  "United States": 1.35,
  "Schengen Area": 1.25,
  "United Kingdom": 1.15,
  Australia: 1.05,
  Canada: 1.0,
  "New Zealand": 0.95,
  Ireland: 0.95,
  "United Arab Emirates": 0.85,
};

// 1 unit of currency → INR (admin-overridable via settings.visaFeeEngineFx)
export const DEFAULT_FX_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 84,
  EUR: 92,
  GBP: 105,
  CAD: 62,
  AUD: 57,
  NZD: 52,
  AED: 23,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  NZD: "NZ$",
  AED: "AED ",
};

export const FX_SOURCE = "VisaShuttle configured exchange-rate source";

export function getDefaultProtectionSettings(): ProtectionPricingSettings {
  return {
    visaProtectionMinScore: 70,
    visaProtectionMinProtectedFeeInr: 5000,
    visaProtectionPremiumBands: [
      { min: 70, max: 79.99, percent: 22 },
      { min: 80, max: 89.99, percent: 18 },
      { min: 90, max: 94.99, percent: 14 },
      { min: 95, max: 100, percent: 10 },
    ],
    visaProtectionDestinationRisk: { ...DEFAULT_RISK_FACTORS },
    visaFeeEngineFx: { ...DEFAULT_FX_TO_INR },
  };
}

// ---------- helpers ----------

function canon(value: string | null | undefined): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveCountry(input: string | null | undefined): string {
  const key = canon(input);
  if (!key) return "";
  return COUNTRY_ALIASES[key] || input!.trim();
}

export function toInr(amountMinor: number, currency: string, fx?: Record<string, number>): number {
  const rates = fx && Object.keys(fx).length ? fx : DEFAULT_FX_TO_INR;
  const rate = rates[currency] || DEFAULT_FX_TO_INR[currency];
  if (!rate) return 0;
  return Math.round(amountMinor * rate);
}

export function fromInr(inrMinor: number, currency: string, fx?: Record<string, number>): number {
  const rates = fx && Object.keys(fx).length ? fx : DEFAULT_FX_TO_INR;
  const rate = rates[currency] || DEFAULT_FX_TO_INR[currency];
  if (!rate) return 0;
  return Math.round(inrMinor / rate);
}

export function formatMoney(amountMinor: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const major = amountMinor / 100;
  return currency === "INR" || currency === "AED"
    ? `${symbol}${major.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : `${symbol}${major.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function getDestinationRiskFactor(
  country: string,
  settings?: Record<string, number>,
): number {
  const resolved = resolveCountry(country);
  const table = settings && Object.keys(settings).length ? settings : DEFAULT_RISK_FACTORS;
  return table[resolved] ?? table["*"] ?? 1.0;
}

// ---------- lookup ----------

export interface VisaFeeLookup {
  record: VisaFeeRecord | null;
  matchLevel: "exact" | "visaType" | "country" | "none";
  protectedFeeInrMinor: number;
}

export function lookupVisaFee(params: {
  country: string;
  nationality?: string | null;
  visaType?: string | null;
  visaCategory?: string | null;
}): VisaFeeLookup {
  const country = resolveCountry(params.country);
  const nationality = canon(params.nationality) || "all";
  const visaType = canon(params.visaType);
  const visaCategory = canon(params.visaCategory);

  const rows = VISA_FEE_TABLE.filter((r) => resolveCountry(r.country) === country);
  const withProtected = (r: VisaFeeRecord, level: VisaFeeLookup["matchLevel"]): VisaFeeLookup =>
    ({ record: r, matchLevel: level, protectedFeeInrMinor: getProtectedFeeInrMinor(r) });

  // 1. exact visaType + exact nationality
  let found = rows.find(
    (r) => canon(r.visaType) === visaType && canon(r.nationality) === nationality,
  );
  if (found) return withProtected(found, "exact");

  // 2. exact visaType + matching/wildcard category + default nationality row
  found = rows.find(
    (r) =>
      canon(r.visaType) === visaType &&
      canon(r.nationality) === "all" &&
      (r.visaCategory === "*" || canon(r.visaCategory) === visaCategory),
  );
  if (found) return withProtected(found, "exact");

  // 3. exact visaType (any nationality row)
  found = rows.find((r) => canon(r.visaType) === visaType);
  if (found) return withProtected(found, "exact");

  // 4. wildcard visaType for the country
  found = rows.find((r) => r.visaType === "*");
  if (found) return withProtected(found, "country");

  // 5. first row for the country
  found = rows[0];
  if (found) return withProtected(found, "visaType");

  return { record: null, matchLevel: "none", protectedFeeInrMinor: 0 };
}

export function getProtectedFeeInrMinor(record: VisaFeeRecord, fx?: Record<string, number>): number {
  const totalMinor =
    record.governmentFee + record.biometricFee + record.mandatoryLevy + record.otherMandatoryCharges;
  return toInr(totalMinor, record.feeCurrency, fx);
}

// ---------- protection pricing (v2, risk-based) ----------

export interface ProtectionCalculation {
  destinationCountry: string;
  nationality: string;
  visaType: string;
  visaCategory: string;
  eligible: boolean;
  ineligibleReasons: string[];
  score: number;
  requiredScore: number;
  scoreBand: (PremiumBand & { label: string }) | null;
  destinationRiskFactor: number;
  premiumPercent: number;
  feeRecordId: string | null;
  feeCurrency: string;
  governmentFeeMinor: number;
  biometricFeeMinor: number;
  mandatoryLevyMinor: number;
  otherChargesMinor: number;
  protectedFeeMinor: number; // display currency
  protectedFeeInrMinor: number;
  premiumMinor: number; // display currency
  premiumInrMinor: number;
  formattedGovernmentFee: string;
  formattedBiometricFee: string;
  formattedMandatoryLevy: string;
  formattedOtherCharges: string;
  formattedProtectedFee: string;
  formattedPremium: string;
  fxRateToInr: number;
  fxSource: string;
  officialSource: string | null;
  effectiveDate: string | null;
  lastVerifiedAt: string | null;
  refundPolicy: {
    refundableLabel: string;
    refundableMinor: number;
    nonRefundable: string[];
  };
}

function bandLabel(band: PremiumBand): string {
  const min = Math.floor(band.min);
  const max = band.max >= 100 ? 100 : Math.floor(band.max);
  return `${min}\u2013${max}%`;
}

export function calculateVisaProtectionV2(params: {
  score: number;
  destinationCountry: string;
  nationality?: string | null;
  visaType?: string | null;
  visaCategory?: string | null;
  currency?: string;
  settings: ProtectionPricingSettings;
}): ProtectionCalculation {
  const {
    score,
    destinationCountry,
    nationality,
    visaType,
    visaCategory,
    currency = "USD",
    settings,
  } = params;

  const fx = settings.visaFeeEngineFx && Object.keys(settings.visaFeeEngineFx).length
    ? settings.visaFeeEngineFx
    : DEFAULT_FX_TO_INR;

  const lookup = lookupVisaFee({ country: destinationCountry, nationality, visaType, visaCategory });
  const record = lookup.record;

  const reasons: string[] = [];

  // Rule 1 — Deep Check is the gateway and score must clear the threshold
  const minScore = settings.visaProtectionMinScore ?? 70;
  if (score < minScore) {
    reasons.push(`Deep Check score ${score}% is below the ${minScore}% minimum required for Visa Protection.`);
  }

  // Rule 2 — destination fee engine must know this destination
  if (!record) {
    reasons.push(`Official government fee data for ${destinationCountry || "this destination"} is not yet available in the Visa Fee Engine.`);
  }

  // Rule 3 — protected fee must clear the ₹5,000 floor
  const minProtectedFeeInr = settings.visaProtectionMinProtectedFeeInr ?? 5000; // major INR
  const protectedFeeInrMinor = lookup.protectedFeeInrMinor;
  if (record && protectedFeeInrMinor < minProtectedFeeInr * 100) {
    reasons.push(
      `Protected government charges (${formatMoney(protectedFeeInrMinor, "INR")}) are below the ${formatMoney(minProtectedFeeInr * 100, "INR")} minimum for Visa Protection.`,
    );
  }

  // Rule 4 — visa type must support protection
  if (record && !record.protectionSupported) {
    reasons.push(`Visa Protection is not offered for ${record.visaType} to ${record.country}.`);
  }

  const eligible = reasons.length === 0;

  // Score band + risk-based premium
  const band =
    eligible || score >= minScore
      ? (settings.visaProtectionPremiumBands || []).find((b) => score >= b.min && score <= b.max) || null
      : null;
  const riskFactor = getDestinationRiskFactor(destinationCountry, settings.visaProtectionDestinationRisk);
  const premiumPercent = band ? Math.min(40, Math.max(5, Math.round(band.percent * riskFactor))) : 0;

  const displayCurrency = (currency || "USD").toUpperCase();
  const feeCurrency = record?.feeCurrency || "USD";
  const feeRate = fx[feeCurrency] || 1;

  const govMinor = record?.governmentFee || 0;
  const bioMinor = record?.biometricFee || 0;
  const levyMinor = record?.mandatoryLevy || 0;
  const otherMinor = record?.otherMandatoryCharges || 0;

  const protectedInr = protectedFeeInrMinor;
  const premiumInr = eligible ? Math.round((protectedInr * premiumPercent) / 100) : 0;
  // display amounts converted from INR into the requested display currency
  const protectedDisplay = fromInr(protectedInr, displayCurrency, fx);
  const premiumDisplay = fromInr(premiumInr, displayCurrency, fx);

  const refundableInr = protectedInr;

  return {
    destinationCountry: resolveCountry(destinationCountry),
    nationality: nationality || "",
    visaType: record?.visaType || visaType || "",
    visaCategory: record?.visaCategory || visaCategory || "",
    eligible,
    ineligibleReasons: reasons,
    score,
    requiredScore: minScore,
    scoreBand: band ? { ...band, label: bandLabel(band) } : null,
    destinationRiskFactor: riskFactor,
    premiumPercent,
    feeRecordId: record?.id || null,
    feeCurrency,
    governmentFeeMinor: govMinor,
    biometricFeeMinor: bioMinor,
    mandatoryLevyMinor: levyMinor,
    otherChargesMinor: otherMinor,
    protectedFeeMinor: protectedDisplay,
    protectedFeeInrMinor: protectedInr,
    premiumMinor: premiumDisplay,
    premiumInrMinor: premiumInr,
    formattedGovernmentFee: formatMoney(govMinor, feeCurrency),
    formattedBiometricFee: formatMoney(bioMinor, feeCurrency),
    formattedMandatoryLevy: formatMoney(levyMinor, feeCurrency),
    formattedOtherCharges: formatMoney(otherMinor, feeCurrency),
    formattedProtectedFee: formatMoney(protectedDisplay, displayCurrency),
    formattedPremium: formatMoney(premiumDisplay, displayCurrency),
    fxRateToInr: feeRate,
    fxSource: FX_SOURCE,
    officialSource: record?.officialSource || null,
    effectiveDate: record?.effectiveDate || null,
    lastVerifiedAt: record?.lastVerifiedAt || null,
    refundPolicy: {
      refundableLabel: `${formatMoney(refundableInr, "INR")} (100% of protected government charges)`,
      refundableMinor: protectedDisplay,
      nonRefundable: ["Deep Check fee", "Visa Protection premium"],
    },
  };
}

// Currency rates kept in one place so routes/storage can display them
export function getProtectedComponents(record: VisaFeeRecord) {
  return {
    governmentFee: record.governmentFee,
    biometricFee: record.biometricFee,
    mandatoryLevy: record.mandatoryLevy,
    otherMandatoryCharges: record.otherMandatoryCharges,
  };
}
