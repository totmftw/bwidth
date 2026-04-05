/**
 * Conversation Routes — server/routes/conversations.ts
 *
 * Manages the lifecycle of entity-bound conversations on the platform.
 * Conversations are always tied to a domain entity (e.g. a booking).
 *
 * Key design decisions:
 *   - Conversations are **idempotent**: opening the same entity+type combo
 *     returns the existing conversation rather than creating a duplicate.
 *   - Participant resolution uses `storage.getBookingWithDetails()` to walk
 *     the full booking → event → organizer/venue chain, avoiding N+1 queries.
 *   - Negotiation state is managed by NegotiationService (bookings.meta.negotiation)
 *     and the agentic NegotiationAgent — NOT by the old workflow state machine.
 *   - The /actions endpoint is DEPRECATED and translates old action keys to the
 *     new NegotiationService. New clients should use POST /api/bookings/:id/negotiation/action.
 *   - Messages are stored newest-first in the DB for efficient cursor-based
 *     pagination, then reversed before returning to give chronological order.
 *
 * Routes mounted under `/api` by the parent router in server/routes.ts:
 *   GET  /api/conversations
 *   GET  /api/conversations/:id
 *   GET  /api/conversations/:id/messages
 *   POST /api/entities/:entityType/:entityId/conversation/:conversationType/open
 *   POST /api/conversations/:id/actions  (DEPRECATED — use booking negotiation action)
 *   POST /api/conversations/:id/messages
 */

import { Router } from "express";
import { storage } from "../storage";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import {
    conversations,
    conversationParticipants,
    messages,
} from "@shared/schema";
import { negotiationService } from "../services/negotiation.service";
import { broadcastToRoom } from "../ws-server";
import { NegotiationAgent } from "../services/agents/negotiation.agent";

const router = Router();

// ===================================
// Conversation Management
// ===================================

/**
 * GET /conversations
 *
 * Lists all conversations the authenticated user participates in,
 * ordered by most-recent activity (lastMessageAt DESC).
 *
 * The query inner-joins `conversation_participants` on the current
 * user's ID so only conversations they belong to are returned.
 *
 * @returns {Conversation[]} Array of conversation objects.
 */
router.get("/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    try {
        // Inner-join on participants ensures we only see conversations
        // where the current user has a participant row. The join is
        // unique per conversation (one row per user-conversation pair),
        // so no deduplication is needed.
        const plainConvos = await db.select()
            .from(conversations)
            .innerJoin(
                conversationParticipants,
                eq(conversations.id, conversationParticipants.conversationId),
            )
            .where(eq(conversationParticipants.userId, user.id))
            .orderBy(desc(conversations.lastMessageAt));

        // Extract just the conversation columns (drop the join metadata)
        const formatted = plainConvos.map(({ conversations }) => conversations);

        res.json(formatted);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
});

/**
 * GET /conversations/:id
 *
 * Returns a single conversation with its participant list
 * (each participant includes the related user record).
 * Also includes workflowInstance for backward compatibility (may be null).
 *
 * Access control: only participants may view the conversation (403).
 *
 * @param id - Conversation ID (integer path param).
 * @returns {Conversation & { workflowInstance?, participants[] }}
 */
router.get("/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) return res.status(400).json({ message: "Invalid ID" });

    try {
        // Participation gate — reject non-participants with 403
        const participant = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, user.id)
            )
        });

        if (!participant) return res.status(403).json({ message: "Not a participant" });

        // Eager-load workflow state and participant user profiles
        const convo = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
            with: {
                workflowInstance: true,
                participants: {
                    with: {
                        user: true
                    }
                }
            }
        });

        if (!convo) return res.status(404).json({ message: "Conversation not found" });

        res.json(convo);
    } catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ message: "Failed to fetch conversation" });
    }
});

/**
 * GET /conversations/:id/messages
 *
 * Returns the most recent 50 messages for a conversation in
 * chronological order (oldest → newest).
 *
 * Implementation note: messages are fetched in DESC order (newest first)
 * for efficient LIMIT-based pagination, then `.reverse()`d before
 * returning so the client receives them oldest-first — matching the
 * natural reading order in a chat UI.
 *
 * Access control: 403 for non-participants.
 *
 * @param id    - Conversation ID (integer path param).
 * @param cursor - (query param, reserved) Future cursor for pagination.
 * @returns {Message[]} Array of messages with sender info, chronological order.
 */
