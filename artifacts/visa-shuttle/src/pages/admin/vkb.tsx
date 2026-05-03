import { useState } from "react";
import { Plus, Search, Globe, FileText, Edit, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BLANK_FORM = {
  country: "",
  visaType: "",
  processingTime: "",
  fees: "",
  notes: "",
  isActive: true,
};

export default function AdminVKBPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/visa-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/visa-templates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/visa-templates"] });
      setCreateOpen(false);
      setForm({ ...BLANK_FORM });
      toast({ title: "Template created", description: "Visa template has been added to the knowledge base." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/visa-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/visa-templates"] });
      setEditTemplate(null);
      toast({ title: "Template updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/visa-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/visa-templates"] });
      setDeleteId(null);
      toast({ title: "Template deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = templates.filter(t =>
    t.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.visaType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const reqCount = (t: any) => {
    const r = t.requirements;
    if (Array.isArray(r)) return r.length;
    if (r && typeof r === "object" && Array.isArray(r.documents)) return r.documents.length;
    return 0;
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Visa Knowledge Base</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage visa templates and document requirements for agencies.</p>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)} data-testid="button-add-template">
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xl font-bold">{templates.length}</p><p className="text-sm text-muted-foreground">Total Templates</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xl font-bold">{templates.filter(t => t.isActive).length}</p><p className="text-sm text-muted-foreground">Active Templates</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xl font-bold">{new Set(templates.map(t => t.country)).size}</p><p className="text-sm text-muted-foreground">Countries Covered</p></CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by country or visa type…" className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} data-testid="input-search-templates" />
        </div>

        {/* Template cards */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(template => (
              <Card key={template.id} className="hover-elevate" data-testid={`template-card-${template.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{template.country}</p>
                        <p className="text-xs text-muted-foreground">{template.visaType}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="text-[10px]">v{template.version}</Badge>
                      {template.isActive
                        ? <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Active</span>
                        : <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><XCircle className="w-3 h-3" />Inactive</span>
                      }
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm mb-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Documents</span>
                      <span className="font-medium text-foreground">{reqCount(template)}</span>
                    </div>
                    {template.processingTime && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Processing</span>
                        <span>{template.processingTime}</span>
                      </div>
                    )}
                    {template.fees && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Fees</span>
                        <span className="font-medium text-foreground">{template.fees}</span>
                      </div>
                    )}
                    {template.updatedAt && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Updated</span>
                        <span>{format(new Date(template.updatedAt), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setEditTemplate({ ...template })}>
                      <Edit className="w-3 h-3" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={() => setDeleteId(template.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 py-16 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p>No visa templates found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Visa Template</DialogTitle>
            <DialogDescription>Create a new visa requirements template for the knowledge base.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. France" />
              </div>
              <div className="space-y-1.5">
                <Label>Visa Type *</Label>
                <Input value={form.visaType} onChange={e => setForm({ ...form, visaType: e.target.value })} placeholder="e.g. Tourist Visa" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Processing Time</Label>
                <Input value={form.processingTime} onChange={e => setForm({ ...form, processingTime: e.target.value })} placeholder="e.g. 15 working days" />
              </div>
              <div className="space-y-1.5">
                <Label>Fees</Label>
                <Input value={form.fees} onChange={e => setForm({ ...form, fees: e.target.value })} placeholder="e.g. €80" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes or requirements…" rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Available to agencies</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ ...form, requirements: { documents: [] }, version: 1 })}
              disabled={!form.country || !form.visaType || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Visa Template</DialogTitle>
            <DialogDescription>{editTemplate?.country} — {editTemplate?.visaType}</DialogDescription>
          </DialogHeader>
          {editTemplate && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={editTemplate.country} onChange={e => setEditTemplate({ ...editTemplate, country: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Visa Type</Label>
                  <Input value={editTemplate.visaType} onChange={e => setEditTemplate({ ...editTemplate, visaType: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Processing Time</Label>
                  <Input value={editTemplate.processingTime ?? ""} onChange={e => setEditTemplate({ ...editTemplate, processingTime: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fees</Label>
                  <Input value={editTemplate.fees ?? ""} onChange={e => setEditTemplate({ ...editTemplate, fees: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={editTemplate.notes ?? ""} onChange={e => setEditTemplate({ ...editTemplate, notes: e.target.value })} rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">Available to agencies</p>
                </div>
                <Switch checked={editTemplate.isActive} onCheckedChange={v => setEditTemplate({ ...editTemplate, isActive: v })} />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({ id: editTemplate.id, data: { country: editTemplate.country, visaType: editTemplate.visaType, processingTime: editTemplate.processingTime, fees: editTemplate.fees, notes: editTemplate.notes, isActive: editTemplate.isActive, version: editTemplate.version + 1 } })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the visa template from the knowledge base. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
