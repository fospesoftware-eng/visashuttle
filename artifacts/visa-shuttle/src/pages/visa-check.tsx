import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardLayout as B2cDashboardLayout } from "@/components/dashboard-layout";
import { TravelDocVisaCheck } from "@/components/visa-check/traveldoc-visa-check";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function VisaCheckPage() {
  return (
    <DashboardLayout type="agency">
      <TravelDocVisaCheck surface="dashboard" mode="form" />
    </DashboardLayout>
  );
}

function B2cVisaCheckGate({ mode }: { mode: "form" | "result" }) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useB2cAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      const target = mode === "result"
        ? `/visa-tools/visa-check/results${window.location.search}`
        : "/visa-tools/visa-check";
      setLocation(`/sign-in?next=${encodeURIComponent(target)}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`);
    }
  }, [isLoading, mode, setLocation, user]);

  if (isLoading || !user) {
    return (
      <B2cDashboardLayout title="Visa Check" subtitle="Signed-in Visa Tools feature">
        <div className="flex min-h-[55vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4055FF]" />
        </div>
      </B2cDashboardLayout>
    );
  }

  return (
    <B2cDashboardLayout title="Visa Check" subtitle="Advanced destination entry requirements">
      <TravelDocVisaCheck surface="b2c" mode={mode} />
    </B2cDashboardLayout>
  );
}

export function B2cVisaCheckPage() {
  return <B2cVisaCheckGate mode="form" />;
}

export function B2cVisaCheckResultPage() {
  return <B2cVisaCheckGate mode="result" />;
}
