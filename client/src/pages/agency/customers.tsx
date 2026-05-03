import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search, Mail, Phone, Briefcase, ChevronRight, BadgeCheck, FileText, Globe2,
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
};

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
                ? "Customers appear here once they sign in to your white-label portal or you link them to a case."
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
                      </div>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      <Badge variant="outline" data-testid={`badge-cases-${c.id}`}>
                        {c.caseCount} case{c.caseCount === 1 ? "" : "s"}
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
