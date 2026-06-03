ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "activities" text[],
  ADD COLUMN IF NOT EXISTS "address" text,
  ADD COLUMN IF NOT EXISTS "country" text,
  ADD COLUMN IF NOT EXISTS "pin_code" text,
  ADD COLUMN IF NOT EXISTS "state" text,
  ADD COLUMN IF NOT EXISTS "district" text,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
