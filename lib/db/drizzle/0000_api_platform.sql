CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar,
	"user_id" varchar,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" varchar,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"parent_tenant_id" varchar,
	"name" text NOT NULL,
	"prefix" varchar(16) NOT NULL,
	"hashed_secret" text NOT NULL,
	"scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_keys_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
CREATE TABLE "api_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "api_pricing_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"api_key_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"status" integer NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"ip" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"appointment_type" text NOT NULL,
	"provider" text NOT NULL,
	"location" text,
	"scheduled_at" timestamp NOT NULL,
	"confirmation_file_url" text,
	"confirmation_file_name" text,
	"notes" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "b2c_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"free_checks_used" integer DEFAULT 0 NOT NULL,
	"subscription_plan" text DEFAULT 'free' NOT NULL,
	"check_limit" integer DEFAULT 1 NOT NULL,
	"deep_check_access" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "b2c_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "case_co_travellers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"dob" text,
	"relationship" text NOT NULL,
	"passport_number" text,
	"nationality" text,
	"passport_surname" text,
	"passport_given_name" text,
	"passport_middle_name" text,
	"passport_gender" text,
	"passport_date_of_issue" text,
	"passport_date_of_expiry" text,
	"passport_place_of_issue" text,
	"passport_place_of_birth" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"customer_id" varchar,
	"customer_account_id" varchar,
	"case_number" text NOT NULL,
	"reference_id" text NOT NULL,
	"applicant_name" text,
	"applicant_dob" text,
	"passport_surname" text,
	"passport_given_name" text,
	"passport_middle_name" text,
	"passport_number" text,
	"passport_nationality" text,
	"passport_gender" text,
	"passport_date_of_issue" text,
	"passport_date_of_expiry" text,
	"passport_place_of_issue" text,
	"passport_place_of_birth" text,
	"passport_file_url" text,
	"visa_type" text NOT NULL,
	"destination_country" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal',
	"assigned_to" varchar,
	"travel_date" timestamp,
	"notes" text,
	"readiness_score" integer DEFAULT 0,
	"submission_method" text,
	"visa_stage" text DEFAULT 'not_started' NOT NULL,
	"visa_processing_status" text,
	"visa_status_comment" text,
	"visa_status_updated_at" timestamp,
	"visa_copy_file_url" text,
	"visa_copy_file_name" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"name" text,
	"avatar_url" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customer_tenant_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_account_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"role" text DEFAULT 'customer',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"file_url" text,
	"quality_score" integer,
	"extracted_data" jsonb,
	"notes" text,
	"uploaded_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "fee_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"destination_country" text,
	"destination_countries" text[],
	"visa_type" text,
	"agency_fee" integer DEFAULT 0 NOT NULL,
	"government_fee" integer DEFAULT 0 NOT NULL,
	"service_fee" integer DEFAULT 0 NOT NULL,
	"other_fee" integer DEFAULT 0 NOT NULL,
	"other_fee_label" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"default_payment_type" text DEFAULT 'upfront' NOT NULL,
	"advance_percent" integer DEFAULT 50,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'agency_fee' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"hsn_code" text,
	"tax_rate" integer DEFAULT 0 NOT NULL,
	"taxable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"company_name" text,
	"company_address" text,
	"company_email" text,
	"company_phone" text,
	"tax_id" text,
	"logo_url" text,
	"invoice_accent_color" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"tax_rate" integer DEFAULT 0 NOT NULL,
	"tax_label" text DEFAULT 'Tax',
	"invoice_prefix" text DEFAULT 'INV' NOT NULL,
	"payment_terms" text DEFAULT 'Due on receipt',
	"payment_instructions" text,
	"bank_details" text,
	"upi_id" text,
	"upi_qr_file_url" text,
	"footer_text" text,
	"notes" text,
	"gst_enabled" boolean DEFAULT false NOT NULL,
	"gstin" text,
	"gst_state_code" text,
	"gst_state_name" text,
	"gst_legal_name" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invoice_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"invoice_number" text NOT NULL,
	"case_id" varchar,
	"lead_id" varchar,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"destination_country" text,
	"visa_type" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"payment_type" text DEFAULT 'upfront' NOT NULL,
	"advance_percent" integer,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"cgst_amount" integer DEFAULT 0 NOT NULL,
	"sgst_amount" integer DEFAULT 0 NOT NULL,
	"igst_amount" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"customer_gstin" text,
	"place_of_supply_code" text,
	"place_of_supply_name" text,
	"reverse_charge" boolean DEFAULT false NOT NULL,
	"issued_at" timestamp DEFAULT now(),
	"due_date" timestamp,
	"notes" text,
	"public_token" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"source" text,
	"destination_country" text,
	"visa_type" text,
	"stage" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"assigned_to" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"sender_role" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"code" text NOT NULL,
	"tenant_id" varchar NOT NULL,
	"attempts" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "passports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_account_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"holder_name" text,
	"relationship" text DEFAULT 'self',
	"is_primary" boolean DEFAULT false,
	"passport_surname" text,
	"passport_given_name" text,
	"passport_middle_name" text,
	"passport_number" text,
	"passport_nationality" text,
	"passport_gender" text,
	"passport_date_of_birth" text,
	"passport_date_of_issue" text,
	"passport_date_of_expiry" text,
	"passport_place_of_issue" text,
	"passport_place_of_birth" text,
	"passport_file_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_gateway_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'cashfree' NOT NULL,
	"mode" text DEFAULT 'test' NOT NULL,
	"api_version" text DEFAULT '2023-08-01' NOT NULL,
	"test_client_id" text,
	"test_client_secret" text,
	"live_client_id" text,
	"live_client_secret" text,
	"webhook_secret" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"tenant_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"reference" text,
	"paid_at" timestamp DEFAULT now(),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_ai_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"anthropic_api_key" text,
	"anthropic_model" text DEFAULT 'claude-opus-4-5',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"token" text NOT NULL,
	"created_by" varchar NOT NULL,
	"lead_id" varchar,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"destination_country" text NOT NULL,
	"visa_type" text NOT NULL,
	"notes" text,
	"estimate_amount_cents" integer,
	"status" text DEFAULT 'sent' NOT NULL,
	"expires_at" timestamp,
	"applied_case_id" varchar,
	"applied_at" timestamp,
	"viewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "proposals_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "reseller_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_tenant_id" varchar NOT NULL,
	"child_tenant_id" varchar NOT NULL,
	"commission_cents" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "reseller_links_child_tenant_id_unique" UNIQUE("child_tenant_id")
);
--> statement-breakpoint
CREATE TABLE "saved_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"full_name" text,
	"nationality" text,
	"date_of_birth" text,
	"gender" text,
	"marital_status" text,
	"country_of_residence" text,
	"passport_country" text,
	"employment_status" text,
	"job_title" text,
	"company_name" text,
	"years_in_job" text,
	"monthly_income" text,
	"source_of_income" text,
	"bank_balance" text,
	"trip_funding" text,
	"previous_travel" text,
	"countries_visited" text,
	"previous_visa_refusals" text,
	"has_passport" boolean DEFAULT false,
	"has_bank_statement" boolean DEFAULT false,
	"has_income_proof" boolean DEFAULT false,
	"has_tax_return" boolean DEFAULT false,
	"has_salary_slips" boolean DEFAULT false,
	"has_credit_card" boolean DEFAULT false,
	"has_property" boolean DEFAULT false,
	"family_in_home_country" boolean DEFAULT false,
	"property_in_home_country" boolean DEFAULT false,
	"months_in_current_residence" text,
	"monthly_expenses" text,
	"criminal_record" text,
	"immigration_violation" text,
	"financial_commitments_home" text,
	"dependents_home_country" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sms_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'messagecentral' NOT NULL,
	"msg91_auth_key" text,
	"msg91_template_id" text,
	"msg91_sender_id" text,
	"zavu_api_key" text,
	"mc_customer_id" text,
	"mc_auth_token" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_payment_gateway_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"provider" text DEFAULT 'cashfree' NOT NULL,
	"mode" text DEFAULT 'test' NOT NULL,
	"api_version" text DEFAULT '2023-08-01' NOT NULL,
	"test_client_id" text,
	"test_client_secret" text,
	"live_client_id" text,
	"live_client_secret" text,
	"webhook_secret" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_payment_gateway_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_sms_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"provider" text DEFAULT 'messagecentral' NOT NULL,
	"mc_customer_id" text,
	"mc_auth_token" text,
	"sender_id" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_sms_config_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_wallet" (
	"tenant_id" varchar PRIMARY KEY NOT NULL,
	"balance_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_wallet_ledger" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"amount_cents" integer NOT NULL,
	"balance_after_cents" integer NOT NULL,
	"type" text NOT NULL,
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"plan" text DEFAULT 'starter' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"primary_color" text DEFAULT '#00B4D8',
	"secondary_color" text DEFAULT '#E056A0',
	"accent_color" text DEFAULT '#0096C7',
	"contact_email" text,
	"contact_phone" text,
	"whatsapp_number" text,
	"show_powered_by" boolean DEFAULT true,
	"auth_method" text DEFAULT 'otp',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"tenant_id" varchar,
	"avatar_url" text,
	"permissions" text[] DEFAULT '{}'::text[],
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visa_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"check_type" text DEFAULT 'basic' NOT NULL,
	"form_data" jsonb NOT NULL,
	"ai_provider" text DEFAULT 'mock' NOT NULL,
	"approval_chance" integer,
	"status_label" text,
	"ai_response" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "visa_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country" text NOT NULL,
	"visa_type" text NOT NULL,
	"requirements" jsonb NOT NULL,
	"processing_time" text,
	"fees" text,
	"notes" text,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
