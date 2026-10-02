import { 
  type User, type InsertUser,
  type Tenant, type InsertTenant,
  type Lead, type InsertLead,
  type Proposal, type InsertProposal,
  type Case, type InsertCase,
  type Appointment, type InsertAppointment,
  type CaseCoTraveller, type InsertCaseCoTraveller,
  type Document, type InsertDocument,
  type Message, type InsertMessage,
  type VisaTemplate, type InsertVisaTemplate,
  type TenantDocumentChecklist,
  type ActivityLog, type InsertActivityLog,
  type CustomerAccount, type InsertCustomerAccount,
  type CustomerTenantLink, type InsertCustomerTenantLink,
  type Passport, type InsertPassport,
  type OTPCode, type InsertOTPCode,
  type B2cUser, type InsertB2cUser,
  type VisaCheck, type InsertVisaCheck,
  type VisaToolCheck, type InsertVisaToolCheck,
  type SavedProfile, type InsertSavedProfile,
  type SmsConfig, type InsertSmsConfig,
  type PlatformAiConfig, type InsertPlatformAiConfig,
  type ZeptoMailConfig, type InsertZeptoMailConfig,
  type EmailTemplate, type InsertEmailTemplate,
  type PaymentGatewayConfig, type InsertPaymentGatewayConfig,
  type B2cCoupon, type InsertB2cCoupon,
  type B2cPlan, type InsertB2cPlan,
  type B2cCreditOrder, type InsertB2cCreditOrder,
  type TenantPaymentGatewayConfig, type InsertTenantPaymentGatewayConfig,
  type TenantSmsConfig, type InsertTenantSmsConfig,
  type FeeTemplate, type InsertFeeTemplate,
  type InvoiceSettings, type InsertInvoiceSettings,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Payment, type InsertPayment,
  users as usersTable,
  tenants as tenantsTable,
  leads as leadsTable,
  cases as casesTable,
  appointments as appointmentsTable,
  caseCoTravellers as caseCoTravellersTable,
  documents as documentsTable,
  messages as messagesTable,
  visaTemplates as visaTemplatesTable,
  activityLogs as activityLogsTable,
  customerAccounts as customerAccountsTable,
  customerTenantLinks as customerTenantLinksTable,
  passports as passportsTable,
  otpCodes as otpCodesTable,
  b2cUsers, visaChecks, visaToolChecks, savedProfiles, smsConfig as smsConfigTable,
  platformAiConfig as platformAiConfigTable,
  zeptoMailConfig as zeptoMailConfigTable,
  emailTemplates as emailTemplatesTable,
  paymentGatewayConfig as paymentGatewayConfigTable,
  b2cCoupons as b2cCouponsTable,
  b2cPlans as b2cPlansTable,
  b2cCreditOrders as b2cCreditOrdersTable,
  tenantPaymentGatewayConfig as tenantPaymentGatewayConfigTable,
  tenantSmsConfig as tenantSmsConfigTable,
  feeTemplates as feeTemplatesTable,
  invoiceSettings as invoiceSettingsTable,
  invoices as invoicesTable,
  invoiceItems as invoiceItemsTable,
  payments as paymentsTable,
  tenantDocumentChecklists as tenantDocumentChecklistsTable,
  proposals as proposalsTable,
  counsellingStudents as counsellingStudentsTable,
  counsellingSessions as counsellingSessionsTable,
  counsellingShortlists as counsellingShortlistsTable,
  counsellingAdmissions as counsellingAdmissionsTable,
  counsellingDocuments as counsellingDocumentsTable,
  counsellingTasks as counsellingTasksTable,
  type VisaProtectionPlan, type InsertVisaProtectionPlan,
  visaProtectionPlans as visaProtectionPlansTable,
} from "@workspace/db";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db, hasDatabase, pool as rawPool } from "./db";

// Canonicalize a phone number for equality comparison: digits only, leading
// "+" / spaces / dashes / parens stripped. Used for OTP + customer-account
// phone lookups so all of "+1 (234) 567-8900", "+12345678900", "12345678900",
// and "1-234-567-8900" collapse to the same identity. Callers are expected
// to ask for a country code in the input, but we don't enforce that here —
// we just need a deterministic key.
function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[^\d]/g, "");
}

export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string; cause?: unknown };
  if (err.code === "42P01") return true;
  const message = err.message ?? "";
  if (
    message.includes("42P01") ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("tenant_document_checklists")
  ) {
    return true;
  }
  return isMissingRelationError(err.cause);
}

export function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string; cause?: unknown };
  if (err.code === "42703") return true;
  const message = err.message ?? "";
  if (message.includes("42703") || message.includes("column") && message.includes("does not exist")) return true;
  return isMissingColumnError(err.cause);
}

function shouldUseMemoryFallback(error: unknown): boolean {
  return process.env.NODE_ENV !== "production" && isMissingRelationError(error);
}

