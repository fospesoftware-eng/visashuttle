import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Granular permission flags for agency team members. The agency owner always
// has every permission implicitly; for staff/managers these checkboxes drive
// what they can see and do in the dashboard. Persisted as `users.permissions`
// (text array) so we can grow the list without another migration.
export const AGENCY_PERMISSIONS = [
  "leads",       // Manage leads pipeline
  "cases",       // Create and manage applications
  "documents",   // Upload / review documents
  "accounting",  // Invoices, payments, fee templates
  "analytics",   // Reports and analytics
  "team",        // Invite / manage team members (manager+ only)
  "settings",    // Edit agency settings (manager+ only)
] as const;
export type AgencyPermission = typeof AGENCY_PERMISSIONS[number];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("customer"), // saas_admin, agency_owner, agency_manager, agency_staff, customer
  tenantId: varchar("tenant_id"),
  avatarUrl: text("avatar_url"),
  // Granular checkbox permissions (see AGENCY_PERMISSIONS). Empty array means
  // the user has no extra permissions beyond the implicit ones for their role.
  // The agency owner is treated as having every permission regardless of this.
  permissions: text("permissions").array().default(sql`'{}'::text[]`),
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

// Proposals table — a shareable, tokenized invitation that the agency sends
// to a prospective applicant. The customer opens the URL (or scans the QR
// code on the printed/emailed proposal) and lands on a tenant-branded apply
// page that shows the required-document checklist for the chosen visa and
// lets them submit their application without first creating an account. The
// submission becomes a regular Case under the tenant.
export const PROPOSAL_STATUSES = ["sent", "viewed", "applied", "expired", "revoked"] as const;
export type ProposalStatus = typeof PROPOSAL_STATUSES[number];

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  // URL-safe random token used in the public /p/:token link + QR code.
  // Must be unique across the tenant; the public route uses it as the only
  // identifier so it must be unguessable (we generate 24 chars of urlsafe).
  token: text("token").notNull().unique(),
  // Team member who created this proposal — also becomes assignedTo on the
  // case when the customer submits. Required (matches lead/case rule).
  createdBy: varchar("created_by").notNull(),
  // Optional link back to the originating lead so the agency can track
  // proposal → application conversion on the lead.
  leadId: varchar("lead_id"),
  // Customer details the agency knows up-front. The applicant can override
  // some of these (name, email, phone) on the apply form.
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  destinationCountry: text("destination_country").notNull(),
  visaType: text("visa_type").notNull(),
  // Optional message from the agency shown above the checklist.
  notes: text("notes"),
  // Optional upfront estimate (smallest currency unit — cents/paise).
  // When > 0, the public apply page shows a "Pay estimate" CTA after submit
  // that creates a draft invoice for this amount and redirects the customer
  // to the public invoice payment page.
  estimateAmountCents: integer("estimate_amount_cents"),
  status: text("status").notNull().default("sent"), // see PROPOSAL_STATUSES
  expiresAt: timestamp("expires_at"),
  // Set once the customer submits via the apply form. Lets the agency click
  // through from the proposal to the resulting case.
  appliedCaseId: varchar("applied_case_id"),
  appliedAt: timestamp("applied_at"),
  viewedAt: timestamp("viewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true, createdAt: true, updatedAt: true, appliedCaseId: true, appliedAt: true, viewedAt: true,
});
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

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
  // --- Visa workflow (post-submission) ---
  // How the application is being lodged with the destination authority.
  // null until the wizard's last step assigns one.
  submissionMethod: text("submission_method"), // evisa | embassy | vfs
  // Top-level visa-stage bucket the case sits in for the Visa module pages.
  // "not_started" = still being prepared (drafts/pending); "processing"
  // begins once the application is submitted to the embassy/VFS/eVisa portal.
  visaStage: text("visa_stage").notNull().default("not_started"), // not_started | processing | approved | rejected
  // Granular processing sub-status — only meaningful when visaStage = "processing".
  visaProcessingStatus: text("visa_processing_status"),
  // Free-form note (e.g. which documents are still needed) shown alongside
  // the status in the Visa module list. Set whenever the agency updates the
  // sub-status from the dropdown.
  visaStatusComment: text("visa_status_comment"),
  visaStatusUpdatedAt: timestamp("visa_status_updated_at"),
  // Final approved visa document. Populated only after visaStage transitions
  // to "approved" — uploaded by the agency from the case-detail page. Stored
  // inline as a data URL for the in-memory demo (≤ 2 MB), matching how
  // appointment confirmation files work. In production this becomes a CDN URL.
  visaCopyFileUrl: text("visa_copy_file_url"),
  visaCopyFileName: text("visa_copy_file_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCaseSchema = createInsertSchema(cases).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;

// --- Visa workflow constants (shared between client + server) ---
export const SUBMISSION_METHODS = [
  { value: "evisa",   label: "eVisa (Online Portal)" },
  { value: "embassy", label: "Send to Embassy" },
  { value: "vfs",     label: "Through VFS Center" },
] as const;
export type SubmissionMethod = typeof SUBMISSION_METHODS[number]["value"];

export const VISA_STAGES = [
  { value: "not_started", label: "Not Started" },
  { value: "processing",  label: "Processing" },
  { value: "approved",    label: "Approved" },
  { value: "rejected",    label: "Rejected" },
] as const;
export type VisaStage = typeof VISA_STAGES[number]["value"];

// Granular processing-sub-status options shown in the Visa → Processing page.
// Order matters — this is roughly the chronological flow.
export const VISA_PROCESSING_STATUSES = [
  { value: "submitted_evisa",            label: "Submitted to eVisa Portal" },
  { value: "submitted_embassy",          label: "Submitted to Embassy" },
  { value: "vfs_appointment_pending",    label: "VFS Appointment Pending" },
  { value: "vfs_appointment_completed",  label: "VFS Appointment Completed" },
  { value: "biometric_pending",          label: "Biometric Pending" },
  { value: "biometric_completed",        label: "Biometric Completed" },
  { value: "waiting_documents",          label: "Waiting for More Documents" },
  { value: "application_delayed",        label: "Application Delayed" },
  { value: "passport_sent_collection",   label: "Passport Sent for Collection" },
  { value: "passport_received",          label: "Passport Received" },
] as const;
export type VisaProcessingStatus = typeof VISA_PROCESSING_STATUSES[number]["value"];

// =====================================================================
// APPOINTMENTS — bookings tied to a visa application case
//
// A case can have any number of appointments (e.g. biometric + collection
// + interview), each either at an embassy/consulate/high commission OR
// through a 3rd-party visa application centre (VFS, BLS, etc).
// Appointments power the new "Appointments" phase of the application.
// =====================================================================
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  // Top-level kind drives which provider list to show in the UI.
  appointmentType: text("appointment_type").notNull(), // embassy_consulate | vfs | bls | other
  // Specific embassy/consulate/centre name. Free text so agents can pick
  // from the suggested list OR type a custom one (small countries / new centres).
  provider: text("provider").notNull(),
  // City / location of the appointment. Optional for embassy if the embassy
  // name already contains the city (e.g. "French Embassy - New Delhi").
  location: text("location"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  // Confirmation upload — stored as a data URL for the in-memory demo so
  // it round-trips end-to-end without needing object storage. In production
  // this becomes a regular CDN URL.
  confirmationFileUrl: text("confirmation_file_url"),
  confirmationFileName: text("confirmation_file_name"),
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"), // scheduled | completed | rescheduled | cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export const APPOINTMENT_TYPES = [
  { value: "embassy_consulate", label: "Embassy / Consulate / High Commission" },
  { value: "vfs",   label: "VFS Global" },
  { value: "bls",   label: "BLS International" },
  { value: "other", label: "Other 3rd Party" },
] as const;
export type AppointmentType = typeof APPOINTMENT_TYPES[number]["value"];

export const APPOINTMENT_STATUSES = [
  { value: "scheduled",   label: "Scheduled" },
  { value: "completed",   label: "Completed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled",   label: "Cancelled" },
] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number]["value"];

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

