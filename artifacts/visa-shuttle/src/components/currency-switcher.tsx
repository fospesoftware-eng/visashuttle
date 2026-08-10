import { useState, useEffect } from "react";
import { DollarSign, Globe, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  B2C_CURRENCIES,
  B2C_CURRENCY_FLAGS,
  B2C_CURRENCY_SYMBOLS,
  type B2cCurrency,
  getStoredB2cCurrency,
  storeB2cCurrency,
  initAutoDetectedCurrency,
} from "@/lib/b2c-pricing";

const CURRENCY_NAMES: Record<B2cCurrency, string> = {
  INR: "Indian Rupee (₹)",
  USD: "US Dollar ($)",
  GBP: "British Pound (£)",
  EUR: "Euro (€)",
  AED: "UAE Dirham (AED)",
};

interface CurrencySwitcherProps {
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "sm" | "default" | "xs";
  showLabel?: boolean;
}

export function CurrencySwitcher({
  className = "",
  variant = "ghost",
  size = "sm",
  showLabel = true,
}: CurrencySwitcherProps) {
  const [currency, setCurrency] = useState<B2cCurrency>(() => getStoredB2cCurrency());

  useEffect(() => {
    // Auto-detect visitor currency from IP on initial page load if not manually overridden
    initAutoDetectedCurrency().then((detected) => {
      setCurrency(detected);
    });

    const handleCurrencyChange = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.currency) {
        setCurrency(detail.currency);
      }
    };

    window.addEventListener("visashuttle:currency-changed", handleCurrencyChange);
    return () => {
      window.removeEventListener("visashuttle:currency-changed", handleCurrencyChange);
    };
  }, []);

  const handleSelect = (code: B2cCurrency) => {
    setCurrency(code);
    storeB2cCurrency(code);
  };

  const currentFlag = B2C_CURRENCY_FLAGS[currency] || "🌐";
  const currentSymbol = B2C_CURRENCY_SYMBOLS[currency] || "$";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size as any}
          className={`gap-1.5 font-medium text-xs sm:text-sm ${className}`}
          data-testid="currency-switcher-trigger"
        >
          <span className="text-base leading-none">{currentFlag}</span>
          <span>{currency}</span>
          <span className="text-muted-foreground font-mono text-xs">({currentSymbol})</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-1">
        <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b mb-1">
          Select Currency
        </div>
        {B2C_CURRENCIES.map((code) => {
          const isSelected = code === currency;
          return (
            <DropdownMenuItem
              key={code}
              onClick={() => handleSelect(code)}
              className={`flex items-center justify-between text-xs cursor-pointer py-2 ${
                isSelected ? "bg-primary/10 font-bold text-primary" : ""
              }`}
              data-testid={`currency-option-${code}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">{B2C_CURRENCY_FLAGS[code]}</span>
                <span>{code}</span>
              </div>
              <span className="font-mono text-muted-foreground text-xs">{B2C_CURRENCY_SYMBOLS[code]}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
