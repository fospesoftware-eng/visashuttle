import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, Users, Briefcase, FileText, BarChart3, Settings, 
  ChevronLeft, ChevronRight, LogOut, Bell, Search,
  Menu, X, Building2, ShieldCheck, Database, Activity, Globe
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

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
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
  { icon: Briefcase, label: "Applications", href: "/app/cases" },
  { icon: FileText, label: "Documents", href: "/app/documents" },
  { icon: BarChart3, label: "Reports", href: "/app/reports" },
  { icon: Globe, label: "Visa Check", href: "/app/visa-check" },
  { icon: Settings, label: "Settings", href: "/app/settings" },
];

export function DashboardLayout({ children, type }: DashboardLayoutProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: authData } = useCurrentUser();

  const navItems = type === "admin" ? adminNavItems : agencyNavItems;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    localStorage.removeItem("agency_tenant_slug");
    setLocation("/login");
  };

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
              const isActive = location === item.href || 
                (item.href !== "/admin" && item.href !== "/app" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors
                      ${isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }
                    `}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </a>
                </Link>
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
                <Link href={type === "agency" ? "/app/settings" : "/admin/settings"}>
                  <DropdownMenuItem data-testid="menu-profile">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                </Link>
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
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
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
                placeholder="Search..." 
                className="w-64 pl-9 bg-muted/50"
                data-testid="input-search"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
