import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ExternalLink, Search, MapPin, Globe, Calendar, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface SchengenCountry {
  name: string;
  iso2: string;
  slug: string;
  atlysSlug: string;
  isTracked: boolean;
}

interface SchengenSummary {
  countriesWithSlots: number;
  totalCountries: number;
  totalCities: number;
  earliestCountry: string;
  earliestDate: string;
  mostAvailability: string;
  mostCities: number;
}

interface SchengenData {
  summary: SchengenSummary;
  countries: SchengenCountry[];
  lastUpdated: string;
  source: string;
  sourceUrl: string;
}

function countryFlag(iso2: string) {
  return iso2.toUpperCase().replace(/./g, (char) =>
    String.fromCodePoint(127397 + char.charCodeAt(0))
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 bg-background`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${color}`}>
        ● {label}
      </p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

type Filter = "all" | "slots" | "no-slots";

export default function SchengenSlotsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [lastRefreshLabel, setLastRefreshLabel] = useState("");

  const { data, isLoading, error, dataUpdatedAt, refetch, isFetching } = useQuery<SchengenData>({
    queryKey: ["/api/schengen-slots"],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  useEffect(() => {
    if (!dataUpdatedAt) return;
    const update = () => {
      const diff = Math.floor((Date.now() - dataUpdatedAt) / 1000);
      if (diff < 60) setLastRefreshLabel("just now");
      else if (diff < 3600) setLastRefreshLabel(`${Math.floor(diff / 60)}m ago`);
      else setLastRefreshLabel(`${Math.floor(diff / 3600)}h ago`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  const countries = data?.countries ?? [];

  const filtered = countries.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "slots" && c.isTracked) ||
      (filter === "no-slots" && !c.isTracked);
    return matchSearch && matchFilter;
  });

  const atlysCountryUrl = (country: SchengenCountry) =>
    `https://www.atlys.com/appointments/schengen/india/${country.atlysSlug}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div
        className="relative py-14 px-4 text-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--background)) 60%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* subtle decorative dots */}
          {["10%,20%", "80%,15%", "50%,85%", "25%,70%", "75%,60%"].map((pos, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary/5"
              style={{
                width: 120 + i * 40,
                height: 120 + i * 40,
                left: pos.split(",")[0],
                top: pos.split(",")[1],
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live Schengen Slots · Updated Continuously
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Schengen Visa Appointment
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #7033F0, #4055FF, #FF2060)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Availability from India
            </span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            The earliest available slot for every Schengen country. Data sourced
            live from{" "}
            <a
              href="https://www.atlys.com/appointments/schengen/india"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Atlys
            </a>{" "}
            and refreshed every 5 minutes.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        {/* Summary stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <SummaryCard
              label="Countries with Slots"
              value={`${data.summary.countriesWithSlots} / ${data.summary.totalCountries}`}
              sub="Live right now"
              color="text-green-500"
            />
            <SummaryCard
              label="Total Open Cities"
              value={data.summary.totalCities}
              sub="Across Schengen"
              color="text-blue-500"
            />
            <SummaryCard
              label="Earliest Slot"
              value={data.summary.earliestDate}
              sub={data.summary.earliestCountry}
              color="text-violet-500"
            />
            <SummaryCard
              label="Most Availability"
              value={data.summary.mostAvailability}
              sub={`${data.summary.mostCities} cities open`}
              color="text-amber-500"
            />
          </div>
        ) : null}

        {/* Info banner */}
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 mb-6 text-sm text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Slot counts and exact dates are loaded live on Atlys.com. Click{" "}
            <strong>View Slots</strong> on any country card to see real-time
            availability and book directly.
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search country…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-country"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "slots", "no-slots"] as Filter[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                data-testid={`button-filter-${f}`}
                className="capitalize"
              >
                {f === "all" ? "All Countries" : f === "slots" ? "With Slots" : "No Slots"}
              </Button>
            ))}
          </div>
        </div>

        {/* Country grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-muted-foreground">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Could not load slot data</p>
            <p className="text-sm mt-1">Check your connection and try refreshing</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No countries match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((country) => (
              <CountryCard
                key={country.iso2}
                country={country}
                atlysUrl={atlysCountryUrl(country)}
              />
            ))}
          </div>
        )}

        {/* Refresh bar */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            {lastRefreshLabel ? `Refreshed ${lastRefreshLabel}` : "Fetching…"}
            &nbsp;·&nbsp; Auto-refreshes every 5 min
          </span>
          <a
            href="https://www.atlys.com/appointments/schengen/india"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Source: Atlys <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function CountryCard({
  country,
  atlysUrl,
}: {
  country: SchengenCountry;
  atlysUrl: string;
}) {
  const flag = countryFlag(country.iso2);

  return (
    <div
      className="group rounded-xl border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col"
      data-testid={`card-country-${country.iso2}`}
    >
      <div className="p-4 flex-1">
        {/* Top row: flag + name + badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl leading-none" role="img" aria-label={country.name}>
              {flag}
            </span>
            <div>
              <p className="font-semibold text-sm leading-tight">
                {country.name === "Czechia" ? "Czech Republic" : country.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> From India
              </p>
            </div>
          </div>
          {country.isTracked ? (
            <Badge
              className="text-xs px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 flex-shrink-0"
              variant="outline"
            >
              ● Live
            </Badge>
          ) : (
            <Badge
              className="text-xs px-2 py-0.5 bg-muted text-muted-foreground flex-shrink-0"
              variant="outline"
            >
              No slots tracked
            </Badge>
          )}
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {country.isTracked ? (
            <>
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                VFS / BLS centers tracked
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                See live dates →
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              No appointment centers tracked yet
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-4">
        <a
          href={atlysUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`link-view-slots-${country.iso2}`}
        >
          <Button
            variant={country.isTracked ? "default" : "outline"}
            size="sm"
            className={`w-full gap-1.5 ${
              country.isTracked
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
                : ""
            }`}
          >
            {country.isTracked ? "View Live Slots" : "Check on Atlys"}
            <ExternalLink className="w-3 h-3" />
          </Button>
        </a>
      </div>
    </div>
  );
}
