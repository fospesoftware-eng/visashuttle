import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+91", label: "India" },
  { code: "+1", label: "US/Canada" },
  { code: "+44", label: "United Kingdom" },
  { code: "+61", label: "Australia" },
  { code: "+64", label: "New Zealand" },
  { code: "+65", label: "Singapore" },
  { code: "+971", label: "UAE" },
  { code: "+966", label: "Saudi Arabia" },
  { code: "+974", label: "Qatar" },
  { code: "+965", label: "Kuwait" },
  { code: "+968", label: "Oman" },
  { code: "+973", label: "Bahrain" },
  { code: "+81", label: "Japan" },
  { code: "+82", label: "South Korea" },
  { code: "+49", label: "Germany" },
  { code: "+33", label: "France" },
  { code: "+39", label: "Italy" },
  { code: "+34", label: "Spain" },
  { code: "+31", label: "Netherlands" },
  { code: "+353", label: "Ireland" },
];

function normalizeCode(code?: string | null) {
  if (!code) return "+91";
  const cleaned = code.trim();
  if (!cleaned) return "+91";
  return cleaned.startsWith("+") ? cleaned : `+${cleaned.replace(/\D/g, "")}`;
}

export function defaultPhoneCodeFrom(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  const matched = COUNTRY_CODES
    .slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => trimmed.startsWith(c.code));
  return matched?.code ?? "+91";
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
  const { code, local } = splitPhone(value, defaultCountryCode);
  const emit = (nextCode: string, nextLocal: string) => {
    const digits = nextLocal.trim();
    onChange(digits ? `${normalizeCode(nextCode)} ${digits}` : "");
  };

  return (
    <div className="flex gap-2">
      <Select value={code} onValueChange={(nextCode) => emit(nextCode, local)}>
        <SelectTrigger className="w-[118px] shrink-0" data-testid={testId ? `${testId}-code` : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.code} <span className="text-muted-foreground text-xs">{country.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={local}
        onChange={(e) => emit(code, e.target.value)}
        placeholder={placeholder}
        inputMode="tel"
        data-testid={testId}
      />
    </div>
  );
}
