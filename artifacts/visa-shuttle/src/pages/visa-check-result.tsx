import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { TravelDocVisaCheck } from "@/components/visa-check/traveldoc-visa-check";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function VisaCheckPublicResultPage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(`/sign-in?next=${encodeURIComponent(`/visa-tools/visa-check/results${window.location.search}`)}&message=${encodeURIComponent("Please sign in to access Visa Tools.")}`);
  }, [setLocation]);
  return null;
}

export function VisaCheckAgencyResultPage() {
  return (
    <DashboardLayout type="agency">
      <TravelDocVisaCheck surface="dashboard" mode="result" />
    </DashboardLayout>
  );
}
