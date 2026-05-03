import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search, Mail, Phone, Briefcase, ChevronRight, BadgeCheck, FileText, Globe2,
  AlertTriangle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { CustomerAccount } from "@shared/schema";

type CustomerListRow = CustomerAccount & {
  caseCount: number;
  activeCaseCount: number;
  latestActivityAt: string | null;
  latestPassportNumber: string | null;
  latestPassportNationality: string | null;
  earliestPassportExpiry: string | null;
};

// Parse a `YYYY-MM-DD` (optionally with a time suffix) into a *local* calendar
// date at midnight, so date comparisons are timezone-stable. We strictly
// validate month (1-12) and day (1-31, plus per-month ranges including leap
// years) and reject anything that would silently roll over via JS Date
// normalization (e.g. "2026-13-40").
function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d > daysInMonth[mo - 1]) return null;
  return new Date(y, mo - 1, d);
}

// Calendar-safe "add N months". Avoids the JS `setMonth` rollover bug where,
// e.g., (Aug 31) + 6 months becomes Mar 3 (Feb has no day 31), by clamping
// to the last valid day of the target month.
function addMonths(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth() + months;
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = ((m % 12) + 12) % 12;
  const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const day = Math.min(date.getDate(), daysInMonth[targetMonth]);
  return new Date(targetYear, targetMonth, day);
}

// Returns "expired" if the passport is past its expiry date (today inclusive
// is still valid), "expiring" if it expires within 6 calendar months (most
// embassies require ≥6 months of validity), or null otherwise.
export function getPassportExpiryStatus(
  expiry: string | null | undefined,
): "expired" | "expiring" | null {
  if (!expiry) return null;
  const exp = parseLocalDate(expiry);
  if (!exp) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (exp.getTime() < today.getTime()) return "expired";
  const sixMonths = addMonths(today, 6);
  if (exp.getTime() < sixMonths.getTime()) return "expiring";
  return null;
}

export function fmtPassportExpiry(expiry: string | null | undefined): string {
  if (!expiry) return "—";
  const d = parseLocalDate(expiry);
  if (!d) return expiry;
  return d.toLocaleDateString();
}

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

export default function CustomersPage() {
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery<CustomerListRow[]>({
    queryKey: ["/api/tenants", tenantId, "customers"],
    enabled: !!tenantId,
  });

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      return (
        c.name?.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.latestPassportNumber?.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  return (
    <DashboardLayout type="agency">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Every customer linked to your agency, with their applications and passport details.
            </p>
          </div>
          <Badge variant="secondary" data-testid="badge-customer-count">
            {customers?.length ?? 0} total
          </Badge>
        </div>

        <Card className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or passport number…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-customers"
            />
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Loading customers…
          </Card>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={customers && customers.length === 0 ? "No customers yet" : "No matches"}
            description={
              customers && customers.length === 0
                ? "Customers appear here once they sign in to your white-label portal or you link them to an application."
                : "Try a different search term."
            }
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/app/customers/${c.id}`}
                data-testid={`link-customer-${c.id}`}
              >
                <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer transition">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{initials(c.name, c.email)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" data-testid={`text-customer-name-${c.id}`}>
                          {c.name || "Unnamed customer"}
                        </span>
                        {c.isVerified && (
                          <BadgeCheck className="h-4 w-4 text-emerald-500" aria-label="Verified" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{c.email}</span>
                        </span>
                        {c.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        )}
                        {c.latestPassportNumber && (
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span data-testid={`text-passport-${c.id}`}>{c.latestPassportNumber}</span>
                            {c.latestPassportNationality && (
                              <span className="text-muted-foreground/70">
                                · {c.latestPassportNationality}
                              </span>
                            )}
                          </span>
                        )}
                        {(() => {
                          const status = getPassportExpiryStatus(c.earliestPassportExpiry);
                          if (status === "expired") {
                            return (
                              <span
                                className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium"
                                data-testid={`status-expired-${c.id}`}
                              >
                                <AlertTriangle className="h-3 w-3" />
                                Passport expired ({fmtPassportExpiry(c.earliestPassportExpiry)})
                              </span>
                            );
                          }
                          if (status === "expiring") {
                            return (
                              <span
                                className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium"
                                data-testid={`status-expiring-${c.id}`}
                              >
                                <Clock className="h-3 w-3" />
                                Expires {fmtPassportExpiry(c.earliestPassportExpiry)}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      <Badge variant="outline" data-testid={`badge-applications-${c.id}`}>
                        {c.caseCount} application{c.caseCount === 1 ? "" : "s"}
                      </Badge>
                      <span>Last activity: {fmtDate(c.latestActivityAt)}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
