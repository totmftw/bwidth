import { z } from 'zod';

// ---------------------------------------------------------------------------
// Venue Profile Utilities
// ---------------------------------------------------------------------------
// Extracted from server/routes.ts so that the Zod schema, metadata builder,
// record builder, and validator can be imported independently by:
//   - The POST /api/venues/profile/complete route handler (server/routes.ts)
//   - Property-based tests (tests/properties/venue-profile.prop.ts)
//
// This separation keeps route handlers thin and makes the pure business logic
// easy to test without spinning up an HTTP server.
// ---------------------------------------------------------------------------

/**
 * Zod schema for the venue profile completion request body.
 *
 * Field names match what the frontend 7-step venue setup wizard sends.
 * `z.coerce.number()` is used for capacity fields because form data
 * may arrive as strings from HTML inputs.
 *
 * Required fields:
 *   - name:        min 2 chars (venue display name)
 *   - description: 10–1000 chars
 *   - address:     min 5 chars
 *   - city:        min 2 chars
 *   - capacity:    min 1
 *
 * Optional fields:
 *   - capacitySeated, capacityStanding, amenities, website,
 *     instagramHandle, bookingEmail, bookingPhone, metadata
 */
export const venueProfileCompleteSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10).max(1000),
  address: z.string().min(5),
  city: z.string().min(2),
  capacity: z.coerce.number().min(1),
  capacitySeated: z.coerce.number().optional(),
  capacityStanding: z.coerce.number().optional(),
  amenities: z.array(z.string()).optional(),
  website: z.string().optional(),
  instagramHandle: z.string().optional(),
  bookingEmail: z.string().email().optional().or(z.literal("")),
  bookingPhone: z.string().optional(),
  // Extended metadata from 7-step onboarding
  metadata: z.object({
    state: z.string().optional(),
    pincode: z.string().optional(),
    spaceDimensions: z.object({
      stageWidth: z.number().optional(),
      stageDepth: z.number().optional(),
      ceilingHeight: z.number().optional(),
    }).optional(),
    musicPolicy: z.object({
      preferredGenres: z.array(z.string()).optional(),
      targetAudience: z.string().optional(),
      eventFrequency: z.string().optional(),
      bookingMode: z.string().optional(),
    }).optional(),
    equipment: z.array(z.string()).optional(),
    photos: z.object({
      coverImageUrl: z.string().optional(),
      galleryUrls: z.array(z.string()).optional(),
      virtualTourUrl: z.string().optional(),
    }).optional(),
    bookingPreferences: z.object({
      monthlyBudgetMin: z.number().optional(),
      monthlyBudgetMax: z.number().optional(),
      operatingDays: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

/** Inferred TypeScript type from the Zod schema — use for typed function params. */
export type VenueProfileInput = z.infer<typeof venueProfileCompleteSchema>;

/**
 * Builds the JSONB `metadata` object stored on the `venues` table row.
 *
 * Key behaviours:
 *   - Always sets `profileComplete: true` — this flag drives the
 *     GET /api/venues/profile/status endpoint.
 *   - Stamps `updatedAt` with the current ISO timestamp.
 *   - When `existingMetadata` is provided (update path), spreads it first so
 *     that any keys not part of the profile form (e.g. admin-set flags) are
 *     preserved. New values overwrite matching keys.
 *   - Merges extended metadata from the 7-step onboarding wizard.
 *
 * @param profileData      - Validated profile input (post-Zod-parse).
 * @param existingMetadata - Current metadata from the DB row, if updating.
 * @returns A plain object ready to be stored as `venues.metadata`.
 */
export function buildVenueMetadata(profileData: VenueProfileInput, existingMetadata?: Record<string, any>) {
  const baseMetadata = {
    profileComplete: true,
    website: profileData.website,
    instagram: profileData.instagramHandle,
    bookingEmail: profileData.bookingEmail,
    bookingPhone: profileData.bookingPhone,
    updatedAt: new Date().toISOString(),
  };

  const extendedMetadata = profileData.metadata || {};
  const newMetadata = { ...baseMetadata, ...extendedMetadata };

  return existingMetadata
    ? { ...existingMetadata, ...newMetadata }
    : newMetadata;
}

/**
 * Builds the top-level column values for a `venues` table row from
 * validated profile data.
 *
 * @param profileData - Validated profile input (post-Zod-parse).
 * @returns An object whose keys map to `venues` table columns.
 */
export function buildVenueRecord(profileData: VenueProfileInput) {
  return {
    name: profileData.name,
    description: profileData.description,
    address: { street: profileData.address, city: profileData.city },
    capacity: profileData.capacity,
    capacitySeated: profileData.capacitySeated,
    capacityStanding: profileData.capacityStanding,
    amenities: profileData.amenities,
  };
}

/**
 * Validates raw (untrusted) input against the venue profile schema.
 *
 * Returns a discriminated union so callers can branch cleanly:
 *   - `{ success: true, data }` — parsed & coerced data ready for use.
 *   - `{ success: false, errors }` — array of Zod issues with field paths.
 *
 * @param input - Raw request body (typically `req.body`).
 * @returns Discriminated union of success/failure.
 */
export function validateVenueProfile(input: unknown):
  | { success: true; data: VenueProfileInput }
  | { success: false; errors: z.ZodIssue[] } {
  const result = venueProfileCompleteSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}
