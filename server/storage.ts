import { 
  type User, type InsertUser,
  type Tenant, type InsertTenant,
  type Lead, type InsertLead,
  type Case, type InsertCase,
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
  b2cUsers, visaChecks, savedProfiles,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsersByTenantId(tenantId: string): Promise<User[]>;
  
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  
  getLeadsByTenantId(tenantId: string): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, data: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  
  getCasesByTenantId(tenantId: string): Promise<Case[]>;
  getCasesByCustomerId(customerId: string): Promise<Case[]>;
  getCasesByCustomerAccountId(customerAccountId: string, tenantId: string): Promise<Case[]>;
  getCaseByReferenceId(referenceId: string, tenantId: string): Promise<Case | undefined>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined>;
  
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
  
  getActivityLogsByTenantId(tenantId: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getCustomerAccount(id: string): Promise<CustomerAccount | undefined>;
  getCustomerAccountByEmail(email: string): Promise<CustomerAccount | undefined>;
  createCustomerAccount(account: InsertCustomerAccount): Promise<CustomerAccount>;
  updateCustomerAccount(id: string, data: Partial<InsertCustomerAccount>): Promise<CustomerAccount | undefined>;

  getCustomerTenantLink(customerAccountId: string, tenantId: string): Promise<CustomerTenantLink | undefined>;
  createCustomerTenantLink(link: InsertCustomerTenantLink): Promise<CustomerTenantLink>;
  getCustomerTenantLinks(customerAccountId: string): Promise<CustomerTenantLink[]>;

  createOTPCode(otp: InsertOTPCode): Promise<OTPCode>;
  getActiveOTPCode(email: string, tenantId: string): Promise<OTPCode | undefined>;
  markOTPUsed(id: string): Promise<void>;
  incrementOTPAttempts(id: string): Promise<void>;

  // B2C Users
  getB2cUser(id: string): Promise<B2cUser | undefined>;
  getB2cUserByEmail(email: string): Promise<B2cUser | undefined>;
  createB2cUser(user: InsertB2cUser): Promise<B2cUser>;
  updateB2cUser(id: string, data: Partial<Omit<B2cUser, 'id' | 'createdAt'>>): Promise<B2cUser | undefined>;

  // Visa Checks
  createVisaCheck(check: InsertVisaCheck): Promise<VisaCheck>;
  getVisaChecksByUserId(userId: string): Promise<VisaCheck[]>;
  getVisaCheck(id: string): Promise<VisaCheck | undefined>;

  // Saved Profiles
  getSavedProfile(userId: string): Promise<SavedProfile | undefined>;
  upsertSavedProfile(userId: string, data: Partial<InsertSavedProfile>): Promise<SavedProfile>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tenants: Map<string, Tenant>;
  private leads: Map<string, Lead>;
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

  constructor() {
    this.users = new Map();
    this.tenants = new Map();
    this.leads = new Map();
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
      { id: "lead-1", tenantId: "tenant-1", name: "Alice Cooper", email: "alice@example.com", phone: "+1 234 567 8901", source: "Website", stage: "new", value: 2500, notes: null, assignedTo: "user-owner", createdAt: new Date(), updatedAt: new Date() },
      { id: "lead-2", tenantId: "tenant-1", name: "Bob Wilson", email: "bob@example.com", phone: "+1 234 567 8902", source: "Referral", stage: "contacted", value: 3200, notes: null, assignedTo: "user-owner", createdAt: new Date(), updatedAt: new Date() },
      { id: "lead-3", tenantId: "tenant-1", name: "Carol Martinez", email: "carol@example.com", phone: "+1 234 567 8903", source: "Social Media", stage: "qualified", value: 4500, notes: null, assignedTo: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    leads.forEach(lead => this.leads.set(lead.id, lead));

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
        visaType: "Schengen Tourist", 
        destinationCountry: "France", 
        status: "in_progress", 
        priority: "normal", 
        assignedTo: "user-owner", 
        travelDate: new Date("2024-03-15"), 
        notes: null, 
        readinessScore: 75, 
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
        visaType: "UK Visitor", 
        destinationCountry: "United Kingdom", 
        status: "documents_required", 
        priority: "high", 
        assignedTo: "user-owner", 
        travelDate: new Date("2024-04-20"), 
        notes: null, 
        readinessScore: 45, 
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
      freeChecksUsed: 0,
      subscriptionPlan: "free",
      checkLimit: 1,
      deepCheckAccess: false,
      stripeCustomerId: null,
      createdAt: new Date(),
    };
    this.b2cUsersMap.set(demoB2cUser.id, demoB2cUser);
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
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
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
      stage: insertLead.stage ?? "new",
      value: insertLead.value ?? null,
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
      visaType: insertCase.visaType,
      destinationCountry: insertCase.destinationCountry,
      status: insertCase.status ?? "pending",
      priority: insertCase.priority ?? "normal",
      assignedTo: insertCase.assignedTo ?? null,
      travelDate: insertCase.travelDate ?? null,
      notes: insertCase.notes ?? null,
      readinessScore: insertCase.readinessScore ?? null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.cases.set(id, caseData);
    return caseData;
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    const caseData = this.cases.get(id);
    if (!caseData) return undefined;
    const updated = { ...caseData, ...data, updatedAt: new Date() };
    this.cases.set(id, updated);
    return updated;
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

  async getActivityLogsByTenantId(tenantId: string): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).filter(log => log.tenantId === tenantId);
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
      email: insertOTP.email,
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
      otp => otp.email.toLowerCase() === email.toLowerCase() && 
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

  async updateB2cUser(id: string, data: Partial<Omit<B2cUser, 'id' | 'createdAt'>>): Promise<B2cUser | undefined> {
    const user = this.b2cUsersMap.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.b2cUsersMap.set(id, updated);
    return updated;
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
}

// HybridStorage: uses MemStorage for agency/seed data, PostgreSQL for B2C user data
class HybridStorage extends MemStorage {
  // B2C Users — persisted to DB
  async getB2cUser(id: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.id, id)).limit(1);
    return rows[0];
  }

  async getB2cUserByEmail(email: string): Promise<B2cUser | undefined> {
    const rows = await db.select().from(b2cUsers).where(eq(b2cUsers.email, email.toLowerCase())).limit(1);
    return rows[0];
  }

  async createB2cUser(user: InsertB2cUser): Promise<B2cUser> {
    const rows = await db.insert(b2cUsers).values({
      ...user,
      email: user.email.toLowerCase(),
    }).returning();
    return rows[0];
  }

  async updateB2cUser(id: string, data: Partial<Omit<B2cUser, 'id' | 'createdAt'>>): Promise<B2cUser | undefined> {
    const rows = await db.update(b2cUsers).set(data).where(eq(b2cUsers.id, id)).returning();
    return rows[0];
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
}

export const storage = new HybridStorage();
