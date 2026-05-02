import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, ArrowUpDown, Eye, Copy, Check, ExternalLink, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { ProgressRing } from "@/components/progress-ring";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Case } from "@shared/schema";

function computeReadiness(c: Case): number {
  if (c.status === "approved") return 100;
  if (c.status === "submitted" || c.status === "under_review") return 85;
  if (c.status === "in_progress") return 60;
  if (c.status === "documents_required") return 40;
  return 20;
}

interface CasesPageProps {
  defaultStatusFilter?: string;
  pageTitle?: string;
  pageSubtitle?: string;
}

const PENDING_COMPLETED_STATUSES = [
  "pending", "in_progress", "documents_required", "under_review", "submitted", "approved",
];

export default function CasesPage({
  defaultStatusFilter = "all",
  pageTitle = "Applications",
  pageSubtitle,
}: CasesPageProps = {}) {
  const search = useSearch();
  const initialQ = new URLSearchParams(search).get("q") || "";
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const isPendingCompletedView = defaultStatusFilter === "pending-completed";
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  // Keep search input synced with URL changes (e.g. from header search)
  useEffect(() => {
    const q = new URLSearchParams(search).get("q") || "";
    setSearchTerm(q);
  }, [search]);

  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const agencySlug = authData?.tenantSlug || localStorage.getItem("agency_tenant_slug") || "demo-agency";

  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ["/api/tenants", tenantId, "cases"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });

  const getCustomerLink = (referenceId: string) =>
    `${window.location.origin}/w/${agencySlug}/login?ref=${referenceId}`;

  const copyCustomerLink = (referenceId: string, caseId: string) => {
    navigator.clipboard.writeText(getCustomerLink(referenceId));
    setCopiedId(caseId);
    toast({ title: "Link copied!", description: "Customer portal link copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCases = cases
    .filter(c => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        (c.applicantName || "").toLowerCase().includes(term) ||
        (c.caseNumber || "").toLowerCase().includes(term) ||
        (c.referenceId || "").toLowerCase().includes(term) ||
        (c.visaType || "").toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending-completed"
          ? PENDING_COMPLETED_STATUSES.includes(c.status)
          : c.status === statusFilter;
      const matchesScope = isPendingCompletedView
        ? PENDING_COMPLETED_STATUSES.includes(c.status)
        : true;
      return matchesSearch && matchesStatus && matchesScope;
    })
    .sort((a, b) => {
      const cmp = a.caseNumber.localeCompare(b.caseNumber, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">{pageTitle}</h1>
            <p className="text-muted-foreground">
              {pageSubtitle ?? (
                isPendingCompletedView
                  ? `${filteredCases.length} active or completed application${filteredCases.length !== 1 ? "s" : ""} · drafts and rejections are hidden.`
                  : `${cases.length} total application${cases.length !== 1 ? "s" : ""} · manage progress and share customer links.`
              )}
            </p>
          </div>
          <Button asChild className="gap-2" data-testid="button-new-case">
            <Link href="/app/cases/new">
              <Plus className="w-4 h-4" />
              New Application
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, case number, reference ID, or visa type…"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-cases"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {isPendingCompletedView ? (
                <>
                  <SelectItem value="pending-completed">All (Pending & Completed)</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="documents_required">Documents Required</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved (Completed)</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Drafts</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="documents_required">Documents Required</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="text-center py-20">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">
              {cases.length === 0 ? "No applications yet." : "No applications match your filters."}
            </p>
            {cases.length === 0 && (
              <Button asChild className="mt-4 gap-2">
                <Link href="/app/cases/new">
                  <Plus className="w-4 h-4" /> Create First Application
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 -ml-3"
                          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                          data-testid="button-sort-case-number"
                        >
                          Case # {sortDir === "asc" ? "↑" : "↓"}
                          <ArrowUpDown className="w-3 h-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Visa Type</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Readiness</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map((c) => (
                      <TableRow key={c.id} data-testid={`case-row-${c.id}`}>
                        <TableCell className="font-mono text-xs">
                          <Link href={`/app/cases/${c.id}`} asChild>
                            <a className="text-primary hover:underline font-medium cursor-pointer">{c.caseNumber}</a>
                          </Link>
                          {c.referenceId && (
                            <p className="text-muted-foreground text-xs mt-0.5">{c.referenceId}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {c.applicantName || <span className="text-muted-foreground italic">Untitled draft</span>}
                            </p>
                            {c.applicantDob && (
                              <p className="text-xs text-muted-foreground">DOB: {c.applicantDob}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{c.visaType}</TableCell>
                        <TableCell>{c.destinationCountry || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <ProgressRing value={computeReadiness(c)} size={40} strokeWidth={3} />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-case-actions-${c.id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLocation(`/app/cases/${c.id}`)}
                                data-testid={`button-view-case-${c.id}`}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {c.referenceId && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => copyCustomerLink(c.referenceId!, c.id)}
                                    data-testid={`button-copy-link-${c.id}`}
                                  >
                                    {copiedId === c.id ? (
                                      <Check className="w-4 h-4 mr-2 text-green-600" />
                                    ) : (
                                      <Copy className="w-4 h-4 mr-2" />
                                    )}
                                    Copy Customer Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => window.open(getCustomerLink(c.referenceId!), "_blank")}
                                    data-testid={`button-open-portal-${c.id}`}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open Customer Portal
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Showing {filteredCases.length} of {cases.length} application{cases.length !== 1 ? "s" : ""}</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
