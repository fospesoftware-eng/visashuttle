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
} from "@workspace/db";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db, hasDatabase } from "./db";

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

function isMissingRelationError(error: unknown): boolean {
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

function isMissingColumnError(error: unknown): boolean {
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
  getActiveOTPCodeByPhone(phone: string, tenantId: string): Promise<OTPCode | undefined>;
  markOTPUsed(id: string): Promise<void>;
  incrementOTPAttempts(id: string): Promise<void>;

  // B2C Users
  getB2cUser(id: string): Promise<B2cUser | undefined>;
  getB2cUserByEmail(email: string): Promise<B2cUser | undefined>;
  getB2cUserByPhone(phone: string): Promise<B2cUser | undefined>;
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
  deleteB2cCoupon(id: string): Promise<boolean>;
  getB2cPlans(): Promise<B2cPlan[]>;
  getB2cPlan(planKey: string): Promise<B2cPlan | undefined>;
  upsertB2cPlan(planKey: string, data: Partial<InsertB2cPlan>): Promise<B2cPlan>;
  getB2cCreditOrdersByUserId(userId: string): Promise<B2cCreditOrder[]>;
  getB2cCreditOrderByOrderId(orderId: string): Promise<B2cCreditOrder | undefined>;
  createB2cCreditOrder(data: InsertB2cCreditOrder): Promise<B2cCreditOrder>;
  markB2cCreditOrderPaid(orderId: string): Promise<B2cCreditOrder | undefined>;

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
      anthropicModel: data.anthropicModel !== undefined ? data.anthropicModel : existing?.anthropicModel ?? "claude-opus-4-5",
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
      enabled: data.enabled !== undefined ? !!data.enabled : existing?.enabled ?? false,
      updatedAt: new Date(),
    };
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
}

// HybridStorage: uses PostgreSQL for DB-backed production data. Local
// development can still fall back to seeded in-memory data if a newly added
// optional table has not been pushed yet.
class HybridStorage extends MemStorage {
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
    const rows = await db.insert(tenantsTable).values(tenant).returning();
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
    if (user.subscriptionPlan === "pro" && user.checkLimit >= 5 && user.deepCheckAccess) return user;

    const checkLimit = Math.max(user.checkLimit || 0, 5);
    const rows = await db.update(b2cUsers)
      .set({
        subscriptionPlan: "pro",
        checkLimit,
        deepCheckAccess: true,
      })
      .where(eq(b2cUsers.id, user.id))
      .returning();
    return rows[0] ?? { ...user, subscriptionPlan: "pro", checkLimit, deepCheckAccess: true };
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
    const adminEmail = "admin@visashuttle.com";
    const adminPassword = bcrypt.hashSync("Admin@12345", 10);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
    if (!existing[0]) {
      await db.insert(usersTable).values({
        id: "user-admin",
        email: adminEmail,
        password: adminPassword,
        name: "System Admin",
        role: "saas_admin",
        tenantId: null,
        avatarUrl: null,
        permissions: [],
      });
      return;
    }
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

  async seedDemoUsersToDb(): Promise<void> {
    await this.seedPlatformUsersToDb();
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
    const rows = await db.insert(visaToolChecks).values(check).returning();
    return rows[0];
  }

  async getVisaToolChecksByUserId(userId: string): Promise<VisaToolCheck[]> {
    return db.select().from(visaToolChecks).where(eq(visaToolChecks.userId, userId)).orderBy(desc(visaToolChecks.createdAt));
  }

  async getVisaToolCheck(id: string): Promise<VisaToolCheck | undefined> {
    const rows = await db.select().from(visaToolChecks).where(eq(visaToolChecks.id, id)).limit(1);
    return rows[0];
  }

  async getAllVisaToolChecks(): Promise<VisaToolCheck[]> {
    return db.select().from(visaToolChecks).orderBy(desc(visaToolChecks.createdAt));
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
  async getSmsConfig(): Promise<SmsConfig | undefined> {
    try {
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
        anthropicModel: "claude-opus-4-5",
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
        enabled boolean NOT NULL DEFAULT false,
        updated_at timestamp DEFAULT now()
      )
	    `);
    await db.execute(sql`ALTER TABLE zeptomail_config ADD COLUMN IF NOT EXISTS bounce_address text`);
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
        active boolean NOT NULL DEFAULT true,
        expires_at timestamp,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
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
  }

  async getB2cCreditOrdersByUserId(userId: string): Promise<B2cCreditOrder[]> {
    try {
      return await db.select().from(b2cCreditOrdersTable).where(eq(b2cCreditOrdersTable.userId, userId)).orderBy(desc(b2cCreditOrdersTable.createdAt));
    } catch (error) {
      if (isMissingRelationError(error)) {
        await this.ensureB2cCreditOrderTable();
        return [];
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
      if (isMissingRelationError(error)) {
        await this.ensureB2cCreditOrderTable();
        return undefined;
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
      if (isMissingRelationError(error)) {
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
      if (isMissingRelationError(error)) {
        await this.ensureB2cCreditOrderTable();
        return undefined;
      }
      if (shouldUseMemoryFallback(error)) return super.markB2cCreditOrderPaid(orderId);
      throw error;
    }
  }
}

export const storage: IStorage = hasDatabase ? new HybridStorage() : new MemStorage();
