import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  PlaneTakeoff, Crown, User, Clock, TrendingUp, CheckCircle, AlertCircle,
  ArrowRight, Plus, Brain, BarChart3, Zap, FileText, Bell, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";

interface VisaCheck {
  id: string;
  checkType: string;
  formData: Record<string, string>;
  aiProvider: string;
  approvalChance: number | null;
  statusLabel: string | null;
  aiResponse: any;
  createdAt: string;
}

interface SavedProfile {
  fullName: string | null;
  nationality: string | null;
  employmentStatus: string | null;
  monthlyIncome: string | null;
  bankBalance: string | null;
  hasPassport: boolean | null;
  hasBankStatement: boolean | null;
  hasIncomeProof: boolean | null;
  hasTaxReturn: boolean | null;
}

function profileCompletion(profile: SavedProfile | null): number {
  if (!profile) return 0;
  const fields = [profile.fullName, profile.nationality, profile.employmentStatus, profile.monthlyIncome, profile.bankBalance];
  const docs = [profile.hasPassport, profile.hasBankStatement, profile.hasIncomeProof];
  const filled = fields.filter(Boolean).length + docs.filter(Boolean).length;
  return Math.round((filled / (fields.length + docs.length)) * 100);
}

function ScoreDisplay({ score, label }: { score: number | null; label: string | null }) {
  if (score === null) return <Badge variant="secondary" className="text-xs">Pending</Badge>;
  const cfg = score >= 80 ? { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" }
    : score >= 60 ? { bg: "bg-[#4055FF]/8", text: "text-[#4055FF]", badge: "bg-[#4055FF]/10 text-[#4055FF]" }
    : score >= 40 ? { bg: "bg-amber-50", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" }
    : { bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700" };
  return (
    <div className={`flex items-baseline gap-1 ${cfg.text}`}>
      <span className="text-2xl font-black">{score}%</span>
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ml-1 ${cfg.badge}`}>{label}</span>
    </div>
  );
}

export default function AccountPage() {
  const { user, isLoading: authLoading, checksRemaining, canCheck } = useB2cAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
  }, [user, authLoading]);

  const { data: checks = [], isLoading: checksLoading } = useQuery<VisaCheck[]>({
    queryKey: ["/api/b2c/checks"],
    enabled: !!user,
  });

  const { data: profile } = useQuery<SavedProfile | null>({
    queryKey: ["/api/b2c/profile"],
    enabled: !!user,
  });

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const recentChecks = checks.slice(0, 3);
  const profComp = profileCompletion(profile ?? null);
  const lastCheck = checks[0];

  const notifications = [
    !canCheck && { type: "warn", msg: "You've used your free check. Upgrade to run more checks." },
    profComp < 50 && { type: "info", msg: "Complete your saved profile to speed up future checks." },
    !user.deepCheckAccess && { type: "tip", msg: "Deep Check reveals embassy-style risk analysis. Try it on Pro." },
  ].filter(Boolean) as { type: string; msg: string }[];

  return (
    <DashboardLayout title={`Welcome back, ${user.fullName.split(" ")[0]}`} subtitle="Your visa intelligence dashboard">
      <div className="max-w-5xl space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Checks", value: checks.length, icon: BarChart3, color: "text-[#4055FF]", bg: "bg-[#4055FF]/10" },
            { label: "Checks Left", value: checksRemaining, icon: Zap, color: canCheck ? "text-emerald-600" : "text-amber-600", bg: canCheck ? "bg-emerald-50" : "bg-amber-50" },
            { label: "Profile Complete", value: `${profComp}%`, icon: User, color: profComp >= 70 ? "text-emerald-600" : "text-slate-500", bg: "bg-slate-50" },
            { label: "Plan", value: user.subscriptionPlan.charAt(0).toUpperCase() + user.subscriptionPlan.slice(1), icon: Crown, color: user.subscriptionPlan === "pro" ? "text-purple-600" : "text-slate-500", bg: user.subscriptionPlan === "pro" ? "bg-purple-50" : "bg-slate-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="bg-white shadow-sm border-slate-100">
              <CardContent className="p-4 md:p-5">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-xl md:text-2xl font-black text-slate-900" data-testid={`stat-${label.replace(/\s/g, "-").toLowerCase()}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map(({ type, msg }, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
                type === "warn" ? "bg-amber-50 border-amber-100 text-amber-800" :
                type === "info" ? "bg-[#4055FF]/8 border-[#4055FF]/15 text-[#4055FF]" :
                "bg-slate-50 border-slate-100 text-slate-700"
              }`}>
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{msg}</span>
                {type === "warn" && (
                  <Link href="/pricing">
                    <span className="font-semibold underline cursor-pointer ml-2">Upgrade</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Link href="/check">
              <Card className="cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}}>
                    <PlaneTakeoff className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">Free Visa Check</p>
                    <p className="text-xs text-slate-500">AI approval analysis</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/deep-check">
              <Card className={`cursor-pointer hover:shadow-md transition-all group bg-white ${user.deepCheckAccess ? "hover:border-purple-200" : "opacity-75"}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${user.deepCheckAccess ? "bg-purple-600" : "bg-slate-200"}`}>
                    <Crown className={`w-5 h-5 ${user.deepCheckAccess ? "text-white" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-800 text-sm">Deep Check</p>
                      {!user.deepCheckAccess && <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">Pro</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">Embassy-style analysis</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/saved-profile">
              <Card className="cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">Saved Profile</p>
                    <p className="text-xs text-slate-500">{profComp}% complete</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent checks */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Recent Checks</h2>
              {checks.length > 3 && (
                <Link href="/history">
                  <span className="text-xs text-[#4055FF] hover:underline font-medium">View all</span>
                </Link>
              )}
            </div>

            {checksLoading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}
              </div>
            ) : recentChecks.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 bg-white">
                <CardContent className="py-10 text-center">
                  <Brain className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-600 mb-1">No checks yet</p>
                  <p className="text-sm text-slate-400 mb-4">Your first check is free — no card needed</p>
                  <Link href="/check">
                    <Button size="sm" className="border-0 text-white hover:opacity-90" style={{background:"linear-gradient(135deg,#4055FF,#FF2060)"}} data-testid="button-first-check">
                      <PlaneTakeoff className="w-3.5 h-3.5 mr-1.5" />
                      Start Free Check
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {recentChecks.map(check => {
                  const fd = check.formData;
                  return (
                    <Card key={check.id} className="bg-white border-slate-100" data-testid={`card-check-${check.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-sm text-slate-800">{fd.visaType}</span>
                              <span className="text-slate-300">→</span>
                              <span className="font-semibold text-sm text-slate-800">{fd.destinationCountry}</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">{fd.nationality} • {fd.purposeOfTravel}</p>
                            <ScoreDisplay score={check.approvalChance} label={check.statusLabel} />
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-slate-400">
                              {new Date(check.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {recentChecks.length > 0 && (
                  <Link href="/history">
                    <div className="flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                      View Full History
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Profile completion */}
            <Card className="bg-white border-slate-100">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-700">Profile Completion</h3>
                </div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-slate-900">{profComp}%</span>
                  <Link href="/saved-profile">
                    <span className="text-xs text-blue-600 hover:underline">Edit profile</span>
                  </Link>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${profComp >= 70 ? "bg-emerald-500" : profComp >= 40 ? "bg-blue-500" : "bg-slate-300"}`}
                    style={{ width: `${profComp}%` }}
                  />
                </div>
                {profComp < 100 && (
                  <p className="text-xs text-slate-500">
                    {profComp < 30 ? "Add your nationality and employment info to get started" :
                     profComp < 70 ? "Add financial details to speed up future checks" :
                     "Almost there — add remaining details"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Smart suggestions */}
            <Card className="bg-white border-slate-100">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  Smart Suggestions
                </h3>
                <div className="space-y-2">
                  {profComp < 60 && (
                    <Link href="/saved-profile">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="text-xs text-slate-600 group-hover:text-slate-900">Complete your saved profile</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                      </div>
                    </Link>
                  )}
                  {!user.deepCheckAccess && (
                    <Link href="/deep-check">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Crown className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <span className="text-xs text-slate-600 group-hover:text-slate-900">Try Deep Check (Pro)</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                      </div>
                    </Link>
                  )}
                  {checks.length >= 1 && (
                    <Link href="/check">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <span className="text-xs text-slate-600 group-hover:text-slate-900">Compare another destination</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                      </div>
                    </Link>
                  )}
                  {!canCheck && (
                    <Link href="/pricing">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-amber-50 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <span className="text-xs text-amber-700 group-hover:text-amber-900 font-medium">Upgrade for more checks</span>
                        <ChevronRight className="w-3 h-3 text-amber-300 ml-auto" />
                      </div>
                    </Link>
                  )}
                  {canCheck && checks.length === 0 && (
                    <Link href="/check">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <PlaneTakeoff className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="text-xs text-slate-600 group-hover:text-slate-900">Run your first free check</span>
                        <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                      </div>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
