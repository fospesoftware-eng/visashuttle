import { useMemo, useState } from "react";
import { Search, Building2, ClipboardList, UserPlus, Send, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// Cross-tenant Operations console for the saas_admin. Shows every Case,
// Lead, and Proposal across the whole platform with shared filters
// (search + tenant) per tab.

type AdminCase = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  tenantPlan: string | null;
  referenceId: string;
  caseNumber: string | null;
  applicantName: string | null;
  destinationCountry: string | null;
  visaType: string | null;
  status: string;
  visaStage: string | null;
  createdAt: string | null;
};

type AdminLead = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  // schema field is `stage`, not `status` — values are
  // new | contacted | qualified | proposal | won | lost
  stage: string;
  destinationCountry: string | null;
  visaType: string | null;
  createdAt: string | null;
};

type AdminProposal = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  token: string;
  customerName: string;
  customerEmail: string | null;
  destinationCountry: string;
  visaType: string;
  status: string;
  estimateAmountCents: number | null;
  appliedCaseId: string | null;
  createdAt: string | null;
};

const CASE_STAGE_COLORS: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

const LEAD_STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  qualified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  won: "bg-primary/10 text-primary",
  lost: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  viewed: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  applied: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  expired: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  revoked: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

function fmtTimeAgo(d: string | null): string {
  if (!d) return "—";
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "—";
  }
}

