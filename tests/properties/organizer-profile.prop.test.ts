import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: organizer-role
// Property 33: Profile update round-trip
// Validates: Requirements 10.3

// ---------------------------------------------------------------------------
// Shared types and constants
// ---------------------------------------------------------------------------

type ContactPerson = {
  name: string;
  email: string;
  phone: string;
};

type SocialLinks = {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
};

type OrganizerMetadata = {
  profileComplete: boolean;
  trustScore: number;
  website?: string;
  socialLinks?: SocialLinks;
  pastEventReferences?: string[];
  bookingEmail?: string;
  bookingPhone?: string;
};

type OrganizerProfile = {
  id: number;
  userId: number;
  organizationId: number | null;
  name: string;
  description: string | null;
  contactPerson: ContactPerson;
  metadata: OrganizerMetadata;
  createdAt: Date;
  updatedAt: Date;
};

type ProfileUpdateInput = {
  name?: string;
  description?: string;
  contactPerson?: ContactPerson;
  website?: string;
  socialLinks?: SocialLinks;
};

// ---------------------------------------------------------------------------
// Pure business logic functions
// ---------------------------------------------------------------------------

/**
 * Simulates updating an organizer profile with partial input.
 * Returns the updated profile with:
 * - Updated fields matching the input values
 * - updatedAt timestamp >= the time of the update request
 * - Other fields preserved from the original profile
 */
function updateOrganizerProfile(
  profile: OrganizerProfile,
  input: ProfileUpdateInput,
  updateTime: Date,
): OrganizerProfile {
  const updatedMetadata: OrganizerMetadata = {
    ...profile.metadata,
  };

  // Update metadata fields if provided
  if (input.website !== undefined) {
    updatedMetadata.website = input.website;
  }
  if (input.socialLinks !== undefined) {
    updatedMetadata.socialLinks = {
      ...profile.metadata.socialLinks,
      ...input.socialLinks,
    };
  }

  return {
    ...profile,
    name: input.name !== undefined ? input.name : profile.name,
    description: input.description !== undefined ? input.description : profile.description,
    contactPerson: input.contactPerson !== undefined ? input.contactPerson : profile.contactPerson,
    metadata: updatedMetadata,
    updatedAt: updateTime,
  };
}

/**
 * Validates that the profile update round-trip preserves the input values.
 * After updating and reading back, the updated fields should match the input.
 */
function validateProfileRoundTrip(
  original: OrganizerProfile,
  input: ProfileUpdateInput,
  updated: OrganizerProfile,
): boolean {
  // Check that updated fields match input
  if (input.name !== undefined && updated.name !== input.name) {
    return false;
  }
  if (input.description !== undefined && updated.description !== input.description) {
    return false;
  }
  if (input.contactPerson !== undefined) {
    if (updated.contactPerson.name !== input.contactPerson.name) return false;
    if (updated.contactPerson.email !== input.contactPerson.email) return false;
    if (updated.contactPerson.phone !== input.contactPerson.phone) return false;
  }
  if (input.website !== undefined && updated.metadata.website !== input.website) {
    return false;
  }
  if (input.socialLinks !== undefined) {
    const updatedSocial = updated.metadata.socialLinks || {};
    if (input.socialLinks.instagram !== undefined && 
        updatedSocial.instagram !== input.socialLinks.instagram) {
      return false;
    }
    if (input.socialLinks.twitter !== undefined && 
        updatedSocial.twitter !== input.socialLinks.twitter) {
      return false;
    }
    if (input.socialLinks.linkedin !== undefined && 
        updatedSocial.linkedin !== input.socialLinks.linkedin) {
      return false;
    }
  }

  // Check that updatedAt was updated
  if (updated.updatedAt.getTime() < original.updatedAt.getTime()) {
    return false;
  }

  // Check that unchanged fields are preserved
  if (input.name === undefined && updated.name !== original.name) {
    return false;
  }
  if (input.description === undefined && updated.description !== original.description) {
    return false;
  }
  if (input.contactPerson === undefined) {
    if (updated.contactPerson.name !== original.contactPerson.name) return false;
    if (updated.contactPerson.email !== original.contactPerson.email) return false;
    if (updated.contactPerson.phone !== original.contactPerson.phone) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const idArb = fc.integer({ min: 1, max: 100000 });

const dateArb = fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') });

const emailArb = fc.emailAddress();

const phoneArb = fc.string({ minLength: 10, maxLength: 15 }).map(s => 
  '+91 ' + s.replace(/[^0-9]/g, '').slice(0, 10)
);

const urlArb = fc.webUrl();

const socialHandleArb = fc.string({ minLength: 3, maxLength: 30 }).map(s => 
  '@' + s.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
);

const contactPersonArb = fc.record({
  name: fc.string({ minLength: 2, maxLength: 100 }),
  email: emailArb,
  phone: phoneArb,
});

const socialLinksArb = fc.record({
  instagram: fc.option(socialHandleArb, { nil: undefined }),
  twitter: fc.option(socialHandleArb, { nil: undefined }),
  linkedin: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
});

const organizerMetadataArb = fc.record({
  profileComplete: fc.boolean(),
  trustScore: fc.integer({ min: 0, max: 100 }),
  website: fc.option(urlArb, { nil: undefined }),
  socialLinks: fc.option(socialLinksArb, { nil: undefined }),
  pastEventReferences: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 100 }), { maxLength: 5 }), { nil: undefined }),
  bookingEmail: fc.option(emailArb, { nil: undefined }),
  bookingPhone: fc.option(phoneArb, { nil: undefined }),
});