// --- Passport library (customer-owned, reusable across applications) ---
// A passport here is a first-class entity owned by a customer rather than a
// snapshot embedded in a single case. The same row can be reused across
// every future application — that's the whole point ("master database").
// Co-travellers' passports (spouse, kids, parents) also live in this library
// under the same customer, distinguished by `holderName`/`relationship`,
// so an agency can prep an entire family from one customer record.
export const PASSPORT_RELATIONSHIPS = [
  "self", "spouse", "child", "parent", "sibling", "partner", "relative", "other",
] as const;
export type PassportRelationship = typeof PASSPORT_RELATIONSHIPS[number];

export const passports = pgTable("passports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerAccountId: varchar("customer_account_id").notNull(),
  tenantId: varchar("tenant_id").notNull(),
  // Whose passport this is. holderName is what the agency types in
  // ("John Smith", "Tom Jr."); relationship is the structured tag.
  holderName: text("holder_name"),
  relationship: text("relationship").default("self"), // see PASSPORT_RELATIONSHIPS
  isPrimary: boolean("is_primary").default(false),    // customer's main passport
  // Passport bio-page fields (same shape as we used to keep on cases).
  passportSurname: text("passport_surname"),
  passportGivenName: text("passport_given_name"),
  passportMiddleName: text("passport_middle_name"),
  passportNumber: text("passport_number"),
  passportNationality: text("passport_nationality"),
  passportGender: text("passport_gender"),
  passportDateOfBirth: text("passport_date_of_birth"),
  passportDateOfIssue: text("passport_date_of_issue"),
  passportDateOfExpiry: text("passport_date_of_expiry"),
  passportPlaceOfIssue: text("passport_place_of_issue"),
  passportPlaceOfBirth: text("passport_place_of_birth"),
  passportFileUrl: text("passport_file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPassportSchema = createInsertSchema(passports).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertPassport = z.infer<typeof insertPassportSchema>;
export type Passport = typeof passports.$inferSelect;

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

// OTP Codes table — exactly one of `email` or `phone` is set (the identifier
// the customer signed in with). Both nullable so a single table can serve
// either flow on the white-label customer portal.
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  phone: text("phone"),
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
  // UPI (India) — used by the public payment page's "Pay Offline" tab.
  // upiId is the agency's VPA (e.g. "myagency@hdfcbank"); upiQrFileUrl is
  // an optional QR-image data URL the customer can scan from any UPI app.
  upiId: text("upi_id"),
  upiQrFileUrl: text("upi_qr_file_url"),
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
  // Public, unguessable token used by the customer-facing payment page
  // (`/pay/invoice/:token`). Generated lazily the first time the agency
  // clicks "Share payment link". Distinct from the invoice ID so the ID
  // cannot leak via the share URL.
  publicToken: text("public_token"),
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
  // cash | card | bank_transfer | upi | gateway | other
  // (`gateway` is auto-recorded when an online payment-link redemption
  // succeeds; `upi` is the offline UPI transfer flow.)
  reference: text("reference"),
  paidAt: timestamp("paid_at").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Shared payment-method enum used by both the agency UI dropdown and the
// server's runtime validator. Adding a new method here automatically widens
// both ends.
export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "upi",           label: "UPI" },
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card" },
  { value: "gateway",       label: "Online (Gateway)" },
  { value: "other",         label: "Other" },
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];

