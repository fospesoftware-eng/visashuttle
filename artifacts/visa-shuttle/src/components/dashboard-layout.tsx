import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Compass, PlaneTakeoff, ScanSearch, Luggage, ScrollText,
  Ticket, SlidersHorizontal, LogOut, Menu, X, ChevronRight, Shield, Crown, ShieldAlert
} from "lucide-react";
import { Logo } from "@/components/logo";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { icon: Compass, label: "Dashboard", href: "/account" },
  { icon: PlaneTakeoff, label: "Basic Check", href: "/check" },
  { icon: ScanSearch, label: "Deep Check", href: "/deep-check", premium: true },
  { icon: ShieldAlert, label: "Visa Tools", href: "/visa-tools" },
  { icon: Luggage, label: "Saved Profile", href: "/saved-profile" },
  { icon: ScrollText, label: "Check History", href: "/history" },
  { icon: Ticket, label: "Pricing", href: "/pricing" },
  { icon: SlidersHorizontal, label: "Settings", href: "/settings" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logout, checksRemaining, canCheck, isDemo } = useB2cAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const planLabel = user?.subscriptionPlan === "pro" ? "Deep Check" : user?.subscriptionPlan || "free";

  useEffect(() => { setSidebarOpen(false); }, [location]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <Logo size="md" />
      </div>

      {/* User pill */}
      {user && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-[#4055FF]/5 to-slate-50 border border-[#4055FF]/15 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{user.fullName}</p>
              <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">{user.email}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
              isDemo ? "bg-amber-100 text-amber-700" :
              user.subscriptionPlan === "pro" ? "bg-purple-100 text-purple-700" :
              user.subscriptionPlan === "starter" ? "bg-[#4055FF]/10 text-[#4055FF]" :
              "bg-slate-100 text-slate-600"
            }`}>{isDemo ? "Demo" : planLabel}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${canCheck ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
              {isDemo ? "Unlimited checks" : `${checksRemaining} check${checksRemaining !== 1 ? "s" : ""} left`}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto min-h-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-2 mb-1.5">Navigation</p>
        <div className="space-y-0.5 pb-2">
          {NAV_ITEMS.map(({ icon: Icon, label, href, premium }) => {
            const isActive = location === href;
            const isLocked = premium && !user?.deepCheckAccess;
            return (
              <Link key={href} href={href}>
                <div
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive ? "text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  style={isActive ? { background: "linear-gradient(135deg,#4055FF,#7033F0)" } : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-[#4055FF]"} transition-colors`} />
                  <span className="text-sm font-medium flex-1 leading-none">{label}</span>
                  {isLocked && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="flex-shrink-0 p-3 border-t border-slate-100">
        {!canCheck && user?.subscriptionPlan === "free" && !isDemo && (
          <Link href="/payment/deep-check">
            <div className="mb-2 p-3 rounded-xl text-white cursor-pointer transition-all hover:opacity-90" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}>
              <div className="flex items-center gap-1.5 mb-1">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-xs font-semibold">Get Deep Check</span>
              </div>
              <p className="text-[11px] text-blue-100 leading-snug">50% off — ₹500 only</p>
            </div>
          </Link>
        )}
        <button
          onClick={() => logout()}
          data-testid="button-logout"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 group-hover:text-red-500" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex">
      {/* Desktop Sidebar — fixed, full height */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 flex-shrink-0 shadow-sm z-30">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-50 flex flex-col">
            <button
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 z-10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content — fills remaining space, scrolls independently */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 bg-white border-b border-slate-100 shadow-sm z-20">
          <div className="px-4 lg:px-6 h-14 flex items-center gap-3">
            <button
              className="lg:hidden w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              {title && (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
                  {subtitle && <span className="text-xs text-slate-400 hidden sm:block">{subtitle}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {user && !canCheck && (
                <Link href="/payment/deep-check">
                  <Button size="sm" className="hidden sm:flex gap-1.5 border-0 text-xs h-8 px-3 text-white hover:opacity-90" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}>
                    <Crown className="w-3 h-3" />
                    Deep Check ₹500
                  </Button>
                </Link>
              )}
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}>
                {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 xl:p-8 min-h-full">
            {children}
          </div>
        </main>

        <footer className="flex-shrink-0 px-6 py-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3 h-3" />
            <span>AI estimates only — does not guarantee visa approval. Final decision rests with the embassy.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
