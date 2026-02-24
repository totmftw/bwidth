import { db } from "../db";
import {
    conversations,
    conversationParticipants,
    messages,
    conversationWorkflowInstances,
    bookingProposals,
    users,
    bookings
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { storage } from "../storage";

class WorkflowEngine {
    // Initialize a negotiation
    async openNegotiation(bookingId: number, initiatorId: number) {
        const booking = await storage.getBooking(bookingId);
        if (!booking) throw new Error("Booking not found");

        // Check if conversation exists
        let convo = await db.query.conversations.findFirst({
            where: and(
                eq(conversations.entityType, 'booking'),
                eq(conversations.entityId, bookingId),
                eq(conversations.conversationType, 'negotiation')
            )
        });

        if (convo) return convo;

        // Create new
        if (!booking.artistId) throw new Error("Artist ID missing from booking");
        const artist = await storage.getArtist(booking.artistId);
        // Find artist user ID.
        // Assuming artist.userId is present. If not, error.
        if (!artist || !artist.userId) throw new Error("Artist user not found");

        // Find organizer user ID.
        const event = booking.eventId ? await storage.getEvent(booking.eventId) : null;
        let organizerId: number | null = null;
        if (event && event.organizerId) {
            const promoter = await storage.getPromoter(event.organizerId); // promoter is organizer
            if (promoter) organizerId = promoter.userId!;
        }

        // Fallback or explicit check
        if (!organizerId) {
            // Maybe throw error or proceed if allowing null (system user)
            // For negotiation, we need two parties.
            throw new Error("Organizer user not found for negotiation");
        }

        const subject = `Negotiation: ${artist.name}`;

        return await db.transaction(async (tx) => {
            // Create Conversation
            const [newConvo] = await tx.insert(conversations).values({
                entityType: 'booking',
                entityId: bookingId,
                conversationType: 'negotiation',
                subject: `Negotiation: ${artist.name} @ ${event?.title || 'Event'}`,
                status: 'open',
                lastMessageAt: new Date()
            }).returning();

            // Add Participants
            await tx.insert(conversationParticipants).values([
                { conversationId: newConvo.id, userId: initiatorId },
                { conversationId: newConvo.id, userId: artist.userId! },
                { conversationId: newConvo.id, userId: organizerId! }
            ]).onConflictDoNothing();

            // Create Workflow Instance
            const [instance] = await tx.insert(conversationWorkflowInstances).values({
                conversationId: newConvo.id,
                workflowKey: 'negotiation-v1', // Hardcoded for now
                currentNodeKey: 'NEGOTIATING',
                context: {
                    originalOffer: {
                        amount: booking.offerAmount,
                        currency: booking.offerCurrency
                    },
                    currentProposal: null,
                    rounds: 0
                },
                awaitingUserId: artist.userId // Artist to act
            }).returning();

            // System Message: "Negotiation started. Current offer: ..."
            await tx.insert(messages).values({
                conversationId: newConvo.id,
                senderId: null, // System
                messageType: 'system',
                body: `Negotiation started. Offer: ${booking.offerCurrency} ${booking.offerAmount}`,
                workflowNodeKey: 'START',
                payload: { action: 'start', offer: (instance.context as any).originalOffer }
            });

            return newConvo;
        });
    }

    // Handle an action
    async handleAction(conversationId: number, userId: number, actionKey: string, payload: any, clientMsgId: string) {
        return await db.transaction(async (tx) => {
            // 1. Lock and fetch instance
            // "For Update" isn't directly supported by drizzle query builder easily in a standard way across drivers without raw SQL.
            // We will just query normally and rely on logic validation.
            const wfInstance = await tx.query.conversationWorkflowInstances.findFirst({
                where: eq(conversationWorkflowInstances.conversationId, conversationId)
            });

            if (!wfInstance) throw new Error("Workflow instance not found");
            if (wfInstance.locked) throw new Error("Workflow is locked");

            // 2. Validate Turn
            // Wait, awaitingUserId might be null if finalized?
            if (wfInstance.awaitingUserId !== userId) {
                throw new Error(`Not your turn. Awaiting user ${wfInstance.awaitingUserId}`);
            }

            // 3. Validate Action based on State (currentNodeKey)
            // Simple state machine switch
            // Allowed: ACCEPT, DECLINE, PROPOSE_CHANGE, ASK_PRESET_QUESTION
            const validActions = ['ACCEPT', 'DECLINE', 'PROPOSE_CHANGE', 'ASK_PRESET_QUESTION'];
            if (!validActions.includes(actionKey)) throw new Error("Invalid action");

            // Logic per action
            let nextNodeKey = wfInstance.currentNodeKey; // Default stay same
            let nextAwaitingUserId: number | null = wfInstance.awaitingUserId; // Default same
            let isProposal = false;
            let bookingUpdate = null;
            let newProposalId = null;

            // Current awaiting user role?
            // We need to swap to the OTHER participant.
            const participants = await tx.query.conversationParticipants.findMany({
                where: eq(conversationParticipants.conversationId, conversationId)
            });
            const otherParticipant = participants.find(p => p.userId !== userId);
            if (!otherParticipant) throw new Error("Other participant not found");

            if (actionKey === 'PROPOSE_CHANGE') {
                const maxRounds = wfInstance.maxRounds ?? 3;
                if (wfInstance.round >= maxRounds) {
                    throw new Error("Max rounds reached. Must Accept or Decline.");
                }

                // Validate payload (Fee +/- 20% etc)
                // Implementation skipped for brevity, handled by frontend/basic check.

                nextNodeKey = (wfInstance.currentNodeKey === 'AWAITING_ARTIST') ? 'AWAITING_ORGANIZER' : 'AWAITING_ARTIST';
                nextAwaitingUserId = otherParticipant.userId;

                // Create Proposal
                const [proposal] = await tx.insert(bookingProposals).values({
                    bookingId: (await tx.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }))!.entityId!,
                    createdBy: userId,
                    round: wfInstance.round + 1,
                    proposedTerms: payload, // { offerAmount, ... }
                    status: 'active'
                }).returning();
                newProposalId = proposal.id;
                isProposal = true;

                // Update Booking (live fields) ?
                // User says "Update booking's live fields... so other parts of app read current terms"
                // We'll update offerAmount if changed.
                if (payload.offerAmount) {
                    // Determine booking ID from conversation
                    const convo = await tx.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
                    if (convo && convo.entityType === 'booking') {
                        await tx.update(bookings)
                            .set({ offerAmount: String(payload.offerAmount), status: 'negotiating' })
                            .where(eq(bookings.id, convo.entityId!));
                    }
                }

            } else if (actionKey === 'ACCEPT') {
                nextNodeKey = 'ACCEPTED';
                nextAwaitingUserId = null; // No one awaiting
                // Update Booking status to confirmed
                const convo = await tx.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
                if (convo && convo.entityType === 'booking') {
                    await tx.update(bookings)
                        .set({ status: 'contracting' })
                        .where(eq(bookings.id, convo.entityId!));
                }

            } else if (actionKey === 'DECLINE') {
                nextNodeKey = 'DECLINED';
                nextAwaitingUserId = null;
                const convo = await tx.query.conversations.findFirst({ where: eq(conversations.id, conversationId) });
                if (convo && convo.entityType === 'booking') {
                    await tx.update(bookings)
                        .set({ status: 'cancelled' })
                        .where(eq(bookings.id, convo.entityId!));
                }
            }
            // ASK_PRESET_QUESTION -> specific logic (swap turn if required response, else stay)

            // 4. Update Workflow Instance
            const isTerminal = ['ACCEPTED', 'DECLINED'].includes(nextNodeKey);
            await tx.update(conversationWorkflowInstances)
                .set({
                    currentNodeKey: nextNodeKey,
                    awaitingUserId: nextAwaitingUserId,
                    round: (isProposal) ? wfInstance.round + 1 : wfInstance.round,
                    locked: isTerminal ? true : wfInstance.locked,
                    updatedAt: new Date(),
                    deadlineAt: (nextAwaitingUserId) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
                })
                .where(eq(conversationWorkflowInstances.conversationId, conversationId));

            // 5. Insert Message
            const [msg] = await tx.insert(messages).values({
                conversationId,
                senderId: userId,
                messageType: 'action', // Typed event
                actionKey,
                payload: { ...payload, proposalId: newProposalId },
                workflowNodeKey: wfInstance.currentNodeKey, // The state *before* action? or after? User says "current node key", usually the state in which action was taken.
                round: wfInstance.round,
                clientMsgId
            }).returning();

            // System message if state changed significantly (Accepted/Declined) ?
            if (['ACCEPTED', 'DECLINED'].includes(nextNodeKey)) {
                await tx.insert(messages).values({
                    conversationId,
                    senderId: null,
                    messageType: 'system',
                    body: `Negotiation ${nextNodeKey.toLowerCase()}.`,
                    workflowNodeKey: nextNodeKey
                });
            }

            return msg;
        });
    }
}

export const workflow = new WorkflowEngine();
