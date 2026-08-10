export type B2cCurrency = "USD" | "GBP" | "EUR" | "INR" | "AED";
export type B2cBillingType = "free" | "one_time" | "monthly";
export type B2cPlanKey = "free" | "deep" | "pro";

export type B2cPlan = {
  id?: string;
  planKey: B2cPlanKey;
  name: string;
  description: string;
  billingType: B2cBillingType;
  prices: Record<B2cCurrency, number>;
  features: string[];
  conditions: Record<string, any>;
  basicCheckLimit: number;
  deepCheckLimit: number;
  visaToolsCredits: number;
  sortOrder: number;
  active: boolean;
};

export const B2C_CURRENCY_SYMBOLS: Record<B2cCurrency, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  INR: "₹",
  AED: "AED",
};

export const B2C_DEEP_CHECK_PRICES: Record<B2cCurrency, { amount: number; symbol: string; label: string }> = {
  USD: { amount: 15, symbol: "$", label: "US Dollar ($)" },
  GBP: { amount: 11, symbol: "£", label: "British Pound (£)" },
  EUR: { amount: 12, symbol: "€", label: "Euro (€)" },
  INR: { amount: 1000, symbol: "₹", label: "Indian Rupee (₹)" },
  AED: { amount: 55, symbol: "AED", label: "UAE Dirham (AED)" },
};

export const B2C_CURRENCIES = Object.keys(B2C_DEEP_CHECK_PRICES) as B2cCurrency[];
export const DEFAULT_B2C_CURRENCY: B2cCurrency = "USD";
export const B2C_CURRENCY_FLAGS: Record<B2cCurrency, string> = {
  USD: "🇺🇸",
  GBP: "🇬🇧",
  EUR: "🇪🇺",
  INR: "🇮🇳",
  AED: "🇦🇪",
};

export const DEFAULT_B2C_PLANS: B2cPlan[] = [
  {
    planKey: "free",
    name: "Free",
    description: "Start with a quick AI visa score and essential guidance.",
    billingType: "free",
    prices: { USD: 0, GBP: 0, EUR: 0, INR: 0, AED: 0 },
    features: [
      "1 Basic Check",
      "Approval chance percentage",
      "Status label (High / Good / Moderate / Low)",
      "Strengths & risk factors",
      "Basic next steps",
      "100 Visa Tools Credit",
    ],
    conditions: { cta: "Start Free", checkout: false },
    basicCheckLimit: 1,
    deepCheckLimit: 0,
    visaToolsCredits: 100,
    sortOrder: 1,
    active: true,
  },
  {
    planKey: "deep",
    name: "Deep Check",
    description: "One detailed embassy-style AI risk analysis for serious applicants.",
    billingType: "one_time",
    prices: { USD: 15, GBP: 11, EUR: 12, INR: 1000, AED: 55 },
    features: [
      "Full embassy-style risk analysis",
      "Deep Check with 7 profile dimensions",
      "Individual & Family applicant support",
      "Document gap analysis & action plan",
      "Red flag identification",
      "Personalized improvement plan",
      "PDF report download",
      "Check history & dashboard",
      "Priority support",
      "500 Visa Tools Credit",
    ],
    conditions: { cta: "Get Deep Check", checkout: true },
    basicCheckLimit: 1,
    deepCheckLimit: 1,
    visaToolsCredits: 500,
    sortOrder: 2,
    active: true,
  },
  {
    planKey: "pro",
    name: "Pro",
    description: "Monthly plan for frequent applicants and family/travel planning.",
    billingType: "monthly",
    prices: { USD: 35, GBP: 26, EUR: 30, INR: 3000, AED: 125 },
    features: ["Unlimited Basic checks*", "10 Deep Checks", "1000 Visa Tools Credit"],
    conditions: {
      cta: "Upgrade to Pro",
      checkout: true,
      note: "*Unlimited Basic checks are subject to fair usage and abuse prevention.",
    },
    basicCheckLimit: 9999,
    deepCheckLimit: 10,
    visaToolsCredits: 1000,
    sortOrder: 3,
    active: true,
  },
];

export function isB2cCurrency(value: string | null | undefined): value is B2cCurrency {
  return !!value && B2C_CURRENCIES.includes(value as B2cCurrency);
}

/**
 * Maps visitor country name to Visa Shuttle supported currencies.
 * - India -> INR (₹)
 * - UK -> GBP (£)
 * - Eurozone -> EUR (€)
 * - GCC / UAE -> AED
 * - US -> USD ($)
 * - ALL OTHER COUNTRIES (Canada, Australia, Philippines, Nigeria, Pakistan, Kenya, etc.) -> USD ($)
 */
