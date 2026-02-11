-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION postgres;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP TYPE public.booking_status;

CREATE TYPE public.booking_status AS ENUM (
	'inquiry',
	'offered',
	'negotiating',
	'confirmed',
	'paid_deposit',
	'scheduled',
	'completed',
	'cancelled',
	'disputed',
	'refunded');

-- DROP TYPE public.contract_status;

CREATE TYPE public.contract_status AS ENUM (
	'draft',
	'sent',
	'signed_by_promoter',
	'signed_by_artist',
	'signed',
	'voided',
	'completed');

-- DROP TYPE public.dispute_status;

CREATE TYPE public.dispute_status AS ENUM (
	'open',
	'investigating',
	'resolved_refund',
	'resolved_no_refund',
	'escalated');

-- DROP TYPE public.gender;

CREATE TYPE public.gender AS ENUM (
	'male',
	'female',
	'other',
	'prefer_not_say');

-- DROP TYPE public.gst_registration_type;

CREATE TYPE public.gst_registration_type AS ENUM (
	'registered',
	'unregistered',
	'composition',
	'none');

-- DROP TYPE public.gtrgm;

CREATE TYPE public.gtrgm (
	INPUT = gtrgm_in,
	OUTPUT = gtrgm_out,
	ALIGNMENT = 4,
	STORAGE = plain,
	CATEGORY = U,
	DELIMITER = ',');

-- DROP TYPE public.invoice_status;

CREATE TYPE public.invoice_status AS ENUM (
	'draft',
	'issued',
	'paid',
	'overdue',
	'cancelled',
	'refunded');

-- DROP TYPE public.media_type;

CREATE TYPE public.media_type AS ENUM (
	'image',
	'audio',
	'video',
	'document',
	'other');

-- DROP TYPE public.notification_channel;

CREATE TYPE public.notification_channel AS ENUM (
	'in_app',
	'email',
	'sms',
	'push');

-- DROP TYPE public.payment_status;

CREATE TYPE public.payment_status AS ENUM (
	'initiated',
	'authorized',
	'captured',
	'failed',
	'refunded',
	'cancelled');

-- DROP TYPE public.payout_status;

CREATE TYPE public.payout_status AS ENUM (
	'queued',
	'processing',
	'paid',
	'failed',
	'cancelled');

-- DROP TYPE public.role_name;

CREATE TYPE public.role_name AS ENUM (
	'artist',
	'band_manager',
	'promoter',
	'organizer',
	'venue_manager',
	'admin',
	'staff');

-- DROP TYPE public.search_entity;

CREATE TYPE public.search_entity AS ENUM (
	'artist',
	'venue',
	'event',
	'promoter',
	'organizer');

-- DROP TYPE public.ticket_type;

CREATE TYPE public.ticket_type AS ENUM (
	'general',
	'vip',
	'reserved',
	'earlybird',
	'guestlist');

-- DROP TYPE public.user_status;

CREATE TYPE public.user_status AS ENUM (
	'active',
	'suspended',
	'deleted',
	'pending_verification');

-- DROP SEQUENCE public.audit_logs_id_seq;

CREATE SEQUENCE public.audit_logs_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.cities_city_id_seq;

CREATE SEQUENCE public.cities_city_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.countries_country_id_seq;

CREATE SEQUENCE public.countries_country_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.states_state_id_seq;

CREATE SEQUENCE public.states_state_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- public.analytics_events definition

-- Drop table

-- DROP TABLE public.analytics_events;

CREATE TABLE public.analytics_events (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_name text NULL,
	user_id uuid NULL,
	entity_type text NULL,
	entity_id uuid NULL,
	properties jsonb NULL,
	occurred_at timestamptz DEFAULT now() NULL,
	CONSTRAINT analytics_events_pkey PRIMARY KEY (id)
);


-- public.commission_rules definition

-- Drop table

-- DROP TABLE public.commission_rules;

CREATE TABLE public.commission_rules (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NULL,
	percentage numeric(5, 2) DEFAULT 10.00 NULL,
	fixed_amount numeric(12, 2) DEFAULT 0 NULL,
	applies_to text NULL,
	active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT commission_rules_pkey PRIMARY KEY (id)
);


-- public.conversations definition

-- Drop table

-- DROP TABLE public.conversations;

CREATE TABLE public.conversations (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	subject text NULL,
	created_at timestamptz DEFAULT now() NULL,
	metadata jsonb NULL,
	CONSTRAINT conversations_pkey PRIMARY KEY (id)
);


-- public.currencies definition

-- Drop table

-- DROP TABLE public.currencies;

CREATE TABLE public.currencies (
	currency_code bpchar(3) NOT NULL,
	"name" text NOT NULL,
	symbol text NULL,
	"precision" int2 DEFAULT 2 NULL,
	CONSTRAINT currencies_pkey PRIMARY KEY (currency_code)
);


