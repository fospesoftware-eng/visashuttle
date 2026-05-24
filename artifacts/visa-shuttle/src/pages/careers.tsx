import { useEffect } from "react";
import { ArrowRight, ExternalLink, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const JOBS_URL = "https://fospe.com/jobs";

export default function CareersPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = JOBS_URL;
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F9FF] text-slate-950">
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(64,85,255,0.14),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(255,32,96,0.10),transparent_28%),linear-gradient(180deg,#FFFFFF,#F7F9FF)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#4055FF]">Careers</p>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-[#101A4D] md:text-7xl">
              Build the future of visa technology with Fospe.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Visa Shuttle roles are managed through Fospe careers. You are being redirected to the Fospe jobs page.
            </p>
            <a href={JOBS_URL} className="mt-9 inline-flex">
              <Button className="h-12 gap-2 rounded-full border-0 bg-[#101A4D] px-6 text-white hover:bg-[#16246A]">
                Open fospe.com/jobs
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>

          <div className="overflow-hidden rounded-[2.25rem] border border-white/80 bg-white shadow-2xl shadow-[#4055FF]/10">
            <div className="relative min-h-[430px] bg-gradient-to-br from-[#4055FF] via-[#7137EA] to-[#FF2060] p-8 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.34),transparent_24%),radial-gradient(circle_at_80%_74%,rgba(255,255,255,0.20),transparent_28%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/18 backdrop-blur">
                  <UsersRound className="h-8 w-8" />
                </div>
                <div className="mt-36">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-white/70">Redirecting</p>
                  <p className="mt-4 text-4xl font-black leading-tight">
                    Open roles, culture, and hiring details live at Fospe.
                  </p>
                  <div className="mt-7 inline-flex items-center gap-2 text-sm font-black">
                    Continue to jobs
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
