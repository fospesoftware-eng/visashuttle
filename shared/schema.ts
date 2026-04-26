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
  // White-label branding
  primaryColor: text("primary_color").default("#00B4D8"),
  secondaryColor: text("secondary_color").default("#E056A0"),
  accentColor: text("accent_color").default("#0096C7"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  whatsappNumber: text("whatsapp_number"),
  showPoweredBy: boolean("show_powered_by").default(true),
  authMethod: text("auth_method").default("otp"), // otp, magic_link
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
  customerId: varchar("customer_id"), // Can be null initially for agency-created cases
  customerAccountId: varchar("customer_account_id"), // Link to white-label customer
  caseNumber: text("case_number").notNull(),
  referenceId: text("reference_id").notNull(), // For customer claim flow
  applicantName: text("applicant_name"), // For claim verification
  applicantDob: text("applicant_dob"), // For claim verification (stored as string for simplicity)
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

// Customer Accounts table (White-label portal customers)
export const customerAccounts = pgTable("customer_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerAccountSchema = createInsertSchema(customerAccounts).omit({ id: true, createdAt: true });
export type InsertCustomerAccount = z.infer<typeof insertCustomerAccountSchema>;
export type CustomerAccount = typeof customerAccounts.$inferSelect;

// Customer-Tenant Link table (allows customers to have cases with multiple agencies)
export const customerTenantLinks = pgTable("customer_tenant_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerAccountId: varchar("customer_account_id").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  role: text("role").default("customer"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerTenantLinkSchema = createInsertSchema(customerTenantLinks).omit({ id: true, createdAt: true });
export type InsertCustomerTenantLink = z.infer<typeof insertCustomerTenantLinkSchema>;
export type CustomerTenantLink = typeof customerTenantLinks.$inferSelect;

// B2C User Profiles (Visa Checker users — separate from agency users)
export const b2cUsers = pgTable("b2c_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  freeChecksUsed: integer("free_checks_used").notNull().default(0),
  subscriptionPlan: text("subscription_plan").notNull().default("free"), // free, starter, pro
  checkLimit: integer("check_limit").notNull().default(1),
  deepCheckAccess: boolean("deep_check_access").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertB2cUserSchema = createInsertSchema(b2cUsers).omit({ id: true, createdAt: true });
export type InsertB2cUser = z.infer<typeof insertB2cUserSchema>;
export type B2cUser = typeof b2cUsers.$inferSelect;

// Visa Checks table (B2C AI check results)
export const visaChecks = pgTable("visa_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  checkType: text("check_type").notNull().default("basic"), // basic, deep
  formData: jsonb("form_data").notNull(),
  aiProvider: text("ai_provider").notNull().default("mock"),
  approvalChance: integer("approval_chance"),
  statusLabel: text("status_label"),
  aiResponse: jsonb("ai_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVisaCheckSchema = createInsertSchema(visaChecks).omit({ id: true, createdAt: true });
export type InsertVisaCheck = z.infer<typeof insertVisaCheckSchema>;
export type VisaCheck = typeof visaChecks.$inferSelect;

// Saved Traveler Profiles (B2C)
export const savedProfiles = pgTable("saved_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  fullName: text("full_name"),
  nationality: text("nationality"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  countryOfResidence: text("country_of_residence"),
  passportCountry: text("passport_country"),
  employmentStatus: text("employment_status"),
  jobTitle: text("job_title"),
  companyName: text("company_name"),
  yearsInJob: text("years_in_job"),
  monthlyIncome: text("monthly_income"),
  sourceOfIncome: text("source_of_income"),
  bankBalance: text("bank_balance"),
  tripFunding: text("trip_funding"),
  previousTravel: text("previous_travel"),
  countriesVisited: text("countries_visited"),
  previousVisaRefusals: text("previous_visa_refusals"),
  hasPassport: boolean("has_passport").default(false),
  hasBankStatement: boolean("has_bank_statement").default(false),
  hasIncomeProof: boolean("has_income_proof").default(false),
  hasTaxReturn: boolean("has_tax_return").default(false),
  hasSalarySlips: boolean("has_salary_slips").default(false),
  hasCreditCard: boolean("has_credit_card").default(false),
  hasProperty: boolean("has_property").default(false),
  familyInHomeCountry: boolean("family_in_home_country").default(false),
  propertyInHomeCountry: boolean("property_in_home_country").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSavedProfileSchema = createInsertSchema(savedProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavedProfile = z.infer<typeof insertSavedProfileSchema>;
export type SavedProfile = typeof savedProfiles.$inferSelect;

// OTP Codes table
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: text("code").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  attempts: integer("attempts").default(0),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOTPCodeSchema = createInsertSchema(otpCodes).omit({ id: true, createdAt: true });
export type InsertOTPCode = z.infer<typeof insertOTPCodeSchema>;
export type OTPCode = typeof otpCodes.$inferSelect;
