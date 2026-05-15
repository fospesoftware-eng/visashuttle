import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+91", label: "India", aliases: ["in", "bharat"] },
  { code: "+1", label: "United States", aliases: ["us", "usa", "america", "canada", "ca"] },
  { code: "+44", label: "United Kingdom", aliases: ["uk", "great britain", "england"] },
  { code: "+61", label: "Australia", aliases: ["au"] },
  { code: "+64", label: "New Zealand", aliases: ["nz"] },
  { code: "+65", label: "Singapore", aliases: ["sg"] },
  { code: "+971", label: "UAE", aliases: ["united arab emirates", "dubai"] },
  { code: "+966", label: "Saudi Arabia", aliases: ["saudi", "ksa"] },
  { code: "+974", label: "Qatar", aliases: ["qa"] },
  { code: "+965", label: "Kuwait", aliases: ["kw"] },
  { code: "+968", label: "Oman", aliases: ["om"] },
  { code: "+973", label: "Bahrain", aliases: ["bh"] },
  { code: "+81", label: "Japan", aliases: ["jp"] },
  { code: "+82", label: "South Korea", aliases: ["korea", "kr"] },
  { code: "+49", label: "Germany", aliases: ["de"] },
  { code: "+33", label: "France", aliases: ["fr"] },
  { code: "+39", label: "Italy", aliases: ["it"] },
  { code: "+34", label: "Spain", aliases: ["es"] },
  { code: "+31", label: "Netherlands", aliases: ["nl"] },
  { code: "+353", label: "Ireland", aliases: ["ie"] },
];

function normalizeCode(code?: string | null) {
  if (!code) return "+91";
  const cleaned = code.trim();
  if (!cleaned) return "+91";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned.replace(/\D/g, "")}`;
}

export function defaultPhoneCodeFrom(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  const lower = trimmed.toLowerCase();
  const byDialCode = COUNTRY_CODES
    .slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => trimmed.startsWith(c.code));
  if (byDialCode) return byDialCode.code;
  const byCountry = COUNTRY_CODES.find((c) =>
    c.label.toLowerCase() === lower ||
    c.label.toLowerCase().includes(lower) ||
    c.aliases.some((alias) => alias === lower || lower.includes(alias))
  );
  return byCountry?.code ?? "+91";
}

function splitPhone(value: string | null | undefined, defaultCountryCode: string) {
  const trimmed = value?.trim() ?? "";
  const matched = COUNTRY_CODES
    .slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => trimmed.startsWith(c.code));
  const code = matched?.code ?? normalizeCode(defaultCountryCode);
  const local = matched ? trimmed.slice(matched.code.length).trim() : trimmed.replace(/^\+/, "");
  return { code, local };
}

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  defaultCountryCode?: string;
  placeholder?: string;
  testId?: string;
};

export function PhoneInput({
  value,
  onChange,
  defaultCountryCode = "+91",
  placeholder = "98765 43210",
  testId,
}: PhoneInputProps) {
  const defaultCode = useMemo(() => normalizeCode(defaultCountryCode), [defaultCountryCode]);
  const parsed = splitPhone(value, defaultCode);
  const [selectedCode, setSelectedCode] = useState(parsed.code);
  const code = parsed.local ? parsed.code : selectedCode;
  const local = parsed.local;

  useEffect(() => {
    const next = splitPhone(value, defaultCode);
    setSelectedCode(next.code);
  }, [defaultCode, value]);

  const emit = (nextCode: string, nextLocal: string) => {
    const normalized = normalizeCode(nextCode);
    setSelectedCode(normalized);
    const digits = nextLocal.trim();
    onChange(digits ? `${normalized} ${digits}` : "");
  };

  return (
    <div className="flex min-w-0 overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <Select value={code} onValueChange={(nextCode) => emit(nextCode, local)}>
        <SelectTrigger
          className="h-10 w-[116px] shrink-0 rounded-none border-0 border-r bg-muted/45 px-3 font-medium shadow-none focus:ring-0 focus:ring-offset-0"
          data-testid={testId ? `${testId}-code` : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[100] max-h-72">
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="font-medium">{country.code}</span>
              <span className="ml-2 text-muted-foreground text-xs">{country.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={local}
        onChange={(e) => emit(code, e.target.value)}
        placeholder={placeholder}
        inputMode="tel"
        className="h-10 min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        data-testid={testId}
      />
    </div>
  );
}
