ALTER TABLE "tenant_subscription_invoices"
  ADD COLUMN IF NOT EXISTS "paypal_order_id" text,
  ADD COLUMN IF NOT EXISTS "paypal_capture_id" text;

CREATE TABLE IF NOT EXISTS "contacts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "source" text DEFAULT 'website',
  "page_url" text,
  "message" text,
  "status" text DEFAULT 'new' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);
