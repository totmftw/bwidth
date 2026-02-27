import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: organizer-role, Property 10: Artist filter conjunction
// Feature: organizer-role, Property 11: Artist sort ordering
// Feature: organizer-role, Property 12: Venue filter conjunction

// ---------------------------------------------------------------------------
// Shared types mirroring the discovery data structures
// ---------------------------------------------------------------------------

interface MockArtist {
  id: number;
  name: string;
  priceFrom: number;
  priceTo: number;
  ratingAvg: number;
  ratingCount: number;
  bio?: string;
  metadata: {
    trustScore: number;
    city?: string;
    location?: string;
    genres?: string[];
    portfolioLinks?: Record<string, string>;
    pastVenues?: string[];
  };
}

interface MockVenue {
  id: number;
  name: string;
  capacity: number;
  capacitySeated?: number;
  capacityStanding?: number;
  ratingAvg: number;
  ratingCount: number;
  description?: string;
  address?: {
    city?: string;
    street?: string;
    state?: string;
  };
  amenities?: string[];
  metadata?: {
    city?: string;
    photos?: string[];
  };
}

interface ArtistFilters {
  search: string;
  genres: string[];
  minBudget: number;
  maxBudget: number;
  location: string;
  minTrustScore: number;
}

interface VenueFilters {
  search: string;
  minCapacity: number;
  maxCapacity: number;
  location: string;
  amenities: string[];
}

type SortOption = "relevance" | "price-low" | "price-high" | "rating" | "trust-score";

// ---------------------------------------------------------------------------
// Pure computation functions (extracted discovery logic)
// ---------------------------------------------------------------------------

/**
 * Filters artists by all active filter criteria.
 * Property 10: For any set of artists and any combination of active filters,
 * every artist in the returned results must satisfy ALL active filter criteria
 * simultaneously. No artist satisfying all criteria should be excluded.
 */
