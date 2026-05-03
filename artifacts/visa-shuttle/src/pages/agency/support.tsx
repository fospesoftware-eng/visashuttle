import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus, Send, MessageSquare, Loader2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-current-user";

type Ticket = {
  id: string; tenantId: string; subject: string; category: string;
  status: string; priority: string;
  lastMessageAt: string | null; lastMessageBy: string | null;
  createdAt: string | null;
};
type ThreadMessage = {
  id: string; ticketId: string; authorUserId: string; authorRole: string;
  authorName: string | null; body: string; internalNote: boolean; createdAt: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default function AgencySupportPage() {
  const meQuery = useCurrentUser();
  const tenantId = meQuery.data?.user?.tenantId ?? null;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "other", priority: "normal", body: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const ticketsQuery = useQuery<Ticket[]>({
    queryKey: ["/api/agency", tenantId, "tickets"],
    queryFn: async () => {
      const r = await fetch(`/api/agency/${tenantId}/tickets`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load tickets");
      return r.json();
    },
    enabled: !!tenantId,
  });

  const tickets = ticketsQuery.data ?? [];
  useEffect(() => {
    if (!activeId && tickets.length > 0) setActiveId(tickets[0].id);
  }, [activeId, tickets]);

  const detailQuery = useQuery<{ ticket: Ticket; messages: ThreadMessage[] }>({
    queryKey: ["/api/agency", tenantId, "tickets", activeId],
    queryFn: async () => {
      const r = await fetch(`/api/agency/${tenantId}/tickets/${activeId}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load ticket");
      return r.json();
    },
    enabled: !!tenantId && !!activeId,
  });

  const replyMut = useMutation({
    mutationFn: (body: string) => apiRequest("POST", `/api/agency/${tenantId}/tickets/${activeId}/messages`, { body }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["/api/agency", tenantId, "tickets", activeId] });
      qc.invalidateQueries({ queryKey: ["/api/agency", tenantId, "tickets"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/agency/${tenantId}/tickets`, data),
    onSuccess: async (res: any) => {
      const ticket = await (res?.json?.() ?? res);
      qc.invalidateQueries({ queryKey: ["/api/agency", tenantId, "tickets"] });
      setCreateOpen(false);
      setForm({ subject: "", category: "other", priority: "normal", body: "" });
      if (ticket?.id) setActiveId(ticket.id);
      toast({ title: "Ticket opened", description: "We'll get back to you shortly." });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><LifeBuoy className="w-6 h-6 text-primary" /> Support</h1>
            <p className="text-muted-foreground text-sm mt-1">Open a ticket with the Visa Shuttle team. We typically reply within one business day.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> New ticket</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card className="p-0 overflow-hidden">
            <div className="max-h-[70vh] overflow-y-auto divide-y">
              {ticketsQuery.isLoading ? (
                <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  No tickets yet. Open one to get help.
                </div>
              ) : tickets.map(t => (
                <button key={t.id} onClick={() => setActiveId(t.id)}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition ${activeId === t.id ? "bg-muted" : ""}`}>
                  <p className="font-medium text-sm truncate">{t.subject}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant="secondary" className={STATUS_BADGE[t.status] ?? ""}>{t.status}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {t.lastMessageAt ? formatDistanceToNow(new Date(t.lastMessageAt), { addSuffix: true }) : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <div>
            {!activeId ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground"><MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" /> Select a ticket or open a new one.</CardContent></Card>
            ) : detailQuery.isLoading || !detailQuery.data ? (
              <Card><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
            ) : (() => {
              const { ticket, messages } = detailQuery.data;
              return (
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={STATUS_BADGE[ticket.status] ?? ""}>{ticket.status}</Badge>
                      <Badge variant="outline">{ticket.category}</Badge>
                      <span className="text-xs text-muted-foreground">{ticket.priority} priority</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y max-h-[60vh] overflow-y-auto">
                      {messages.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">No messages yet.</div>
                      ) : messages.map(m => (
                        <div key={m.id} className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={m.authorRole === "admin" ? "default" : "secondary"}>
                              {m.authorRole === "admin" ? "Visa Shuttle" : "You"}
                            </Badge>
                            <span className="text-sm font-medium">{m.authorName ?? "—"}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {m.createdAt ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: true }) : ""}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ))}
                    </div>
                    {ticket.status !== "closed" ? (
                      <div className="p-4 border-t space-y-2">
                        <Textarea placeholder="Type your reply…" value={reply} onChange={e => setReply(e.target.value)} rows={4} />
                        <div className="flex justify-end">
                          <Button onClick={() => replyMut.mutate(reply)} disabled={!reply.trim() || replyMut.isPending} className="gap-2">
                            {replyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Send reply
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 border-t bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="w-4 h-4" /> This ticket is closed.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a support ticket</DialogTitle>
            <DialogDescription>Tell us what's going on. We'll reply by email and inside this thread.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="feature_request">Feature request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={6} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="What happened? Any error messages? Steps to reproduce?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={!form.subject.trim() || !form.body.trim() || createMut.isPending}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Open ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
