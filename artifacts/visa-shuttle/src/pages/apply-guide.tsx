import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Loader2,
  MapPin,
} from "lucide-react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useB2cAuth } from "@/hooks/use-b2c-auth";

interface GuideStep {
  step: number;
  title: string;
  description: string;
  tips?: string[];
  officialLink?: { label: string; url: string };
  timeframe?: string;
}

interface ApplyGuideResult {
  destination: string;
  nationality: string;
  visaType: string;
  overview: string;
  estimatedTimeline: string;
  officialPortal: { label: string; url: string };
  steps: GuideStep[];
  documentsChecklist: string[];
  commonMistakes: string[];
  importantNotes: string[];
  disclaimer: string;
}

export default function ApplyGuidePage() {
  const { user, isLoading: authLoading } = useB2cAuth();
  const [, setLocation] = useLocation();
  const [guide, setGuide] = useState<ApplyGuideResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const destination = params.get("destination") || "";
  const from = params.get("from") || "";
  const visaType = params.get("visa") || "";

  useEffect(() => {
    if (!authLoading && !user) setLocation("/sign-in");
  }, [user, authLoading]);

  useEffect(() => {
    if (!destination || !user) return;
    setIsLoading(true);
    setError(null);
    fetch(`/api/visa-apply-guide?destination=${encodeURIComponent(destination)}&from=${encodeURIComponent(from)}&visa=${encodeURIComponent(visaType)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load guide");
        return r.json();
      })
      .then((data) => setGuide(data))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [destination, from, visaType, user]);

  if (authLoading || !user) return null;

  return (
    <DashboardLayout
      title={`${visaType || "Visa"} Application Guide`}
      subtitle={destination ? `${from || "Your country"} → ${destination}` : "Self-application step-by-step"}
    >
      <div className="max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Results
            </Button>
          </button>
          {destination && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium">{destination}</span>
            </div>
          )}
        </div>

        {isLoading && (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#4055FF]" />
              <div>
                <p className="font-bold text-sm">Generating your personalised guide…</p>
                <p className="text-xs text-muted-foreground mt-1">Researching {destination} {visaType} application requirements</p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-700 dark:text-red-400">Could not load guide</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {guide && (
          <>
            {/* Header card */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-br from-[#4055FF] to-[#9033F5] p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <Badge className="bg-white/20 border-0 text-white mb-3">{guide.visaType} Visa</Badge>
                    <h2 className="text-xl md:text-2xl font-black mb-2">
                      {guide.nationality} → {guide.destination}
                    </h2>
                    <p className="text-white/80 text-sm leading-relaxed max-w-xl">{guide.overview}</p>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                      <Clock className="w-4 h-4 text-white/80" />
                      <span className="text-sm font-bold">{guide.estimatedTimeline}</span>
                    </div>
                    {guide.officialPortal?.url && (
                      <a href={guide.officialPortal.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="gap-2 bg-white text-[#4055FF] hover:bg-white/90 border-0 font-bold">
                          <Globe className="w-3.5 h-3.5" />
                          {guide.officialPortal.label || "Official Portal"}
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Steps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#4055FF]" />
                  Step-by-Step Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {guide.steps.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#4055FF] to-[#9033F5] text-white text-sm font-black flex items-center justify-center shadow-sm">
                      {step.step}
                    </div>
                    <div className="flex-1 min-w-0 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="font-bold text-sm">{step.title}</p>
                        {step.timeframe && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{step.timeframe}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
                      {step.tips?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {step.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                              {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                      {step.officialLink?.url && (
                        <a href={step.officialLink.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#4055FF] hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          {step.officialLink.label}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Documents checklist */}
              {guide.documentsChecklist?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#4055FF]" />
                      Documents Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {guide.documentsChecklist.map((doc, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#4055FF]/5 border border-[#4055FF]/15 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-[#4055FF] flex-shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Common mistakes */}
              {guide.commonMistakes?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      Common Mistakes to Avoid
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {guide.commonMistakes.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 text-xs text-red-800 dark:text-red-300">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Important notes */}
            {guide.importantNotes?.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <Info className="w-4 h-4" />
                    Important Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {guide.importantNotes.map((note, i) => (
                    <p key={i} className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {note}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Apply via agency CTA */}
            <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="font-black text-base mb-1">Want expert help instead?</p>
                  <p className="text-white/80 text-sm">Our verified agencies on Growth Hub manage your entire application — significantly improving success rates.</p>
                </div>
                <Link href="/business/growth-hub">
                  <Button className="bg-white text-emerald-700 hover:bg-white/90 border-0 font-bold gap-2 shrink-0">
                    Find an Agency
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{guide.disclaimer}</span>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