function fmtMoney(cents: number | null, currency = "USD"): string {
  if (cents === null || cents === undefined) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function TenantCell({ name, slug }: { name: string | null; slug: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="truncate" title={slug ?? undefined}>{name}</span>
    </div>
  );
}

export default function AdminOperationsPage() {
  const [tab, setTab] = useState<"cases" | "leads" | "proposals">("cases");
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const tenantsQuery = useQuery<any[]>({ queryKey: ["/api/admin/tenants"] });
  const casesQuery = useQuery<AdminCase[]>({ queryKey: ["/api/admin/cases"] });
  const leadsQuery = useQuery<AdminLead[]>({ queryKey: ["/api/admin/leads"] });
  const proposalsQuery = useQuery<AdminProposal[]>({ queryKey: ["/api/admin/proposals"] });

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (casesQuery.data ?? []).filter((c) => {
      if (tenantFilter !== "all" && c.tenantId !== tenantFilter) return false;
      if (statusFilter !== "all" && (c.visaStage ?? "not_started") !== statusFilter) return false;
      if (!q) return true;
      return (
        (c.applicantName ?? "").toLowerCase().includes(q)
        || c.referenceId.toLowerCase().includes(q)
        || (c.caseNumber ?? "").toLowerCase().includes(q)
        || (c.destinationCountry ?? "").toLowerCase().includes(q)
        || (c.visaType ?? "").toLowerCase().includes(q)
        || (c.tenantName ?? "").toLowerCase().includes(q)
      );
    });
  }, [casesQuery.data, search, tenantFilter, statusFilter]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (leadsQuery.data ?? []).filter((l) => {
      if (tenantFilter !== "all" && l.tenantId !== tenantFilter) return false;
      if (statusFilter !== "all" && l.stage !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q)
        || (l.email ?? "").toLowerCase().includes(q)
        || (l.phone ?? "").toLowerCase().includes(q)
        || (l.destinationCountry ?? "").toLowerCase().includes(q)
        || (l.tenantName ?? "").toLowerCase().includes(q)
      );
    });
  }, [leadsQuery.data, search, tenantFilter, statusFilter]);

  const filteredProposals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (proposalsQuery.data ?? []).filter((p) => {
      if (tenantFilter !== "all" && p.tenantId !== tenantFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.customerName.toLowerCase().includes(q)
        || (p.customerEmail ?? "").toLowerCase().includes(q)
        || p.destinationCountry.toLowerCase().includes(q)
        || p.visaType.toLowerCase().includes(q)
        || (p.tenantName ?? "").toLowerCase().includes(q)
      );
    });
  }, [proposalsQuery.data, search, tenantFilter, statusFilter]);

  // Reset tab-specific status filter when switching tabs.
  const onTabChange = (v: string) => {
    setTab(v as typeof tab);
    setStatusFilter("all");
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-operations-title">
            Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Every case, lead, and proposal across all agencies on the platform.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative md:w-72">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search across all agencies…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="w-48" data-testid="select-tenant">
                    <SelectValue placeholder="All agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agencies</SelectItem>
                    {(tenantsQuery.data ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44" data-testid="select-status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {tab === "cases" && (
                      <>
                        <SelectItem value="not_started">Not started</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </>
                    )}
                    {tab === "leads" && (
                      <>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </>
                    )}
                    {tab === "proposals" && (
                      <>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="viewed">Viewed</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="revoked">Revoked</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={onTabChange}>
              <TabsList>
                <TabsTrigger value="cases" data-testid="tab-cases">
                  <ClipboardList className="w-4 h-4 mr-1.5" />
                  Cases
                  <Badge variant="secondary" className="ml-2">
                    {casesQuery.data?.length ?? 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="leads" data-testid="tab-leads">
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Leads
                  <Badge variant="secondary" className="ml-2">
                    {leadsQuery.data?.length ?? 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="proposals" data-testid="tab-proposals">
                  <Send className="w-4 h-4 mr-1.5" />
                  Proposals
                  <Badge variant="secondary" className="ml-2">
                    {proposalsQuery.data?.length ?? 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cases" className="mt-4">
                {casesQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Applicant</TableHead>
                          <TableHead>Agency</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCases.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No cases match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : filteredCases.map((c) => (
                          <TableRow key={c.id} data-testid={`row-case-${c.id}`}>
                            <TableCell className="font-mono text-xs">
                              <a
                                href={c.tenantSlug ? `/w/${c.tenantSlug}/portal/case/${c.id}` : "#"}
                                className="hover:underline inline-flex items-center gap-1"
                                data-testid={`link-case-${c.id}`}
                              >
                                {c.referenceId}
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{c.applicantName ?? "—"}</div>
                              {c.caseNumber && (
                                <div className="text-xs text-muted-foreground">{c.caseNumber}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <TenantCell name={c.tenantName} slug={c.tenantSlug} />
                            </TableCell>
                            <TableCell>
                              <div>{c.destinationCountry ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">{c.visaType ?? ""}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={CASE_STAGE_COLORS[c.visaStage ?? "not_started"] ?? ""}>
                                {(c.visaStage ?? "not_started").replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {fmtTimeAgo(c.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="leads" className="mt-4">
                {leadsQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Agency</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No leads match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : filteredLeads.map((l) => (
                          <TableRow key={l.id} data-testid={`row-lead-${l.id}`}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell className="text-sm">
                              {l.email && <div>{l.email}</div>}
                              {l.phone && <div className="text-muted-foreground text-xs">{l.phone}</div>}
                              {!l.email && !l.phone && <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <TenantCell name={l.tenantName} slug={l.tenantSlug} />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {l.source ?? "—"}
                            </TableCell>
                            <TableCell>
                              <div>{l.destinationCountry ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">{l.visaType ?? ""}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={LEAD_STAGE_COLORS[l.stage] ?? ""}>
                                {l.stage}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {fmtTimeAgo(l.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="proposals" className="mt-4">
                {proposalsQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Agency</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Estimate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProposals.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No proposals match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : filteredProposals.map((p) => (
                          <TableRow key={p.id} data-testid={`row-proposal-${p.id}`}>
                            <TableCell>
                              <div className="font-medium">{p.customerName}</div>
                              {p.customerEmail && (
                                <div className="text-xs text-muted-foreground">{p.customerEmail}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <TenantCell name={p.tenantName} slug={p.tenantSlug} />
                            </TableCell>
                            <TableCell>
                              <div>{p.destinationCountry}</div>
                              <div className="text-xs text-muted-foreground">{p.visaType}</div>
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {fmtMoney(p.estimateAmountCents)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={PROPOSAL_STATUS_COLORS[p.status] ?? ""}>
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {fmtTimeAgo(p.createdAt)}
                            </TableCell>
                            <TableCell>
                              <a
                                href={`/p/${p.token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm hover:underline"
                                data-testid={`link-proposal-${p.id}`}
                              >
                                Open <ExternalLink className="w-3 h-3" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
