import { useEffect } from "react";
import { ExternalLink, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const JOBS_URL = "https://fospe.com/jobs";

export default function CareersPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.href = JOBS_URL;
    }, 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-16">
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#4055FF] to-[#FF2060] text-white shadow-xl shadow-[#4055FF]/20">
          <UsersRound className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-[#15236B] md:text-5xl">Careers at Fospe</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
          Careers for Visa Shuttle and Fospe Software are managed on Fospe jobs. Redirecting you now.
        </p>
        <a href={JOBS_URL} className="mt-8">
          <Button className="gap-2 rounded-2xl border-0 bg-gradient-to-r from-[#4055FF] to-[#FF2060] text-white hover:opacity-90">
            Open fospe.com/jobs
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </main>
  );
}
