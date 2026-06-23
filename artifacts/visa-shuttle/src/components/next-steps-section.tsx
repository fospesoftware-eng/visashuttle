import { AlertTriangle, ArrowRight, Building2, UserCheck } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NextStepsSectionProps {
  score: number | null;
  destinationCountry?: string;
  nationality?: string;
  visaType?: string;
}

export function NextStepsSection({ score, destinationCountry, nationality, visaType }: NextStepsSectionProps) {
  const lowScore = score !== null && score < 80;

  const guideParams = new URLSearchParams();
  if (destinationCountry) guideParams.set("destination", destinationCountry);
  if (nationality) guideParams.set("from", nationality);
  if (visaType) guideParams.set("visa", visaType);
  const guideHref = `/apply-guide?${guideParams.toString()}`;

  return (
    <div className="space-y-4 pt-2">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">Next Steps</p>
        <h3 className="text-lg font-black">How would you like to proceed?</h3>
      </div>

      {lowScore && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Self-application not recommended</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Your approval score is below 80. We strongly recommend applying through a professional agency to improve your chances.
            </p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Self Application */}
        <Card className={`relative overflow-hidden border-2 transition hover:-translate-y-0.5 hover:shadow-lg ${lowScore ? "border-amber-200 dark:border-amber-800/60" : "border-[#4055FF]/20 dark:border-[#4055FF]/30"}`}>
          <CardContent className="p-5 flex flex-col gap-3 h-full">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${lowScore ? "bg-amber-100 dark:bg-amber-900/40" : "bg-[#4055FF]/10"}`}>
                <UserCheck className={`w-5 h-5 ${lowScore ? "text-amber-600 dark:text-amber-400" : "text-[#4055FF]"}`} />
              </div>
              <div>
                <p className="font-black text-sm">Self Application</p>
                {lowScore && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Not recommended</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">
              Step-by-step visa application guide for {destinationCountry || "your destination"} — official links, required documents, timeline, and tips tailored to your profile.
            </p>
            <Link href={guideHref}>
              <Button
                size="sm"
                variant={lowScore ? "outline" : "default"}
                className={`w-full gap-2 rounded-xl ${lowScore ? "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40" : "border-0 text-white bg-[#4055FF] hover:bg-[#4055FF]/90"}`}
              >
                View Application Guide
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Apply Via Agency */}
        <Card className="relative overflow-hidden border-2 border-emerald-200 dark:border-emerald-800/60 transition hover:-translate-y-0.5 hover:shadow-lg">
          {lowScore && (
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-black uppercase tracking-wide bg-emerald-500 text-white px-2 py-0.5 rounded-full">Recommended</span>
            </div>
          )}
          <CardContent className="p-5 flex flex-col gap-3 h-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-black text-sm">Apply Via Agency</p>
                <span className="text-[10px] text-muted-foreground">Verified professionals</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">
              Browse verified visa agencies on Growth Hub. Professional agents handle your application end-to-end, significantly improving success rates.
            </p>
            <Link href="/business/growth-hub">
              <Button
                size="sm"
                className="w-full gap-2 rounded-xl border-0 text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Find an Agency
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
