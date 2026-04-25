import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import {
  Crown, Lock, Sparkles, CheckCircle, FileText, Search,
  TrendingUp, Download, Shield, ArrowRight, Zap
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useB2cAuth } from "@/hooks/use-b2c-auth";

const FEATURES = [
  { icon: Search, title: "Embassy-Style Risk Analysis", desc: "Deep review mirroring how consular officers evaluate your application — scoring each factor the way embassies do." },
  { icon: AlertIcon, title: "Red Flag Detection", desc: "AI identifies specific red flags in your profile that are most likely to cause rejection, with severity ratings." },
  { icon: FileText, title: "Document Gap Analysis", desc: "Complete audit of required vs. available documents, with specific instructions on what's missing and how to obtain it." },
  { icon: TrendingUp, title: "Personalized Improvement Plan", desc: "Step-by-step action plan to boost your visa approval chance — tailored to your exact profile and destination." },
  { icon: Download, title: "Downloadable PDF Report", desc: "Export your full visa analysis as a professional PDF report — ideal for consultations or record-keeping." },
  { icon: Shield, title: "Risk Mitigation Advice", desc: "Concrete strategies to address each identified risk factor before submitting your application." },
];

function AlertIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

export default function DeepCheckPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
  }, [user, authLoading]);

  if (authLoading || !user) return null;

  const hasAccess = user.deepCheckAccess;

  return (
    <DashboardLayout title="Deep Check" subtitle="Embassy-style advanced visa risk analysis">
      <div className="max-w-4xl">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 md:p-10 mb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.15),transparent_60%)]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 font-semibold">Pro Feature</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">Deep Visa Risk Analysis</h1>
            <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
              Go beyond the basic score. Get a full embassy-style deep dive into your visa profile — 
              red flag detection, document gap audit, improvement plan, and a downloadable PDF report.
            </p>
            {!hasAccess && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/pricing">
                  <Button className="bg-white text-blue-900 hover:bg-blue-50 font-semibold gap-2" data-testid="button-upgrade">
                    <Crown className="w-4 h-4 text-amber-500" />
                    Upgrade to Pro — $29/mo
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/check">
                  <Button variant="ghost" className="text-white hover:bg-white/10 gap-2">
                    <Sparkles className="w-4 h-4" />
                    Run Free Basic Check First
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features grid */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">What's Included in Deep Check</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className={`border ${hasAccess ? "border-slate-100" : "border-slate-100 opacity-80"}`}>
                <CardContent className="p-5 flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${hasAccess ? "bg-blue-50" : "bg-slate-100"}`}>
                    <Icon className={`w-5 h-5 ${hasAccess ? "text-blue-600" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
                      {!hasAccess && <Lock className="w-3 h-3 text-slate-400" />}
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Lock screen or CTA */}
        {!hasAccess ? (
          <Card className="border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Deep Check Requires Pro Plan</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Upgrade to Pro for $29/month to unlock Deep Check, 20 basic checks per month, 
                PDF reports, and priority support.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/pricing">
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2" size="lg" data-testid="button-upgrade-cta">
                    <Crown className="w-4 h-4" />
                    View Pricing Plans
                  </Button>
                </Link>
                <Link href="/check">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Try Free Basic Check
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-blue-200 bg-blue-50">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">Deep Check is Available</h3>
              <p className="text-slate-600 text-sm mb-4">You have Pro access. Start a Deep Check by running a visa check and selecting "Deep Check" mode.</p>
              <Link href="/check">
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2" data-testid="button-start-deep">
                  <Crown className="w-4 h-4" />
                  Start Deep Check
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Comparison */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Basic vs Deep Check</h2>
          <Card>
            <CardContent className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 font-semibold text-slate-600">Feature</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Basic (Free)</th>
                    <th className="px-4 py-3 text-center font-semibold text-blue-700 bg-blue-50">Deep (Pro)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    ["Approval chance score", true, true],
                    ["Status label (High/Good/Moderate/Low)", true, true],
                    ["AI summary", true, true],
                    ["Strengths & Risk factors", true, true],
                    ["Document checklist", true, true],
                    ["Improvement tips", true, true],
                    ["Next steps", true, true],
                    ["Embassy-style risk analysis", false, true],
                    ["Red flag detection & severity", false, true],
                    ["Deep document gap audit", false, true],
                    ["Personalized improvement plan", false, true],
                    ["PDF report download", false, true],
                    ["Risk mitigation strategies", false, true],
                  ].map(([feature, basic, deep]) => (
                    <tr key={feature as string} className="hover:bg-slate-50/50">
                      <td className="px-5 py-2.5 text-slate-700">{feature as string}</td>
                      <td className="px-4 py-2.5 text-center">
                        {basic ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300 text-lg">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center bg-blue-50/50">
                        {deep ? <CheckCircle className="w-4 h-4 text-blue-600 mx-auto" /> : <span className="text-slate-300 text-lg">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
