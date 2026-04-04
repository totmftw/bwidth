/**
 * ResearchService -- data-driven intelligence layer for BANDWIDTH.
 *
 * Aggregates artist, organizer, venue, and pair-history data into concise
 * intelligence objects used by the negotiation agent and fee-suggestion engine.
 * Results are cached in `researchCache` with configurable TTLs.
 *
 * All monetary values are in INR unless explicitly noted.
 */

import { storage } from "../storage";
import { db } from "../db";
import {
  bookings,
  artists,
  events,
  venues,
  appSettings,
  negotiationOutcomes,
} from "@shared/schema";
import { eq, and, gte, sql, desc } from "drizzle-orm";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ArtistIntelligence {
  artistId: number;
  name: string;
  genre: string | null;
  category: string | null;
  feeRange: { min: number | null; max: number | null };
  rating: { avg: number | null; count: number };
  bookingStats: {
    total: number;
    avgFee: number | null;
    minFee: number | null;
    maxFee: number | null;
  };
  trustScore: number | null;
}

export interface OrganizerIntelligence {
  organizerId: number;
  name: string;
  eventsCount: number;
  completedBookings: number;
  avgBookingValue: number | null;
  cancellationRate: number;
}

export interface VenueIntelligence {
  venueId: number;
  name: string;
  capacity: number | null;
  tier: "intimate" | "mid" | "large";
  eventsHosted: number;
  avgBookingValue: number | null;
}

export interface PairHistory {
  totalBookings: number;
  avgFee: number | null;
  lastBookingDate: string | null;
  isRepeatRelationship: boolean;
}

export interface FeeSuggestionParams {
  artistId: number;
  organizerId?: number;
  venueCapacity?: number;
  genre?: string;
}

export interface FeeSuggestion {
  min: number;
  suggested: number;
  max: number;
  currency: string;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  sampleSize: number;
}

export interface NegotiationResearchContext {
  artist: ArtistIntelligence;
  organizer: OrganizerIntelligence;
  venue: VenueIntelligence | null;
  pairHistory: PairHistory;
  feeSuggestion: FeeSuggestion;
}

interface FeeMultipliers {
  genreMultipliers: Record<string, number>;
  venueTierMultipliers: { intimate: number; mid: number; large: number };
}

const DEFAULT_FEE_MULTIPLIERS: FeeMultipliers = {
  genreMultipliers: {},
  venueTierMultipliers: { intimate: 0.8, mid: 1.0, large: 1.3 },
};

// ── Service ───────────────────────────────────────────────────────────────────

class ResearchService {
  // ── Public methods ──────────────────────────────────────────────────────