function filterArtists(artists: MockArtist[], filters: ArtistFilters): MockArtist[] {
  return artists.filter((artist) => {
    // Search filter
    if (filters.search && !artist.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Location filter (checking metadata)
    if (filters.location) {
      const city = artist.metadata.city || artist.metadata.location;
      if (!city || !city.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    // Trust score filter (from metadata)
    if (filters.minTrustScore > 0) {
      const trustScore = artist.metadata.trustScore || 0;
      if (trustScore < filters.minTrustScore) {
        return false;
      }
    }

    // Budget range filter (already applied at API level, but included for completeness)
    if (artist.priceFrom < filters.minBudget || artist.priceFrom > filters.maxBudget) {
      return false;
    }

    // Genre filter (multi-select - artist must have at least one selected genre)
    if (filters.genres.length > 0) {
      const artistGenres = artist.metadata.genres || [];
      const hasMatchingGenre = filters.genres.some((filterGenre) =>
        artistGenres.some((artistGenre) =>
          artistGenre.toLowerCase().includes(filterGenre.toLowerCase())
        )
      );
      if (!hasMatchingGenre) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts artists by the specified sort option.
 * Property 11: For any sort option applied to artist discovery results,
 * for every consecutive pair of artists (a[i], a[i+1]), the sort key of a[i]
 * should be ≤ (or ≥, depending on direction) the sort key of a[i+1].
 */
function sortArtists(artists: MockArtist[], sortBy: SortOption): MockArtist[] {
  const sorted = [...artists];
  
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return Number(a.priceFrom || 0) - Number(b.priceFrom || 0);
      case "price-high":
        return Number(b.priceTo || 0) - Number(a.priceTo || 0);
      case "rating":
        return Number(b.ratingAvg || 0) - Number(a.ratingAvg || 0);
      case "trust-score": {
        const aTrust = a.metadata.trustScore || 0;
        const bTrust = b.metadata.trustScore || 0;
        return bTrust - aTrust;
      }
      case "relevance":
      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * Filters venues by all active filter criteria.
 * Property 12: For any set of venues and any combination of active filters,
 * every venue in the returned results must satisfy ALL active filter criteria.
 * No venue satisfying all criteria should be excluded.
 */
function filterVenues(venues: MockVenue[], filters: VenueFilters): MockVenue[] {
  return venues.filter((venue) => {
    // Search filter
    if (filters.search && !venue.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Capacity filter
    const capacity = venue.capacity || 0;
    if (capacity < filters.minCapacity || capacity > filters.maxCapacity) {
      return false;
    }

    // Location filter (checking address or metadata)
    if (filters.location) {
      const addressStr = venue.address ? JSON.stringify(venue.address).toLowerCase() : "";
      const metadataStr = venue.metadata ? JSON.stringify(venue.metadata).toLowerCase() : "";
      if (!addressStr.includes(filters.location.toLowerCase()) && 
          !metadataStr.includes(filters.location.toLowerCase())) {
        return false;
      }
    }

    // Amenities filter (all selected amenities must be present)
    if (filters.amenities.length > 0) {
      const venueAmenities = venue.amenities || [];
      const hasAllAmenities = filters.amenities.every((amenity) =>
        venueAmenities.some((va) => va.toLowerCase().includes(amenity.toLowerCase()))
      );
      if (!hasAllAmenities) {
        return false;
      }
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const GENRES = [
  "Techno",
  "House",
  "Trance",
  "Drum & Bass",
  "Dubstep",
  "Hip Hop",
  "Jazz",
  "Rock",
  "Electronic",
  "Ambient"
];

const CITIES = [
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Goa",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata"
];

const AMENITIES = [
  "Sound System",
  "Lighting",
  "Stage",
  "Bar",
  "Parking",
  "Green Room",
  "Security",
  "Outdoor Space"
];

const mockArtistArb: fc.Arbitrary<MockArtist> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 3, maxLength: 30 }),
  priceFrom: fc.integer({ min: 1000, max: 50000 }),
  priceTo: fc.integer({ min: 10000, max: 100000 }),
  ratingAvg: fc.double({ min: 0, max: 5, noNaN: true }),
  ratingCount: fc.integer({ min: 0, max: 500 }),
  bio: fc.option(fc.string({ maxLength: 200 })),
  metadata: fc.record({
    trustScore: fc.integer({ min: 0, max: 100 }),
    city: fc.option(fc.constantFrom(...CITIES)),
    location: fc.option(fc.constantFrom(...CITIES)),
    genres: fc.option(fc.array(fc.constantFrom(...GENRES), { minLength: 1, maxLength: 4 })),
    portfolioLinks: fc.option(fc.record({
      soundcloud: fc.option(fc.webUrl()),
      instagram: fc.option(fc.webUrl()),
    })),
    pastVenues: fc.option(fc.array(fc.string({ minLength: 5, maxLength: 20 }), { maxLength: 5 })),
  }),
});

const mockVenueArb: fc.Arbitrary<MockVenue> = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 3, maxLength: 30 }),
  capacity: fc.integer({ min: 50, max: 5000 }),
  capacitySeated: fc.option(fc.integer({ min: 20, max: 2000 })),
  capacityStanding: fc.option(fc.integer({ min: 30, max: 3000 })),
  ratingAvg: fc.double({ min: 0, max: 5, noNaN: true }),
  ratingCount: fc.integer({ min: 0, max: 500 }),
  description: fc.option(fc.string({ maxLength: 200 })),
  address: fc.option(fc.record({
    city: fc.option(fc.constantFrom(...CITIES)),
    street: fc.option(fc.string({ maxLength: 50 })),
    state: fc.option(fc.constantFrom("Karnataka", "Maharashtra", "Delhi", "Goa")),
  })),
  amenities: fc.option(fc.array(fc.constantFrom(...AMENITIES), { minLength: 0, maxLength: 6 })),
  metadata: fc.option(fc.record({
    city: fc.option(fc.constantFrom(...CITIES)),
    photos: fc.option(fc.array(fc.webUrl(), { maxLength: 4 })),
  })),
});

const artistFiltersArb: fc.Arbitrary<ArtistFilters> = fc.record({
  search: fc.option(fc.string({ maxLength: 20 }), { nil: "" }),
  genres: fc.array(fc.constantFrom(...GENRES), { maxLength: 3 }),
  minBudget: fc.integer({ min: 0, max: 20000 }),
  maxBudget: fc.integer({ min: 20000, max: 100000 }),
  location: fc.option(fc.constantFrom(...CITIES, ""), { nil: "" }),
  minTrustScore: fc.integer({ min: 0, max: 100 }),
});

const venueFiltersArb: fc.Arbitrary<VenueFilters> = fc.record({
  search: fc.option(fc.string({ maxLength: 20 }), { nil: "" }),
  minCapacity: fc.integer({ min: 0, max: 1000 }),
  maxCapacity: fc.integer({ min: 1000, max: 5000 }),
  location: fc.option(fc.constantFrom(...CITIES, ""), { nil: "" }),
  amenities: fc.array(fc.constantFrom(...AMENITIES), { maxLength: 3 }),
});

// ---------------------------------------------------------------------------
// Property 10: Artist filter conjunction
// Validates: Requirements 3.2, 3.3
// ---------------------------------------------------------------------------

describe('Property 10: Artist filter conjunction', () => {
  it('every artist in results satisfies ALL active filter criteria', () => {
    /** Validates: Requirements 3.2, 3.3 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 10, maxLength: 50 }),
        artistFiltersArb,
        (artists, filters) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const filtered = filterArtists(uniqueArtists, filters);

          // Every filtered artist must satisfy all criteria
          for (const artist of filtered) {
            // Search filter
            if (filters.search) {
              expect(artist.name.toLowerCase()).toContain(filters.search.toLowerCase());
            }

            // Location filter
            if (filters.location) {
              const city = artist.metadata.city || artist.metadata.location || "";
              expect(city.toLowerCase()).toContain(filters.location.toLowerCase());
            }

            // Trust score filter
            if (filters.minTrustScore > 0) {
              const trustScore = artist.metadata.trustScore || 0;
              expect(trustScore).toBeGreaterThanOrEqual(filters.minTrustScore);
            }

            // Budget range filter
            expect(artist.priceFrom).toBeGreaterThanOrEqual(filters.minBudget);
            expect(artist.priceFrom).toBeLessThanOrEqual(filters.maxBudget);

            // Genre filter
            if (filters.genres.length > 0) {
              const artistGenres = artist.metadata.genres || [];
              const hasMatchingGenre = filters.genres.some((filterGenre) =>
                artistGenres.some((artistGenre) =>
                  artistGenre.toLowerCase().includes(filterGenre.toLowerCase())
                )
              );
              expect(hasMatchingGenre).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no artist satisfying all criteria is excluded', () => {
    /** Validates: Requirements 3.2, 3.3 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 10, maxLength: 50 }),
        artistFiltersArb,
        (artists, filters) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const filtered = filterArtists(uniqueArtists, filters);
          const filteredIds = new Set(filtered.map(a => a.id));

          // Check each artist not in results - at least one criterion must fail
          for (const artist of uniqueArtists) {
            if (filteredIds.has(artist.id)) continue;

            let failedCriterion = false;

            // Check search filter
            if (filters.search && !artist.name.toLowerCase().includes(filters.search.toLowerCase())) {
              failedCriterion = true;
            }

            // Check location filter
            if (filters.location) {
              const city = artist.metadata.city || artist.metadata.location;
              if (!city || !city.toLowerCase().includes(filters.location.toLowerCase())) {
                failedCriterion = true;
              }
            }

            // Check trust score filter
            if (filters.minTrustScore > 0) {
              const trustScore = artist.metadata.trustScore || 0;
              if (trustScore < filters.minTrustScore) {
                failedCriterion = true;
              }
            }

            // Check budget range filter
            if (artist.priceFrom < filters.minBudget || artist.priceFrom > filters.maxBudget) {
              failedCriterion = true;
            }

            // Check genre filter
            if (filters.genres.length > 0) {
              const artistGenres = artist.metadata.genres || [];
              const hasMatchingGenre = filters.genres.some((filterGenre) =>
                artistGenres.some((artistGenre) =>
                  artistGenre.toLowerCase().includes(filterGenre.toLowerCase())
                )
              );
              if (!hasMatchingGenre) {
                failedCriterion = true;
              }
            }

            // If excluded, at least one criterion must have failed
            expect(failedCriterion).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array when no artists match all criteria', () => {
    /** Validates: Requirements 3.2, 3.3 */
    const artists: MockArtist[] = [
      {
        id: 1,
        name: "DJ Test",
        priceFrom: 5000,
        priceTo: 10000,
        ratingAvg: 4.5,
        ratingCount: 10,
        metadata: {
          trustScore: 30,
          city: "Mumbai",
          genres: ["House"],
        },
      },
    ];

    const filters: ArtistFilters = {
      search: "",
      genres: [],
      minBudget: 0,
      maxBudget: 100000,
      location: "",
      minTrustScore: 80, // Artist has trustScore 30, so should be filtered out
    };

    const filtered = filterArtists(artists, filters);
    expect(filtered).toHaveLength(0);
  });

  it('returns all artists when no filters are active', () => {
    /** Validates: Requirements 3.2, 3.3 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 5, maxLength: 20 }),
        (artists) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const emptyFilters: ArtistFilters = {
            search: "",
            genres: [],
            minBudget: 0,
            maxBudget: 100000,
            location: "",
            minTrustScore: 0,
          };

          const filtered = filterArtists(uniqueArtists, emptyFilters);
          expect(filtered.length).toBe(uniqueArtists.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Artist sort ordering
// Validates: Requirements 3.6
// ---------------------------------------------------------------------------

describe('Property 11: Artist sort ordering', () => {
  it('price-low: for every consecutive pair, a[i].priceFrom <= a[i+1].priceFrom', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 5, maxLength: 30 }),
        (artists) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const sorted = sortArtists(uniqueArtists, "price-low");

          for (let i = 0; i < sorted.length - 1; i++) {
            expect(Number(sorted[i].priceFrom || 0)).toBeLessThanOrEqual(
              Number(sorted[i + 1].priceFrom || 0)
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('price-high: for every consecutive pair, a[i].priceTo >= a[i+1].priceTo', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 5, maxLength: 30 }),
        (artists) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const sorted = sortArtists(uniqueArtists, "price-high");

          for (let i = 0; i < sorted.length - 1; i++) {
            expect(Number(sorted[i].priceTo || 0)).toBeGreaterThanOrEqual(
              Number(sorted[i + 1].priceTo || 0)
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rating: for every consecutive pair, a[i].ratingAvg >= a[i+1].ratingAvg', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 5, maxLength: 30 }),
        (artists) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const sorted = sortArtists(uniqueArtists, "rating");

          for (let i = 0; i < sorted.length - 1; i++) {
            expect(Number(sorted[i].ratingAvg || 0)).toBeGreaterThanOrEqual(
              Number(sorted[i + 1].ratingAvg || 0)
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('trust-score: for every consecutive pair, a[i].trustScore >= a[i+1].trustScore', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 5, maxLength: 30 }),
        (artists) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const sorted = sortArtists(uniqueArtists, "trust-score");

          for (let i = 0; i < sorted.length - 1; i++) {
            const aTrust = sorted[i].metadata.trustScore || 0;
            const bTrust = sorted[i + 1].metadata.trustScore || 0;
            expect(aTrust).toBeGreaterThanOrEqual(bTrust);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('relevance: returns artists in original order', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 5, maxLength: 20 }),
        (artists) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const sorted = sortArtists(uniqueArtists, "relevance");

          // Relevance sort should maintain original order (stable sort with no comparison)
          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i].id).toBe(uniqueArtists[i].id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sorting preserves all artists (no additions or removals)', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(
        fc.array(mockArtistArb, { minLength: 5, maxLength: 30 }),
        fc.constantFrom<SortOption>("price-low", "price-high", "rating", "trust-score", "relevance"),
        (artists, sortOption) => {
          const uniqueArtists = artists.map((a, i) => ({ ...a, id: i + 1 }));
          const sorted = sortArtists(uniqueArtists, sortOption);

          expect(sorted.length).toBe(uniqueArtists.length);
          
          const originalIds = new Set(uniqueArtists.map(a => a.id));
          const sortedIds = new Set(sorted.map(a => a.id));
          
          expect(sortedIds).toEqual(originalIds);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Venue filter conjunction
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------

describe('Property 12: Venue filter conjunction', () => {
  it('every venue in results satisfies ALL active filter criteria', () => {
    /** Validates: Requirements 4.2 */
    fc.assert(
      fc.property(
        fc.array(mockVenueArb, { minLength: 10, maxLength: 50 }),
        venueFiltersArb,
        (venues, filters) => {
          const uniqueVenues = venues.map((v, i) => ({ ...v, id: i + 1 }));
          const filtered = filterVenues(uniqueVenues, filters);

          // Every filtered venue must satisfy all criteria
          for (const venue of filtered) {
            // Search filter
            if (filters.search) {
              expect(venue.name.toLowerCase()).toContain(filters.search.toLowerCase());
            }

            // Capacity filter
            const capacity = venue.capacity || 0;
            expect(capacity).toBeGreaterThanOrEqual(filters.minCapacity);
            expect(capacity).toBeLessThanOrEqual(filters.maxCapacity);

            // Location filter
            if (filters.location) {
              const addressStr = venue.address ? JSON.stringify(venue.address).toLowerCase() : "";
              const metadataStr = venue.metadata ? JSON.stringify(venue.metadata).toLowerCase() : "";
              const matchesLocation = 
                addressStr.includes(filters.location.toLowerCase()) ||
                metadataStr.includes(filters.location.toLowerCase());
              expect(matchesLocation).toBe(true);
            }

            // Amenities filter (all selected amenities must be present)
            if (filters.amenities.length > 0) {
              const venueAmenities = venue.amenities || [];
              for (const requiredAmenity of filters.amenities) {
                const hasAmenity = venueAmenities.some((va) =>
                  va.toLowerCase().includes(requiredAmenity.toLowerCase())
                );
                expect(hasAmenity).toBe(true);
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no venue satisfying all criteria is excluded', () => {
    /** Validates: Requirements 4.2 */
    fc.assert(
      fc.property(
        fc.array(mockVenueArb, { minLength: 10, maxLength: 50 }),
        venueFiltersArb,
        (venues, filters) => {
          const uniqueVenues = venues.map((v, i) => ({ ...v, id: i + 1 }));
          const filtered = filterVenues(uniqueVenues, filters);
          const filteredIds = new Set(filtered.map(v => v.id));

          // Check each venue not in results - at least one criterion must fail
          for (const venue of uniqueVenues) {
            if (filteredIds.has(venue.id)) continue;

            let failedCriterion = false;

            // Check search filter
            if (filters.search && !venue.name.toLowerCase().includes(filters.search.toLowerCase())) {
              failedCriterion = true;
            }

            // Check capacity filter
            const capacity = venue.capacity || 0;
            if (capacity < filters.minCapacity || capacity > filters.maxCapacity) {
              failedCriterion = true;
            }

            // Check location filter
            if (filters.location) {
              const addressStr = venue.address ? JSON.stringify(venue.address).toLowerCase() : "";
              const metadataStr = venue.metadata ? JSON.stringify(venue.metadata).toLowerCase() : "";
              if (!addressStr.includes(filters.location.toLowerCase()) && 
                  !metadataStr.includes(filters.location.toLowerCase())) {
                failedCriterion = true;
              }
            }

            // Check amenities filter
            if (filters.amenities.length > 0) {
              const venueAmenities = venue.amenities || [];
              const hasAllAmenities = filters.amenities.every((amenity) =>
                venueAmenities.some((va) => va.toLowerCase().includes(amenity.toLowerCase()))
              );
              if (!hasAllAmenities) {
                failedCriterion = true;
              }
            }

            // If excluded, at least one criterion must have failed
            expect(failedCriterion).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('amenities filter requires ALL selected amenities to be present', () => {
    /** Validates: Requirements 4.2 */
    const venue: MockVenue = {
      id: 1,
      name: "Test Venue",
      capacity: 500,
      ratingAvg: 4.0,
      ratingCount: 20,
      amenities: ["Sound System", "Lighting", "Bar"],
    };

    // Filter requires Sound System AND Stage - venue only has Sound System
    const filters: VenueFilters = {
      search: "",
      minCapacity: 0,
      maxCapacity: 5000,
      location: "",
      amenities: ["Sound System", "Stage"],
    };

    const filtered = filterVenues([venue], filters);
    expect(filtered).toHaveLength(0); // Should be excluded because Stage is missing
  });

  it('returns all venues when no filters are active', () => {
    /** Validates: Requirements 4.2 */
    fc.assert(
      fc.property(
        fc.array(mockVenueArb, { minLength: 5, maxLength: 20 }),
        (venues) => {
          const uniqueVenues = venues.map((v, i) => ({ ...v, id: i + 1 }));
          const emptyFilters: VenueFilters = {
            search: "",
            minCapacity: 0,
            maxCapacity: 5000,
            location: "",
            amenities: [],
          };

          const filtered = filterVenues(uniqueVenues, emptyFilters);
          expect(filtered.length).toBe(uniqueVenues.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array when no venues match all criteria', () => {
    /** Validates: Requirements 4.2 */
    const venues: MockVenue[] = [
      {
        id: 1,
        name: "Small Venue",
        capacity: 100,
        ratingAvg: 4.0,
        ratingCount: 10,
      },
    ];

    const filters: VenueFilters = {
      search: "",
      minCapacity: 500, // Venue capacity is 100, so should be filtered out
      maxCapacity: 5000,
      location: "",
      amenities: [],
    };

    const filtered = filterVenues(venues, filters);
    expect(filtered).toHaveLength(0);
  });
});
