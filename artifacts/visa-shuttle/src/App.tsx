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
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import JoinPage from "@/pages/join";
import SignInPage from "@/pages/sign-in";
import CheckPage from "@/pages/check";
import AccountPage from "@/pages/account";
import PricingPage from "@/pages/pricing";
import HistoryPage from "@/pages/history";
import HistoryDetailPage from "@/pages/history-detail";
import DeepCheckPage from "@/pages/deep-check";
import DeepCheckPaymentPage from "@/pages/deep-check-payment";
import VisaToolsCreditPaymentPage from "@/pages/visa-tools-credit-payment";
import SavedProfilePage from "@/pages/saved-profile";
import SettingsPage from "@/pages/settings";
import VisaToolsPage from "@/pages/visa-tools";
import VisaToolCheckPage from "@/pages/visa-tool-check";
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
      <Route path="/business/agency-crm" component={AgencyCrmPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/join" component={JoinPage} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/check" component={CheckPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/history/:id" component={HistoryDetailPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/deep-check" component={DeepCheckPage} />
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
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/operations" component={AdminOperationsPage} />
      <Route path="/admin/finance" component={AdminFinancePage} />
      <Route path="/admin/support" component={AdminSupportPage} />
      <Route path="/admin/subscriptions" component={AdminSubscriptionsPage} />
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

const PRODUCT_SHELL_PREFIXES = [
  "/account",
  "/check",
  "/deep-check",
  "/payment",
  "/history",
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
            <SiteChrome />
            <CookieBanner />
          </PasswordGate>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
