import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: string;
  prefix?: React.ReactNode;
  keywords?: string[];
};

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  testId?: string;
  allowClear?: boolean;
}

/**
 * Searchable single-select combobox built on shadcn `Command` + `Popover`.
 *
 * Designed as a typeahead picker for moderately large lists (countries,
 * categories, etc.) where a plain native `<Select>` becomes hard to scan.
 * Use `prefix` to render a leading flag or icon, and `keywords` to make
 * an option findable by alternate names (e.g. "USA" → "United States").
 *
 * Note: the project also exposes a separate `SearchableSelect` in
 * `searchable-select.tsx` with a custom slate-themed dropdown — that one
 * powers the B2C onboarding wizards and is intentionally kept around for
 * its visual style.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Type to search...",
  emptyText = "No results found.",
  disabled,
  triggerClassName,
  contentClassName,
  testId,
  allowClear = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {selected?.prefix}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            const opt = options.find((o) => o.value === itemValue);
            if (!opt) return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
            const haystack = [opt.label, ...(opt.keywords ?? [])].join(" ").toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {value && allowClear && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear selection
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  data-testid={testId ? `${testId}-option-${opt.value}` : undefined}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.prefix && <span className="mr-2">{opt.prefix}</span>}
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