export function countryToB2cCurrency(countryName: string | null | undefined): B2cCurrency {
  if (!countryName) return "USD";
  const name = countryName.trim();
  if (name === "India") return "INR";
  if (name === "United Kingdom" || name === "UK") return "GBP";
  if (["United Arab Emirates", "UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman"].includes(name)) return "AED";
  if ([
    "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Austria",
    "Portugal", "Ireland", "Greece", "Finland", "Estonia", "Latvia", "Lithuania",
    "Slovakia", "Slovenia", "Luxembourg", "Malta", "Cyprus", "Croatia", "Europe",
  ].includes(name)) return "EUR";
  if (name === "United States" || name === "USA") return "USD";

  // Default to USD for all non-listed countries (Canada, Australia, Nigeria, Pakistan, Philippines, etc.)
  return "USD";
}

export function formatB2cPrice(currency: B2cCurrency, amount = B2C_DEEP_CHECK_PRICES[currency]?.amount ?? 15): string {
  const symbol = B2C_CURRENCY_SYMBOLS[currency] || "$";
  if (currency === "AED") return `AED ${amount.toLocaleString()}`;

  return `${symbol}${amount.toLocaleString()}`;
}

export function getB2cPlanPrice(plan: B2cPlan, currency: B2cCurrency): number {
  return Number(plan.prices?.[currency] ?? 0) || 0;
}

export function formatB2cPlanPrice(plan: B2cPlan, currency: B2cCurrency): string {
  return formatB2cPrice(currency, getB2cPlanPrice(plan, currency));
}

export function normalizeB2cPlans(input: unknown): B2cPlan[] {
  const rows = Array.isArray(input) ? input : [];
  const merged = DEFAULT_B2C_PLANS.map((fallback) => {
    const row = rows.find((item: any) => item?.planKey === fallback.planKey) as Partial<B2cPlan> | undefined;
    return {
      ...fallback,
      ...row,
      prices: { ...fallback.prices, ...(row?.prices || {}) },
      features: Array.isArray(row?.features) && row.features.length ? row.features : fallback.features,
      conditions: { ...fallback.conditions, ...(row?.conditions || {}) },
    };
  });
  return merged.filter(plan => plan.active !== false).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getStoredB2cCurrency(): B2cCurrency {
  if (typeof window === "undefined") return DEFAULT_B2C_CURRENCY;

  // 1. Explicit URL parameter override ?currency=INR
  const fromQuery = new URLSearchParams(window.location.search).get("currency");
  if (isB2cCurrency(fromQuery)) {
    storeB2cCurrency(fromQuery);
    return fromQuery;
  }

  // 2. Explicit user selection stored in localStorage
  const stored = window.localStorage.getItem("visaShuttleB2cCurrency");
  if (isB2cCurrency(stored)) return stored;

  // 3. Auto-detected country currency from Geo IP
  const cachedAutoCurrency = window.localStorage.getItem("visaShuttleAutoCurrency");
  if (isB2cCurrency(cachedAutoCurrency)) return cachedAutoCurrency;

  return DEFAULT_B2C_CURRENCY;
}

export function storeB2cCurrency(currency: B2cCurrency) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("visaShuttleB2cCurrency", currency);
    // Broadcast custom event so all open React pages refresh live prices immediately
    window.dispatchEvent(new CustomEvent("visashuttle:currency-changed", { detail: { currency } }));
  }
}

/**
 * Auto-detects visitor country via IP endpoint and initializes default currency.
 */
export async function initAutoDetectedCurrency(): Promise<B2cCurrency> {
  if (typeof window === "undefined") return "USD";

  try {
    const res = await fetch("/api/public/user-country", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json() as { country?: string | null; currency?: B2cCurrency };
      const autoCurrency = data.currency && isB2cCurrency(data.currency) ? data.currency : countryToB2cCurrency(data.country);
      window.localStorage.setItem("visaShuttleAutoCurrency", autoCurrency);

      const hasManualOverride = isB2cCurrency(window.localStorage.getItem("visaShuttleB2cCurrency"));
      if (!hasManualOverride) {
        storeB2cCurrency(autoCurrency);
      }
      return autoCurrency;
    }
  } catch (_) {
    // Fail gracefully
  }

  return getStoredB2cCurrency();
}
