import { useState } from "react";
import { Plus, Search, MoreVertical, Building2, Users, FileText } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";

const tenants = [
  { id: "1", name: "Global Travel Solutions", slug: "global-travel", email: "admin@globaltravel.com", plan: "professional", status: "active", users: 12, cases: 145, createdAt: "2024-01-10" },
  { id: "2", name: "Voyager Travel Agency", slug: "voyager", email: "hello@voyager.com", plan: "enterprise", status: "active", users: 28, cases: 312, createdAt: "2024-01-08" },
  { id: "3", name: "Quick Visa Services", slug: "quick-visa", email: "info@quickvisa.com", plan: "starter", status: "pending", users: 2, cases: 0, createdAt: "2024-01-12" },
  { id: "4", name: "Wanderlust Tours", slug: "wanderlust", email: "team@wanderlust.com", plan: "professional", status: "active", users: 8, cases: 89, createdAt: "2024-01-05" },
  { id: "5", name: "Express Visa Hub", slug: "express-hub", email: "support@expresshub.com", plan: "starter", status: "suspended", users: 3, cases: 45, createdAt: "2023-12-20" },
  { id: "6", name: "Premier Travel Co", slug: "premier", email: "admin@premier.com", plan: "enterprise", status: "active", users: 35, cases: 567, createdAt: "2023-11-15" },
];

export default function AdminTenantsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: "", email: "", plan: "starter" });

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddTenant = () => {
    console.log("Adding tenant:", newTenant);
    setIsDialogOpen(false);
    setNewTenant({ name: "", email: "", plan: "starter" });
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Tenants</h1>
            <p className="text-muted-foreground">Manage travel agency accounts on the platform.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-tenant">
                <Plus className="w-4 h-4" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Tenant</DialogTitle>
                <DialogDescription>Create a new travel agency account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agency Name</Label>
                  <Input
                    id="name"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    placeholder="Enter agency name"
                    data-testid="input-tenant-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    placeholder="Enter admin email"
                    data-testid="input-tenant-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Select value={newTenant.plan} onValueChange={(value) => setNewTenant({ ...newTenant, plan: value })}>
                    <SelectTrigger data-testid="select-tenant-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddTenant} className="w-full" data-testid="button-submit-tenant">
                  Create Tenant
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenants.length}</p>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenants.reduce((acc, t) => acc + t.users, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20">
                <FileText className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenants.reduce((acc, t) => acc + t.cases, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Cases</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-tenants"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Cases</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id} data-testid={`tenant-row-${tenant.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">{tenant.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize font-medium">{tenant.plan}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tenant.status} />
                    </TableCell>
                    <TableCell className="text-center">{tenant.users}</TableCell>
                    <TableCell className="text-center">{tenant.cases}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.createdAt}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-tenant-actions-${tenant.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Edit Tenant</DropdownMenuItem>
                          <DropdownMenuItem>Impersonate</DropdownMenuItem>
                          {tenant.status === "active" ? (
                            <DropdownMenuItem className="text-destructive">Suspend</DropdownMenuItem>
                          ) : tenant.status === "suspended" ? (
                            <DropdownMenuItem>Reactivate</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>Approve</DropdownMenuItem>
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
      </div>
    </DashboardLayout>
  );
}