-- public.equipment_inventories definition

-- Drop table

-- DROP TABLE public.equipment_inventories;

CREATE TABLE public.equipment_inventories (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	owner_type text NULL,
	owner_id uuid NULL,
	item_name text NOT NULL,
	quantity int4 DEFAULT 1 NULL,
	specs jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT equipment_inventories_pkey PRIMARY KEY (id)
);


-- public.feature_flags definition

-- Drop table

-- DROP TABLE public.feature_flags;

CREATE TABLE public.feature_flags (
	"name" text NOT NULL,
	enabled bool DEFAULT false NULL,
	config jsonb NULL,
	CONSTRAINT feature_flags_pkey PRIMARY KEY (name)
);


-- public.locales definition

-- Drop table

-- DROP TABLE public.locales;

CREATE TABLE public.locales (
	locale_code bpchar(5) NOT NULL,
	display_name text NOT NULL,
	CONSTRAINT locales_pkey PRIMARY KEY (locale_code)
);


-- public.payment_providers definition

-- Drop table

-- DROP TABLE public.payment_providers;

CREATE TABLE public.payment_providers (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	provider_config jsonb NULL,
	active bool DEFAULT true NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT payment_providers_pkey PRIMARY KEY (id)
);


-- public.roles definition

-- Drop table

-- DROP TABLE public.roles;

CREATE TABLE public.roles (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" public.role_name NOT NULL,
	description text NULL,
	CONSTRAINT roles_name_key UNIQUE (name),
	CONSTRAINT roles_pkey PRIMARY KEY (id)
);


-- public.search_index definition

-- Drop table

-- DROP TABLE public.search_index;

CREATE TABLE public.search_index (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	entity_type public.search_entity NOT NULL,
	entity_id uuid NOT NULL,
	tsv tsvector NULL,
	raw jsonb NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT search_index_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_search_index_tsv ON public.search_index USING gin (tsv);


-- public.system_settings definition

-- Drop table

-- DROP TABLE public.system_settings;

CREATE TABLE public.system_settings (
	"key" text NOT NULL,
	value jsonb NULL,
	description text NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);


-- public.tags definition

-- Drop table

-- DROP TABLE public.tags;

CREATE TABLE public.tags (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT tags_name_key UNIQUE (name),
	CONSTRAINT tags_pkey PRIMARY KEY (id)
);


-- public.timezones definition

-- Drop table

-- DROP TABLE public.timezones;

CREATE TABLE public.timezones (
	tz_name text NOT NULL,
	CONSTRAINT timezones_pkey PRIMARY KEY (tz_name)
);


-- public.webhooks definition

-- Drop table

-- DROP TABLE public.webhooks;

CREATE TABLE public.webhooks (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NULL,
	url text NOT NULL,
	secret text NULL,
	events _text NULL,
	active bool DEFAULT true NULL,
	last_status jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT webhooks_pkey PRIMARY KEY (id)
);


-- public.countries definition

-- Drop table

-- DROP TABLE public.countries;

CREATE TABLE public.countries (
	country_id serial4 NOT NULL,
	"name" text NOT NULL,
	iso2 bpchar(2) NULL,
	iso3 bpchar(3) NULL,
	currency_code bpchar(3) NULL,
	CONSTRAINT countries_pkey PRIMARY KEY (country_id),
	CONSTRAINT countries_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES public.currencies(currency_code)
);


-- public.entity_tags definition

-- Drop table

-- DROP TABLE public.entity_tags;

CREATE TABLE public.entity_tags (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	entity_type text NOT NULL,
	entity_id uuid NOT NULL,
	tag_id uuid NULL,
	CONSTRAINT entity_tags_entity_type_entity_id_tag_id_key UNIQUE (entity_type, entity_id, tag_id),
	CONSTRAINT entity_tags_pkey PRIMARY KEY (id),
	CONSTRAINT entity_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE
);


-- public.genres definition

-- Drop table

-- DROP TABLE public.genres;

CREATE TABLE public.genres (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	slug text NULL,
	parent_id uuid NULL,
	CONSTRAINT genres_name_key UNIQUE (name),
	CONSTRAINT genres_pkey PRIMARY KEY (id),
	CONSTRAINT genres_slug_key UNIQUE (slug),
	CONSTRAINT genres_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.genres(id)
);


-- public.states definition

-- Drop table

-- DROP TABLE public.states;

CREATE TABLE public.states (
	state_id serial4 NOT NULL,
	country_id int4 NULL,
	"name" text NOT NULL,
	CONSTRAINT states_pkey PRIMARY KEY (state_id),
	CONSTRAINT states_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(country_id)
);


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	username text NULL,
	email text NOT NULL,
	password_hash text NULL,
	phone text NULL,
	display_name text NULL,
	first_name text NULL,
	last_name text NULL,
	gender public.gender NULL,
	date_of_birth date NULL,
	status public.user_status DEFAULT 'pending_verification'::user_status NULL,
	locale bpchar(5) NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	timezone text DEFAULT 'Asia/Kolkata'::text NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_username_key UNIQUE (username),
	CONSTRAINT users_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT users_locale_fkey FOREIGN KEY (locale) REFERENCES public.locales(locale_code),
	CONSTRAINT users_timezone_fkey FOREIGN KEY (timezone) REFERENCES public.timezones(tz_name)
);

