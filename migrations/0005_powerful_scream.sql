ALTER TABLE "booking_proposals" ADD COLUMN "submitted_by_role" text;--> statement-breakpoint
ALTER TABLE "booking_proposals" ADD COLUMN "step_number" integer;--> statement-breakpoint
ALTER TABLE "booking_proposals" ADD COLUMN "response_action" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "edit_phase" text DEFAULT 'organizer_review';--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "source_url" text;