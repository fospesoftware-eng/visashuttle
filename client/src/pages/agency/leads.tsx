import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Mail, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"];

const initialLeads = [
  { id: "1", name: "Alice Cooper", email: "alice@example.com", phone: "+1 234 567 8901", stage: "new", source: "Website", value: 2500, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: "2", name: "Bob Wilson", email: "bob@example.com", phone: "+1 234 567 8902", stage: "contacted", source: "Referral", value: 3200, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { id: "3", name: "Carol Martinez", email: "carol@example.com", phone: "+1 234 567 8903", stage: "qualified", source: "Social Media", value: 4500, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
  { id: "4", name: "David Lee", email: "david@example.com", phone: "+1 234 567 8904", stage: "proposal", source: "Website", value: 5000, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72) },
  { id: "5", name: "Emma Watson", email: "emma@example.com", phone: "+1 234 567 8905", stage: "won", source: "Referral", value: 3800, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96) },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", email: "", phone: "", source: "", notes: "" });

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadsByStage = (stage: string) => filteredLeads.filter(lead => lead.stage === stage);

  const handleAddLead = () => {
    if (newLead.name && newLead.email) {
      setLeads([...leads, {
        id: Date.now().toString(),
        ...newLead,
        stage: "new",
        value: 0,
        createdAt: new Date()
      }]);
      setNewLead({ name: "", email: "", phone: "", source: "", notes: "" });
      setIsDialogOpen(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Leads Pipeline</h1>
            <p className="text-muted-foreground">Manage your sales pipeline and convert leads to cases.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-lead">
                <Plus className="w-4 h-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>Enter the lead's contact information.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    placeholder="Enter name"
                    data-testid="input-lead-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="Enter email"
                    data-testid="input-lead-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="Enter phone number"
                    data-testid="input-lead-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select value={newLead.source} onValueChange={(value) => setNewLead({ ...newLead, source: value })}>
                    <SelectTrigger data-testid="select-lead-source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    placeholder="Add any notes..."
                    data-testid="input-lead-notes"
                  />
                </div>
                <Button onClick={handleAddLead} className="w-full" data-testid="button-submit-lead">
                  Add Lead
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-leads"
            />
          </div>
          <Button variant="outline" className="gap-2" data-testid="button-filter">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 overflow-x-auto">
          {stages.map((stage) => (
            <Card key={stage} className="min-w-[280px]" data-testid={`column-${stage}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                    {stage.replace('_', ' ')}
                    <span className="text-muted-foreground">({getLeadsByStage(stage).length})</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {getLeadsByStage(stage).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No leads</p>
                ) : (
                  getLeadsByStage(stage).map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer space-y-2"
                      data-testid={`lead-card-${lead.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {lead.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.source}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Convert to Case</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {lead.email}
                        </span>
                      </div>
                      {lead.value > 0 && (
                        <p className="text-sm font-semibold text-primary">${lead.value.toLocaleString()}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