-- Table Triggers

create trigger audit_users after
insert
    or
delete
    or
update
    on
    public.users for each row execute function audit_trigger_fn();


-- public.api_keys definition

-- Drop table

-- DROP TABLE public.api_keys;

CREATE TABLE public.api_keys (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	"name" text NULL,
	key_hash text NOT NULL,
	scopes _text NULL,
	created_at timestamptz DEFAULT now() NULL,
	revoked_at timestamptz NULL,
	CONSTRAINT api_keys_pkey PRIMARY KEY (id),
	CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.audit_logs definition

-- Drop table

-- DROP TABLE public.audit_logs;

CREATE TABLE public.audit_logs (
	id bigserial NOT NULL,
	occurred_at timestamptz DEFAULT now() NULL,
	who uuid NULL,
	"action" text NOT NULL,
	entity_type text NULL,
	entity_id uuid NULL,
	diff jsonb NULL,
	context jsonb NULL,
	CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
	CONSTRAINT audit_logs_who_fkey FOREIGN KEY (who) REFERENCES public.users(id)
);


-- public.auth_providers definition

-- Drop table

-- DROP TABLE public.auth_providers;

CREATE TABLE public.auth_providers (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	provider text NOT NULL,
	provider_user_id text NOT NULL,
	"data" jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT auth_providers_pkey PRIMARY KEY (id),
	CONSTRAINT auth_providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.cities definition

-- Drop table

-- DROP TABLE public.cities;

CREATE TABLE public.cities (
	city_id serial4 NOT NULL,
	state_id int4 NULL,
	"name" text NOT NULL,
	lat float8 NULL,
	lon float8 NULL,
	CONSTRAINT cities_pkey PRIMARY KEY (city_id),
	CONSTRAINT cities_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(state_id)
);


-- public.conversation_participants definition

-- Drop table

-- DROP TABLE public.conversation_participants;

CREATE TABLE public.conversation_participants (
	conversation_id uuid NOT NULL,
	user_id uuid NOT NULL,
	joined_at timestamptz DEFAULT now() NULL,
	CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, user_id),
	CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
	CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.favorites definition

-- Drop table

-- DROP TABLE public.favorites;

CREATE TABLE public.favorites (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	subject_type text NOT NULL,
	subject_id uuid NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT favorites_pkey PRIMARY KEY (id),
	CONSTRAINT favorites_user_id_subject_type_subject_id_key UNIQUE (user_id, subject_type, subject_id),
	CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);


-- public.kyc_documents definition

-- Drop table

-- DROP TABLE public.kyc_documents;

CREATE TABLE public.kyc_documents (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	doc_type text NULL,
	doc_data bytea NULL,
	doc_meta jsonb NULL,
	submitted_at timestamptz DEFAULT now() NULL,
	verified bool DEFAULT false NULL,
	verified_by uuid NULL,
	verified_at timestamptz NULL,
	CONSTRAINT kyc_documents_pkey PRIMARY KEY (id),
	CONSTRAINT kyc_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
	CONSTRAINT kyc_documents_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id)
);


-- public.media definition

-- Drop table

-- DROP TABLE public.media;

CREATE TABLE public.media (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	owner_user_id uuid NULL,
	entity_type text NULL,
	entity_id uuid NULL,
	media_type public.media_type NULL,
	filename text NULL,
	mime_type text NULL,
	file_size int8 NULL,
	"data" bytea NULL,
	alt_text text NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	uploaded_at timestamptz DEFAULT now() NULL,
	CONSTRAINT media_pkey PRIMARY KEY (id),
	CONSTRAINT media_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_media_entity ON public.media USING btree (entity_type, entity_id);


-- public.messages definition

-- Drop table

-- DROP TABLE public.messages;

CREATE TABLE public.messages (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	conversation_id uuid NULL,
	sender_id uuid NULL,
	body text NULL,
	attachments jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	edited_at timestamptz NULL,
	CONSTRAINT messages_pkey PRIMARY KEY (id),
	CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE,
	CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);


-- public.notification_preferences definition

-- Drop table

-- DROP TABLE public.notification_preferences;

CREATE TABLE public.notification_preferences (
	user_id uuid NOT NULL,
	prefs jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id),
	CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);


-- public.notifications definition

-- Drop table

-- DROP TABLE public.notifications;

CREATE TABLE public.notifications (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	channel public.notification_channel NULL,
	title text NULL,
	body text NULL,
	entity_type text NULL,
	entity_id uuid NULL,
	"data" jsonb NULL,
	delivered bool DEFAULT false NULL,
	created_at timestamptz DEFAULT now() NULL,
	delivered_at timestamptz NULL,
	CONSTRAINT notifications_pkey PRIMARY KEY (id),
	CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);


-- public.organizations definition

-- Drop table

-- DROP TABLE public.organizations;

CREATE TABLE public.organizations (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	slug text NULL,
	description text NULL,
	website text NULL,
	created_by uuid NULL,
	created_at timestamptz DEFAULT now() NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT organizations_pkey PRIMARY KEY (id),
	CONSTRAINT organizations_slug_key UNIQUE (slug),
	CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);


-- public.payouts definition

-- Drop table

-- DROP TABLE public.payouts;

CREATE TABLE public.payouts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	to_user_id uuid NULL,
	amount numeric(14, 2) NOT NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	status public.payout_status DEFAULT 'queued'::payout_status NULL,
	provider_response jsonb NULL,
	initiated_at timestamptz DEFAULT now() NULL,
	paid_at timestamptz NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT payouts_pkey PRIMARY KEY (id),
	CONSTRAINT payouts_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT payouts_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id)
);


