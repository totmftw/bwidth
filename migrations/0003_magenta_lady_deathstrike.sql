CREATE TYPE "public"."artist_category" AS ENUM('budding', 'mid_scale', 'international', 'custom');--> statement-breakpoint
CREATE TYPE "public"."artist_category_source" AS ENUM('auto', 'manual', 'override');--> statement-breakpoint
CREATE TABLE "artist_category_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_id" integer NOT NULL,
	"old_category" text,
	"new_category" text,
	"reason" text,
	"changed_by" integer,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commission_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"artist_category" "artist_category" NOT NULL,
	"artist_pct" numeric(5, 2) NOT NULL,
	"organizer_pct" numeric(5, 2) NOT NULL,
	"platform_pct_total" numeric(5, 2) NOT NULL,
	"min_artist_guarantee" numeric(12, 2),
	"active" boolean DEFAULT true,
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	CONSTRAINT "commission_policies_artist_category_unique" UNIQUE("artist_category")
);
--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "artist_category" "artist_category";--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "artist_category_source" "artist_category_source";--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "artist_category_locked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "artist_category_assigned_at" timestamp;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "artist_category_assigned_by" integer;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "artist_category_notes" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "commission_override_artist_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "commission_override_organizer_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "minimum_guaranteed_earnings" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "category_valid_from" timestamp;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "category_valid_to" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "gross_booking_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "artist_fee" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "organizer_fee" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "artist_commission_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "organizer_commission_pct" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "platform_revenue" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "artist_category_snapshot" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "trust_tier_snapshot" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contract_id" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "artist_signature_ip" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "promoter_signature_ip" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "artist_category_snapshot" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "trust_score_snapshot" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "commission_breakdown_json" jsonb;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "negotiated_terms_json" jsonb;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "clause_version" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "template_version" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "organizer_signature_required" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "artist_signature_required" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "cancellation_policy_version" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permanent_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pan_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gstin" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_account_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_ifsc" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_branch" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_account_holder_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "emergency_contact_phone" text;--> statement-breakpoint
ALTER TABLE "artist_category_history" ADD CONSTRAINT "artist_category_history_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_category_history" ADD CONSTRAINT "artist_category_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_artist_category_assigned_by_users_id_fk" FOREIGN KEY ("artist_category_assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;