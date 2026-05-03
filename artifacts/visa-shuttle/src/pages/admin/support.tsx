import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Send, Building2, Loader2, MessageSquare, AlertCircle, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type AdminTicket = {
  id: string;
  tenantId: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  lastMessageAt: string | null;
  lastMessageBy: string | null;
  createdAt: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
};

type AdminTicketDetail = {
  ticket: AdminTicket;
  tenant: { id: string; name: string; slug: string; plan: string } | null;
  messages: {
    id: string;
    ticketId: string;
    authorUserId: string;
    authorRole: string;
    authorName: string | null;
    body: string;
    internalNote: boolean;
    createdAt: string | null;
  }[];
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  normal: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const ticketsQuery = useQuery<AdminTicket[]>({
    queryKey: ["/api/admin/tickets", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/admin/tickets" : `/api/admin/tickets?status=${statusFilter}`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load tickets");
      return r.json();
    },
  });

  const tickets = ticketsQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(t =>
      t.subject.toLowerCase().includes(q)
      || (t.tenantName ?? "").toLowerCase().includes(q)
      || (t.createdByEmail ?? "").toLowerCase().includes(q));
  }, [tickets, search]);

  // Auto-pick the first ticket when none is selected.
  useEffect(() => {
    if (!activeId && filtered.length > 0) setActiveId(filtered[0].id);
  }, [activeId, filtered]);

  const detailQuery = useQuery<AdminTicketDetail>({
    queryKey: ["/api/admin/tickets", activeId],
    queryFn: async () => {
      const r = await fetch(`/api/admin/tickets/${activeId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load ticket");
      return r.json();
    },
    enabled: !!activeId,
  });

  const replyMut = useMutation({
    mutationFn: (data: { body: string; internalNote: boolean }) =>
      apiRequest("POST", `/api/admin/tickets/${activeId}/messages`, data),
    onSuccess: () => {
      setReply("");
      setInternal(false);
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets", activeId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      toast({ title: "Reply posted" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  const patchMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/admin/tickets/${activeId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets", activeId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  const counts = useMemo(() => ({
    all: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    pending: tickets.filter(t => t.status === "pending").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    closed: tickets.filter(t => t.status === "closed").length,
  }), [tickets]);

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><LifeBuoy className="w-6 h-6 text-primary" /> Support</h1>
            <p className="text-muted-foreground text-sm mt-1">Tickets opened by agencies. Reply, set status, and add internal notes.</p>
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All <span className="ml-1.5 text-xs text-muted-foreground">{counts.all}</span></TabsTrigger>
              <TabsTrigger value="open">Open <span className="ml-1.5 text-xs text-muted-foreground">{counts.open}</span></TabsTrigger>
              <TabsTrigger value="pending">Pending <span className="ml-1.5 text-xs text-muted-foreground">{counts.pending}</span></TabsTrigger>
              <TabsTrigger value="resolved">Resolved <span className="ml-1.5 text-xs text-muted-foreground">{counts.resolved}</span></TabsTrigger>
              <TabsTrigger value="closed">Closed <span className="ml-1.5 text-xs text-muted-foreground">{counts.closed}</span></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* List */}
          <div className="space-y-3">
            <Input placeholder="Search subject, agency, email…" value={search} onChange={e => setSearch(e.target.value)} />
            <Card className="p-0 overflow-hidden">
              <div className="max-h-[70vh] overflow-y-auto divide-y">
                {ticketsQuery.isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No tickets found.</div>
                ) : filtered.map(t => (
                  <button key={t.id} onClick={() => setActiveId(t.id)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition ${activeId === t.id ? "bg-muted" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{t.tenantName ?? t.tenantId}</span>
                        </div>
                        <p className="font-medium text-sm truncate">{t.subject}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="secondary" className={STATUS_BADGE[t.status] ?? ""}>{t.status}</Badge>
                          {t.priority !== "normal" && (
                            <Badge variant="secondary" className={PRIORITY_BADGE[t.priority] ?? ""}>{t.priority}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {t.lastMessageAt ? formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: true }) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Detail */}
          <div>
            {!activeId ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground"><MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" /> Select a ticket to view its thread.</CardContent></Card>
            ) : detailQuery.isLoading || !detailQuery.data ? (
              <Card><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
            ) : (() => {
              const { ticket, tenant, messages } = detailQuery.data;
              return (
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Building2 className="w-3.5 h-3.5 inline mr-1" />
                          {tenant?.name ?? ticket.tenantId}
                          {tenant?.plan && <Badge variant="outline" className="ml-2">{tenant.plan}</Badge>}
                          <span className="mx-2">·</span>
                          {ticket.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={ticket.priority} onValueChange={v => patchMut.mutate({ priority: v })}>
                          <SelectTrigger className="w-[110px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={ticket.status} onValueChange={v => patchMut.mutate({ status: v })}>
                          <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y max-h-[60vh] overflow-y-auto">
                      {messages.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">No messages yet.</div>
                      ) : messages.map(m => (
                        <div key={m.id} className={`p-4 ${m.internalNote ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={m.authorRole === "admin" ? "default" : "secondary"}>
                              {m.authorRole === "admin" ? "Platform" : "Agency"}
                            </Badge>
                            <span className="text-sm font-medium">{m.authorName ?? "—"}</span>
                            {m.internalNote && <span className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1"><Lock className="w-3 h-3" /> Internal note</span>}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ))}
                    </div>
                    {ticket.status !== "closed" && (
                      <div className="p-4 border-t space-y-2">
                        <Textarea placeholder={internal ? "Internal note (visible to platform team only)…" : "Reply to the agency…"}
                          value={reply} onChange={e => setReply(e.target.value)} rows={4} />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                            <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} className="rounded border-input" />
                            Internal note (only platform staff see this)
                          </label>
                          <Button onClick={() => replyMut.mutate({ body: reply, internalNote: internal })}
                            disabled={!reply.trim() || replyMut.isPending} className="gap-2">
                            {replyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {internal ? "Add note" : "Send reply"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {ticket.status === "closed" && (
                      <div className="p-4 border-t bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4" /> This ticket is closed. Reopen it to reply.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