-- public.promoters definition

-- Drop table

-- DROP TABLE public.promoters;

CREATE TABLE public.promoters (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	organization_id uuid NULL,
	"name" text NULL,
	description text NULL,
	contact_person jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT promoters_pkey PRIMARY KEY (id),
	CONSTRAINT promoters_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL,
	CONSTRAINT promoters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);


-- public.reviews definition

-- Drop table

-- DROP TABLE public.reviews;

CREATE TABLE public.reviews (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	reviewer_id uuid NULL,
	subject_type text NOT NULL,
	subject_id uuid NOT NULL,
	rating_small int4 NULL,
	rating_details jsonb NULL,
	review_text text NULL,
	created_at timestamptz DEFAULT now() NULL,
	moderated bool DEFAULT false NULL,
	moderated_by uuid NULL,
	moderated_at timestamptz NULL,
	CONSTRAINT reviews_pkey PRIMARY KEY (id),
	CONSTRAINT reviews_rating_small_check CHECK (((rating_small >= 1) AND (rating_small <= 5))),
	CONSTRAINT reviews_moderated_by_fkey FOREIGN KEY (moderated_by) REFERENCES public.users(id),
	CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id)
);


-- public.rider_templates definition

-- Drop table

-- DROP TABLE public.rider_templates;

CREATE TABLE public.rider_templates (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	technical jsonb NULL,
	hospitality jsonb NULL,
	created_by uuid NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT rider_templates_pkey PRIMARY KEY (id),
	CONSTRAINT rider_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);


-- public.tax_profiles definition

-- Drop table

-- DROP TABLE public.tax_profiles;

CREATE TABLE public.tax_profiles (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	gst_number text NULL,
	registration_type public.gst_registration_type DEFAULT 'none'::gst_registration_type NULL,
	name_on_gst text NULL,
	address jsonb NULL,
	verified bool DEFAULT false NULL,
	verified_at timestamptz NULL,
	metadata jsonb NULL,
	CONSTRAINT tax_profiles_pkey PRIMARY KEY (id),
	CONSTRAINT tax_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);


-- public.user_roles definition

-- Drop table

-- DROP TABLE public.user_roles;

