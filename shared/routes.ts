import { z } from 'zod';
import { insertUserSchema, insertArtistSchema, insertOrganizerSchema, insertVenueSchema, insertBookingSchema, users, artists, organizers, venues, bookings, events, promoters, auditLogs } from './schema';

// ============================================================================
// Organizer Validation Schemas
// ============================================================================
// These schemas validate input for the Organizer/Promoter role workflow.
// The Organizer is the demand-side actor who creates events, discovers and
// books artists, negotiates terms, manages contracts, and handles payments.
// All organizer profile data is stored in the existing `promoters` table
// (aliased as `organizers` in schema.ts) using JSONB `metadata` and
// `contact_person` columns — no new database tables are needed.
// ============================================================================

// ============================================================================
// Negotiation Data Contracts (Zod Schemas)
// ============================================================================
// These define the canonical shapes for the proposal-based structured
// negotiation system between artists and organizers.

export const riderItemStatusEnum = z.enum(["pending", "confirmed", "alternate_offered", "cannot_provide"]);
export const negotiationParticipantRoleEnum = z.enum(["artist", "organizer"]);
export const negotiationProposalStatusEnum = z.enum(["active", "accepted", "rejected", "expired", "withdrawn"]);
export const negotiationSummaryStatusEnum = z.enum([
  "draft",
  "negotiating",
  "awaiting_rider_confirmation",
  "ready_for_acceptance",
  "awaiting_artist_acceptance",
  "awaiting_organizer_acceptance",
  "agreed",
  "walked_away",
]);
// New step-based negotiation enums
export const negotiationStepStateEnum = z.enum([
  "applied",        // step 0: artist submitted application
  "awaiting_org",   // organizer's turn
  "awaiting_art",   // artist's turn
  "locked",         // both agreed, terms frozen
  "walked_away",    // one party walked away
  "expired",        // deadline passed
]);

export const negotiationActionEnum = z.enum(["edit", "accept", "walkaway"]);

export const negotiationActivityTypeEnum = z.enum([
  "application_submitted",
  "proposal_submitted",
  "rider_confirmation_submitted",
  "accepted",
  "walked_away",
]);
export const negotiationDateTimeSchema = z.string().datetime();

export const techRiderRequirementSchema = z.object({
  item: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
  status: riderItemStatusEnum.default("pending"),
  organizerNotes: z.string().optional(),
});

