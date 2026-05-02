import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Link as LinkIcon, QrCode, Trash2, Copy, ExternalLink,
  Loader2, Send, ClipboardList, MoreVertical, Search, AlertCircle,
} from "lucide-react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getDocumentChecklist } from "@/data/document-checklists";
import type { Proposal } from "@shared/schema";

// Same generic visa-type list the leads dialog uses, so a proposal works
// even for countries we don't have a structured config for.
const GENERIC_VISA_TYPES = [
  "Tourist Visa", "Business Visa", "Student Visa", "Work Visa",
  "Transit Visa", "Family Visa", "Schengen Visa", "Investor Visa",
];

const POPULAR_COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia",
  "France", "Germany", "Italy", "Spain", "Netherlands",
  "Schengen", "United Arab Emirates", "Singapore", "Japan",
  "South Korea", "New Zealand", "Switzerland",
];

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  viewed: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  applied: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  expired: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  revoked: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
};

type StaffMember = { id: string; name: string; role: string };

function buildShareUrl(token: string): string {
  return `${window.location.origin}/p/${token}`;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProposalsPage() {
  const { data: me } = useCurrentUser();
  const user = me?.user;
  const tenant = me?.tenant;
  const { toast } = useToast();
  const tenantId = tenant?.id ?? user?.tenantId ?? "";

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shareProposal, setShareProposal] = useState<Proposal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Proposal | null>(null);

  const proposalsQuery = useQuery<Proposal[]>({
    queryKey: ["/api/tenants", tenantId, "proposals"],
    enabled: !!tenantId,
  });

  const staffQuery = useQuery<StaffMember[]>({
    queryKey: ["/api/tenants", tenantId, "staff"],
    enabled: !!tenantId,
  });

  const filtered = useMemo(() => {
    const list = proposalsQuery.data ?? [];
    return list.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.customerName.toLowerCase().includes(q)
        || (p.customerEmail ?? "").toLowerCase().includes(q)
        || p.destinationCountry.toLowerCase().includes(q)
        || p.visaType.toLowerCase().includes(q)
      );
    });
  }, [proposalsQuery.data, search, statusFilter]);

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-proposals-title">Proposals</h1>
            <p className="text-sm text-muted-foreground">
              Send a branded application link with a document checklist. The customer applies in one click — no signup needed.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-proposal">
                <Plus className="w-4 h-4 mr-1.5" />
                New Proposal
              </Button>
            </DialogTrigger>
            <ProposalCreateDialog
              tenantId={tenantId}
              defaultAssignee={user?.id ?? ""}
              staff={staffQuery.data ?? []}
              onCreated={(p) => {
                setCreateOpen(false);
                setShareProposal(p);
              }}
            />
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative md:w-72">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, country, visa…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-proposals"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-40" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {proposalsQuery.isLoading ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                <p className="mt-2 text-sm">Loading proposals…</p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Send}
                title={(proposalsQuery.data?.length ?? 0) === 0 ? "No proposals yet" : "No matches"}
                description={
                  (proposalsQuery.data?.length ?? 0) === 0
                    ? "Create your first proposal — we'll generate a shareable link and QR code that lets your client apply in one click."
                    : "Try a different search or status filter."
                }
                actionLabel={(proposalsQuery.data?.length ?? 0) === 0 ? "New Proposal" : undefined}
                onAction={(proposalsQuery.data?.length ?? 0) === 0 ? () => setCreateOpen(true) : undefined}
              />
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pl-4 md:pl-2 pr-2 font-medium">Customer</th>
                      <th className="py-2 px-2 font-medium hidden md:table-cell">Destination / Visa</th>
                      <th className="py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2 font-medium hidden md:table-cell">Created</th>
                      <th className="py-2 pr-4 md:pr-2 pl-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        data-testid={`row-proposal-${p.id}`}
                      >
                        <td className="py-3 pl-4 md:pl-2 pr-2">
                          <div className="font-medium" data-testid={`text-proposal-name-${p.id}`}>{p.customerName}</div>
                          {p.customerEmail && (
                            <div className="text-xs text-muted-foreground">{p.customerEmail}</div>
                          )}
                          <div className="md:hidden text-xs text-muted-foreground mt-0.5">
                            {p.destinationCountry} · {p.visaType}
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div>{p.destinationCountry}</div>
                          <div className="text-xs text-muted-foreground">{p.visaType}</div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={STATUS_STYLES[p.status] ?? ""}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="py-3 pr-4 md:pr-2 pl-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShareProposal(p)}
                              data-testid={`button-share-${p.id}`}
                            >
                              <QrCode className="w-4 h-4 mr-1.5" /> Share
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-menu-${p.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(buildShareUrl(p.token));
                                    toast({ title: "Link copied" });
                                  }}
                                >
                                  <Copy className="w-4 h-4 mr-2" /> Copy link
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={buildShareUrl(p.token)} target="_blank" rel="noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" /> Open link
                                  </a>
                                </DropdownMenuItem>
                                {p.appliedCaseId && (
                                  <DropdownMenuItem asChild>
                                    <a href={`/app/cases/${p.appliedCaseId}`}>
                                      <ClipboardList className="w-4 h-4 mr-2" /> View case
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setConfirmDelete(p)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share dialog with QR + link */}
      <ShareDialog
        proposal={shareProposal}
        onOpenChange={(open) => { if (!open) setShareProposal(null); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              The shareable link will stop working immediately. If the customer has already applied, the resulting case will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!confirmDelete) return;
                try {
                  await apiRequest("DELETE", `/api/tenants/${tenantId}/proposals/${confirmDelete.id}`);
                  await queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "proposals"] });
                  toast({ title: "Proposal deleted" });
                  setConfirmDelete(null);
                } catch (e: any) {
                  toast({ title: "Could not delete", description: e?.message, variant: "destructive" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// =====================================================================
// Create dialog
// =====================================================================

function ProposalCreateDialog({
  tenantId, defaultAssignee, staff, onCreated,
}: {
  tenantId: string;
  defaultAssignee: string;
  staff: StaffMember[];
  onCreated: (p: Proposal) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    destinationCountry: "",
    visaType: "",
    notes: "",
    expiresInDays: "30",
    assignedTo: defaultAssignee,
  });

  useEffect(() => {
    if (defaultAssignee && !form.assignedTo) {
      setForm((f) => ({ ...f, assignedTo: defaultAssignee }));
    }
  }, [defaultAssignee]); // eslint-disable-line

  const checklistPreview = useMemo(() => {
    if (!form.destinationCountry || !form.visaType) return [];
    return getDocumentChecklist(form.destinationCountry, form.visaType);
  }, [form.destinationCountry, form.visaType]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/proposals`, {
        customerName: form.customerName,
        customerEmail: form.customerEmail || null,
        customerPhone: form.customerPhone || null,
        destinationCountry: form.destinationCountry,
        visaType: form.visaType,
        notes: form.notes || null,
        expiresInDays: form.expiresInDays === "never" ? null : Number(form.expiresInDays),
        assignedTo: form.assignedTo || null,
      });
      return res.json() as Promise<Proposal>;
    },
    onSuccess: async (p) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "proposals"] });
      toast({ title: "Proposal created", description: "Share the link or QR with your client." });
      onCreated(p);
    },
    onError: (e: any) => {
      toast({ title: "Could not create proposal", description: e?.message, variant: "destructive" });
    },
  });

  const canSubmit = form.customerName.trim() && form.destinationCountry && form.visaType;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>New Proposal</DialogTitle>
        <DialogDescription>
          Generate a shareable application link for your client. They'll see the document checklist and can apply directly without signing up.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p-name">Customer name <span className="text-red-500">*</span></Label>
            <Input
              id="p-name"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="e.g. Priya Sharma"
              data-testid="input-customer-name"
            />
          </div>
          <div>
            <Label htmlFor="p-email">Customer email</Label>
            <Input
              id="p-email"
              type="email"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              placeholder="optional — used to email the link later"
              data-testid="input-customer-email"
            />
          </div>
          <div>
            <Label htmlFor="p-phone">Customer phone</Label>
            <Input
              id="p-phone"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              placeholder="optional"
              data-testid="input-customer-phone"
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
              <SelectTrigger data-testid="select-assignee">
                <SelectValue placeholder="Pick a team member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} <span className="text-muted-foreground text-xs">({s.role.replace("agency_", "")})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destination country <span className="text-red-500">*</span></Label>
            <Select value={form.destinationCountry} onValueChange={(v) => setForm({ ...form, destinationCountry: v })}>
              <SelectTrigger data-testid="select-country">
                <SelectValue placeholder="Pick a country" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visa type <span className="text-red-500">*</span></Label>
            <Select value={form.visaType} onValueChange={(v) => setForm({ ...form, visaType: v })}>
              <SelectTrigger data-testid="select-visa-type">
                <SelectValue placeholder="Pick a visa type" />
              </SelectTrigger>
              <SelectContent>
                {GENERIC_VISA_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link expires in</Label>
            <Select value={form.expiresInDays} onValueChange={(v) => setForm({ ...form, expiresInDays: v })}>
              <SelectTrigger data-testid="select-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="p-notes">Message to the client (optional)</Label>
          <Textarea
            id="p-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Hi Priya — please complete this short application so we can start your visa process. Let me know if you have any questions!"
            rows={3}
            data-testid="input-notes"
          />
        </div>

        {checklistPreview.length > 0 && (
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <ClipboardList className="w-4 h-4" />
              Documents your client will see ({checklistPreview.length})
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
              {checklistPreview.map((d) => (
                <li key={d.type} className="flex gap-1.5">
                  <span className={d.required ? "text-red-500" : "text-muted-foreground"}>•</span>
                  <span>
                    <span className="text-foreground">{d.name}</span>
                    {!d.required && <span className="text-muted-foreground"> (optional)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          data-testid="button-create-proposal"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Create & get link
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// =====================================================================
// Share dialog (QR + copy link)
// =====================================================================

function ShareDialog({
  proposal, onOpenChange,
}: {
  proposal: Proposal | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = proposal ? buildShareUrl(proposal.token) : "";

  useEffect(() => {
    let cancelled = false;
    if (!proposal) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(buildShareUrl(proposal.token), {
      width: 320,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    }).catch(() => {
      if (!cancelled) setQrDataUrl(null);
    });
    return () => { cancelled = true; };
  }, [proposal?.token]); // eslint-disable-line

  return (
    <Dialog open={!!proposal} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share with your client</DialogTitle>
          <DialogDescription>
            Send this link by email/WhatsApp, or print the QR for in-person handoff.
          </DialogDescription>
        </DialogHeader>

        {proposal && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{proposal.customerName}</span>
              {" · "}{proposal.destinationCountry} · {proposal.visaType}
            </div>

            <div className="flex justify-center bg-white rounded-md p-4 border">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Proposal QR code" className="w-56 h-56" data-testid="img-qr-code" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input value={url} readOnly className="font-mono text-xs" data-testid="input-share-url" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast({ title: "Link copied" });
                }}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1" data-testid="button-open-link">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1.5" /> Preview
                </a>
              </Button>
              {qrDataUrl && (
                <Button asChild variant="outline" data-testid="button-download-qr">
                  <a href={qrDataUrl} download={`proposal-${proposal.token.slice(0, 8)}.png`}>
                    <QrCode className="w-4 h-4 mr-1.5" /> Download QR
                  </a>
                </Button>
              )}
            </div>

            {proposal.customerEmail && (
              <Button
                variant="default"
                className="w-full"
                asChild
                data-testid="button-email-link"
              >
                <a
                  href={`mailto:${proposal.customerEmail}?subject=${encodeURIComponent(`Your ${proposal.destinationCountry} ${proposal.visaType} application`)}&body=${encodeURIComponent(`Hi ${proposal.customerName},\n\nPlease use this link to start your application — it includes the full document checklist:\n\n${url}\n\nLet me know if you have any questions.`)}`}
                >
                  <LinkIcon className="w-4 h-4 mr-1.5" /> Email this link
                </a>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
