import { z } from 'zod';

// ---------------------------------------------------------------------------
// Artist Profile Utilities
// ---------------------------------------------------------------------------
// Extracted from server/routes.ts so that the Zod schema, metadata builder,
// record builder, and validator can be imported independently by:
//   - The POST /api/artists/profile/complete route handler (server/routes.ts)
//   - Property-based tests (tests/properties/artist-profile.prop.ts)
//
// This separation keeps route handlers thin and makes the pure business logic
// easy to test without spinning up an HTTP server.
// ---------------------------------------------------------------------------

/**
 * Zod schema for the artist profile completion request body.
 *
 * Field names match what the frontend ProfileSetup wizard sends.
 * `z.coerce.number()` is used for fee/experience fields because form data
 * may arrive as strings from HTML inputs.
 *
 * Constraints:
 *   - stageName:          min 2 chars (artist display name)
 *   - bio:                50–500 chars (enforced by frontend textarea)
 *   - location:           min 2 chars (city / area name)
 *   - yearsOfExperience:  0–50, optional
 *   - primaryGenre:       required, at least 1 char
 *   - secondaryGenres:    max 3 items (UI caps selection)
 *   - feeMin / feeMax:    minimum ₹100 (platform floor)
 *   - currency:           defaults to "INR" (India-first platform)
 */
export const artistProfileCompleteSchema = z.object({
  stageName: z.string().min(2),
  bio: z.string().min(50).max(500),
  location: z.string().min(2),
  yearsOfExperience: z.coerce.number().min(0).max(50).optional(),
  primaryGenre: z.string().min(1),
  secondaryGenres: z.array(z.string()).max(3).optional(),
  feeMin: z.coerce.number().min(100),
  feeMax: z.coerce.number().min(100),
  currency: z.string().default("INR"),
  performanceDurations: z.array(z.string()).optional(),
  // Social / external links — all optional
  soundcloudUrl: z.string().optional(),
  mixcloudUrl: z.string().optional(),
  instagramHandle: z.string().optional(),
  websiteUrl: z.string().optional(),
  // Free-text optional fields
  achievements: z.string().optional(),
  technicalRider: z.string().optional(),
  equipmentRequirements: z.string().optional(),
  travelPreferences: z.string().optional(),
});

/** Inferred TypeScript type from the Zod schema — use for typed function params. */
export type ArtistProfileInput = z.infer<typeof artistProfileCompleteSchema>;

/**
 * Builds the JSONB `metadata` object stored on the `artists` table row.
 *
 * Key behaviours:
 *   - Always sets `profileComplete: true` — this flag drives the
 *     GET /api/artists/profile/status endpoint.
 *   - Sets a default `trustScore` of 50 for new profiles (platform midpoint).
 *   - Stamps `updatedAt` with the current ISO timestamp.
 *   - When `existingMetadata` is provided (update path), spreads it first so
 *     that any keys not part of the profile form (e.g. admin-set flags) are
 *     preserved. New values overwrite matching keys.
 *
 * @param profileData      - Validated profile input (post-Zod-parse).
 * @param existingMetadata - Current metadata from the DB row, if updating.
 *                           Omit on first-time profile creation.
 * @returns A plain object ready to be stored as `artists.metadata`.
 *
 * @example
 *   // Create path (no existing metadata)
 *   const meta = buildArtistMetadata(parsedInput);
 *
 *   // Update path (merge with existing)
 *   const meta = buildArtistMetadata(parsedInput, artist.metadata);
 */
export function buildArtistMetadata(profileData: ArtistProfileInput, existingMetadata?: Record<string, any>) {
  const newMetadata = {
    yearsOfExperience: profileData.yearsOfExperience,
    primaryGenre: profileData.primaryGenre,
    secondaryGenres: profileData.secondaryGenres || [],
    performanceDurations: profileData.performanceDurations || [],
    // Social links are stored under short keys (no "Url" / "Handle" suffix)
    soundcloud: profileData.soundcloudUrl,
    mixcloud: profileData.mixcloudUrl,
    instagram: profileData.instagramHandle,
    website: profileData.websiteUrl,
    achievements: profileData.achievements,
    technicalRider: profileData.technicalRider,
    equipmentRequirements: profileData.equipmentRequirements,
    travelPreferences: profileData.travelPreferences,
    // Completion & trust flags
    profileComplete: true,
    trustScore: 50,
    updatedAt: new Date().toISOString(),
  };

  // Merge strategy: existing keys survive unless explicitly overwritten above.
  return existingMetadata
    ? { ...existingMetadata, ...newMetadata }
    : newMetadata;
}

/**
 * Builds the top-level column values for an `artists` table row from
 * validated profile data.
 *
 * Note: `priceFrom` and `priceTo` are stored as strings (numeric column
 * in Drizzle schema uses `text` representation) — hence the `String()` cast.
 * `baseLocation` is a JSONB column storing `{ name: string }`.
 *
 * @param profileData - Validated profile input (post-Zod-parse).
 * @returns An object whose keys map 1:1 to `artists` table columns.
 *
 * @example
 *   const record = buildArtistRecord(parsedInput);
 *   await storage.createArtist({ userId: user.id, ...record, metadata });
 */
export function buildArtistRecord(profileData: ArtistProfileInput) {
  return {
    name: profileData.stageName,
    bio: profileData.bio,
    priceFrom: String(profileData.feeMin),
    priceTo: String(profileData.feeMax),
    currency: profileData.currency,
    baseLocation: { name: profileData.location },
  };
}

/**
 * Validates raw (untrusted) input against the artist profile schema.
 *
 * Returns a discriminated union so callers can branch cleanly:
 *   - `{ success: true, data }` — parsed & coerced data ready for use.
 *   - `{ success: false, errors }` — array of Zod issues with field paths,
 *     suitable for returning as a 400 response body.
 *
 * @param input - Raw request body (typically `req.body`).
 * @returns Discriminated union of success/failure.
 *
 * @example
 *   const result = validateArtistProfile(req.body);
 *   if (!result.success) {
 *     return res.status(400).json({ message: "Validation failed", errors: result.errors });
 *   }
 *   const { data } = result; // ArtistProfileInput
 */
export function validateArtistProfile(input: unknown):
  | { success: true; data: ArtistProfileInput }
  | { success: false; errors: z.ZodIssue[] } {
  const result = artistProfileCompleteSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}
