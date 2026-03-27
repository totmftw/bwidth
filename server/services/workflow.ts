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

/**
 * WorkflowEngine — orchestrates the booking negotiation state machine.
 *
 * Negotiation Rules:
 *   - Cost: Each party gets 2 counter-offers. After both exhaust theirs → cost auto-locks.
 *   - Slot: Each party gets 1 slot change. After both exhaust theirs → slot auto-locks.
 *   - Either party can ACCEPT at any time to finalize the deal.
 *   - Either party can WALK_AWAY at any time to cancel the booking.
 *   - After acceptance, booking moves to "contracting" status.
 *
 * Context JSONB stored in conversation_workflow_instances:
 * {
 *   originalOffer: { amount, currency },
 *   currentSlot: string,
 *   costRoundsOrganizer: 0,   // max 2
 *   costRoundsArtist: 0,      // max 2
 *   slotRoundsOrganizer: 0,   // max 1
 *   slotRoundsArtist: 0,      // max 1
 *   costLocked: false,
 *   slotLocked: false,
 *   initiatedBy: "organizer" | "artist",
 *   artistUserId: number,
 *   organizerUserId: number,
 *   artistName: string,
 *   organizerName: string
 * }
 */

class WorkflowEngine {
    /**
     * Open or retrieve an existing negotiation conversation for a booking.
     * Sets the initial turn based on who initiated:
     *   - organizer booked artist → artist responds first
     *   - artist applied for gig → organizer responds first
     */
    async openNegotiation(bookingId: number, initiatorId: number) {
        const booking = await storage.getBooking(bookingId);
        if (!booking) throw new Error("Booking not found");

        // Check if conversation exists (idempotent)
        let convo = await db.query.conversations.findFirst({
            where: and(
                eq(conversations.entityType, 'booking'),
                eq(conversations.entityId, bookingId),
                eq(conversations.conversationType, 'negotiation')
            )
        });

        if (convo) return convo;

        // Resolve participants
        if (!booking.artistId) throw new Error("Artist ID missing from booking");
        const artist = await storage.getArtist(booking.artistId);
        if (!artist || !artist.userId) throw new Error("Artist user not found");

        const event = booking.eventId ? await storage.getEvent(booking.eventId) : null;
        let organizerUserId: number | null = null;
        let organizerName = "Organizer";
        if (event && event.organizerId) {
            const promoter = await storage.getPromoter(event.organizerId);
            if (promoter) {
                organizerUserId = promoter.userId!;
                organizerName = promoter.name || "Organizer";
            }
        }

        if (!organizerUserId) {
            throw new Error("Organizer user not found for negotiation");
        }

        // Determine who initiated the booking
        const isOrganizerInitiator = initiatorId === organizerUserId;
        const initiatedBy = isOrganizerInitiator ? "organizer" : "artist";

        // If organizer initiated with an offer, they have nominally done round 1.
        // But the requirement states: "organizer always goes first".
        // To enforce this systematically:
        // If Organizer initiated, they made the first offer -> Turn is Artist's.
        // If Artist initiated (applied), they just requested -> Turn is Organizer's explicitly.
        // We will track independent turns for cost and slot.
        const startCostUserId = isOrganizerInitiator ? artist.userId! : organizerUserId;
        const startSlotUserId = isOrganizerInitiator ? artist.userId! : organizerUserId;
        
        const initialCostRoundsOrg = isOrganizerInitiator ? 1 : 0;
        const initialSlotRoundsOrg = isOrganizerInitiator ? 1 : 0;

        // Resolve the slot time from booking meta or event
        const bookingMeta = (booking.meta as any) || {};
        const initialSlot = bookingMeta.slotTime ||
            (event?.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "TBD");

        // Get user display names — artist shows stage name (given name)
        const artistUser = await db.query.users.findFirst({ where: eq(users.id, artist.userId!) });
        const organizerUser = await db.query.users.findFirst({ where: eq(users.id, organizerUserId) });

        const stageName = artist.name || "";
        const givenName = [artistUser?.firstName, artistUser?.lastName].filter(Boolean).join(" ") || artistUser?.displayName || "";
        // e.g. "DJ Spark (Rahul Sharma)" or just "Rahul Sharma" if no stage name
        const artistName = stageName && givenName && stageName !== givenName
            ? `${stageName} (${givenName})`
            : stageName || givenName || "Artist";

        // Organizer: prefer promoter.name, fall back to user profile
        if (organizerName === "Organizer" && organizerUser) {
            organizerName = organizerUser.displayName
                || [organizerUser.firstName, organizerUser.lastName].filter(Boolean).join(" ")
                || "Organizer";
        }

        return await db.transaction(async (tx) => {
            // Create Conversation
            const [newConvo] = await tx.insert(conversations).values({
                entityType: 'booking',
                entityId: bookingId,
                conversationType: 'negotiation',
                subject: `Negotiation: ${artistName} @ ${event?.title || 'Event'}`,
                status: 'open',
                lastMessageAt: new Date()
            }).returning();

            // Add Participants (deduplicate if initiator is already artist or organizer)
            const participantIds = Array.from(new Set([initiatorId, artist.userId!, organizerUserId]));
            await tx.insert(conversationParticipants).values(
                participantIds.map(uid => ({ conversationId: newConvo.id, userId: uid }))
            ).onConflictDoNothing();

            // Create Workflow Instance
            await tx.insert(conversationWorkflowInstances).values({
                conversationId: newConvo.id,
                workflowKey: 'negotiation-v2',
                currentNodeKey: 'NEGOTIATING',
                context: {
                    originalOffer: {
                        amount: booking.offerAmount,
                        currency: booking.offerCurrency
                    },
                    currentSlot: initialSlot,
                    costRoundsOrganizer: initialCostRoundsOrg,
                    costRoundsArtist: 0,
                    slotRoundsOrganizer: initialSlotRoundsOrg,
                    slotRoundsArtist: 0,
                    costLocked: false,
                    slotLocked: false,
                    costAwaitingUserId: startCostUserId,
                    slotAwaitingUserId: startSlotUserId,
                    initiatedBy,
                    artistUserId: artist.userId!,
                    organizerUserId,
                    artistName,
                    organizerName
                },
                awaitingUserId: null, // Removed in favor of costAwaitingUserId and slotAwaitingUserId
                round: 0,
                maxRounds: 4  // Total max cost rounds (2 per party)
            }).returning();

            // System Message: negotiation started
            await tx.insert(messages).values({
                conversationId: newConvo.id,
                senderId: null,
                messageType: 'system',
                body: `Negotiation started. Initial offer: ${booking.offerCurrency} ${Number(booking.offerAmount).toLocaleString('en-IN')} | Slot: ${initialSlot}`,
                workflowNodeKey: 'START',
                payload: {}
            });

            // Update booking status to negotiating
            await tx.update(bookings)
                .set({ status: 'negotiating' })
                .where(eq(bookings.id, bookingId));

            return newConvo;
        });
    }

