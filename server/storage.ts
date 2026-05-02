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
  type ActivityLog, type InsertActivityLog,
  type CustomerAccount, type InsertCustomerAccount,
  type CustomerTenantLink, type InsertCustomerTenantLink,
  type OTPCode, type InsertOTPCode,
  type B2cUser, type InsertB2cUser,
  type VisaCheck, type InsertVisaCheck,
  type SavedProfile, type InsertSavedProfile,
  type SmsConfig, type InsertSmsConfig,
  type PlatformAiConfig, type InsertPlatformAiConfig,
  type PaymentGatewayConfig, type InsertPaymentGatewayConfig,
  type TenantPaymentGatewayConfig, type InsertTenantPaymentGatewayConfig,
  type TenantSmsConfig, type InsertTenantSmsConfig,
  type FeeTemplate, type InsertFeeTemplate,
  type InvoiceSettings, type InsertInvoiceSettings,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Payment, type InsertPayment,
  b2cUsers, visaChecks, savedProfiles, smsConfig as smsConfigTable,
  platformAiConfig as platformAiConfigTable,
  paymentGatewayConfig as paymentGatewayConfigTable,
  tenantPaymentGatewayConfig as tenantPaymentGatewayConfigTable,
  tenantSmsConfig as tenantSmsConfigTable,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
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
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "42P01");
}

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

  // Saved Profiles
  getSavedProfile(userId: string): Promise<SavedProfile | undefined>;
  upsertSavedProfile(userId: string, data: Partial<InsertSavedProfile>): Promise<SavedProfile>;

  // SMS Config
  getSmsConfig(): Promise<SmsConfig | undefined>;
  upsertSmsConfig(data: Partial<InsertSmsConfig>): Promise<SmsConfig>;

  // Platform AI Config
  getPlatformAiConfig(): Promise<PlatformAiConfig | undefined>;
  upsertPlatformAiConfig(data: Partial<InsertPlatformAiConfig>): Promise<PlatformAiConfig>;

  // Payment Gateway Config
  getPaymentGatewayConfig(): Promise<PaymentGatewayConfig | undefined>;
  upsertPaymentGatewayConfig(data: Partial<InsertPaymentGatewayConfig>): Promise<PaymentGatewayConfig>;

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
  private activityLogs: Map<string, ActivityLog>;
  private customerAccounts: Map<string, CustomerAccount>;
  private customerTenantLinks: Map<string, CustomerTenantLink>;
  private otpCodes: Map<string, OTPCode>;
  private b2cUsersMap: Map<string, B2cUser>;
  private visaChecksMap: Map<string, VisaCheck>;
  private savedProfilesMap: Map<string, SavedProfile>;
  private smsConfigRecord?: SmsConfig;
  private platformAiConfigRecord?: PlatformAiConfig;
  private paymentGatewayConfigRecord?: PaymentGatewayConfig;
  private tenantPaymentGatewayConfigByTenant: Map<string, TenantPaymentGatewayConfig> = new Map();
  private tenantSmsConfigByTenant: Map<string, TenantSmsConfig> = new Map();
  private feeTemplates: Map<string, FeeTemplate> = new Map();
  private invoiceSettingsByTenant: Map<string, InvoiceSettings> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private invoiceItems: Map<string, InvoiceItem> = new Map();
  private payments: Map<string, Payment> = new Map();
  private coTravellers: Map<string, CaseCoTraveller> = new Map();
  private appointments: Map<string, Appointment> = new Map();

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
    this.savedProfilesMap = new Map();
    
    this.seedData();
  }

  private seedData() {
    const tenant1: Tenant = {
      id: "tenant-1",
      name: "Demo Travel Agency",
      slug: "demo-agency",
      logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=DTA&backgroundColor=00B4D8&textColor=ffffff",
      plan: "professional",
      status: "active",
      primaryColor: "#00B4D8",
      secondaryColor: "#E056A0",
      accentColor: "#0096C7",
      contactEmail: "info@demoagency.com",
      contactPhone: "+1 234 567 8900",
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
      subscriptionPlan: "free",
      checkLimit: 1,
      deepCheckAccess: false,
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
      plan: insertTenant.plan ?? "starter",
      status: insertTenant.status ?? "active",
      primaryColor: insertTenant.primaryColor ?? "#00B4D8",
      secondaryColor: insertTenant.secondaryColor ?? "#E056A0",
      accentColor: insertTenant.accentColor ?? "#0096C7",
      contactEmail: insertTenant.contactEmail ?? null,
      contactPhone: insertTenant.contactPhone ?? null,
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
      updatedAt: new Date(),
    };
    return this.paymentGatewayConfigRecord;
  }
}

