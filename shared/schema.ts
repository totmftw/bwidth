import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum, numeric, date, serial, char, smallint, bigserial, inet, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ============================================================================
// ENUMS
// ============================================================================

export const artistCategoryEnum = pgEnum("artist_category", [
  "budding",
  "mid_scale",
  "international",
  "custom",
]);

export const artistCategorySourceEnum = pgEnum("artist_category_source", [
  "auto",
  "manual",
  "override",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
  "pending_verification",
]);

export const roleNameEnum = pgEnum("role_name", [
  "artist",
  "band_manager",
  "promoter",
  "organizer",
  "venue_manager",
  "admin",
  "platform_admin",
  "staff",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "inquiry",
  "offered",
  "negotiating",
  "contracting",
  "confirmed",
  "paid_deposit",
  "scheduled",
  "completed",
  "cancelled",
  "disputed",
  "refunded",
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "draft",
  "sent",
  "signed_by_promoter",
  "signed_by_artist",
  "admin_review",
  "signed",
  "voided",
  "completed",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "investigating",
  "resolved_refund",
  "resolved_no_refund",
  "escalated",
]);

export const genderEnum = pgEnum("gender", [
  "male",
  "female",
  "other",
  "prefer_not_say",
]);

export const gstRegistrationTypeEnum = pgEnum("gst_registration_type", [
  "registered",
  "unregistered",
  "composition",
  "none",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "audio",
  "video",
  "document",
  "other",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
  "push",
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "normal",
  "urgent",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "cancelled",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "queued",
  "processing",
  "paid",
  "failed",
  "cancelled",
]);

export const searchEntityEnum = pgEnum("search_entity", [
  "artist",
  "venue",
  "event",
  "promoter",
  "organizer",
]);

export const ticketTypeEnum = pgEnum("ticket_type", [
  "general",
  "vip",
  "reserved",
  "earlybird",
  "guestlist",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "active",
  "accepted",
  "rejected",
  "expired",
  "withdrawn",
]);

export const contractEditStatusEnum = pgEnum("contract_edit_status", [
  "pending",
  "approved",
  "rejected",
  "applied",
]);

export const llmProviderEnum = pgEnum("llm_provider", [
  "openai",
  "anthropic",
  "google",
  "openrouter",
  "ollama",
]);

export const agentTypeEnum = pgEnum("agent_type", [
  "event_wizard",
  "negotiation",
]);

export const agentSessionStatusEnum = pgEnum("agent_session_status", [
  "active",
  "completed",
  "failed",
  "cancelled",
  "paused",
]);

export const feedbackRatingEnum = pgEnum("feedback_rating", [
  "positive",
  "negative",
]);

// ============================================================================
// GEOGRAPHY & LOOKUP TABLES
// ============================================================================

export const currencies = pgTable("currencies", {
  currencyCode: char("currency_code", { length: 3 }).primaryKey(),
  name: text("name").notNull(),
  symbol: text("symbol"),
  precision: smallint("precision").default(2),
});

export const locales = pgTable("locales", {
  localeCode: char("locale_code", { length: 5 }).primaryKey(),
  displayName: text("display_name").notNull(),
});

export const timezones = pgTable("timezones", {
  tzName: text("tz_name").primaryKey(),
});

export const countries = pgTable("countries", {
  countryId: serial("country_id").primaryKey(),
  name: text("name").notNull(),
  iso2: char("iso2", { length: 2 }),
  iso3: char("iso3", { length: 3 }),
  currencyCode: char("currency_code", { length: 3 }).references(() => currencies.currencyCode),
});

export const states = pgTable("states", {
  stateId: serial("state_id").primaryKey(),
  countryId: integer("country_id").references(() => countries.countryId),
  name: text("name").notNull(),
});

export const cities = pgTable("cities", {
  cityId: serial("city_id").primaryKey(),
  stateId: integer("state_id").references(() => states.stateId),
  name: text("name").notNull(),
  lat: numeric("lat"),
  lon: numeric("lon"),
});

