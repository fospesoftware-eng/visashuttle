import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Users, Briefcase, FileText, BarChart3, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Bell, Search,
  Menu, X, Building2, ShieldCheck, Database, Activity, Globe,
  CheckCircle, AlertCircle, Inbox, Receipt, Banknote, ClipboardList,
  Send, Stamp, Loader2, XCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser } from "@/hooks/use-current-user";
import { queryClient } from "@/lib/queryClient";
import type { ActivityLog } from "@shared/schema";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  children?: NavItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  type: "admin" | "agency";
}

const adminNavItems: NavItem[] = [
  { icon: Home, label: "Dashboard", href: "/admin" },
  { icon: Building2, label: "Agencies", href: "/admin/tenants" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: Database, label: "Visa Knowledge", href: "/admin/vkb" },
  { icon: ShieldCheck, label: "AI Governance", href: "/admin/ai" },
  { icon: Activity, label: "Audit Logs", href: "/admin/audit" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

const agencyNavItems: NavItem[] = [
  { icon: Home, label: "Dashboard", href: "/app" },
  { icon: Users, label: "Leads", href: "/app/leads" },
  { icon: Send, label: "Proposals", href: "/app/proposals" },
  {
    icon: Briefcase, label: "Applications", href: "/app/cases",
    children: [
      { icon: ClipboardList, label: "Processing", href: "/app/cases/processing" },
      { icon: CheckCircle, label: "Completed", href: "/app/cases/completed" },
    ],
  },
  {
    // Post-submission visa workflow — once an application is lodged with
    // the embassy / VFS / eVisa portal it surfaces here with a granular
    // sub-status (waiting docs, biometric pending, passport received, etc).
    icon: Stamp, label: "Visa", href: "/app/visa/processing",
    children: [
      { icon: Loader2,     label: "Processing", href: "/app/visa/processing" },
      { icon: CheckCircle, label: "Approved",   href: "/app/visa/approved" },
      { icon: XCircle,     label: "Rejected",   href: "/app/visa/rejected" },
    ],
  },
  { icon: FileText, label: "Documents", href: "/app/documents" },
  {
    icon: Receipt, label: "Accounting", href: "/app/accounting",
    children: [
      { icon: FileText, label: "Invoices", href: "/app/accounting/invoices" },
      { icon: Settings, label: "Settings", href: "/app/accounting/settings" },
    ],
  },
  { icon: BarChart3, label: "Reports", href: "/app/reports" },
  { icon: Globe, label: "Visa Check", href: "/app/visa-check" },
  { icon: Settings, label: "Settings", href: "/app/settings" },
];

function isItemActive(location: string, href: string): boolean {
  if (location === href) return true;
  if (href === "/admin" || href === "/app") return false;
  return location.startsWith(href + "/") || location.startsWith(href + "?");
}

function timeAgo(date: string | Date | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function DashboardLayout({ children, type }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { data: authData, isLoading: authLoading } = useCurrentUser();

  const navItems = type === "admin" ? adminNavItems : agencyNavItems;

  // Auto-expand groups whose parent or any child matches the current location.
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of navItems) {
        if (!item.children?.length) continue;
        const branchActive =
          isItemActive(location, item.href) ||
          item.children.some((c) => isItemActive(location, c.href));
        if (branchActive) next[item.label] = true;
      }
      return next;
    });
  }, [location, navItems]);

  const toggleGroup = (label: string) =>
    setOpenGroups((p) => ({ ...p, [label]: !p[label] }));
  const tenantId = authData?.user?.tenantId;

  // Recent activity for header notifications (agency only)
  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/tenants", tenantId, "activity-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/activity-logs`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId && type === "agency",
    refetchInterval: 60000,
  });

  const recentNotifications = [...activityLogs].slice(-8).reverse();
  const unreadKey = "agency_notifs_last_seen";
  const lastSeen = typeof window !== "undefined" ? Number(localStorage.getItem(unreadKey) || "0") : 0;
  const unreadCount = recentNotifications.filter((l) => {
    if (!l.createdAt) return false;
    const t = new Date(l.createdAt).getTime();
    return !isNaN(t) && t > lastSeen;
  }).length;

  // Redirect to login if not authenticated or wrong role for this layout type
  useEffect(() => {
    if (authLoading || authData === undefined) return;
    if (!authData.authenticated) {
      setLocation("/login");
      return;
    }
    if (type === "admin" && authData.user?.role !== "saas_admin") {
      setLocation("/login");
    } else if (type === "agency" && authData.user?.role === "saas_admin") {
      setLocation("/admin");
    }
  }, [authLoading, authData, type]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    localStorage.removeItem("agency_tenant_slug");
    setLocation("/login");
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = searchValue.trim();
    if (!q) return;
    if (type === "agency") {
      setLocation(`/app/cases?q=${encodeURIComponent(q)}`);
    } else {
      setLocation(`/admin/tenants?q=${encodeURIComponent(q)}`);
    }
  };

  const markNotifsRead = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(unreadKey, String(Date.now()));
    }
  };

  const formatAction = (action: string) =>
    action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const userName = authData?.user?.name || authData?.user?.email || "User";
  const userEmail = authData?.user?.email || "";
  const userInitials = (authData?.user?.name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border
          transition-all duration-300 hidden lg:block
          ${collapsed ? "w-16" : "w-64"}
        `}
        data-testid="sidebar"
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            {collapsed ? (
              <LogoMark />
            ) : (
              <Logo size="md" />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex"
              data-testid="button-collapse-sidebar"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const hasChildren = !!item.children?.length;
              const childActive = hasChildren && item.children!.some((c) => isItemActive(location, c.href));
              const isActive = isItemActive(location, item.href) || childActive;
              const isOpen = !!openGroups[item.label];
              const testId = `nav-${item.label.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`;
              return (
                <div key={item.href}>
                  <div className="flex items-stretch">
                    <Link href={item.href} asChild>
                      <a
                        className={`
                          flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors min-w-0
                          ${isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          }
                        `}
                        data-testid={testId}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </a>
                    </Link>
                    {hasChildren && !collapsed && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.label)}
                        className="px-2 ml-1 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
                        aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        data-testid={`${testId}-toggle`}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                      </button>
                    )}
                  </div>
                  {hasChildren && !collapsed && isOpen && (
                    <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
                      {item.children!.map((child) => {
                        const childIsActive = isItemActive(location, child.href);
                        const childTestId = `nav-${child.label.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-")}`;
                        return (
                          <Link key={child.href} href={child.href} asChild>
                            <a
                              className={`
                                flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                                ${childIsActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                }
                              `}
                              data-testid={childTestId}
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </a>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full justify-start gap-3 h-auto py-2 ${collapsed ? "px-2" : ""}`}
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{userInitials}</AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLocation(type === "agency" ? "/app/settings" : "/admin/settings")}
                  data-testid="menu-profile"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:text-red-600"
                  onClick={handleLogout}
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border
          transition-transform duration-300 lg:hidden
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Logo size="md" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="button-close-mobile-menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const hasChildren = !!item.children?.length;
              const childActive = hasChildren && item.children!.some((c) => isItemActive(location, c.href));
              const isActive = isItemActive(location, item.href) || childActive;
              return (
                <div key={item.href}>
                  <Link href={item.href} asChild>
                    <a
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors
                        ${isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </a>
                  </Link>
                  {hasChildren && (
                    <div className="mt-1 ml-4 pl-3 border-l border-sidebar-border space-y-1">
                      {item.children!.map((child) => {
                        const childIsActive = isItemActive(location, child.href);
                        return (
                          <Link key={child.href} href={child.href} asChild>
                            <a
                              onClick={() => setMobileMenuOpen(false)}
                              className={`
                                flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                                ${childIsActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                }
                              `}
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span>{child.label}</span>
                            </a>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? "lg:ml-16" : "lg:ml-64"}`}>
        <header className="sticky top-0 z-20 h-16 bg-background/95 backdrop-blur border-b flex items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
              data-testid="button-open-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={type === "agency" ? "Search applications, press Enter…" : "Search agencies, press Enter…"}
                className="w-64 pl-9 bg-muted/50"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleSearchSubmit}
                data-testid="input-search"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {type === "agency" && (
              <DropdownMenu open={notifsOpen} onOpenChange={(open) => { setNotifsOpen(open); if (open) markNotifsRead(); }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {recentNotifications.length > 0 && (
                      <span className="text-xs text-muted-foreground">{recentNotifications.length} recent</span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {recentNotifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      You're all caught up
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {recentNotifications.map((log) => {
                        const isApproved = log.action.includes("approved");
                        const isWarn = log.action.includes("rejected") || log.action.includes("warn");
                        const Icon = isApproved ? CheckCircle : isWarn ? AlertCircle : Activity;
                        const iconColor = isApproved
                          ? "text-emerald-500"
                          : isWarn
                          ? "text-amber-500"
                          : "text-muted-foreground";
                        return (
                          <DropdownMenuItem
                            key={log.id}
                            className="flex items-start gap-2 py-2 cursor-pointer"
                            onClick={() => {
                              if (log.entityType === "case" && log.entityId) {
                                setLocation(`/app/cases/${log.entityId}`);
                                setNotifsOpen(false);
                              }
                            }}
                            data-testid={`notification-${log.id}`}
                          >
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{formatAction(log.action)}</p>
                              <p className="text-xs text-muted-foreground">{timeAgo(log.createdAt)}</p>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/app/reports")} className="justify-center text-sm">
                    View all activity
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {type === "admin" && (
              <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/audit")} data-testid="button-notifications">
                <Bell className="w-5 h-5" />
              </Button>
            )}
          </div>
        </header>

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
