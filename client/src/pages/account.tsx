import { Link, useLocation } from "wouter";
import {
  Sparkles, LogOut, Plus, Clock, CheckCircle, AlertCircle, BarChart3,
  ArrowRight, Crown, Zap, TrendingUp, Brain, ChevronRight, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { useEffect } from "react";

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

function getScoreBadge(score: number | null) {
  if (score === null) return { class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "Pending" };
  if (score >= 80) return { class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", label: `${score}% · High Chance` };
  if (score >= 60) return { class: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", label: `${score}% · Good Chance` };
  if (score >= 40) return { class: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", label: `${score}% · Moderate` };
  return { class: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", label: `${score}% · Low Chance` };
}

function planDetails(plan: string) {
  if (plan === "pro") return { icon: Crown, label: "Pro Plan", color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" };
  if (plan === "starter") return { icon: Zap, label: "Starter Plan", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" };
  return { icon: Sparkles, label: "Free Plan", color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800/40" };
}

export default function AccountPage() {
  const { user, isLoading: authLoading, logout, checksRemaining, canCheck } = useB2cAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
  }, [user, authLoading]);

  const { data: checks = [], isLoading: checksLoading } = useQuery<VisaCheck[]>({
    queryKey: ["/api/b2c/checks"],
    enabled: !!user,
  });

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const plan = planDetails(user.subscriptionPlan);
  const PlanIcon = plan.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-5">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link href="/check" className="text-sm text-muted-foreground hover:text-foreground transition-colors">New Check</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Welcome + Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 bg-gradient-to-br from-blue-600 to-cyan-500 text-white border-0 shadow-lg shadow-blue-500/20">
            <CardContent className="p-6">
              <p className="text-blue-100 text-sm mb-1">Welcome back</p>
              <h1 className="text-2xl font-bold mb-1" data-testid="user-name">{user.fullName}</h1>
              <p className="text-blue-200 text-sm mb-4">{user.email}</p>
              <div className="flex items-center gap-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${plan.bg} ${plan.color}`}>
                  <PlanIcon className="w-3.5 h-3.5" />
                  {plan.label}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-rows-2 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{checks.length}</p>
                  <p className="text-xs text-muted-foreground">Total Checks</p>
                </div>
              </CardContent>
            </Card>
            <Card className={canCheck ? "" : "border-amber-200 dark:border-amber-800"}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${canCheck ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                  <TrendingUp className={`w-5 h-5 ${canCheck ? "text-emerald-600" : "text-amber-600"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{checksRemaining}</p>
                  <p className="text-xs text-muted-foreground">Checks Left</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/check">
            <Button className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0" data-testid="button-new-check">
              <Plus className="w-4 h-4" />
              New Visa Check
            </Button>
          </Link>
          {!canCheck && (
            <Link href="/pricing">
              <Button variant="outline" className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30">
                <Crown className="w-4 h-4" />
                Upgrade Plan
              </Button>
            </Link>
          )}
        </div>

        {/* Upgrade Banner */}
        {user.subscriptionPlan === "free" && (
          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
            <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Unlock More Checks</p>
                  <p className="text-muted-foreground text-sm">Starter gets 5 checks/month. Pro gets 20 checks + Deep Check + PDF reports.</p>
                </div>
              </div>
              <Link href="/pricing">
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white whitespace-nowrap">
                  See Plans
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Check History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Check History
            </h2>
            {checks.length > 0 && <Badge variant="secondary">{checks.length} check{checks.length !== 1 ? "s" : ""}</Badge>}
          </div>

          {checksLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : checks.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No checks yet</h3>
                <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">Run your first AI visa check to see your approval probability with a full analysis.</p>
                <Link href="/check">
                  <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border-0" data-testid="button-first-check">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run Your First Check
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {checks.map((check) => {
                const badge = getScoreBadge(check.approvalChance);
                const fd = check.formData;
                return (
                  <Card key={check.id} className="hover:shadow-md transition-shadow" data-testid={`card-check-${check.id}`}>
                    <CardContent className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="font-semibold text-sm">{fd.visaType || "Visa Check"}</span>
                            <span className="text-muted-foreground text-xs">→</span>
                            <span className="font-medium text-sm">{fd.destinationCountry}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {fd.nationality} • {fd.purposeOfTravel} • {fd.tripDuration}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.class}`}>
                              {badge.label}
                            </span>
                            {check.aiProvider && check.aiProvider !== "mock" && (
                              <span className="text-xs text-muted-foreground">
                                via {check.aiProvider === "openai" ? "OpenAI" : "Claude"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(check.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-4 rounded-xl bg-muted/50 border text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Visa Shuttle provides AI-based estimation only. It does not guarantee visa approval. Final decisions are made only by the relevant embassy, consulate, or immigration authority.</span>
        </div>
      </div>
    </div>
  );
}
