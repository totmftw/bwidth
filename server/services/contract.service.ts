import { db } from "../db";
import { bookings, contracts, events, venues, promoters, artists, users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { generateContractText, buildTermsFromBooking } from "../contract-utils";

export class ContractService {
  async generateContractFromSnapshot(bookingId: number) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!booking) throw new Error("Booking not found");

    const [event] = booking.eventId ? await db.select().from(events).where(eq(events.id, booking.eventId)) : [null];
    const [artist] = await db.select().from(artists).where(eq(artists.id, booking.artistId!));
    const [artistUser] = artist?.userId ? await db.select().from(users).where(eq(users.id, artist.userId)) : [null];
    
    let organizer = null;
    let organizerUser = null;
    if (event?.organizerId) {
      const orgResult = await db.select().from(promoters).where(eq(promoters.id, event.organizerId));
      organizer = orgResult[0];
      if (organizer?.userId) {
        const orgUserResult = await db.select().from(users).where(eq(users.id, organizer.userId));
        organizerUser = orgUserResult[0];
      }
    }

    let venue = null;
    if (event?.venueId) {
      const vResult = await db.select().from(venues).where(eq(venues.id, event.venueId));
      venue = vResult[0];
    }

    // Validation: Ensure legal profile information exists
    const hasArtistLegal = artist && artistUser && (artistUser.legalName || artist.name) && artistUser.panNumber && artistUser.permanentAddress;
    const hasOrgLegal = organizer && organizerUser && (organizerUser.legalName || organizer.name) && organizerUser.panNumber && organizerUser.permanentAddress;

    if (!hasArtistLegal || !hasOrgLegal) {
      throw new Error("DB Error: Missing required legal profile information (Legal Name, PAN, or Address). Please update your profile.");
    }

    const bookingForContract = {
      id: booking.id,
      offerAmount: booking.offerAmount,
      finalAmount: booking.finalAmount,
      offerCurrency: booking.offerCurrency || undefined,
      depositPercent: booking.depositPercent,
      slotTime: (booking.meta as any)?.slotTime,
      eventDate: event?.startTime?.toISOString() || (booking.meta as any)?.eventDate,
      meta: booking.meta as Record<string, unknown>,
      artist: artist ? { 
        name: artist.name, 
        user: { 
          displayName: artistUser?.displayName || undefined,
          legalName: artistUser?.legalName || undefined,
          permanentAddress: artistUser?.permanentAddress || undefined,
          panNumber: artistUser?.panNumber || undefined,
          gstin: artistUser?.gstin || undefined,
          bankAccountHolderName: artistUser?.bankAccountHolderName || undefined,
          bankAccountNumber: artistUser?.bankAccountNumber || undefined,
          bankIfsc: artistUser?.bankIfsc || undefined
        } 
      } : null,
      organizer: organizer ? { 
        name: organizer.name || undefined, 
        user: { 
          displayName: organizerUser?.displayName || undefined,
          legalName: organizerUser?.legalName || undefined,
          permanentAddress: organizerUser?.permanentAddress || undefined,
          panNumber: organizerUser?.panNumber || undefined,
          gstin: organizerUser?.gstin || undefined
        } 
      } : null,
      venue: venue ? { name: venue.name, address: venue.address as string | object | undefined } : null,
      event: event ? { title: event.title, startTime: event.startTime, endTime: event.endTime } : null,
    };

    const terms = buildTermsFromBooking(bookingForContract);
    const contractText = generateContractText(bookingForContract, terms);

    const commissionBreakdownJson = {
      grossBookingValue: booking.grossBookingValue,
      artistFee: booking.artistFee,
      organizerFee: booking.organizerFee,
      artistCommissionPct: booking.artistCommissionPct,
      organizerCommissionPct: booking.organizerCommissionPct,
      platformRevenue: booking.platformRevenue,
    };

    const [contract] = await db.insert(contracts).values({
      bookingId: booking.id,
      status: "draft",
      contractText: contractText,
      artistCategorySnapshot: booking.artistCategorySnapshot,
      trustScoreSnapshot: booking.trustTierSnapshot,
      commissionBreakdownJson,
      negotiatedTermsJson: terms,
      artistSignatureRequired: true,
      organizerSignatureRequired: true,
    }).returning();

    // Link back to booking
    await db.update(bookings).set({ contractId: contract.id }).where(eq(bookings.id, booking.id));

    return contract;
  }
}

export const contractService = new ContractService();