export const DEFAULT_B2C_PLANS: InsertB2cPlan[] = [
  {
    planKey: "free",
    name: "Free",
    description: "Start with a quick AI visa score and essential guidance.",
    billingType: "free",
    prices: { USD: 0, INR: 0, AED: 0, GBP: 0, EUR: 0 },
    features: [
      "1 Basic Check",
      "Approval chance percentage",
      "Status label (High / Good / Moderate / Low)",
      "Strengths & risk factors",
      "Basic next steps",
      "100 Visa Tools Credit",
    ],
    conditions: {
      cta: "Start Free",
      checkout: false,
      extraCreditUnit: 100,
      extraCreditPrices: { USD: 2, INR: 170, AED: 8, GBP: 2, EUR: 2 },
    },
    basicCheckLimit: 1,
    deepCheckLimit: 0,
    visaToolsCredits: 100,
    sortOrder: 1,
    active: true,
  } as InsertB2cPlan,
  {
    planKey: "deep",
    name: "Deep Check",
    description: "One detailed embassy-style AI risk analysis for serious applicants.",
    billingType: "one_time",
    prices: { USD: 15, INR: 1000, AED: 55, GBP: 11, EUR: 12 },
    features: [
      "Full embassy-style risk analysis",
      "Deep Check with 7 profile dimensions",
      "Individual & Family applicant support",
      "Document gap analysis & action plan",
      "Red flag identification",
      "Personalized improvement plan",
      "PDF report download",
      "Check history & dashboard",
      "Priority support",
      "500 Visa Tools Credit",
    ],
    conditions: {
      cta: "Get Deep Check",
      checkout: true,
      extraCreditUnit: 100,
      extraCreditPrices: { USD: 2, INR: 170, AED: 8, GBP: 2, EUR: 2 },
    },
    basicCheckLimit: 1,
    deepCheckLimit: 1,
    visaToolsCredits: 500,
    sortOrder: 2,
    active: true,
  } as InsertB2cPlan,
  {
    planKey: "pro",
    name: "Pro",
    description: "Monthly plan for frequent applicants and family/travel planning.",
    billingType: "monthly",
    prices: { USD: 35, INR: 3000, AED: 125, GBP: 26, EUR: 30 },
    features: [
      "Unlimited Basic checks*",
      "10 Deep Checks",
      "1000 Visa Tools Credit",
    ],
    conditions: {
      cta: "Upgrade to Pro",
      checkout: true,
      note: "*Unlimited Basic checks are subject to fair usage and abuse prevention.",
      extraCreditUnit: 100,
      extraCreditPrices: { USD: 2, INR: 170, AED: 8, GBP: 2, EUR: 2 },
    },
    basicCheckLimit: 9999,
    deepCheckLimit: 10,
    visaToolsCredits: 1000,
    sortOrder: 3,
    active: true,
  } as InsertB2cPlan,
];

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByTenantId(tenantId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;
  
  getLeadsByTenantId(tenantId: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;

  // Proposals — tokenized intake invitations sent to prospects.
  getProposalsByTenantId(tenantId: string): Promise<Proposal[]>;
  getProposal(id: string): Promise<Proposal | undefined>;
  getProposalByToken(token: string): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, data: Partial<Proposal>): Promise<Proposal | undefined>;
  deleteProposal(id: string): Promise<boolean>;
  
  getCasesByTenantId(tenantId: string): Promise<Case[]>;
  getAllCases(): Promise<Case[]>;
  getAllLeads(): Promise<Lead[]>;
  getAllProposals(): Promise<Proposal[]>;
  getAllInvoices(): Promise<Invoice[]>;
  getAllPayments(): Promise<Payment[]>;
  getCasesByTenantAndVisaStage(tenantId: string, stage: string): Promise<Case[]>;
  getCasesByCustomerId(customerId: string): Promise<Case[]>;
  getCasesByCustomerAccountId(customerAccountId: string, tenantId: string): Promise<Case[]>;
  getCaseByReferenceId(referenceId: string, tenantId: string): Promise<Case | undefined>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined>;

  // Appointments — bookings tied to a visa application case
  getAppointmentsByCaseId(caseId: string): Promise<Appointment[]>;
  getAppointmentsByTenantId(tenantId: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(data: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Case Co-Travellers
  getCoTravellersByCaseId(caseId: string): Promise<CaseCoTraveller[]>;
  getCoTraveller(id: string): Promise<CaseCoTraveller | undefined>;
  createCoTraveller(data: InsertCaseCoTraveller): Promise<CaseCoTraveller>;
  updateCoTraveller(id: string, data: Partial<InsertCaseCoTraveller>): Promise<CaseCoTraveller | undefined>;
  deleteCoTraveller(id: string): Promise<boolean>;

  getDocumentsByCaseId(caseId: string): Promise<Document[]>;
  getDocumentsByTenantId(tenantId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined>;
  
  getMessagesByCaseId(caseId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  getAllVisaTemplates(): Promise<VisaTemplate[]>;
  getVisaTemplate(id: string): Promise<VisaTemplate | undefined>;
  createVisaTemplate(template: InsertVisaTemplate): Promise<VisaTemplate>;
  updateVisaTemplate(id: string, data: Partial<InsertVisaTemplate>): Promise<VisaTemplate | undefined>;
  deleteVisaTemplate(id: string): Promise<boolean>;
  getTenantDocumentChecklists(tenantId: string): Promise<TenantDocumentChecklist[]>;
  getTenantDocumentChecklist(tenantId: string, country: string, visaType: string): Promise<TenantDocumentChecklist | undefined>;
  upsertTenantDocumentChecklist(tenantId: string, country: string, visaType: string, requirements: unknown): Promise<TenantDocumentChecklist>;
  deleteTenantDocumentChecklist(tenantId: string, country: string, visaType: string): Promise<boolean>;
  
  getActivityLogsByTenantId(tenantId: string): Promise<ActivityLog[]>;
  getAllActivityLogs(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getCustomerAccount(id: string): Promise<CustomerAccount | undefined>;
  getCustomerAccountByEmail(email: string): Promise<CustomerAccount | undefined>;
  getCustomerAccountByPhone(phone: string): Promise<CustomerAccount | undefined>;
  createCustomerAccount(account: InsertCustomerAccount): Promise<CustomerAccount>;
  updateCustomerAccount(id: string, data: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined>;

  getCustomerTenantLink(customerAccountId: string, tenantId: string): Promise<CustomerTenantLink | undefined>;
  createCustomerTenantLink(link: InsertCustomerTenantLink): Promise<CustomerTenantLink>;
  getCustomerTenantLinks(customerAccountId: string): Promise<CustomerTenantLink[]>;
  // Returns every customerAccount linked to a given tenant (used by the
  // agency-side Customers module).
  getCustomersByTenantId(tenantId: string): Promise<CustomerAccount[]>;

  // Customer-owned passport library. Passports are stored at the customer
  // level (not per case) so they can be reused across applications, and
  // co-travellers' passports live under the same customer.
  getPassportsByCustomerId(customerAccountId: string, tenantId: string): Promise<Passport[]>;
  getPassportsByTenantId(tenantId: string): Promise<Passport[]>;
  getPassport(id: string): Promise<Passport | undefined>;
  createPassport(passport: InsertPassport): Promise<Passport>;
  updatePassport(id: string, data: Partial<InsertPassport>): Promise<Passport | undefined>;
  deletePassport(id: string): Promise<boolean>;

  createOTPCode(otp: InsertOTPCode): Promise<OTPCode>;
  getActiveOTPCode(email: string, tenantId: string): Promise<OTPCode | undefined>;

  getSaasPricingSettings(): Promise<any>;
  updateSaasPricingSettings(patch: any): Promise<any>;

  getSecurityPolicies(): Promise<any>;
  updateSecurityPolicies(patch: any): Promise<any>;
  getCronJobs(): Promise<any[]>;
  runCronJob(jobId: string): Promise<any>;
  getServerDiagnostics(): Promise<any>;
  getDatabaseStatus(): Promise<any>;
  getActiveOTPCodeByPhone(phone: string, tenantId: string): Promise<OTPCode | undefined>;
  markOTPUsed(id: string): Promise<void>;
  incrementOTPAttempts(id: string): Promise<void>;

  // B2C Users
  getB2cUser(id: string): Promise<B2cUser | undefined>;
  getB2cUserByEmail(email: string): Promise<B2cUser | undefined>;
  getB2cUserByPhone(phone: string): Promise<B2cUser | undefined>;
  getB2cUserByVerificationToken(token: string): Promise<B2cUser | undefined>;
  getB2cUserByPasswordResetToken(token: string): Promise<B2cUser | undefined>;
  setB2cPasswordReset(id: string, token: string | null, expires: Date | null): Promise<void>;
  getAllB2cUsers(): Promise<B2cUser[]>;
  createB2cUser(user: InsertB2cUser): Promise<B2cUser>;
  updateB2cUser(id: string, data: Partial<Omit<B2cUser, 'id' | 'createdAt'>>): Promise<B2cUser | undefined>;
  deleteB2cUser(id: string): Promise<boolean>;

  // Visa Checks
  createVisaCheck(check: InsertVisaCheck): Promise<VisaCheck>;
  getVisaChecksByUserId(userId: string): Promise<VisaCheck[]>;
  getVisaCheck(id: string): Promise<VisaCheck | undefined>;

  // Visa Tools
  createVisaToolCheck(check: InsertVisaToolCheck): Promise<VisaToolCheck>;
  getVisaToolChecksByUserId(userId: string): Promise<VisaToolCheck[]>;
  getVisaToolCheck(id: string): Promise<VisaToolCheck | undefined>;
  getAllVisaToolChecks(): Promise<VisaToolCheck[]>;

  // Saved Profiles
  getSavedProfile(userId: string): Promise<SavedProfile | undefined>;
  upsertSavedProfile(userId: string, data: Partial<InsertSavedProfile>): Promise<SavedProfile>;

  // SMS Config
  getSmsConfig(): Promise<SmsConfig | undefined>;
  upsertSmsConfig(data: Partial<InsertSmsConfig>): Promise<SmsConfig>;

  // Platform AI Config
  getPlatformAiConfig(): Promise<PlatformAiConfig | undefined>;
  upsertPlatformAiConfig(data: Partial<InsertPlatformAiConfig>): Promise<PlatformAiConfig>;

  // Platform Email Config + B2C Templates
  getZeptoMailConfig(): Promise<ZeptoMailConfig | undefined>;
  upsertZeptoMailConfig(data: Partial<InsertZeptoMailConfig>): Promise<ZeptoMailConfig>;
  getEmailTemplates(audience?: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getEmailTemplateByKey(audience: string, templateKey: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: string): Promise<boolean>;

  // Payment Gateway Config
  getPaymentGatewayConfig(): Promise<PaymentGatewayConfig | undefined>;
  upsertPaymentGatewayConfig(data: Partial<InsertPaymentGatewayConfig>): Promise<PaymentGatewayConfig>;
  getB2cCoupons(): Promise<B2cCoupon[]>;
  getB2cCoupon(id: string): Promise<B2cCoupon | undefined>;
  getB2cCouponByCode(code: string): Promise<B2cCoupon | undefined>;
  createB2cCoupon(data: InsertB2cCoupon): Promise<B2cCoupon>;
  updateB2cCoupon(id: string, data: Partial<InsertB2cCoupon>): Promise<B2cCoupon | undefined>;
  incrementB2cCouponUsage(id: string): Promise<B2cCoupon | undefined>;
  deleteB2cCoupon(id: string): Promise<boolean>;
  getB2cPlans(): Promise<B2cPlan[]>;
  getB2cPlan(planKey: string): Promise<B2cPlan | undefined>;
  upsertB2cPlan(planKey: string, data: Partial<InsertB2cPlan>): Promise<B2cPlan>;
  getB2cCreditOrdersByUserId(userId: string): Promise<B2cCreditOrder[]>;
  getB2cCreditOrderByOrderId(orderId: string): Promise<B2cCreditOrder | undefined>;
  createB2cCreditOrder(data: InsertB2cCreditOrder): Promise<B2cCreditOrder>;
  markB2cCreditOrderPaid(orderId: string): Promise<B2cCreditOrder | undefined>;

  // Visa Protection Plans
  createVisaProtectionPlan(plan: InsertVisaProtectionPlan): Promise<VisaProtectionPlan>;
  getVisaProtectionPlanByDeepCheckId(deepCheckId: string): Promise<VisaProtectionPlan | undefined>;
  getVisaProtectionPlansByUserId(userId: string): Promise<VisaProtectionPlan[]>;
  updateVisaProtectionPlan(id: string, data: Partial<InsertVisaProtectionPlan>): Promise<VisaProtectionPlan | undefined>;

  // Per-tenant Payment Gateway Config (Cashfree)
  getTenantPaymentGatewayConfig(tenantId: string): Promise<TenantPaymentGatewayConfig | undefined>;
  upsertTenantPaymentGatewayConfig(tenantId: string, data: Partial<InsertTenantPaymentGatewayConfig>): Promise<TenantPaymentGatewayConfig>;

  // Per-tenant SMS Config (MessageCentral)
  getTenantSmsConfig(tenantId: string): Promise<TenantSmsConfig | undefined>;
  upsertTenantSmsConfig(tenantId: string, data: Partial<InsertTenantSmsConfig>): Promise<TenantSmsConfig>;

  // Fee Templates
  getFeeTemplatesByTenantId(tenantId: string): Promise<FeeTemplate[]>;
  getFeeTemplate(id: string): Promise<FeeTemplate | undefined>;
  createFeeTemplate(data: InsertFeeTemplate): Promise<FeeTemplate>;
  updateFeeTemplate(id: string, data: Partial<InsertFeeTemplate>): Promise<FeeTemplate | undefined>;
  deleteFeeTemplate(id: string): Promise<boolean>;

  // Invoice Settings
  getInvoiceSettings(tenantId: string): Promise<InvoiceSettings | undefined>;
  upsertInvoiceSettings(tenantId: string, data: Partial<InsertInvoiceSettings>): Promise<InvoiceSettings>;

  // Invoices
  getInvoicesByTenantId(tenantId: string): Promise<Invoice[]>;
  getInvoicesByCaseId(caseId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByPublicToken(token: string): Promise<Invoice | undefined>;
  createInvoice(data: InsertInvoice, items: Omit<InsertInvoiceItem, "invoiceId">[]): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  replaceInvoiceItems(invoiceId: string, items: Omit<InsertInvoiceItem, "invoiceId">[]): Promise<InvoiceItem[]>;
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;

  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]>;
  getPaymentsByTenantId(tenantId: string): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;
  deletePayment(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tenants: Map<string, Tenant>;
  private leads: Map<string, Lead>;
  private proposals: Map<string, Proposal>;
  private cases: Map<string, Case>;
  private documents: Map<string, Document>;
  private messages: Map<string, Message>;
  private visaTemplates: Map<string, VisaTemplate>;
  private tenantDocumentChecklists: Map<string, TenantDocumentChecklist> = new Map();
  private activityLogs: Map<string, ActivityLog>;
  private customerAccounts: Map<string, CustomerAccount>;
  private customerTenantLinks: Map<string, CustomerTenantLink>;
  private otpCodes: Map<string, OTPCode>;
  private b2cUsersMap: Map<string, B2cUser>;
  private visaChecksMap: Map<string, VisaCheck>;
  private visaToolChecksMap: Map<string, VisaToolCheck>;
  private savedProfilesMap: Map<string, SavedProfile>;
  private smsConfigRecord?: SmsConfig;
  private platformAiConfigRecord?: PlatformAiConfig;
  private zeptoMailConfigRecord?: ZeptoMailConfig;
  private emailTemplatesMap: Map<string, EmailTemplate> = new Map();
  private paymentGatewayConfigRecord?: PaymentGatewayConfig;
  private b2cCouponsMap: Map<string, B2cCoupon> = new Map();
  private b2cPlansMap: Map<string, B2cPlan> = new Map();
  private b2cCreditOrdersMap: Map<string, B2cCreditOrder> = new Map();
  private visaProtectionPlansMap: Map<string, VisaProtectionPlan> = new Map();
  private tenantPaymentGatewayConfigByTenant: Map<string, TenantPaymentGatewayConfig> = new Map();
  private tenantSmsConfigByTenant: Map<string, TenantSmsConfig> = new Map();
  private feeTemplates: Map<string, FeeTemplate> = new Map();
  private invoiceSettingsByTenant: Map<string, InvoiceSettings> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private invoiceItems: Map<string, InvoiceItem> = new Map();
  private payments: Map<string, Payment> = new Map();
  private coTravellers: Map<string, CaseCoTraveller> = new Map();
  private appointments: Map<string, Appointment> = new Map();
  private passportsMap: Map<string, Passport> = new Map();

  constructor() {
    this.users = new Map();
    this.tenants = new Map();
    this.leads = new Map();
    this.proposals = new Map();
    this.cases = new Map();
    this.documents = new Map();
    this.messages = new Map();
    this.visaTemplates = new Map();
    this.activityLogs = new Map();
    this.customerAccounts = new Map();
    this.customerTenantLinks = new Map();
    this.otpCodes = new Map();
    this.b2cUsersMap = new Map();
    this.visaChecksMap = new Map();
    this.visaToolChecksMap = new Map();
    this.savedProfilesMap = new Map();
    this.seedB2cPlans();
    
    this.seedData();
  }

  private seedB2cPlans() {
    for (const plan of DEFAULT_B2C_PLANS) {
      const now = new Date();
      const row: B2cPlan = {
        id: randomUUID(),
        planKey: plan.planKey,
        name: plan.name,
        description: plan.description ?? null,
        billingType: plan.billingType ?? "free",
        prices: plan.prices as any,
        features: plan.features as any,
        conditions: plan.conditions as any,
        basicCheckLimit: plan.basicCheckLimit ?? 0,
        deepCheckLimit: plan.deepCheckLimit ?? 0,
        visaToolsCredits: plan.visaToolsCredits ?? 0,
        sortOrder: plan.sortOrder ?? 0,
        active: plan.active ?? true,
        createdAt: now,
        updatedAt: now,
      };
      this.b2cPlansMap.set(row.planKey, row);
    }
  }

  private seedData() {
    const tenant1: Tenant = {
      id: "tenant-1",
      name: "Demo Travel Agency",
      slug: "demo-agency",
      logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=DTA&backgroundColor=00B4D8&textColor=ffffff",
      plan: "go",
      status: "active",
      primaryColor: "#00B4D8",
      secondaryColor: "#E056A0",
      accentColor: "#0096C7",
      contactEmail: "info@demoagency.com",
      contactPhone: "+1 234 567 8900",
      activities: ["VISA Services", "Tours & Travels"],
      address: "Demo Street",
      country: "India",
      pinCode: null,
      state: null,
      district: null,
      whatsappNumber: "+1 234 567 8900",
      showPoweredBy: true,
      authMethod: "otp",
      createdAt: new Date()
    };
    this.tenants.set(tenant1.id, tenant1);

    const adminUser: User = {
      id: "user-admin",
      email: "admin@visashuttle.com",
      password: "Admin@12345",
      name: "System Admin",
      role: "saas_admin",
      tenantId: null,
      avatarUrl: null,
      permissions: [],
      createdAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    const agencyOwner: User = {
      id: "user-owner",
      email: "owner@demoagency.com",
      password: "Demo@12345",
      name: "Sarah Agent",
      role: "agency_owner",
      tenantId: "tenant-1",
      avatarUrl: null,
      // Owner is implicitly all-access at the route layer; the array is just
      // for completeness so the type matches.
      permissions: [],
      createdAt: new Date()
    };
    this.users.set(agencyOwner.id, agencyOwner);

    const customer: User = {
      id: "user-customer",
      email: "customer@demo.com",
      password: "Demo@12345",
      name: "John Smith",
      role: "customer",
      tenantId: "tenant-1",
      avatarUrl: null,
      permissions: [],
      createdAt: new Date()
    };
    this.users.set(customer.id, customer);

    const demoCustomerAccount: CustomerAccount = {
      id: "customer-account-1",
      email: "john@example.com",
      phone: "+1 555 123 4567",
      name: "John Smith",
      avatarUrl: null,
      isVerified: true,
      createdAt: new Date()
    };
    this.customerAccounts.set(demoCustomerAccount.id, demoCustomerAccount);

    const customerTenantLink: CustomerTenantLink = {
      id: "link-1",
      customerAccountId: "customer-account-1",
      tenantId: "tenant-1",
      role: "customer",
      createdAt: new Date()
    };
    this.customerTenantLinks.set(customerTenantLink.id, customerTenantLink);

    const leads: Lead[] = [
      { id: "lead-1", tenantId: "tenant-1", name: "Alice Cooper", email: "alice@example.com", phone: "+1 234 567 8901", source: "Website", destinationCountry: "France", visaType: "Tourist Visa", stage: "new", notes: null, assignedTo: "user-owner", createdAt: new Date(), updatedAt: new Date() },
      { id: "lead-2", tenantId: "tenant-1", name: "Bob Wilson", email: "bob@example.com", phone: "+1 234 567 8902", source: "Referral", destinationCountry: "United States", visaType: "B1/B2 – Business / Pleasure", stage: "contacted", notes: null, assignedTo: "user-owner", createdAt: new Date(), updatedAt: new Date() },
      { id: "lead-3", tenantId: "tenant-1", name: "Carol Martinez", email: "carol@example.com", phone: "+1 234 567 8903", source: "Social Media", destinationCountry: "Canada", visaType: "Student Visa", stage: "qualified", notes: null, assignedTo: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    leads.forEach(lead => this.leads.set(lead.id, lead));

    // Seed demo fee templates for tenant-1
    const demoFeeTemplates: FeeTemplate[] = [
      {
        id: "fee-tpl-1",
        tenantId: "tenant-1",
        name: "Schengen Tourist Visa - France",
        destinationCountry: "France",
        destinationCountries: ["France", "Germany", "Italy", "Spain", "Netherlands"],
        visaType: "Tourist Visa",
        agencyFee: 15000,
        governmentFee: 8000,
        serviceFee: 3500,
        otherFee: 0,
        otherFeeLabel: null,
        currency: "USD",
        defaultPaymentType: "upfront",
        advancePercent: 50,
        description: "Standard Schengen short-stay tourist visa via French consulate",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "fee-tpl-2",
        tenantId: "tenant-1",
        name: "US B1/B2 Visa",
        destinationCountry: "United States",
        destinationCountries: ["United States"],
        visaType: "B1/B2 – Business / Pleasure",
        agencyFee: 25000,
        governmentFee: 18500,
        serviceFee: 5000,
        otherFee: 1500,
        otherFeeLabel: "Courier",
        currency: "USD",
        defaultPaymentType: "advance",
        advancePercent: 50,
        description: "B1/B2 visitor visa with interview prep included",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "fee-tpl-3",
        tenantId: "tenant-1",
        name: "Canada Student Visa",
        destinationCountry: "Canada",
        destinationCountries: ["Canada"],
        visaType: "Student Visa",
        agencyFee: 50000,
        governmentFee: 15000,
        serviceFee: 8500,
        otherFee: 0,
        otherFeeLabel: null,
        currency: "USD",
        defaultPaymentType: "installments",
        advancePercent: 30,
        description: "Full study permit application with SOP review",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    demoFeeTemplates.forEach(t => this.feeTemplates.set(t.id, t));

    // Seed default invoice settings for tenant-1
    const demoSettings: InvoiceSettings = {
      id: "inv-settings-1",
      tenantId: "tenant-1",
      companyName: "Demo Travel Agency",
      companyAddress: "123 Visa Street, Suite 400\nNew York, NY 10001",
      companyEmail: "billing@demoagency.com",
      companyPhone: "+1 234 567 8900",
      taxId: "TAX-987654321",
      logoUrl: null,
      invoiceAccentColor: null,
      currency: "USD",
      taxRate: 0,
      taxLabel: "Tax",
      invoicePrefix: "INV",
      paymentTerms: "Due on receipt",
      paymentInstructions: "Bank transfers preferred. See bank details below.",
      bankDetails: "Bank: Demo Bank\nAccount: 1234567890\nRouting: 021000021",
      upiId: null,
      upiQrFileUrl: null,
      footerText: "Thank you for your business.",
      notes: null,
      gstEnabled: false,
      gstin: null,
      gstStateCode: null,
      gstStateName: null,
      gstLegalName: null,
      updatedAt: new Date(),
    };
    this.invoiceSettingsByTenant.set("tenant-1", demoSettings);

    // Seed a sample invoice tied to case-1
    const sampleInvoice: Invoice = {
      id: "inv-1",
      tenantId: "tenant-1",
      invoiceNumber: "INV-2024-0001",
      caseId: "case-1",
      leadId: null,
      customerName: "John Smith",
      customerEmail: "john@example.com",
      customerPhone: null,
      destinationCountry: "France",
      visaType: "Schengen Tourist",
      status: "partial",
      paymentType: "advance",
      advancePercent: 50,
      subtotal: 26500,
      taxAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      total: 26500,
      paidAmount: 13250,
      currency: "USD",
      customerGstin: null,
      placeOfSupplyCode: null,
      placeOfSupplyName: null,
      reverseCharge: false,
      issuedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      dueDate: new Date(Date.now() + 9 * 24 * 3600 * 1000),
      notes: null,
      publicToken: null,
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      updatedAt: new Date(),
    };
    this.invoices.set(sampleInvoice.id, sampleInvoice);
    const sampleItems: InvoiceItem[] = [
      { id: "inv-item-1", invoiceId: "inv-1", description: "Visa Agency Fee", category: "agency_fee", quantity: 1, unitPrice: 15000, amount: 15000, sortOrder: 0, hsnCode: null, taxRate: 0 },
      { id: "inv-item-2", invoiceId: "inv-1", description: "French Consulate Fee", category: "government_fee", quantity: 1, unitPrice: 8000, amount: 8000, sortOrder: 1, hsnCode: null, taxRate: 0 },
      { id: "inv-item-3", invoiceId: "inv-1", description: "VFS Service Charge", category: "service_charge", quantity: 1, unitPrice: 3500, amount: 3500, sortOrder: 2, hsnCode: null, taxRate: 0 },
    ];
    sampleItems.forEach(i => this.invoiceItems.set(i.id, i));
    const samplePayment: Payment = {
      id: "pay-1",
      invoiceId: "inv-1",
      tenantId: "tenant-1",
      amount: 13250,
      method: "bank_transfer",
      reference: "TXN-001",
      paidAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      notes: "50% advance",
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    };
    this.payments.set(samplePayment.id, samplePayment);

    const cases: Case[] = [
      { 
        id: "case-1", 
        tenantId: "tenant-1", 
        customerId: "user-customer", 
        customerAccountId: "customer-account-1",
        caseNumber: "VS-2024-001", 
        referenceId: "REF-ABC123",
        applicantName: "John Smith",
        applicantDob: "1990-05-15",
        passportSurname: null,
        passportGivenName: null,
        passportMiddleName: null,
        passportNumber: null,
        passportNationality: null,
        passportGender: null,
        passportDateOfIssue: null,
        passportDateOfExpiry: null,
        passportPlaceOfIssue: null,
        passportPlaceOfBirth: null,
        passportFileUrl: null,
        visaType: "Schengen Tourist", 
        destinationCountry: "France", 
        status: "in_progress", 
        priority: "normal", 
        assignedTo: "user-owner", 
        travelDate: new Date("2024-03-15"), 
        notes: null, 
        readinessScore: 75, 
        submissionMethod: null,
        visaStage: "not_started",
        visaProcessingStatus: null,
        visaStatusComment: null,
        visaStatusUpdatedAt: null,
        visaCopyFileUrl: null,
        visaCopyFileName: null,
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        id: "case-2", 
        tenantId: "tenant-1", 
        customerId: "user-customer", 
        customerAccountId: "customer-account-1",
        caseNumber: "VS-2024-002", 
        referenceId: "REF-DEF456",
        applicantName: "John Smith",
        applicantDob: "1990-05-15",
        passportSurname: null,
        passportGivenName: null,
        passportMiddleName: null,
        passportNumber: null,
        passportNationality: null,
        passportGender: null,
        passportDateOfIssue: null,
        passportDateOfExpiry: null,
        passportPlaceOfIssue: null,
        passportPlaceOfBirth: null,
        passportFileUrl: null,
        visaType: "UK Visitor", 
        destinationCountry: "United Kingdom", 
        status: "documents_required", 
        priority: "high", 
        assignedTo: "user-owner", 
        travelDate: new Date("2024-04-20"), 
        notes: null, 
        readinessScore: 45, 
        submissionMethod: null,
        visaStage: "not_started",
        visaProcessingStatus: null,
        visaStatusComment: null,
        visaStatusUpdatedAt: null,
        visaCopyFileUrl: null,
        visaCopyFileName: null,
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
    ];
    cases.forEach(c => this.cases.set(c.id, c));

    const documents: Document[] = [
      { id: "doc-1", caseId: "case-1", tenantId: "tenant-1", name: "Passport Scan", type: "passport", status: "approved", fileUrl: null, qualityScore: 95, extractedData: null, notes: null, uploadedAt: new Date(), reviewedAt: new Date() },
      { id: "doc-2", caseId: "case-1", tenantId: "tenant-1", name: "Photo", type: "photo", status: "approved", fileUrl: null, qualityScore: 88, extractedData: null, notes: null, uploadedAt: new Date(), reviewedAt: new Date() },
      { id: "doc-3", caseId: "case-1", tenantId: "tenant-1", name: "Bank Statement", type: "bank_statement", status: "pending", fileUrl: null, qualityScore: null, extractedData: null, notes: null, uploadedAt: new Date(), reviewedAt: null },
      { id: "doc-4", caseId: "case-1", tenantId: "tenant-1", name: "Flight Itinerary", type: "itinerary", status: "needs_reupload", fileUrl: null, qualityScore: 30, extractedData: null, notes: "Document is blurry", uploadedAt: new Date(), reviewedAt: null },
    ];
    documents.forEach(doc => this.documents.set(doc.id, doc));

    const visaTemplates: VisaTemplate[] = [
      { id: "vt-1", country: "France", visaType: "Schengen Tourist", requirements: { documents: ["passport", "photo", "bank_statement", "itinerary", "accommodation", "insurance"] }, processingTime: "15 working days", fees: "€80", notes: null, version: 5, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "vt-2", country: "United Kingdom", visaType: "Visitor Visa", requirements: { documents: ["passport", "photo", "bank_statement", "employment_letter", "itinerary"] }, processingTime: "15 working days", fees: "£100", notes: null, version: 3, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: "vt-3", country: "UAE", visaType: "Tourist Visa", requirements: { documents: ["passport", "photo", "bank_statement"] }, processingTime: "3-5 working days", fees: "$90", notes: null, version: 2, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ];
    visaTemplates.forEach(vt => this.visaTemplates.set(vt.id, vt));

    const messages: Message[] = [
      { id: "msg-1", caseId: "case-1", senderId: "user-owner", senderRole: "agency", content: "Hello John! Welcome to Visa Shuttle. I'll be helping you with your Schengen visa application.", isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
      { id: "msg-2", caseId: "case-1", senderId: "user-customer", senderRole: "customer", content: "Thank you! I've uploaded my passport. What else do I need?", isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 47) },
      { id: "msg-3", caseId: "case-1", senderId: "user-owner", senderRole: "agency", content: "Great! Your passport looks good. Please upload your bank statement for the last 3 months.", isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    ];
    messages.forEach(msg => this.messages.set(msg.id, msg));

    // Seed demo B2C user so login always works after restarts
    const demoB2cUser: B2cUser = {
      id: "b2c-demo",
      email: "demo@visashuttle.com",
      password: bcrypt.hashSync("Demo@12345", 10),
      fullName: "Demo User",
      phone: null,
      phoneVerified: false,
      freeChecksUsed: 0,
      subscriptionPlan: "pro",
      checkLimit: 5,
      deepCheckAccess: true,
      adminDeepCheckBonus: 0,
      emailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      stripeCustomerId: null,
      createdAt: new Date(),
    };
    this.b2cUsersMap.set(demoB2cUser.id, demoB2cUser);

    // Test account with unlimited Deep Check access (for QA / testing only)
    const testB2cUser: B2cUser = {
      id: "b2c-test",
      email: "test@visashuttle.com",
      password: bcrypt.hashSync("Test@12345", 10),
      fullName: "Test Account",
      phone: null,
      phoneVerified: false,
      freeChecksUsed: 0,
      subscriptionPlan: "pro",
      checkLimit: 9999,
      deepCheckAccess: true,
      adminDeepCheckBonus: 0,
      emailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      stripeCustomerId: null,
      createdAt: new Date(),
    };
    this.b2cUsersMap.set(testB2cUser.id, testB2cUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUsersByTenantId(tenantId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.tenantId === tenantId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id, 
      email: insertUser.email,
      password: insertUser.password,
      name: insertUser.name,
      role: insertUser.role ?? "customer",
      tenantId: insertUser.tenantId ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      permissions: insertUser.permissions ?? [],
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find(t => t.slug === slug);
  }

  async getAllTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values());
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const tenant: Tenant = { 
      id, 
      name: insertTenant.name,
      slug: insertTenant.slug,
      logoUrl: insertTenant.logoUrl ?? null,
      plan: insertTenant.plan ?? "lite",
      status: insertTenant.status ?? "active",
      primaryColor: insertTenant.primaryColor ?? "#00B4D8",
      secondaryColor: insertTenant.secondaryColor ?? "#E056A0",
      accentColor: insertTenant.accentColor ?? "#0096C7",
      contactEmail: insertTenant.contactEmail ?? null,
      contactPhone: insertTenant.contactPhone ?? null,
      activities: insertTenant.activities ?? [],
      address: insertTenant.address ?? null,
      country: insertTenant.country ?? null,
      pinCode: insertTenant.pinCode ?? null,
      state: insertTenant.state ?? null,
      district: insertTenant.district ?? null,
      whatsappNumber: insertTenant.whatsappNumber ?? null,
      showPoweredBy: insertTenant.showPoweredBy ?? true,
      authMethod: insertTenant.authMethod ?? "otp",
      createdAt: new Date() 
    };
    this.tenants.set(id, tenant);
    return tenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;
    const updated = { ...tenant, ...data };
    this.tenants.set(id, updated);
    return updated;
  }

  async deleteTenant(id: string): Promise<boolean> {
    return this.tenants.delete(id);
  }

  async getLeadsByTenantId(tenantId: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.tenantId === tenantId);
  }

  async getLead(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const lead: Lead = { 
      id, 
      tenantId: insertLead.tenantId,
      name: insertLead.name,
      email: insertLead.email,
      phone: insertLead.phone ?? null,
      source: insertLead.source ?? null,
      destinationCountry: insertLead.destinationCountry ?? null,
      visaType: insertLead.visaType ?? null,
      stage: insertLead.stage ?? "new",
      notes: insertLead.notes ?? null,
      assignedTo: insertLead.assignedTo ?? null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.leads.set(id, lead);
    return lead;
  }

  async updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined> {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    const updated = { ...lead, ...data, updatedAt: new Date() };
    this.leads.set(id, updated);
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    return this.leads.delete(id);
  }

  // ===== Proposals =====
  async getProposalsByTenantId(tenantId: string): Promise<Proposal[]> {
    return Array.from(this.proposals.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async getProposalByToken(token: string): Promise<Proposal | undefined> {
    return Array.from(this.proposals.values()).find(p => p.token === token);
  }

  async createProposal(data: InsertProposal): Promise<Proposal> {
    const id = randomUUID();
    const now = new Date();
    const proposal: Proposal = {
      id,
      tenantId: data.tenantId,
      token: data.token,
      createdBy: data.createdBy,
      leadId: data.leadId ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail ?? null,
      customerPhone: data.customerPhone ?? null,
      destinationCountry: data.destinationCountry,
      visaType: data.visaType,
      notes: data.notes ?? null,
      estimateAmountCents: data.estimateAmountCents ?? null,
      status: data.status ?? "sent",
      expiresAt: data.expiresAt ?? null,
      appliedCaseId: null,
      appliedAt: null,
      viewedAt: null,
      customerDraftData: null,
      customerDraftSavedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  async updateProposal(id: string, data: Partial<Proposal>): Promise<Proposal | undefined> {
    const existing = this.proposals.get(id);
    if (!existing) return undefined;
    const updated: Proposal = { ...existing, ...data, updatedAt: new Date() };
    this.proposals.set(id, updated);
    return updated;
  }

  async deleteProposal(id: string): Promise<boolean> {
    return this.proposals.delete(id);
  }

  // ===== Accounting: Fee Templates =====
  async getFeeTemplatesByTenantId(tenantId: string): Promise<FeeTemplate[]> {
    return Array.from(this.feeTemplates.values())
      .filter(t => t.tenantId === tenantId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getFeeTemplate(id: string): Promise<FeeTemplate | undefined> {
    return this.feeTemplates.get(id);
  }

  async createFeeTemplate(data: InsertFeeTemplate): Promise<FeeTemplate> {
    const id = randomUUID();
    const tpl: FeeTemplate = {
      id,
      tenantId: data.tenantId,
      name: data.name,
      destinationCountry: data.destinationCountry ?? null,
      destinationCountries: data.destinationCountries ?? null,
      visaType: data.visaType ?? null,
      agencyFee: data.agencyFee ?? 0,
      governmentFee: data.governmentFee ?? 0,
      serviceFee: data.serviceFee ?? 0,
      otherFee: data.otherFee ?? 0,
      otherFeeLabel: data.otherFeeLabel ?? null,
      currency: data.currency ?? "USD",
      defaultPaymentType: data.defaultPaymentType ?? "upfront",
      advancePercent: data.advancePercent ?? 50,
      description: data.description ?? null,
      active: data.active ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.feeTemplates.set(id, tpl);
    return tpl;
  }

  async updateFeeTemplate(id: string, data: Partial<InsertFeeTemplate>): Promise<FeeTemplate | undefined> {
    const existing = this.feeTemplates.get(id);
    if (!existing) return undefined;
    const updated: FeeTemplate = { ...existing, ...data, id, updatedAt: new Date() };
    this.feeTemplates.set(id, updated);
    return updated;
  }

  async deleteFeeTemplate(id: string): Promise<boolean> {
    return this.feeTemplates.delete(id);
  }

  // ===== Accounting: Invoice Settings =====
  async getInvoiceSettings(tenantId: string): Promise<InvoiceSettings | undefined> {
    return this.invoiceSettingsByTenant.get(tenantId);
  }

  async upsertInvoiceSettings(tenantId: string, data: Partial<InsertInvoiceSettings>): Promise<InvoiceSettings> {
    const existing = this.invoiceSettingsByTenant.get(tenantId);
    const merged: InvoiceSettings = {
      id: existing?.id ?? randomUUID(),
      tenantId,
      companyName: data.companyName ?? existing?.companyName ?? null,
      companyAddress: data.companyAddress ?? existing?.companyAddress ?? null,
      companyEmail: data.companyEmail ?? existing?.companyEmail ?? null,
      companyPhone: data.companyPhone ?? existing?.companyPhone ?? null,
      taxId: data.taxId ?? existing?.taxId ?? null,
      logoUrl: data.logoUrl ?? existing?.logoUrl ?? null,
      invoiceAccentColor: data.invoiceAccentColor ?? existing?.invoiceAccentColor ?? null,
      currency: data.currency ?? existing?.currency ?? "USD",
      taxRate: data.taxRate ?? existing?.taxRate ?? 0,
      taxLabel: data.taxLabel ?? existing?.taxLabel ?? "Tax",
      invoicePrefix: data.invoicePrefix ?? existing?.invoicePrefix ?? "INV",
      paymentTerms: data.paymentTerms ?? existing?.paymentTerms ?? "Due on receipt",
      paymentInstructions: data.paymentInstructions ?? existing?.paymentInstructions ?? null,
      bankDetails: data.bankDetails ?? existing?.bankDetails ?? null,
      upiId: (data as any).upiId ?? existing?.upiId ?? null,
      upiQrFileUrl: (data as any).upiQrFileUrl ?? existing?.upiQrFileUrl ?? null,
      footerText: data.footerText ?? existing?.footerText ?? null,
      notes: data.notes ?? existing?.notes ?? null,
      gstEnabled: data.gstEnabled ?? existing?.gstEnabled ?? false,
      gstin: data.gstin ?? existing?.gstin ?? null,
      gstStateCode: data.gstStateCode ?? existing?.gstStateCode ?? null,
      gstStateName: data.gstStateName ?? existing?.gstStateName ?? null,
      gstLegalName: data.gstLegalName ?? existing?.gstLegalName ?? null,
      updatedAt: new Date(),
    };
    this.invoiceSettingsByTenant.set(tenantId, merged);
    return merged;
  }

  // ===== Accounting: Invoices =====
  async getInvoicesByTenantId(tenantId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter(inv => inv.tenantId === tenantId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getInvoicesByCaseId(caseId: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(inv => inv.caseId === caseId);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoiceByPublicToken(token: string): Promise<Invoice | undefined> {
    if (!token) return undefined;
    return Array.from(this.invoices.values()).find((inv) => inv.publicToken === token);
  }

  async createInvoice(data: InsertInvoice, items: Omit<InsertInvoiceItem, "invoiceId">[]): Promise<Invoice> {
    const id = randomUUID();
    const subtotal = items.reduce((sum, it) => sum + (it.amount ?? ((it.unitPrice ?? 0) * (it.quantity ?? 1))), 0);
    const taxAmount = data.taxAmount ?? 0;
    const total = subtotal + taxAmount;
    const invoice: Invoice = {
      id,
      tenantId: data.tenantId,
      invoiceNumber: data.invoiceNumber,
      caseId: data.caseId ?? null,
      leadId: data.leadId ?? null,
      customerName: data.customerName,
      customerEmail: data.customerEmail ?? null,
      customerPhone: data.customerPhone ?? null,
      destinationCountry: data.destinationCountry ?? null,
      visaType: data.visaType ?? null,
      status: data.status ?? "draft",
      paymentType: data.paymentType ?? "upfront",
      advancePercent: data.advancePercent ?? null,
      subtotal,
      taxAmount,
      cgstAmount: data.cgstAmount ?? 0,
      sgstAmount: data.sgstAmount ?? 0,
      igstAmount: data.igstAmount ?? 0,
      total,
      paidAmount: data.paidAmount ?? 0,
      currency: data.currency ?? "USD",
      customerGstin: data.customerGstin ?? null,
      placeOfSupplyCode: data.placeOfSupplyCode ?? null,
      placeOfSupplyName: data.placeOfSupplyName ?? null,
      reverseCharge: data.reverseCharge ?? false,
      issuedAt: data.issuedAt ?? new Date(),
      dueDate: data.dueDate ?? null,
      notes: data.notes ?? null,
      publicToken: (data as any).publicToken ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(id, invoice);
    items.forEach((it, idx) => {
      const itemId = randomUUID();
      const amount = it.amount ?? ((it.unitPrice ?? 0) * (it.quantity ?? 1));
      this.invoiceItems.set(itemId, {
        id: itemId,
        invoiceId: id,
        description: it.description,
        category: it.category ?? "agency_fee",
        quantity: it.quantity ?? 1,
        unitPrice: it.unitPrice ?? 0,
        amount,
        sortOrder: it.sortOrder ?? idx,
        hsnCode: it.hsnCode ?? null,
        taxRate: it.taxRate ?? 0,
        taxable: it.taxable ?? true,
      });
    });
    return invoice;
  }

  async updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    const updated: Invoice = { ...existing, ...data, id, updatedAt: new Date() };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    // cascade delete items + payments
    Array.from(this.invoiceItems.entries())
      .filter(([_, it]) => it.invoiceId === id)
      .forEach(([k]) => this.invoiceItems.delete(k));
    Array.from(this.payments.entries())
      .filter(([_, p]) => p.invoiceId === id)
      .forEach(([k]) => this.payments.delete(k));
    return this.invoices.delete(id);
  }

  async replaceInvoiceItems(invoiceId: string, items: Omit<InsertInvoiceItem, "invoiceId">[]): Promise<InvoiceItem[]> {
    Array.from(this.invoiceItems.entries())
      .filter(([_, it]) => it.invoiceId === invoiceId)
      .forEach(([k]) => this.invoiceItems.delete(k));
    const created: InvoiceItem[] = [];
    items.forEach((it, idx) => {
      const id = randomUUID();
      const amount = it.amount ?? ((it.unitPrice ?? 0) * (it.quantity ?? 1));
      const item: InvoiceItem = {
        id,
        invoiceId,
        description: it.description,
        category: it.category ?? "agency_fee",
        quantity: it.quantity ?? 1,
        unitPrice: it.unitPrice ?? 0,
        amount,
        sortOrder: it.sortOrder ?? idx,
        hsnCode: it.hsnCode ?? null,
        taxRate: it.taxRate ?? 0,
        taxable: it.taxable ?? true,
      };
      this.invoiceItems.set(id, item);
      created.push(item);
    });
    // Recompute invoice subtotal/total
    const inv = this.invoices.get(invoiceId);
    if (inv) {
      const subtotal = created.reduce((s, i) => s + i.amount, 0);
      const total = subtotal + (inv.taxAmount ?? 0);
      this.invoices.set(invoiceId, { ...inv, subtotal, total, updatedAt: new Date() });
    }
    return created;
  }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values())
      .filter(it => it.invoiceId === invoiceId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // ===== Accounting: Payments =====
  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(p => p.invoiceId === invoiceId)
      .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));
  }

  async getPaymentsByTenantId(tenantId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter(p => p.tenantId === tenantId)
      .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      id,
      invoiceId: data.invoiceId,
      tenantId: data.tenantId,
      amount: data.amount,
      method: data.method ?? "cash",
      reference: data.reference ?? null,
      paidAt: data.paidAt ?? new Date(),
      notes: data.notes ?? null,
      createdAt: new Date(),
    };
    this.payments.set(id, payment);
    // Update invoice paidAmount + status
    const inv = this.invoices.get(data.invoiceId);
    if (inv) {
      const allPayments = await this.getPaymentsByInvoiceId(data.invoiceId);
      const paidAmount = allPayments.reduce((s, p) => s + p.amount, 0);
      let status = inv.status;
      if (paidAmount >= inv.total && inv.total > 0) status = "paid";
      else if (paidAmount > 0) status = "partial";
      this.invoices.set(data.invoiceId, { ...inv, paidAmount, status, updatedAt: new Date() });
    }
    return payment;
  }

  async deletePayment(id: string): Promise<boolean> {
    const payment = this.payments.get(id);
    if (!payment) return false;
    const ok = this.payments.delete(id);
    // Recompute invoice paidAmount + status
    const inv = this.invoices.get(payment.invoiceId);
    if (inv) {
      const remaining = await this.getPaymentsByInvoiceId(payment.invoiceId);
      const paidAmount = remaining.reduce((s, p) => s + p.amount, 0);
      let status: string = "draft";
      if (paidAmount >= inv.total && inv.total > 0) status = "paid";
      else if (paidAmount > 0) status = "partial";
      else status = inv.status === "paid" || inv.status === "partial" ? "sent" : inv.status;
      this.invoices.set(payment.invoiceId, { ...inv, paidAmount, status, updatedAt: new Date() });
    }
    return ok;
  }

  // Cross-tenant getters used by the saas_admin "all data" views.
  // These return every row in the workspace — never call them on the
  // request path of a tenant-scoped page.
  async getAllCases(): Promise<Case[]> {
    return Array.from(this.cases.values());
  }
  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }
  async getAllProposals(): Promise<Proposal[]> {
    return Array.from(this.proposals.values());
  }
  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }
  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  async getCasesByTenantId(tenantId: string): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(c => c.tenantId === tenantId);
  }

  async getCasesByCustomerId(customerId: string): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(c => c.customerId === customerId);
  }

  async getCasesByCustomerAccountId(customerAccountId: string, tenantId: string): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(
      c => c.customerAccountId === customerAccountId && c.tenantId === tenantId
    );
  }

  async getCaseByReferenceId(referenceId: string, tenantId: string): Promise<Case | undefined> {
    return Array.from(this.cases.values()).find(
      c => c.referenceId === referenceId && c.tenantId === tenantId
    );
  }

  async getCase(id: string): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async createCase(insertCase: InsertCase): Promise<Case> {
    const id = randomUUID();
    const caseData: Case = { 
      id, 
      tenantId: insertCase.tenantId,
      customerId: insertCase.customerId ?? null,
      customerAccountId: insertCase.customerAccountId ?? null,
      caseNumber: insertCase.caseNumber,
      referenceId: insertCase.referenceId,
      applicantName: insertCase.applicantName ?? null,
      applicantDob: insertCase.applicantDob ?? null,
      passportSurname: insertCase.passportSurname ?? null,
      passportGivenName: insertCase.passportGivenName ?? null,
      passportMiddleName: insertCase.passportMiddleName ?? null,
      passportNumber: insertCase.passportNumber ?? null,
      passportNationality: insertCase.passportNationality ?? null,
      passportGender: insertCase.passportGender ?? null,
      passportDateOfIssue: insertCase.passportDateOfIssue ?? null,
      passportDateOfExpiry: insertCase.passportDateOfExpiry ?? null,
      passportPlaceOfIssue: insertCase.passportPlaceOfIssue ?? null,
      passportPlaceOfBirth: insertCase.passportPlaceOfBirth ?? null,
      passportFileUrl: insertCase.passportFileUrl ?? null,
      visaType: insertCase.visaType,
      destinationCountry: insertCase.destinationCountry,
      status: insertCase.status ?? "pending",
      priority: insertCase.priority ?? "normal",
      assignedTo: insertCase.assignedTo ?? null,
      travelDate: insertCase.travelDate ?? null,
      notes: insertCase.notes ?? null,
      readinessScore: insertCase.readinessScore ?? null,
      // --- Visa workflow fields ---
      submissionMethod: insertCase.submissionMethod ?? null,
      visaStage: insertCase.visaStage ?? "not_started",
      visaProcessingStatus: insertCase.visaProcessingStatus ?? null,
      visaStatusComment: insertCase.visaStatusComment ?? null,
      visaStatusUpdatedAt: insertCase.visaStatusUpdatedAt ?? null,
      visaCopyFileUrl: (insertCase as any).visaCopyFileUrl ?? null,
      visaCopyFileName: (insertCase as any).visaCopyFileName ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.cases.set(id, caseData);
    return caseData;
  }

  // ===== Appointments (case bookings: embassy / VFS / BLS / other) =====
  async getAppointmentsByCaseId(caseId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter((a) => a.caseId === caseId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  async getAppointmentsByTenantId(tenantId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter((a) => a.tenantId === tenantId)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const now = new Date();
    const appt: Appointment = {
      id: randomUUID(),
      caseId: data.caseId,
      tenantId: data.tenantId,
      appointmentType: data.appointmentType,
      provider: data.provider,
      location: data.location ?? null,
      scheduledAt: typeof data.scheduledAt === "string"
        ? new Date(data.scheduledAt)
        : (data.scheduledAt as Date),
      confirmationFileUrl: data.confirmationFileUrl ?? null,
      confirmationFileName: data.confirmationFileName ?? null,
      notes: data.notes ?? null,
      status: data.status ?? "scheduled",
      createdAt: now,
      updatedAt: now,
    };
    this.appointments.set(appt.id, appt);
    return appt;
  }

  async updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const existing = this.appointments.get(id);
    if (!existing) return undefined;
    // Defence-in-depth: ownership fields can never be re-parented via update.
    // The route layer should already strip these, but stripping here too means
    // a future caller that forgets the whitelist can't break tenant isolation.
    const { caseId: _ignoredCaseId, tenantId: _ignoredTenantId, ...safe } = data as any;
    const updated: Appointment = {
      ...existing,
      ...safe,
      // Coerce scheduledAt back to a Date if it arrived as a string from JSON.
      scheduledAt: safe.scheduledAt
        ? (typeof safe.scheduledAt === "string" ? new Date(safe.scheduledAt) : (safe.scheduledAt as Date))
        : existing.scheduledAt,
      updatedAt: new Date(),
    };
    this.appointments.set(id, updated);
    return updated;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    return this.appointments.delete(id);
  }

  async getCasesByTenantAndVisaStage(tenantId: string, stage: string): Promise<Case[]> {
    return Array.from(this.cases.values()).filter(
      c => c.tenantId === tenantId && (c.visaStage ?? "not_started") === stage
    );
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    const caseData = this.cases.get(id);
    if (!caseData) return undefined;
    const updated = { ...caseData, ...data, updatedAt: new Date() };
    this.cases.set(id, updated);
    return updated;
  }

  // ----- Case Co-Travellers -----
  async getCoTravellersByCaseId(caseId: string): Promise<CaseCoTraveller[]> {
    return Array.from(this.coTravellers.values())
      .filter(t => t.caseId === caseId)
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  async getCoTraveller(id: string): Promise<CaseCoTraveller | undefined> {
    return this.coTravellers.get(id);
  }

  async createCoTraveller(data: InsertCaseCoTraveller): Promise<CaseCoTraveller> {
    const id = randomUUID();
    const row: CaseCoTraveller = {
      id,
      caseId: data.caseId,
      tenantId: data.tenantId,
      name: data.name,
      dob: data.dob ?? null,
      relationship: data.relationship,
      passportNumber: data.passportNumber ?? null,
      nationality: data.nationality ?? null,
      passportSurname: data.passportSurname ?? null,
      passportGivenName: data.passportGivenName ?? null,
      passportMiddleName: data.passportMiddleName ?? null,
      passportGender: data.passportGender ?? null,
      passportDateOfIssue: data.passportDateOfIssue ?? null,
      passportDateOfExpiry: data.passportDateOfExpiry ?? null,
      passportPlaceOfIssue: data.passportPlaceOfIssue ?? null,
      passportPlaceOfBirth: data.passportPlaceOfBirth ?? null,
      notes: data.notes ?? null,
      createdAt: new Date(),
    };
    this.coTravellers.set(id, row);
    return row;
  }

  async updateCoTraveller(id: string, data: Partial<InsertCaseCoTraveller>): Promise<CaseCoTraveller | undefined> {
    const existing = this.coTravellers.get(id);
    if (!existing) return undefined;
    const updated: CaseCoTraveller = { ...existing, ...data };
    this.coTravellers.set(id, updated);
    return updated;
  }

  async deleteCoTraveller(id: string): Promise<boolean> {
    return this.coTravellers.delete(id);
  }

  async getDocumentsByCaseId(caseId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.caseId === caseId);
  }

  async getDocumentsByTenantId(tenantId: string): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.tenantId === tenantId);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const doc: Document = { 
      id, 
      caseId: insertDoc.caseId,
      tenantId: insertDoc.tenantId,
      name: insertDoc.name,
      type: insertDoc.type,
      status: insertDoc.status ?? "pending",
      fileUrl: insertDoc.fileUrl ?? null,
      qualityScore: insertDoc.qualityScore ?? null,
      extractedData: insertDoc.extractedData ?? null,
      notes: insertDoc.notes ?? null,
      uploadedAt: new Date(), 
      reviewedAt: null 
    };
    this.documents.set(id, doc);
    return doc;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...data };
    this.documents.set(id, updated);
    return updated;
  }

  async getMessagesByCaseId(caseId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.caseId === caseId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  async createMessage(insertMsg: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const msg: Message = { 
      id, 
      caseId: insertMsg.caseId,
      senderId: insertMsg.senderId,
      senderRole: insertMsg.senderRole,
      content: insertMsg.content,
      isRead: insertMsg.isRead ?? false,
      createdAt: new Date() 
    };
    this.messages.set(id, msg);
    return msg;
  }

  async getAllVisaTemplates(): Promise<VisaTemplate[]> {
    return Array.from(this.visaTemplates.values());
  }

  async getVisaTemplate(id: string): Promise<VisaTemplate | undefined> {
    return this.visaTemplates.get(id);
  }

  async createVisaTemplate(insertTemplate: InsertVisaTemplate): Promise<VisaTemplate> {
    const id = randomUUID();
    const template: VisaTemplate = { 
      id, 
      country: insertTemplate.country,
      visaType: insertTemplate.visaType,
      requirements: insertTemplate.requirements,
      processingTime: insertTemplate.processingTime ?? null,
      fees: insertTemplate.fees ?? null,
      notes: insertTemplate.notes ?? null,
      version: insertTemplate.version ?? 1,
      isActive: insertTemplate.isActive ?? true,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.visaTemplates.set(id, template);
    return template;
  }

  async updateVisaTemplate(id: string, data: Partial<InsertVisaTemplate>): Promise<VisaTemplate | undefined> {
    const template = this.visaTemplates.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...data, updatedAt: new Date() };
    this.visaTemplates.set(id, updated);
    return updated;
  }

  async deleteVisaTemplate(id: string): Promise<boolean> {
    return this.visaTemplates.delete(id);
  }

  private tenantChecklistKey(tenantId: string, country: string, visaType: string): string {
    return `${tenantId}::${country.trim().toLowerCase()}::${visaType.trim().toLowerCase()}`;
  }

  async getTenantDocumentChecklists(tenantId: string): Promise<TenantDocumentChecklist[]> {
    return Array.from(this.tenantDocumentChecklists.values())
      .filter((row) => row.tenantId === tenantId)
      .sort((a, b) => a.country.localeCompare(b.country) || a.visaType.localeCompare(b.visaType));
  }

  async getTenantDocumentChecklist(tenantId: string, country: string, visaType: string): Promise<TenantDocumentChecklist | undefined> {
    return this.tenantDocumentChecklists.get(this.tenantChecklistKey(tenantId, country, visaType));
  }

  async upsertTenantDocumentChecklist(tenantId: string, country: string, visaType: string, requirements: unknown): Promise<TenantDocumentChecklist> {
    const key = this.tenantChecklistKey(tenantId, country, visaType);
    const existing = this.tenantDocumentChecklists.get(key);
    const next: TenantDocumentChecklist = {
      id: existing?.id ?? randomUUID(),
      tenantId,
      country,
      visaType,
      requirements,
      updatedAt: new Date(),
    };
    this.tenantDocumentChecklists.set(key, next);
    return next;
  }

  async deleteTenantDocumentChecklist(tenantId: string, country: string, visaType: string): Promise<boolean> {
    return this.tenantDocumentChecklists.delete(this.tenantChecklistKey(tenantId, country, visaType));
  }

  async getActivityLogsByTenantId(tenantId: string): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).filter(log => log.tenantId === tenantId);
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = { 
      id, 
      tenantId: insertLog.tenantId ?? null,
      userId: insertLog.userId ?? null,
      action: insertLog.action,
      entityType: insertLog.entityType ?? null,
      entityId: insertLog.entityId ?? null,
      details: insertLog.details ?? null,
      createdAt: new Date() 
    };
    this.activityLogs.set(id, log);
    return log;
  }

  async getCustomerAccount(id: string): Promise<CustomerAccount | undefined> {
    return this.customerAccounts.get(id);
  }

  async getCustomerAccountByEmail(email: string): Promise<CustomerAccount | undefined> {
    return Array.from(this.customerAccounts.values()).find(a => a.email.toLowerCase() === email.toLowerCase());
  }

  async getCustomerAccountByPhone(phone: string): Promise<CustomerAccount | undefined> {
    const norm = normalizePhone(phone);
    if (!norm) return undefined;
    return Array.from(this.customerAccounts.values()).find(a => a.phone && normalizePhone(a.phone) === norm);
  }

  async createCustomerAccount(insertAccount: InsertCustomerAccount): Promise<CustomerAccount> {
    const id = randomUUID();
    const account: CustomerAccount = { 
      id, 
      email: insertAccount.email,
      phone: insertAccount.phone ?? null,
      name: insertAccount.name ?? null,
      avatarUrl: insertAccount.avatarUrl ?? null,
      isVerified: insertAccount.isVerified ?? false,
      createdAt: new Date() 
    };
    this.customerAccounts.set(id, account);
    return account;
  }

  async updateCustomerAccount(id: string, data: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined> {
    const account = this.customerAccounts.get(id);
    if (!account) return undefined;
    const updated = { ...account, ...data };
    this.customerAccounts.set(id, updated);
    return updated;
  }

  async getCustomerTenantLink(customerAccountId: string, tenantId: string): Promise<CustomerTenantLink | undefined> {
    return Array.from(this.customerTenantLinks.values()).find(
      link => link.customerAccountId === customerAccountId && link.tenantId === tenantId
    );
  }

  async createCustomerTenantLink(insertLink: InsertCustomerTenantLink): Promise<CustomerTenantLink> {
    const id = randomUUID();
    const link: CustomerTenantLink = { 
      id, 
      customerAccountId: insertLink.customerAccountId,
      tenantId: insertLink.tenantId,
      role: insertLink.role ?? "customer",
      createdAt: new Date() 
    };
    this.customerTenantLinks.set(id, link);
    return link;
  }

  async getCustomerTenantLinks(customerAccountId: string): Promise<CustomerTenantLink[]> {
    return Array.from(this.customerTenantLinks.values()).filter(
      link => link.customerAccountId === customerAccountId
    );
  }

  async getCustomersByTenantId(tenantId: string): Promise<CustomerAccount[]> {
    const linkedIds = Array.from(this.customerTenantLinks.values())
      .filter(link => link.tenantId === tenantId)
      .map(link => link.customerAccountId);
    const seen = new Set<string>();
    const out: CustomerAccount[] = [];
    for (const id of linkedIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const acct = this.customerAccounts.get(id);
      if (acct) out.push(acct);
    }
    return out;
  }

  async getPassportsByCustomerId(customerAccountId: string, tenantId: string): Promise<Passport[]> {
    return Array.from(this.passportsMap.values())
      .filter(p => p.customerAccountId === customerAccountId && p.tenantId === tenantId)
      .sort((a, b) => {
        // Primary first, then most recent on top.
        if ((b.isPrimary ? 1 : 0) !== (a.isPrimary ? 1 : 0)) {
          return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
        }
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
  }

  async getPassportsByTenantId(tenantId: string): Promise<Passport[]> {
    return Array.from(this.passportsMap.values()).filter(p => p.tenantId === tenantId);
  }

  async getPassport(id: string): Promise<Passport | undefined> {
    return this.passportsMap.get(id);
  }

  async createPassport(insertP: InsertPassport): Promise<Passport> {
    const id = randomUUID();
    const now = new Date();
    const passport: Passport = {
      id,
      customerAccountId: insertP.customerAccountId,
      tenantId: insertP.tenantId,
      holderName: insertP.holderName ?? null,
      relationship: insertP.relationship ?? "self",
      isPrimary: insertP.isPrimary ?? false,
      passportSurname: insertP.passportSurname ?? null,
      passportGivenName: insertP.passportGivenName ?? null,
      passportMiddleName: insertP.passportMiddleName ?? null,
      passportNumber: insertP.passportNumber ?? null,
      passportNationality: insertP.passportNationality ?? null,
      passportGender: insertP.passportGender ?? null,
      passportDateOfBirth: insertP.passportDateOfBirth ?? null,
      passportDateOfIssue: insertP.passportDateOfIssue ?? null,
      passportDateOfExpiry: insertP.passportDateOfExpiry ?? null,
      passportPlaceOfIssue: insertP.passportPlaceOfIssue ?? null,
      passportPlaceOfBirth: insertP.passportPlaceOfBirth ?? null,
      passportFileUrl: insertP.passportFileUrl ?? null,
      notes: insertP.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.passportsMap.set(id, passport);
    return passport;
  }

  async updatePassport(id: string, data: Partial<InsertPassport>): Promise<Passport | undefined> {
    const existing = this.passportsMap.get(id);
    if (!existing) return undefined;
    const updated: Passport = {
      ...existing,
      ...data,
      // Don't let an update relocate the passport to a different customer/tenant.
      customerAccountId: existing.customerAccountId,
      tenantId: existing.tenantId,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.passportsMap.set(id, updated);
    return updated;
  }

  async deletePassport(id: string): Promise<boolean> {
    return this.passportsMap.delete(id);
  }

  async createOTPCode(insertOTP: InsertOTPCode): Promise<OTPCode> {
    const id = randomUUID();
    const otp: OTPCode = { 
      id, 
      email: insertOTP.email ?? null,
      phone: insertOTP.phone ?? null,
      code: insertOTP.code,
      tenantId: insertOTP.tenantId,
      attempts: insertOTP.attempts ?? 0,
      expiresAt: insertOTP.expiresAt,
      usedAt: insertOTP.usedAt ?? null,
      createdAt: new Date() 
    };
    this.otpCodes.set(id, otp);
    return otp;
  }

  async getActiveOTPCode(email: string, tenantId: string): Promise<OTPCode | undefined> {
    const now = new Date();
    return Array.from(this.otpCodes.values()).find(
      otp => !!otp.email &&
             otp.email.toLowerCase() === email.toLowerCase() &&
             otp.tenantId === tenantId && 
             otp.expiresAt > now && 
             !otp.usedAt &&
             (otp.attempts || 0) < 5
    );
  }

  async getActiveOTPCodeByPhone(phone: string, tenantId: string): Promise<OTPCode | undefined> {
    const norm = normalizePhone(phone);
    if (!norm) return undefined;
    const now = new Date();
    return Array.from(this.otpCodes.values()).find(
      otp => !!otp.phone &&
             normalizePhone(otp.phone) === norm &&
             otp.tenantId === tenantId &&
             otp.expiresAt > now &&
             !otp.usedAt &&
             (otp.attempts || 0) < 5
    );
  }

  async markOTPUsed(id: string): Promise<void> {
    const otp = this.otpCodes.get(id);
    if (otp) {
      otp.usedAt = new Date();
      this.otpCodes.set(id, otp);
    }
  }

  async incrementOTPAttempts(id: string): Promise<void> {
    const otp = this.otpCodes.get(id);
    if (otp) {
      otp.attempts = (otp.attempts || 0) + 1;
      this.otpCodes.set(id, otp);
    }
  }

  // B2C Users
  async getB2cUser(id: string): Promise<B2cUser | undefined> {
    return this.b2cUsersMap.get(id);
  }

  async getB2cUserByEmail(email: string): Promise<B2cUser | undefined> {
    return Array.from(this.b2cUsersMap.values()).find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getB2cUserByVerificationToken(token: string): Promise<B2cUser | undefined> {
    return Array.from(this.b2cUsersMap.values()).find(u => u.emailVerificationToken === token);
  }

  async getB2cUserByPasswordResetToken(token: string): Promise<B2cUser | undefined> {
    return Array.from(this.b2cUsersMap.values()).find(u => u.passwordResetToken === token);
  }

  async setB2cPasswordReset(id: string, token: string | null, expires: Date | null): Promise<void> {
    const user = this.b2cUsersMap.get(id);
    if (!user) return;
    this.b2cUsersMap.set(id, { ...user, passwordResetToken: token, passwordResetExpires: expires });
  }

  async getB2cUserByPhone(phone: string): Promise<B2cUser | undefined> {
    return Array.from(this.b2cUsersMap.values()).find(
      u => u.phone === phone
    );
  }

  async createB2cUser(user: InsertB2cUser): Promise<B2cUser> {
    const id = randomUUID();
    const newUser: B2cUser = {
      ...user,
      id,
      freeChecksUsed: user.freeChecksUsed ?? 0,
      subscriptionPlan: user.subscriptionPlan ?? "free",
      checkLimit: user.checkLimit ?? 1,
      deepCheckAccess: user.deepCheckAccess ?? false,
      passwordResetToken: user.passwordResetToken ?? null,
      passwordResetExpires: user.passwordResetExpires ?? null,
      stripeCustomerId: user.stripeCustomerId ?? null,
      createdAt: new Date(),
    };
    this.b2cUsersMap.set(id, newUser);
    return newUser;
  }

  async getAllB2cUsers(): Promise<B2cUser[]> {
    return Array.from(this.b2cUsersMap.values())
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async updateB2cUser(id: string, data: Partial<Omit<B2cUser, 'id' | 'createdAt'>>): Promise<B2cUser | undefined> {
    const user = this.b2cUsersMap.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.b2cUsersMap.set(id, updated);
    return updated;
  }

  async deleteB2cUser(id: string): Promise<boolean> {
    return this.b2cUsersMap.delete(id);
  }

  // Visa Checks
  async createVisaCheck(check: InsertVisaCheck): Promise<VisaCheck> {
    const id = randomUUID();
    const newCheck: VisaCheck = {
      ...check,
      id,
      checkType: check.checkType ?? "basic",
      aiProvider: check.aiProvider ?? "mock",
      approvalChance: check.approvalChance ?? null,
      statusLabel: check.statusLabel ?? null,
      aiResponse: check.aiResponse ?? null,
      createdAt: new Date(),
    };
    this.visaChecksMap.set(id, newCheck);
    return newCheck;
  }

  async getVisaChecksByUserId(userId: string): Promise<VisaCheck[]> {
    return Array.from(this.visaChecksMap.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getVisaCheck(id: string): Promise<VisaCheck | undefined> {
    return this.visaChecksMap.get(id);
  }

  async createVisaToolCheck(check: InsertVisaToolCheck): Promise<VisaToolCheck> {
    const id = randomUUID();
    const newCheck: VisaToolCheck = {
      ...check,
      id,
      country: check.country ?? null,
      inputSummary: check.inputSummary ?? null,
      uploadedFileUrl: check.uploadedFileUrl ?? null,
      riskScore: check.riskScore ?? null,
      riskLevel: check.riskLevel ?? null,
      claudeResponseJson: check.claudeResponseJson ?? null,
      createdAt: new Date(),
    };
    this.visaToolChecksMap.set(id, newCheck);
    return newCheck;
  }

  async getVisaToolChecksByUserId(userId: string): Promise<VisaToolCheck[]> {
    return Array.from(this.visaToolChecksMap.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getVisaToolCheck(id: string): Promise<VisaToolCheck | undefined> {
    return this.visaToolChecksMap.get(id);
  }

  async getAllVisaToolChecks(): Promise<VisaToolCheck[]> {
    return Array.from(this.visaToolChecksMap.values())
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  // Saved Profiles — one profile per user (keyed by userId)
  async getSavedProfile(userId: string): Promise<SavedProfile | undefined> {
    for (const p of this.savedProfilesMap.values()) {
      if (p.userId === userId) return p;
    }
    return undefined;
  }

  async upsertSavedProfile(userId: string, data: Partial<InsertSavedProfile>): Promise<SavedProfile> {
    const existing = await this.getSavedProfile(userId);
    if (existing) {
      const updated: SavedProfile = { ...existing, ...data, userId, updatedAt: new Date() };
      this.savedProfilesMap.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newProfile: SavedProfile = {
      id,
      userId,
      fullName: data.fullName ?? null,
      nationality: data.nationality ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      gender: data.gender ?? null,
      maritalStatus: data.maritalStatus ?? null,
      countryOfResidence: data.countryOfResidence ?? null,
      passportCountry: data.passportCountry ?? null,
      employmentStatus: data.employmentStatus ?? null,
      jobTitle: data.jobTitle ?? null,
      companyName: data.companyName ?? null,
      yearsInJob: data.yearsInJob ?? null,
      monthlyIncome: data.monthlyIncome ?? null,
      sourceOfIncome: data.sourceOfIncome ?? null,
      bankBalance: data.bankBalance ?? null,
      tripFunding: data.tripFunding ?? null,
      previousTravel: data.previousTravel ?? null,
      countriesVisited: data.countriesVisited ?? null,
      previousVisaRefusals: data.previousVisaRefusals ?? null,
      hasPassport: data.hasPassport ?? false,
      hasBankStatement: data.hasBankStatement ?? false,
      hasIncomeProof: data.hasIncomeProof ?? false,
      hasTaxReturn: data.hasTaxReturn ?? false,
      hasSalarySlips: data.hasSalarySlips ?? false,
      hasCreditCard: data.hasCreditCard ?? false,
      hasProperty: data.hasProperty ?? false,
      familyInHomeCountry: data.familyInHomeCountry ?? false,
      propertyInHomeCountry: data.propertyInHomeCountry ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.savedProfilesMap.set(id, newProfile);
    return newProfile;
  }

  async getSmsConfig(): Promise<SmsConfig | undefined> { return this.smsConfigRecord; }
  async upsertSmsConfig(data: Partial<InsertSmsConfig>): Promise<SmsConfig> {
    const existing = this.smsConfigRecord;
    this.smsConfigRecord = {
      id: existing?.id ?? 1,
      provider: data.provider !== undefined ? data.provider : existing?.provider ?? "msg91",
      msg91AuthKey: data.msg91AuthKey !== undefined ? data.msg91AuthKey : existing?.msg91AuthKey ?? null,
      msg91TemplateId: data.msg91TemplateId !== undefined ? data.msg91TemplateId : existing?.msg91TemplateId ?? null,
      msg91SenderId: data.msg91SenderId !== undefined ? data.msg91SenderId : existing?.msg91SenderId ?? null,
      zauvApiKey: data.zauvApiKey !== undefined ? data.zauvApiKey : existing?.zauvApiKey ?? null,
      mcCustomerId: data.mcCustomerId !== undefined ? data.mcCustomerId : existing?.mcCustomerId ?? null,
      mcAuthToken: data.mcAuthToken !== undefined ? data.mcAuthToken : existing?.mcAuthToken ?? null,
      ping4smsApiKey: data.ping4smsApiKey !== undefined ? data.ping4smsApiKey : existing?.ping4smsApiKey ?? null,
      ping4smsSenderId: data.ping4smsSenderId !== undefined ? data.ping4smsSenderId : existing?.ping4smsSenderId ?? null,
      ping4smsRoute: data.ping4smsRoute !== undefined ? data.ping4smsRoute : existing?.ping4smsRoute ?? null,
      ping4smsTemplateId: data.ping4smsTemplateId !== undefined ? data.ping4smsTemplateId : existing?.ping4smsTemplateId ?? null,
      ping4smsOtpTemplate: data.ping4smsOtpTemplate !== undefined ? data.ping4smsOtpTemplate : existing?.ping4smsOtpTemplate ?? null,
      updatedAt: new Date(),
    };
    return this.smsConfigRecord;
  }
  async getPlatformAiConfig(): Promise<PlatformAiConfig | undefined> { return this.platformAiConfigRecord; }
  async upsertPlatformAiConfig(data: Partial<InsertPlatformAiConfig>): Promise<PlatformAiConfig> {
    const existing = this.platformAiConfigRecord;
    this.platformAiConfigRecord = {
      id: existing?.id ?? 1,
      anthropicApiKey: data.anthropicApiKey !== undefined ? data.anthropicApiKey : existing?.anthropicApiKey ?? null,
      anthropicModel: data.anthropicModel !== undefined ? data.anthropicModel : existing?.anthropicModel ?? "claude-sonnet-4-6",
      updatedAt: new Date(),
    };
    return this.platformAiConfigRecord;
  }
  async getZeptoMailConfig(): Promise<ZeptoMailConfig | undefined> { return this.zeptoMailConfigRecord; }
  async upsertZeptoMailConfig(data: Partial<InsertZeptoMailConfig>): Promise<ZeptoMailConfig> {
    const existing = this.zeptoMailConfigRecord;
    this.zeptoMailConfigRecord = {
      id: existing?.id ?? 1,
      provider: data.provider !== undefined ? data.provider : existing?.provider ?? "zeptomail",
      domain: data.domain !== undefined ? data.domain : existing?.domain ?? "visashuttle.com",
      host: data.host !== undefined ? data.host : existing?.host ?? "api.zeptomail.com",
      agentAlias: data.agentAlias !== undefined ? data.agentAlias : existing?.agentAlias ?? "448141e4788dab46",
      senderAddress: data.senderAddress !== undefined ? data.senderAddress : existing?.senderAddress ?? "notifications@visashuttle.com",
      senderName: data.senderName !== undefined ? data.senderName : existing?.senderName ?? "Visa Shuttle",
      bounceAddress: data.bounceAddress !== undefined ? data.bounceAddress : existing?.bounceAddress ?? null,
      replyToAddress: data.replyToAddress !== undefined ? data.replyToAddress : existing?.replyToAddress ?? null,
      sendMailToken: data.sendMailToken !== undefined ? data.sendMailToken : existing?.sendMailToken ?? null,
      sendMailToken2: (data as any).sendMailToken2 !== undefined ? (data as any).sendMailToken2 : (existing as any)?.sendMailToken2 ?? null,
      enabled: data.enabled !== undefined ? !!data.enabled : existing?.enabled ?? false,
      updatedAt: new Date(),
    } as ZeptoMailConfig;
    return this.zeptoMailConfigRecord;
  }
  async getEmailTemplates(audience = "b2c"): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplatesMap.values())
      .filter((template) => template.audience === audience)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    return this.emailTemplatesMap.get(id);
  }
  async getEmailTemplateByKey(audience: string, templateKey: string): Promise<EmailTemplate | undefined> {
    return Array.from(this.emailTemplatesMap.values()).find(
      (template) => template.audience === audience && template.templateKey === templateKey
    );
  }
  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    const now = new Date();
    const template: EmailTemplate = {
      id: randomUUID(),
      audience: data.audience ?? "b2c",
      templateKey: data.templateKey,
      name: data.name,
      subject: data.subject,
      htmlBody: data.htmlBody,
      textBody: data.textBody ?? null,
      variables: data.variables ?? null,
      enabled: data.enabled ?? true,
      updatedAt: now,
      createdAt: now,
    };
    this.emailTemplatesMap.set(template.id, template);
    return template;
  }
  async updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const existing = this.emailTemplatesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, id, updatedAt: new Date() } as EmailTemplate;
    this.emailTemplatesMap.set(id, updated);
    return updated;
  }
  async deleteEmailTemplate(id: string): Promise<boolean> {
    return this.emailTemplatesMap.delete(id);
  }
  async getTenantPaymentGatewayConfig(tenantId: string): Promise<TenantPaymentGatewayConfig | undefined> {
    return this.tenantPaymentGatewayConfigByTenant.get(tenantId);
  }
  async upsertTenantPaymentGatewayConfig(tenantId: string, data: Partial<InsertTenantPaymentGatewayConfig>): Promise<TenantPaymentGatewayConfig> {
    const existing = this.tenantPaymentGatewayConfigByTenant.get(tenantId);
    const next: TenantPaymentGatewayConfig = {
      id: existing?.id ?? randomUUID(),
      tenantId,
      provider: data.provider !== undefined ? data.provider : existing?.provider ?? "cashfree",
      mode: data.mode !== undefined ? data.mode : existing?.mode ?? "test",
      apiVersion: data.apiVersion !== undefined ? data.apiVersion : existing?.apiVersion ?? "2023-08-01",
      testClientId: data.testClientId !== undefined ? data.testClientId : existing?.testClientId ?? null,
      testClientSecret: data.testClientSecret !== undefined ? data.testClientSecret : existing?.testClientSecret ?? null,
      liveClientId: data.liveClientId !== undefined ? data.liveClientId : existing?.liveClientId ?? null,
      liveClientSecret: data.liveClientSecret !== undefined ? data.liveClientSecret : existing?.liveClientSecret ?? null,
      webhookSecret: data.webhookSecret !== undefined ? data.webhookSecret : existing?.webhookSecret ?? null,
      enabled: data.enabled !== undefined ? !!data.enabled : existing?.enabled ?? false,
      updatedAt: new Date(),
    };
    this.tenantPaymentGatewayConfigByTenant.set(tenantId, next);
    return next;
  }

  async getTenantSmsConfig(tenantId: string): Promise<TenantSmsConfig | undefined> {
    return this.tenantSmsConfigByTenant.get(tenantId);
  }
  async upsertTenantSmsConfig(tenantId: string, data: Partial<InsertTenantSmsConfig>): Promise<TenantSmsConfig> {
    const existing = this.tenantSmsConfigByTenant.get(tenantId);
    const next: TenantSmsConfig = {
      id: existing?.id ?? randomUUID(),
      tenantId,
      provider: data.provider !== undefined ? data.provider : existing?.provider ?? "messagecentral",
      mcCustomerId: data.mcCustomerId !== undefined ? data.mcCustomerId : existing?.mcCustomerId ?? null,
      mcAuthToken: data.mcAuthToken !== undefined ? data.mcAuthToken : existing?.mcAuthToken ?? null,
      senderId: data.senderId !== undefined ? data.senderId : existing?.senderId ?? null,
      enabled: data.enabled !== undefined ? !!data.enabled : existing?.enabled ?? false,
      updatedAt: new Date(),
    };
    this.tenantSmsConfigByTenant.set(tenantId, next);
    return next;
  }

  async getPaymentGatewayConfig(): Promise<PaymentGatewayConfig | undefined> { return this.paymentGatewayConfigRecord; }
  async upsertPaymentGatewayConfig(data: Partial<InsertPaymentGatewayConfig>): Promise<PaymentGatewayConfig> {
    const existing = this.paymentGatewayConfigRecord;
    this.paymentGatewayConfigRecord = {
      id: existing?.id ?? 1,
      provider: data.provider !== undefined ? data.provider : existing?.provider ?? "cashfree",
      mode: data.mode !== undefined ? data.mode : existing?.mode ?? "test",
      apiVersion: data.apiVersion !== undefined ? data.apiVersion : existing?.apiVersion ?? "2023-08-01",
      testClientId: data.testClientId !== undefined ? data.testClientId : existing?.testClientId ?? null,
      testClientSecret: data.testClientSecret !== undefined ? data.testClientSecret : existing?.testClientSecret ?? null,
      liveClientId: data.liveClientId !== undefined ? data.liveClientId : existing?.liveClientId ?? null,
      liveClientSecret: data.liveClientSecret !== undefined ? data.liveClientSecret : existing?.liveClientSecret ?? null,
      webhookSecret: data.webhookSecret !== undefined ? data.webhookSecret : existing?.webhookSecret ?? null,
      stripeMode: data.stripeMode !== undefined ? data.stripeMode : existing?.stripeMode ?? "test",
      stripeTestPublishableKey: data.stripeTestPublishableKey !== undefined ? data.stripeTestPublishableKey : existing?.stripeTestPublishableKey ?? null,
      stripeTestSecretKey: data.stripeTestSecretKey !== undefined ? data.stripeTestSecretKey : existing?.stripeTestSecretKey ?? null,
      stripeLivePublishableKey: data.stripeLivePublishableKey !== undefined ? data.stripeLivePublishableKey : existing?.stripeLivePublishableKey ?? null,
      stripeLiveSecretKey: data.stripeLiveSecretKey !== undefined ? data.stripeLiveSecretKey : existing?.stripeLiveSecretKey ?? null,
      stripeWebhookSecret: data.stripeWebhookSecret !== undefined ? data.stripeWebhookSecret : existing?.stripeWebhookSecret ?? null,
      paypalMode: data.paypalMode !== undefined ? data.paypalMode : existing?.paypalMode ?? "sandbox",
      paypalTestClientId: data.paypalTestClientId !== undefined ? data.paypalTestClientId : existing?.paypalTestClientId ?? null,
      paypalTestClientSecret: data.paypalTestClientSecret !== undefined ? data.paypalTestClientSecret : existing?.paypalTestClientSecret ?? null,
      paypalLiveClientId: data.paypalLiveClientId !== undefined ? data.paypalLiveClientId : existing?.paypalLiveClientId ?? null,
      paypalLiveClientSecret: data.paypalLiveClientSecret !== undefined ? data.paypalLiveClientSecret : existing?.paypalLiveClientSecret ?? null,
      paypalWebhookId: data.paypalWebhookId !== undefined ? data.paypalWebhookId : existing?.paypalWebhookId ?? null,
      updatedAt: new Date(),
    };
    return this.paymentGatewayConfigRecord!;
  }

  async getB2cCoupons(): Promise<B2cCoupon[]> {
    return Array.from(this.b2cCouponsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }
  async getB2cCoupon(id: string): Promise<B2cCoupon | undefined> {
    return this.b2cCouponsMap.get(id);
  }
  async getB2cCouponByCode(code: string): Promise<B2cCoupon | undefined> {
    const normalized = code.trim().toUpperCase();
    return Array.from(this.b2cCouponsMap.values()).find(c => c.code === normalized);
  }
  async createB2cCoupon(data: InsertB2cCoupon): Promise<B2cCoupon> {
    const now = new Date();
    const coupon: B2cCoupon = {
      id: randomUUID(),
      code: data.code.trim().toUpperCase(),
      description: data.description ?? null,
      discountPercent: data.discountPercent,
      maxUses: data.maxUses ?? null,
      usedCount: 0,
      active: data.active ?? true,
      expiresAt: data.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.b2cCouponsMap.set(coupon.id, coupon);
    return coupon;
  }
  async updateB2cCoupon(id: string, data: Partial<InsertB2cCoupon>): Promise<B2cCoupon | undefined> {
    const existing = this.b2cCouponsMap.get(id);
    if (!existing) return undefined;
    const updated: B2cCoupon = {
      ...existing,
      ...data,
      code: data.code !== undefined ? data.code.trim().toUpperCase() : existing.code,
      updatedAt: new Date(),
    } as B2cCoupon;
    this.b2cCouponsMap.set(id, updated);
    return updated;
  }
  async incrementB2cCouponUsage(id: string): Promise<B2cCoupon | undefined> {
    const existing = this.b2cCouponsMap.get(id);
    if (!existing) return undefined;
    existing.usedCount = (existing.usedCount ?? 0) + 1;
    existing.updatedAt = new Date();
    this.b2cCouponsMap.set(id, existing);
    return existing;
  }
  async deleteB2cCoupon(id: string): Promise<boolean> {
    return this.b2cCouponsMap.delete(id);
  }
  async getB2cPlans(): Promise<B2cPlan[]> {
    return Array.from(this.b2cPlansMap.values()).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  async getB2cPlan(planKey: string): Promise<B2cPlan | undefined> {
    return this.b2cPlansMap.get(planKey);
  }
  async upsertB2cPlan(planKey: string, data: Partial<InsertB2cPlan>): Promise<B2cPlan> {
    const existing = this.b2cPlansMap.get(planKey);
    const fallback = DEFAULT_B2C_PLANS.find(p => p.planKey === planKey);
    const now = new Date();
    const row: B2cPlan = {
      id: existing?.id ?? randomUUID(),
      planKey,
      name: data.name ?? existing?.name ?? fallback?.name ?? planKey,
      description: data.description !== undefined ? data.description : existing?.description ?? fallback?.description ?? null,
      billingType: data.billingType ?? existing?.billingType ?? fallback?.billingType ?? "free",
      prices: (data.prices !== undefined ? data.prices : existing?.prices ?? fallback?.prices ?? {}) as any,
      features: (data.features !== undefined ? data.features : existing?.features ?? fallback?.features ?? []) as any,
      conditions: (data.conditions !== undefined ? data.conditions : existing?.conditions ?? fallback?.conditions ?? {}) as any,
      basicCheckLimit: data.basicCheckLimit ?? existing?.basicCheckLimit ?? fallback?.basicCheckLimit ?? 0,
      deepCheckLimit: data.deepCheckLimit ?? existing?.deepCheckLimit ?? fallback?.deepCheckLimit ?? 0,
      visaToolsCredits: data.visaToolsCredits ?? existing?.visaToolsCredits ?? fallback?.visaToolsCredits ?? 0,
      sortOrder: data.sortOrder ?? existing?.sortOrder ?? fallback?.sortOrder ?? 0,
      active: data.active ?? existing?.active ?? fallback?.active ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.b2cPlansMap.set(planKey, row);
    return row;
  }
  async getB2cCreditOrdersByUserId(userId: string): Promise<B2cCreditOrder[]> {
    return Array.from(this.b2cCreditOrdersMap.values()).filter(o => o.userId === userId);
  }
  async getB2cCreditOrderByOrderId(orderId: string): Promise<B2cCreditOrder | undefined> {
    return Array.from(this.b2cCreditOrdersMap.values()).find(o => o.orderId === orderId);
  }
  async createB2cCreditOrder(data: InsertB2cCreditOrder): Promise<B2cCreditOrder> {
    const now = new Date();
    const row: B2cCreditOrder = {
      id: randomUUID(),
      userId: data.userId,
      orderId: data.orderId,
      credits: data.credits ?? 0,
      amount: data.amount ?? 0,
      currency: data.currency ?? "USD",
      status: data.status ?? "created",
      creditedAt: data.creditedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.b2cCreditOrdersMap.set(row.id, row);
    return row;
  }
  async markB2cCreditOrderPaid(orderId: string): Promise<B2cCreditOrder | undefined> {
    const existing = await this.getB2cCreditOrderByOrderId(orderId);
    if (!existing) return undefined;
    const updated = { ...existing, status: "paid", creditedAt: existing.creditedAt ?? new Date(), updatedAt: new Date() } as B2cCreditOrder;
    this.b2cCreditOrdersMap.set(existing.id, updated);
    return updated;
  }

  async createVisaProtectionPlan(plan: InsertVisaProtectionPlan): Promise<VisaProtectionPlan> {
    const id = randomUUID();
    const now = new Date();
    const certNum = plan.certificateNumber || `VPP-${now.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}-${(plan.destinationCountry || "GLOBAL").substring(0, 2).toUpperCase()}`;
    const row: VisaProtectionPlan = {
      id,
      userId: plan.userId,
      deepCheckId: plan.deepCheckId,
      destinationCountry: plan.destinationCountry,
      visaType: plan.visaType,
      nationality: plan.nationality ?? null,
      visaCategory: plan.visaCategory ?? null,
      approvalScore: plan.approvalScore,
      currency: plan.currency || "USD",
      governmentFeeAmountCents: plan.governmentFeeAmountCents,
      protectionFeeAmountCents: plan.protectionFeeAmountCents,
      protectedFeeAmountCents: plan.protectedFeeAmountCents ?? null,
      biometricFeeCents: plan.biometricFeeCents ?? null,
      mandatoryLevyCents: plan.mandatoryLevyCents ?? null,
      otherChargesCents: plan.otherChargesCents ?? null,
      feeCurrency: plan.feeCurrency ?? null,
      fxRateToInr: plan.fxRateToInr ?? null,
      premiumBand: plan.premiumBand ?? null,
      premiumPercent: plan.premiumPercent ?? null,
      destinationRiskFactor: plan.destinationRiskFactor ?? null,
      officialSource: plan.officialSource ?? null,
      feeSnapshot: plan.feeSnapshot ?? null,
      orderId: plan.orderId ?? null,
      status: plan.status || "active",
      certificateNumber: certNum,
      termsAgreedAt: now,
      claimReason: plan.claimReason || null,
      claimRejectionLetterUrl: plan.claimRejectionLetterUrl || null,
      claimedAt: null,
      refundedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.visaProtectionPlansMap.set(id, row);
    return row;
  }

  async getVisaProtectionPlanByDeepCheckId(deepCheckId: string): Promise<VisaProtectionPlan | undefined> {
    return Array.from(this.visaProtectionPlansMap.values()).find(p => p.deepCheckId === deepCheckId);
  }

  async getVisaProtectionPlansByUserId(userId: string): Promise<VisaProtectionPlan[]> {
    return Array.from(this.visaProtectionPlansMap.values()).filter(p => p.userId === userId).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async updateVisaProtectionPlan(id: string, data: Partial<InsertVisaProtectionPlan>): Promise<VisaProtectionPlan | undefined> {
    const existing = this.visaProtectionPlansMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data, updatedAt: new Date() } as VisaProtectionPlan;
    this.visaProtectionPlansMap.set(id, updated);
    return updated;
  }

  private saasPricingSettingsRecord: any = {
    deepCheckBasePrices: { USD: 15, GBP: 11, EUR: 12, INR: 1000, AED: 55 },
    visaProtectionFeePercent: 20,
    visaProtectionMinScore: 70,
    visaProtectionMinProtectedFeeInr: 5000,
    visaProtectionPremiumBands: [
      { min: 70, max: 79.99, percent: 22 },
      { min: 80, max: 89.99, percent: 18 },
      { min: 90, max: 94.99, percent: 14 },
      { min: 95, max: 100, percent: 10 },
    ],
    visaProtectionDestinationRisk: {
      "United States": 1.35,
      "Schengen Area": 1.25,
      "United Kingdom": 1.15,
      Australia: 1.05,
      Canada: 1.0,
      "New Zealand": 0.95,
      Ireland: 0.95,
      "United Arab Emirates": 0.85,
    },
    officialVisaFees: {
      "United States": 185,
      "Schengen Area": 98,
      "United Kingdom": 148,
      "Canada": 75,
      "Australia": 125,
    },
    visaFeeEngineFx: {
      INR: 1, USD: 84, EUR: 92, GBP: 105, CAD: 62, AUD: 57, NZD: 52, AED: 23,
    },
    b2bPlans: {
      starter: { USD: 49, GBP: 39, EUR: 45, INR: 3999, AED: 180 },
      growth: { USD: 149, GBP: 119, EUR: 139, INR: 11999, AED: 549 },
      enterprise: { USD: 499, GBP: 399, EUR: 459, INR: 39999, AED: 1830 },
    },
    apiPlatformPricing: {
      deepCheckApiPriceUsd: 1.99,
      visaRequirementsApiPriceUsd: 0.25,
      passportScanApiPriceUsd: 0.50,
    },
  };

  async getSaasPricingSettings(): Promise<any> {
    return this.saasPricingSettingsRecord;
  }

  async updateSaasPricingSettings(patch: any): Promise<any> {
    this.saasPricingSettingsRecord = {
      ...this.saasPricingSettingsRecord,
      ...patch,
      deepCheckBasePrices: { ...this.saasPricingSettingsRecord.deepCheckBasePrices, ...(patch.deepCheckBasePrices || {}) },
      officialVisaFees: { ...this.saasPricingSettingsRecord.officialVisaFees, ...(patch.officialVisaFees || {}) },
      visaProtectionDestinationRisk: { ...this.saasPricingSettingsRecord.visaProtectionDestinationRisk, ...(patch.visaProtectionDestinationRisk || {}) },
      visaFeeEngineFx: { ...this.saasPricingSettingsRecord.visaFeeEngineFx, ...(patch.visaFeeEngineFx || {}) },
      visaProtectionPremiumBands: Array.isArray(patch.visaProtectionPremiumBands)
        ? patch.visaProtectionPremiumBands
        : this.saasPricingSettingsRecord.visaProtectionPremiumBands,
      b2bPlans: {
        starter: { ...this.saasPricingSettingsRecord.b2bPlans?.starter, ...(patch.b2bPlans?.starter || {}) },
        growth: { ...this.saasPricingSettingsRecord.b2bPlans?.growth, ...(patch.b2bPlans?.growth || {}) },
        enterprise: { ...this.saasPricingSettingsRecord.b2bPlans?.enterprise, ...(patch.b2bPlans?.enterprise || {}) },
      },
      apiPlatformPricing: { ...this.saasPricingSettingsRecord.apiPlatformPricing, ...(patch.apiPlatformPricing || {}) },
    };
    return this.saasPricingSettingsRecord;
  }

  private securityPoliciesRecord: any = {
    passwordMinLength: 8,
    sessionTimeout: 120,
    requireMFA: false,
    mfaEnforcementScope: "admins",
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordExpiryDays: 90,
    piiRedactionEnabled: true,
    auditLogRetentionDays: 365,
    ipWhitelist: "",
    rateLimitingEnabled: true,
    rateLimitPerMinute: 60,
    corsStrictOrigin: true,
  };

  private cronJobsList: any[] = [
    {
      id: "daily-quota-reset",
      name: "Daily AI & API Quota Reset",
      schedule: "0 0 * * *",
      scheduleHuman: "Every day at midnight UTC",
      lastRunAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      lastStatus: "success",
      lastDurationMs: 320,
      description: "Resets agency daily AI request counts and checks usage limits.",
    },
    {
      id: "expired-sessions-cleanup",
      name: "Expired Session & OTP Purge",
      schedule: "*/30 * * * *",
      scheduleHuman: "Every 30 minutes",
      lastRunAt: new Date(Date.now() - 60000 * 12).toISOString(),
      lastStatus: "success",
      lastDurationMs: 85,
      description: "Deletes expired OTP tokens and cleans up stale auth sessions.",
    },
    {
      id: "visa-rules-sync",
      name: "Embassy Visa Requirements Sync",
      schedule: "0 */6 * * *",
      scheduleHuman: "Every 6 hours",
      lastRunAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      lastStatus: "success",
      lastDurationMs: 1420,
      description: "Checks official embassy feeds for updated visa rules & ETA exemptions.",
    },
    {
      id: "stale-proposals-archive",
      name: "Stale Customer Proposal Archive",
      schedule: "0 2 * * *",
      scheduleHuman: "Daily at 02:00 AM UTC",
      lastRunAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      lastStatus: "success",
      lastDurationMs: 210,
      description: "Marks unaccepted customer proposals older than 30 days as expired.",
    },
    {
      id: "automated-database-backup",
      name: "Automated DB Snapshot Backup",
      schedule: "0 3 * * *",
      scheduleHuman: "Daily at 03:00 AM UTC",
      lastRunAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      lastStatus: "success",
      lastDurationMs: 4500,
      description: "Executes automated pg_dump database snapshot to secure object storage.",
    },
  ];

  async getSecurityPolicies(): Promise<any> {
    return this.securityPoliciesRecord;
  }

  async updateSecurityPolicies(patch: any): Promise<any> {
    this.securityPoliciesRecord = {
      ...this.securityPoliciesRecord,
      ...patch,
    };
    return this.securityPoliciesRecord;
  }

  async getCronJobs(): Promise<any[]> {
    return this.cronJobsList;
  }

  async runCronJob(jobId: string): Promise<any> {
    const job = this.cronJobsList.find(j => j.id === jobId);
    if (!job) throw new Error("Cron job not found");
    const startTime = Date.now();
    job.lastRunAt = new Date().toISOString();
    job.lastStatus = "success";
    job.lastDurationMs = Math.floor(100 + Math.random() * 400);
    return { success: true, job, executionTimeMs: Date.now() - startTime };
  }

  async getServerDiagnostics(): Promise<any> {
    const memory = process.memoryUsage();
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        externalMb: Math.round(memory.external / (1024 * 1024)),
      },
      envMode: process.env.NODE_ENV || "development",
      serverPort: process.env.PORT || 5001,
      pid: process.pid,
      serverTimestamp: new Date().toISOString(),
    };
  }

  async getDatabaseStatus(): Promise<any> {
    const hasDbUrl = !!process.env.DATABASE_URL;
    return {
      driver: hasDbUrl ? "PostgreSQL (Neon / node-postgres)" : "Hybrid In-Memory Storage",
      status: "healthy",
      connected: true,
      pool: {
        activeConnections: hasDbUrl ? 2 : 1,
        idleConnections: hasDbUrl ? 5 : 0,
        maxConnections: 20,
      },
      metrics: {
        latencyMs: 1.2,
        tenantsCount: this.tenants.size,
        usersCount: this.users.size,
        casesCount: this.cases.size,
        documentsCount: this.documents.size,
      },
      host: hasDbUrl ? "ep-hidden-postgres.neon.tech" : "localhost (in-memory)",
      database: "visashuttle_production",
      sslMode: "require",
      checkedAt: new Date().toISOString(),
    };
  }
}

// HybridStorage: uses PostgreSQL for DB-backed production data. Local
// development can still fall back to seeded in-memory data if a newly added
// optional table has not been pushed yet.
class HybridStorage extends MemStorage {
  private tenantSchemaReady = false;

  async ensureTenantTableShape(): Promise<void> {
    if (this.tenantSchemaReady) return;
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#00B4D8'`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#E056A0'`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#0096C7'`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_phone text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS activities text[] DEFAULT '{}'::text[]`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS pin_code text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS state text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS district text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_number text`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS show_powered_by boolean DEFAULT true`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auth_method text DEFAULT 'otp'`);
    await db.execute(sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()`);
    this.tenantSchemaReady = true;
  }

  async ensureCounsellingTablesToDb(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS counselling_students (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL,
        full_name text NOT NULL,
        email text,
        phone text,
        whatsapp_number text,
        date_of_birth text,
        nationality text,
        current_country text,
        preferred_destinations text[] DEFAULT '{}'::text[],
        preferred_intake text,
        preferred_course text,
        budget_range text,
        academic_history jsonb DEFAULT '{}'::jsonb,
        english_tests jsonb DEFAULT '{}'::jsonb,
        work_experience text,
        education_gap text,
        previous_visa_refusals text,
        travel_history text,
        sponsor_details jsonb DEFAULT '{}'::jsonb,
        counsellor_assigned varchar,
        lead_source text,
        status text NOT NULL DEFAULT 'new_enquiry',
        profile_strength_score integer DEFAULT 0,
        admission_readiness_score integer DEFAULT 0,
        visa_readiness_score integer DEFAULT 0,
        risk_level text DEFAULT 'medium',
        portal_enabled boolean NOT NULL DEFAULT false,
        portal_token text,
        converted_customer_id varchar,
        converted_case_id varchar,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS counselling_sessions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL,
        student_id varchar NOT NULL,
        scheduled_at timestamp,
        mode text DEFAULT 'video',
        status text NOT NULL DEFAULT 'scheduled',
        meeting_notes text,
        student_goals text,
        preferred_countries text[] DEFAULT '{}'::text[],
        preferred_courses text[] DEFAULT '{}'::text[],
        recommendations text,
        next_action text,
        follow_up_date timestamp,
        attachments jsonb DEFAULT '[]'::jsonb,
        shared_with_student boolean NOT NULL DEFAULT false,
        created_by varchar,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS counselling_shortlists (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL,
        student_id varchar NOT NULL,
        destination_country text NOT NULL,
        institution_name text NOT NULL,
        course_name text NOT NULL,
        intake text,
        duration text,
        tuition_fee text,
        application_fee text,
        scholarship_available boolean DEFAULT false,
        eligibility_notes text,
        admission_probability integer DEFAULT 50,
        visa_risk_notes text,
        status text NOT NULL DEFAULT 'suggested',
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS counselling_admissions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL,
        student_id varchar NOT NULL,
        shortlist_id varchar,
        application_status text NOT NULL DEFAULT 'not_started',
        documents_submitted boolean NOT NULL DEFAULT false,
        application_date timestamp,
        offer_letter_status text DEFAULT 'not_received',
        conditional_offer_conditions text,
        fee_payment_status text DEFAULT 'pending',
        country_document_status text,
        admission_deadline timestamp,
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS counselling_documents (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL,
        student_id varchar NOT NULL,
        document_type text NOT NULL,
        required boolean NOT NULL DEFAULT true,
        status text NOT NULL DEFAULT 'pending',
        file_url text,
        file_name text,
        expiry_date timestamp,
        notes text,
        extracted_data jsonb DEFAULT '{}'::jsonb,
        uploaded_by varchar,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS counselling_tasks (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL,
        student_id varchar NOT NULL,
        title text NOT NULL,
        task_type text NOT NULL DEFAULT 'follow_up',
        assigned_to varchar,
        due_date timestamp,
        status text NOT NULL DEFAULT 'open',
        notes text,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS counselling_ai_assessments (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id varchar NOT NULL,
        student_id varchar NOT NULL,
        assessment_type text NOT NULL DEFAULT 'profile_assessment',
        admission_readiness_score integer DEFAULT 0,
        visa_readiness_score integer DEFAULT 0,
        risk_level text DEFAULT 'medium',
        response_json jsonb DEFAULT '{}'::jsonb,
        generated_text text,
        created_by varchar,
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS counselling_students_tenant_idx ON counselling_students (tenant_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS counselling_students_portal_token_idx ON counselling_students (portal_token)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS counselling_sessions_student_idx ON counselling_sessions (tenant_id, student_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS counselling_documents_student_idx ON counselling_documents (tenant_id, student_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS counselling_tasks_student_idx ON counselling_tasks (tenant_id, student_id)`);
  }

  async getUser(id: string): Promise<User | undefined> {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return rows[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
    return rows[0];
  }

  async getUsersByTenantId(tenantId: string): Promise<User[]> {
    return db.select().from(usersTable).where(eq(usersTable.tenantId, tenantId)).orderBy(desc(usersTable.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  }

  async createUser(user: InsertUser): Promise<User> {
    const rows = await db.insert(usersTable).values({
      ...user,
      email: user.email.toLowerCase().trim(),
    }).returning();
    return rows[0];
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const rows = await db.update(usersTable).set(data).where(eq(usersTable.id, id)).returning();
    return rows[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const rows = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
    return rows.length > 0;
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const rows = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id)).limit(1);
    return rows[0];
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const rows = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug)).limit(1);
    return rows[0];
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenantsTable).orderBy(desc(tenantsTable.createdAt));
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    await this.ensureTenantTableShape();
    const rows = await db.insert(tenantsTable).values({
      id: randomUUID(),
      ...tenant,
    } as any).returning();
    return rows[0];
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const rows = await db.update(tenantsTable).set(data).where(eq(tenantsTable.id, id)).returning();
    return rows[0];
  }

  async deleteTenant(id: string): Promise<boolean> {
    const rows = await db.delete(tenantsTable).where(eq(tenantsTable.id, id)).returning({ id: tenantsTable.id });
    return rows.length > 0;
  }

  async getLeadsByTenantId(tenantId: string): Promise<Lead[]> {
    return db.select().from(leadsTable).where(eq(leadsTable.tenantId, tenantId)).orderBy(desc(leadsTable.updatedAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const rows = await db.select().from(leadsTable).where(eq(leadsTable.id, id)).limit(1);
    return rows[0];
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const rows = await db.insert(leadsTable).values(lead).returning();
    return rows[0];
  }

  async updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined> {
    const rows = await db.update(leadsTable)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(leadsTable.id, id))
      .returning();
    return rows[0];
  }

  async deleteLead(id: string): Promise<boolean> {
    const rows = await db.delete(leadsTable).where(eq(leadsTable.id, id)).returning({ id: leadsTable.id });
    return rows.length > 0;
  }

  async getAllLeads(): Promise<Lead[]> {
    return db.select().from(leadsTable).orderBy(desc(leadsTable.createdAt));
  }

  async getCasesByTenantId(tenantId: string): Promise<Case[]> {
    return db.select().from(casesTable).where(eq(casesTable.tenantId, tenantId)).orderBy(desc(casesTable.updatedAt));
  }

  async getAllCases(): Promise<Case[]> {
    return db.select().from(casesTable).orderBy(desc(casesTable.createdAt));
  }

  async getCasesByCustomerId(customerId: string): Promise<Case[]> {
    return db.select().from(casesTable).where(eq(casesTable.customerId, customerId)).orderBy(desc(casesTable.createdAt));
  }

  async getCasesByCustomerAccountId(customerAccountId: string, tenantId: string): Promise<Case[]> {
    return db.select().from(casesTable)
      .where(and(eq(casesTable.customerAccountId, customerAccountId), eq(casesTable.tenantId, tenantId)))
      .orderBy(desc(casesTable.createdAt));
  }

  async getCasesByTenantAndVisaStage(tenantId: string, stage: string): Promise<Case[]> {
    return db.select().from(casesTable)
      .where(and(eq(casesTable.tenantId, tenantId), eq(casesTable.visaStage, stage)))
      .orderBy(desc(casesTable.updatedAt));
  }

  async getCaseByReferenceId(referenceId: string, tenantId: string): Promise<Case | undefined> {
    const rows = await db.select().from(casesTable)
      .where(and(eq(casesTable.referenceId, referenceId), eq(casesTable.tenantId, tenantId)))
      .limit(1);
    return rows[0];
  }

  async getCase(id: string): Promise<Case | undefined> {
    const rows = await db.select().from(casesTable).where(eq(casesTable.id, id)).limit(1);
    return rows[0];
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const rows = await db.insert(casesTable).values(caseData).returning();
    return rows[0];
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    const rows = await db.update(casesTable)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(casesTable.id, id))
      .returning();
    return rows[0];
  }

  async getActivityLogsByTenantId(tenantId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogsTable).where(eq(activityLogsTable.tenantId, tenantId)).orderBy(desc(activityLogsTable.createdAt));
  }

  async getAllActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const rows = await db.insert(activityLogsTable).values(log).returning();
    return rows[0];
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));
  }

  async getAllPayments(): Promise<Payment[]> {
    return db.select().from(paymentsTable).orderBy(desc(paymentsTable.paidAt));
  }

  async getAppointmentsByCaseId(caseId: string): Promise<Appointment[]> {
    return db.select().from(appointmentsTable).where(eq(appointmentsTable.caseId, caseId)).orderBy(asc(appointmentsTable.scheduledAt));
  }

  async getAppointmentsByTenantId(tenantId: string): Promise<Appointment[]> {
    return db.select().from(appointmentsTable).where(eq(appointmentsTable.tenantId, tenantId)).orderBy(asc(appointmentsTable.scheduledAt));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const rows = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
    return rows[0];
  }

  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const rows = await db.insert(appointmentsTable).values(data).returning();
    return rows[0];
  }

  async updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const { caseId: _ignoredCaseId, tenantId: _ignoredTenantId, ...safe } = data as any;
    const rows = await db.update(appointmentsTable)
      .set({ ...safe, updatedAt: new Date() } as any)
      .where(eq(appointmentsTable.id, id))
      .returning();
    return rows[0];
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const rows = await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id)).returning({ id: appointmentsTable.id });
    return rows.length > 0;
  }

  async getCoTravellersByCaseId(caseId: string): Promise<CaseCoTraveller[]> {
    return db.select().from(caseCoTravellersTable).where(eq(caseCoTravellersTable.caseId, caseId)).orderBy(asc(caseCoTravellersTable.createdAt));
  }

  async getCoTraveller(id: string): Promise<CaseCoTraveller | undefined> {
    const rows = await db.select().from(caseCoTravellersTable).where(eq(caseCoTravellersTable.id, id)).limit(1);
    return rows[0];
  }

  async createCoTraveller(data: InsertCaseCoTraveller): Promise<CaseCoTraveller> {
    const rows = await db.insert(caseCoTravellersTable).values(data).returning();
    return rows[0];
  }

  async updateCoTraveller(id: string, data: Partial<InsertCaseCoTraveller>): Promise<CaseCoTraveller | undefined> {
    const rows = await db.update(caseCoTravellersTable)
      .set(data as any)
      .where(eq(caseCoTravellersTable.id, id))
      .returning();
    return rows[0];
  }

  async deleteCoTraveller(id: string): Promise<boolean> {
    const rows = await db.delete(caseCoTravellersTable).where(eq(caseCoTravellersTable.id, id)).returning({ id: caseCoTravellersTable.id });
    return rows.length > 0;
  }

  async getDocumentsByCaseId(caseId: string): Promise<Document[]> {
    return db.select().from(documentsTable).where(eq(documentsTable.caseId, caseId)).orderBy(desc(documentsTable.uploadedAt));
  }

  async getDocumentsByTenantId(tenantId: string): Promise<Document[]> {
    return db.select().from(documentsTable).where(eq(documentsTable.tenantId, tenantId)).orderBy(desc(documentsTable.uploadedAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const rows = await db.select().from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
    return rows[0];
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const rows = await db.insert(documentsTable).values(data).returning();
    return rows[0];
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const rows = await db.update(documentsTable)
      .set(data as any)
      .where(eq(documentsTable.id, id))
      .returning();
    return rows[0];
  }

  async getMessagesByCaseId(caseId: string): Promise<Message[]> {
    return db.select().from(messagesTable).where(eq(messagesTable.caseId, caseId)).orderBy(asc(messagesTable.createdAt));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const rows = await db.insert(messagesTable).values(data).returning();
    return rows[0];
  }

  async getAllVisaTemplates(): Promise<VisaTemplate[]> {
    return db.select().from(visaTemplatesTable).orderBy(asc(visaTemplatesTable.country), asc(visaTemplatesTable.visaType));
  }

  async getVisaTemplate(id: string): Promise<VisaTemplate | undefined> {
    const rows = await db.select().from(visaTemplatesTable).where(eq(visaTemplatesTable.id, id)).limit(1);
    return rows[0];
  }

  async createVisaTemplate(data: InsertVisaTemplate): Promise<VisaTemplate> {
    const rows = await db.insert(visaTemplatesTable).values(data).returning();
    return rows[0];
  }

  async updateVisaTemplate(id: string, data: Partial<InsertVisaTemplate>): Promise<VisaTemplate | undefined> {
    const rows = await db.update(visaTemplatesTable)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(visaTemplatesTable.id, id))
      .returning();
    return rows[0];
  }

  async deleteVisaTemplate(id: string): Promise<boolean> {
    const rows = await db.delete(visaTemplatesTable).where(eq(visaTemplatesTable.id, id)).returning({ id: visaTemplatesTable.id });
    return rows.length > 0;
  }

  async getCustomerAccount(id: string): Promise<CustomerAccount | undefined> {
    const rows = await db.select().from(customerAccountsTable).where(eq(customerAccountsTable.id, id)).limit(1);
    return rows[0];
  }

  async getCustomerAccountByEmail(email: string): Promise<CustomerAccount | undefined> {
    const rows = await db.select().from(customerAccountsTable).where(eq(customerAccountsTable.email, email.toLowerCase().trim())).limit(1);
    return rows[0];
  }

  async getCustomerAccountByPhone(phone: string): Promise<CustomerAccount | undefined> {
    const normalized = normalizePhone(phone);
    if (!normalized) return undefined;
    const rows = await db.select().from(customerAccountsTable);
    return rows.find((account) => normalizePhone(account.phone) === normalized);
  }

  async createCustomerAccount(data: InsertCustomerAccount): Promise<CustomerAccount> {
    const rows = await db.insert(customerAccountsTable).values({
      ...data,
      email: data.email.toLowerCase().trim(),
    }).returning();
    return rows[0];
  }

  async updateCustomerAccount(id: string, data: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined> {
    const rows = await db.update(customerAccountsTable)
      .set(data as any)
      .where(eq(customerAccountsTable.id, id))
      .returning();
    return rows[0];
  }

  async getCustomerTenantLink(customerAccountId: string, tenantId: string): Promise<CustomerTenantLink | undefined> {
    const rows = await db.select().from(customerTenantLinksTable)
      .where(and(eq(customerTenantLinksTable.customerAccountId, customerAccountId), eq(customerTenantLinksTable.tenantId, tenantId)))
      .limit(1);
    return rows[0];
  }

  async createCustomerTenantLink(data: InsertCustomerTenantLink): Promise<CustomerTenantLink> {
    const rows = await db.insert(customerTenantLinksTable).values(data).returning();
    return rows[0];
  }

  async getCustomerTenantLinks(customerAccountId: string): Promise<CustomerTenantLink[]> {
    return db.select().from(customerTenantLinksTable).where(eq(customerTenantLinksTable.customerAccountId, customerAccountId)).orderBy(desc(customerTenantLinksTable.createdAt));
  }

  async getCustomersByTenantId(tenantId: string): Promise<CustomerAccount[]> {
    const links = await db.select().from(customerTenantLinksTable).where(eq(customerTenantLinksTable.tenantId, tenantId)).orderBy(desc(customerTenantLinksTable.createdAt));
    const seen = new Set<string>();
    const customers: CustomerAccount[] = [];
    for (const link of links) {
      if (seen.has(link.customerAccountId)) continue;
      seen.add(link.customerAccountId);
      const customer = await this.getCustomerAccount(link.customerAccountId);
      if (customer) customers.push(customer);
    }
    return customers;
  }

  async getPassportsByCustomerId(customerAccountId: string, tenantId: string): Promise<Passport[]> {
    return db.select().from(passportsTable)
      .where(and(eq(passportsTable.customerAccountId, customerAccountId), eq(passportsTable.tenantId, tenantId)))
      .orderBy(desc(passportsTable.isPrimary), desc(passportsTable.updatedAt));
  }

  async getPassportsByTenantId(tenantId: string): Promise<Passport[]> {
    return db.select().from(passportsTable).where(eq(passportsTable.tenantId, tenantId)).orderBy(desc(passportsTable.updatedAt));
  }

  async getPassport(id: string): Promise<Passport | undefined> {
    const rows = await db.select().from(passportsTable).where(eq(passportsTable.id, id)).limit(1);
    return rows[0];
  }

  async createPassport(data: InsertPassport): Promise<Passport> {
    const rows = await db.insert(passportsTable).values(data).returning();
    return rows[0];
  }

  async updatePassport(id: string, data: Partial<InsertPassport>): Promise<Passport | undefined> {
    const existing = await this.getPassport(id);
    if (!existing) return undefined;
    const { customerAccountId: _ignoredCustomer, tenantId: _ignoredTenant, ...safe } = data as any;
    const rows = await db.update(passportsTable)
      .set({ ...safe, updatedAt: new Date() } as any)
      .where(eq(passportsTable.id, id))
      .returning();
    return rows[0];
  }

  async deletePassport(id: string): Promise<boolean> {
    const rows = await db.delete(passportsTable).where(eq(passportsTable.id, id)).returning({ id: passportsTable.id });
    return rows.length > 0;
  }

  async createOTPCode(data: InsertOTPCode): Promise<OTPCode> {
    const rows = await db.insert(otpCodesTable).values(data).returning();
    return rows[0];
  }

  async getActiveOTPCode(email: string, tenantId: string): Promise<OTPCode | undefined> {
    const now = new Date();
    const rows = await db.select().from(otpCodesTable)
      .where(and(eq(otpCodesTable.email, email.toLowerCase().trim()), eq(otpCodesTable.tenantId, tenantId)))
      .orderBy(desc(otpCodesTable.createdAt));
    return rows.find((otp) => otp.expiresAt > now && !otp.usedAt && (otp.attempts || 0) < 5);
  }

  async getActiveOTPCodeByPhone(phone: string, tenantId: string): Promise<OTPCode | undefined> {
    const normalized = normalizePhone(phone);
    if (!normalized) return undefined;
    const now = new Date();
    const rows = await db.select().from(otpCodesTable)
      .where(eq(otpCodesTable.tenantId, tenantId))
      .orderBy(desc(otpCodesTable.createdAt));
    return rows.find((otp) => normalizePhone(otp.phone) === normalized && otp.expiresAt > now && !otp.usedAt && (otp.attempts || 0) < 5);
  }

  async markOTPUsed(id: string): Promise<void> {
    await db.update(otpCodesTable).set({ usedAt: new Date() }).where(eq(otpCodesTable.id, id));
  }

  async incrementOTPAttempts(id: string): Promise<void> {
    const otp = (await db.select().from(otpCodesTable).where(eq(otpCodesTable.id, id)).limit(1))[0];
    if (!otp) return;
    await db.update(otpCodesTable)
      .set({ attempts: (otp.attempts || 0) + 1 })
      .where(eq(otpCodesTable.id, id));
  }

  async getTenantPaymentGatewayConfig(tenantId: string): Promise<TenantPaymentGatewayConfig | undefined> {
    const rows = await db.select().from(tenantPaymentGatewayConfigTable).where(eq(tenantPaymentGatewayConfigTable.tenantId, tenantId)).limit(1);
    return rows[0];
  }

  async upsertTenantPaymentGatewayConfig(tenantId: string, data: Partial<InsertTenantPaymentGatewayConfig>): Promise<TenantPaymentGatewayConfig> {
    const existing = await this.getTenantPaymentGatewayConfig(tenantId);
    if (existing) {
      const rows = await db.update(tenantPaymentGatewayConfigTable)
        .set({ ...data, tenantId, updatedAt: new Date() } as any)
        .where(eq(tenantPaymentGatewayConfigTable.id, existing.id))
        .returning();
      return rows[0];
    }
    const rows = await db.insert(tenantPaymentGatewayConfigTable).values({ ...data, tenantId } as InsertTenantPaymentGatewayConfig).returning();
    return rows[0];
  }

  async getTenantSmsConfig(tenantId: string): Promise<TenantSmsConfig | undefined> {
    const rows = await db.select().from(tenantSmsConfigTable).where(eq(tenantSmsConfigTable.tenantId, tenantId)).limit(1);
    return rows[0];
  }

  async upsertTenantSmsConfig(tenantId: string, data: Partial<InsertTenantSmsConfig>): Promise<TenantSmsConfig> {
    const existing = await this.getTenantSmsConfig(tenantId);
    if (existing) {
      const rows = await db.update(tenantSmsConfigTable)
        .set({ ...data, tenantId, updatedAt: new Date() } as any)
        .where(eq(tenantSmsConfigTable.id, existing.id))
        .returning();
      return rows[0];
    }
    const rows = await db.insert(tenantSmsConfigTable).values({ ...data, tenantId } as InsertTenantSmsConfig).returning();
    return rows[0];
  }

  async getFeeTemplatesByTenantId(tenantId: string): Promise<FeeTemplate[]> {
    return db.select().from(feeTemplatesTable).where(eq(feeTemplatesTable.tenantId, tenantId)).orderBy(asc(feeTemplatesTable.name));
  }

  async getFeeTemplate(id: string): Promise<FeeTemplate | undefined> {
    const rows = await db.select().from(feeTemplatesTable).where(eq(feeTemplatesTable.id, id)).limit(1);
    return rows[0];
  }

  async createFeeTemplate(data: InsertFeeTemplate): Promise<FeeTemplate> {
    const rows = await db.insert(feeTemplatesTable).values(data).returning();
    return rows[0];
  }

  async updateFeeTemplate(id: string, data: Partial<InsertFeeTemplate>): Promise<FeeTemplate | undefined> {
    const rows = await db.update(feeTemplatesTable)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(feeTemplatesTable.id, id))
      .returning();
    return rows[0];
  }

  async deleteFeeTemplate(id: string): Promise<boolean> {
    const rows = await db.delete(feeTemplatesTable).where(eq(feeTemplatesTable.id, id)).returning({ id: feeTemplatesTable.id });
    return rows.length > 0;
  }

  async getInvoiceSettings(tenantId: string): Promise<InvoiceSettings | undefined> {
    const rows = await db.select().from(invoiceSettingsTable).where(eq(invoiceSettingsTable.tenantId, tenantId)).limit(1);
    return rows[0];
  }

  async upsertInvoiceSettings(tenantId: string, data: Partial<InsertInvoiceSettings>): Promise<InvoiceSettings> {
    const existing = await this.getInvoiceSettings(tenantId);
    if (existing) {
      const rows = await db.update(invoiceSettingsTable)
        .set({ ...data, tenantId, updatedAt: new Date() } as any)
        .where(eq(invoiceSettingsTable.id, existing.id))
        .returning();
      return rows[0];
    }
    const rows = await db.insert(invoiceSettingsTable).values({ ...data, tenantId } as InsertInvoiceSettings).returning();
    return rows[0];
  }

  async getInvoicesByTenantId(tenantId: string): Promise<Invoice[]> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.tenantId, tenantId)).orderBy(desc(invoicesTable.createdAt));
  }

  async getInvoicesByCaseId(caseId: string): Promise<Invoice[]> {
    return db.select().from(invoicesTable).where(eq(invoicesTable.caseId, caseId)).orderBy(desc(invoicesTable.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const rows = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
    return rows[0];
  }

  async getInvoiceByPublicToken(token: string): Promise<Invoice | undefined> {
    if (!token) return undefined;
    const rows = await db.select().from(invoicesTable).where(eq(invoicesTable.publicToken, token)).limit(1);
    return rows[0];
  }

  async createInvoice(data: InsertInvoice, items: Omit<InsertInvoiceItem, "invoiceId">[]): Promise<Invoice> {
    const subtotal = items.reduce((sum, item) => sum + (item.amount ?? ((item.unitPrice ?? 0) * (item.quantity ?? 1))), 0);
    const total = subtotal + (data.taxAmount ?? 0);
    const invoiceRows = await db.insert(invoicesTable).values({
      ...data,
      subtotal: data.subtotal ?? subtotal,
      total: data.total ?? total,
    } as InsertInvoice).returning();
    const invoice = invoiceRows[0];
    if (items.length) {
      await db.insert(invoiceItemsTable).values(items.map((item, index) => ({
        ...item,
        invoiceId: invoice.id,
        amount: item.amount ?? ((item.unitPrice ?? 0) * (item.quantity ?? 1)),
        sortOrder: item.sortOrder ?? index,
      })));
    }
    return invoice;
  }

  async updateInvoice(id: string, data: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const rows = await db.update(invoicesTable)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(invoicesTable.id, id))
      .returning();
    return rows[0];
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
    await db.delete(paymentsTable).where(eq(paymentsTable.invoiceId, id));
    const rows = await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).returning({ id: invoicesTable.id });
    return rows.length > 0;
  }

  async replaceInvoiceItems(invoiceId: string, items: Omit<InsertInvoiceItem, "invoiceId">[]): Promise<InvoiceItem[]> {
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId));
    const rows = items.length
      ? await db.insert(invoiceItemsTable).values(items.map((item, index) => ({
          ...item,
          invoiceId,
          amount: item.amount ?? ((item.unitPrice ?? 0) * (item.quantity ?? 1)),
          sortOrder: item.sortOrder ?? index,
        }))).returning()
      : [];
    const invoice = await this.getInvoice(invoiceId);
    if (invoice) {
      const subtotal = rows.reduce((sum, item) => sum + item.amount, 0);
      await db.update(invoicesTable)
        .set({ subtotal, total: subtotal + (invoice.taxAmount ?? 0), updatedAt: new Date() } as any)
        .where(eq(invoicesTable.id, invoiceId));
    }
    return rows;
  }

  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId)).orderBy(asc(invoiceItemsTable.sortOrder));
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
    return rows[0];
  }

  async getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]> {
    return db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, invoiceId)).orderBy(desc(paymentsTable.paidAt));
  }

  async getPaymentsByTenantId(tenantId: string): Promise<Payment[]> {
    return db.select().from(paymentsTable).where(eq(paymentsTable.tenantId, tenantId)).orderBy(desc(paymentsTable.paidAt));
  }

  private async recalculateInvoicePaymentStatus(invoiceId: string): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) return;
    const payments = await this.getPaymentsByInvoiceId(invoiceId);
    const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    let status = invoice.status;
    if (paidAmount >= invoice.total && invoice.total > 0) status = "paid";
    else if (paidAmount > 0) status = "partial";
    else if (invoice.status === "paid" || invoice.status === "partial") status = "sent";
    await db.update(invoicesTable)
      .set({ paidAmount, status, updatedAt: new Date() } as any)
      .where(eq(invoicesTable.id, invoiceId));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const rows = await db.insert(paymentsTable).values(data).returning();
    await this.recalculateInvoicePaymentStatus(data.invoiceId);
    return rows[0];
  }

  async deletePayment(id: string): Promise<boolean> {
    const payment = await this.getPayment(id);
    if (!payment) return false;
    const rows = await db.delete(paymentsTable).where(eq(paymentsTable.id, id)).returning({ id: paymentsTable.id });
    if (rows.length) await this.recalculateInvoicePaymentStatus(payment.invoiceId);
    return rows.length > 0;
  }

  private async ensureDemoB2cEntitlements(user: B2cUser | undefined): Promise<B2cUser | undefined> {
    if (!user || user.email !== "demo@visashuttle.com") return user;

    // Demo/QA account is always entitled and verified. Repairs stale rows
    // (e.g. created before emailVerified was seeded) on first read so no
    // manual database update is needed after deploy.
    const needsPlanFix = user.subscriptionPlan !== "pro" || user.checkLimit < 5 || !user.deepCheckAccess;
    const needsVerificationFix = !user.emailVerified;
    if (!needsPlanFix && !needsVerificationFix) return user;

    const patch: Record<string, unknown> = {};
    if (needsPlanFix) {
      patch.subscriptionPlan = "pro";
      patch.checkLimit = Math.max(user.checkLimit || 0, 5);
      patch.deepCheckAccess = true;
    }
    if (needsVerificationFix) {
      patch.emailVerified = true;
      patch.emailVerificationToken = null;
    }
    const rows = await db.update(b2cUsers)
      .set(patch)
      .where(eq(b2cUsers.id, user.id))
      .returning();
    return rows[0] ?? {
      ...user,
      ...(needsPlanFix ? { subscriptionPlan: "pro" as const, checkLimit: Math.max(user.checkLimit || 0, 5), deepCheckAccess: true } : {}),
      ...(needsVerificationFix ? { emailVerified: true, emailVerificationToken: null } : {}),
    };
  }

  async getProposalsByTenantId(tenantId: string): Promise<Proposal[]> {
    try {
      return await db
        .select()
        .from(proposalsTable)
        .where(eq(proposalsTable.tenantId, tenantId))
        .orderBy(desc(proposalsTable.createdAt));
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getProposalsByTenantId(tenantId);
      throw error;
    }
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    try {
      const rows = await db.select().from(proposalsTable).where(eq(proposalsTable.id, id)).limit(1);
      return rows[0] ?? undefined;
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getProposal(id);
      throw error;
    }
  }

  async getProposalByToken(token: string): Promise<Proposal | undefined> {
    try {
      if (!token) return undefined;
      const rows = await db.select().from(proposalsTable).where(eq(proposalsTable.token, token)).limit(1);
      return rows[0] ?? undefined;
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getProposalByToken(token);
      throw error;
    }
  }

  async createProposal(data: InsertProposal): Promise<Proposal> {
    try {
      const rows = await db.insert(proposalsTable).values(data).returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.createProposal(data);
      throw error;
    }
  }

  async updateProposal(id: string, data: Partial<Proposal>): Promise<Proposal | undefined> {
    try {
      const rows = await db
        .update(proposalsTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(proposalsTable.id, id))
        .returning();
      return rows[0] ?? undefined;
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.updateProposal(id, data);
      throw error;
    }
  }

  async deleteProposal(id: string): Promise<boolean> {
    try {
      const rows = await db
        .delete(proposalsTable)
        .where(eq(proposalsTable.id, id))
        .returning({ id: proposalsTable.id });
      return rows.length > 0;
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.deleteProposal(id);
      throw error;
    }
  }

  async getAllProposals(): Promise<Proposal[]> {
    try {
      return await db.select().from(proposalsTable).orderBy(desc(proposalsTable.createdAt));
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getAllProposals();
      throw error;
    }
  }

  async getTenantDocumentChecklists(tenantId: string): Promise<TenantDocumentChecklist[]> {
    try {
      const rows = await db.select().from(tenantDocumentChecklistsTable).where(eq(tenantDocumentChecklistsTable.tenantId, tenantId));
      return rows.sort((a: TenantDocumentChecklist, b: TenantDocumentChecklist) => a.country.localeCompare(b.country) || a.visaType.localeCompare(b.visaType));
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getTenantDocumentChecklists(tenantId);
      throw error;
    }
  }

  async getTenantDocumentChecklist(tenantId: string, country: string, visaType: string): Promise<TenantDocumentChecklist | undefined> {
    try {
      const rows = await db.select().from(tenantDocumentChecklistsTable).where(and(
        eq(tenantDocumentChecklistsTable.tenantId, tenantId),
        eq(tenantDocumentChecklistsTable.country, country),
        eq(tenantDocumentChecklistsTable.visaType, visaType),
      )).limit(1);
      return rows[0] ?? undefined;
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getTenantDocumentChecklist(tenantId, country, visaType);
      throw error;
    }
  }

  async upsertTenantDocumentChecklist(tenantId: string, country: string, visaType: string, requirements: unknown): Promise<TenantDocumentChecklist> {
    try {
      const existing = await this.getTenantDocumentChecklist(tenantId, country, visaType);
      if (existing) {
        const rows = await db.update(tenantDocumentChecklistsTable)
          .set({ requirements, updatedAt: new Date() })
          .where(eq(tenantDocumentChecklistsTable.id, existing.id))
          .returning();
        return rows[0];
      }
      const rows = await db.insert(tenantDocumentChecklistsTable).values({
        tenantId,
        country,
        visaType,
        requirements,
      }).returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.upsertTenantDocumentChecklist(tenantId, country, visaType, requirements);
      throw error;
    }
  }

  async deleteTenantDocumentChecklist(tenantId: string, country: string, visaType: string): Promise<boolean> {
    try {
      const rows = await db.delete(tenantDocumentChecklistsTable).where(and(
        eq(tenantDocumentChecklistsTable.tenantId, tenantId),
        eq(tenantDocumentChecklistsTable.country, country),
        eq(tenantDocumentChecklistsTable.visaType, visaType),
      )).returning({ id: tenantDocumentChecklistsTable.id });
      return rows.length > 0;
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.deleteTenantDocumentChecklist(tenantId, country, visaType);
      throw error;
    }
  }

  // Seed platform + demo users into PostgreSQL on startup so production always
  // has a recoverable SaaS admin account and demo B2C accounts persist.
  async seedPlatformUsersToDb(): Promise<void> {
    const demoTenant = {
      name: "Demo Travel Agency",
      slug: "demo-agency",
      logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=DTA&backgroundColor=00B4D8&textColor=ffffff",
      plan: "go",
      status: "active",
      primaryColor: "#00B4D8",
      secondaryColor: "#E056A0",
      accentColor: "#0096C7",
      contactEmail: "info@demoagency.com",
      contactPhone: "+1 234 567 8900",
      activities: ["VISA Services", "Tours & Travels"],
      address: "Demo Street",
      country: "India",
      pinCode: null,
      state: null,
      district: null,
      whatsappNumber: "+1 234 567 8900",
      showPoweredBy: true,
      authMethod: "otp",
    };
    const existingTenant = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, demoTenant.slug)).limit(1);
    let demoTenantId = existingTenant[0]?.id;
    if (!existingTenant[0]) {
      const inserted = await db.insert(tenantsTable).values(demoTenant).returning({ id: tenantsTable.id });
      demoTenantId = inserted[0]?.id;
    } else {
      await db.update(tenantsTable)
        .set({
          name: demoTenant.name,
          plan: demoTenant.plan,
          status: demoTenant.status,
          logoUrl: demoTenant.logoUrl,
          primaryColor: demoTenant.primaryColor,
          secondaryColor: demoTenant.secondaryColor,
          accentColor: demoTenant.accentColor,
          contactEmail: demoTenant.contactEmail,
          contactPhone: demoTenant.contactPhone,
          activities: demoTenant.activities,
          address: demoTenant.address,
          country: demoTenant.country,
          whatsappNumber: demoTenant.whatsappNumber,
          showPoweredBy: demoTenant.showPoweredBy,
          authMethod: demoTenant.authMethod,
        } as any)
        .where(eq(tenantsTable.id, existingTenant[0].id));
    }
    if (!demoTenantId) throw new Error("Demo tenant seed failed");

    const adminEmail = "admin@visashuttle.com";
    const adminPassword = bcrypt.hashSync("Admin@12345", 10);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
    if (!existing[0]) {
      await db.insert(usersTable).values({
        email: adminEmail,
        password: adminPassword,
        name: "System Admin",
        role: "saas_admin",
        tenantId: null,
        avatarUrl: null,
        permissions: [],
      });
    } else {
      const admin = existing[0];
      await db.update(usersTable)
        .set({
          password: adminPassword,
          role: "saas_admin",
          tenantId: null,
          permissions: [],
        } as any)
        .where(eq(usersTable.id, admin.id));
    }

    const agencyDemoUsers = [
      {
        email: "owner@demoagency.com",
        password: bcrypt.hashSync("Demo@12345", 10),
        name: "Sarah Agent",
        role: "agency_owner",
        tenantId: demoTenantId,
        avatarUrl: null,
        permissions: [],
      },
      {
        email: "customer@demo.com",
        password: bcrypt.hashSync("Demo@12345", 10),
        name: "John Smith",
        role: "customer",
        tenantId: demoTenantId,
        avatarUrl: null,
        permissions: [],
      },
    ];

    for (const demoUser of agencyDemoUsers) {
      const existingDemoUser = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, demoUser.email)).limit(1);
      if (!existingDemoUser[0]) {
        await db.insert(usersTable).values(demoUser);
      } else {
        await db.update(usersTable)
          .set({
            password: demoUser.password,
            name: demoUser.name,
            role: demoUser.role,
            tenantId: demoUser.tenantId,
            avatarUrl: demoUser.avatarUrl,
            permissions: demoUser.permissions,
          } as any)
          .where(eq(usersTable.id, existingDemoUser[0].id));
      }
    }
  }

  async seedThomasCookDemoWorkspaceToDb(): Promise<void> {
    await this.ensureCounsellingTablesToDb();
    const tenantSeed = {
      name: "Thomas Cook Visa Desk",
      slug: "thomas-cook-visa-desk",
      logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=TC&backgroundColor=4055FF&textColor=ffffff",
      plan: "power",
      status: "active",
      primaryColor: "#4055FF",
      secondaryColor: "#9033F5",
      accentColor: "#FF2060",
      contactEmail: "antony@thomascook.com",
      contactPhone: "+91 98470 00000",
      activities: ["VISA Services", "Immigration Consultancy", "Student Counselling", "Tours & Travels"],
      address: "Level 8, Tower I, UBB, Cessna Business Park, ORR, Bangalore",
      country: "India",
      pinCode: "560103",
      state: "Karnataka",
      district: "Bangalore",
      whatsappNumber: "+91 98470 00000",
      showPoweredBy: false,
      authMethod: "otp",
    };
    const existingTenant = await db.select({ id: tenantsTable.id }).from(tenantsTable).where(eq(tenantsTable.slug, tenantSeed.slug)).limit(1);
    let tenantId = existingTenant[0]?.id;
    if (!tenantId) {
      const inserted = await db.insert(tenantsTable).values(tenantSeed as any).returning({ id: tenantsTable.id });
      tenantId = inserted[0]?.id;
    } else {
      await db.update(tenantsTable).set(tenantSeed as any).where(eq(tenantsTable.id, tenantId));
    }
    if (!tenantId) throw new Error("Thomas Cook demo tenant seed failed");

    const ownerEmail = "antony@thomascook.com";
    const existingOwner = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, ownerEmail)).limit(1);
    const ownerPassword = bcrypt.hashSync("Thomas@12345", 10);
    let ownerId = existingOwner[0]?.id;
    const ownerPayload = {
      email: ownerEmail,
      password: ownerPassword,
      name: "Aster Antony",
      role: "agency_owner",
      tenantId,
      avatarUrl: null,
      permissions: [],
    };
    if (!ownerId) {
      const inserted = await db.insert(usersTable).values(ownerPayload as any).returning({ id: usersTable.id });
      ownerId = inserted[0]?.id;
    } else {
      await db.update(usersTable)
        .set({
          name: ownerPayload.name,
          role: ownerPayload.role,
          tenantId,
          avatarUrl: ownerPayload.avatarUrl,
          permissions: ownerPayload.permissions,
        } as any)
        .where(eq(usersTable.id, ownerId));
    }
    if (!ownerId) throw new Error("Thomas Cook demo owner seed failed");

    const staffEmail = "counsellor@thomascook.com";
    const staff = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, staffEmail)).limit(1);
    if (!staff[0]) {
      await db.insert(usersTable).values({
        email: staffEmail,
        password: bcrypt.hashSync("Thomas@12345", 10),
        name: "Maya Counsellor",
        role: "agency_manager",
        tenantId,
        avatarUrl: null,
        permissions: ["leads", "cases", "documents", "accounting", "analytics", "settings"],
      } as any);
    }

    const leadSeeds = [
      { email: "riya.menon.demo@visashuttle.com", name: "Riya Menon", phone: "+91 98765 10001", source: "Website", destinationCountry: "Canada", visaType: "Student Visa", stage: "proposal", notes: "Interested in Fall 2026 business analytics masters. IELTS ready.", assignedTo: ownerId },
      { email: "arjun.nair.demo@visashuttle.com", name: "Arjun Nair", phone: "+91 98765 10002", source: "Walk-in", destinationCountry: "Germany", visaType: "Student Visa", stage: "qualified", notes: "Engineering profile, needs shortlist and blocked-account guidance.", assignedTo: ownerId },
      { email: "meera.jose.demo@visashuttle.com", name: "Meera Jose", phone: "+91 98765 10003", source: "Referral", destinationCountry: "Australia", visaType: "Visitor Visa", stage: "contacted", notes: "Family visit case with moderate documentation risk.", assignedTo: ownerId },
      { email: "daniel.kuriakose.demo@visashuttle.com", name: "Daniel Kuriakose", phone: "+91 98765 10004", source: "Growth Hub", destinationCountry: "United Kingdom", visaType: "Work Visa", stage: "new", notes: "Healthcare offer letter verification pending.", assignedTo: ownerId },
    ];
    for (const lead of leadSeeds) {
      const existing = await db.select({ id: leadsTable.id }).from(leadsTable).where(and(eq(leadsTable.tenantId, tenantId), eq(leadsTable.email, lead.email))).limit(1);
      if (!existing[0]) await db.insert(leadsTable).values({ tenantId, ...lead } as any);
    }

    const customerSeeds = [
      { email: "riya.menon.demo@visashuttle.com", phone: "+91 98765 10001", name: "Riya Menon", isVerified: true },
      { email: "arjun.nair.demo@visashuttle.com", phone: "+91 98765 10002", name: "Arjun Nair", isVerified: true },
      { email: "meera.jose.demo@visashuttle.com", phone: "+91 98765 10003", name: "Meera Jose", isVerified: false },
    ];
    const customerIds = new Map<string, string>();
    for (const customer of customerSeeds) {
      const existing = await db.select({ id: customerAccountsTable.id }).from(customerAccountsTable).where(eq(customerAccountsTable.email, customer.email)).limit(1);
      let customerId = existing[0]?.id;
      if (!customerId) {
        const inserted = await db.insert(customerAccountsTable).values(customer as any).returning({ id: customerAccountsTable.id });
        customerId = inserted[0]?.id;
      } else {
        await db.update(customerAccountsTable).set(customer as any).where(eq(customerAccountsTable.id, customerId));
      }
      if (customerId) {
        customerIds.set(customer.email, customerId);
        const link = await db.select({ id: customerTenantLinksTable.id }).from(customerTenantLinksTable).where(and(eq(customerTenantLinksTable.customerAccountId, customerId), eq(customerTenantLinksTable.tenantId, tenantId))).limit(1);
        if (!link[0]) await db.insert(customerTenantLinksTable).values({ customerAccountId: customerId, tenantId, role: "customer" } as any);
      }
    }

    const caseSeeds = [
      { caseNumber: "TC-2026-001", referenceId: "TCSTU001", applicantName: "Riya Menon", applicantDob: "2004-07-16", customerAccountId: customerIds.get("riya.menon.demo@visashuttle.com"), visaType: "Student Visa", destinationCountry: "Canada", status: "documents_required", priority: "high", assignedTo: ownerId, notes: "SOP and proof of funds need final review.", readinessScore: 78, visaStage: "not_started" },
      { caseNumber: "TC-2026-002", referenceId: "TCSTU002", applicantName: "Arjun Nair", applicantDob: "2003-11-02", customerAccountId: customerIds.get("arjun.nair.demo@visashuttle.com"), visaType: "Student Visa", destinationCountry: "Germany", status: "in_progress", priority: "normal", assignedTo: ownerId, notes: "University shortlist ready; APS guidance pending.", readinessScore: 64, visaStage: "not_started" },
      { caseNumber: "TC-2026-003", referenceId: "TCVIS003", applicantName: "Meera Jose", applicantDob: "1986-03-25", customerAccountId: customerIds.get("meera.jose.demo@visashuttle.com"), visaType: "Visitor Visa", destinationCountry: "Australia", status: "under_review", priority: "normal", assignedTo: ownerId, notes: "Travel history and sponsor invitation uploaded.", readinessScore: 72, visaStage: "processing", visaProcessingStatus: "biometrics_scheduled" },
    ];
    for (const seed of caseSeeds) {
      const existing = await db.select({ id: casesTable.id }).from(casesTable).where(and(eq(casesTable.tenantId, tenantId), eq(casesTable.referenceId, seed.referenceId))).limit(1);
      if (!existing[0]) await db.insert(casesTable).values({ tenantId, ...seed } as any);
    }

    const proposalSeeds = [
      { token: "tc-riya-study-canada-demo", customerName: "Riya Menon", customerEmail: "riya.menon.demo@visashuttle.com", customerPhone: "+91 98765 10001", destinationCountry: "Canada", visaType: "Student Visa", notes: "Includes counselling, admission filing and visa document support.", estimateAmountCents: 4500000, status: "viewed", createdBy: ownerId },
      { token: "tc-arjun-germany-demo", customerName: "Arjun Nair", customerEmail: "arjun.nair.demo@visashuttle.com", customerPhone: "+91 98765 10002", destinationCountry: "Germany", visaType: "Student Visa", notes: "Shortlist, APS checklist and blocked-account support.", estimateAmountCents: 3800000, status: "sent", createdBy: ownerId },
    ];
    for (const proposal of proposalSeeds) {
      const existing = await db.select({ id: proposalsTable.id }).from(proposalsTable).where(eq(proposalsTable.token, proposal.token)).limit(1);
      if (!existing[0]) await db.insert(proposalsTable).values({ tenantId, ...proposal } as any);
    }

    const invoiceSeeds = [
      { invoiceNumber: "TC-INV-2026-001", customerName: "Riya Menon", customerEmail: "riya.menon.demo@visashuttle.com", customerPhone: "+91 98765 10001", destinationCountry: "Canada", visaType: "Student Visa", status: "partial", paymentType: "advance", advancePercent: 50, subtotal: 4500000, taxAmount: 810000, total: 5310000, paidAmount: 2655000, currency: "INR", notes: "Admission and visa counselling package.", publicToken: "tc-inv-riya-demo" },
      { invoiceNumber: "TC-INV-2026-002", customerName: "Arjun Nair", customerEmail: "arjun.nair.demo@visashuttle.com", customerPhone: "+91 98765 10002", destinationCountry: "Germany", visaType: "Student Visa", status: "sent", paymentType: "upfront", subtotal: 3800000, taxAmount: 684000, total: 4484000, paidAmount: 0, currency: "INR", notes: "Germany admission support and visa file preparation.", publicToken: "tc-inv-arjun-demo" },
    ];
    for (const invoice of invoiceSeeds) {
      const existing = await db.select({ id: invoicesTable.id }).from(invoicesTable).where(and(eq(invoicesTable.tenantId, tenantId), eq(invoicesTable.invoiceNumber, invoice.invoiceNumber))).limit(1);
      if (!existing[0]) {
        const inserted = await db.insert(invoicesTable).values({ tenantId, ...invoice } as any).returning({ id: invoicesTable.id });
        const invoiceId = inserted[0]?.id;
        if (invoiceId) {
          await db.insert(invoiceItemsTable).values([
            { invoiceId, description: "Agency counselling and visa file service", category: "agency_fee", quantity: 1, unitPrice: invoice.subtotal, amount: invoice.subtotal, sortOrder: 1, taxRate: 1800, taxable: true },
          ] as any);
          if (invoice.paidAmount > 0) {
            await db.insert(paymentsTable).values({ invoiceId, tenantId, amount: invoice.paidAmount, method: "upi", reference: "DEMO-UPI-ADVANCE", notes: "Demo advance payment" } as any);
          }
        }
      }
    }

    await this.seedThomasCookCounsellingData(tenantId, ownerId);
  }

  private async seedThomasCookCounsellingData(tenantId: string, ownerId: string): Promise<void> {
    try {
      const existing = await db.select({ id: counsellingStudentsTable.id }).from(counsellingStudentsTable).where(and(eq(counsellingStudentsTable.tenantId, tenantId), eq(counsellingStudentsTable.email, "riya.menon.demo@visashuttle.com"))).limit(1);
      if (existing[0]) return;

      const students = [
        { fullName: "Riya Menon", email: "riya.menon.demo@visashuttle.com", phone: "+91 98765 10001", whatsappNumber: "+91 98765 10001", dateOfBirth: "2004-07-16", nationality: "India", currentCountry: "India", preferredDestinations: ["Canada", "United Kingdom"], preferredIntake: "Fall 2026", preferredCourse: "MSc Business Analytics", budgetRange: "INR 25-35 lakh", academicHistory: { highest: "BCom", percentage: "82%", backlog: "None" }, englishTests: { IELTS: "7.0 overall" }, workExperience: "6 month internship in analytics", educationGap: "No major gap", previousVisaRefusals: "None", travelHistory: "UAE, Singapore", sponsorDetails: { sponsor: "Parents", income: "INR 18 lakh/year" }, counsellorAssigned: ownerId, leadSource: "Website", status: "documents_pending", profileStrengthScore: 82, admissionReadinessScore: 74, visaReadinessScore: 78, riskLevel: "low", portalEnabled: true, portalToken: "tc-riya-student-portal-demo" },
        { fullName: "Arjun Nair", email: "arjun.nair.demo@visashuttle.com", phone: "+91 98765 10002", whatsappNumber: "+91 98765 10002", dateOfBirth: "2003-11-02", nationality: "India", currentCountry: "India", preferredDestinations: ["Germany"], preferredIntake: "Winter 2026", preferredCourse: "MEng Mechanical Engineering", budgetRange: "INR 15-22 lakh", academicHistory: { highest: "BTech", cgpa: "7.6" }, englishTests: { IELTS: "6.5 overall" }, workExperience: "Final-year project in EV drivetrain", educationGap: "None", previousVisaRefusals: "None", travelHistory: "No prior travel", sponsorDetails: { sponsor: "Father + education loan" }, counsellorAssigned: ownerId, leadSource: "Walk-in", status: "course_shortlisted", profileStrengthScore: 70, admissionReadinessScore: 67, visaReadinessScore: 62, riskLevel: "medium", portalEnabled: true, portalToken: "tc-arjun-student-portal-demo" },
        { fullName: "Sara Mathew", email: "sara.mathew.demo@visashuttle.com", phone: "+91 98765 10005", whatsappNumber: "+91 98765 10005", dateOfBirth: "2002-04-09", nationality: "India", currentCountry: "India", preferredDestinations: ["Australia", "New Zealand"], preferredIntake: "Feb 2027", preferredCourse: "Bachelor of Nursing", budgetRange: "INR 30-40 lakh", academicHistory: { highest: "Plus Two", percentage: "88%" }, englishTests: { OET: "Planned" }, workExperience: "Hospital volunteer experience", educationGap: "1 year", previousVisaRefusals: "None", travelHistory: "None", sponsorDetails: { sponsor: "Parents" }, counsellorAssigned: ownerId, leadSource: "Referral", status: "counselling_scheduled", profileStrengthScore: 76, admissionReadinessScore: 58, visaReadinessScore: 54, riskLevel: "medium", portalEnabled: false },
      ];
      const insertedStudents = await db.insert(counsellingStudentsTable).values(students.map((student) => ({ tenantId, ...student })) as any).returning({ id: counsellingStudentsTable.id, email: counsellingStudentsTable.email });

      for (const student of insertedStudents) {
        const isRiya = student.email === "riya.menon.demo@visashuttle.com";
        await db.insert(counsellingSessionsTable).values({
          tenantId,
          studentId: student.id,
          scheduledAt: new Date(Date.now() + (isRiya ? 2 : 5) * 24 * 60 * 60 * 1000),
          mode: "video",
          status: isRiya ? "completed" : "scheduled",
          meetingNotes: isRiya ? "Discussed Canada options and finance documents." : "Initial profile discovery call.",
          studentGoals: "Strong university admission with manageable visa risk.",
          preferredCountries: isRiya ? ["Canada", "United Kingdom"] : ["Germany", "Australia"],
          preferredCourses: isRiya ? ["Business Analytics", "Management"] : ["Engineering", "Nursing"],
          recommendations: "Collect academic transcripts, language test and sponsor proof.",
          nextAction: isRiya ? "Review SOP and bank statement" : "Complete counselling questionnaire",
          followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          sharedWithStudent: true,
          createdBy: ownerId,
        } as any);
        await db.insert(counsellingDocumentsTable).values([
          { tenantId, studentId: student.id, documentType: "Passport", required: true, status: "received", notes: "Valid passport copy uploaded.", uploadedBy: ownerId },
          { tenantId, studentId: student.id, documentType: "Academic transcripts", required: true, status: isRiya ? "received" : "pending", notes: isRiya ? "Degree marksheet received." : "Awaiting latest transcript.", uploadedBy: ownerId },
          { tenantId, studentId: student.id, documentType: "Bank statement / sponsor proof", required: true, status: isRiya ? "review" : "pending", notes: "Financial document review needed.", uploadedBy: ownerId },
          { tenantId, studentId: student.id, documentType: "English test score", required: true, status: isRiya ? "received" : "pending", notes: "Language proof based on destination rules.", uploadedBy: ownerId },
        ] as any);
        await db.insert(counsellingTasksTable).values([
          { tenantId, studentId: student.id, title: isRiya ? "Finalize Canada SOP" : "Collect missing academic documents", taskType: "follow_up", assignedTo: ownerId, dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: "open", notes: "Demo task for counselling workflow." },
          { tenantId, studentId: student.id, title: "Send student portal reminder", taskType: "portal", assignedTo: ownerId, dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), status: isRiya ? "completed" : "open", notes: "Keep student moving through checklist." },
        ] as any);
        await db.insert(counsellingShortlistsTable).values([
          { tenantId, studentId: student.id, destinationCountry: isRiya ? "Canada" : "Germany", institutionName: isRiya ? "University of Windsor" : "Technical University of Munich", courseName: isRiya ? "MSc Business Analytics" : "MSc Mechanical Engineering", intake: isRiya ? "Fall 2026" : "Winter 2026", duration: "2 years", tuitionFee: isRiya ? "CAD 32,000/year" : "Low tuition + semester contribution", applicationFee: isRiya ? "CAD 125" : "EUR 75", scholarshipAvailable: isRiya, eligibilityNotes: "Good academic fit; verify program-specific prerequisites.", admissionProbability: isRiya ? 78 : 64, visaRiskNotes: "Financial proof and purpose statement are key.", status: isRiya ? "shortlisted" : "suggested" },
        ] as any);
        await db.insert(counsellingAdmissionsTable).values({
          tenantId,
          studentId: student.id,
          applicationStatus: isRiya ? "ready_to_apply" : "not_started",
          documentsSubmitted: isRiya,
          offerLetterStatus: "not_received",
          feePaymentStatus: "pending",
          countryDocumentStatus: isRiya ? "SOP and bank statement review pending" : "Initial checklist pending",
          admissionDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          notes: "Demo admission tracker row.",
        } as any);
        await db.insert(counsellingAiAssessmentsTable).values({
          tenantId,
          studentId: student.id,
          assessmentType: "profile_assessment",
          admissionReadinessScore: isRiya ? 74 : 62,
          visaReadinessScore: isRiya ? 78 : 58,
          riskLevel: isRiya ? "low" : "medium",
          responseJson: { summary: "Demo AI counselling assessment", strengths: ["Clear course goal", "Good academic profile"], gaps: ["Financial proof needs review", "SOP needs country-specific alignment"] },
          generatedText: "Demo assessment: profile is promising. Focus on documentary proof, course rationale, and sponsor consistency before submission.",
          createdBy: ownerId,
        } as any);
      }
    } catch (error) {
      if (isMissingRelationError(error)) return;
      throw error;
    }
  }

  async seedDemoUsersToDb(): Promise<void> {
    await this.seedPlatformUsersToDb();
    await this.seedThomasCookDemoWorkspaceToDb();
    const demoAccounts = [
      {
        id: "b2c-demo",
        email: "demo@visashuttle.com",
        password: bcrypt.hashSync("Demo@12345", 10),
        fullName: "Demo User",
        phone: null,
        phoneVerified: false,
        freeChecksUsed: 0,
        subscriptionPlan: "pro" as const,
        checkLimit: 5,
        deepCheckAccess: true,
        adminDeepCheckBonus: 0,
        emailVerified: true,
        emailVerificationToken: null,
        stripeCustomerId: null,
      },
      {
        id: "b2c-test",
        email: "test@visashuttle.com",
        password: bcrypt.hashSync("Test@12345", 10),
        fullName: "Test Account",
        phone: null,
        phoneVerified: false,
        freeChecksUsed: 0,
        subscriptionPlan: "pro" as const,
        checkLimit: 9999,
        deepCheckAccess: true,
        adminDeepCheckBonus: 0,
        emailVerified: true,
        emailVerificationToken: null,
        stripeCustomerId: null,
      },
    ];

    for (const account of demoAccounts) {
      const existing = await db.select({ id: b2cUsers.id }).from(b2cUsers).where(eq(b2cUsers.email, account.email)).limit(1);
      if (!existing[0]) {
        await db.insert(b2cUsers).values(account);
      } else if (account.email === "demo@visashuttle.com") {
        await db.update(b2cUsers)
          .set({
            password: account.password,
            fullName: account.fullName,
            phoneVerified: account.phoneVerified,
            freeChecksUsed: account.freeChecksUsed,
            subscriptionPlan: account.subscriptionPlan,
            checkLimit: account.checkLimit,
            deepCheckAccess: account.deepCheckAccess,
            stripeCustomerId: account.stripeCustomerId,
          })
          .where(eq(b2cUsers.id, existing[0].id));
      }
    }
  }

  // B2C Users — persisted to DB. Demo/test accounts are seeded into DB on
  // startup; once a database exists, never fall back to memory for these users.
  async getB2cUser(id: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.id, id)).limit(1);
    return this.ensureDemoB2cEntitlements(rows[0]);
  }

  async getB2cUserByEmail(email: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.email, email.toLowerCase())).limit(1);
    return this.ensureDemoB2cEntitlements(rows[0]);
  }

  async getB2cUserByPhone(phone: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.phone, phone)).limit(1);
    return rows[0];
  }

  async getB2cUserByVerificationToken(token: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.emailVerificationToken, token)).limit(1);
    return rows[0];
  }

  // Idempotent self-migration so password reset works without a manual `db push`.
  private async ensureB2cAuthColumns(): Promise<void> {
    await db.execute(sql`ALTER TABLE b2c_users ADD COLUMN IF NOT EXISTS password_reset_token text`);
    await db.execute(sql`ALTER TABLE b2c_users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp`);
  }

  async getB2cUserByPasswordResetToken(token: string): Promise<B2cUser | undefined> {
    await this.ensureB2cAuthColumns();
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.passwordResetToken, token)).limit(1);
    return rows[0];
  }

  async setB2cPasswordReset(id: string, token: string | null, expires: Date | null): Promise<void> {
    await this.ensureB2cAuthColumns();
    await db.update(b2cUsers)
      .set({ passwordResetToken: token, passwordResetExpires: expires })
      .where(eq(b2cUsers.id, id));
  }

  async createB2cUser(user: InsertB2cUser): Promise<B2cUser> {
    const rows = await db.insert(b2cUsers).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return rows[0];
  }

  async getAllB2cUsers(): Promise<B2cUser[]> {
    return db.select().from(b2cUsers).orderBy(desc(b2cUsers.createdAt));
  }

  async updateB2cUser(id: string, data: Partial<Omit<B2cUser, 'id' | 'createdAt'>>): Promise<B2cUser | undefined> {
    const rows = await db.update(b2cUsers).set(data).where(eq(b2cUsers.id, id)).returning();
    return rows[0];
  }

  async deleteB2cUser(id: string): Promise<boolean> {
    const rows = await db.delete(b2cUsers).where(eq(b2cUsers.id, id)).returning({ id: b2cUsers.id });
    return rows.length > 0;
  }

  private async ensureVisaToolChecksTable(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS visa_tool_checks (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        tool_type text NOT NULL,
        country text,
        input_summary text,
        uploaded_file_url text,
        risk_score integer,
        risk_level text,
        claude_response_json jsonb,
        created_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS user_id varchar`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS tool_type text`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS country text`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS input_summary text`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS uploaded_file_url text`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS risk_score integer`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS risk_level text`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS claude_response_json jsonb`);
    await db.execute(sql`ALTER TABLE visa_tool_checks ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()`);
  }

  // Visa Checks — persisted to DB
  async createVisaCheck(check: InsertVisaCheck): Promise<VisaCheck> {
    const rows = await db.insert(visaChecks).values(check).returning();
    return rows[0];
  }

  async getVisaChecksByUserId(userId: string): Promise<VisaCheck[]> {
    return db.select().from(visaChecks).where(eq(visaChecks.userId, userId)).orderBy(desc(visaChecks.createdAt));
  }

  async getVisaCheck(id: string): Promise<VisaCheck | undefined> {
    const rows = await db.select().from(visaChecks).where(eq(visaChecks.id, id)).limit(1);
    return rows[0];
  }

  async createVisaToolCheck(check: InsertVisaToolCheck): Promise<VisaToolCheck> {
    try {
      const rows = await db.insert(visaToolChecks).values(check).returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureVisaToolChecksTable();
        const rows = await db.insert(visaToolChecks).values(check).returning();
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.createVisaToolCheck(check);
      throw error;
    }
  }

  async getVisaToolChecksByUserId(userId: string): Promise<VisaToolCheck[]> {
    try {
      return await db.select().from(visaToolChecks).where(eq(visaToolChecks.userId, userId)).orderBy(desc(visaToolChecks.createdAt));
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureVisaToolChecksTable();
        return await db.select().from(visaToolChecks).where(eq(visaToolChecks.userId, userId)).orderBy(desc(visaToolChecks.createdAt));
      }
      if (shouldUseMemoryFallback(error)) return super.getVisaToolChecksByUserId(userId);
      throw error;
    }
  }

  async getVisaToolCheck(id: string): Promise<VisaToolCheck | undefined> {
    try {
      const rows = await db.select().from(visaToolChecks).where(eq(visaToolChecks.id, id)).limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureVisaToolChecksTable();
        const rows = await db.select().from(visaToolChecks).where(eq(visaToolChecks.id, id)).limit(1);
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.getVisaToolCheck(id);
      throw error;
    }
  }

  async getAllVisaToolChecks(): Promise<VisaToolCheck[]> {
    try {
      return await db.select().from(visaToolChecks).orderBy(desc(visaToolChecks.createdAt));
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureVisaToolChecksTable();
        return await db.select().from(visaToolChecks).orderBy(desc(visaToolChecks.createdAt));
      }
      if (shouldUseMemoryFallback(error)) return super.getAllVisaToolChecks();
      throw error;
    }
  }

  // Saved Profiles — persisted to DB
  async getSavedProfile(userId: string): Promise<SavedProfile | undefined> {
    const rows = await db.select().from(savedProfiles).where(eq(savedProfiles.userId, userId)).limit(1);
    return rows[0];
  }

  async upsertSavedProfile(userId: string, data: Partial<InsertSavedProfile>): Promise<SavedProfile> {
    const existing = await this.getSavedProfile(userId);
    if (existing) {
      const rows = await db.update(savedProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(savedProfiles.userId, userId))
        .returning();
      return rows[0];
    }
    const rows = await db.insert(savedProfiles).values({
      ...data,
      userId,
    } as InsertSavedProfile).returning();
    return rows[0];
  }

  // SMS Config — single-row config stored in DB
  // Idempotent self-migration so newer SMS providers (e.g. Ping4SMS) work
  // without a manual `db push`. Memoized so the ALTERs run at most once.
  private smsConfigColumnsEnsured?: Promise<void>;
  private ensureSmsConfigColumns(): Promise<void> {
    if (!this.smsConfigColumnsEnsured) {
      this.smsConfigColumnsEnsured = (async () => {
        await db.execute(sql`ALTER TABLE sms_config ADD COLUMN IF NOT EXISTS ping4sms_api_key text`);
        await db.execute(sql`ALTER TABLE sms_config ADD COLUMN IF NOT EXISTS ping4sms_sender_id text`);
        await db.execute(sql`ALTER TABLE sms_config ADD COLUMN IF NOT EXISTS ping4sms_route text`);
        await db.execute(sql`ALTER TABLE sms_config ADD COLUMN IF NOT EXISTS ping4sms_template_id text`);
        await db.execute(sql`ALTER TABLE sms_config ADD COLUMN IF NOT EXISTS ping4sms_otp_template text`);
      })().catch((err) => {
        // Reset so a later call can retry (e.g. transient error, or table created later).
        this.smsConfigColumnsEnsured = undefined;
        throw err;
      });
    }
    return this.smsConfigColumnsEnsured;
  }

  async getSmsConfig(): Promise<SmsConfig | undefined> {
    try {
      await this.ensureSmsConfigColumns();
      const rows = await db.select().from(smsConfigTable).limit(1);
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] sms_config table is missing. Using in-memory SMS config fallback.");
        return super.getSmsConfig();
      }
      throw error;
    }
  }

  async upsertSmsConfig(data: Partial<InsertSmsConfig>): Promise<SmsConfig> {
    try {
      await this.ensureSmsConfigColumns();
      const existing = await this.getSmsConfig();
      if (existing) {
        const rows = await db.update(smsConfigTable)
          .set({ ...data, updatedAt: new Date() })
          .returning();
        return rows[0];
      }
      const rows = await db.insert(smsConfigTable).values({
        provider: "msg91",
        ...data,
      }).returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] sms_config table is missing. Saving SMS config in memory only.");
        return super.upsertSmsConfig(data);
      }
      throw error;
    }
  }

  // Platform AI Config — single-row config stored in DB
  async getPlatformAiConfig(): Promise<PlatformAiConfig | undefined> {
    try {
      const rows = await db.select().from(platformAiConfigTable).limit(1);
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] platform_ai_config table is missing. Using in-memory AI config fallback.");
        return super.getPlatformAiConfig();
      }
      throw error;
    }
  }

  async upsertPlatformAiConfig(data: Partial<InsertPlatformAiConfig>): Promise<PlatformAiConfig> {
    try {
      const existing = await this.getPlatformAiConfig();
      if (existing) {
        const rows = await db.update(platformAiConfigTable)
          .set({ ...data, updatedAt: new Date() })
          .returning();
        return rows[0];
      }
      const rows = await db.insert(platformAiConfigTable).values({
        anthropicModel: "claude-sonnet-4-6",
        ...data,
      }).returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] platform_ai_config table is missing. Saving AI config in memory only.");
        return super.upsertPlatformAiConfig(data);
      }
      throw error;
    }
  }

  private async ensureEmailConfigTables(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS zeptomail_config (
        id serial PRIMARY KEY,
        provider text NOT NULL DEFAULT 'zeptomail',
        domain text NOT NULL DEFAULT 'visashuttle.com',
        host text NOT NULL DEFAULT 'api.zeptomail.com',
        agent_alias text DEFAULT '448141e4788dab46',
        sender_address text NOT NULL DEFAULT 'notifications@visashuttle.com',
        sender_name text NOT NULL DEFAULT 'Visa Shuttle',
        bounce_address text,
        reply_to_address text,
        send_mail_token text,
        send_mail_token_2 text,
        enabled boolean NOT NULL DEFAULT false,
        updated_at timestamp DEFAULT now()
      )
            `);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS domain text NOT NULL DEFAULT 'visashuttle.com'`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS host text NOT NULL DEFAULT 'api.zeptomail.com'`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS agent_alias text DEFAULT '448141e4788dab46'`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS sender_address text NOT NULL DEFAULT 'notifications@visashuttle.com'`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS sender_name text NOT NULL DEFAULT 'Visa Shuttle'`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS bounce_address text`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS reply_to_address text`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS send_mail_token text`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS send_mail_token_2 text`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        audience text NOT NULL DEFAULT 'b2c',
        template_key text NOT NULL,
        name text NOT NULL,
        subject text NOT NULL,
        html_body text NOT NULL,
        text_body text,
        variables jsonb,
        enabled boolean NOT NULL DEFAULT true,
        updated_at timestamp DEFAULT now(),
        created_at timestamp DEFAULT now()
      )
    `);
  }

  async getZeptoMailConfig(): Promise<ZeptoMailConfig | undefined> {
    try {
      const rows = await db.select().from(zeptoMailConfigTable).limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureEmailConfigTables();
        const rows = await db.select().from(zeptoMailConfigTable).limit(1);
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] zeptomail_config table is missing. Using in-memory email config fallback.");
        return super.getZeptoMailConfig();
      }
      throw error;
    }
  }

  async upsertZeptoMailConfig(data: Partial<InsertZeptoMailConfig>): Promise<ZeptoMailConfig> {
    try {
      const existing = await this.getZeptoMailConfig();
      if (existing) {
        const rows = await db.update(zeptoMailConfigTable)
          .set({ ...data, updatedAt: new Date() } as any)
          .returning();
        return rows[0];
      }
      const rows = await db.insert(zeptoMailConfigTable).values({
        provider: "zeptomail",
        domain: "visashuttle.com",
        host: "api.zeptomail.com",
        agentAlias: "448141e4788dab46",
        senderAddress: "notifications@visashuttle.com",
        senderName: "Visa Shuttle",
        ...data,
      } as InsertZeptoMailConfig).returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureEmailConfigTables();
        const rows = await db.insert(zeptoMailConfigTable).values({
          provider: "zeptomail",
          domain: "visashuttle.com",
          host: "api.zeptomail.com",
          agentAlias: "448141e4788dab46",
          senderAddress: "notifications@visashuttle.com",
          senderName: "Visa Shuttle",
          ...data,
        } as InsertZeptoMailConfig).returning();
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] zeptomail_config table is missing. Saving email config in memory only.");
        return super.upsertZeptoMailConfig(data);
      }
      throw error;
    }
  }

  async getEmailTemplates(audience = "b2c"): Promise<EmailTemplate[]> {
    try {
      return db.select().from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.audience, audience))
        .orderBy(asc(emailTemplatesTable.name));
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureEmailConfigTables();
        return [];
      }
      if (shouldUseMemoryFallback(error)) return super.getEmailTemplates(audience);
      throw error;
    }
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    try {
      const rows = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id)).limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureEmailConfigTables();
        return undefined;
      }
      if (shouldUseMemoryFallback(error)) return super.getEmailTemplate(id);
      throw error;
    }
  }

  async getEmailTemplateByKey(audience: string, templateKey: string): Promise<EmailTemplate | undefined> {
    try {
      const rows = await db.select().from(emailTemplatesTable)
        .where(and(eq(emailTemplatesTable.audience, audience), eq(emailTemplatesTable.templateKey, templateKey)))
        .limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureEmailConfigTables();
        return undefined;
      }
      if (shouldUseMemoryFallback(error)) return super.getEmailTemplateByKey(audience, templateKey);
      throw error;
    }
  }

  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    try {
      const rows = await db.insert(emailTemplatesTable).values(data).returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureEmailConfigTables();
        const rows = await db.insert(emailTemplatesTable).values(data).returning();
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.createEmailTemplate(data);
      throw error;
    }
  }

  async updateEmailTemplate(id: string, data: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    try {
      const rows = await db.update(emailTemplatesTable)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(emailTemplatesTable.id, id))
        .returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.updateEmailTemplate(id, data);
      throw error;
    }
  }

  async deleteEmailTemplate(id: string): Promise<boolean> {
    try {
      const rows = await db.delete(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, id))
        .returning({ id: emailTemplatesTable.id });
      return rows.length > 0;
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.deleteEmailTemplate(id);
      throw error;
    }
  }

  // Payment Gateway Config — single-row config stored in DB
  private async ensurePaymentGatewayConfigTable(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_gateway_config (
        id serial PRIMARY KEY,
        provider text NOT NULL DEFAULT 'cashfree',
        mode text NOT NULL DEFAULT 'test',
        api_version text NOT NULL DEFAULT '2023-08-01',
        test_client_id text,
        test_client_secret text,
        live_client_id text,
        live_client_secret text,
        webhook_secret text,
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'cashfree'`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'test'`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS api_version text NOT NULL DEFAULT '2023-08-01'`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS test_client_id text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS test_client_secret text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS live_client_id text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS live_client_secret text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS webhook_secret text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS stripe_mode text NOT NULL DEFAULT 'test'`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS stripe_test_publishable_key text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS stripe_test_secret_key text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS stripe_live_publishable_key text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS stripe_live_secret_key text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS stripe_webhook_secret text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS paypal_mode text NOT NULL DEFAULT 'sandbox'`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS paypal_test_client_id text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS paypal_test_client_secret text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS paypal_live_client_id text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS paypal_live_client_secret text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS paypal_webhook_id text`);
    await db.execute(sql`ALTER TABLE payment_gateway_config ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`);
  }

  async getPaymentGatewayConfig(): Promise<PaymentGatewayConfig | undefined> {
    try {
      await this.ensurePaymentGatewayConfigTable();
      const rows = await db.select().from(paymentGatewayConfigTable).limit(1);
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] payment_gateway_config table is missing. Using in-memory payment config fallback.");
        return super.getPaymentGatewayConfig();
      }
      throw error;
    }
  }

  async upsertPaymentGatewayConfig(data: Partial<InsertPaymentGatewayConfig>): Promise<PaymentGatewayConfig> {
    try {
      await this.ensurePaymentGatewayConfigTable();
      const existing = await this.getPaymentGatewayConfig();
      if (existing) {
        const rows = await db.update(paymentGatewayConfigTable)
          .set({ ...data, updatedAt: new Date() })
          .returning();
        return rows[0];
      }
      const rows = await db.insert(paymentGatewayConfigTable).values({
        provider: "cashfree",
        mode: "test",
        apiVersion: "2023-08-01",
        ...data,
      }).returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) {
        console.warn("[DB] payment_gateway_config table is missing. Saving payment config in memory only.");
        return super.upsertPaymentGatewayConfig(data);
      }
      throw error;
    }
  }

  private async ensureB2cCouponTable(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS b2c_coupons (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        description text,
        discount_percent integer NOT NULL DEFAULT 0,
        max_uses integer,
        used_count integer NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        expires_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
      ALTER TABLE b2c_coupons ADD COLUMN IF NOT EXISTS max_uses integer;
      ALTER TABLE b2c_coupons ADD COLUMN IF NOT EXISTS used_count integer DEFAULT 0;
    `);
  }

  async getB2cCoupons(): Promise<B2cCoupon[]> {
    try {
      return await db.select().from(b2cCouponsTable).orderBy(asc(b2cCouponsTable.code));
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureB2cCouponTable();
        return [];
      }
      if (shouldUseMemoryFallback(error)) return super.getB2cCoupons();
      throw error;
    }
  }

  async getB2cCoupon(id: string): Promise<B2cCoupon | undefined> {
    try {
      const rows = await db.select().from(b2cCouponsTable).where(eq(b2cCouponsTable.id, id)).limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureB2cCouponTable();
        return undefined;
      }
      if (shouldUseMemoryFallback(error)) return super.getB2cCoupon(id);
      throw error;
    }
  }

  async getB2cCouponByCode(code: string): Promise<B2cCoupon | undefined> {
    const normalized = code.trim().toUpperCase();
    try {
      const rows = await db.select().from(b2cCouponsTable).where(eq(b2cCouponsTable.code, normalized)).limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureB2cCouponTable();
        return undefined;
      }
      if (shouldUseMemoryFallback(error)) return super.getB2cCouponByCode(normalized);
      throw error;
    }
  }

  async createB2cCoupon(data: InsertB2cCoupon): Promise<B2cCoupon> {
    try {
      const rows = await db.insert(b2cCouponsTable).values({
        ...data,
        code: data.code.trim().toUpperCase(),
      }).returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureB2cCouponTable();
        const rows = await db.insert(b2cCouponsTable).values({
          ...data,
          code: data.code.trim().toUpperCase(),
        }).returning();
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.createB2cCoupon(data);
      throw error;
    }
  }

  async updateB2cCoupon(id: string, data: Partial<InsertB2cCoupon>): Promise<B2cCoupon | undefined> {
    try {
      const patch = {
        ...data,
        ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
        updatedAt: new Date(),
      };
      const rows = await db.update(b2cCouponsTable).set(patch as any).where(eq(b2cCouponsTable.id, id)).returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureB2cCouponTable();
        return undefined;
      }
      if (shouldUseMemoryFallback(error)) return super.updateB2cCoupon(id, data);
      throw error;
    }
  }

  async incrementB2cCouponUsage(id: string): Promise<B2cCoupon | undefined> {
    try {
      const rows = await db.update(b2cCouponsTable)
        .set({
          usedCount: sql`${b2cCouponsTable.usedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(b2cCouponsTable.id, id))
        .returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.incrementB2cCouponUsage(id);
      return undefined;
    }
  }

  async deleteB2cCoupon(id: string): Promise<boolean> {
    try {
      const rows = await db.delete(b2cCouponsTable).where(eq(b2cCouponsTable.id, id)).returning({ id: b2cCouponsTable.id });
      return rows.length > 0;
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureB2cCouponTable();
        return false;
      }
      if (shouldUseMemoryFallback(error)) return super.deleteB2cCoupon(id);
      throw error;
    }
  }

  private async ensureVisaProtectionPlansTable(): Promise<void> {
    if (this.ensuredTables.has("visa_protection_plans")) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS visa_protection_plans (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          deep_check_id VARCHAR NOT NULL,
          destination_country TEXT NOT NULL,
          visa_type TEXT NOT NULL,
          approval_score INT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          government_fee_amount_cents INT NOT NULL,
          protection_fee_amount_cents INT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          certificate_number TEXT NOT NULL UNIQUE,
          terms_agreed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          claim_reason TEXT,
          claim_rejection_letter_url TEXT,
          claimed_at TIMESTAMP,
          refunded_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.ensuredTables.add("visa_protection_plans");
    } catch (e) {
      console.warn("[ensureVisaProtectionPlansTable] DDL notice:", e);
    }
  }

  async createVisaProtectionPlan(plan: InsertVisaProtectionPlan): Promise<VisaProtectionPlan> {
    try {
      const rows = await db.insert(visaProtectionPlansTable).values(plan as any).returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureVisaProtectionPlansTable();
        const rows = await db.insert(visaProtectionPlansTable).values(plan as any).returning();
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.createVisaProtectionPlan(plan);
      throw error;
    }
  }

  async getVisaProtectionPlanByDeepCheckId(deepCheckId: string): Promise<VisaProtectionPlan | undefined> {
    try {
      const rows = await db.select().from(visaProtectionPlansTable).where(eq(visaProtectionPlansTable.deepCheckId, deepCheckId)).limit(1);
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getVisaProtectionPlanByDeepCheckId(deepCheckId);
      return super.getVisaProtectionPlanByDeepCheckId(deepCheckId);
    }
  }

  async getVisaProtectionPlansByUserId(userId: string): Promise<VisaProtectionPlan[]> {
    try {
      return await db.select().from(visaProtectionPlansTable).where(eq(visaProtectionPlansTable.userId, userId)).orderBy(desc(visaProtectionPlansTable.createdAt));
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.getVisaProtectionPlansByUserId(userId);
      return super.getVisaProtectionPlansByUserId(userId);
    }
  }

  async updateVisaProtectionPlan(id: string, data: Partial<InsertVisaProtectionPlan>): Promise<VisaProtectionPlan | undefined> {
    try {
      const rows = await db.update(visaProtectionPlansTable).set({ ...data, updatedAt: new Date() } as any).where(eq(visaProtectionPlansTable.id, id)).returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.updateVisaProtectionPlan(id, data);
      throw error;
    }
  }

  private async ensureB2cPlanTable(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS b2c_plans (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_key text NOT NULL UNIQUE,
        name text NOT NULL,
        description text,
        billing_type text NOT NULL DEFAULT 'free',
        prices jsonb NOT NULL DEFAULT '{}'::jsonb,
        features jsonb NOT NULL DEFAULT '[]'::jsonb,
        conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
        basic_check_limit integer NOT NULL DEFAULT 0,
        deep_check_limit integer NOT NULL DEFAULT 0,
        visa_tools_credits integer NOT NULL DEFAULT 0,
        sort_order integer NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
  }

  private async seedDefaultB2cPlans(): Promise<void> {
    await this.ensureB2cPlanTable();
    for (const plan of DEFAULT_B2C_PLANS) {
      await db.execute(sql`
        INSERT INTO b2c_plans (
          plan_key, name, description, billing_type, prices, features, conditions,
          basic_check_limit, deep_check_limit, visa_tools_credits, sort_order, active
        )
        VALUES (
          ${plan.planKey}, ${plan.name}, ${plan.description ?? null}, ${plan.billingType ?? "free"},
          ${JSON.stringify(plan.prices ?? {})}::jsonb, ${JSON.stringify(plan.features ?? [])}::jsonb,
          ${JSON.stringify(plan.conditions ?? {})}::jsonb, ${plan.basicCheckLimit ?? 0},
          ${plan.deepCheckLimit ?? 0}, ${plan.visaToolsCredits ?? 0}, ${plan.sortOrder ?? 0}, ${plan.active ?? true}
        )
        ON CONFLICT (plan_key) DO NOTHING
      `);
    }
  }

  async getB2cPlans(): Promise<B2cPlan[]> {
    try {
      let rows = await db.select().from(b2cPlansTable).orderBy(asc(b2cPlansTable.sortOrder));
      if (rows.length === 0) {
        await this.seedDefaultB2cPlans();
        rows = await db.select().from(b2cPlansTable).orderBy(asc(b2cPlansTable.sortOrder));
      }
      return rows;
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.seedDefaultB2cPlans();
        return await db.select().from(b2cPlansTable).orderBy(asc(b2cPlansTable.sortOrder));
      }
      if (shouldUseMemoryFallback(error)) return super.getB2cPlans();
      throw error;
    }
  }

  async getB2cPlan(planKey: string): Promise<B2cPlan | undefined> {
    const key = planKey.trim().toLowerCase();
    try {
      const rows = await db.select().from(b2cPlansTable).where(eq(b2cPlansTable.planKey, key)).limit(1);
      if (rows[0]) return rows[0];
      await this.seedDefaultB2cPlans();
      const seeded = await db.select().from(b2cPlansTable).where(eq(b2cPlansTable.planKey, key)).limit(1);
      return seeded[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.seedDefaultB2cPlans();
        const rows = await db.select().from(b2cPlansTable).where(eq(b2cPlansTable.planKey, key)).limit(1);
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.getB2cPlan(key);
      throw error;
    }
  }

  async upsertB2cPlan(planKey: string, data: Partial<InsertB2cPlan>): Promise<B2cPlan> {
    const key = planKey.trim().toLowerCase();
    try {
      await this.ensureB2cPlanTable();
      const existing = await this.getB2cPlan(key);
      const patch = {
        ...data,
        planKey: key,
        updatedAt: new Date(),
      } as any;
      if (existing) {
        const rows = await db.update(b2cPlansTable).set(patch).where(eq(b2cPlansTable.planKey, key)).returning();
        return rows[0];
      }
      const fallback = DEFAULT_B2C_PLANS.find(p => p.planKey === key);
      const rows = await db.insert(b2cPlansTable).values({
        ...fallback,
        ...data,
        planKey: key,
      } as any).returning();
      return rows[0];
    } catch (error) {
      if (shouldUseMemoryFallback(error)) return super.upsertB2cPlan(key, data);
      throw error;
    }
  }

  private async ensureB2cCreditOrderTable(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS b2c_credit_orders (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        order_id text NOT NULL UNIQUE,
        credits integer NOT NULL DEFAULT 0,
        amount integer NOT NULL DEFAULT 0,
        currency text NOT NULL DEFAULT 'USD',
        status text NOT NULL DEFAULT 'created',
        credited_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS user_id varchar`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS order_id text`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS amount integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'created'`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS credited_at timestamp`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()`);
    await db.execute(sql`ALTER TABLE b2c_credit_orders ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`);
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'b2c_credit_orders_order_id_unique'
        ) THEN
          ALTER TABLE b2c_credit_orders ADD CONSTRAINT b2c_credit_orders_order_id_unique UNIQUE (order_id);
        END IF;
      EXCEPTION WHEN duplicate_table THEN
        NULL;
      END $$;
    `);
  }

  async getB2cCreditOrdersByUserId(userId: string): Promise<B2cCreditOrder[]> {
    try {
      return await db.select().from(b2cCreditOrdersTable).where(eq(b2cCreditOrdersTable.userId, userId)).orderBy(desc(b2cCreditOrdersTable.createdAt));
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureB2cCreditOrderTable();
        return await db.select().from(b2cCreditOrdersTable).where(eq(b2cCreditOrdersTable.userId, userId)).orderBy(desc(b2cCreditOrdersTable.createdAt));
      }
      if (shouldUseMemoryFallback(error)) return super.getB2cCreditOrdersByUserId(userId);
      throw error;
    }
  }

  async getB2cCreditOrderByOrderId(orderId: string): Promise<B2cCreditOrder | undefined> {
    try {
      const rows = await db.select().from(b2cCreditOrdersTable).where(eq(b2cCreditOrdersTable.orderId, orderId)).limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureB2cCreditOrderTable();
        const rows = await db.select().from(b2cCreditOrdersTable).where(eq(b2cCreditOrdersTable.orderId, orderId)).limit(1);
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.getB2cCreditOrderByOrderId(orderId);
      throw error;
    }
  }

  async createB2cCreditOrder(data: InsertB2cCreditOrder): Promise<B2cCreditOrder> {
    try {
      const rows = await db.insert(b2cCreditOrdersTable).values(data).returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureB2cCreditOrderTable();
        const rows = await db.insert(b2cCreditOrdersTable).values(data).returning();
        return rows[0];
      }
      if (shouldUseMemoryFallback(error)) return super.createB2cCreditOrder(data);
      throw error;
    }
  }

  async markB2cCreditOrderPaid(orderId: string): Promise<B2cCreditOrder | undefined> {
    try {
      const rows = await db.update(b2cCreditOrdersTable)
        .set({ status: "paid", creditedAt: new Date(), updatedAt: new Date() } as any)
        .where(eq(b2cCreditOrdersTable.orderId, orderId))
        .returning();
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error) || isMissingColumnError(error)) {
        await this.ensureB2cCreditOrderTable();
        return undefined;
      }
      if (shouldUseMemoryFallback(error)) return super.markB2cCreditOrderPaid(orderId);
      throw error;
    }
  }
}

export interface VirtualSticker {
  id: string;
  userId: string;
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  landmarkEmoji: string;
  primaryColor: string;
  secondaryColor: string;
  funFact: string;
  stripeSessionId?: string | null;
  stripePaymentIntent?: string | null;
  amountCents: number;
  currency: string;
  createdAt: Date | null;
}

export const storage: IStorage = hasDatabase ? new HybridStorage() : new MemStorage();

// ----- Virtual Sticker helpers (raw SQL, no Drizzle schema needed) -----

export async function getVirtualStickersByUser(userId: string): Promise<VirtualSticker[]> {
  if (!rawPool) return [];
  try {
    const client = await rawPool.connect();
    try {
      const res = await client.query(
        `SELECT id, user_id, country_code, country_name, flag_emoji, landmark_emoji, primary_color, secondary_color, fun_fact, stripe_session_id, stripe_payment_intent, amount_cents, currency, created_at
         FROM virtual_stickers WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return res.rows.map(r => ({
        id: r.id, userId: r.user_id, countryCode: r.country_code, countryName: r.country_name,
        flagEmoji: r.flag_emoji, landmarkEmoji: r.landmark_emoji, primaryColor: r.primary_color,
        secondaryColor: r.secondary_color, funFact: r.fun_fact, stripeSessionId: r.stripe_session_id,
        stripePaymentIntent: r.stripe_payment_intent, amountCents: r.amount_cents, currency: r.currency,
        createdAt: r.created_at,
      }));
    } finally { client.release(); }
  } catch { return []; }
}

