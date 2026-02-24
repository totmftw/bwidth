-- Add missing enum values to booking_status and contract_status
-- Uses conditional blocks to avoid errors if values already exist

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'contracting'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')
  ) THEN
    ALTER TYPE "public"."booking_status" ADD VALUE 'contracting' AFTER 'negotiating';
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'admin_review'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'contract_status')
  ) THEN
    ALTER TYPE "public"."contract_status" ADD VALUE 'admin_review' AFTER 'signed_by_artist';
  END IF;
END $$;
