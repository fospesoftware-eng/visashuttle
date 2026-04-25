import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Sparkles, Crown, User, Clock, CreditCard,
  Settings, LogOut, Menu, X, ChevronRight, Bell, Shield
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/account" },
  { icon: Sparkles, label: "New Visa Check", href: "/check" },
  { icon: Crown, label: "Deep Check", href: "/deep-check", premium: true },
  { icon: User, label: "Saved Profile", href: "/saved-profile" },
  { icon: Clock, label: "Check History", href: "/history" },
  { icon: CreditCard, label: "Pricing", href: "/pricing" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logout, checksRemaining, canCheck } = useB2cAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 pb-4">
        <Logo size="md" />
      </div>

      {/* User pill */}
      {user && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-medium capitalize text-slate-500">{user.subscriptionPlan} plan</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${canCheck ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {checksRemaining} check{checksRemaining !== 1 ? "s" : ""} left
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-3 mb-2">Menu</p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, href, premium }) => {
            const isActive = location === href;
            const isLocked = premium && !user?.deepCheckAccess;
            return (
              <Link key={href} href={href}>
                <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-blue-600"}`} />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {isLocked && (
                    <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-white/70 flex-shrink-0" />}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-100">
        {!canCheck && user?.subscriptionPlan === "free" && (
          <Link href="/pricing">
            <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white cursor-pointer hover:from-blue-700 hover:to-cyan-600 transition-all">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-blue-100">Get 20 checks + Deep Check access</p>
            </div>
          </Link>
        )}
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 bg-white border-r border-slate-100 fixed top-0 left-0 h-full z-30 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-2xl z-50">
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-60 xl:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
          <div className="px-4 lg:px-8 h-16 flex items-center gap-4">
            <button
              className="lg:hidden w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              {title && (
                <div>
                  <h1 className="text-base font-semibold text-slate-900 truncate">{title}</h1>
                  {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user && !canCheck && (
                <Link href="/pricing">
                  <Button size="sm" className="hidden sm:flex gap-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0 text-xs">
                    <Crown className="w-3 h-3" />
                    Upgrade
                  </Button>
                </Link>
              )}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 lg:px-8 py-6 md:py-8">
          {children}
        </main>

        <footer className="px-8 py-4 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3 h-3" />
            <span>Visa Shuttle provides AI-based estimation only and does not guarantee visa approval.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