// HybridStorage: uses MemStorage for agency/seed data, PostgreSQL for B2C user data
class HybridStorage extends MemStorage {
  // Seed demo users into PostgreSQL on startup so they persist reliably
  async seedDemoUsersToDb(): Promise<void> {
    const demoAccounts = [
      {
        id: "b2c-demo",
        email: "demo@visashuttle.com",
        password: bcrypt.hashSync("Demo@12345", 10),
        fullName: "Demo User",
        phone: null,
        phoneVerified: false,
        freeChecksUsed: 0,
        subscriptionPlan: "free" as const,
        checkLimit: 1,
        deepCheckAccess: false,
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
      }
    }
  }

  // B2C Users — persisted to DB, with in-memory fallback for seeded demo/test accounts
  async getB2cUser(id: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.id, id)).limit(1);
    if (rows[0]) return rows[0];
    // Fallback to in-memory seeded users (demo/test accounts)
    return super.getB2cUser(id);
  }

  async getB2cUserByEmail(email: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.email, email.toLowerCase())).limit(1);
    if (rows[0]) return rows[0];
    // Fallback to in-memory seeded users (demo/test accounts)
    return super.getB2cUserByEmail(email);
  }

  async getB2cUserByPhone(phone: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.phone, phone)).limit(1);
    if (rows[0]) return rows[0];
    return super.getB2cUserByPhone(phone);
  }

  async createB2cUser(user: InsertB2cUser): Promise<B2cUser> {
    const rows = await db.insert(b2cUsers).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return rows[0];
  }

  async getAllB2cUsers(): Promise<B2cUser[]> {
    const rows = await db.select().from(b2cUsers).orderBy(desc(b2cUsers.createdAt));
    const memoryUsers = await super.getAllB2cUsers();
    const existingIds = new Set(rows.map(user => user.id));
    const fallbackUsers = memoryUsers.filter(user => !existingIds.has(user.id));
    return [...rows, ...fallbackUsers];
  }

  async updateB2cUser(id: string, data: Partial<Omit<B2cUser, 'id' | 'createdAt'>>): Promise<B2cUser | undefined> {
    const rows = await db.update(b2cUsers).set(data).where(eq(b2cUsers.id, id)).returning();
    if (rows[0]) return rows[0];
    return super.updateB2cUser(id, data);
  }

  async deleteB2cUser(id: string): Promise<boolean> {
    const rows = await db.delete(b2cUsers).where(eq(b2cUsers.id, id)).returning({ id: b2cUsers.id });
    if (rows.length > 0) return true;
    return super.deleteB2cUser(id);
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
      if (isMissingRelationError(error)) {
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
      if (isMissingRelationError(error)) {
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
      if (isMissingRelationError(error)) {
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
      if (isMissingRelationError(error)) {
        console.warn("[DB] platform_ai_config table is missing. Saving AI config in memory only.");
        return super.upsertPlatformAiConfig(data);
      }
      throw error;
    }
  }

  // Payment Gateway Config — single-row config stored in DB
  async getPaymentGatewayConfig(): Promise<PaymentGatewayConfig | undefined> {
    try {
      const rows = await db.select().from(paymentGatewayConfigTable).limit(1);
      return rows[0];
    } catch (error) {
      if (isMissingRelationError(error)) {
        console.warn("[DB] payment_gateway_config table is missing. Using in-memory payment config fallback.");
        return super.getPaymentGatewayConfig();
      }
      throw error;
    }
  }

  async upsertPaymentGatewayConfig(data: Partial<InsertPaymentGatewayConfig>): Promise<PaymentGatewayConfig> {
    try {
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
      if (isMissingRelationError(error)) {
        console.warn("[DB] payment_gateway_config table is missing. Saving payment config in memory only.");
        return super.upsertPaymentGatewayConfig(data);
      }
      throw error;
    }
  }
}

export const storage: IStorage = hasDatabase ? new HybridStorage() : new MemStorage();
