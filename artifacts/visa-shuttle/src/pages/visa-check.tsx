import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { TravelDocVisaCheck } from "@/components/visa-check/traveldoc-visa-check";

export default function VisaCheckPage() {
  return (
    <DashboardLayout type="agency">
      <TravelDocVisaCheck surface="dashboard" />
    </DashboardLayout>
  );
}
