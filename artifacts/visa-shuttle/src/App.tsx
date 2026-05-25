import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { PasswordGate } from "@/components/password-gate";
import { CookieBanner } from "@/components/cookie-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import BusinessPage from "@/pages/business";
import AgencyCrmPage from "@/pages/agency-crm";
import GrowthHubPage from "@/pages/growth-hub";
import { AdminGrowthHubPage, GrowthHubDashboardPage } from "@/pages/growth-hub-dashboard";
import { AgenticVisaAiPage, BusinessApiDetailPage, EnterpriseSolutionsPage, WhitelabelSolutionsPage } from "@/pages/business-detail";
import { AgencyCrmSignupPage, AgenticSignupPage, BusinessApiSignupPage, EnterpriseSignupPage, WhitelabelSignupPage } from "@/pages/business-signup";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import JoinPage from "@/pages/join";
import SignInPage from "@/pages/sign-in";
import CheckPage from "@/pages/check";
import AccountPage from "@/pages/account";
import PricingPage from "@/pages/pricing";
import { BasicCheckPlanPage, DeepCheckPlanPage, ProPlanPage } from "@/pages/plan-detail";
import HistoryPage from "@/pages/history";
import HistoryDetailPage from "@/pages/history-detail";
import DeepCheckPage from "@/pages/deep-check";
import DeepCheckPaymentPage from "@/pages/deep-check-payment";
import PaymentFailurePage from "@/pages/payment-failure";
import VisaToolsCreditPaymentPage from "@/pages/visa-tools-credit-payment";
import SavedProfilePage from "@/pages/saved-profile";
import SettingsPage from "@/pages/settings";
import VisaToolsPage from "@/pages/visa-tools";
import VisaToolCheckPage from "@/pages/visa-tool-check";
import { FakeAgencyDetectorPage, FakeEmploymentDetectorPage, FakeVisaDetectorPage, RejectionRecoveryPage } from "@/pages/visa-tool-detail";
import VisaToolsHistoryPage, { VisaToolsHistoryDetailPage } from "@/pages/visa-tools-history";

import VisaCheckPage, { B2cVisaCheckPage, B2cVisaCheckResultPage } from "@/pages/visa-check";
import VisaCheckPublicPage from "@/pages/visa-check-public";
import { VisaCheckAgencyResultPage, VisaCheckPublicResultPage } from "@/pages/visa-check-result";
import AgencyDashboard from "@/pages/agency/dashboard";
import LeadsPage from "@/pages/agency/leads";
import CustomersPage from "@/pages/agency/customers";
import CustomerDetailPage from "@/pages/agency/customer-detail";
import ProposalsPage from "@/pages/agency/proposals";
import ProposalApplyPage from "@/pages/proposal-apply";
import InvoicePayPage from "@/pages/public/invoice-pay";
import CasesPage from "@/pages/agency/cases";
import VisaStagePage from "@/pages/agency/visa";
import NewCasePage from "@/pages/agency/case-new";
import CaseDetailPage from "@/pages/agency/case-detail";
import DocumentsPage from "@/pages/agency/documents";
import ReportsPage from "@/pages/agency/reports";
import AccountingPage from "@/pages/agency/accounting";
import AgencySettingsPage from "@/pages/agency/settings";
import ApiPlatformPage from "@/pages/agency/api-platform";
import AgencyCustomizerPage from "@/pages/agency/customizer";
import ApiPricingPublicPage from "@/pages/public/api-pricing";
import ApiDocsPublicPage from "@/pages/public/api-docs";
import HelpPage from "@/pages/help";
import ReportBugPage from "@/pages/report-bug";
import ContactPage from "@/pages/contact";
import AboutPage from "@/pages/about";
import UpdatesPage from "@/pages/updates";
import CareersPage from "@/pages/careers";
import { VersionLogDetailPage, VersionLogsPage } from "@/pages/version-logs";

import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerCasePage from "@/pages/customer/case";
import CustomerUploadPage from "@/pages/customer/upload";
import CustomerMessagesPage from "@/pages/customer/messages";
import CustomerProfilePage from "@/pages/customer/profile";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminTenantsPage from "@/pages/admin/tenants";
import AdminUsersPage from "@/pages/admin/users";
import AdminVKBPage from "@/pages/admin/vkb";
import AdminAIPage from "@/pages/admin/ai";
import AdminVisaToolsPage from "@/pages/admin/visa-tools";
import AdminAuditPage from "@/pages/admin/audit";
import AdminSettingsPage from "@/pages/admin/settings";
import AdminOperationsPage from "@/pages/admin/operations";
import AdminFinancePage from "@/pages/admin/finance";
import AdminSupportPage from "@/pages/admin/support";
import AdminSubscriptionsPage from "@/pages/admin/subscriptions";
import AdminPagesPage from "@/pages/admin/pages";
import AdminUpdatesPage from "@/pages/admin/updates";
import AdminVersionLogsPage from "@/pages/admin/version-logs";
import AgencySupportPage from "@/pages/agency/support";

