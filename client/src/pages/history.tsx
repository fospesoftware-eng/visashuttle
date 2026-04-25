import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Clock, Sparkles, CheckCircle, AlertCircle, TrendingUp, FileText, ChevronRight, Brain, Info } from "lucide-react";
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

function ScoreBar({ score }: { score: number }) {
  const colors = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
      <div className={`h-full ${colors} rounded-full`} style={{ width: `${score}%` }} />
    </div>
  );
}

function ScoreBadge({ score, label }: { score: number | null; label: string | null }) {
  if (score === null) return <Badge variant="secondary">Pending</Badge>;
  if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700 border-0">{label || "High Chance"}</Badge>;
  if (score >= 60) return <Badge className="bg-blue-100 text-blue-700 border-0">{label || "Good Chance"}</Badge>;
  if (score >= 40) return <Badge className="bg-amber-100 text-amber-700 border-0">{label || "Moderate"}</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-0">{label || "Low Chance"}</Badge>;
}

export default function HistoryPage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
  }, [user, authLoading]);

  const { data: checks = [], isLoading } = useQuery<VisaCheck[]>({
    queryKey: ["/api/b2c/checks"],
    enabled: !!user,
  });

  if (authLoading || !user) return null;

  return (
    <DashboardLayout title="Check History" subtitle="All your past visa approval checks">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Past Visa Checks</h2>
            <p className="text-sm text-slate-500">{checks.length} check{checks.length !== 1 ? "s" : ""} completed</p>
          </div>
          <Link href="/check">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" data-testid="button-new-check">
              <Sparkles className="w-4 h-4" />
              New Check
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-white border border-slate-100 animate-pulse" />)}
          </div>
        ) : checks.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">No checks yet</h3>
              <p className="text-slate-500 text-sm mb-5">Run your first AI visa check to see your results here.</p>
              <Link href="/check">
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="button-first-check">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start First Check
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {checks.map((check) => {
              const fd = check.formData;
              const response = check.aiResponse as any;
              return (
                <Card key={check.id} className="hover:shadow-md transition-all bg-white" data-testid={`card-check-${check.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Score circle */}
                      <div className="flex-shrink-0">
                        {check.approvalChance !== null ? (
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${
                            check.approvalChance >= 80 ? "bg-emerald-50" : check.approvalChance >= 60 ? "bg-blue-50" : check.approvalChance >= 40 ? "bg-amber-50" : "bg-red-50"
                          }`}>
                            <span className={`text-lg font-black leading-none ${
                              check.approvalChance >= 80 ? "text-emerald-700" : check.approvalChance >= 60 ? "text-blue-700" : check.approvalChance >= 40 ? "text-amber-700" : "text-red-700"
                            }`}>{check.approvalChance}%</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">score</span>
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-slate-900">{fd.visaType || "Visa Check"}</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-semibold text-slate-900">{fd.destinationCountry}</span>
                              <ScoreBadge score={check.approvalChance} label={check.statusLabel} />
                            </div>
                            <p className="text-sm text-slate-500">
                              {fd.nationality} • {fd.purposeOfTravel} • {fd.tripDuration}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {new Date(check.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>

                        {check.approvalChance !== null && <ScoreBar score={check.approvalChance} />}

                        {response?.summary && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{response.summary}</p>
                        )}

                        {response && (
                          <div className="flex items-center gap-3 mt-3">
                            {response.strengths?.length > 0 && (
                              <span className="text-xs flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="w-3 h-3" />
                                {response.strengths.length} strength{response.strengths.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {response.riskFactors?.length > 0 && (
                              <span className="text-xs flex items-center gap-1 text-red-500">
                                <AlertCircle className="w-3 h-3" />
                                {response.riskFactors.length} risk factor{response.riskFactors.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {response.missingDocuments?.length > 0 && (
                              <span className="text-xs flex items-center gap-1 text-amber-600">
                                <FileText className="w-3 h-3" />
                                {response.missingDocuments.length} missing doc{response.missingDocuments.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>AI estimates are for guidance only and do not guarantee visa approval.</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