// ===== Agency API Platform =====
// Per-call paid public APIs (Deep Check, Visa Requirement) that agencies can
// resell. All money fields are integer cents. The Anthropic call is masked
// behind these endpoints; clients see only VisaShuttle-shaped JSON.

// Two endpoint slugs we expose & price independently.
export const API_ENDPOINTS = ["deep-check", "visa-requirements"] as const;
export type ApiEndpointSlug = typeof API_ENDPOINTS[number];

// Tenant-owned API keys. The plaintext secret is shown ONCE on creation;
// we only persist its sha256 hash plus an indexed prefix used for lookup.
// `parentTenantId` is set when the key is minted by a reseller for one of
// its sub-tenants.
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  parentTenantId: varchar("parent_tenant_id"),
  name: text("name").notNull(),
  prefix: varchar("prefix", { length: 16 }).notNull().unique(),
  hashedSecret: text("hashed_secret").notNull(),
  scopes: text("scopes").array().notNull().default(sql`ARRAY[]::text[]`),
  status: text("status").notNull().default("active"), // active | revoked
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Per-call audit log. One row per attempted API call (success or paid failure).
export const apiUsage = pgTable("api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  apiKeyId: varchar("api_key_id").notNull(),
  endpoint: text("endpoint").notNull(),
  status: integer("status").notNull(),
  costCents: integer("cost_cents").notNull().default(0),
  latencyMs: integer("latency_ms").notNull().default(0),
  errorCode: text("error_code"),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({ id: true, createdAt: true });
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
export type ApiUsage = typeof apiUsage.$inferSelect;

// Platform-wide (admin-controlled) per-call price for each endpoint, in cents.
export const apiPricing = pgTable("api_pricing", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertApiPricingSchema = createInsertSchema(apiPricing).omit({ id: true, updatedAt: true });
export type InsertApiPricing = z.infer<typeof insertApiPricingSchema>;
export type ApiPricing = typeof apiPricing.$inferSelect;

// One wallet per tenant. `balanceCents` is the source of truth and is
// updated transactionally alongside ledger inserts.
export const tenantWallet = pgTable("tenant_wallet", {
  tenantId: varchar("tenant_id").primaryKey(),
  balanceCents: integer("balance_cents").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertTenantWalletSchema = createInsertSchema(tenantWallet).omit({ updatedAt: true });
export type InsertTenantWallet = z.infer<typeof insertTenantWalletSchema>;
export type TenantWallet = typeof tenantWallet.$inferSelect;

// Append-only ledger of every wallet movement: top-up, debit, refund,
// reseller commission credit. `amountCents` is signed (+ credit, − debit).
export const tenantWalletLedger = pgTable("tenant_wallet_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  balanceAfterCents: integer("balance_after_cents").notNull(),
  type: text("type").notNull(), // topup | api_debit | api_refund | reseller_commission | adjustment
  reference: text("reference"),  // e.g. orderId / apiUsageId
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertTenantWalletLedgerSchema = createInsertSchema(tenantWalletLedger).omit({ id: true, createdAt: true });
export type InsertTenantWalletLedger = z.infer<typeof insertTenantWalletLedgerSchema>;
export type TenantWalletLedger = typeof tenantWalletLedger.$inferSelect;

// Reseller link: parent (reseller) tenant earns a fixed per-call commission
// for every paid call made under any apiKey owned by `childTenantId`.
export const resellerLinks = pgTable("reseller_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  parentTenantId: varchar("parent_tenant_id").notNull(),
  childTenantId: varchar("child_tenant_id").notNull().unique(),
  commissionCents: integer("commission_cents").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertResellerLinkSchema = createInsertSchema(resellerLinks).omit({ id: true, createdAt: true });
export type InsertResellerLink = z.infer<typeof insertResellerLinkSchema>;
export type ResellerLink = typeof resellerLinks.$inferSelect;

// ─── Platform admin roles ──────────────────────────────────────────────────────
// In addition to the existing `saas_admin` super-role, the platform supports
// granular admin roles for the support / finance / read-only personas. These
// are stored in users.role just like saas_admin and have NO tenantId.
export const PLATFORM_ROLES = [
  "saas_admin",         // full superuser
  "platform_finance",   // finance ops: view + invoice/payment/wallet/subscription writes
  "platform_support",   // support ops: tickets + read most things
  "platform_readonly",  // audit / observers: read everything, no writes
] as const;
export type PlatformRole = typeof PLATFORM_ROLES[number];

// ─── Support tickets ───────────────────────────────────────────────────────────
// Agencies open tickets to the platform. Each ticket has a thread of messages
// (author = agency user OR platform admin) and a status workflow:
//   open → pending (admin replied, awaiting agency) → resolved → closed
export const SUPPORT_TICKET_STATUSES = ["open", "pending", "resolved", "closed"] as const;
export const SUPPORT_TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const SUPPORT_TICKET_CATEGORIES = ["billing", "technical", "account", "feature_request", "other"] as const;
export type SupportTicketStatus = typeof SUPPORT_TICKET_STATUSES[number];
export type SupportTicketPriority = typeof SUPPORT_TICKET_PRIORITIES[number];
export type SupportTicketCategory = typeof SUPPORT_TICKET_CATEGORIES[number];

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("other"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  assignedToUserId: varchar("assigned_to_user_id"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  lastMessageBy: text("last_message_by"), // "agency" | "admin"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true, createdAt: true, updatedAt: true, lastMessageAt: true, lastMessageBy: true, assignedToUserId: true,
});
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  authorUserId: varchar("author_user_id").notNull(),
  authorRole: text("author_role").notNull(), // "agency" | "admin"
  authorName: text("author_name"),
  body: text("body").notNull(),
  internalNote: boolean("internal_note").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSupportTicketMessageSchema = createInsertSchema(supportTicketMessages).omit({
  id: true, createdAt: true,
});
export type InsertSupportTicketMessage = z.infer<typeof insertSupportTicketMessageSchema>;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;

// ─── Tenant subscription billing ───────────────────────────────────────────────
// Tracks the agency's subscription to Visa Shuttle itself (separate from the
// per-call API wallet). Admin sets the plan and monthly price; the agency pays
// via Cashfree from their Settings → Subscription tab.
export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().unique(),
  plan: text("plan").notNull().default("starter"), // starter | professional | enterprise (mirrors tenants.plan)
  status: text("status").notNull().default("trialing"),
  monthlyPriceCents: integer("monthly_price_cents").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  trialEndsAt: timestamp("trial_ends_at"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;
export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;

export const tenantSubscriptionInvoices = pgTable("tenant_subscription_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  subscriptionId: varchar("subscription_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("pending"), // pending | paid | failed | void
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  cashfreeOrderId: text("cashfree_order_id"),
  cashfreePaymentId: text("cashfree_payment_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertTenantSubscriptionInvoiceSchema = createInsertSchema(tenantSubscriptionInvoices).omit({
  id: true, createdAt: true,
});
export type InsertTenantSubscriptionInvoice = z.infer<typeof insertTenantSubscriptionInvoiceSchema>;
export type TenantSubscriptionInvoice = typeof tenantSubscriptionInvoices.$inferSelect;
