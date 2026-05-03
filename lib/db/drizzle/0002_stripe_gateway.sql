ALTER TABLE "payment_gateway_config" ADD COLUMN IF NOT EXISTS "stripe_mode" text DEFAULT 'test' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payment_gateway_config" ADD COLUMN IF NOT EXISTS "stripe_test_publishable_key" text;
--> statement-breakpoint
ALTER TABLE "payment_gateway_config" ADD COLUMN IF NOT EXISTS "stripe_test_secret_key" text;
--> statement-breakpoint
ALTER TABLE "payment_gateway_config" ADD COLUMN IF NOT EXISTS "stripe_live_publishable_key" text;
--> statement-breakpoint
ALTER TABLE "payment_gateway_config" ADD COLUMN IF NOT EXISTS "stripe_live_secret_key" text;
--> statement-breakpoint
ALTER TABLE "payment_gateway_config" ADD COLUMN IF NOT EXISTS "stripe_webhook_secret" text;
--> statement-breakpoint
ALTER TABLE "tenant_subscription_invoices" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'cashfree' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenant_subscription_invoices" ADD COLUMN IF NOT EXISTS "stripe_session_id" text;
--> statement-breakpoint
ALTER TABLE "tenant_subscription_invoices" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;
