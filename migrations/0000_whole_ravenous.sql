CREATE TYPE "public"."booking_status" AS ENUM('inquiry', 'offered', 'negotiating', 'contracting', 'confirmed', 'paid_deposit', 'scheduled', 'completed', 'cancelled', 'disputed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."contract_edit_status" AS ENUM('pending', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('draft', 'sent', 'signed_by_promoter', 'signed_by_artist', 'signed', 'voided', 'completed');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'investigating', 'resolved_refund', 'resolved_no_refund', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_say');--> statement-breakpoint
CREATE TYPE "public"."gst_registration_type" AS ENUM('registered', 'unregistered', 'composition', 'none');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('image', 'audio', 'video', 'document', 'other');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('initiated', 'authorized', 'captured', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('queued', 'processing', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('active', 'accepted', 'rejected', 'expired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."role_name" AS ENUM('artist', 'band_manager', 'promoter', 'organizer', 'venue_manager', 'admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."search_entity" AS ENUM('artist', 'venue', 'event', 'promoter', 'organizer');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('general', 'vip', 'reserved', 'earlybird', 'guestlist');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted', 'pending_verification');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "artist_genres" (
	"artist_id" integer NOT NULL,
	"genre_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"organization_id" integer,
	"name" text NOT NULL,
	"is_band" boolean DEFAULT false,
	"members" jsonb,
	"bio" text,
	"origin_city_id" integer,
	"base_location" jsonb,
	"price_from" numeric(12, 2),
	"price_to" numeric(12, 2),
	"currency" char(3) DEFAULT 'INR',
	"rating_avg" numeric(3, 2) DEFAULT '0',
	"rating_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"occurred_at" timestamp DEFAULT now(),
	"who" integer,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"diff" jsonb,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "auth_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"created_by" integer,
	"round" integer NOT NULL,
	"proposed_terms" jsonb NOT NULL,
	"reason_code" text,
	"note" text,
	"status" "proposal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"artist_id" integer,
	"stage_id" integer,
	"status" "booking_status" DEFAULT 'inquiry',
	"offer_amount" numeric(12, 2),
	"offer_currency" char(3) DEFAULT 'INR',
	"deposit_percent" numeric(5, 2) DEFAULT '30.00',
	"deposit_amount" numeric(12, 2),
	"final_amount" numeric(12, 2),
	"final_due_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"meta" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"city_id" serial PRIMARY KEY NOT NULL,
	"state_id" integer,
	"name" text NOT NULL,
	"lat" numeric,
	"lon" numeric
);
--> statement-breakpoint
CREATE TABLE "contract_edit_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"requested_by_role" text,
	"changes" jsonb NOT NULL,
	"note" text,
	"status" "contract_edit_status" DEFAULT 'pending' NOT NULL,
	"responded_by" integer,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"signature_data" text,
	"signature_type" text DEFAULT 'typed',
	"ip_address" text,
	"user_agent" text,
	"signed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"version" integer NOT NULL,
	"contract_text" text NOT NULL,
	"terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer,
	"version" integer DEFAULT 1,
	"status" "contract_status" DEFAULT 'draft',
	"contract_pdf" text,
	"contract_text" text,
	"signer_sequence" jsonb,
	"signed_by_promoter" boolean DEFAULT false,
	"signed_by_artist" boolean DEFAULT false,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"initiated_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"current_version" integer DEFAULT 1,
	"artist_edit_used" boolean DEFAULT false,
	"promoter_edit_used" boolean DEFAULT false,
	"artist_review_done_at" timestamp with time zone,
	"promoter_review_done_at" timestamp with time zone,
	"artist_accepted_at" timestamp with time zone,
	"promoter_accepted_at" timestamp with time zone,
	"artist_signed_at" timestamp with time zone,
	"promoter_signed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_workflow_instances" (
	"conversation_id" integer PRIMARY KEY NOT NULL,
	"workflow_key" text DEFAULT 'booking_negotiation_v1' NOT NULL,
	"current_node_key" text NOT NULL,
	"awaiting_user_id" integer,
	"awaiting_role" "role_name",
	"round" integer DEFAULT 0 NOT NULL,
	"max_rounds" integer DEFAULT 3 NOT NULL,
	"deadline_at" timestamp with time zone,
	"locked" boolean DEFAULT false NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text,
	"entity_type" text,
	"entity_id" integer,
	"conversation_type" text DEFAULT 'direct' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"country_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"iso2" char(2),
	"iso3" char(3),
	"currency_code" char(3)
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"currency_code" char(3) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text,
	"precision" smallint DEFAULT 2
);
--> statement-breakpoint
CREATE TABLE "event_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"name" text,
	"order_index" integer DEFAULT 0,
	"start_time" timestamp,
	"end_time" timestamp,
	"stage_plot" text,
	"capacity" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizer_id" integer,
	"venue_id" integer,
	"title" text NOT NULL,
	"slug" text,
	"description" text,
	"start_time" timestamp NOT NULL,
	"door_time" timestamp,
	"end_time" timestamp,
	"timezone" text DEFAULT 'Asia/Kolkata',
	"capacity_total" integer,
	"capacity_seated" integer,
	"currency" char(3) DEFAULT 'INR',
	"status" text DEFAULT 'draft',
	"visibility" "visibility" DEFAULT 'private',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"parent_id" integer,
	CONSTRAINT "genres_name_unique" UNIQUE("name"),
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "locales" (
	"locale_code" char(5) PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" integer,
	"entity_type" text,
	"entity_id" integer,
	"media_type" "media_type",
	"filename" text,
	"mime_type" text,
	"file_size" integer,
	"data" text,
	"alt_text" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer,
	"sender_id" integer,
	"body" text,
	"message_type" text DEFAULT 'text' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_msg_id" text,
	"workflow_node_key" text,
	"action_key" text,
	"round" integer,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now(),
	"edited_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"channel" "notification_channel",
	"title" text,
	"body" text,
	"entity_type" text,
	"entity_id" integer,
	"data" jsonb,
	"delivered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"org_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"website" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "promoters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"organization_id" integer,
	"name" text,
	"description" text,
	"contact_person" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer,
	"payer_id" integer,
	"payee_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"currency" char(3) DEFAULT 'INR',
	"payment_type" text,
	"status" "payment_status" DEFAULT 'initiated',
	"gateway" text,
	"gateway_transaction_id" text,
	"gateway_response" jsonb,
	"initiated_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"to_user_id" integer,
	"amount" numeric(14, 2) NOT NULL,
	"currency" char(3) DEFAULT 'INR',
	"status" "payout_status" DEFAULT 'queued',
	"provider_response" jsonb,
	"initiated_at" timestamp DEFAULT now(),
	"paid_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" "role_name" NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "states" (
	"state_id" serial PRIMARY KEY NOT NULL,
	"country_id" integer,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"description" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timezones" (
	"tz_name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"password_hash" text,
	"phone" text,
	"display_name" text,
	"first_name" text,
	"last_name" text,
	"gender" "gender",
	"date_of_birth" date,
	"status" "user_status" DEFAULT 'pending_verification',
	"locale" char(5),
	"currency" char(3) DEFAULT 'INR',
	"timezone" text DEFAULT 'Asia/Kolkata',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"organization_id" integer,
	"name" text NOT NULL,
	"slug" text,
	"description" text,
	"address" jsonb,
	"city_id" integer,
	"capacity" integer,
	"capacity_seated" integer,
	"capacity_standing" integer,
	"space_dimensions" jsonb,
	"amenities" jsonb,
	"timezone" text DEFAULT 'Asia/Kolkata',
	"rating_avg" numeric(3, 2) DEFAULT '0',
	"rating_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_origin_city_id_cities_city_id_fk" FOREIGN KEY ("origin_city_id") REFERENCES "public"."cities"("city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_currency_currencies_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("currency_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_who_users_id_fk" FOREIGN KEY ("who") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_providers" ADD CONSTRAINT "auth_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_proposals" ADD CONSTRAINT "booking_proposals_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_proposals" ADD CONSTRAINT "booking_proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_stage_id_event_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."event_stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offer_currency_currencies_currency_code_fk" FOREIGN KEY ("offer_currency") REFERENCES "public"."currencies"("currency_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("state_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_edit_requests" ADD CONSTRAINT "contract_edit_requests_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_edit_requests" ADD CONSTRAINT "contract_edit_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_edit_requests" ADD CONSTRAINT "contract_edit_requests_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_workflow_instances" ADD CONSTRAINT "conversation_workflow_instances_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_workflow_instances" ADD CONSTRAINT "conversation_workflow_instances_awaiting_user_id_users_id_fk" FOREIGN KEY ("awaiting_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_currency_code_currencies_currency_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("currency_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_stages" ADD CONSTRAINT "event_stages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_promoters_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."promoters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_timezone_timezones_tz_name_fk" FOREIGN KEY ("timezone") REFERENCES "public"."timezones"("tz_name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_currency_currencies_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("currency_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genres" ADD CONSTRAINT "genres_parent_id_genres_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promoters" ADD CONSTRAINT "promoters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promoters" ADD CONSTRAINT "promoters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payee_id_users_id_fk" FOREIGN KEY ("payee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_currencies_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("currency_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_currency_currencies_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("currency_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_countries_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("country_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_locale_locales_locale_code_fk" FOREIGN KEY ("locale") REFERENCES "public"."locales"("locale_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_currency_currencies_currency_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("currency_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_timezone_timezones_tz_name_fk" FOREIGN KEY ("timezone") REFERENCES "public"."timezones"("tz_name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_city_id_cities_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_timezone_timezones_tz_name_fk" FOREIGN KEY ("timezone") REFERENCES "public"."timezones"("tz_name") ON DELETE no action ON UPDATE no action;