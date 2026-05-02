import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, serial } from "drizzle-orm/pg-core";
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
  destinationCountry: text("destination_country"),
  visaType: text("visa_type"),
  stage: text("stage").notNull().default("new"), // new, contacted, qualified, proposal, won, lost
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
  applicantName: text("applicant_name"), // For claim verification (kept in sync with passport given+middle+surname when present)
  applicantDob: text("applicant_dob"), // For claim verification (stored as string for simplicity)
  // --- Passport details (Indian passport standard structure) ---
  passportSurname: text("passport_surname"),
  passportGivenName: text("passport_given_name"),
  passportMiddleName: text("passport_middle_name"),
  passportNumber: text("passport_number"),
  passportNationality: text("passport_nationality"),
  passportGender: text("passport_gender"), // M / F / X
  passportDateOfIssue: text("passport_date_of_issue"), // ISO yyyy-mm-dd
  passportDateOfExpiry: text("passport_date_of_expiry"), // ISO yyyy-mm-dd
  passportPlaceOfIssue: text("passport_place_of_issue"),
  passportPlaceOfBirth: text("passport_place_of_birth"),
  passportFileUrl: text("passport_file_url"), // Optional: link to uploaded passport image
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

// Case Co-Travellers (companions on the same application/trip)
export const CO_TRAVELLER_RELATIONSHIPS = [
  "spouse", "child", "parent", "sibling", "grandparent",
  "in_law", "partner", "friend", "colleague", "relative", "other",
] as const;
export type CoTravellerRelationship = typeof CO_TRAVELLER_RELATIONSHIPS[number];

