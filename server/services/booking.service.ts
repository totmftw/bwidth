import { db } from "../db";
import { bookings, contracts, artists, promoters, auditLogs } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { commissionPolicyService } from "./commissionPolicy.service";
import { generateContractText, buildTermsFromBooking } from "../contract-utils";

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