CREATE TABLE public.user_roles (
	user_id uuid NOT NULL,
	role_id uuid NOT NULL,
	assigned_at timestamptz DEFAULT now() NULL,
	CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
	CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE,
	CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.user_sessions definition

-- Drop table

-- DROP TABLE public.user_sessions;

CREATE TABLE public.user_sessions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	user_agent text NULL,
	ip_address inet NULL,
	created_at timestamptz DEFAULT now() NULL,
	expires_at timestamptz NULL,
	revoked_at timestamptz NULL,
	CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
	CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.venues definition

-- Drop table

-- DROP TABLE public.venues;

CREATE TABLE public.venues (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	organization_id uuid NULL,
	"name" text NOT NULL,
	slug text NULL,
	description text NULL,
	address jsonb NULL,
	city_id int4 NULL,
	capacity int4 NULL,
	capacity_seated int4 NULL,
	capacity_standing int4 NULL,
	space_dimensions jsonb NULL,
	amenities jsonb NULL,
	timezone text DEFAULT 'Asia/Kolkata'::text NULL,
	rating_avg numeric(3, 2) DEFAULT 0 NULL,
	rating_count int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT venues_pkey PRIMARY KEY (id),
	CONSTRAINT venues_slug_key UNIQUE (slug),
	CONSTRAINT venues_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(city_id),
	CONSTRAINT venues_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL,
	CONSTRAINT venues_timezone_fkey FOREIGN KEY (timezone) REFERENCES public.timezones(tz_name),
	CONSTRAINT venues_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);


-- public.artists definition

-- Drop table

-- DROP TABLE public.artists;

CREATE TABLE public.artists (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	organization_id uuid NULL,
	"name" text NOT NULL,
	is_band bool DEFAULT false NULL,
	members jsonb NULL,
	bio text NULL,
	origin_city_id int4 NULL,
	base_location jsonb NULL,
	price_from numeric(12, 2) NULL,
	price_to numeric(12, 2) NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	rating_avg numeric(3, 2) DEFAULT 0 NULL,
	rating_count int4 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT artists_pkey PRIMARY KEY (id),
	CONSTRAINT artists_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT artists_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL,
	CONSTRAINT artists_origin_city_id_fkey FOREIGN KEY (origin_city_id) REFERENCES public.cities(city_id),
	CONSTRAINT artists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_artists_metadata_gin ON public.artists USING gin (metadata);


-- public.events definition

-- Drop table

-- DROP TABLE public.events;

CREATE TABLE public.events (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	organizer_id uuid NULL,
	venue_id uuid NULL,
	title text NOT NULL,
	slug text NULL,
	description text NULL,
	start_time timestamptz NOT NULL,
	door_time timestamptz NULL,
	end_time timestamptz NULL,
	timezone text DEFAULT 'Asia/Kolkata'::text NULL,
	capacity_total int4 NULL,
	capacity_seated int4 NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	status text DEFAULT 'draft'::text NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT events_pkey PRIMARY KEY (id),
	CONSTRAINT events_slug_key UNIQUE (slug),
	CONSTRAINT events_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.promoters(id) ON DELETE SET NULL,
	CONSTRAINT events_timezone_fkey FOREIGN KEY (timezone) REFERENCES public.timezones(tz_name),
	CONSTRAINT events_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL
);
CREATE INDEX idx_events_metadata_gin ON public.events USING gin (metadata);
CREATE INDEX idx_events_start_time ON public.events USING btree (start_time);
CREATE INDEX idx_events_venue ON public.events USING btree (venue_id);


-- public.organization_members definition

-- Drop table

-- DROP TABLE public.organization_members;

CREATE TABLE public.organization_members (
	org_id uuid NOT NULL,
	user_id uuid NOT NULL,
	"role" text NULL,
	joined_at timestamptz DEFAULT now() NULL,
	CONSTRAINT organization_members_pkey PRIMARY KEY (org_id, user_id),
	CONSTRAINT organization_members_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE,
	CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.ticket_pools definition

-- Drop table

-- DROP TABLE public.ticket_pools;

CREATE TABLE public.ticket_pools (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NULL,
	ticket_type public.ticket_type NULL,
	"name" text NULL,
	price numeric(12, 2) NULL,
	currency bpchar(3) NULL,
	quantity int4 NULL,
	sold int4 DEFAULT 0 NULL,
	start_sale timestamptz NULL,
	end_sale timestamptz NULL,
	metadata jsonb NULL,
	CONSTRAINT ticket_pools_pkey PRIMARY KEY (id),
	CONSTRAINT ticket_pools_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT ticket_pools_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);


-- public.artist_genres definition

-- Drop table

-- DROP TABLE public.artist_genres;

CREATE TABLE public.artist_genres (
	artist_id uuid NOT NULL,
	genre_id uuid NOT NULL,
	CONSTRAINT artist_genres_pkey PRIMARY KEY (artist_id, genre_id),
	CONSTRAINT artist_genres_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE,
	CONSTRAINT artist_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE CASCADE
);


-- public.event_stages definition

-- Drop table

-- DROP TABLE public.event_stages;

CREATE TABLE public.event_stages (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NULL,
	"name" text NULL,
	order_index int4 DEFAULT 0 NULL,
	start_time timestamptz NULL,
	end_time timestamptz NULL,
	stage_plot bytea NULL,
	capacity int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT event_stages_pkey PRIMARY KEY (id),
	CONSTRAINT event_stages_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);


-- public.bookings definition

-- Drop table

-- DROP TABLE public.bookings;

CREATE TABLE public.bookings (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NULL,
	artist_id uuid NULL,
	stage_id uuid NULL,
	status public.booking_status DEFAULT 'inquiry'::booking_status NULL,
	offer_amount numeric(12, 2) NULL,
	offer_currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	deposit_percent numeric(5, 2) DEFAULT 30.00 NULL,
	deposit_amount numeric(12, 2) NULL,
	final_amount numeric(12, 2) NULL,
	final_due_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	meta jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT bookings_pkey PRIMARY KEY (id),
	CONSTRAINT bookings_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.artists(id) ON DELETE CASCADE,
	CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
	CONSTRAINT bookings_offer_currency_fkey FOREIGN KEY (offer_currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT bookings_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.event_stages(id) ON DELETE SET NULL
);
CREATE INDEX idx_bookings_artist ON public.bookings USING btree (artist_id);
CREATE INDEX idx_bookings_event ON public.bookings USING btree (event_id);

-- Table Triggers

create trigger audit_bookings after
insert
    or
delete
    or
update
    on
    public.bookings for each row execute function audit_trigger_fn();


-- public.contracts definition

-- Drop table

-- DROP TABLE public.contracts;

CREATE TABLE public.contracts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	booking_id uuid NULL,
	"version" int4 DEFAULT 1 NULL,
	status public.contract_status DEFAULT 'draft'::contract_status NULL,
	contract_pdf bytea NULL,
	contract_text text NULL,
	signer_sequence jsonb NULL,
	signed_by_promoter bool DEFAULT false NULL,
	signed_by_artist bool DEFAULT false NULL,
	signed_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT contracts_pkey PRIMARY KEY (id),
	CONSTRAINT contracts_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE
);

-- Table Triggers

create trigger audit_contracts after
insert
    or
delete
    or
update
    on
    public.contracts for each row execute function audit_trigger_fn();


-- public.disputes definition

-- Drop table

-- DROP TABLE public.disputes;

CREATE TABLE public.disputes (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	booking_id uuid NULL,
	raised_by uuid NULL,
	reason text NULL,
	evidence jsonb NULL,
	status public.dispute_status DEFAULT 'open'::dispute_status NULL,
	decision jsonb NULL,
	opened_at timestamptz DEFAULT now() NULL,
	resolved_at timestamptz NULL,
	metadata jsonb NULL,
	CONSTRAINT disputes_pkey PRIMARY KEY (id),
	CONSTRAINT disputes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
	CONSTRAINT disputes_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(id)
);

-- Table Triggers

create trigger audit_disputes after
insert
    or
delete
    or
update
    on
    public.disputes for each row execute function audit_trigger_fn();


-- public.escrow_accounts definition

-- Drop table

-- DROP TABLE public.escrow_accounts;

CREATE TABLE public.escrow_accounts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	booking_id uuid NULL,
	balance numeric(14, 2) DEFAULT 0 NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT escrow_accounts_pkey PRIMARY KEY (id),
	CONSTRAINT escrow_accounts_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
	CONSTRAINT escrow_accounts_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code)
);


-- public.tickets definition

-- Drop table

-- DROP TABLE public.tickets;

CREATE TABLE public.tickets (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	ticket_pool_id uuid NULL,
	purchaser_id uuid NULL,
	booking_id uuid NULL,
	seat_label text NULL,
	qr_code bytea NULL,
	issued_at timestamptz DEFAULT now() NULL,
	redeemed_at timestamptz NULL,
	status text DEFAULT 'active'::text NULL,
	CONSTRAINT tickets_pkey PRIMARY KEY (id),
	CONSTRAINT tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
	CONSTRAINT tickets_purchaser_id_fkey FOREIGN KEY (purchaser_id) REFERENCES public.users(id),
	CONSTRAINT tickets_ticket_pool_id_fkey FOREIGN KEY (ticket_pool_id) REFERENCES public.ticket_pools(id)
);


-- public.transactions definition

-- Drop table

-- DROP TABLE public.transactions;

CREATE TABLE public.transactions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	booking_id uuid NULL,
	event_id uuid NULL,
	user_id uuid NULL,
	provider_id uuid NULL,
	provider_txn_id text NULL,
	"type" text NOT NULL,
	amount numeric(14, 2) NOT NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	status public.payment_status DEFAULT 'initiated'::payment_status NULL,
	requested_at timestamptz DEFAULT now() NULL,
	processed_at timestamptz NULL,
	response jsonb NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	CONSTRAINT transactions_pkey PRIMARY KEY (id),
	CONSTRAINT transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL,
	CONSTRAINT transactions_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT transactions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL,
	CONSTRAINT transactions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.payment_providers(id),
	CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_transactions_booking ON public.transactions USING btree (booking_id);
CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);