  /**
   * Compile intelligence on an artist: profile data, fee range, booking
   * history aggregates, and trust score.
   */
  async getArtistIntel(artistId: number): Promise<ArtistIntelligence> {
    const cached = await this.getCached<ArtistIntelligence>(
      "artist",
      artistId,
      "profile_intel",
    );
    if (cached) return cached;

    const artist = await storage.getArtist(artistId);
    if (!artist) {
      throw new Error(`Artist #${artistId} not found`);
    }

    // Aggregate completed-booking stats for this artist
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        avgFee: sql<string>`avg(${bookings.offerAmount}::numeric)`,
        minFee: sql<string>`min(${bookings.offerAmount}::numeric)`,
        maxFee: sql<string>`max(${bookings.offerAmount}::numeric)`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.artistId, artistId),
          eq(bookings.status, "completed"),
        ),
      );

    const metadata = (artist.metadata as any) ?? {};

    const intel: ArtistIntelligence = {
      artistId,
      name: artist.name,
      genre: metadata.primaryGenre ?? null,
      category: artist.artistCategory ?? null,
      feeRange: {
        min: artist.priceFrom ? Number(artist.priceFrom) : null,
        max: artist.priceTo ? Number(artist.priceTo) : null,
      },
      rating: {
        avg: artist.ratingAvg ? Number(artist.ratingAvg) : null,
        count: artist.ratingCount ?? 0,
      },
      bookingStats: {
        total: stats?.total ?? 0,
        avgFee: stats?.avgFee ? Number(Number(stats.avgFee).toFixed(2)) : null,
        minFee: stats?.minFee ? Number(Number(stats.minFee).toFixed(2)) : null,
        maxFee: stats?.maxFee ? Number(Number(stats.maxFee).toFixed(2)) : null,
      },
      trustScore: metadata.trustScore ?? null,
    };

    await this.setCache("artist", artistId, "profile_intel", intel, 1);
    return intel;
  }

  /**
   * Compile intelligence on an organizer: event count, completed-booking
   * aggregates, and cancellation rate.
   */
  async getOrganizerIntel(organizerId: number): Promise<OrganizerIntelligence> {
    const cached = await this.getCached<OrganizerIntelligence>(
      "organizer",
      organizerId,
      "profile_intel",
    );
    if (cached) return cached;

    const promoter = await storage.getPromoter(organizerId);
    if (!promoter) {
      throw new Error(`Organizer #${organizerId} not found`);
    }

    // Count events owned by this organizer
    const [eventsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(eq(events.organizerId, organizerId));

    // Get organizer's event IDs for booking aggregation
    const orgEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerId, organizerId));
    const eventIds = orgEvents.map((e) => e.id);

    let completedBookings = 0;
    let avgBookingValue: number | null = null;
    let totalBookings = 0;
    let cancelledBookings = 0;

    if (eventIds.length > 0) {
      const eventIdList = sql.join(
        eventIds.map((id) => sql`${id}`),
        sql`, `,
      );

      // Completed bookings aggregate
      const [completedStats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          avgAmount: sql<string>`avg(${bookings.offerAmount}::numeric)`,
        })
        .from(bookings)
        .where(
          and(
            sql`${bookings.eventId} IN (${eventIdList})`,
            eq(bookings.status, "completed"),
          ),
        );

      completedBookings = completedStats?.total ?? 0;
      avgBookingValue = completedStats?.avgAmount
        ? Number(Number(completedStats.avgAmount).toFixed(2))
        : null;

      // Total bookings (for cancellation rate)
      const [allStats] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(bookings)
        .where(sql`${bookings.eventId} IN (${eventIdList})`);

      totalBookings = allStats?.total ?? 0;

      // Cancelled bookings
      const [cancelledStats] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(bookings)
        .where(
          and(
            sql`${bookings.eventId} IN (${eventIdList})`,
            eq(bookings.status, "cancelled"),
          ),
        );

      cancelledBookings = cancelledStats?.total ?? 0;
    }

    const cancellationRate =
      totalBookings > 0 ? cancelledBookings / totalBookings : 0;

    const intel: OrganizerIntelligence = {
      organizerId,
      name: promoter.name ?? "Unknown",
      eventsCount: eventsRow?.count ?? 0,
      completedBookings,
      avgBookingValue,
      cancellationRate: Number(cancellationRate.toFixed(4)),
    };

    await this.setCache("organizer", organizerId, "profile_intel", intel, 1);
    return intel;
  }

  /**
   * Compile intelligence on a venue: capacity, tier classification, events
   * hosted, and average booking value for events at this venue.
   */
  async getVenueIntel(venueId: number): Promise<VenueIntelligence> {
    const cached = await this.getCached<VenueIntelligence>(
      "venue",
      venueId,
      "profile_intel",
    );
    if (cached) return cached;

    const venue = await storage.getVenue(venueId);
    if (!venue) {
      throw new Error(`Venue #${venueId} not found`);
    }

    const capacity = venue.capacity ?? null;
    const tier = this.classifyVenueTier(capacity);

    // Events hosted at this venue
    const venueEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.venueId, venueId));
    const eventIds = venueEvents.map((e) => e.id);

    let avgBookingValue: number | null = null;

    if (eventIds.length > 0) {
      const eventIdList = sql.join(
        eventIds.map((id) => sql`${id}`),
        sql`, `,
      );

      const [stats] = await db
        .select({
          avgAmount: sql<string>`avg(${bookings.offerAmount}::numeric)`,
        })
        .from(bookings)
        .where(
          and(
            sql`${bookings.eventId} IN (${eventIdList})`,
            eq(bookings.status, "completed"),
          ),
        );

      avgBookingValue = stats?.avgAmount
        ? Number(Number(stats.avgAmount).toFixed(2))
        : null;
    }

    const intel: VenueIntelligence = {
      venueId,
      name: venue.name,
      capacity,
      tier,
      eventsHosted: eventIds.length,
      avgBookingValue,
    };

    await this.setCache("venue", venueId, "profile_intel", intel, 1);
    return intel;
  }

  /**
   * Return aggregated history of bookings between a specific artist and
   * organizer pair.
   */
  async getPairHistory(
    artistId: number,
    organizerId: number,
  ): Promise<PairHistory> {
    const cacheEntityId = artistId * 100000 + organizerId;
    const cached = await this.getCached<PairHistory>(
      "booking_pair",
      cacheEntityId,
      "pair_history",
    );
    if (cached) return cached;

    // Get organizer's event IDs
    const orgEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerId, organizerId));
    const eventIds = orgEvents.map((e) => e.id);

    if (eventIds.length === 0) {
      const empty: PairHistory = {
        totalBookings: 0,
        avgFee: null,
        lastBookingDate: null,
        isRepeatRelationship: false,
      };
      await this.setCache("booking_pair", cacheEntityId, "pair_history", empty, 1);
      return empty;
    }

    const eventIdList = sql.join(
      eventIds.map((id) => sql`${id}`),
      sql`, `,
    );

    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        avgFee: sql<string>`avg(${bookings.offerAmount}::numeric)`,
        lastDate: sql<string>`max(${bookings.createdAt})`,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.artistId, artistId),
          sql`${bookings.eventId} IN (${eventIdList})`,
          eq(bookings.status, "completed"),
        ),
      );

    const totalBookings = stats?.total ?? 0;

    const history: PairHistory = {
      totalBookings,
      avgFee: stats?.avgFee
        ? Number(Number(stats.avgFee).toFixed(2))
        : null,
      lastBookingDate: stats?.lastDate
        ? new Date(stats.lastDate).toISOString()
        : null,
      isRepeatRelationship: totalBookings > 1,
    };

    await this.setCache("booking_pair", cacheEntityId, "pair_history", history, 1);
    return history;
  }

  /**
   * Suggest a fee for an artist based on their profile, historical bookings,
   * venue tier, genre multipliers, demand, and relationship history.
   */
  async suggestFee(params: FeeSuggestionParams): Promise<FeeSuggestion> {
    const artistIntel = await this.getArtistIntel(params.artistId);

    // Load fee multipliers from appSettings (or fall back to defaults)
    const multipliers = await this.loadFeeMultipliers();

    // Base fee: artist's listed minimum, or their historical average, or 0
    const baseFee =
      artistIntel.feeRange.min ??
      artistIntel.bookingStats.avgFee ??
      0;

    if (baseFee === 0) {
      return {
        min: 0,
        suggested: 0,
        max: 0,
        currency: "INR",
        confidence: "low",
        reasoning:
          "Insufficient data: artist has no listed fee range and no completed booking history.",
        sampleSize: artistIntel.bookingStats.total,
      };
    }

    // Genre multiplier
    const genre = params.genre ?? artistIntel.genre ?? "";
    const genreMultiplier =
      multipliers.genreMultipliers[genre.toLowerCase()] ?? 1.0;

    // Venue tier multiplier
    const venueTier = this.classifyVenueTier(params.venueCapacity ?? null);
    const venueTierMultiplier =
      multipliers.venueTierMultipliers[venueTier] ?? 1.0;

    // Demand score: completed bookings in the last 90 days / 5, capped at 1.5
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const [demandRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.artistId, params.artistId),
          eq(bookings.status, "completed"),
          gte(bookings.createdAt, ninetyDaysAgo),
        ),
      );

    const recentBookings = demandRow?.count ?? 0;
    const demandScore = Math.min(recentBookings / 5, 1.5) || 1.0;

    // Relationship factor
    let relationshipFactor = 1.0;
    if (params.organizerId) {
      const pair = await this.getPairHistory(params.artistId, params.organizerId);
      if (pair.isRepeatRelationship) {
        relationshipFactor = 0.95;
      }
    }

    const suggested =
      baseFee *
      genreMultiplier *
      venueTierMultiplier *
      demandScore *
      relationshipFactor;

    const min = Math.round(suggested * 0.8);
    const max = Math.round(suggested * 1.2);
    const suggestedRounded = Math.round(suggested);

    const sampleSize = artistIntel.bookingStats.total;
    const confidence: "low" | "medium" | "high" =
      sampleSize < 5 ? "low" : sampleSize <= 20 ? "medium" : "high";

    const reasoningParts: string[] = [
      `Base fee: INR ${baseFee.toLocaleString()}`,
    ];
    if (genreMultiplier !== 1.0) {
      reasoningParts.push(`Genre multiplier (${genre}): ${genreMultiplier}x`);
    }
    if (venueTierMultiplier !== 1.0) {
      reasoningParts.push(
        `Venue tier multiplier (${venueTier}): ${venueTierMultiplier}x`,
      );
    }
    if (demandScore !== 1.0) {
      reasoningParts.push(
        `Demand score (${recentBookings} bookings in 90d): ${demandScore.toFixed(2)}x`,
      );
    }
    if (relationshipFactor !== 1.0) {
      reasoningParts.push("Repeat relationship discount: 0.95x");
    }
    reasoningParts.push(`Sample size: ${sampleSize} completed booking(s).`);

    return {
      min,
      suggested: suggestedRounded,
      max,
      currency: "INR",
      confidence,
      reasoning: reasoningParts.join(". "),
      sampleSize,
    };
  }

  /**
   * Build a complete negotiation research context for a given booking:
   * artist intel, organizer intel, venue intel, pair history, and fee
   * suggestion -- all fetched in parallel where possible.
   */
  async buildFullContext(
    bookingId: number,
  ): Promise<NegotiationResearchContext> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking #${bookingId} not found`);
    }

    if (!booking.artistId) {
      throw new Error(`Booking #${bookingId} has no associated artist`);
    }
    if (!booking.eventId) {
      throw new Error(`Booking #${bookingId} has no associated event`);
    }

    const event = await storage.getEvent(booking.eventId);
    if (!event) {
      throw new Error(`Event #${booking.eventId} not found`);
    }

    const organizerId = event.organizerId;
    if (!organizerId) {
      throw new Error(
        `Event #${booking.eventId} has no associated organizer`,
      );
    }

    const venueId: number | null = event.venueId ?? null;

    // Fetch all intelligence in parallel
    const [artistIntel, organizerIntel, venueIntel, pairHistory] =
      await Promise.all([
        this.getArtistIntel(booking.artistId),
        this.getOrganizerIntel(organizerId),
        venueId ? this.getVenueIntel(venueId) : Promise.resolve(null),
        this.getPairHistory(booking.artistId, organizerId),
      ]);

    const feeSuggestion = await this.suggestFee({
      artistId: booking.artistId,
      organizerId,
      venueCapacity: venueIntel?.capacity ?? undefined,
      genre: artistIntel.genre ?? undefined,
    });

    return {
      artist: artistIntel,
      organizer: organizerIntel,
      venue: venueIntel,
      pairHistory,
      feeSuggestion,
    };
  }

  /**
   * Re-train genre and venue-tier multipliers from negotiation outcomes
   * recorded in the last 90 days where the outcome was "signed".
   *
   * Only updates a multiplier bucket if there are at least 10 samples.
   * Results are persisted to `appSettings` under key "fee_multipliers".
   */
  async retrainMultipliers(): Promise<void> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const outcomes = await db
      .select()
      .from(negotiationOutcomes)
      .where(
        and(
          eq(negotiationOutcomes.outcome, "signed"),
          gte(negotiationOutcomes.createdAt, ninetyDaysAgo),
        ),
      );

    if (outcomes.length === 0) return;

    // Load current multipliers as a starting point
    const current = await this.loadFeeMultipliers();

    // ── Genre multipliers ────────────────────────────────────────────────
    // Group outcomes by genre and compute average (finalFee / suggestedFee)
    const genreBuckets = new Map<string, number[]>();
    const venueTierBuckets = new Map<string, number[]>();

    for (const o of outcomes) {
      const suggested = o.suggestedFee ? Number(o.suggestedFee) : null;
      const final = o.finalFee ? Number(o.finalFee) : null;

      if (!suggested || !final || suggested === 0) continue;

      const ratio = final / suggested;

      if (o.genre) {
        const key = o.genre.toLowerCase();
        if (!genreBuckets.has(key)) genreBuckets.set(key, []);
        genreBuckets.get(key)!.push(ratio);
      }

      if (o.venueTier) {
        const key = o.venueTier.toLowerCase();
        if (!venueTierBuckets.has(key)) venueTierBuckets.set(key, []);
        venueTierBuckets.get(key)!.push(ratio);
      }
    }

    // Update genre multipliers where sample >= 10
    const newGenreMultipliers: Record<string, number> = {
      ...current.genreMultipliers,
    };
    Array.from(genreBuckets.entries()).forEach(([genre, ratios]) => {
      if (ratios.length >= 10) {
        const avg =
          ratios.reduce((a: number, b: number) => a + b, 0) / ratios.length;
        newGenreMultipliers[genre] = Number(avg.toFixed(4));
      }
    });

    // Update venue-tier multipliers where sample >= 10
    const newVenueTierMultipliers = { ...current.venueTierMultipliers };
    Array.from(venueTierBuckets.entries()).forEach(([tier, ratios]) => {
      if (
        ratios.length >= 10 &&
        (tier === "intimate" || tier === "mid" || tier === "large")
      ) {
        const avg =
          ratios.reduce((a: number, b: number) => a + b, 0) / ratios.length;
        (newVenueTierMultipliers as Record<string, number>)[tier] = Number(
          avg.toFixed(4),
        );
      }
    });

    const updatedMultipliers: FeeMultipliers = {
      genreMultipliers: newGenreMultipliers,
      venueTierMultipliers: newVenueTierMultipliers,
    };

    // Upsert into appSettings
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "fee_multipliers"));

    if (existing.length > 0) {
      await db
        .update(appSettings)
        .set({ value: updatedMultipliers, updatedAt: new Date() })
        .where(eq(appSettings.key, "fee_multipliers"));
    } else {
      await db.insert(appSettings).values({
        key: "fee_multipliers",
        value: updatedMultipliers,
      });
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Retrieve a cached research entry.  Returns `null` if missing or expired.
   */
  private async getCached<T>(
    entityType: string,
    entityId: number,
    researchType: string,
  ): Promise<T | null> {
    const entry = await storage.getResearchCache(
      entityType,
      entityId,
      researchType,
    );
    if (!entry) return null;

    // Check expiry
    if (new Date(entry.expiresAt) < new Date()) {
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store a research result in the cache with a TTL expressed in hours.
   */
  private async setCache(
    entityType: string,
    entityId: number,
    researchType: string,
    data: any,
    ttlHours: number,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setTime(expiresAt.getTime() + ttlHours * 60 * 60 * 1000);

    await storage.upsertResearchCache({
      entityType,
      entityId,
      researchType,
      data,
      expiresAt,
    });
  }

  /**
   * Load fee multipliers from `appSettings`. Falls back to built-in defaults
   * when the setting does not exist.
   */
  private async loadFeeMultipliers(): Promise<FeeMultipliers> {
    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "fee_multipliers"));

    if (!row) return { ...DEFAULT_FEE_MULTIPLIERS };

    const val = row.value as Partial<FeeMultipliers> | null;
    return {
      genreMultipliers: val?.genreMultipliers ?? {},
      venueTierMultipliers: {
        ...DEFAULT_FEE_MULTIPLIERS.venueTierMultipliers,
        ...(val?.venueTierMultipliers ?? {}),
      },
    };
  }

  /**
   * Classify a venue into a tier based on its capacity.
   *   < 200  -> "intimate"
   *   200-1000 -> "mid"
   *   > 1000 -> "large"
   *   null   -> "mid" (default)
   */
  private classifyVenueTier(
    capacity: number | null,
  ): "intimate" | "mid" | "large" {
    if (capacity === null) return "mid";
    if (capacity < 200) return "intimate";
    if (capacity <= 1000) return "mid";
    return "large";
  }
}

export const researchService = new ResearchService();