// Session table for connect-pg-simple
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  displayName: text("display_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  
  // Legal & Financial Fields
  legalName: text("legal_name"),
  permanentAddress: text("permanent_address"),
  panNumber: text("pan_number"),
  gstin: text("gstin"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  bankBranch: text("bank_branch"),
  bankAccountHolderName: text("bank_account_holder_name"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),

  gender: genderEnum("gender"),
  dateOfBirth: date("date_of_birth"),
  status: userStatusEnum("status").default("pending_verification"),
  locale: char("locale", { length: 5 }).references(() => locales.localeCode),
  currency: char("currency", { length: 3 }).default("INR").references(() => currencies.currencyCode),
  timezone: text("timezone").default("Asia/Kolkata").references(() => timezones.tzName),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: roleNameEnum("name").notNull().unique(),
  description: text("description"),
});

export const userRoles = pgTable("user_roles", {
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table: any) => ({
  pk: { columns: [table.userId, table.roleId] }
}));

export const authProviders = pgTable("auth_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  website: text("website"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

export const organizationMembers = pgTable("organization_members", {
  orgId: integer("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  pk: { columns: [table.orgId, table.userId] }
}));

// ============================================================================
// GENRES
// ============================================================================

export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").unique(),
  parentId: integer("parent_id").references((): any => genres.id),
});