-- Table Triggers

create trigger audit_transactions after
insert
    or
delete
    or
update
    on
    public.transactions for each row execute function audit_trigger_fn();


-- public.booking_history definition

-- Drop table

-- DROP TABLE public.booking_history;

CREATE TABLE public.booking_history (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	booking_id uuid NULL,
	status public.booking_status NULL,
	changed_by uuid NULL,
	note text NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT booking_history_pkey PRIMARY KEY (id),
	CONSTRAINT booking_history_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
	CONSTRAINT booking_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id)
);


-- public.booking_riders definition

-- Drop table

-- DROP TABLE public.booking_riders;

CREATE TABLE public.booking_riders (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	booking_id uuid NULL,
	technical jsonb NULL,
	hospitality jsonb NULL,
	stage_plot bytea NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT booking_riders_pkey PRIMARY KEY (id),
	CONSTRAINT booking_riders_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE
);


-- public.contract_signatures definition

-- Drop table

-- DROP TABLE public.contract_signatures;

CREATE TABLE public.contract_signatures (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	contract_id uuid NULL,
	signer_user_id uuid NULL,
	signature_data bytea NULL,
	signature_meta jsonb NULL,
	signed_at timestamptz DEFAULT now() NULL,
	CONSTRAINT contract_signatures_pkey PRIMARY KEY (id),
	CONSTRAINT contract_signatures_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE,
	CONSTRAINT contract_signatures_signer_user_id_fkey FOREIGN KEY (signer_user_id) REFERENCES public.users(id)
);


