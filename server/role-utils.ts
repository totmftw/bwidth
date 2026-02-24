/**
 * Normalizes a registration role input to the canonical role stored in metadata.
 * - "venue" -> "venue_manager" (to match role_name enum)
 * - undefined/null/empty -> "artist" (default)
 * - all other values pass through unchanged
 */
export function normalizeRegistrationRole(role: string | undefined | null): string {
  if (!role) return 'artist';
  if (role === 'venue') return 'venue_manager';
  return role;
}

/**
 * Determines whether an organizer record should be created for a given role.
 */
export function shouldCreateOrganizerRecord(normalizedRole: string): boolean {
  return normalizedRole === 'organizer';
}

/** Valid roles in the role_name enum */
export const VALID_ROLES = ['artist', 'band_manager', 'organizer', 'venue_manager', 'admin', 'staff'] as const;
