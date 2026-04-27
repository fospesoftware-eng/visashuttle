import { useState } from "react";
import { LegalModal } from "@/components/legal-modal";

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  context?: "signup" | "check" | "deepcheck";
}

export function ConsentCheckbox({ checked, onChange, error, context = "signup" }: ConsentCheckboxProps) {
  const [modal, setModal] = useState<"terms" | "privacy" | null>(null);

  const label = context === "check" || context === "deepcheck"
    ? <>I understand this is an <strong>AI estimate, not legal or immigration advice</strong>, and I agree to the{" "}</>
    : <>I agree to the{" "}</>;

  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer select-none group">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            className="sr-only"
            data-testid="input-consent"
          />
          <div
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
              checked
                ? "bg-[#4055FF] border-[#4055FF]"
                : error
                ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                : "border-input bg-background group-hover:border-[#4055FF]/50"
            }`}
            onClick={() => onChange(!checked)}
          >
            {checked && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground leading-relaxed">
          {label}
          <button
            type="button"
            onClick={() => setModal("terms")}
            className="text-[#4055FF] hover:underline font-medium"
          >
            Terms & Conditions
          </button>
          {" "}and{" "}
          <button
            type="button"
            onClick={() => setModal("privacy")}
            className="text-[#4055FF] hover:underline font-medium"
          >
            Privacy Policy
          </button>
          .
        </span>
      </label>

      {error && (
        <p className="text-xs text-red-500 mt-1 ml-7">{error}</p>
      )}

      <LegalModal open={modal !== null} onClose={() => setModal(null)} type={modal ?? "terms"} />
    </div>
  );
}
