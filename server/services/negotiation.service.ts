import { db } from "../db";
import {
  bookings,
  bookingProposals,
  conversations,
  conversationParticipants,
  conversationWorkflowInstances,
  messages,
  users,
  auditLogs
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage } from "../storage";
import { bookingService } from "./booking.service";
import {
  type ApplicationSubmitInput,
  type ProposalSubmitInput,
  type RiderConfirmationInput,
  type FinalAcceptanceInput,
  type NegotiationSnapshot,
  type NegotiationSummaryResponse,
  type NegotiationProposal,
} from "@shared/routes";

export class NegotiationService {
  async getSummary(bookingId: number): Promise<any> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation || null;

    let conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.entityType, "booking"),
        eq(conversations.entityId, bookingId),
        eq(conversations.conversationType, "negotiation")
      )
    });

    const rawProposals = await db.query.bookingProposals.findMany({
      where: eq(bookingProposals.bookingId, bookingId),
      orderBy: [desc(bookingProposals.round)]
    });

    const history = rawProposals.map(p => ({
      id: p.id,
      bookingId: p.bookingId!,
      conversationId: null, // we don't strictly bind it to conversation anymore
      version: p.round,
      snapshot: p.proposedTerms as NegotiationSnapshot,
      status: p.status as any,
      note: p.note,
      createdAt: p.createdAt!,
      createdBy: p.createdBy,
      createdByRole: p.createdBy === booking.artistId ? "artist" : "organizer" // Simplified role logic
    }));

    let currentProposal = history[0] || null;
    
    // Fallback: If no proposals exist but negotiation is active, try to recover snapshot from meta
    if (!currentProposal && negotiationMeta?.currentProposalSnapshot) {
       currentProposal = {
         id: 0,
         bookingId,
         conversationId: null,
         version: negotiationMeta.latestProposalVersion || 1,
         snapshot: negotiationMeta.currentProposalSnapshot,
         status: "active",
         note: null,
         createdAt: new Date(),
         createdBy: null,
         createdByRole: "system"
       };
    }

    return {
      booking: {
        id: booking.id,
        status: booking.status || 'inquiry',
        eventId: booking.eventId,
        artistId: booking.artistId,
        stageId: booking.stageId,
        contractId: booking.contractId ?? null,
        flowDeadlineAt: booking.flowDeadlineAt ? booking.flowDeadlineAt.toISOString() : null,
      },
      conversation: conversation ? { id: conversation.id } : null,
      status: negotiationMeta?.status || 'draft',
      round: currentProposal?.version || negotiationMeta?.latestProposalVersion || 0,
      currentProposal,
      history,
      agreement: negotiationMeta?.agreement || null,
      acceptance: negotiationMeta?.acceptance || {
        artistAcceptedVersion: null,
        organizerAcceptedVersion: null,
        artistAcceptedAt: null,
        organizerAcceptedAt: null,
      },
      riderConfirmation: negotiationMeta?.riderConfirmation || {
        isConfirmed: false,
        confirmedAt: null,
        confirmedBy: null,
        unresolvedItemCount: 0,
      },
      activity: negotiationMeta?.activity || [],
      readyForContract: negotiationMeta?.status === 'agreed'
    };
  }

  async openNegotiation(bookingId: number, initiatorId: number) {
    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (!booking.artist?.userId) throw new Error("Artist user not found");

    let organizerUserId: number | null = null;
    if (booking.organizer?.userId) {
      organizerUserId = booking.organizer.userId;
    }

    if (!organizerUserId) {
      throw new Error("Organizer user not found for negotiation");
    }

    let convo = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.entityType, "booking"),
        eq(conversations.entityId, bookingId),
        eq(conversations.conversationType, "negotiation")
      )
    });

    if (convo) return convo;

    const participantIds = Array.from(new Set([initiatorId, booking.artist.userId, organizerUserId]));
    const subject = `Negotiation: ${booking.artist.name} @ ${booking.event?.title || 'Event'}`;

    return await db.transaction(async (tx) => {
      const [newConvo] = await tx.insert(conversations).values({
        entityType: "booking",
        entityId: bookingId,
        conversationType: "negotiation",
        subject,
        status: "open",
        lastMessageAt: new Date()
      }).returning();

      for (const uid of participantIds) {
        await tx.insert(conversationParticipants).values({
          conversationId: newConvo.id,
          userId: uid
        }).onConflictDoNothing();
      }

      await tx.insert(conversationWorkflowInstances).values({
        conversationId: newConvo.id,
        workflowKey: "negotiation-v3",
        currentNodeKey: "NEGOTIATING",
        round: 1,
        maxRounds: 10,
        locked: false,
        context: {
          artistUserId: booking.artist!.userId,
          organizerUserId,
        },
      });

      return newConvo;
    });
  }

  async submitProposal(bookingId: number, userId: number, payload: ProposalSubmitInput) {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.flowDeadlineAt && new Date() > new Date(booking.flowDeadlineAt)) {
      await bookingService.expireBookingFlow(bookingId, "negotiation_expired");
      throw new Error("Booking flow 72-hour deadline has passed");
    }

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation || {};
    if (negotiationMeta.status === 'agreed' || negotiationMeta.status === 'walked_away') {
      throw new Error("Negotiation is already finalized");
    }

    const nextVersion = (negotiationMeta.latestProposalVersion || 0) + 1;
    const now = new Date();
    const nowIso = now.toISOString();

    return await db.transaction(async (tx) => {
      const [createdProposal] = await tx.insert(bookingProposals).values({
        bookingId,
        createdBy: userId,
        round: nextVersion,
        proposedTerms: payload.snapshot,
        note: payload.note || null,
        status: "active"
      }).returning();

      // Determine role
      const artist = await tx.query.artists.findFirst({ where: eq(users.id, userId) }); // rough proxy
      const role = booking.artistId === artist?.id ? "artist" : "organizer";

      const activity = {
        id: `proposal-${createdProposal.id}`,
        type: "proposal_submitted",
        proposalVersion: nextVersion,
        actorUserId: userId,
        actorRole: role,
        createdAt: nowIso,
        messageId: null,
        metadata: { note: payload.note }
      };

      const updatedNegotiation = {
        ...negotiationMeta,
        latestProposalVersion: nextVersion,
        currentProposalSnapshot: payload.snapshot,
        acceptance: {
          artistAcceptedVersion: null,
          organizerAcceptedVersion: null,
          artistAcceptedAt: null,
          organizerAcceptedAt: null,
        },
        activity: [...(negotiationMeta.activity || []), activity]
      };

      await tx.update(bookings).set({
        offerAmount: String(payload.snapshot.financial.offerAmount),
        offerCurrency: payload.snapshot.financial.currency,
        meta: {
          ...meta,
          negotiation: updatedNegotiation
        }
      }).where(eq(bookings.id, bookingId));

      return this.getSummary(bookingId);
    });
  }

  async confirmRider(bookingId: number, userId: number, payload: RiderConfirmationInput) {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.flowDeadlineAt && new Date() > new Date(booking.flowDeadlineAt)) {
      await bookingService.expireBookingFlow(bookingId, "negotiation_expired");
      throw new Error("Booking flow 72-hour deadline has passed");
    }

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation;
    if (!negotiationMeta) throw new Error("Negotiation not started");

    if (payload.proposalVersion !== (negotiationMeta.latestProposalVersion || 1)) {
      throw new Error("Rider confirmation must be against the latest proposal version");
    }

    const unresolvedCount = payload.artistRequirements.filter(r => r.status === "pending").length;
    const isConfirmed = unresolvedCount === 0;
    const nowIso = new Date().toISOString();

    const riderConfirmation = {
      isConfirmed,
      confirmedAt: isConfirmed ? nowIso : null,
      confirmedBy: userId,
      unresolvedItemCount: unresolvedCount,
    };

    const currentSnapshot = negotiationMeta.currentProposalSnapshot;
    currentSnapshot.techRider = {
      ...currentSnapshot.techRider,
      artistRequirements: payload.artistRequirements,
      organizerCommitments: payload.organizerCommitments,
      organizerConfirmedAt: riderConfirmation.confirmedAt,
      organizerConfirmedBy: userId
    };

    const activity = {
      id: `rider-confirm-${Date.now()}`,
      type: "rider_confirmation_submitted",
      proposalVersion: payload.proposalVersion,
      actorUserId: userId,
      actorRole: "organizer",
      createdAt: nowIso,
      metadata: { isConfirmed, unresolvedCount }
    };

    const updatedNegotiation = {
      ...negotiationMeta,
      currentProposalSnapshot: currentSnapshot,
      riderConfirmation,
      activity: [...(negotiationMeta.activity || []), activity]
    };

    await db.update(bookings).set({
      meta: {
        ...meta,
        negotiation: updatedNegotiation
      }
    }).where(eq(bookings.id, bookingId));

    // Also update the proposal in db
    await db.update(bookingProposals)
      .set({ proposedTerms: currentSnapshot })
      .where(and(
        eq(bookingProposals.bookingId, bookingId),
        eq(bookingProposals.round, payload.proposalVersion)
      ));

    return this.getSummary(bookingId);
  }

  async finalAccept(bookingId: number, userId: number, payload: FinalAcceptanceInput) {
    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.flowDeadlineAt && new Date() > new Date(booking.flowDeadlineAt)) {
      await bookingService.expireBookingFlow(bookingId, "negotiation_expired");
      throw new Error("Booking flow 72-hour deadline has passed");
    }

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation;
    if (!negotiationMeta) throw new Error("Negotiation not started");

    if (payload.proposalVersion !== (negotiationMeta.latestProposalVersion || 1)) {
      throw new Error("Can only accept the latest proposal version");
    }

    if (!negotiationMeta.riderConfirmation?.isConfirmed) {
      throw new Error("Cannot accept until organizer has confirmed the tech rider");
    }

    const isArtist = booking.artist?.userId === userId;
    const isOrganizer = booking.organizer?.userId === userId;
    if (!isArtist && !isOrganizer) throw new Error("User not authorized to accept");

    const nowIso = new Date().toISOString();
    const acceptance = { ...negotiationMeta.acceptance };

    if (isArtist) {
      acceptance.artistAcceptedVersion = payload.proposalVersion;
      acceptance.artistAcceptedAt = nowIso;
    }
    if (isOrganizer) {
      acceptance.organizerAcceptedVersion = payload.proposalVersion;
      acceptance.organizerAcceptedAt = nowIso;
    }

    const activity = {
      id: `accept-${Date.now()}-${userId}`,
      type: "accepted",
      proposalVersion: payload.proposalVersion,
      actorUserId: userId,
      actorRole: isArtist ? "artist" : "organizer",
      createdAt: nowIso,
      metadata: {}
    };

    let updatedNegotiation = {
      ...negotiationMeta,
      acceptance,
      activity: [...(negotiationMeta.activity || []), activity]
    };

    const isFullyAgreed = acceptance.artistAcceptedVersion === payload.proposalVersion &&
                          acceptance.organizerAcceptedVersion === payload.proposalVersion;

    let newBookingStatus = booking.status;
    if (isFullyAgreed) {
      updatedNegotiation.status = "agreed";
      updatedNegotiation.agreement = {
        version: payload.proposalVersion,
        agreedAt: nowIso,
        acceptedBy: {
          artistUserId: booking.artist!.userId,
          organizerUserId: booking.organizer!.userId
        },
        acceptedAt: {
          artist: acceptance.artistAcceptedAt,
          organizer: acceptance.organizerAcceptedAt
        },
        snapshot: negotiationMeta.currentProposalSnapshot
      };
      newBookingStatus = "contracting";
    } else {
      updatedNegotiation.status = isArtist ? "awaiting_organizer_acceptance" : "awaiting_artist_acceptance";
    }

    await db.update(bookings).set({
      status: newBookingStatus as any,
      meta: {
        ...meta,
        negotiation: updatedNegotiation
      }
    }).where(eq(bookings.id, bookingId));

    if (isFullyAgreed) {
      await bookingService.confirmBookingAndSnapshot(bookingId);
    }

    return this.getSummary(bookingId);
  }

  async walkAway(bookingId: number, userId: number, reason?: string) {
    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.flowDeadlineAt && new Date() > new Date(booking.flowDeadlineAt)) {
      await bookingService.expireBookingFlow(bookingId, "negotiation_expired");
      throw new Error("Booking flow 72-hour deadline has passed");
    }

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation;
    if (!negotiationMeta) throw new Error("Negotiation not started");

    const isArtist = booking.artist?.userId === userId;
    const nowIso = new Date().toISOString();

    const activity = {
      id: `walkaway-${Date.now()}`,
      type: "walked_away",
      proposalVersion: negotiationMeta.latestProposalVersion || 1,
      actorUserId: userId,
      actorRole: isArtist ? "artist" : "organizer",
      createdAt: nowIso,
      metadata: { reason }
    };

    const updatedNegotiation = {
      ...negotiationMeta,
      status: "walked_away",
      activity: [...(negotiationMeta.activity || []), activity]
    };

    await db.update(bookings).set({
      status: "cancelled",
      meta: {
        ...meta,
        negotiation: updatedNegotiation
      }
    }).where(eq(bookings.id, bookingId));

    return this.getSummary(bookingId);
  }
}

export const negotiationService = new NegotiationService();
