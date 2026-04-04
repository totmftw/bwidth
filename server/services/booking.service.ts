import { db } from "../db";
import { bookings, contracts, artists, promoters, auditLogs, events } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { commissionPolicyService } from "./commissionPolicy.service";
import { generateContractText, buildTermsFromBooking } from "../contract-utils";
import { emitDomainEvent } from "./event-bus";
import { storage } from "../storage";

export class BookingService {
  async expireBookingFlow(bookingId: number, reason: string, userId?: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        const [updated] = await tx.update(bookings)
          .set({
            status: 'cancelled',
            flowExpiredAt: new Date(),
            flowExpiredReason: reason,
            updatedAt: new Date()
          })
          .where(eq(bookings.id, bookingId))
          .returning();

        if (!updated) {
          throw new Error("Booking not found");
        }

        if (userId) {
          await tx.insert(auditLogs).values({
            who: userId,
            action: 'booking_flow_expired',
            entityType: 'booking',
            entityId: bookingId,
            context: { reason }
          });
        }
      });

      // Notify both parties about cancellation
      emitDomainEvent("booking.cancelled", {
        bookingId,
        entityType: "booking",
        entityId: bookingId,
        eventTitle: "Event",
        reason,
        actionUrl: `/bookings?bookingId=${bookingId}`,
      }, userId || null);

      // Record expiry outcome for self-learning
      try {
        const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
        if (booking) {
          const artistData = booking.artistId ? await storage.getArtist(booking.artistId) : null;
          const eventData = booking.eventId ? await storage.getEvent(booking.eventId) : null;
          await storage.createNegotiationOutcome({
            bookingId,
            artistId: booking.artistId,
            organizerId: eventData?.organizerId ?? null,
            finalFee: booking.offerAmount ? String(booking.offerAmount) : null,
            outcome: "expired",
            genre: (artistData?.metadata as any)?.primaryGenre ?? null,
            venueTier: eventData?.venue?.capacity
              ? (eventData.venue.capacity < 200 ? "intimate" : eventData.venue.capacity <= 1000 ? "mid" : "large")
              : null,
            venueCapacity: eventData?.venue?.capacity ?? null,
          });
        }
      } catch (outcomeErr) {
        console.error("Failed to record expiry outcome:", outcomeErr);
      }

      return true;
    } catch (error) {
      console.error("Failed to expire booking flow:", error);
      return false;
    }
  }

  async confirmBookingAndSnapshot(bookingId: number) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new Error("Booking not found");

    const [artist] = await db.select().from(artists).where(eq(artists.id, booking.artistId!));
    if (!artist) throw new Error("Artist not found");

    // Fetch trust score (assuming it's in artist metadata or a separate service, using default for now)
    const trustTier = (artist.metadata as any)?.trustTier || "standard";
    const category = artist.artistCategory || "mid_scale";
    const agreedFee = Number(booking.finalAmount || booking.offerAmount || 0);

    // Calculate math
    const math = await commissionPolicyService.calculateBookingMath(
      category as any,
      trustTier,
      agreedFee
    );

    // Snapshot into booking
    const [updatedBooking] = await db.update(bookings)
      .set({
        status: "contracting",
        grossBookingValue: math.grossBookingValue.toString(),
        artistFee: math.artistFee.toString(),
        organizerFee: math.organizerFee.toString(),
        artistCommissionPct: math.artistCommissionPct.toString(),
        organizerCommissionPct: math.organizerCommissionPct.toString(),
        platformRevenue: math.platformRevenue.toString(),
        artistCategorySnapshot: category,
        trustTierSnapshot: trustTier,
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updatedBooking;
  }
}

export const bookingService = new BookingService();
