import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("customer"), // saas_admin, agency_owner, agency_staff, customer
  tenantId: varchar("tenant_id"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tenants (Agencies) table
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  plan: text("plan").notNull().default("starter"), // starter, professional, enterprise
  status: text("status").notNull().default("active"), // active, suspended, pending
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  source: text("source"), // website, referral, social, etc.
  stage: text("stage").notNull().default("new"), // new, contacted, qualified, proposal, won, lost
  value: integer("value").default(0),
  notes: text("notes"),
  assignedTo: varchar("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Cases table
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  caseNumber: text("case_number").notNull(),
  visaType: text("visa_type").notNull(),
  destinationCountry: text("destination_country").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, documents_required, under_review, approved, rejected
  priority: text("priority").default("normal"), // low, normal, high, urgent
  assignedTo: varchar("assigned_to"),
  travelDate: timestamp("travel_date"),
  notes: text("notes"),
  readinessScore: integer("readiness_score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // passport, photo, bank_statement, employment_letter, etc.
  status: text("status").notNull().default("pending"), // pending, approved, rejected, needs_reupload
  fileUrl: text("file_url"),
  qualityScore: integer("quality_score"),
  extractedData: jsonb("extracted_data"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadedAt: true, reviewedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role").notNull(), // agency, customer
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Visa Templates table
export const visaTemplates = pgTable("visa_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  country: text("country").notNull(),
  visaType: text("visa_type").notNull(),
  requirements: jsonb("requirements").notNull(), // JSON array of requirement objects
  processingTime: text("processing_time"),
  fees: text("fees"),
  notes: text("notes"),
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVisaTemplateSchema = createInsertSchema(visaTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVisaTemplate = z.infer<typeof insertVisaTemplateSchema>;
export type VisaTemplate = typeof visaTemplates.$inferSelect;

// Activity Logs table
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id"),
  userId: varchar("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"), // case, document, lead, etc.
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
