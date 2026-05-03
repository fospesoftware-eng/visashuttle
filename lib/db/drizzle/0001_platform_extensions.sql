CREATE TABLE IF NOT EXISTS "support_tickets" (
"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"tenant_id" varchar NOT NULL,
"subject" text NOT NULL,
"category" text DEFAULT 'other' NOT NULL,
"status" text DEFAULT 'open' NOT NULL,
"priority" text DEFAULT 'normal' NOT NULL,
"created_by_user_id" varchar NOT NULL,
"assigned_to_user_id" varchar,
"last_message_at" timestamp DEFAULT now(),
"last_message_by" text,
"created_at" timestamp DEFAULT now(),
"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"ticket_id" varchar NOT NULL,
"author_user_id" varchar NOT NULL,
"author_role" text NOT NULL,
"author_name" text,
"body" text NOT NULL,
"internal_note" boolean DEFAULT false NOT NULL,
"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_subscriptions" (
"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"tenant_id" varchar NOT NULL,
"plan" text DEFAULT 'starter' NOT NULL,
"status" text DEFAULT 'trialing' NOT NULL,
"monthly_price_cents" integer DEFAULT 0 NOT NULL,
"currency" text DEFAULT 'INR' NOT NULL,
"trial_ends_at" timestamp,
"current_period_start" timestamp,
"current_period_end" timestamp,
"canceled_at" timestamp,
"notes" text,
"created_at" timestamp DEFAULT now(),
"updated_at" timestamp DEFAULT now(),
CONSTRAINT "tenant_subscriptions_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_subscription_invoices" (
"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
"tenant_id" varchar NOT NULL,
"subscription_id" varchar NOT NULL,
"amount_cents" integer NOT NULL,
"currency" text DEFAULT 'INR' NOT NULL,
"status" text DEFAULT 'pending' NOT NULL,
"period_start" timestamp,
"period_end" timestamp,
"cashfree_order_id" text,
"cashfree_payment_id" text,
"paid_at" timestamp,
"created_at" timestamp DEFAULT now()
);