// ============================================================================
// ARTISTS
// ============================================================================

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  isBand: boolean("is_band").default(false),
  members: jsonb("members"),
  bio: text("bio"),
  originCityId: integer("origin_city_id").references(() => cities.cityId),
  baseLocation: jsonb("base_location"),
  priceFrom: numeric("price_from", { precision: 12, scale: 2 }),
  priceTo: numeric("price_to", { precision: 12, scale: 2 }),
  currency: char("currency", { length: 3 }).default("INR").references(() => currencies.currencyCode),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).default("0"),
  ratingCount: integer("rating_count").default(0),
  artistCategory: artistCategoryEnum("artist_category"),
  artistCategorySource: artistCategorySourceEnum("artist_category_source"),
  artistCategoryLocked: boolean("artist_category_locked").default(false),
  artistCategoryAssignedAt: timestamp("artist_category_assigned_at"),
  artistCategoryAssignedBy: integer("artist_category_assigned_by").references(() => users.id, { onDelete: "set null" }),
  artistCategoryNotes: text("artist_category_notes"),
  commissionOverrideArtistPct: numeric("commission_override_artist_pct", { precision: 5, scale: 2 }),
  commissionOverrideOrganizerPct: numeric("commission_override_organizer_pct", { precision: 5, scale: 2 }),
  minimumGuaranteedEarnings: numeric("minimum_guaranteed_earnings", { precision: 12, scale: 2 }),
  categoryValidFrom: timestamp("category_valid_from"),
  categoryValidTo: timestamp("category_valid_to"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

export const artistGenres = pgTable("artist_genres", {
  artistId: integer("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  genreId: integer("genre_id").references(() => genres.id, { onDelete: "cascade" }).notNull(),
}, (table) => ({
  pk: { columns: [table.artistId, table.genreId] }
}));

export const artistCategoryHistory = pgTable("artist_category_history", {
  id: serial("id").primaryKey(),
  artistId: integer("artist_id").references(() => artists.id, { onDelete: "cascade" }).notNull(),
  oldCategory: text("old_category"),
  newCategory: text("new_category"),
  reason: text("reason"),
  changedBy: integer("changed_by").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at").defaultNow(),
});

export const commissionPolicies = pgTable("commission_policies", {
  id: serial("id").primaryKey(),
  artistCategory: artistCategoryEnum("artist_category").notNull().unique(),
  artistPct: numeric("artist_pct", { precision: 5, scale: 2 }).notNull(),
  organizerPct: numeric("organizer_pct", { precision: 5, scale: 2 }).notNull(),
  platformPctTotal: numeric("platform_pct_total", { precision: 5, scale: 2 }).notNull(),
  minArtistGuarantee: numeric("min_artist_guarantee", { precision: 12, scale: 2 }),
  active: boolean("active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
});

// ============================================================================
// PROMOTERS
// ============================================================================

export const promoters = pgTable("promoters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  name: text("name"),
  description: text("description"),
  contactPerson: jsonb("contact_person"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

// ============================================================================
// VENUES
// ============================================================================

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  address: jsonb("address"),
  cityId: integer("city_id").references(() => cities.cityId),
  capacity: integer("capacity"),
  capacitySeated: integer("capacity_seated"),
  capacityStanding: integer("capacity_standing"),
  spaceDimensions: jsonb("space_dimensions"),
  amenities: jsonb("amenities"),
  timezone: text("timezone").default("Asia/Kolkata").references(() => timezones.tzName),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).default("0"),
  ratingCount: integer("rating_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

// ============================================================================
// EVENTS
// ============================================================================

export const visibilityEnum = pgEnum("visibility", ["public", "private"]);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  organizerId: integer("organizer_id").references(() => promoters.id, { onDelete: "set null" }),
  venueId: integer("venue_id").references(() => venues.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  slug: text("slug").unique(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  doorTime: timestamp("door_time"),
  endTime: timestamp("end_time"),
  timezone: text("timezone").default("Asia/Kolkata").references(() => timezones.tzName),
  capacityTotal: integer("capacity_total"),
  capacitySeated: integer("capacity_seated"),
  currency: char("currency", { length: 3 }).default("INR").references(() => currencies.currencyCode),
  status: text("status").default("draft"),
  visibility: visibilityEnum("visibility").default("private"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventStages = pgTable("event_stages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  name: text("name"),
  orderIndex: integer("order_index").default(0),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  stagePlot: text("stage_plot"), // Changed from bytea to text for easier handling
  capacity: integer("capacity"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const temporaryVenues = pgTable("temporary_venues", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location").notNull(),
  mapsLink: text("maps_link"),
  directions: text("directions"),
  landmark: text("landmark"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

// ============================================================================
// BOOKINGS
// ============================================================================

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
  artistId: integer("artist_id").references(() => artists.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").references(() => eventStages.id, { onDelete: "set null" }),
  status: bookingStatusEnum("status").default("inquiry"),
  offerAmount: numeric("offer_amount", { precision: 12, scale: 2 }),
  offerCurrency: char("offer_currency", { length: 3 }).default("INR").references(() => currencies.currencyCode),
  depositPercent: numeric("deposit_percent", { precision: 5, scale: 2 }).default("30.00"),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
  finalAmount: numeric("final_amount", { precision: 12, scale: 2 }),
  finalDueAt: timestamp("final_due_at"),
  grossBookingValue: numeric("gross_booking_value", { precision: 12, scale: 2 }),
  artistFee: numeric("artist_fee", { precision: 12, scale: 2 }),
  organizerFee: numeric("organizer_fee", { precision: 12, scale: 2 }),
  artistCommissionPct: numeric("artist_commission_pct", { precision: 5, scale: 2 }),
  organizerCommissionPct: numeric("organizer_commission_pct", { precision: 5, scale: 2 }),
  platformRevenue: numeric("platform_revenue", { precision: 12, scale: 2 }),
  artistCategorySnapshot: text("artist_category_snapshot"),
  trustTierSnapshot: text("trust_tier_snapshot"),
  contractId: integer("contract_id"), // Added this relation manually below
  flowStartedAt: timestamp("flow_started_at", { withTimezone: true }),
  flowDeadlineAt: timestamp("flow_deadline_at", { withTimezone: true }),
  flowExpiredAt: timestamp("flow_expired_at", { withTimezone: true }),
  flowExpiredReason: text("flow_expired_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  meta: jsonb("meta").default({}),
});

// ============================================================================
// CONTRACTS
// ============================================================================

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }),
  version: integer("version").default(1),
  status: contractStatusEnum("status").default("draft"),
  contractPdf: text("contract_pdf"),
  contractText: text("contract_text"),
  signerSequence: jsonb("signer_sequence"),
  signedByPromoter: boolean("signed_by_promoter").default(false),
  signedByArtist: boolean("signed_by_artist").default(false),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
  // Contract-stage control fields
  initiatedAt: timestamp("initiated_at", { withTimezone: true }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  currentVersion: integer("current_version").default(1),
  artistEditUsed: boolean("artist_edit_used").default(false),
  promoterEditUsed: boolean("promoter_edit_used").default(false),
  artistReviewDoneAt: timestamp("artist_review_done_at", { withTimezone: true }),
  promoterReviewDoneAt: timestamp("promoter_review_done_at", { withTimezone: true }),
  artistAcceptedAt: timestamp("artist_accepted_at", { withTimezone: true }),
  promoterAcceptedAt: timestamp("promoter_accepted_at", { withTimezone: true }),
  artistSignedAt: timestamp("artist_signed_at", { withTimezone: true }),
  promoterSignedAt: timestamp("promoter_signed_at", { withTimezone: true }),
  
  // IT Act 2000 Compliance Logging
  artistSignatureIp: text("artist_signature_ip"),
  promoterSignatureIp: text("promoter_signature_ip"),

  // PDF generation
  pdfUrl: text("pdf_url"),
  pdfGeneratedAt: timestamp("pdf_generated_at", { withTimezone: true }),
  // Admin review
  adminReviewedBy: integer("admin_reviewed_by").references(() => users.id, { onDelete: "set null" }),
  adminReviewedAt: timestamp("admin_reviewed_at", { withTimezone: true }),
  adminReviewNote: text("admin_review_note"),
  adminReviewStatus: text("admin_review_status"), // 'approved' | 'rejected'
  
  // Snapshots and Categorization
  artistCategorySnapshot: text("artist_category_snapshot"),
  trustScoreSnapshot: text("trust_score_snapshot"),
  commissionBreakdownJson: jsonb("commission_breakdown_json"),
  negotiatedTermsJson: jsonb("negotiated_terms_json"),
  clauseVersion: integer("clause_version"),
  templateVersion: integer("template_version"),
  organizerSignatureRequired: boolean("organizer_signature_required").default(true),
  artistSignatureRequired: boolean("artist_signature_required").default(true),
  cancellationPolicyVersion: integer("cancellation_policy_version"),
  editPhase: text("edit_phase").default("organizer_review"),
});

// Contract version history (each edit creates a new version)
export const contractVersions = pgTable("contract_versions", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  contractText: text("contract_text").notNull(),
  terms: jsonb("terms").notNull().default({}),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  changeSummary: text("change_summary"),
});

// Edit requests (one per party max)
export const contractEditRequests = pgTable("contract_edit_requests", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  requestedBy: integer("requested_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedByRole: text("requested_by_role"),
  changes: jsonb("changes").notNull(),
  note: text("note"),
  status: contractEditStatusEnum("status").notNull().default("pending"),
  respondedBy: integer("responded_by").references(() => users.id, { onDelete: "set null" }),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  responseNote: text("response_note"),
  resultingVersion: integer("resulting_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Contract signatures (captures actual signature data)
export const contractSignatures = pgTable("contract_signatures", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  signatureData: text("signature_data"), // base64 drawn signature, typed name, or uploaded image URL
  signatureType: text("signature_type").default("typed"), // 'drawn', 'typed', 'uploaded'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow(),
});

// ============================================================================
// PAYMENTS
// ============================================================================

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  payerId: integer("payer_id").references(() => users.id),
  payeeId: integer("payee_id").references(() => users.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: char("currency", { length: 3 }).default("INR").references(() => currencies.currencyCode),
  paymentType: text("payment_type"),
  status: paymentStatusEnum("status").default("initiated"),
  gateway: text("gateway"),
  gatewayTransactionId: text("gateway_transaction_id"),
  gatewayResponse: jsonb("gateway_response"),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").default({}),
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  toUserId: integer("to_user_id").references(() => users.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: char("currency", { length: 3 }).default("INR").references(() => currencies.currencyCode),
  status: payoutStatusEnum("status").default("queued"),
  providerResponse: jsonb("provider_response"),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  metadata: jsonb("metadata").default({}),
});

// ============================================================================
// MEDIA & FILES
// ============================================================================

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  mediaType: mediaTypeEnum("media_type"),
  filename: text("filename"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  data: text("data"), // base64 data URL or external URL
  sourceUrl: text("source_url"), // original URL if fetched from a link
  altText: text("alt_text"),
  metadata: jsonb("metadata").default({}),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// ============================================================================
// NOTIFICATIONS & MESSAGES
// ============================================================================

export const notificationTypes = pgTable("notification_types", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  category: text("category").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  titleTemplate: text("title_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  targetRoles: jsonb("target_roles").notNull(),
  channels: jsonb("channels").notNull().default(["in_app"]),
  enabled: boolean("enabled").notNull().default(true),
  priority: notificationPriorityEnum("priority").notNull().default("normal"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationChannels = pgTable("notification_channels", {
  id: serial("id").primaryKey(),
  channel: notificationChannelEnum("channel").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").default({}),
  rateLimit: jsonb("rate_limit").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  notificationTypeKey: text("notification_type_key").notNull(),
  channel: notificationChannelEnum("channel").notNull().default("in_app"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  actionUrl: text("action_url"),
  data: jsonb("data"),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at"),
  delivered: boolean("delivered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  subject: text("subject"),
  entityType: text("entity_type"), // e.g. 'booking'
  entityId: integer("entity_id"),
  conversationType: text("conversation_type").notNull().default("direct"), // 'negotiation', 'direct', etc.
  status: text("status").notNull().default("open"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
  // Uniqueness constraint is handled in migration or manual SQL execution if needed for entity_type+entity_id+conversation_type
});

export const conversationWorkflowInstances = pgTable("conversation_workflow_instances", {
  conversationId: integer("conversation_id").primaryKey().references(() => conversations.id, { onDelete: "cascade" }),
  workflowKey: text("workflow_key").notNull().default("booking_negotiation_v1"),
  currentNodeKey: text("current_node_key").notNull(),
  awaitingUserId: integer("awaiting_user_id").references(() => users.id, { onDelete: "set null" }),
  awaitingRole: roleNameEnum("awaiting_role"),
  round: integer("round").notNull().default(0),
  maxRounds: integer("max_rounds").notNull().default(3),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  locked: boolean("locked").notNull().default(false),
  context: jsonb("context").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationParticipants = pgTable("conversation_participants", {
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => ({
  pk: { columns: [table.conversationId, table.userId] }
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").references(() => users.id),
  body: text("body"),
  messageType: text("message_type").notNull().default("text"),
  payload: jsonb("payload").notNull().default({}),
  clientMsgId: text("client_msg_id"),
  workflowNodeKey: text("workflow_node_key"),
  actionKey: text("action_key"),
  round: integer("round"),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
  editedAt: timestamp("edited_at"),
});

export const bookingProposals = pgTable("booking_proposals", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  round: integer("round").notNull(),
  proposedTerms: jsonb("proposed_terms").notNull(), // {offerAmount, currency, slotId, duration}
  reasonCode: text("reason_code"),
  note: text("note"),
  status: proposalStatusEnum("status").notNull().default("active"),
  submittedByRole: text("submitted_by_role"),  // "artist" | "organizer"
  stepNumber: integer("step_number"),           // 1-4
  responseAction: text("response_action"),      // "edit" | "accept" | "walkaway"
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageReads = pgTable("message_reads", {
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (table) => ({
  pk: { columns: [table.messageId, table.userId] }
}));

// ============================================================================
// AUDIT & SYSTEM
// ============================================================================

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  occurredAt: timestamp("occurred_at").defaultNow(),
  who: integer("who").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  diff: jsonb("diff"),
  context: jsonb("context"),
});

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// APP SETTINGS
// ============================================================================

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// ============================================================================
// RELATIONS
// ============================================================================

// ============================================================================
// AI AGENTS
// ============================================================================

export const userLlmConfigs = pgTable("user_llm_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  provider: llmProviderEnum("provider").notNull(),
  model: text("model").notNull(),
  apiKeyEncrypted: text("api_key_encrypted"),
  apiKeyIv: text("api_key_iv"),
  apiKeyTag: text("api_key_tag"),
  ollamaBaseUrl: text("ollama_base_url"),
  openrouterModel: text("openrouter_model"),
  isValid: boolean("is_valid").default(false),
  lastValidatedAt: timestamp("last_validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentConfigs = pgTable("agent_configs", {
  id: serial("id").primaryKey(),
  agentType: agentTypeEnum("agent_type").notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  allowedRoles: jsonb("allowed_roles").default([]).notNull(),
  defaultProvider: llmProviderEnum("default_provider"),
  defaultModel: text("default_model"),
  systemApiKeyEncrypted: text("system_api_key_encrypted"),
  systemApiKeyIv: text("system_api_key_iv"),
  systemApiKeyTag: text("system_api_key_tag"),
  maxTokensPerRequest: integer("max_tokens_per_request").default(4096),
  maxRequestsPerSession: integer("max_requests_per_session").default(50),
  temperatureDefault: numeric("temperature_default", { precision: 3, scale: 2 }).default("0.70"),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const agentRateLimits = pgTable("agent_rate_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  agentType: agentTypeEnum("agent_type").notNull(),
  maxRequestsPerHour: integer("max_requests_per_hour").default(20),
  maxRequestsPerDay: integer("max_requests_per_day").default(100),
  maxTokensPerDay: integer("max_tokens_per_day").default(100000),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
}, (table: any) => ({
  uniqueUserAgent: uniqueIndex("agent_rate_limits_user_agent_idx").on(table.userId, table.agentType),
}));

export const agentSessions = pgTable("agent_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  agentType: agentTypeEnum("agent_type").notNull(),
  status: agentSessionStatusEnum("status").default("active").notNull(),
  contextEntityType: text("context_entity_type"),
  contextEntityId: integer("context_entity_id"),
  provider: llmProviderEnum("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version"),
  inputTokensUsed: integer("input_tokens_used").default(0),
  outputTokensUsed: integer("output_tokens_used").default(0),
  requestCount: integer("request_count").default(0),
  memory: jsonb("memory").default({}),
  result: jsonb("result"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  metadata: jsonb("metadata").default({}),
});

export const agentMessages = pgTable("agent_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => agentSessions.id, { onDelete: "cascade" }).notNull(),
  role: text("role").notNull(),
  content: text("content"),
  toolCalls: jsonb("tool_calls"),
  toolResults: jsonb("tool_results"),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  latencyMs: integer("latency_ms"),
  provider: llmProviderEnum("provider"),
  model: text("model"),
  promptVersion: text("prompt_version"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentFeedback = pgTable("agent_feedback", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => agentSessions.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: feedbackRatingEnum("rating").notNull(),
  comment: text("comment"),
  agentType: agentTypeEnum("agent_type").notNull(),
  promptVersion: text("prompt_version"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promptVersions = pgTable("prompt_versions", {
  id: serial("id").primaryKey(),
  agentType: agentTypeEnum("agent_type").notNull(),
  version: text("version").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  contextTemplate: text("context_template"),
  active: boolean("active").default(false).notNull(),
  positiveCount: integer("positive_count").default(0),
  negativeCount: integer("negative_count").default(0),
  totalRuns: integer("total_runs").default(0),
  avgLatencyMs: integer("avg_latency_ms").default(0),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table: any) => ({
  uniqueAgentVersion: uniqueIndex("prompt_versions_agent_version_idx").on(table.agentType, table.version),
}));

export const agentUsageStats = pgTable("agent_usage_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  agentType: agentTypeEnum("agent_type").notNull(),
  date: date("date").notNull(),
  requestCount: integer("request_count").default(0),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  sessionCount: integer("session_count").default(0),
  positiveRatings: integer("positive_ratings").default(0),
  negativeRatings: integer("negative_ratings").default(0),
}, (table: any) => ({
  uniqueUserAgentDate: uniqueIndex("agent_usage_stats_user_agent_date_idx").on(table.userId, table.agentType, table.date),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const notificationsRelations = relations(notifications, ({ one }: any) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many, one }: any) => ({
  roles: many(userRoles),
  artist: one(artists, { fields: [users.id], references: [artists.userId] }),
  notifications: many(notifications),
}));

export const artistsRelations = relations(artists, ({ one, many }: any) => ({
  user: one(users, { fields: [artists.userId], references: [users.id] }),
  genres: many(artistGenres),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }: any) => ({
  artist: one(artists, { fields: [bookings.artistId], references: [artists.id] }),
  event: one(events, { fields: [bookings.eventId], references: [events.id] }),
  contract: one(contracts, { fields: [bookings.id], references: [contracts.bookingId] }),
}));

export const contractsRelations = relations(contracts, ({ one, many }: any) => ({
  booking: one(bookings, { fields: [contracts.bookingId], references: [bookings.id] }),
  versions: many(contractVersions),
  editRequests: many(contractEditRequests),
  signatures: many(contractSignatures),
}));

export const contractVersionsRelations = relations(contractVersions, ({ one }: any) => ({
  contract: one(contracts, { fields: [contractVersions.contractId], references: [contracts.id] }),
  creator: one(users, { fields: [contractVersions.createdBy], references: [users.id] }),
}));

export const contractEditRequestsRelations = relations(contractEditRequests, ({ one }: any) => ({
  contract: one(contracts, { fields: [contractEditRequests.contractId], references: [contracts.id] }),
  requester: one(users, { fields: [contractEditRequests.requestedBy], references: [users.id] }),
  responder: one(users, { fields: [contractEditRequests.respondedBy], references: [users.id] }),
}));

export const contractSignaturesRelations = relations(contractSignatures, ({ one }: any) => ({
  contract: one(contracts, { fields: [contractSignatures.contractId], references: [contracts.id] }),
  user: one(users, { fields: [contractSignatures.userId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }: any) => ({
  venue: one(venues, { fields: [events.venueId], references: [venues.id] }),
  organizer: one(promoters, { fields: [events.organizerId], references: [promoters.id] }),
  bookings: many(bookings),
  stages: many(eventStages),
}));

export const conversationsRelations = relations(conversations, ({ many, one }: any) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
  workflowInstance: one(conversationWorkflowInstances),
}));

export const conversationWorkflowInstancesRelations = relations(conversationWorkflowInstances, ({ one }: any) => ({
  conversation: one(conversations, {
    fields: [conversationWorkflowInstances.conversationId],
    references: [conversations.id],
  }),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }: any) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }: any) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  reads: many(messageReads),
}));

export const bookingProposalsRelations = relations(bookingProposals, ({ one }: any) => ({
  booking: one(bookings, { fields: [bookingProposals.bookingId], references: [bookings.id] }),
  creator: one(users, { fields: [bookingProposals.createdBy], references: [users.id] }),
}));

export const userLlmConfigsRelations = relations(userLlmConfigs, ({ one }: any) => ({
  user: one(users, { fields: [userLlmConfigs.userId], references: [users.id] }),
}));

export const agentConfigsRelations = relations(agentConfigs, ({ one }: any) => ({
  updater: one(users, { fields: [agentConfigs.updatedBy], references: [users.id] }),
}));

export const agentSessionsRelations = relations(agentSessions, ({ one, many }: any) => ({
  user: one(users, { fields: [agentSessions.userId], references: [users.id] }),
  messages: many(agentMessages),
  feedback: many(agentFeedback),
}));

export const agentMessagesRelations = relations(agentMessages, ({ one }: any) => ({
  session: one(agentSessions, { fields: [agentMessages.sessionId], references: [agentSessions.id] }),
}));

export const agentFeedbackRelations = relations(agentFeedback, ({ one }: any) => ({
  session: one(agentSessions, { fields: [agentFeedback.sessionId], references: [agentSessions.id] }),
  user: one(users, { fields: [agentFeedback.userId], references: [users.id] }),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one }: any) => ({
  creator: one(users, { fields: [promptVersions.createdBy], references: [users.id] }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Artist = typeof artists.$inferSelect;
export type InsertArtist = typeof artists.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type InsertVenue = typeof venues.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type TemporaryVenue = typeof temporaryVenues.$inferSelect;
export type InsertTemporaryVenue = typeof temporaryVenues.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;
export type ContractVersion = typeof contractVersions.$inferSelect;
export type InsertContractVersion = typeof contractVersions.$inferInsert;
export type ContractEditRequest = typeof contractEditRequests.$inferSelect;
export type InsertContractEditRequest = typeof contractEditRequests.$inferInsert;
export type ContractSignature = typeof contractSignatures.$inferSelect;
export type InsertContractSignature = typeof contractSignatures.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type Promoter = typeof promoters.$inferSelect;
export type InsertPromoter = typeof promoters.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type ConversationWorkflowInstance = typeof conversationWorkflowInstances.$inferSelect;
export type InsertConversationWorkflowInstance = typeof conversationWorkflowInstances.$inferInsert;
export type BookingProposal = typeof bookingProposals.$inferSelect;
export type InsertBookingProposal = typeof bookingProposals.$inferInsert;
export type MessageRead = typeof messageReads.$inferSelect;
export type InsertMessageRead = typeof messageReads.$inferInsert;
export type ArtistCategoryHistory = typeof artistCategoryHistory.$inferSelect;
export type InsertArtistCategoryHistory = typeof artistCategoryHistory.$inferInsert;
export type CommissionPolicy = typeof commissionPolicies.$inferSelect;
export type InsertCommissionPolicy = typeof commissionPolicies.$inferInsert;
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type NotificationType = typeof notificationTypes.$inferSelect;
export type InsertNotificationType = typeof notificationTypes.$inferInsert;
export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type InsertNotificationChannel = typeof notificationChannels.$inferInsert;

export type UserLlmConfig = typeof userLlmConfigs.$inferSelect;
export type InsertUserLlmConfig = typeof userLlmConfigs.$inferInsert;
export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = typeof agentConfigs.$inferInsert;
export type AgentRateLimit = typeof agentRateLimits.$inferSelect;
export type InsertAgentRateLimit = typeof agentRateLimits.$inferInsert;
export type AgentSession = typeof agentSessions.$inferSelect;
export type InsertAgentSession = typeof agentSessions.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type InsertAgentMessage = typeof agentMessages.$inferInsert;
export type AgentFeedbackRecord = typeof agentFeedback.$inferSelect;
export type InsertAgentFeedback = typeof agentFeedback.$inferInsert;
export type PromptVersion = typeof promptVersions.$inferSelect;
export type InsertPromptVersion = typeof promptVersions.$inferInsert;
export type AgentUsageStat = typeof agentUsageStats.$inferSelect;
export type InsertAgentUsageStat = typeof agentUsageStats.$inferInsert;

// Aliases for compatibility with existing code
export { promoters as organizers };
export type Organizer = Promoter;
export type InsertOrganizer = InsertPromoter;

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertArtistSchema = createInsertSchema(artists);
export const selectArtistSchema = createSelectSchema(artists);
export const insertOrganizerSchema = createInsertSchema(promoters); // Using promoters for organizers
export const selectOrganizerSchema = createSelectSchema(promoters);
export const insertVenueSchema = createInsertSchema(venues);
export const selectVenueSchema = createSelectSchema(venues);
export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);
export const insertNotificationTypeSchema = createInsertSchema(notificationTypes);
export const insertNotificationChannelSchema = createInsertSchema(notificationChannels);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertTemporaryVenueSchema = createInsertSchema(temporaryVenues);
export const selectTemporaryVenueSchema = createSelectSchema(temporaryVenues);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertBookingProposalSchema = createInsertSchema(bookingProposals);
export const selectBookingProposalSchema = createSelectSchema(bookingProposals);
export const insertArtistCategoryHistorySchema = createInsertSchema(artistCategoryHistory);
export const selectArtistCategoryHistorySchema = createSelectSchema(artistCategoryHistory);
export const insertCommissionPolicySchema = createInsertSchema(commissionPolicies);
export const selectCommissionPolicySchema = createSelectSchema(commissionPolicies);

// Agent schemas
export const insertUserLlmConfigSchema = createInsertSchema(userLlmConfigs);
export const insertAgentConfigSchema = createInsertSchema(agentConfigs);
export const insertAgentSessionSchema = createInsertSchema(agentSessions);
export const insertAgentMessageSchema = createInsertSchema(agentMessages);
export const insertAgentFeedbackSchema = createInsertSchema(agentFeedback);
export const insertPromptVersionSchema = createInsertSchema(promptVersions);
export const insertAgentUsageStatSchema = createInsertSchema(agentUsageStats);