-- public.invoices definition

-- Drop table

-- DROP TABLE public.invoices;

CREATE TABLE public.invoices (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	transaction_id uuid NULL,
	recipient_user_id uuid NULL,
	issuer_org_id uuid NULL,
	invoice_number text NULL,
	amount numeric(14, 2) NOT NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	status public.invoice_status DEFAULT 'draft'::invoice_status NULL,
	issued_at timestamptz NULL,
	due_at timestamptz NULL,
	"data" jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number),
	CONSTRAINT invoices_pkey PRIMARY KEY (id),
	CONSTRAINT invoices_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT invoices_issuer_org_id_fkey FOREIGN KEY (issuer_org_id) REFERENCES public.organizations(id),
	CONSTRAINT invoices_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.users(id),
	CONSTRAINT invoices_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);


-- public.refunds definition

-- Drop table

-- DROP TABLE public.refunds;

CREATE TABLE public.refunds (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	transaction_id uuid NULL,
	amount numeric(14, 2) NOT NULL,
	currency bpchar(3) DEFAULT 'INR'::bpchar NULL,
	initiated_by uuid NULL,
	created_at timestamptz DEFAULT now() NULL,
	processed_at timestamptz NULL,
	status public.payment_status DEFAULT 'initiated'::payment_status NULL,
	metadata jsonb NULL,
	CONSTRAINT refunds_pkey PRIMARY KEY (id),
	CONSTRAINT refunds_currency_fkey FOREIGN KEY (currency) REFERENCES public.currencies(currency_code),
	CONSTRAINT refunds_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id),
	CONSTRAINT refunds_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id)
);



-- DROP FUNCTION public.armor(bytea);

CREATE OR REPLACE FUNCTION public.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- DROP FUNCTION public.armor(bytea, _text, _text);

CREATE OR REPLACE FUNCTION public.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$
;

-- DROP FUNCTION public.audit_trigger_fn();

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _who TEXT;
  _user_uuid UUID;
  _diff JSONB;
BEGIN
  BEGIN
    _who := current_setting('audit.current_user', true);
    _user_uuid := _who::uuid;
  EXCEPTION WHEN others THEN
    _user_uuid := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    _diff := to_jsonb(OLD);
    INSERT INTO audit_logs(who, action, entity_type, entity_id, diff)
      VALUES (_user_uuid, TG_TABLE_NAME || '.DELETE', TG_TABLE_NAME, OLD.id::uuid, _diff);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    _diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    INSERT INTO audit_logs(who, action, entity_type, entity_id, diff)
      VALUES (_user_uuid, TG_TABLE_NAME || '.UPDATE', TG_TABLE_NAME, NEW.id::uuid, _diff);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    _diff := to_jsonb(NEW);
    INSERT INTO audit_logs(who, action, entity_type, entity_id, diff)
      VALUES (_user_uuid, TG_TABLE_NAME || '.INSERT', TG_TABLE_NAME, NEW.id::uuid, _diff);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$
;

-- DROP FUNCTION public.crypt(text, text);

CREATE OR REPLACE FUNCTION public.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$
;

-- DROP FUNCTION public.dearmor(text);

CREATE OR REPLACE FUNCTION public.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$
;

-- DROP FUNCTION public.decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$
;

-- DROP FUNCTION public.decrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$
;

-- DROP FUNCTION public.digest(text, text);

CREATE OR REPLACE FUNCTION public.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- DROP FUNCTION public.digest(bytea, text);