router.get("/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const conversationId = parseInt(req.params.id);

    try {
        // Participation gate — only participants may read messages
        const participant = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, (req.user as any).id)
            )
        });
        if (!participant) return res.status(403).json({ message: "Not a participant" });

        // Fetch newest 50 messages (DESC) then reverse for chronological output.
        // Each message includes the sender's user record for display names/avatars.
        const msgs = await db.query.messages.findMany({
            where: eq(messages.conversationId, conversationId),
            orderBy: desc(messages.createdAt),
            limit: 50,
            with: {
                sender: true
            }
        });

        res.json(msgs.reverse()); // Chronological: oldest first
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});


/**
 * POST /entities/:entityType/:entityId/conversation/:conversationType/open
 *
 * Idempotent endpoint that opens (or retrieves) a conversation bound to a
 * domain entity. If a conversation already exists for the given
 * (entityType, entityId, conversationType) triple, it is returned as-is.
 * Otherwise a new conversation is created inside a DB transaction.
 *
 * ## Participant Resolution (booking + negotiation)
 *
 * When `entityType === "booking"` and `conversationType === "negotiation"`,
 * participants are resolved from the full booking chain via
 * `storage.getBookingWithDetails(entityId)`, which returns:
 *
 * ```
 * {
 *   ...booking,
 *   artist:    { id, userId, name, ... } | null,
 *   organizer: { id, userId, name, ... } | null,   // via event.organizerId
 *   venue:     { id, userId, name, ... } | null,    // via event.venueId
 *   event:     { ... } | null,
 * }
 * ```
 *
 * Resolution priority for the "promoter side" participant:
 *   1. `booking.organizer.userId` — the event's organizer (promoter)
 *   2. `booking.venue.userId`     — fallback to the venue manager
 *
 * This handles the common case where a venue manager creates a booking
 * directly (no separate organizer entity).
 *
 * Participant IDs are deduplicated with `new Set()` to prevent constraint
 * violations if the same user appears in multiple roles.
 *
 * ## Negotiation State
 *
 * Negotiation state is managed by NegotiationService in bookings.meta.negotiation.
 * The old workflow instance (conversation_workflow_instances) is no longer created.
 * State tracking uses step-based fields: currentStep, stepState, stepHistory.
 *
 * @param entityType       - Domain entity type (e.g. "booking").
 * @param entityId         - ID of the domain entity (integer).
 * @param conversationType - Conversation mode (e.g. "negotiation").
 * @returns {Conversation} The existing or newly created conversation.
 */
router.post("/entities/:entityType/:entityId/conversation/:conversationType/open", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { entityType, conversationType } = req.params;
    const entityId = parseInt(req.params.entityId);

    try {
        // ---------------------------------------------------------------
        // Step 1: Idempotency check — return existing conversation if one
        // already exists for this (entityType, entityId, conversationType).
        // ---------------------------------------------------------------
        if (entityType === "booking" && conversationType === "negotiation") {
            const convo = await negotiationService.openNegotiation(entityId, user.id);
            return res.json(convo);
        }

        let convo = await db.query.conversations.findFirst({
            where: and(
                eq(conversations.entityType, entityType),
                eq(conversations.entityId, entityId),
                eq(conversations.conversationType, conversationType)
            )
        });

        if (!convo) {
            // -----------------------------------------------------------
            // Step 2: Build participant list and conversation metadata
            // -----------------------------------------------------------
            let participantIds: number[] = [];
            let subject = "Conversation";

            // -----------------------------------------------------------
            // Step 4: Transactional insert — conversation + participants
            // -----------------------------------------------------------
            convo = await db.transaction(async (tx) => {
                // 4a. Create the conversation row
                const [newConvo] = await tx.insert(conversations).values({
                    entityType,
                    entityId,
                    conversationType,
                    subject,
                    status: 'open',
                    lastMessageAt: new Date()
                }).returning();

                // 4b. Insert participant rows
                for (const uid of participantIds) {
                    await tx.insert(conversationParticipants).values({
                        conversationId: newConvo.id,
                        userId: uid
                    });
                }

                return newConvo;
            });
        }

        res.json(convo);
    } catch (error) {
        console.error("Error opening conversation:", error);
        res.status(500).json({ message: "Failed to open conversation" });
    }
});

/**
 * POST /conversations/:id/actions
 *
 * DEPRECATED — This endpoint used the old conversation-workflow state machine.
 * The new agentic negotiation system operates via:
 *   POST /api/bookings/:id/negotiation/action
 *
 * For backward compatibility, this route translates old action keys
 * (PROPOSE_COST, ACCEPT, WALK_AWAY) into the new negotiation service
 * calls. New clients should use the booking-based endpoint directly.
 *
 * @deprecated Use POST /api/bookings/:id/negotiation/action instead.
 */
