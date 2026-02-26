/**
 * Role resolver utilities for determining a user's canonical role.
 *
 * These functions mirror the logic used in:
 *   - client/src/App.tsx  (getUserRole — frontend routing)
 *   - server/routes/contracts.ts (getUserRole — contract side classification)
 *
 * Extracted here so both call-sites can share the logic and property tests
 * can import them directly.
 */

/**
 * Resolves the canonical user role from a user object.
 *
 * Resolution order:
 *   1. `user.metadata.role` — normalises "venue" → "venue_manager"
 *   2. Attached profile entities (venue, organizer, artist)
 *   3. Default: "artist"
 */
export function resolveUserRole(user: {
  metadata?: { role?: string } | null;
  venue?: unknown;
  organizer?: unknown;
  artist?: unknown;
}): string {
  if (user.metadata?.role) {
    const role = user.metadata.role;
    return role === 'venue' ? 'venue_manager' : role;
  }

  if (user.venue) return 'venue_manager';
  if (user.organizer) return 'organizer';
  if (user.artist) return 'artist';

  return 'artist';
}

/**
 * Classifies a user as either 'artist' or 'promoter' for contract purposes.
 *
 * - artist / band_manager → 'artist'
 * - venue_manager / venue / organizer / promoter → 'promoter'
 * - anything else → 'promoter'
 */
export function resolveContractRole(user: {
  metadata?: { role?: string } | null;
  role?: string;
}): 'artist' | 'promoter' {
  const role = user.metadata?.role || user.role;
  if (role === 'artist' || role === 'band_manager') return 'artist';
  if (role === 'venue_manager' || role === 'venue' || role === 'organizer' || role === 'promoter') return 'promoter';
  return 'promoter';
}
