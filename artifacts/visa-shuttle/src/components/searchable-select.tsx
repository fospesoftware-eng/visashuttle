import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  allowCustom?: boolean;
  "data-testid"?: string;
}

export function SearchableSelect({
  options, value, onChange, placeholder = "Search...", label, required, allowCustom, "data-testid": testId
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.length > 0
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const showCustomOption = allowCustom && query.trim().length > 0 && !options.some(o => o.toLowerCase() === query.toLowerCase());

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); }
  }, [open]);

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOpen(o => !o)}
        className={`flex h-12 w-full items-center justify-between gap-2 rounded-2xl border bg-white px-4 text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-4 dark:bg-slate-950 ${
          open
            ? "border-primary ring-primary/15"
            : value
              ? "border-primary/35 text-slate-950 dark:text-white"
              : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
        }`}
      >
        <span className={`min-w-0 truncate ${value ? "text-slate-950 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{value || placeholder}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-slate-200 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <X className="h-3 w-3 text-slate-600 dark:text-slate-300" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
              <Search className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {showCustomOption && (
              <button
                type="button"
                onClick={() => select(query.trim())}
                className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-left text-sm text-primary transition-colors hover:bg-primary/10 dark:border-slate-800 dark:hover:bg-primary/15"
              >
                <span className="text-xs text-muted-foreground">Use:</span>
                <span className="font-medium truncate">{query.trim()}</span>
              </button>
            )}
            {filtered.length === 0 && !showCustomOption ? (
              <div className="px-4 py-4 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/15 ${
                    value === opt
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {opt}
                  {value === opt && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface MultiSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  "data-testid"?: string;
}

export function MultiSearchableSelect({ options, value, onChange, placeholder = "Search countries...", label, "data-testid": testId }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? value.split(", ").filter(Boolean) : [];
  const remaining = options.filter(o => !selected.includes(o));
  const filtered = query.length > 0
    ? remaining.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : remaining;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); }
  }, [open]);

  function add(opt: string) {
    const newSelected = [...selected, opt];
    onChange(newSelected.join(", "));
    setQuery("");
  }

  function remove(opt: string) {
    onChange(selected.filter(s => s !== opt).join(", "));
  }

  return (
    <div className="relative" ref={ref}>
      {label && <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</label>}
      <div
        data-testid={testId}
        onClick={() => setOpen(true)}
        className={`flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-2xl border bg-white px-3 py-2 text-sm shadow-sm transition-all focus-within:ring-4 dark:bg-slate-950 ${
          open
            ? "border-primary ring-primary/15"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
        }`}
      >
        {selected.map(s => (
          <span key={s} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {s}
            <button type="button" onClick={e => { e.stopPropagation(); remove(s); }} className="hover:text-primary/70">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selected.length === 0 && !open && <span className="px-1 text-slate-500 dark:text-slate-400">{placeholder}</span>}
        {open && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="min-w-20 flex-1 bg-transparent text-sm text-slate-800 outline-none dark:text-slate-200"
            placeholder={selected.length > 0 ? "Add more..." : placeholder}
          />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950">
          <div className="max-h-48 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                {remaining.length === 0 ? "All selected" : "No results found"}
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => add(opt)}
                  className="w-full px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary dark:text-slate-200 dark:hover:bg-primary/15"
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