router.post("/conversations/:id/actions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.setHeader('X-Deprecated', 'Use POST /api/bookings/:id/negotiation/action instead');

    const user = req.user as any;
    const conversationId = parseInt(req.params.id);
    const { actionKey, inputs } = req.body;

    try {
        // Resolve booking ID from the conversation
        const convo = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
        });

        if (!convo || convo.entityType !== "booking" || !convo.entityId) {
            return res.status(400).json({ message: "Conversation is not linked to a booking" });
        }

        const bookingId = convo.entityId;

        // Translate old action keys to new negotiation actions
        const actionMap: Record<string, string> = {
            PROPOSE_COST: "edit",
            PROPOSE_CHANGE: "edit",
            PROPOSE_SLOT: "edit",
            ACCEPT: "accept",
            WALK_AWAY: "walkaway",
            DECLINE: "walkaway",
        };

        const newAction = actionMap[actionKey];
        if (!newAction) {
            return res.status(400).json({ message: `Unknown action: ${actionKey}. Use the new endpoint POST /api/bookings/${bookingId}/negotiation/action` });
        }

        // Build the new-style payload
        const payload: any = { action: newAction };
        if (newAction === "edit" && inputs?.offerAmount) {
            payload.snapshot = {
                financial: {
                    offerAmount: Number(inputs.offerAmount),
                    currency: inputs.currency || "INR",
                },
            };
        }
        if (inputs?.note) payload.note = inputs.note;
        if (inputs?.reason) payload.reason = inputs.reason;

        const summary = await negotiationService.handleNegotiationAction(
            bookingId,
            user.id,
            payload,
        );

        res.json({ success: true, summary, _deprecation: "This endpoint is deprecated. Use POST /api/bookings/:id/negotiation/action" });
    } catch (error: any) {
        console.error("Legacy action error:", error);
        res.status(400).json({ message: error.message || "Action failed" });
    }
});


/**
 * POST /conversations/:id/messages
 *
 * Sends a message in a conversation. For negotiation-type conversations
 * with an active AI agent session, messages are routed through the
 * NegotiationAgent's processMessage() for moderation, rephrasing, and
 * enrichment before being relayed to the other party.
 *
 * Agent-mediated behaviour:
 *   - "relay"    — broadcast the agent-processed version to the room.
 *   - "filter"   — store the message but only notify the sender (not relayed).
 *   - "suggest"  — relay processed message AND insert a separate agent suggestion.
 *   - "acknowledge" / no agent — fall through to direct relay.
 *
 * For non-negotiation conversations or when no active agent session exists,
 * the message is inserted and broadcast directly (original behaviour).
 *
 * @param id - Conversation ID (integer path param).
 * @body  { body: string, clientMsgId?: string }
 *        - body:        The message text content.
 *        - clientMsgId: Optional client-generated dedup ID.
 * @returns {Message} The newly created message.
 */