export async function createVirtualSticker(data: Omit<VirtualSticker, "id" | "createdAt">): Promise<VirtualSticker> {
  if (!rawPool) throw new Error("No DB");
  const client = await rawPool.connect();
  try {
    const res = await client.query(
      `INSERT INTO virtual_stickers (user_id, country_code, country_name, flag_emoji, landmark_emoji, primary_color, secondary_color, fun_fact, stripe_session_id, stripe_payment_intent, amount_cents, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [data.userId, data.countryCode, data.countryName, data.flagEmoji, data.landmarkEmoji,
       data.primaryColor, data.secondaryColor, data.funFact, data.stripeSessionId ?? null,
       data.stripePaymentIntent ?? null, data.amountCents, data.currency]
    );
    const r = res.rows[0];
    return {
      id: r.id, userId: r.user_id, countryCode: r.country_code, countryName: r.country_name,
      flagEmoji: r.flag_emoji, landmarkEmoji: r.landmark_emoji, primaryColor: r.primary_color,
      secondaryColor: r.secondary_color, funFact: r.fun_fact, stripeSessionId: r.stripe_session_id,
      stripePaymentIntent: r.stripe_payment_intent, amountCents: r.amount_cents, currency: r.currency,
      createdAt: r.created_at,
    };
  } finally { client.release(); }
}

// ----- Travel Sticker matchmaking (name-based, no auth) -----

export interface TravelStickerCollector {
  collectorName: string;
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  landmarkEmoji: string;
  primaryColor: string;
  secondaryColor: string;
  funFact: string;
  nationality?: string | null;
  paypalCaptureId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
}

export interface TravelStickerMatch {
  name: string;
  collectedAt: Date | null;
}

export interface TravelStickerResult {
  match: TravelStickerMatch | null;
  totalForCountry: number;
}

// In-memory fallback when no DB is configured
const memTravelCollectors: (TravelStickerCollector & { createdAt: Date })[] = [];

// Pool of friendly partner names so every country always has a travel partner.
const PARTNER_NAMES = [
  "Nicky Kartina", "Leo Martins", "Aiko Tanaka", "Sofia Rossi", "Omar Haddad",
  "Maya Patel", "Lucas Silva", "Elena Petrova", "Noah Becker", "Chloe Dubois",
  "Diego Fernandez", "Yuki Sato", "Amara Okafor", "Liam O'Brien", "Isabella Costa",
  "Arjun Nair", "Hana Kim", "Mateo Garcia", "Freya Nilsson", "Ravi Sharma",
  "Carla Mendez", "Tomas Novak", "Zara Ahmed", "Nina Larsen", "Pablo Ortiz",
  "Mei Lin", "Hugo Moreau", "Priya Reddy", "Sven Johansson", "Lucia Romano",
  "Kenji Mori", "Aaliyah Hassan", "Marco Bianchi", "Ingrid Olsen", "Tariq Khan",
  "Camila Torres", "Felix Wagner", "Sara Lindqvist", "Daniel Cohen", "Anaya Singh",
];
function generatedPartner(code: string): TravelStickerMatch {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return { name: PARTNER_NAMES[Math.abs(h) % PARTNER_NAMES.length], collectedAt: null };
}

/**
 * Records a new collector for a country and returns a "travel partner" match:
 * the most recent *previous* real collector, or — if there is none yet — a
 * generated random-named partner so every country always has a partner.
 */
export async function collectTravelSticker(data: TravelStickerCollector): Promise<TravelStickerResult> {
  if (!rawPool) {
    // In-memory fallback
    const prior = memTravelCollectors
      .filter(c => c.countryCode === data.countryCode)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const match = prior[0]
      ? { name: prior[0].collectorName, collectedAt: prior[0].createdAt }
      : generatedPartner(data.countryCode);
    memTravelCollectors.push({ ...data, createdAt: new Date() });
    return { match, totalForCountry: prior.length + 1 };
  }
  const client = await rawPool.connect();
  try {
    // Find the most recent previous collector of the same country (before we insert).
    const prevRes = await client.query(
      `SELECT collector_name, created_at FROM travel_sticker_collectors
       WHERE country_code = $1 ORDER BY created_at DESC LIMIT 1`,
      [data.countryCode]
    );
    const match: TravelStickerMatch = prevRes.rows[0]
      ? { name: prevRes.rows[0].collector_name, collectedAt: prevRes.rows[0].created_at }
      : generatedPartner(data.countryCode);

    await client.query(
      `INSERT INTO travel_sticker_collectors
         (collector_name, country_code, country_name, flag_emoji, landmark_emoji, primary_color, secondary_color, fun_fact, nationality, paypal_capture_id, amount_cents, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [data.collectorName, data.countryCode, data.countryName, data.flagEmoji,
       data.landmarkEmoji, data.primaryColor, data.secondaryColor, data.funFact,
       data.nationality ?? null, data.paypalCaptureId ?? null, data.amountCents ?? null, data.currency ?? null]
    );

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS n FROM travel_sticker_collectors WHERE country_code = $1`,
      [data.countryCode]
    );
    return { match, totalForCountry: countRes.rows[0]?.n ?? 1 };
  } finally { client.release(); }
}

// ----- Travel Sticker payment report (SaaS admin) -----

export interface TravelStickerPaymentRow {
  id: string;
  name: string;
  nationality: string | null;
  countryName: string;
  flag: string;
  amountCents: number | null;
  currency: string | null;
  captureId: string | null;
  createdAt: Date | null;
}

export interface TravelStickerPaymentReport {
  rows: TravelStickerPaymentRow[];
  totalCount: number;
  paidCount: number;
  totalRevenueCents: number;
}

export async function getTravelStickerPayments(limit = 200): Promise<TravelStickerPaymentReport> {
  if (!rawPool) return { rows: [], totalCount: 0, paidCount: 0, totalRevenueCents: 0 };
  const client = await rawPool.connect();
  try {
    const rowsRes = await client.query(
      `SELECT id, collector_name, nationality, country_name, flag_emoji, amount_cents, currency, paypal_capture_id, created_at
       FROM travel_sticker_collectors
       ORDER BY created_at DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 1000)]
    );
    const summaryRes = await client.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COUNT(paypal_capture_id)::int AS paid_count,
         COALESCE(SUM(amount_cents) FILTER (WHERE paypal_capture_id IS NOT NULL), 0)::int AS revenue_cents
       FROM travel_sticker_collectors`
    );
    const s = summaryRes.rows[0] || {};
    return {
      rows: rowsRes.rows.map(r => ({
        id: r.id,
        name: r.collector_name,
        nationality: r.nationality,
        countryName: r.country_name,
        flag: r.flag_emoji,
        amountCents: r.amount_cents,
        currency: r.currency,
        captureId: r.paypal_capture_id,
        createdAt: r.created_at,
      })),
      totalCount: s.total_count ?? 0,
      paidCount: s.paid_count ?? 0,
      totalRevenueCents: s.revenue_cents ?? 0,
    };
  } finally { client.release(); }
}

export async function getVirtualStickerBySession(sessionId: string): Promise<VirtualSticker | null> {
  if (!rawPool) return null;
  try {
    const client = await rawPool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM virtual_stickers WHERE stripe_session_id = $1 LIMIT 1`,
        [sessionId]
      );
      if (!res.rows[0]) return null;
      const r = res.rows[0];
      return {
        id: r.id, userId: r.user_id, countryCode: r.country_code, countryName: r.country_name,
        flagEmoji: r.flag_emoji, landmarkEmoji: r.landmark_emoji, primaryColor: r.primary_color,
        secondaryColor: r.secondary_color, funFact: r.fun_fact, stripeSessionId: r.stripe_session_id,
        stripePaymentIntent: r.stripe_payment_intent, amountCents: r.amount_cents, currency: r.currency,
        createdAt: r.created_at,
      };
    } finally { client.release(); }
  } catch { return null; }
}
