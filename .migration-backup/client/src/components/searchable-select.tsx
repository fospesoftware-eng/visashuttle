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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOpen(o => !o)}
        className={`w-full h-10 px-3 text-sm border rounded-lg bg-white flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${open ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>{value || placeholder}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              onClick={e => { e.stopPropagation(); onChange(""); }}
              className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition-colors cursor-pointer"
            >
              <X className="w-2.5 h-2.5 text-slate-600" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
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
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors text-blue-700 border-b border-slate-100"
              >
                <span className="text-slate-400 text-xs">Use:</span>
                <span className="font-medium truncate">{query.trim()}</span>
              </button>
            )}
            {filtered.length === 0 && !showCustomOption ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">No results found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50 transition-colors ${value === opt ? "text-blue-700 font-medium bg-blue-50/60" : "text-slate-700"}`}
                >
                  {opt}
                  {value === opt && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
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
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div
        data-testid={testId}
        onClick={() => setOpen(true)}
        className={`min-h-10 w-full px-3 py-1.5 text-sm border rounded-lg bg-white flex flex-wrap items-center gap-1.5 cursor-text transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${open ? "border-blue-400" : "border-slate-200 hover:border-slate-300"}`}
      >
        {selected.map(s => (
          <span key={s} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
            {s}
            <button type="button" onClick={e => { e.stopPropagation(); remove(s); }} className="hover:text-blue-600">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selected.length === 0 && !open && <span className="text-slate-400">{placeholder}</span>}
        {open && (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 min-w-20 outline-none text-sm text-slate-700"
            placeholder={selected.length > 0 ? "Add more..." : placeholder}
          />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 text-center">
                {remaining.length === 0 ? "All selected" : "No results found"}
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => add(opt)}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors"
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
