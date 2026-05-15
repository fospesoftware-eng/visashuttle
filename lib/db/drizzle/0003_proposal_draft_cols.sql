ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "customer_draft_data" jsonb;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "customer_draft_saved_at" timestamp;
