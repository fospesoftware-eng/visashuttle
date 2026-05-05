import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { TravelDocVisaCheck } from "@/components/visa-check/traveldoc-visa-check";

export function VisaCheckPublicResultPage() {
  return <TravelDocVisaCheck surface="public" mode="result" />;
}

export function VisaCheckAgencyResultPage() {
  return (
    <DashboardLayout type="agency">
      <TravelDocVisaCheck surface="dashboard" mode="result" />
    </DashboardLayout>
  );
}