export const caseCoTravellers = pgTable("case_co_travellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  dob: text("dob"),
  relationship: text("relationship").notNull(), // see CO_TRAVELLER_RELATIONSHIPS
  passportNumber: text("passport_number"),
  nationality: text("nationality"),
  // Optional structured passport fields — populated when an agent uploads a
  // co-traveller's passport bio page and runs auto-scan. All nullable so
  // older records and manual rows continue to work.
  passportSurname: text("passport_surname"),
  passportGivenName: text("passport_given_name"),
  passportMiddleName: text("passport_middle_name"),
  passportGender: text("passport_gender"), // "M" | "F" | "X"
  passportDateOfIssue: text("passport_date_of_issue"),
  passportDateOfExpiry: text("passport_date_of_expiry"),
  passportPlaceOfIssue: text("passport_place_of_issue"),
  passportPlaceOfBirth: text("passport_place_of_birth"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCaseCoTravellerSchema = createInsertSchema(caseCoTravellers).omit({ id: true, createdAt: true });
export type InsertCaseCoTraveller = z.infer<typeof insertCaseCoTravellerSchema>;
export type CaseCoTraveller = typeof caseCoTravellers.$inferSelect;

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
  monthsInCurrentResidence: text("months_in_current_residence"),
  monthlyExpenses: text("monthly_expenses"),
  criminalRecord: text("criminal_record"),
  immigrationViolation: text("immigration_violation"),
  financialCommitmentsHome: text("financial_commitments_home"),
  dependentsHomeCountry: text("dependents_home_country"),
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

// ── SMS Provider Config ───────────────────────────────────────────────────────
export const smsConfig = pgTable("sms_config", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().default("messagecentral"),
  msg91AuthKey: text("msg91_auth_key"),
  msg91TemplateId: text("msg91_template_id"),
  msg91SenderId: text("msg91_sender_id"),
  zauvApiKey: text("zavu_api_key"),
  mcCustomerId: text("mc_customer_id"),
  mcAuthToken: text("mc_auth_token"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSmsConfigSchema = createInsertSchema(smsConfig).omit({ id: true, updatedAt: true });
export type InsertSmsConfig = z.infer<typeof insertSmsConfigSchema>;
export type SmsConfig = typeof smsConfig.$inferSelect;

// ── Platform AI Provider Config ───────────────────────────────────────────────
export const platformAiConfig = pgTable("platform_ai_config", {
  id: serial("id").primaryKey(),
  anthropicApiKey: text("anthropic_api_key"),
  anthropicModel: text("anthropic_model").default("claude-opus-4-5"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatformAiConfigSchema = createInsertSchema(platformAiConfig).omit({ id: true, updatedAt: true });
export type InsertPlatformAiConfig = z.infer<typeof insertPlatformAiConfigSchema>;
export type PlatformAiConfig = typeof platformAiConfig.$inferSelect;

// ── Payment Gateway Config ───────────────────────────────────────────────────
export const paymentGatewayConfig = pgTable("payment_gateway_config", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().default("cashfree"),
  mode: text("mode").notNull().default("test"),
  apiVersion: text("api_version").notNull().default("2023-08-01"),
  testClientId: text("test_client_id"),
  testClientSecret: text("test_client_secret"),
  liveClientId: text("live_client_id"),
  liveClientSecret: text("live_client_secret"),
  webhookSecret: text("webhook_secret"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentGatewayConfigSchema = createInsertSchema(paymentGatewayConfig).omit({ id: true, updatedAt: true });
export type InsertPaymentGatewayConfig = z.infer<typeof insertPaymentGatewayConfigSchema>;
export type PaymentGatewayConfig = typeof paymentGatewayConfig.$inferSelect;

// ── Per-Tenant Payment Gateway Config (Cashfree) ─────────────────────────────
// Per-agency override of the global payment gateway config. When a tenant has
// credentials configured here, agency-scoped flows should prefer these over the
// global SaaS-admin config. Stored as a single row per tenant.
export const tenantPaymentGatewayConfig = pgTable("tenant_payment_gateway_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().unique(),
  provider: text("provider").notNull().default("cashfree"),
  mode: text("mode").notNull().default("test"), // "test" | "live"
  apiVersion: text("api_version").notNull().default("2023-08-01"),
  testClientId: text("test_client_id"),
  testClientSecret: text("test_client_secret"),
  liveClientId: text("live_client_id"),
  liveClientSecret: text("live_client_secret"),
  webhookSecret: text("webhook_secret"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertTenantPaymentGatewayConfigSchema = createInsertSchema(tenantPaymentGatewayConfig).omit({ id: true, updatedAt: true });
export type InsertTenantPaymentGatewayConfig = z.infer<typeof insertTenantPaymentGatewayConfigSchema>;
export type TenantPaymentGatewayConfig = typeof tenantPaymentGatewayConfig.$inferSelect;

// ── Per-Tenant SMS Config (MessageCentral) ───────────────────────────────────
// Per-agency MessageCentral credentials for sending OTP / transactional SMS to
// the agency's own customers (separate from the global SaaS-level SMS config).
export const tenantSmsConfig = pgTable("tenant_sms_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().unique(),
  provider: text("provider").notNull().default("messagecentral"),
  mcCustomerId: text("mc_customer_id"),
  mcAuthToken: text("mc_auth_token"),
  senderId: text("sender_id"),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertTenantSmsConfigSchema = createInsertSchema(tenantSmsConfig).omit({ id: true, updatedAt: true });
export type InsertTenantSmsConfig = z.infer<typeof insertTenantSmsConfigSchema>;
export type TenantSmsConfig = typeof tenantSmsConfig.$inferSelect;

// ===== Accounting =====
// All monetary values are stored as INTEGER CENTS for precision.
// e.g. $200.50 -> 20050

// Per-tenant fee catalog. Each row is a fee preset for a (country, visaType) combo.
export const feeTemplates = pgTable("fee_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  name: text("name").notNull(),
  destinationCountry: text("destination_country"),
  destinationCountries: text("destination_countries").array(),
  visaType: text("visa_type"),
  agencyFee: integer("agency_fee").notNull().default(0),
  governmentFee: integer("government_fee").notNull().default(0),
  serviceFee: integer("service_fee").notNull().default(0),
  otherFee: integer("other_fee").notNull().default(0),
  otherFeeLabel: text("other_fee_label"),
  currency: text("currency").notNull().default("USD"),
  defaultPaymentType: text("default_payment_type").notNull().default("upfront"),
  // upfront | advance | installments | on_completion
  advancePercent: integer("advance_percent").default(50),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertFeeTemplateSchema = createInsertSchema(feeTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFeeTemplate = z.infer<typeof insertFeeTemplateSchema>;
export type FeeTemplate = typeof feeTemplates.$inferSelect;

// Per-tenant invoice settings (one row per tenant)
export const invoiceSettings = pgTable("invoice_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().unique(),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),
  taxId: text("tax_id"),
  logoUrl: text("logo_url"),
  invoiceAccentColor: text("invoice_accent_color"),
  currency: text("currency").notNull().default("USD"),
  taxRate: integer("tax_rate").notNull().default(0), // basis points (e.g. 1800 = 18%)
  taxLabel: text("tax_label").default("Tax"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  paymentTerms: text("payment_terms").default("Due on receipt"),
  paymentInstructions: text("payment_instructions"),
  bankDetails: text("bank_details"),
  footerText: text("footer_text"),
  notes: text("notes"),
  // GST (India) fields
  gstEnabled: boolean("gst_enabled").notNull().default(false),
  gstin: text("gstin"), // 15-char GSTIN of the agency
  gstStateCode: text("gst_state_code"), // 2-digit Indian state code (e.g. "27" for Maharashtra)
  gstStateName: text("gst_state_name"),
  gstLegalName: text("gst_legal_name"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertInvoiceSettingsSchema = createInsertSchema(invoiceSettings).omit({ id: true, updatedAt: true });
export type InsertInvoiceSettings = z.infer<typeof insertInvoiceSettingsSchema>;
export type InvoiceSettings = typeof invoiceSettings.$inferSelect;

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  caseId: varchar("case_id"),
  leadId: varchar("lead_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  destinationCountry: text("destination_country"),
  visaType: text("visa_type"),
  status: text("status").notNull().default("draft"),
  // draft | sent | partial | paid | overdue | cancelled
  paymentType: text("payment_type").notNull().default("upfront"),
  // upfront | advance | installments | on_completion
  advancePercent: integer("advance_percent"),
  subtotal: integer("subtotal").notNull().default(0),
  taxAmount: integer("tax_amount").notNull().default(0),
  // GST split (in cents). All zero for non-GST invoices.
  cgstAmount: integer("cgst_amount").notNull().default(0),
  sgstAmount: integer("sgst_amount").notNull().default(0),
  igstAmount: integer("igst_amount").notNull().default(0),
  total: integer("total").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  // GST customer / place of supply
  customerGstin: text("customer_gstin"),
  placeOfSupplyCode: text("place_of_supply_code"), // 2-digit Indian state code
  placeOfSupplyName: text("place_of_supply_name"),
  reverseCharge: boolean("reverse_charge").notNull().default(false),
  issuedAt: timestamp("issued_at").defaultNow(),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Invoice line items
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("agency_fee"),
  // agency_fee | government_fee | service_charge | other | discount
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0),
  amount: integer("amount").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  // GST: HSN/SAC code and per-line tax rate (basis points)
  hsnCode: text("hsn_code"),
  taxRate: integer("tax_rate").notNull().default(0),
  // Whether this line is subject to tax. Government fees (passport/visa fees
  // collected on behalf of consulates) are typically NOT taxable; setting this
  // to false forces the line's tax contribution to 0 regardless of taxRate or
  // the global GST/flat-tax setting.
  taxable: boolean("taxable").notNull().default(true),
});
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// Payments against invoices
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("cash"),
  // cash | card | bank_transfer | online | other
  reference: text("reference"),
  paidAt: timestamp("paid_at").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