export const techRiderBringsSchema = z.object({
  item: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export const organizerCommitmentSchema = z.object({
  item: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional().nullable(),
  linkedRequirementItem: z.string().optional().nullable(),
});

export const negotiationScheduleSchema = z.object({
  stageId: z.number().int().optional().nullable(),
  stageName: z.string().optional().nullable(),
  slotLabel: z.string().optional().nullable(),
  startsAt: negotiationDateTimeSchema.optional().nullable(),
  endsAt: negotiationDateTimeSchema.optional().nullable(),
  soundCheckLabel: z.string().optional().nullable(),
  soundCheckAt: negotiationDateTimeSchema.optional().nullable(),
});

export const negotiationTechRiderSchema = z.object({
  artistRequirements: z.array(techRiderRequirementSchema).default([]),
  artistBrings: z.array(techRiderBringsSchema).default([]),
  organizerCommitments: z.array(organizerCommitmentSchema).default([]),
  organizerConfirmedAt: negotiationDateTimeSchema.optional().nullable(),
  organizerConfirmedBy: z.number().int().optional().nullable(),
});

export const negotiationLogisticsSectionSchema = z.record(z.unknown());

export const negotiationSnapshotSchema = z.object({
  financial: z.object({
    offerAmount: z.number().nonnegative(),
    currency: z.string().length(3).default("INR"),
    depositPercent: z.number().min(0).max(100).optional().nullable(),
  }),
  schedule: negotiationScheduleSchema.optional().nullable(),
  techRider: negotiationTechRiderSchema.optional().nullable(),
  logistics: z.object({
    travel: negotiationLogisticsSectionSchema.optional().nullable(),
    accommodation: negotiationLogisticsSectionSchema.optional().nullable(),
    hospitality: negotiationLogisticsSectionSchema.optional().nullable(),
  }).optional().nullable(),
  notes: z.object({
    artist: z.string().optional().nullable(),
    organizer: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const negotiationProposalSchema = z.object({
  id: z.number().int().positive(),
  bookingId: z.number().int().positive().optional().nullable(),
  conversationId: z.number().int().positive().optional().nullable(),
  version: z.number().int().positive(),
  snapshot: negotiationSnapshotSchema,
  status: negotiationProposalStatusEnum.default("active"),
  note: z.string().optional().nullable(),
  createdAt: z.union([negotiationDateTimeSchema, z.date()]),
  createdBy: z.number().int().nullable(),
  createdByRole: negotiationParticipantRoleEnum.optional().nullable(),
});

export const bookingNegotiationAgreementSchema = z.object({
  version: z.number().int().positive(),
  agreedAt: negotiationDateTimeSchema,
  acceptedBy: z.object({
    artistUserId: z.number().int().optional().nullable(),
    organizerUserId: z.number().int().optional().nullable(),
  }),
  acceptedAt: z.object({
    artist: negotiationDateTimeSchema.optional().nullable(),
    organizer: negotiationDateTimeSchema.optional().nullable(),
  }),
  snapshot: negotiationSnapshotSchema,
});

export const negotiationStateSchema = bookingNegotiationAgreementSchema;

export const negotiationAcceptanceStateSchema = z.object({
  artistAcceptedVersion: z.number().int().positive().optional().nullable(),
  organizerAcceptedVersion: z.number().int().positive().optional().nullable(),
  artistAcceptedAt: negotiationDateTimeSchema.optional().nullable(),
  organizerAcceptedAt: negotiationDateTimeSchema.optional().nullable(),
});

export const negotiationRiderConfirmationStateSchema = z.object({
  isConfirmed: z.boolean(),
  confirmedAt: negotiationDateTimeSchema.optional().nullable(),
  confirmedBy: z.number().int().optional().nullable(),
  unresolvedItemCount: z.number().int().nonnegative(),
});

export const negotiationActivitySchema = z.object({
  id: z.union([z.number().int().positive(), z.string().min(1)]),
  type: negotiationActivityTypeEnum,
  proposalVersion: z.number().int().positive().optional().nullable(),
  actorUserId: z.number().int().nullable(),
  actorRole: negotiationParticipantRoleEnum.optional().nullable(),
  createdAt: z.union([negotiationDateTimeSchema, z.date()]),
  messageId: z.number().int().positive().optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
});

export const stepHistoryRecordSchema = z.object({
  step: z.number().int().min(0).max(4),
  stepState: negotiationStepStateEnum,
  action: z.enum(["apply", "edit", "accept", "walkaway", "timeout"]),
  actorUserId: z.number().int().nullable(),
  actorRole: z.enum(["artist", "organizer", "system"]),
  proposalId: z.number().int().nullable(),
  proposalVersion: z.number().int().nullable(),
  timestamp: z.string(),
  note: z.string().nullable(),
});

export const applicationSubmitSchema = z.object({
  eventId: z.number().int().positive(),
  message: z.string().optional().nullable(),
  proposal: negotiationSnapshotSchema,
});

export const proposalSubmitSchema = z.object({
  baseVersion: z.number().int().nonnegative().optional().nullable(),
  snapshot: negotiationSnapshotSchema,
  note: z.string().optional().nullable(),
});

export const riderConfirmationSchema = z.object({
  proposalVersion: z.number().int().positive(),
  artistRequirements: z.array(techRiderRequirementSchema),
  organizerCommitments: z.array(organizerCommitmentSchema).default([]),
  note: z.string().optional().nullable(),
}).superRefine(({ artistRequirements }, ctx) => {
  artistRequirements.forEach((item, index) => {
    if (item.status === "pending") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["artistRequirements", index, "status"],
        message: "Rider confirmation requires a resolved status",
      });
    }
  });
});

export const finalAcceptanceSchema = z.object({
  proposalVersion: z.number().int().positive(),
});

export const negotiationActionInputSchema = z.object({
  action: negotiationActionEnum,
  snapshot: negotiationSnapshotSchema.optional(),
  note: z.string().max(2000).optional().nullable(),
  reason: z.string().max(2000).optional().nullable(),
}).refine(
  (data) => data.action !== "edit" || data.snapshot !== undefined,
  { message: "Snapshot is required for 'edit' action", path: ["snapshot"] }
);

export const negotiationSummaryResponseSchema = z.object({
  booking: z.object({
    id: z.number().int().positive(),
    status: z.string(),
    eventId: z.number().int().positive().nullable(),
    artistId: z.number().int().positive().nullable(),
    stageId: z.number().int().positive().nullable(),
    contractId: z.number().int().positive().nullable(),
    flowDeadlineAt: z.string().nullable().optional(),
  }),
  conversation: z.object({
    id: z.number().int().positive(),
    subject: z.string().optional().nullable(),
  }).optional().nullable(),
  status: negotiationSummaryStatusEnum,
  round: z.number().int().nonnegative(),
  currentProposal: negotiationProposalSchema.nullable(),
  history: z.array(negotiationProposalSchema),
  agreement: bookingNegotiationAgreementSchema.nullable(),
  acceptance: negotiationAcceptanceStateSchema,
  riderConfirmation: negotiationRiderConfirmationStateSchema,
  activity: z.array(negotiationActivitySchema).default([]),
  readyForContract: z.boolean(),
});

const negotiationEventStageSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  orderIndex: z.number().int(),
});

export const negotiationSummaryResponseSchemaV2 = z.object({
  booking: z.object({
    id: z.number().int().positive(),
    status: z.string(),
    eventId: z.number().int().positive().nullable(),
    artistId: z.number().int().positive().nullable(),
    stageId: z.number().int().positive().nullable(),
    contractId: z.number().int().positive().nullable(),
    flowDeadlineAt: z.string().nullable().optional(),
  }),
  // Event info + stages for the slot selector in the propose form
  event: z.object({
    title: z.string(),
    startTime: z.string(),
    endTime: z.string().nullable(),
  }).nullable(),
  eventStages: z.array(negotiationEventStageSchema),
  conversation: z.object({
    id: z.number().int().positive(),
  }).nullable(),
  // Step-based fields
  currentStep: z.number().int().min(0).max(4),
  stepState: negotiationStepStateEnum,
  stepDeadlineAt: z.string().nullable(),
  whoseTurn: z.enum(["artist", "organizer"]).nullable(),
  availableActions: z.array(negotiationActionEnum),
  maxSteps: z.literal(4),
  // Existing fields kept
  status: z.string(),
  round: z.number().int().nonnegative(),
  currentProposal: negotiationProposalSchema.nullable(),
  history: z.array(negotiationProposalSchema),
  stepHistory: z.array(stepHistoryRecordSchema),
  agreement: bookingNegotiationAgreementSchema.nullable(),
  lockedTerms: negotiationSnapshotSchema.nullable(),
  activity: z.array(negotiationActivitySchema).default([]),
  readyForContract: z.boolean(),
  contractGenerated: z.boolean().optional(),
});

export const applicationSubmitResponseSchema = z.object({
  booking: z.custom<typeof bookings.$inferSelect>(),
  proposal: negotiationProposalSchema,
  summary: negotiationSummaryResponseSchema,
});

export const proposalSubmitResponseSchema = z.object({
  success: z.literal(true),
  proposal: negotiationProposalSchema,
  summary: negotiationSummaryResponseSchema,
});

export const riderConfirmationResponseSchema = z.object({
  success: z.literal(true),
  proposal: negotiationProposalSchema,
  summary: negotiationSummaryResponseSchema,
});

export const finalAcceptanceResponseSchema = z.object({
  success: z.literal(true),
  proposalVersion: z.number().int().positive(),
  status: negotiationSummaryStatusEnum,
  agreement: bookingNegotiationAgreementSchema.nullable(),
  booking: z.custom<typeof bookings.$inferSelect>(),
});

export type RiderItemStatus = z.infer<typeof riderItemStatusEnum>;
export type NegotiationParticipantRole = z.infer<typeof negotiationParticipantRoleEnum>;
export type NegotiationProposalStatus = z.infer<typeof negotiationProposalStatusEnum>;
export type NegotiationSummaryStatus = z.infer<typeof negotiationSummaryStatusEnum>;
export type NegotiationActivityType = z.infer<typeof negotiationActivityTypeEnum>;
export type TechRiderRequirement = z.infer<typeof techRiderRequirementSchema>;
export type TechRiderBrings = z.infer<typeof techRiderBringsSchema>;
export type OrganizerCommitment = z.infer<typeof organizerCommitmentSchema>;
export type NegotiationSchedule = z.infer<typeof negotiationScheduleSchema>;
export type NegotiationTechRider = z.infer<typeof negotiationTechRiderSchema>;
export type NegotiationSnapshot = z.infer<typeof negotiationSnapshotSchema>;
export type NegotiationProposal = z.infer<typeof negotiationProposalSchema>;
export type BookingNegotiationAgreement = z.infer<typeof bookingNegotiationAgreementSchema>;
export type NegotiationState = z.infer<typeof negotiationStateSchema>;
export type NegotiationActivity = z.infer<typeof negotiationActivitySchema>;
export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>;
export type ProposalSubmitInput = z.infer<typeof proposalSubmitSchema>;
export type RiderConfirmationInput = z.infer<typeof riderConfirmationSchema>;
export type FinalAcceptanceInput = z.infer<typeof finalAcceptanceSchema>;
export type NegotiationSummaryResponse = z.infer<typeof negotiationSummaryResponseSchema>;
export type NegotiationStepState = z.infer<typeof negotiationStepStateEnum>;
export type NegotiationAction = z.infer<typeof negotiationActionEnum>;
export type NegotiationActionInput = z.infer<typeof negotiationActionInputSchema>;
export type StepHistoryRecord = z.infer<typeof stepHistoryRecordSchema>;
export type NegotiationSummaryResponseV2 = z.infer<typeof negotiationSummaryResponseSchemaV2>;

/**
 * Reusable contact person schema for organizer profiles.
 * 
 * Validates the primary contact person details for an organizer's company.
 * This schema is used in both onboarding (required) and profile updates (optional).
 * 
 * Stored in: `promoters.contact_person` JSONB column
 * 
 * Validation rules:
 * - name: Minimum 2 characters (supports international names)
 * - email: Must be valid email format (RFC 5322 compliant via Zod)
 * - phone: Minimum 10 characters (supports international formats with country codes)
 * 
 * @example
 * ```typescript
 * const validContact = {
 *   name: "Rahul Kumar",
 *   email: "rahul@sunrise.events",
 *   phone: "+919876543210"
 * };
 * contactPersonSchema.parse(validContact); // ✓ passes
 * ```
 */
const contactPersonSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

/**
 * Reusable social links schema for organizer profiles.
 * 
 * Validates social media handles for an organizer's public profile.
 * All fields are optional — organizers can provide any combination.
 * 
 * Stored in: `promoters.metadata.socialLinks` JSONB field
 * 
 * Validation rules:
 * - instagram: Accepts both "@username" and "username" formats, allows dots and underscores
 * - twitter: Accepts both "@handle" and "handle" formats, alphanumeric and underscores only
 * - linkedin: Any non-empty string (company page slug, profile URL, or custom identifier)
 * 
 * @example
 * ```typescript
 * const validSocials = {
 *   instagram: "@sunriseevents",
 *   twitter: "sunrise_events",
 *   linkedin: "sunrise-events-pvt-ltd"
 * };
 * socialLinksSchema.parse(validSocials); // ✓ passes
 * 
 * // All fields optional — partial updates work
 * socialLinksSchema.parse({ instagram: "@newhandle" }); // ✓ passes
 * ```
 */
const socialLinksSchema = z.object({
  instagram: z.string().regex(/^@?[\w.]+$/, "Invalid Instagram handle").optional().or(z.literal("")),
  twitter: z.string().regex(/^@?[\w]+$/, "Invalid Twitter handle").optional().or(z.literal("")),
  linkedin: z.string().min(1, "LinkedIn profile cannot be empty").optional().or(z.literal("")),
});

/**
 * Reusable stage schema for event creation.
 * 
 * Defines a performance stage within a multi-stage event setup.
 * Each stage can have its own time window and capacity, allowing organizers
 * to create complex event layouts (e.g., Main Stage + Terrace + VIP Lounge).
 * 
 * Used in: `createEventSchema.stages` array (optional)
 * Stored in: Event stages are stored in a separate `event_stages` table or
 *            in `events.metadata.stages` JSONB field (implementation-dependent)
 * 
 * Validation rules:
 * - name: Required, minimum 1 character (e.g., "Main Stage", "Terrace", "VIP Lounge")
 * - startTime: Optional ISO 8601 datetime, can differ from overall event start time
 * - endTime: Optional ISO 8601 datetime, can differ from overall event end time
 * - capacity: Optional positive integer, stage-specific capacity (subset of total event capacity)
 * 
 * @example
 * ```typescript
 * const mainStage = {
 *   name: "Main Stage",
 *   startTime: "2026-04-15T22:00:00Z",
 *   endTime: "2026-04-16T04:00:00Z",
 *   capacity: 600
 * };
 * eventStageSchema.parse(mainStage); // ✓ passes
 * 
 * // Minimal stage (only name required)
 * eventStageSchema.parse({ name: "Terrace" }); // ✓ passes
 * ```
 */
const eventStageSchema = z.object({
  /** Stage name (e.g. "Main Stage", "Terrace") */
  name: z.string().min(1, "Stage name is required"),
  /** Stage-specific start time */
  startTime: z.string().datetime().optional(),
  /** Stage-specific end time */
  endTime: z.string().datetime().optional(),
  /** Stage-specific capacity */
  capacity: z.number().int().positive().optional(),
});

/**
 * Validates the onboarding wizard submission for new Organizers.
 *
 * Used by: POST /api/organizer/profile/complete
 *
 * On successful submission the server stores:
 *   - organizationName → promoters.name
 *   - description      → promoters.description
 *   - contactPerson    → promoters.contact_person (JSONB)
 *   - website / pastEventReferences → promoters.metadata (JSONB)
 *   - metadata.profileComplete is set to true
 *   - metadata.trustScore is initialized to 50
 *
 * @example
 * ```ts
 * const input = {
 *   organizationName: "Sunrise Events",
 *   description: "Bangalore-based event management company specializing in electronic music",
 *   contactPerson: { name: "Rahul Kumar", email: "rahul@sunrise.events", phone: "+919876543210" },
 *   website: "https://sunrise.events",
 *   pastEventReferences: ["https://instagram.com/p/sunrisefest2025"],
 * };
 * organizerOnboardingSchema.parse(input); // ✓ valid
 * ```
 */
export const organizerOnboardingSchema = z.object({
  /** Display name for the organizer's company or brand (2–200 chars) */
  organizationName: z.string().min(2).max(200),
  /** Short bio / about section shown on the public profile (10–2000 chars) */
  description: z.string().min(10).max(2000),
  /** Primary contact person details — stored in promoters.contact_person JSONB */
  contactPerson: contactPersonSchema,
  /** Organization website URL (optional) — stored in promoters.metadata */
  website: z.string().url().optional().or(z.literal("")),
  /** Links or descriptions of past events for credibility (optional) */
  pastEventReferences: z.array(z.string().min(1)).optional(),
});

/**
 * Validates partial profile updates for an existing Organizer.
 * All fields are optional — only provided fields are updated.
 *
 * Used by: PUT /api/organizer/profile
 *
 * @example
 * ```ts
 * const update = {
 *   description: "Updated company description",
 *   socialLinks: { instagram: "@sunriseevents" },
 * };
 * organizerProfileUpdateSchema.parse(update); // ✓ valid
 * ```
 */
export const organizerProfileUpdateSchema = z.object({
  /** Updated organization name (2–200 chars) */
  name: z.string().min(2).max(200).optional(),
  /** Updated description / bio (max 2000 chars) */
  description: z.string().max(2000).optional(),
  /** Updated contact person details */
  contactPerson: contactPersonSchema.optional(),
  /** Updated website URL */
  website: z.string().url().optional().or(z.literal("")),
  /** Social media handles — stored in promoters.metadata.socialLinks */
  socialLinks: socialLinksSchema.optional(),
});

/**
 * Validates event creation input from the Organizer.
 * Events are created in "draft" status and must be explicitly published
 * to appear in the Artist "Find Gigs" discovery feed.
 *
 * Used by: POST /api/organizer/events
 *
 * The created event record sets:
 *   - events.organizer_id = organizer's promoter ID
 *   - events.status = "draft"
 *
 * @example
 * ```ts
 * const event = {
 *   title: "Friday Night Techno",
 *   startTime: "2026-04-15T22:00:00Z",
 *   endTime: "2026-04-16T04:00:00Z",
 *   venueId: 42,
 *   visibility: "public",
 *   stages: [
 *     { name: "Main Stage", startTime: "2026-04-15T22:00:00Z", endTime: "2026-04-16T04:00:00Z" },
 *   ],
 * };
 * createEventSchema.parse(event); // ✓ valid
 * ```
 */
export const createEventSchema = z.object({
  /** Event title (3–200 chars) */
  title: z.string().min(3).max(200),
  /** Detailed event description */
  description: z.string().optional(),
  /** ISO 8601 datetime for event start */
  startTime: z.string().datetime(),
  /** ISO 8601 datetime for event end (optional) */
  endTime: z.string().datetime().optional(),
  /** Temporary venue details, if venue is unregistered */
  temporaryVenue: z.object({
    name: z.string().min(1, "Venue name is required"),
    location: z.string().min(1, "Location is required"),
    mapsLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    directions: z.string().optional(),
    landmark: z.string().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
  }).optional(),
  /** FK to venues table — omit for TBA / manual venue entry */
  venueId: z.number().optional(),
  /** Total event capacity (positive integer) */
  capacityTotal: z.number().int().positive().optional(),
  /** ISO 4217 currency code, defaults to INR (India-focused platform) */
  currency: z.string().length(3).default("INR"),
  /** "public" events appear in artist discovery; "private" are invite-only */
  visibility: z.enum(["public", "private"]).default("private"),
  /** Optional multi-stage setup — each stage has its own time window and capacity */
  stages: z.array(eventStageSchema).optional(),
});

/**
 * Validates the event completion confirmation submitted by an Organizer
 * after an event's end time has passed.
 *
 * Used by: POST /api/organizer/bookings/:id/complete
 *
 * On submission the server records feedback in booking.meta.completionFeedback.
 * If both the Organizer and Artist confirm, the booking transitions to "completed"
 * and the final payment milestone is triggered.
 *
 * Auto-confirm: If the Organizer does not confirm within 48 hours of event end,
 * the platform auto-confirms and proceeds with payment release.
 *
 * @example
 * ```ts
 * const confirmation = { confirmed: true, rating: 4, note: "Great set, crowd loved it" };
 * completionConfirmSchema.parse(confirmation); // ✓ valid
 * ```
 */
export const completionConfirmSchema = z.object({
  /** Whether the organizer confirms the artist performed as per contract */
  confirmed: z.boolean(),
  /** Internal performance rating (1–5 stars, not public) */
  rating: z.number().int().min(1).max(5),
  /** Optional private note about the performance (max 1000 chars) */
  note: z.string().max(1000).optional(),
});

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema.extend({
        roleData: z.union([
          insertArtistSchema,
          insertOrganizerSchema,
          insertVenueSchema
        ]).optional()
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    user: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect & { artist?: typeof artists.$inferSelect, organizer?: typeof organizers.$inferSelect, venue?: typeof venues.$inferSelect }>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  artists: {
    list: {
      method: 'GET' as const,
      path: '/api/artists',
      input: z.object({
        genre: z.string().optional(),
        minFee: z.coerce.number().optional(),
        maxFee: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof artists.$inferSelect & { user: typeof users.$inferSelect }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/artists/:id',
      responses: {
        200: z.custom<typeof artists.$inferSelect & { user: typeof users.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/artists/:id',
      input: insertArtistSchema.partial(),
      responses: {
        200: z.custom<typeof artists.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  venues: {
    list: {
      method: 'GET' as const,
      path: '/api/venues',
      responses: {
        200: z.array(z.custom<typeof venues.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/venues/:id',
      responses: {
        200: z.custom<typeof venues.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  bookings: {
    list: {
      method: 'GET' as const,
      path: '/api/bookings',
      responses: {
        200: z.array(z.custom<typeof bookings.$inferSelect & {
          artist: typeof artists.$inferSelect & { user: typeof users.$inferSelect },
          organizer: typeof organizers.$inferSelect & { user: typeof users.$inferSelect; organizationName?: string },
          venue: typeof venues.$inferSelect | { name: string; address: string } | null,
          eventDate: string | Date,
          slotTime: string | null,
          notes: string | null,
          event: any
        }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bookings',
      input: insertBookingSchema.extend({
        eventDate: z.union([z.string(), z.date()]).optional(),
        notes: z.string().optional(),
        slotTime: z.string().optional(),
        organizerId: z.number().optional(),
        offerAmount: z.union([z.string(), z.number()]).optional(),
        depositAmount: z.union([z.string(), z.number()]).optional(),
      }),
      responses: {
        201: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bookings/:id',
      input: insertBookingSchema.partial(),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    negotiate: {
      method: 'POST' as const,
      path: '/api/bookings/:id/negotiate',
      input: z.object({
        offerAmount: z.coerce.number().optional(),
        counterOffer: z.coerce.number().optional(),
        message: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
      deprecated: true,
    },
    accept: {
      method: 'POST' as const,
      path: '/api/bookings/:id/accept',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
      deprecated: true,
    },
    decline: {
      method: 'POST' as const,
      path: '/api/bookings/:id/decline',
      responses: {
        200: z.custom<typeof bookings.$inferSelect>(),
        400: errorSchemas.validation,
      },
      deprecated: true,
    },
    // --- New Negotiation API Routes ---
    apply: {
      method: 'POST' as const,
      path: '/api/bookings/apply',
      input: applicationSubmitSchema,
      responses: {
        201: applicationSubmitResponseSchema,
        400: errorSchemas.validation,
      },
    },
    negotiationSummary: {
      method: 'GET' as const,
      path: '/api/bookings/:id/negotiation',
      responses: {
        200: negotiationSummaryResponseSchema,
        404: errorSchemas.notFound,
      },
    },
    submitProposal: {
      method: 'POST' as const,
      path: '/api/bookings/:id/negotiation/propose',
      input: proposalSubmitSchema,
      responses: {
        200: proposalSubmitResponseSchema,
        400: errorSchemas.validation,
      },
    },
    confirmRider: {
      method: 'POST' as const,
      path: '/api/bookings/:id/negotiation/rider-confirm',
      input: riderConfirmationSchema,
      responses: {
        200: riderConfirmationResponseSchema,
        400: errorSchemas.validation,
      },
    },
    finalAccept: {
      method: 'POST' as const,
      path: '/api/bookings/:id/negotiation/accept',
      input: finalAcceptanceSchema,
      responses: {
        200: finalAcceptanceResponseSchema,
        400: errorSchemas.validation,
      },
    },
    walkAway: {
      method: 'POST' as const,
      path: '/api/bookings/:id/negotiation/walk-away',
      input: z.object({ reason: z.string().optional() }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    // --- 4-Step Negotiation Action ---
    negotiationAction: {
      method: 'POST' as const,
      path: '/api/bookings/:id/negotiation/action',
      input: negotiationActionInputSchema,
      responses: {
        200: z.object({
          success: z.literal(true),
          summary: negotiationSummaryResponseSchemaV2,
        }),
        400: errorSchemas.validation,
      },
    },
  },
  // ==========================================================================
  // Organizer API Routes
  // ==========================================================================
  // All endpoints require authentication and organizer/promoter role.
  // Implemented in server/routes/organizer.ts, mounted in server/routes.ts.
  // Data is stored in the existing `promoters` table (aliased as `organizers`).
  // ==========================================================================
  organizer: {
    // --- Profile Management ---------------------------------------------------
    profile: {
      /** Fetch the authenticated organizer's full profile joined with user data */
      get: {
        method: 'GET' as const,
        path: '/api/organizer/profile',
        responses: {
          200: z.custom<typeof promoters.$inferSelect & { user: typeof users.$inferSelect }>(),
          401: errorSchemas.unauthorized,
        },
      },
      /** Partially update organizer profile fields (name, description, contacts, socials) */
      update: {
        method: 'PUT' as const,
        path: '/api/organizer/profile',
        input: organizerProfileUpdateSchema,
        responses: {
          200: z.custom<typeof promoters.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        },
      },
      /**
       * Complete the onboarding wizard.
       * Sets metadata.profileComplete = true and initializes trustScore to 50.
       * After completion the organizer is no longer redirected to /organizer/setup.
       */
      complete: {
        method: 'POST' as const,
        path: '/api/organizer/profile/complete',
        input: organizerOnboardingSchema,
        responses: {
          200: z.object({ message: z.string(), organizer: z.custom<typeof promoters.$inferSelect>() }),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        },
      },
      /** Quick check whether the organizer has completed onboarding (drives redirect logic) */
      status: {
        method: 'GET' as const,
        path: '/api/organizer/profile/status',
        responses: {
          200: z.object({ isComplete: z.boolean() }),
          401: errorSchemas.unauthorized,
        },
      },
    },

    // --- Dashboard ------------------------------------------------------------
    /**
     * Aggregated stats for the organizer dashboard:
     * totalEvents, upcomingEvents, activeBookings, pendingNegotiations,
     * totalSpent (sum of completed payments), and current trustScore.
     */
    dashboard: {
      method: 'GET' as const,
      path: '/api/organizer/dashboard',
      responses: {
        200: z.object({
          totalEvents: z.number(),
          upcomingEvents: z.number(),
          activeBookings: z.number(),
          pendingNegotiations: z.number(),
          totalSpent: z.number(),
          trustScore: z.number(),
        }),
        401: errorSchemas.unauthorized,
      },
    },

    // --- Event CRUD -----------------------------------------------------------
    events: {
      /** List all events owned by the organizer, optionally filtered by status */
      list: {
        method: 'GET' as const,
        path: '/api/organizer/events',
        input: z.object({
          status: z.string().optional(),
        }).optional(),
        responses: {
          200: z.array(z.custom<typeof events.$inferSelect>()),
          401: errorSchemas.unauthorized,
        },
      },
      /**
       * Create a new event in "draft" status.
       * organizer_id is set automatically from the authenticated user's promoter record.
       */
      create: {
        method: 'POST' as const,
        path: '/api/organizer/events',
        input: createEventSchema,
        responses: {
          201: z.custom<typeof events.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        },
      },
      /**
       * Update an existing event. Only draft/published events can be edited.
       * If the event has confirmed bookings, startTime and venueId are locked.
       */
      update: {
        method: 'PUT' as const,
        path: '/api/organizer/events/:id',
        input: createEventSchema.partial(),
        responses: {
          200: z.custom<typeof events.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
          404: errorSchemas.notFound,
        },
      },
      /**
       * Delete an event. Fails with 409 if the event has active (non-terminal) bookings.
       * Terminal statuses: cancelled, completed, refunded.
       */
      delete: {
        method: 'DELETE' as const,
        path: '/api/organizer/events/:id',
        responses: {
          200: z.object({ message: z.string() }),
          401: errorSchemas.unauthorized,
          404: errorSchemas.notFound,
          409: errorSchemas.conflict,
        },
      },
      /** Transition an event from "draft" → "published", making it visible to artists */
      publish: {
        method: 'PUT' as const,
        path: '/api/organizer/events/:id/publish',
        responses: {
          200: z.custom<typeof events.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
          404: errorSchemas.notFound,
        },
      },
    },

    // --- Booking Management ---------------------------------------------------
    bookings: {
      /** List all bookings for the organizer's events, optionally filtered by status */
      list: {
        method: 'GET' as const,
        path: '/api/organizer/bookings',
        input: z.object({
          status: z.string().optional(),
        }).optional(),
        responses: {
          200: z.array(z.custom<typeof bookings.$inferSelect>()),
          401: errorSchemas.unauthorized,
        },
      },
      /** Get a single booking's full details (verifies organizer ownership) */
      get: {
        method: 'GET' as const,
        path: '/api/organizer/bookings/:id',
        responses: {
          200: z.custom<typeof bookings.$inferSelect>(),
          401: errorSchemas.unauthorized,
          404: errorSchemas.notFound,
        },
      },
      /**
       * Confirm event completion for a booking after the event end time.
       * Records feedback in booking.meta.completionFeedback.
       * If both parties confirm, booking transitions to "completed" and
       * the final payment milestone is triggered.
       */
      complete: {
        method: 'POST' as const,
        path: '/api/organizer/bookings/:id/complete',
        input: completionConfirmSchema,
        responses: {
          200: z.custom<typeof bookings.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
          404: errorSchemas.notFound,
        },
      },
    },

    // --- Activity Feed --------------------------------------------------------
    /**
     * Recent activity feed from audit_logs for the organizer's dashboard.
     * Returns the most recent N entries (default 10), newest first.
     */
    activity: {
      method: 'GET' as const,
      path: '/api/organizer/activity',
      input: z.object({
        /** Number of activity entries to return (default: 10) */
        limit: z.coerce.number().int().positive().default(10),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications',
      responses: {
        200: z.object({
          notifications: z.array(z.any()),
          unreadCount: z.number(),
          total: z.number(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    unreadCount: {
      method: 'GET' as const,
      path: '/api/notifications/unread-count',
      responses: {
        200: z.object({ count: z.number() }),
        401: errorSchemas.unauthorized,
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read',
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
    markAllRead: {
      method: 'POST' as const,
      path: '/api/notifications/read-all',
      responses: {
        200: z.object({ success: z.boolean(), count: z.number() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