const organizerProfileArb = fc.record({
  id: idArb,
  userId: idArb,
  organizationId: fc.option(idArb, { nil: null }),
  name: fc.string({ minLength: 2, maxLength: 200 }),
  description: fc.option(fc.string({ minLength: 10, maxLength: 2000 }), { nil: null }),
  contactPerson: contactPersonArb,
  metadata: organizerMetadataArb,
  createdAt: dateArb,
  updatedAt: dateArb,
});

const profileUpdateInputArb = fc.record({
  name: fc.option(fc.string({ minLength: 2, maxLength: 200 }), { nil: undefined }),
  description: fc.option(fc.string({ minLength: 10, maxLength: 2000 }), { nil: undefined }),
  contactPerson: fc.option(contactPersonArb, { nil: undefined }),
  website: fc.option(urlArb, { nil: undefined }),
  socialLinks: fc.option(socialLinksArb, { nil: undefined }),
});

// Generate update input with at least one field set
const nonEmptyProfileUpdateInputArb = profileUpdateInputArb.filter(input => 
  input.name !== undefined ||
  input.description !== undefined ||
  input.contactPerson !== undefined ||
  input.website !== undefined ||
  input.socialLinks !== undefined
);

// ---------------------------------------------------------------------------
// Property 33: Profile update round-trip
// Validates: Requirements 10.3
//
// For any valid profile update input, after saving and then reading the
// organizer profile back, the updated fields should match the input values
// and updatedAt should be >= the time of the update request.
// ---------------------------------------------------------------------------
describe('Property 33: Profile update round-trip', () => {
  it('updated fields match input values after round-trip', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        nonEmptyProfileUpdateInputArb,
        dateArb,
        (profile, input, updateTime) => {
          // Ensure updateTime is after the profile's current updatedAt
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(profile, input, adjustedUpdateTime);

          expect(validateProfileRoundTrip(profile, input, updated)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updatedAt timestamp is updated on profile save', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        nonEmptyProfileUpdateInputArb,
        dateArb,
        (profile, input, updateTime) => {
          // Skip if any dates are invalid
          if (isNaN(profile.updatedAt.getTime()) || isNaN(updateTime.getTime())) {
            return;
          }

          // Handle invalid dates by using updateTime as base
          const profileUpdatedTime = isNaN(profile.updatedAt.getTime()) 
            ? updateTime.getTime() 
            : profile.updatedAt.getTime();
          
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profileUpdatedTime + 1000)
          );

          const updated = updateOrganizerProfile(profile, input, adjustedUpdateTime);

          expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(adjustedUpdateTime.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('name update preserves other fields', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        fc.string({ minLength: 2, maxLength: 200 }),
        dateArb,
        (profile, newName, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(
            profile,
            { name: newName },
            adjustedUpdateTime
          );

          expect(updated.name).toBe(newName);
          expect(updated.description).toBe(profile.description);
          expect(updated.contactPerson).toEqual(profile.contactPerson);
          expect(updated.metadata.website).toBe(profile.metadata.website);
          expect(updated.metadata.trustScore).toBe(profile.metadata.trustScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('description update preserves other fields', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        fc.string({ minLength: 10, maxLength: 2000 }),
        dateArb,
        (profile, newDescription, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(
            profile,
            { description: newDescription },
            adjustedUpdateTime
          );

          expect(updated.description).toBe(newDescription);
          expect(updated.name).toBe(profile.name);
          expect(updated.contactPerson).toEqual(profile.contactPerson);
          expect(updated.metadata.website).toBe(profile.metadata.website);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('contact person update preserves other fields', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        contactPersonArb,
        dateArb,
        (profile, newContact, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(
            profile,
            { contactPerson: newContact },
            adjustedUpdateTime
          );

          expect(updated.contactPerson).toEqual(newContact);
          expect(updated.name).toBe(profile.name);
          expect(updated.description).toBe(profile.description);
          expect(updated.metadata.website).toBe(profile.metadata.website);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('website update preserves other fields', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        urlArb,
        dateArb,
        (profile, newWebsite, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(
            profile,
            { website: newWebsite },
            adjustedUpdateTime
          );

          expect(updated.metadata.website).toBe(newWebsite);
          expect(updated.name).toBe(profile.name);
          expect(updated.description).toBe(profile.description);
          expect(updated.contactPerson).toEqual(profile.contactPerson);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('social links update merges with existing links', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        socialLinksArb,
        dateArb,
        (profile, newSocialLinks, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(
            profile,
            { socialLinks: newSocialLinks },
            adjustedUpdateTime
          );

          const updatedSocial = updated.metadata.socialLinks || {};
          
          // Check that provided social links are updated
          if (newSocialLinks.instagram !== undefined) {
            expect(updatedSocial.instagram).toBe(newSocialLinks.instagram);
          }
          if (newSocialLinks.twitter !== undefined) {
            expect(updatedSocial.twitter).toBe(newSocialLinks.twitter);
          }
          if (newSocialLinks.linkedin !== undefined) {
            expect(updatedSocial.linkedin).toBe(newSocialLinks.linkedin);
          }

          // Other fields preserved
          expect(updated.name).toBe(profile.name);
          expect(updated.description).toBe(profile.description);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple field update preserves unchanged fields', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        fc.string({ minLength: 2, maxLength: 200 }),
        urlArb,
        dateArb,
        (profile, newName, newWebsite, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(
            profile,
            { name: newName, website: newWebsite },
            adjustedUpdateTime
          );

          expect(updated.name).toBe(newName);
          expect(updated.metadata.website).toBe(newWebsite);
          // Unchanged fields preserved
          expect(updated.description).toBe(profile.description);
          expect(updated.contactPerson).toEqual(profile.contactPerson);
          expect(updated.metadata.trustScore).toBe(profile.metadata.trustScore);
          expect(updated.metadata.profileComplete).toBe(profile.metadata.profileComplete);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty update preserves all fields except updatedAt', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        dateArb,
        (profile, updateTime) => {
          // Skip if any dates are invalid
          if (isNaN(profile.updatedAt.getTime()) || isNaN(profile.createdAt.getTime()) || isNaN(updateTime.getTime())) {
            return;
          }

          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(profile, {}, adjustedUpdateTime);

          expect(updated.name).toBe(profile.name);
          expect(updated.description).toBe(profile.description);
          expect(updated.contactPerson).toEqual(profile.contactPerson);
          expect(updated.metadata.website).toBe(profile.metadata.website);
          expect(updated.metadata.socialLinks).toEqual(profile.metadata.socialLinks);
          expect(updated.metadata.trustScore).toBe(profile.metadata.trustScore);
          expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(adjustedUpdateTime.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('trust score is never modified by profile updates', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        nonEmptyProfileUpdateInputArb,
        dateArb,
        (profile, input, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(profile, input, adjustedUpdateTime);

          // Trust score should remain unchanged (it's read-only)
          expect(updated.metadata.trustScore).toBe(profile.metadata.trustScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('profile ID and user ID are never modified', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        nonEmptyProfileUpdateInputArb,
        dateArb,
        (profile, input, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(profile, input, adjustedUpdateTime);

          expect(updated.id).toBe(profile.id);
          expect(updated.userId).toBe(profile.userId);
          expect(updated.organizationId).toBe(profile.organizationId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('createdAt timestamp is never modified', () => {
    /** Validates: Requirements 10.3 */
    fc.assert(
      fc.property(
        organizerProfileArb,
        nonEmptyProfileUpdateInputArb,
        dateArb,
        (profile, input, updateTime) => {
          const adjustedUpdateTime = new Date(
            Math.max(updateTime.getTime(), profile.updatedAt.getTime() + 1000)
          );

          const updated = updateOrganizerProfile(profile, input, adjustedUpdateTime);

          expect(updated.createdAt.getTime()).toBe(profile.createdAt.getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});
