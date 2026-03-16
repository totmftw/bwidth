ALTER TYPE "public"."role_name" ADD VALUE 'platform_admin' BEFORE 'staff';--> statement-breakpoint
CREATE TABLE "temporary_venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"maps_link" text,
	"directions" text,
	"landmark" text,
	"contact_name" text,
	"contact_phone" text,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "contract_edit_requests" ADD COLUMN "response_note" text;--> statement-breakpoint
ALTER TABLE "contract_edit_requests" ADD COLUMN "resulting_version" integer;--> statement-breakpoint
ALTER TABLE "contract_edit_requests" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "contract_versions" ADD COLUMN "change_summary" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "pdf_url" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "pdf_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "admin_reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "admin_reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "admin_review_note" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "admin_review_status" text;--> statement-breakpoint
ALTER TABLE "temporary_venues" ADD CONSTRAINT "temporary_venues_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_admin_reviewed_by_users_id_fk" FOREIGN KEY ("admin_reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;