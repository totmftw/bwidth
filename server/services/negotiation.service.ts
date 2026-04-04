import { db } from "../db";
import {
  bookings,
  bookingProposals,
  conversations,
  conversationParticipants,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { storage } from "../storage";
import { bookingService } from "./booking.service";
import { contractService } from "./contract.service";
import { emitDomainEvent } from "./event-bus";
import { agentSessions } from "@shared/schema";
import {
  type NegotiationSnapshot,
  type NegotiationActionInput,
  type NegotiationSummaryResponseV2,
  type NegotiationProposal,
  type StepHistoryRecord,
  type NegotiationStepState,
  type NegotiationAction,
  type RiderConfirmationInput,
} from "@shared/routes";

export class NegotiationService {
  // ---------------------------------------------------------------------------
  // Step-state inference for pre-overhaul bookings
  // ---------------------------------------------------------------------------
  // Bookings created before the step-based overhaul lack currentStep/stepState
  // in their negotiation meta. This method infers the correct values from
  // the existing proposals and negotiation status.

  private inferStepState(
    booking: any,
    negotiationMeta: any,
    rawProposals: any[],
    artistUserId: number | null,
  ): {
    currentStep: number;
    stepState: NegotiationStepState;
    stepDeadlineAt: string | null;
  } {
    // If the new fields already exist, use them directly
    if (
      negotiationMeta?.currentStep !== undefined &&
      negotiationMeta?.currentStep !== null &&
      negotiationMeta?.stepState
    ) {
      return {
        currentStep: negotiationMeta.currentStep,
        stepState: negotiationMeta.stepState,
        stepDeadlineAt: negotiationMeta.stepDeadlineAt ?? null,
      };
    }

    const negStatus = negotiationMeta?.status;

    // Terminal states — infer from old status
    if (negStatus === "agreed" || negStatus === "locked") {
      return {
        currentStep: negotiationMeta?.latestProposalVersion ?? rawProposals.length,
        stepState: "locked",
        stepDeadlineAt: null,
      };
    }
    if (negStatus === "walked_away") {
      return {
        currentStep: negotiationMeta?.latestProposalVersion ?? rawProposals.length,
        stepState: "walked_away",
        stepDeadlineAt: null,
      };
    }
    if (negStatus === "expired") {
      return {
        currentStep: negotiationMeta?.latestProposalVersion ?? rawProposals.length,
        stepState: "expired",
        stepDeadlineAt: null,
      };
    }

    // Active negotiation — determine whose turn from proposals
    const proposalCount = rawProposals.length;
    if (proposalCount === 0) {
      return { currentStep: 0, stepState: "applied", stepDeadlineAt: null };
    }

    // proposals are ordered desc by round — [0] is the latest
    const latestProposal = rawProposals[0];
    const lastProposalByArtist = latestProposal.createdBy === artistUserId;

    // If only 1 proposal and it's from the artist (application), organizer hasn't responded
    if (
      proposalCount === 1 &&
      lastProposalByArtist &&
      negotiationMeta?.source === "application"
    ) {
      return {
        currentStep: 0,
        stepState: "applied",
        stepDeadlineAt: booking.flowDeadlineAt?.toISOString() ?? null,
      };
    }

    // Otherwise infer from who last acted
    const currentStep = Math.min(proposalCount, 4);
    const stepState: NegotiationStepState = lastProposalByArtist
      ? "awaiting_org"
      : "awaiting_art";

    return {
      currentStep,
      stepState,
      stepDeadlineAt: booking.flowDeadlineAt?.toISOString() ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // Role resolution
  // ---------------------------------------------------------------------------

  private async determineRole(
    bookingId: number,
    userId: number,
  ): Promise<"artist" | "organizer"> {
    const details = await storage.getBookingWithDetails(bookingId);
    if (!details) throw new Error("Booking not found");
    if (details.artist?.userId === userId) return "artist";
    if (details.organizer?.userId === userId) return "organizer";
    if (details.venue?.userId === userId) return "organizer";
    throw new Error("User is not a participant in this negotiation");
  }

  // ---------------------------------------------------------------------------
  // Pure step-transition validation (no DB access)
  // ---------------------------------------------------------------------------

  private validateStepTransition(params: {
    currentStep: number;
    stepState: string;
    action: NegotiationAction;
    role: "artist" | "organizer";
    stepDeadlineAt: string | null;
  }): { valid: true } | { valid: false; error: string } {
    const { currentStep, stepState, action, role, stepDeadlineAt } = params;

    // Terminal states
    if (["locked", "walked_away", "expired"].includes(stepState)) {
      return {
        valid: false,
        error: "Negotiation is finalized, no further actions allowed",
      };
    }

    // Deadline check
    if (stepDeadlineAt && new Date() > new Date(stepDeadlineAt)) {
      return { valid: false, error: "Step deadline has expired" };
    }

    // Step 0 (applied): only organizer can submit initial proposal
    if (currentStep === 0 || stepState === "applied") {
      if (role !== "organizer") {
        return {
          valid: false,
          error: "Organizer must submit the first proposal",
        };
      }
      if (action !== "edit") {
        return {
          valid: false,
          error: "First step must be a proposal (edit action)",
        };
      }
      return { valid: true };
    }

    // Turn enforcement based on stepState
    if (stepState === "awaiting_art" && role !== "artist") {
      return { valid: false, error: "It is the artist's turn to respond" };
    }
    if (stepState === "awaiting_org" && role !== "organizer") {
      return { valid: false, error: "It is the organizer's turn to respond" };
    }

    // Step 4 (max reached): only accept or walkaway, no edit
    if (
      currentStep >= 3 &&
      stepState === "awaiting_art" &&
      action === "edit"
    ) {
      return {
        valid: false,
        error:
          "Maximum negotiation steps reached. You can only accept or walk away.",
      };
    }

    // Max step check (shouldn't hit step 5+)
    if (currentStep >= 4) {
      return { valid: false, error: "Maximum negotiation steps reached" };
    }

    return { valid: true };
  }

  // ---------------------------------------------------------------------------
  // Core action handler — replaces submitProposal, finalAccept, walkAway
  // ---------------------------------------------------------------------------

  async handleNegotiationAction(
    bookingId: number,
    userId: number,
    payload: NegotiationActionInput,
  ): Promise<NegotiationSummaryResponseV2> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    // Check global flow deadline
    if (
      booking.flowDeadlineAt &&
      new Date() > new Date(booking.flowDeadlineAt)
    ) {
      await bookingService.expireBookingFlow(bookingId, "negotiation_expired");
      throw new Error("Booking flow 72-hour deadline has passed");
    }

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation || {
      currentStep: 0,
      stepState: "applied",
      stepDeadlineAt: null,
      stepHistory: [],
      lockedTerms: null,
      latestProposalVersion: 0,
      currentProposalSnapshot: null,
      activity: [],
      acceptance: {
        artistAcceptedVersion: null,
        organizerAcceptedVersion: null,
        artistAcceptedAt: null,
        organizerAcceptedAt: null,
      },
      riderConfirmation: {
        isConfirmed: false,
        confirmedAt: null,
        confirmedBy: null,
        unresolvedItemCount: 0,
      },
    };

    const role = await this.determineRole(bookingId, userId);

    // Infer step state for pre-overhaul bookings that lack these fields
    const details = await storage.getBookingWithDetails(bookingId);
    const artistUserId = details?.artist?.userId ?? null;
    const rawProposals = await db.query.bookingProposals.findMany({
      where: eq(bookingProposals.bookingId, bookingId),
      orderBy: [desc(bookingProposals.round)],
    });
    const inferred = this.inferStepState(
      booking,
      negotiationMeta,
      rawProposals,
      artistUserId,
    );

    const validation = this.validateStepTransition({
      currentStep: inferred.currentStep,
      stepState: inferred.stepState,
      action: payload.action,
      role,
      stepDeadlineAt: inferred.stepDeadlineAt,
    });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const nextStep = inferred.currentStep + 1;
    const nextVersion = (negotiationMeta.latestProposalVersion || 0) + 1;
    const nowIso = new Date().toISOString();

    // ------------------------------------------------------------------
    // action === "edit"
    // ------------------------------------------------------------------
    if (payload.action === "edit") {
      const snapshot = payload.snapshot!;

      // Determine next stepState
      let nextStepState: NegotiationStepState;
      if (nextStep === 1) {
        nextStepState = "awaiting_art"; // organizer proposed -> artist's turn
      } else if (role === "artist") {
        nextStepState = "awaiting_org"; // artist edited -> organizer's turn
      } else {
        nextStepState = "awaiting_art"; // organizer edited -> artist's turn
      }

      const newDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await db.transaction(async (tx) => {
        const [proposal] = await tx
          .insert(bookingProposals)
          .values({
            bookingId,
            createdBy: userId,
            round: nextVersion,
            proposedTerms: snapshot,
            note: payload.note || null,
            status: "active",
            submittedByRole: role,
            stepNumber: nextStep,
            responseAction: "edit",
          })
          .returning();

        const stepRecord: StepHistoryRecord = {
          step: nextStep,
          stepState: nextStepState,
          action: "edit",
          actorUserId: userId,
          actorRole: role,
          proposalId: proposal.id,
          proposalVersion: nextVersion,
          timestamp: nowIso,
          note: payload.note || null,
        };

        const activityEntry = {
          id: `edit-${Date.now()}-${userId}`,
          type: "proposal_submitted" as const,
          proposalVersion: nextVersion,
          actorUserId: userId,
          actorRole: role,
          createdAt: nowIso,
          messageId: null,
          metadata: { note: payload.note },
        };

        await tx
          .update(bookings)
          .set({
            offerAmount: String(snapshot.financial.offerAmount),
            offerCurrency: snapshot.financial.currency,
            status:
              booking.status === "inquiry" || booking.status === "offered"
                ? "negotiating"
                : (booking.status as any),
            flowDeadlineAt: newDeadline,
            meta: {
              ...meta,
              negotiation: {
                ...negotiationMeta,
                currentStep: nextStep,
                stepState: nextStepState,
                stepDeadlineAt: newDeadline.toISOString(),
                latestProposalVersion: nextVersion,
                currentProposalSnapshot: snapshot,
                status: "negotiating",
                acceptance: {
                  artistAcceptedVersion: null,
                  organizerAcceptedVersion: null,
                  artistAcceptedAt: null,
                  organizerAcceptedAt: null,
                },
                stepHistory: [
                  ...(negotiationMeta.stepHistory || []),
                  stepRecord,
                ],
                activity: [
                  ...(negotiationMeta.activity || []),
                  activityEntry,
                ],
              },
            },
          })
          .where(eq(bookings.id, bookingId));
      });

      // Notify other party about new proposal
      const editEvent = await storage.getBookingWithDetails(bookingId);
      emitDomainEvent("negotiation.proposal_received", {
        bookingId,
        entityType: "booking",
        entityId: bookingId,
        eventTitle: editEvent?.event?.title || "Event",
        actorName: editEvent?.artist?.name || editEvent?.organizer?.name || "Participant",
        actionUrl: `/bookings?bookingId=${bookingId}`,
      }, userId);

      return this.getSummary(bookingId);
    }

    // ------------------------------------------------------------------
    // action === "accept"
    // ------------------------------------------------------------------
    if (payload.action === "accept") {
      const currentSnapshot = negotiationMeta.currentProposalSnapshot;
      const nextStepState: NegotiationStepState = "locked";

      await db.transaction(async (tx) => {
        const [proposal] = await tx
          .insert(bookingProposals)
          .values({
            bookingId,
            createdBy: userId,
            round: nextVersion,
            proposedTerms: currentSnapshot,
            note: payload.note || null,
            status: "accepted",
            submittedByRole: role,
            stepNumber: nextStep,
            responseAction: "accept",
          })
          .returning();

        const details = await storage.getBookingWithDetails(bookingId);
        const agreement = {
          version: nextVersion,
          agreedAt: nowIso,
          acceptedBy: {
            artistUserId: details?.artist?.userId || null,
            organizerUserId: details?.organizer?.userId || null,
          },
          acceptedAt: {
            artist: role === "artist" ? nowIso : null,
            organizer: role === "organizer" ? nowIso : null,
          },
          snapshot: currentSnapshot,
        };

        const stepRecord: StepHistoryRecord = {
          step: nextStep,
          stepState: nextStepState,
          action: "accept",
          actorUserId: userId,
          actorRole: role,
          proposalId: proposal.id,
          proposalVersion: nextVersion,
          timestamp: nowIso,
          note: payload.note || null,
        };

        const activityEntry = {
          id: `accept-${Date.now()}-${userId}`,
          type: "accepted" as const,
          proposalVersion: nextVersion,
          actorUserId: userId,
          actorRole: role,
          createdAt: nowIso,
          messageId: null,
          metadata: { note: payload.note, reason: payload.reason },
        };

        await tx
          .update(bookings)
          .set({
            status: "contracting" as any,
            finalAmount: String(currentSnapshot.financial.offerAmount),
            meta: {
              ...meta,
              negotiation: {
                ...negotiationMeta,
                currentStep: nextStep,
                stepState: nextStepState,
                status: "agreed",
                lockedTerms: currentSnapshot,
                agreement,
                stepHistory: [
                  ...(negotiationMeta.stepHistory || []),
                  stepRecord,
                ],
                activity: [
                  ...(negotiationMeta.activity || []),
                  activityEntry,
                ],
              },
            },
          })
          .where(eq(bookings.id, bookingId));
      });

      // Contract generation — AFTER transaction commits
      try {
        await bookingService.confirmBookingAndSnapshot(bookingId);
        await contractService.generateContractFromSnapshot(bookingId);
        const contract = await storage.getContractByBookingId(bookingId);
        if (contract) {
          await storage.updateContract(contract.id, {
            status: "sent" as any,
            initiatedAt: new Date(),
            deadlineAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            currentVersion: 1,
            artistEditUsed: false,
            promoterEditUsed: false,
            editPhase: "organizer_review",
          });
        }
      } catch (err) {
        console.error(
          "Auto-contract generation failed (can retry via /contract/initiate):",
          err,
        );
      }

      // Notify both parties about acceptance
      const acceptEvent = await storage.getBookingWithDetails(bookingId);
      emitDomainEvent("negotiation.accepted", {
        bookingId,
        entityType: "booking",
        entityId: bookingId,
        eventTitle: acceptEvent?.event?.title || "Event",
        actorName: acceptEvent?.artist?.name || acceptEvent?.organizer?.name || "Participant",
        actionUrl: `/bookings?bookingId=${bookingId}`,
      }, userId);

      // Also emit contract generated if it was created
      const genContract = await storage.getContractByBookingId(bookingId);
      if (genContract) {
        emitDomainEvent("contract.generated", {
          bookingId,
          contractId: genContract.id,
          entityType: "contract",
          entityId: genContract.id,
          eventTitle: acceptEvent?.event?.title || "Event",
          actionUrl: `/contract/${genContract.id}`,
        }, userId);
      }

      // Record negotiation outcome for self-learning
      try {
        const agreedSnapshot = negotiationMeta.currentProposalSnapshot;
        const finalFee = agreedSnapshot?.financial?.offerAmount ?? Number(booking.offerAmount || 0);
        const activeAgentSession = await storage.getActiveAgentSession(userId, "negotiation", bookingId);
        const suggestedFee = activeAgentSession?.memory
          ? (activeAgentSession.memory as any)?.feeSuggestion?.suggested ?? null
          : null;
        const artistData = booking.artistId ? await storage.getArtist(booking.artistId) : null;
        const eventData = booking.eventId ? await storage.getEvent(booking.eventId) : null;

        await storage.createNegotiationOutcome({
          bookingId,
          artistId: booking.artistId,
          organizerId: eventData?.organizerId ?? null,
          suggestedFee: suggestedFee ? String(suggestedFee) : null,
          finalFee: String(finalFee),
          feeAccuracyDelta: suggestedFee ? String(finalFee - suggestedFee) : null,
          roundsToAgreement: inferred.currentStep,
          outcome: "signed",
          genre: (artistData?.metadata as any)?.primaryGenre ?? null,
          venueTier: eventData?.venue?.capacity
            ? (eventData.venue.capacity < 200 ? "intimate" : eventData.venue.capacity <= 1000 ? "mid" : "large")
            : null,
          venueCapacity: eventData?.venue?.capacity ?? null,
          agentSessionId: activeAgentSession?.id ?? null,
        });
      } catch (outcomeErr) {
        console.error("Failed to record negotiation outcome:", outcomeErr);
      }

      return this.getSummary(bookingId);
    }

    // ------------------------------------------------------------------
    // action === "walkaway"
    // ------------------------------------------------------------------
    if (payload.action === "walkaway") {
      const nextStepState: NegotiationStepState = "walked_away";

      await db.transaction(async (tx) => {
        await tx.insert(bookingProposals).values({
          bookingId,
          createdBy: userId,
          round: nextVersion,
          proposedTerms: negotiationMeta.currentProposalSnapshot || {},
          note: payload.reason || payload.note || null,
          status: "rejected",
          submittedByRole: role,
          stepNumber: nextStep,
          responseAction: "walkaway",
        });

        const stepRecord: StepHistoryRecord = {
          step: nextStep,
          stepState: nextStepState,
          action: "walkaway",
          actorUserId: userId,
          actorRole: role,
          proposalId: null,
          proposalVersion: nextVersion,
          timestamp: nowIso,
          note: payload.reason || payload.note || null,
        };

        const activityEntry = {
          id: `walkaway-${Date.now()}-${userId}`,
          type: "walked_away" as const,
          proposalVersion: nextVersion,
          actorUserId: userId,
          actorRole: role,
          createdAt: nowIso,
          messageId: null,
          metadata: { note: payload.note, reason: payload.reason },
        };

        await tx
          .update(bookings)
          .set({
            status: "cancelled" as any,
            meta: {
              ...meta,
              negotiation: {
                ...negotiationMeta,
                currentStep: nextStep,
                stepState: nextStepState,
                status: "walked_away",
                stepHistory: [
                  ...(negotiationMeta.stepHistory || []),
                  stepRecord,
                ],
                activity: [
                  ...(negotiationMeta.activity || []),
                  activityEntry,
                ],
              },
            },
          })
          .where(eq(bookings.id, bookingId));
      });

      // Notify both parties about walkaway
      const walkEvent = await storage.getBookingWithDetails(bookingId);
      emitDomainEvent("negotiation.declined", {
        bookingId,
        entityType: "booking",
        entityId: bookingId,
        eventTitle: walkEvent?.event?.title || "Event",
        actorName: walkEvent?.artist?.name || walkEvent?.organizer?.name || "Participant",
        reason: payload.note || "Party walked away",
        actionUrl: `/bookings?bookingId=${bookingId}`,
      }, userId);

      // Record walkaway outcome for self-learning
      try {
        const artistData = booking.artistId ? await storage.getArtist(booking.artistId) : null;
        const eventData = booking.eventId ? await storage.getEvent(booking.eventId) : null;
        await storage.createNegotiationOutcome({
          bookingId,
          artistId: booking.artistId,
          organizerId: eventData?.organizerId ?? null,
          finalFee: booking.offerAmount ? String(booking.offerAmount) : null,
          roundsToAgreement: inferred.currentStep,
          outcome: "walked_away",
          genre: (artistData?.metadata as any)?.primaryGenre ?? null,
          venueTier: eventData?.venue?.capacity
            ? (eventData.venue.capacity < 200 ? "intimate" : eventData.venue.capacity <= 1000 ? "mid" : "large")
            : null,
          venueCapacity: eventData?.venue?.capacity ?? null,
        });
      } catch (outcomeErr) {
        console.error("Failed to record walkaway outcome:", outcomeErr);
      }

      return this.getSummary(bookingId);
    }

    throw new Error(`Unknown negotiation action: ${payload.action}`);
  }

  // ---------------------------------------------------------------------------
  // Summary (V2 — exposes step info)
  // ---------------------------------------------------------------------------

  async getSummary(bookingId: number): Promise<NegotiationSummaryResponseV2> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation || null;

    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.entityType, "booking"),
        eq(conversations.entityId, bookingId),
        eq(conversations.conversationType, "negotiation"),
      ),
    });

    const rawProposals = await db.query.bookingProposals.findMany({
      where: eq(bookingProposals.bookingId, bookingId),
      orderBy: [desc(bookingProposals.round)],
    });

    // Resolve artist userId for createdByRole fallback
    const details = await storage.getBookingWithDetails(bookingId);
    const artistUserId = details?.artist?.userId;

    const history: NegotiationProposal[] = rawProposals.map((p) => ({
      id: p.id,
      bookingId: p.bookingId!,
      conversationId: null,
      version: p.round,
      snapshot: p.proposedTerms as NegotiationSnapshot,
      status: p.status as any,
      note: p.note,
      createdAt: p.createdAt!,
      createdBy: p.createdBy,
      createdByRole: (
        p.submittedByRole ||
        (p.createdBy === artistUserId ? "artist" : "organizer")
      ) as "artist" | "organizer",
    }));

    let currentProposal: NegotiationProposal | null = history[0] || null;

    // Fallback: recover snapshot from meta if no proposals exist
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
        createdByRole: "system",
      } as any;
    }

    // Step-based fields — infer from proposals if not present (pre-overhaul bookings)
    const inferred = this.inferStepState(
      booking,
      negotiationMeta,
      rawProposals,
      artistUserId ?? null,
    );
    const currentStep = inferred.currentStep;
    const stepState = inferred.stepState;
    const stepDeadlineAt = inferred.stepDeadlineAt;

    // Determine whose turn
    let whoseTurn: "artist" | "organizer" | null = null;
    if (stepState === "awaiting_art") whoseTurn = "artist";
    else if (stepState === "awaiting_org" || stepState === "applied")
      whoseTurn = "organizer";

    // Compute available actions for the current actor
    let availableActions: NegotiationAction[] = [];
    if (stepState === "applied") {
      availableActions = ["edit"]; // organizer must propose
    } else if (stepState === "awaiting_art") {
      if (currentStep >= 3) {
        availableActions = ["accept", "walkaway"]; // step 4: no edit
      } else {
        availableActions = ["edit", "accept", "walkaway"];
      }
    } else if (stepState === "awaiting_org") {
      availableActions = ["edit", "accept", "walkaway"];
    }

    // Fetch event + stages for the slot selector
    let eventStages: Array<{ id: number; name: string | null; startTime: string | null; endTime: string | null; orderIndex: number }> = [];
    let eventInfo: { title: string; startTime: string; endTime: string | null } | null = null;
    if (booking.eventId) {
      try {
        const evt = await storage.getEvent(booking.eventId);
        if (evt) {
          const ts = (v: Date | string | null | undefined): string | null =>
            v ? (v instanceof Date ? v.toISOString() : String(v)) : null;
          eventInfo = {
            title: evt.title,
            startTime: ts(evt.startTime)!,
            endTime: ts(evt.endTime),
          };
          eventStages = (evt.stages ?? []).map((s: any) => ({
            id: s.id,
            name: s.name ?? null,
            startTime: ts(s.startTime),
            endTime: ts(s.endTime),
            orderIndex: s.orderIndex ?? 0,
          }));
        }
      } catch {
        // Continue without stages on any fetch error
      }
    }

    return {
      booking: {
        id: booking.id,
        status: booking.status || "inquiry",
        eventId: booking.eventId,
        artistId: booking.artistId,
        stageId: booking.stageId ?? null,
        contractId: booking.contractId ?? null,
        flowDeadlineAt: booking.flowDeadlineAt
          ? booking.flowDeadlineAt.toISOString()
          : null,
      },
      event: eventInfo,
      eventStages,
      conversation: conversation ? { id: conversation.id } : null,
      // Step-based fields
      currentStep,
      stepState,
      stepDeadlineAt,
      whoseTurn,
      availableActions,
      maxSteps: 4 as const,
      // Existing fields
      status: negotiationMeta?.status || "draft",
      round:
        currentProposal?.version ||
        negotiationMeta?.latestProposalVersion ||
        0,
      currentProposal,
      history,
      stepHistory: negotiationMeta?.stepHistory || [],
      agreement: negotiationMeta?.agreement || null,
      lockedTerms: negotiationMeta?.lockedTerms || null,
      activity: negotiationMeta?.activity || [],
      readyForContract: negotiationMeta?.status === "agreed",
      contractGenerated: !!booking.contractId,
    };
  }

  // ---------------------------------------------------------------------------
  // Open negotiation (kept, minus conversationWorkflowInstances creation)
  // ---------------------------------------------------------------------------

  async openNegotiation(bookingId: number, initiatorId: number) {
    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) throw new Error("Booking not found");
    if (!booking.artist?.userId) throw new Error("Artist user not found");

    let organizerUserId: number | null = null;
    if (booking.organizer?.userId) {
      organizerUserId = booking.organizer.userId;
    } else if (booking.venue?.userId) {
      organizerUserId = booking.venue.userId;
    }

    if (!organizerUserId) {
      throw new Error("Organizer user not found for negotiation");
    }

    const convo = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.entityType, "booking"),
        eq(conversations.entityId, bookingId),
        eq(conversations.conversationType, "negotiation"),
      ),
    });

    if (convo) return convo;

    const participantIds = Array.from(
      new Set([initiatorId, booking.artist.userId, organizerUserId]),
    );
    const subject = `Negotiation: ${booking.artist.name} @ ${booking.event?.title || "Event"}`;

    return await db.transaction(async (tx) => {
      const [newConvo] = await tx
        .insert(conversations)
        .values({
          entityType: "booking",
          entityId: bookingId,
          conversationType: "negotiation",
          subject,
          status: "open",
          lastMessageAt: new Date(),
        })
        .returning();

      for (const uid of participantIds) {
        await tx
          .insert(conversationParticipants)
          .values({
            conversationId: newConvo.id,
            userId: uid,
          })
          .onConflictDoNothing();
      }

      return newConvo;
    });
  }

  // ---------------------------------------------------------------------------
  // Confirm rider (kept as-is — optional utility, not in critical path)
  // ---------------------------------------------------------------------------

  async confirmRider(
    bookingId: number,
    userId: number,
    payload: RiderConfirmationInput,
  ) {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (
      booking.flowDeadlineAt &&
      new Date() > new Date(booking.flowDeadlineAt)
    ) {
      await bookingService.expireBookingFlow(bookingId, "negotiation_expired");
      throw new Error("Booking flow 72-hour deadline has passed");
    }

    const meta = (booking.meta as any) || {};
    const negotiationMeta = meta.negotiation;
    if (!negotiationMeta) throw new Error("Negotiation not started");

    if (
      payload.proposalVersion !== (negotiationMeta.latestProposalVersion || 1)
    ) {
      throw new Error(
        "Rider confirmation must be against the latest proposal version",
      );
    }

    const unresolvedCount = payload.artistRequirements.filter(
      (r) => r.status === "pending",
    ).length;
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
      organizerConfirmedBy: userId,
    };

    const activity = {
      id: `rider-confirm-${Date.now()}`,
      type: "rider_confirmation_submitted" as const,
      proposalVersion: payload.proposalVersion,
      actorUserId: userId,
      actorRole: "organizer" as const,
      createdAt: nowIso,
      metadata: { isConfirmed, unresolvedCount },
    };

    const updatedNegotiation = {
      ...negotiationMeta,
      currentProposalSnapshot: currentSnapshot,
      riderConfirmation,
      activity: [...(negotiationMeta.activity || []), activity],
    };

    await db
      .update(bookings)
      .set({
        meta: {
          ...meta,
          negotiation: updatedNegotiation,
        },
      })
      .where(eq(bookings.id, bookingId));

    // Also update the proposal in db
    await db
      .update(bookingProposals)
      .set({ proposedTerms: currentSnapshot })
      .where(
        and(
          eq(bookingProposals.bookingId, bookingId),
          eq(bookingProposals.round, payload.proposalVersion),
        ),
      );

    return this.getSummary(bookingId);
  }

  // ---------------------------------------------------------------------------
  // Agent context — lightweight state for per-message AI processing
  // ---------------------------------------------------------------------------

  async getAgentContext(bookingId: number): Promise<{
    currentStep: number;
    stepState: string;
    whoseTurn: string | null;
    latestProposal: any;
    deadline: string | null;
    eventId: number | null;
    artistId: number | null;
    organizerId: number | null;
    availableActions: string[];
  }> {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new Error(`Booking #${bookingId} not found`);

    const meta = (booking.meta as any) ?? {};
    const negotiationMeta = meta.negotiation ?? {};
    const latestProposal = await storage.getLatestBookingProposal(bookingId);
    const event = booking.eventId ? await storage.getEvent(booking.eventId) : null;

    const currentStep = negotiationMeta.currentStep ?? 0;
    const stepState = negotiationMeta.stepState ?? "applied";

    let whoseTurn: string | null = null;
    if (stepState === "awaiting_art") whoseTurn = "artist";
    else if (stepState === "awaiting_org") whoseTurn = "organizer";

    const availableActions: string[] = [];
    if (!["locked", "walked_away", "expired"].includes(stepState)) {
      if (stepState !== "applied" || currentStep > 0) {
        availableActions.push("accept", "walkaway");
        if (currentStep < 3) availableActions.push("edit");
      } else {
        availableActions.push("edit");
      }
    }

    return {
      currentStep,
      stepState,
      whoseTurn,
      latestProposal: latestProposal?.proposedTerms ?? null,
      deadline: negotiationMeta.stepDeadlineAt ?? booking.flowDeadlineAt?.toISOString() ?? null,
      eventId: booking.eventId,
      artistId: booking.artistId,
      organizerId: event?.organizerId ?? null,
      availableActions,
    };
  }
}

export const negotiationService = new NegotiationService();