router.post("/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = parseInt(req.params.id);
    const { body, clientMsgId } = req.body;

    try {
        // Check if this is a negotiation conversation with an active agent
        const convo = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
        });

        let processedBody: string | null = null;
        let agentFilterAction: string | null = null;
        let agentFilterReason: string | null = null;

        if (convo?.conversationType === "negotiation" && convo.entityType === "booking" && convo.entityId) {
            const activeSession = await storage.getActiveAgentSession(user.id, "negotiation", convo.entityId);
            if (activeSession) {
                try {
                    // Determine sender role from booking participant data
                    const bookingDetails = await storage.getBookingWithDetails(convo.entityId);
                    const senderRole = bookingDetails?.artist?.userId === user.id ? "artist" : "organizer";

                    const agent = new NegotiationAgent();
                    const result = await agent.processMessage({
                        sessionId: activeSession.id,
                        userId: user.id,
                        bookingId: convo.entityId,
                        rawMessage: body,
                        senderRole: senderRole as "artist" | "organizer",
                    });

                    processedBody = result.processedContent;
                    agentFilterAction = result.action;
                    agentFilterReason = result.filterReason || null;
                } catch (agentErr) {
                    console.error("Agent message processing failed, falling through:", agentErr);
                    // Fall through to direct relay on agent failure
                }
            }
        }

        // Insert the message with both raw and agent-processed content
        const [msg] = await db.insert(messages).values({
            conversationId,
            senderId: user.id,
            body,
            processedBody,
            agentFilterAction,
            agentFilterReason,
            messageType: agentFilterAction ? "agent_relay" : "text",
            clientMsgId,
        }).returning();

        // Bump the conversation's lastMessageAt for sort ordering
        await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

        if (agentFilterAction === "filter") {
            // Don't broadcast filtered messages to room, only notify sender
            broadcastToRoom(conversationId, {
                type: "message",
                data: msg,
                targetUserId: user.id,
            });
            // Agent tells sender why message was filtered
            const filterNotice = agentFilterReason
                || "Your message was filtered as it contained content outside the scope of this negotiation. Please revise and resend.";
            const [filterMsg] = await db.insert(messages).values({
                conversationId,
                senderId: null,
                body: filterNotice,
                processedBody: filterNotice,
                messageType: "agent_response",
                isAgentGenerated: true,
                agentFilterAction: "filter",
                agentFilterReason,
            }).returning();
            broadcastToRoom(conversationId, { type: "agent_message", data: filterMsg });

        } else if (agentFilterAction === "respond") {
            // Agent responds directly to user — don't relay to other party
            broadcastToRoom(conversationId, {
                type: "message",
                data: msg,
                targetUserId: user.id,
            });
            // Insert agent's direct response
            if (processedBody) {
                const [agentReply] = await db.insert(messages).values({
                    conversationId,
                    senderId: null,
                    body: processedBody,
                    processedBody,
                    messageType: "agent_response",
                    isAgentGenerated: true,
                    agentFilterAction: "respond",
                }).returning();
                broadcastToRoom(conversationId, { type: "agent_message", data: agentReply });
            }

        } else if (agentFilterAction === "relay" || agentFilterAction === "suggest") {
            // Relay the processed message to all parties
            const broadcastMsg = processedBody ? { ...msg, displayBody: processedBody } : msg;
            broadcastToRoom(conversationId, { type: "message", data: broadcastMsg });

            // Agent confirms to the sender what was communicated
            const confirmBody = processedBody
                ? `Your message has been reviewed and relayed to the other party:\n\n"${processedBody}"`
                : "Your message has been reviewed and relayed to the other party.";
            const [confirmMsg] = await db.insert(messages).values({
                conversationId,
                senderId: null,
                body: confirmBody,
                processedBody: confirmBody,
                messageType: "agent_response",
                isAgentGenerated: true,
                agentFilterAction: "relay",
            }).returning();
            broadcastToRoom(conversationId, { type: "agent_message", data: confirmMsg });

            // If "suggest", also insert a separate suggestion message
            if (agentFilterAction === "suggest" && processedBody) {
                const [suggestMsg] = await db.insert(messages).values({
                    conversationId,
                    senderId: null,
                    body: "Based on market data and this negotiation's context, here is a suggestion:",
                    processedBody,
                    messageType: "agent_suggestion",
                    isAgentGenerated: true,
                }).returning();
                broadcastToRoom(conversationId, { type: "agent_message", data: suggestMsg });
            }

        } else {
            // No agent action (agent not active or processing failed) — direct relay
            broadcastToRoom(conversationId, { type: "message", data: msg });
        }

        res.json(msg);
    } catch (error) {
        console.error("Message error:", error);
        res.status(500).json({ message: "Failed to send message" });
    }
});

/**
 * PUT /conversations/:id/messages/:messageId/feedback
 *
 * Per-message thumbs up/down feedback for reinforcement learning.
 * Only works on agent-generated or agent-relayed messages.
 */
router.put("/conversations/:id/messages/:messageId/feedback", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const messageId = parseInt(req.params.messageId);
    const { rating } = req.body;

    if (!rating || !["positive", "negative"].includes(rating)) {
        return res.status(400).json({ message: "rating must be 'positive' or 'negative'" });
    }

    try {
        const msg = await db.query.messages.findFirst({
            where: eq(messages.id, messageId),
        });

        if (!msg) return res.status(404).json({ message: "Message not found" });

        // Only allow feedback on agent-processed messages
        if (!msg.isAgentGenerated && !msg.agentFilterAction) {
            return res.status(400).json({ message: "Feedback only available on agent-processed messages" });
        }

        // Prevent double-voting
        if (msg.feedbackRating) {
            return res.status(400).json({ message: "Already rated this message" });
        }

        const [updated] = await db.update(messages)
            .set({
                feedbackRating: rating,
                feedbackAt: new Date(),
                feedbackUserId: user.id,
            })
            .where(eq(messages.id, messageId))
            .returning();

        res.json({ success: true, rating: updated.feedbackRating });
    } catch (error) {
        console.error("Message feedback error:", error);
        res.status(500).json({ message: "Failed to save feedback" });
    }
});

export default router;