CREATE OR REPLACE FUNCTION public.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$
;

-- DROP FUNCTION public.encrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$
;

-- DROP FUNCTION public.encrypt_iv(bytea, bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$
;

-- DROP FUNCTION public.fips_mode();

CREATE OR REPLACE FUNCTION public.fips_mode()
 RETURNS boolean
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_check_fipsmode$function$
;

-- DROP FUNCTION public.gen_random_bytes(int4);

CREATE OR REPLACE FUNCTION public.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$
;

-- DROP FUNCTION public.gen_random_uuid();

CREATE OR REPLACE FUNCTION public.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$
;

-- DROP FUNCTION public.gen_salt(text, int4);

CREATE OR REPLACE FUNCTION public.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$
;

-- DROP FUNCTION public.gen_salt(text);

CREATE OR REPLACE FUNCTION public.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$
;

-- DROP FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

-- DROP FUNCTION public.gin_extract_value_trgm(text, internal);

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

-- DROP FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

-- DROP FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

-- DROP FUNCTION public.gtrgm_compress(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

-- DROP FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

-- DROP FUNCTION public.gtrgm_decompress(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

-- DROP FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

-- DROP FUNCTION public.gtrgm_in(cstring);

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

-- DROP FUNCTION public.gtrgm_options(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

-- DROP FUNCTION public.gtrgm_out(gtrgm);

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

-- DROP FUNCTION public.gtrgm_penalty(internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

-- DROP FUNCTION public.gtrgm_picksplit(internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

-- DROP FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

-- DROP FUNCTION public.gtrgm_union(internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

-- DROP FUNCTION public.hmac(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- DROP FUNCTION public.hmac(text, text, text);

CREATE OR REPLACE FUNCTION public.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$
;

-- DROP FUNCTION public.immutable_unaccent(text);

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
SELECT unaccent('public.unaccent', $1);
$function$
;

-- DROP FUNCTION public.pgp_armor_headers(in text, out text, out text);

CREATE OR REPLACE FUNCTION public.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$
;

-- DROP FUNCTION public.pgp_key_id(bytea);

CREATE OR REPLACE FUNCTION public.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt(text, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_decrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt(text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt(text, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- DROP FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text);

CREATE OR REPLACE FUNCTION public.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$
;

-- DROP FUNCTION public.set_limit(float4);

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

-- DROP FUNCTION public.show_limit();

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

-- DROP FUNCTION public.show_trgm(text);

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

-- DROP FUNCTION public.similarity(text, text);

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

-- DROP FUNCTION public.similarity_dist(text, text);

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

-- DROP FUNCTION public.similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

-- DROP FUNCTION public.strict_word_similarity(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

-- DROP FUNCTION public.strict_word_similarity_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

-- DROP FUNCTION public.strict_word_similarity_dist_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

-- DROP FUNCTION public.strict_word_similarity_dist_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

-- DROP FUNCTION public.strict_word_similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

-- DROP FUNCTION public.unaccent(text);

CREATE OR REPLACE FUNCTION public.unaccent(text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

-- DROP FUNCTION public.unaccent(regdictionary, text);

CREATE OR REPLACE FUNCTION public.unaccent(regdictionary, text)
 RETURNS text
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/unaccent', $function$unaccent_dict$function$
;

-- DROP FUNCTION public.unaccent_init(internal);

CREATE OR REPLACE FUNCTION public.unaccent_init(internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_init$function$
;

-- DROP FUNCTION public.unaccent_lexize(internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.unaccent_lexize(internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/unaccent', $function$unaccent_lexize$function$
;

-- DROP FUNCTION public.uuid_generate_v1();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

-- DROP FUNCTION public.uuid_generate_v1mc();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

-- DROP FUNCTION public.uuid_generate_v3(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

-- DROP FUNCTION public.uuid_generate_v4();

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

-- DROP FUNCTION public.uuid_generate_v5(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

-- DROP FUNCTION public.uuid_nil();

CREATE OR REPLACE FUNCTION public.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

-- DROP FUNCTION public.uuid_ns_dns();

CREATE OR REPLACE FUNCTION public.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

-- DROP FUNCTION public.uuid_ns_oid();

CREATE OR REPLACE FUNCTION public.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

-- DROP FUNCTION public.uuid_ns_url();

CREATE OR REPLACE FUNCTION public.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

-- DROP FUNCTION public.uuid_ns_x500();

CREATE OR REPLACE FUNCTION public.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;

-- DROP FUNCTION public.word_similarity(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

-- DROP FUNCTION public.word_similarity_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

-- DROP FUNCTION public.word_similarity_dist_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

-- DROP FUNCTION public.word_similarity_dist_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

-- DROP FUNCTION public.word_similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;