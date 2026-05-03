import { useState } from "react";
import { Plus, Search, MoreVertical, User, Mail, Trash2, Edit2, Users, Globe, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const ROLE_COLORS: Record<string, string> = {
  saas_admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  agency_owner: "bg-primary/10 text-primary",
  agency_staff: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  customer: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pro: "bg-primary/10 text-primary",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deleteB2cId, setDeleteB2cId] = useState<string | null>(null);
  const [b2cEditUser, setB2cEditUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "agency_staff", tenantId: "", password: "" });

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { data: b2cUsers = [], isLoading: b2cLoading } = useQuery<any[]>({ queryKey: ["/api/admin/b2c-users"] });
  const { data: tenants = [] } = useQuery<any[]>({ queryKey: ["/api/admin/tenants"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setCreateOpen(false);
      setForm({ name: "", email: "", role: "agency_staff", tenantId: "", password: "" });
      toast({ title: "User created", description: "The user account has been created." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditUser(null);
      toast({ title: "User updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteUserId(null);
      toast({ title: "User deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateB2cMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/admin/b2c-users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/b2c-users"] });
      setB2cEditUser(null);
      toast({ title: "B2C user updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteB2cMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/b2c-users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/b2c-users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteB2cId(null);
      toast({ title: "B2C user deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const filteredB2c = b2cUsers.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getTenantName = (id: string) => tenants.find((t: any) => t.id === id)?.name ?? id;

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">User Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage agency staff accounts and B2C visa checker users.</p>
          </div>
          <Button className="gap-2" onClick={() => setCreateOpen(true)} data-testid="button-add-user">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10"><Shield className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Agency Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30"><Globe className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{b2cUsers.length}</p>
                <p className="text-sm text-muted-foreground">B2C Visa Checker Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30"><Users className="w-5 h-5 text-emerald-600" /></div>
              <div>
                <p className="text-2xl font-bold">{users.length + b2cUsers.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Tabs defaultValue="agency" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agency" data-testid="tab-agency-users">
              Agency Users
              <Badge variant="secondary" className="ml-2 text-xs">{users.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="b2c" data-testid="tab-b2c-users">
              B2C Users
              <Badge variant="secondary" className="ml-2 text-xs">{b2cUsers.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Agency Users Tab */}
          <TabsContent value="agency" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="saas_admin">SaaS Admin</SelectItem>
                  <SelectItem value="agency_owner">Agency Owner</SelectItem>
                  <SelectItem value="agency_staff">Agency Staff</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Agency</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(user => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {(user.name || user.email)[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] ?? ""}`}>
                              {user.role.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.tenantId ? getTenantName(user.tenantId) : <span className="italic">Platform Admin</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-user-actions-${user.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditUser({ ...user, newPassword: "" })}>
                                  <Edit2 className="w-4 h-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteUserId(user.id)}
                                  disabled={user.id === "user-admin"}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No users found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* B2C Users Tab */}
          <TabsContent value="b2c" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {b2cLoading ? (
                  <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Checks Used</TableHead>
                        <TableHead>Deep Check</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredB2c.map(user => (
                        <TableRow key={user.id} data-testid={`b2c-user-row-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600">
                                {(user.fullName || user.email)[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{user.fullName}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${PLAN_COLORS[user.subscriptionPlan] ?? ""}`}>
                              {user.subscriptionPlan}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{user.freeChecksUsed} / {user.checkLimit}</TableCell>
                          <TableCell>
                            <Badge variant={user.deepCheckAccess ? "default" : "outline"} className="text-xs">
                              {user.deepCheckAccess ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setB2cEditUser({ ...user })}>
                                  <Edit2 className="w-4 h-4 mr-2" />Edit Plan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteB2cId(user.id)}>
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredB2c.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No B2C users yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Agency User</DialogTitle>
            <DialogDescription>Create a new agency staff or owner account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@agency.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency_owner">Agency Owner</SelectItem>
                    <SelectItem value="agency_staff">Agency Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agency</Label>
                <Select value={form.tenantId} onValueChange={v => setForm({ ...form, tenantId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agency" /></SelectTrigger>
                  <SelectContent>
                    {tenants.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Leave blank for default (Welcome@123)" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || !form.email || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agency User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update details for {editUser?.email}</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={editUser.role} onValueChange={v => setEditUser({ ...editUser, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas_admin">SaaS Admin</SelectItem>
                    <SelectItem value="agency_owner">Agency Owner</SelectItem>
                    <SelectItem value="agency_staff">Agency Staff</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Agency</Label>
                <Select value={editUser.tenantId ?? ""} onValueChange={v => setEditUser({ ...editUser, tenantId: v || null })}>
                  <SelectTrigger><SelectValue placeholder="No agency (Platform Admin)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Agency</SelectItem>
                    {tenants.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" value={editUser.newPassword ?? ""} onChange={e => setEditUser({ ...editUser, newPassword: e.target.value })} placeholder="Leave blank to keep current password" />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({ id: editUser.id, data: { name: editUser.name, role: editUser.role, tenantId: editUser.tenantId, ...(editUser.newPassword ? { password: editUser.newPassword } : {}) } })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit B2C User Dialog */}
      <Dialog open={!!b2cEditUser} onOpenChange={() => setB2cEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit B2C User</DialogTitle>
            <DialogDescription>Manage plan and access for {b2cEditUser?.email}</DialogDescription>
          </DialogHeader>
          {b2cEditUser && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Subscription Plan</Label>
                <Select value={b2cEditUser.subscriptionPlan} onValueChange={v => setB2cEditUser({ ...b2cEditUser, subscriptionPlan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Check Limit / Month</Label>
                <Input type="number" value={b2cEditUser.checkLimit} onChange={e => setB2cEditUser({ ...b2cEditUser, checkLimit: parseInt(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Deep Check Access</p>
                  <p className="text-xs text-muted-foreground">Allow AI-powered deep visa assessment</p>
                </div>
                <Switch checked={b2cEditUser.deepCheckAccess} onCheckedChange={v => setB2cEditUser({ ...b2cEditUser, deepCheckAccess: v })} />
              </div>
              <div className="space-y-1.5">
                <Label>Reset Checks Used</Label>
                <Button variant="outline" size="sm" onClick={() => setB2cEditUser({ ...b2cEditUser, freeChecksUsed: 0 })}>
                  Reset to 0
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setB2cEditUser(null)}>Cancel</Button>
            <Button
              onClick={() => updateB2cMutation.mutate({ id: b2cEditUser.id, data: { subscriptionPlan: b2cEditUser.subscriptionPlan, checkLimit: b2cEditUser.checkLimit, deepCheckAccess: b2cEditUser.deepCheckAccess, freeChecksUsed: b2cEditUser.freeChecksUsed } })}
              disabled={updateB2cMutation.isPending}
            >
              {updateB2cMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the user account. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteUserId && deleteMutation.mutate(deleteUserId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete B2C confirmation */}
      <AlertDialog open={!!deleteB2cId} onOpenChange={() => setDeleteB2cId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete B2C User</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the visa checker account. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteB2cId && deleteB2cMutation.mutate(deleteB2cId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