    /**
     * Handle a workflow action (PROPOSE_COST, PROPOSE_SLOT, ACCEPT, WALK_AWAY).
     */
    async handleAction(conversationId: number, userId: number, actionKey: string, payload: any, clientMsgId: string) {
        const result = await db.transaction(async (tx) => {
            // 1. Fetch workflow instance
            const wfInstance = await tx.query.conversationWorkflowInstances.findFirst({
                where: eq(conversationWorkflowInstances.conversationId, conversationId)
            });

            if (!wfInstance) throw new Error("Workflow instance not found");
            if (wfInstance.locked) throw new Error("Negotiation is locked (already finalized)");

            const ctx = (wfInstance.context as any) || {};

            // 2. Turn validation moved into specific actions
            const validActions = ['PROPOSE_COST', 'PROPOSE_SLOT', 'PROPOSE_RIDER', 'ACCEPT', 'WALK_AWAY', 'DECLINE',
                // Keep legacy support
                'PROPOSE_CHANGE'];
            if (!validActions.includes(actionKey)) throw new Error("Invalid action: " + actionKey);

            // Map legacy action
            if (actionKey === 'PROPOSE_CHANGE') actionKey = 'PROPOSE_COST';
            if (actionKey === 'DECLINE') actionKey = 'WALK_AWAY';

            // Determine the actor's role
            const isArtist = userId === ctx.artistUserId;
            const isOrganizer = userId === ctx.organizerUserId;
            const actorRole = isArtist ? "artist" : "organizer";
            const actorName = isArtist ? ctx.artistName : ctx.organizerName;

            // Find other party
            const participants = await tx.query.conversationParticipants.findMany({
                where: eq(conversationParticipants.conversationId, conversationId)
            });
            const otherParticipants = participants.filter(p => p.userId !== userId);
            if (!otherParticipants.length) throw new Error("Other participant not found");
            const otherUserId = otherParticipants[0].userId;

            let nextNodeKey = wfInstance.currentNodeKey;
            let systemMessages: string[] = [];
            let updatedContext = { ...ctx };

            // Get conversation for booking updates
            const convo = await tx.query.conversations.findFirst({
                where: eq(conversations.id, conversationId)
            });
            const bookingId = convo?.entityId;

            // ── PROPOSE_COST ──
            if (actionKey === 'PROPOSE_COST') {
                if (ctx.costLocked) {
                    throw new Error("Cost is already locked. You cannot make further cost proposals.");
                }
                if (ctx.costAwaitingUserId !== userId) {
                    throw new Error("Not your turn to negotiate cost.");
                }

                const costKey = isArtist ? 'costRoundsArtist' : 'costRoundsOrganizer';
                const currentRounds = ctx[costKey] || 0;
                if (currentRounds >= 2) {
                    throw new Error(`You have used all 2 cost negotiation rounds.`);
                }

                // Validate payload
                if (!payload?.offerAmount || Number(payload.offerAmount) <= 0) {
                    throw new Error("Please provide a valid offer amount.");
                }

                // Create proposal
                if (bookingId) {
                    await tx.insert(bookingProposals).values({
                        bookingId,
                        createdBy: userId,
                        round: wfInstance.round + 1,
                        proposedTerms: { offerAmount: payload.offerAmount, type: 'cost' },
                        note: payload.note || null,
                        status: 'active'
                    });

                    // Update live booking offer
                    await tx.update(bookings)
                        .set({ offerAmount: String(payload.offerAmount), status: 'negotiating' })
                        .where(eq(bookings.id, bookingId));
                }

                // Update context
                updatedContext[costKey] = currentRounds + 1;
                updatedContext.costAwaitingUserId = otherUserId;

                // Check if cost should auto-lock
                const otherCostKey = isArtist ? 'costRoundsOrganizer' : 'costRoundsArtist';
                if (updatedContext[costKey] >= 2 && updatedContext[otherCostKey] >= 2) {
                    updatedContext.costLocked = true;
                    systemMessages.push(`💰 Cost locked at ₹${Number(payload.offerAmount).toLocaleString('en-IN')}. No further cost changes allowed.`);
                }

                nextNodeKey = 'NEGOTIATING';
            }

            // ── PROPOSE_SLOT ──
            else if (actionKey === 'PROPOSE_SLOT') {
                if (ctx.slotLocked) {
                    throw new Error("Time slot is already locked. You cannot propose further slot changes.");
                }
                if (ctx.slotAwaitingUserId !== userId) {
                    throw new Error("Not your turn to negotiate slot.");
                }

                const slotKey = isArtist ? 'slotRoundsArtist' : 'slotRoundsOrganizer';
                const currentSlotRounds = ctx[slotKey] || 0;
                if (currentSlotRounds >= 1) {
                    throw new Error(`You have used your slot change.`);
                }

                if (!payload?.slotTime) {
                    throw new Error("Please provide a time slot.");
                }

                // Create proposal
                if (bookingId) {
                    await tx.insert(bookingProposals).values({
                        bookingId,
                        createdBy: userId,
                        round: wfInstance.round + 1,
                        proposedTerms: { slotTime: payload.slotTime, type: 'slot' },
                        note: payload.note || null,
                        status: 'active'
                    });
                }

                // Update context
                updatedContext[slotKey] = currentSlotRounds + 1;
                updatedContext.currentSlot = payload.slotTime;
                updatedContext.slotAwaitingUserId = otherUserId;

                // Check if slot should auto-lock
                const otherSlotKey = isArtist ? 'slotRoundsOrganizer' : 'slotRoundsArtist';
                if (updatedContext[slotKey] >= 1 && updatedContext[otherSlotKey] >= 1) {
                    updatedContext.slotLocked = true;
                    systemMessages.push(`🕐 Time slot locked at ${payload.slotTime}. No further slot changes allowed.`);
                }

                nextNodeKey = 'NEGOTIATING';
            }

            // ── PROPOSE_RIDER ──
            else if (actionKey === 'PROPOSE_RIDER') {
                if (ctx.riderLocked) {
                    throw new Error("Tech rider is already locked.");
                }

                // Create proposal
                if (bookingId) {
                    await tx.insert(bookingProposals).values({
                        bookingId,
                        createdBy: userId,
                        round: wfInstance.round + 1,
                        proposedTerms: { 
                            type: 'rider',
                            providedEquipment: payload.providedEquipment || [],
                            requestedEquipment: payload.requestedEquipment || []
                        },
                        note: payload.note || null,
                        status: 'active'
                    });
                }

                // Update context
                updatedContext.currentRider = {
                    providedEquipment: payload.providedEquipment || ctx.currentRider?.providedEquipment || [],
                    requestedEquipment: payload.requestedEquipment || ctx.currentRider?.requestedEquipment || []
                };

                nextNodeKey = 'NEGOTIATING';
            }

            // ── ACCEPT ──
            else if (actionKey === 'ACCEPT') {
                nextNodeKey = 'ACCEPTED';

                if (bookingId) {
                    // Read the latest booking to get the current (last-agreed) offer amount
                    const currentBooking = await tx.query.bookings.findFirst({
                        where: eq(bookings.id, bookingId)
                    });
                    const lastAgreedAmount = currentBooking?.offerAmount || null;
                    const lastAgreedSlot = updatedContext.currentSlot || null;
                    const lastAgreedRider = updatedContext.currentRider || null;

                    // Store final agreed amount + slot into the booking
                    const existingMeta = (currentBooking?.meta as any) || {};
                    await tx.update(bookings)
                        .set({
                            status: 'contracting',
                            finalAmount: lastAgreedAmount,
                            meta: {
                                ...existingMeta,
                                finalSlot: lastAgreedSlot,
                                techRider: lastAgreedRider,
                                agreedAt: new Date().toISOString(),
                                terms: payload?.terms || {},
                            }
                        })
                        .where(eq(bookings.id, bookingId));
                }

                // Lock both if not already
                updatedContext.costLocked = true;
                updatedContext.slotLocked = true;

                systemMessages.push(`🎉 Deal agreed! Both parties accepted the terms.`);
            }

            // ── WALK_AWAY ──
            else if (actionKey === 'WALK_AWAY') {
                nextNodeKey = 'DECLINED';

                if (bookingId) {
                    await tx.update(bookings)
                        .set({ status: 'cancelled' })
                        .where(eq(bookings.id, bookingId));
                }

                systemMessages.push(`${actorName} walked away from the deal.`);
            }

            // Check if both cost and slot are now locked → suggest finalization
            if (!['ACCEPTED', 'DECLINED'].includes(nextNodeKey) &&
                updatedContext.costLocked && updatedContext.slotLocked) {
                systemMessages.push(`✅ All terms locked. Either party can now Accept the deal or Walk Away.`);
            }

            // 4. Update Workflow Instance
            const isTerminal = ['ACCEPTED', 'DECLINED'].includes(nextNodeKey);
            const isProposal = ['PROPOSE_COST', 'PROPOSE_SLOT'].includes(actionKey);
            await tx.update(conversationWorkflowInstances)
                .set({
                    currentNodeKey: nextNodeKey,
                    awaitingUserId: null,
                    round: isProposal ? wfInstance.round + 1 : wfInstance.round,
                    locked: isTerminal,
                    context: updatedContext,
                    updatedAt: new Date(),
                    deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                })
                .where(eq(conversationWorkflowInstances.conversationId, conversationId));

            // 5. Insert action message with sender name
            const [msg] = await tx.insert(messages).values({
                conversationId,
                senderId: userId,
                messageType: 'action',
                actionKey,
                body: payload?.note || null,
                payload: {
                    ...payload,
                    senderName: actorName,
                    senderRole: actorRole,
                },
                workflowNodeKey: wfInstance.currentNodeKey,
                round: wfInstance.round,
                clientMsgId
            }).returning();

            // 6. Insert system messages
            for (const sysBody of systemMessages) {
                await tx.insert(messages).values({
                    conversationId,
                    senderId: null,
                    messageType: 'system',
                    body: sysBody,
                    workflowNodeKey: nextNodeKey,
                    payload: {}
                });
            }

            // Update conversation lastMessageAt
            await tx.update(conversations)
                .set({ lastMessageAt: new Date() })
                .where(eq(conversations.id, conversationId));

            return { msg, bookingId, nextNodeKey }; // return bookingId and nextNodeKey
        });

        // Outside transaction: snapshot booking math if accepted
        if (result.nextNodeKey === 'ACCEPTED' && result.bookingId) {
            const { bookingService } = await import("./booking.service");
            await bookingService.confirmBookingAndSnapshot(result.bookingId);
        }

        return result.msg;
    }
}

export const workflow = new WorkflowEngine();
