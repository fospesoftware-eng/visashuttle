export type B2cCurrency = "USD" | "GBP" | "EUR" | "INR" | "AED";

export const B2C_DEEP_CHECK_PRICES: Record<B2cCurrency, { amount: number; symbol: string; label: string }> = {
  USD: { amount: 15, symbol: "$", label: "US Dollar" },
  GBP: { amount: 11, symbol: "£", label: "British Pound" },
  EUR: { amount: 12, symbol: "€", label: "Euro" },
  INR: { amount: 1000, symbol: "₹", label: "Indian Rupee" },
  AED: { amount: 55, symbol: "AED", label: "UAE Dirham" },
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

export function isB2cCurrency(value: string | null | undefined): value is B2cCurrency {
  return !!value && B2C_CURRENCIES.includes(value as B2cCurrency);
}

export function formatB2cPrice(currency: B2cCurrency, amount = B2C_DEEP_CHECK_PRICES[currency].amount): string {
  const price = B2C_DEEP_CHECK_PRICES[currency];
  if (currency === "AED") return `AED ${amount}`;
  return `${price.symbol}${amount}`;
}

export function getStoredB2cCurrency(): B2cCurrency {
  if (typeof window === "undefined") return DEFAULT_B2C_CURRENCY;
  const fromQuery = new URLSearchParams(window.location.search).get("currency");
  if (isB2cCurrency(fromQuery)) return fromQuery;
  const stored = window.localStorage.getItem("visaShuttleB2cCurrency");
  return isB2cCurrency(stored) ? stored : DEFAULT_B2C_CURRENCY;
}

export function storeB2cCurrency(currency: B2cCurrency) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("visaShuttleB2cCurrency", currency);
  }
}
