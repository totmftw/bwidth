import { pgTable, text, integer, boolean, timestamp, jsonb, pgEnum, numeric, date, serial, char, smallint, bigserial, inet, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ============================================================================
// ENUMS
// ============================================================================

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
  // PDF generation
  pdfUrl: text("pdf_url"),
  pdfGeneratedAt: timestamp("pdf_generated_at", { withTimezone: true }),
  // Admin review
  adminReviewedBy: integer("admin_reviewed_by").references(() => users.id, { onDelete: "set null" }),
  adminReviewedAt: timestamp("admin_reviewed_at", { withTimezone: true }),
  adminReviewNote: text("admin_review_note"),
  adminReviewStatus: text("admin_review_status"), // 'approved' | 'rejected'
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
  data: text("data"), // URL or storage reference
  altText: text("alt_text"),
  metadata: jsonb("metadata").default({}),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// ============================================================================
// NOTIFICATIONS & MESSAGES
// ============================================================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  channel: notificationChannelEnum("channel"),
  title: text("title"),
  body: text("body"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  data: jsonb("data"),
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
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
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
// RELATIONS
// ============================================================================

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
  workflowInstance: one(conversationWorkflowInstances, {
    fields: [conversations.id],
    references: [conversationWorkflowInstances.conversationId],
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
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export const insertConversationSchema = createInsertSchema(conversations);
export const selectConversationSchema = createSelectSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertBookingProposalSchema = createInsertSchema(bookingProposals);
export const selectBookingProposalSchema = createSelectSchema(bookingProposals);


