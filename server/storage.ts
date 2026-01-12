import { 
  type User, type InsertUser,
  type Tenant, type InsertTenant,
  type Lead, type InsertLead,
  type Case, type InsertCase,
  type Document, type InsertDocument,
  type Message, type InsertMessage,
  type VisaTemplate, type InsertVisaTemplate,
  type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import { randomUUID } from "crypto";

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

  constructor() {
    this.users = new Map();
    this.tenants = new Map();
    this.leads = new Map();
    this.cases = new Map();
    this.documents = new Map();
    this.messages = new Map();
    this.visaTemplates = new Map();
    this.activityLogs = new Map();
    
    this.seedData();
  }

  private seedData() {
    const tenant1: Tenant = {
      id: "tenant-1",
      name: "Demo Travel Agency",
      slug: "demo-agency",
      logoUrl: null,
      plan: "professional",
      status: "active",
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

    const leads: Lead[] = [
      { id: "lead-1", tenantId: "tenant-1", name: "Alice Cooper", email: "alice@example.com", phone: "+1 234 567 8901", source: "Website", stage: "new", value: 2500, notes: null, assignedTo: "user-owner", createdAt: new Date(), updatedAt: new Date() },
      { id: "lead-2", tenantId: "tenant-1", name: "Bob Wilson", email: "bob@example.com", phone: "+1 234 567 8902", source: "Referral", stage: "contacted", value: 3200, notes: null, assignedTo: "user-owner", createdAt: new Date(), updatedAt: new Date() },
      { id: "lead-3", tenantId: "tenant-1", name: "Carol Martinez", email: "carol@example.com", phone: "+1 234 567 8903", source: "Social Media", stage: "qualified", value: 4500, notes: null, assignedTo: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    leads.forEach(lead => this.leads.set(lead.id, lead));

    const cases: Case[] = [
      { id: "case-1", tenantId: "tenant-1", customerId: "user-customer", caseNumber: "VS-2024-001", visaType: "Schengen Tourist", destinationCountry: "France", status: "in_progress", priority: "normal", assignedTo: "user-owner", travelDate: new Date("2024-03-15"), notes: null, readinessScore: 75, createdAt: new Date(), updatedAt: new Date() },
      { id: "case-2", tenantId: "tenant-1", customerId: "user-customer", caseNumber: "VS-2024-002", visaType: "UK Visitor", destinationCountry: "United Kingdom", status: "documents_required", priority: "high", assignedTo: "user-owner", travelDate: new Date("2024-04-20"), notes: null, readinessScore: 45, createdAt: new Date(), updatedAt: new Date() },
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
    const user: User = { ...insertUser, id, createdAt: new Date() };
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
    const tenant: Tenant = { ...insertTenant, id, createdAt: new Date() };
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
    const lead: Lead = { ...insertLead, id, createdAt: new Date(), updatedAt: new Date() };
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

  async getCase(id: string): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async createCase(insertCase: InsertCase): Promise<Case> {
    const id = randomUUID();
    const caseData: Case = { ...insertCase, id, createdAt: new Date(), updatedAt: new Date() };
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
    const doc: Document = { ...insertDoc, id, uploadedAt: new Date(), reviewedAt: null };
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
    const msg: Message = { ...insertMsg, id, createdAt: new Date() };
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
    const template: VisaTemplate = { ...insertTemplate, id, createdAt: new Date(), updatedAt: new Date() };
    this.visaTemplates.set(id, template);
    return template;
  }

  async getActivityLogsByTenantId(tenantId: string): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values()).filter(log => log.tenantId === tenantId);
  }

  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = randomUUID();
    const log: ActivityLog = { ...insertLog, id, createdAt: new Date() };
    this.activityLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