import AgencyRegisterPage from "@/pages/agency-register";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsAndConditionsPage from "@/pages/terms-and-conditions";
import RefundPolicyPage from "@/pages/refund-policy";
import DataPolicyPage from "@/pages/data-policy";
import ThirdPartyIntegrationPolicyPage from "@/pages/third-party-integration-policy";
import SchengenSlotsPage from "@/pages/schengen-slots";

import AgencyHomePage from "@/pages/whitelabel/agency-home";
import WhiteLabelLoginPage from "@/pages/whitelabel/login";
import WhiteLabelVerifyPage from "@/pages/whitelabel/verify";
import WhiteLabelPortalPage from "@/pages/whitelabel/portal";
import WhiteLabelCasePage from "@/pages/whitelabel/case";
import WhiteLabelUploadsPage from "@/pages/whitelabel/uploads";
import WhiteLabelMessagesPage from "@/pages/whitelabel/messages";
import WhiteLabelProfilePage from "@/pages/whitelabel/profile";
import WhiteLabelDownloadsPage from "@/pages/whitelabel/downloads";

// Detects agency subdomains (e.g., demo-agency.yourdomain.com)
// and redirects to /w/:slug so the branded landing page loads
function SubdomainRedirect() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    const hostname = window.location.hostname;
    // Skip subdomain detection for Replit development/deployment domains
    const isReplitDomain = hostname.includes("replit.dev") || hostname.includes("repl.co") || hostname.includes("replit.app") || hostname === "localhost";
    if (isReplitDomain) return;
    const parts = hostname.split(".");
    if (parts.length >= 3 && !location.startsWith("/w/") && location === "/") {
      const subdomain = parts[0];
      const ignored = ["www", "app", "api", "mail", "admin"];
      if (!ignored.includes(subdomain) && !/^\d+$/.test(subdomain)) {
        setLocation(`/w/${subdomain}`);
      }
    }
  }, [location, setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/business/agency-crm/signup" component={AgencyCrmSignupPage} />
      <Route path="/business/agency-crm" component={AgencyCrmPage} />
      <Route path="/business/api/signup" component={BusinessApiSignupPage} />
      <Route path="/business/api" component={BusinessApiDetailPage} />
      <Route path="/business/enterprise/signup" component={EnterpriseSignupPage} />
      <Route path="/business/enterprise" component={EnterpriseSolutionsPage} />
      <Route path="/business/whitelabel/signup" component={WhitelabelSignupPage} />
      <Route path="/business/whitelabel" component={WhitelabelSolutionsPage} />
      <Route path="/business/agentic-visa-ai/signup" component={AgenticSignupPage} />
      <Route path="/business/agentic-visa-ai" component={AgenticVisaAiPage} />
      <Route path="/business/growth-hub" component={GrowthHubPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/growth-hub/leads">{() => <GrowthHubDashboardPage view="leads" />}</Route>
      <Route path="/growth-hub/campaigns">{() => <GrowthHubDashboardPage view="campaigns" />}</Route>
      <Route path="/growth-hub/wallet">{() => <GrowthHubDashboardPage view="wallet" />}</Route>
      <Route path="/growth-hub/analytics">{() => <GrowthHubDashboardPage view="analytics" />}</Route>
      <Route path="/growth-hub/profile">{() => <GrowthHubDashboardPage view="profile" />}</Route>
      <Route path="/growth-hub/billing">{() => <GrowthHubDashboardPage view="billing" />}</Route>
      <Route path="/growth-hub/soon">{() => <GrowthHubDashboardPage view="soon" />}</Route>
      <Route path="/growth-hub">{() => <GrowthHubDashboardPage />}</Route>
      <Route path="/join" component={JoinPage} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/check" component={CheckPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/plans/basic-check" component={BasicCheckPlanPage} />
      <Route path="/plans/deep-check" component={DeepCheckPlanPage} />
      <Route path="/plans/pro" component={ProPlanPage} />
      <Route path="/tools/fake-visa-detector" component={FakeVisaDetectorPage} />
      <Route path="/tools/rejection-recovery" component={RejectionRecoveryPage} />
      <Route path="/tools/fake-agency-detector" component={FakeAgencyDetectorPage} />
      <Route path="/tools/fake-employment-detector" component={FakeEmploymentDetectorPage} />
      <Route path="/history/:id" component={HistoryDetailPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/deep-check" component={DeepCheckPage} />
      <Route path="/payment/deep-check/failure" component={PaymentFailurePage} />
      <Route path="/payment/deep-check/return" component={DeepCheckPaymentPage} />
      <Route path="/payment/deep-check" component={DeepCheckPaymentPage} />
      <Route path="/payment/visa-tools-credits/return" component={VisaToolsCreditPaymentPage} />
      <Route path="/payment/visa-tools-credits" component={VisaToolsCreditPaymentPage} />
      <Route path="/saved-profile" component={SavedProfilePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/visa-tools/history/:id" component={VisaToolsHistoryDetailPage} />
      <Route path="/visa-tools/history" component={VisaToolsHistoryPage} />
      <Route path="/visa-tools/visa-check/results" component={B2cVisaCheckResultPage} />
      <Route path="/visa-tools/visa-check" component={B2cVisaCheckPage} />
      <Route path="/visa-tools/:toolType" component={VisaToolCheckPage} />
      <Route path="/visa-tools" component={VisaToolsPage} />
      <Route path="/visa-check/results" component={VisaCheckPublicResultPage} />
      <Route path="/visa-check" component={VisaCheckPublicPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/agency-register" component={AgencyRegisterPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-and-conditions" component={TermsAndConditionsPage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route path="/data-policy" component={DataPolicyPage} />
      <Route path="/third-party-integration-policy" component={ThirdPartyIntegrationPolicyPage} />
      <Route path="/schengen-slots" component={SchengenSlotsPage} />
      {/* Public marketing routes for the Agency API platform.
          Note: the api-server (mounted at /api) serves the canonical
          server-rendered pricing page at GET /api. The route below
          (/api-pricing) is a frontend mirror only used for in-app links. */}
      <Route path="/docs/api" component={ApiDocsPublicPage} />
      <Route path="/api-pricing" component={ApiPricingPublicPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/report-bug" component={ReportBugPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/updates" component={UpdatesPage} />
      <Route path="/careers" component={CareersPage} />
      <Route path="/version-logs/:slug" component={VersionLogDetailPage} />
      <Route path="/version-logs" component={VersionLogsPage} />

      <Route path="/app" component={AgencyDashboard} />
      <Route path="/app/leads" component={LeadsPage} />
      <Route path="/app/customers" component={CustomersPage} />
      <Route path="/app/customers/:id" component={CustomerDetailPage} />
      <Route path="/app/proposals" component={ProposalsPage} />

      {/* Public, tokenized proposal apply page — no auth, token IS the
          credential. Sits at the top level so it doesn't need any layout. */}
      <Route path="/p/:token" component={ProposalApplyPage} />

      {/* Public, tokenized invoice payment page — no auth, token IS the
          credential. Used for both share-link distribution and gateway return. */}
      <Route path="/pay/invoice/:token" component={InvoicePayPage} />
      <Route path="/app/cases" component={CasesPage} />
      <Route path="/app/cases/new" component={NewCasePage} />
      <Route path="/app/cases/processing">
        <CasesPage defaultStatusFilter="processing" pageTitle="Processing" />
      </Route>
      <Route path="/app/cases/completed">
        <CasesPage defaultStatusFilter="completed" pageTitle="Completed" />
      </Route>
      {/* Backward compat for the old combined view */}
      <Route path="/app/cases/pending-completed">
        <CasesPage defaultStatusFilter="pending-completed" pageTitle="Pending & Completed" />
      </Route>
      <Route path="/app/cases/:id" component={CaseDetailPage} />

      {/* Visa workflow module — post-submission tracking of cases by stage. */}
      <Route path="/app/visa/processing">
        <VisaStagePage stage="processing" />
      </Route>
      <Route path="/app/visa/approved">
        <VisaStagePage stage="approved" />
      </Route>
      <Route path="/app/visa/rejected">
        <VisaStagePage stage="rejected" />
      </Route>

      <Route path="/app/documents" component={DocumentsPage} />
      <Route path="/app/accounting">
        <AccountingPage view="invoices" />
      </Route>
      <Route path="/app/accounting/invoices">
        <AccountingPage view="invoices" />
      </Route>
      <Route path="/app/accounting/payments">
        <AccountingPage view="payments" />
      </Route>
      <Route path="/app/accounting/settings">
        <AccountingPage view="settings" defaultSettingsTab="overview" />
      </Route>
      <Route path="/app/accounting/settings/payments">
        <AccountingPage view="settings" defaultSettingsTab="payments" />
      </Route>
      <Route path="/app/accounting/settings/templates">
        <AccountingPage view="settings" defaultSettingsTab="templates" />
      </Route>
      <Route path="/app/accounting/settings/invoice-template">
        <AccountingPage view="settings" defaultSettingsTab="invoice-template" />
      </Route>
      <Route path="/app/business/api"           >{() => <ApiPlatformPage view="overview"  />}</Route>
      <Route path="/app/business/api/keys"      >{() => <ApiPlatformPage view="keys"      />}</Route>
      <Route path="/app/business/api/usage"     >{() => <ApiPlatformPage view="usage"     />}</Route>
      <Route path="/app/business/api/pricing"   >{() => <ApiPlatformPage view="pricing"   />}</Route>
      <Route path="/app/business/api/docs"      >{() => <ApiPlatformPage view="docs"      />}</Route>
      <Route path="/app/business/api/resellers" >{() => <ApiPlatformPage view="resellers" />}</Route>
      <Route path="/app/reports" component={ReportsPage} />
      <Route path="/app/customizer" component={AgencyCustomizerPage} />
      <Route path="/app/settings" component={AgencySettingsPage} />
      <Route path="/app/support" component={AgencySupportPage} />
      <Route path="/app/visa-check/results" component={VisaCheckAgencyResultPage} />
      <Route path="/app/visa-check" component={VisaCheckPage} />

      <Route path="/customer" component={CustomerDashboard} />
      <Route path="/customer/case" component={CustomerCasePage} />
      <Route path="/customer/upload" component={CustomerUploadPage} />
      <Route path="/customer/messages" component={CustomerMessagesPage} />
      <Route path="/customer/profile" component={CustomerProfilePage} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tenants" component={AdminTenantsPage} />
      <Route path="/admin/vkb" component={AdminVKBPage} />
      <Route path="/admin/ai" component={AdminAIPage} />
      <Route path="/admin/visa-tools" component={AdminVisaToolsPage} />
      <Route path="/admin/growth-hub/businesses">{() => <AdminGrowthHubPage view="businesses" />}</Route>
      <Route path="/admin/growth-hub/leads">{() => <AdminGrowthHubPage view="leads" />}</Route>
      <Route path="/admin/growth-hub/campaigns">{() => <AdminGrowthHubPage view="campaigns" />}</Route>
      <Route path="/admin/growth-hub/wallets">{() => <AdminGrowthHubPage view="wallets" />}</Route>
      <Route path="/admin/growth-hub/billing">{() => <AdminGrowthHubPage view="billing" />}</Route>
      <Route path="/admin/growth-hub/settings">{() => <AdminGrowthHubPage view="settings" />}</Route>
      <Route path="/admin/growth-hub/soon">{() => <AdminGrowthHubPage view="soon" />}</Route>
      <Route path="/admin/growth-hub">{() => <AdminGrowthHubPage />}</Route>
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/operations" component={AdminOperationsPage} />
      <Route path="/admin/finance" component={AdminFinancePage} />
      <Route path="/admin/support" component={AdminSupportPage} />
      <Route path="/admin/subscriptions" component={AdminSubscriptionsPage} />
      <Route path="/admin/pages" component={AdminPagesPage} />
      <Route path="/admin/updates" component={AdminUpdatesPage} />
      <Route path="/admin/version-logs" component={AdminVersionLogsPage} />
      <Route path="/admin/audit" component={AdminAuditPage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />

      <Route path="/w/:slug" component={AgencyHomePage} />
      <Route path="/w/:slug/login" component={WhiteLabelLoginPage} />
      <Route path="/w/:slug/verify" component={WhiteLabelVerifyPage} />
      <Route path="/w/:slug/portal" component={WhiteLabelPortalPage} />
      <Route path="/w/:slug/portal/case/:caseId" component={WhiteLabelCasePage} />
      <Route path="/w/:slug/portal/uploads" component={WhiteLabelUploadsPage} />
      <Route path="/w/:slug/portal/messages" component={WhiteLabelMessagesPage} />
      <Route path="/w/:slug/portal/profile" component={WhiteLabelProfilePage} />
      <Route path="/w/:slug/portal/downloads" component={WhiteLabelDownloadsPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        document.getElementById(hash)?.scrollIntoView({ block: "start" });
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [location]);

  return null;
}

const PRODUCT_SHELL_PREFIXES = [
  "/account",
  "/check",
  "/deep-check",
  "/payment",
  "/history",
  "/growth-hub",
  "/saved-profile",
  "/settings",
  "/visa-tools",
  "/app",
  "/customer",
  "/admin",
  "/w/",
  "/p/",
  "/pay/",
];

function SiteChrome() {
  const [location] = useLocation();
  const showSiteChrome = !PRODUCT_SHELL_PREFIXES.some((prefix) => location.startsWith(prefix));

  return (
    <>
      {showSiteChrome && <SiteHeader />}
      <Router />
      {showSiteChrome && <SiteFooter />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <PasswordGate>
            <Toaster />
            <SubdomainRedirect />
            <ScrollToTop />
            <SiteChrome />
            <CookieBanner />
          </PasswordGate>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
