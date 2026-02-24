/**
 * Conversation Routes — server/routes/conversations.ts
 *
 * Manages the lifecycle of entity-bound conversations on the platform.
 * Conversations are always tied to a domain entity (e.g. a booking) and
 * optionally carry a workflow state machine (e.g. negotiation flowchart).
 *
 * Key design decisions:
 *   - Conversations are **idempotent**: opening the same entity+type combo
 *     returns the existing conversation rather than creating a duplicate.
 *   - Participant resolution uses `storage.getBookingWithDetails()` to walk
 *     the full booking → event → organizer/venue chain, avoiding N+1 queries.
 *   - Negotiation conversations are **action-only** — free-text messages are
 *     rejected with 400. All state transitions go through the workflow service.
 *   - Messages are stored newest-first in the DB for efficient cursor-based
 *     pagination, then reversed before returning to give chronological order.
 *
 * Routes mounted under `/api` by the parent router in server/routes.ts:
 *   GET  /api/conversations
 *   GET  /api/conversations/:id
 *   GET  /api/conversations/:id/messages
 *   POST /api/entities/:entityType/:entityId/conversation/:conversationType/open
 *   POST /api/conversations/:id/actions
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
    conversationWorkflowInstances,
} from "@shared/schema";
import { workflow } from "../services/workflow";

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
 * Returns a single conversation with its workflow instance and
 * participant list (each participant includes the related user record).
 *
 * Access control: only participants may view the conversation (403).
 *
 * @param id - Conversation ID (integer path param).
 * @returns {Conversation & { workflowInstance, participants[] }}
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
 * ## Workflow Initialization
 *
 * Negotiation conversations get a workflow instance with:
 *   - `currentNodeKey`: "WAITING_FIRST_MOVE" (initial state)
 *   - `round`: 0 (no rounds completed yet)
 *   - `maxRounds`: 3 (platform limit for negotiation rounds)
 *   - `locked`: false
 *   - `awaitingUserId`: the artist's userId (artist acts first)
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

            // Track the artist's userId separately — needed later to set
            // `awaitingUserId` on the workflow instance (artist moves first).
            let artistUserId: number | null = null;

            if (entityType === "booking" && conversationType === "negotiation") {
                // Fetch the full booking chain in one call:
                //   booking → event → organizer (promoter) + venue + artist
                // This avoids multiple sequential storage calls (N+1).
                const booking = await storage.getBookingWithDetails(entityId);
                if (!booking) return res.status(404).json({ message: "Booking not found" });

                // A negotiation requires an artist on the booking
                if (!booking.artistId) return res.status(400).json({ message: "Booking has no artist" });

                // --- Resolve artist participant ---
                // The artist profile's userId links to the users table.
                if (booking.artist?.userId) {
                    participantIds.push(booking.artist.userId);
                    artistUserId = booking.artist.userId;
                }

                // --- Resolve promoter-side participant ---
                // Priority: organizer (via event) → venue manager (fallback).
                // This covers two booking flows:
                //   a) Organizer creates event + booking → organizer is the counterparty
                //   b) Venue manager books directly → no organizer, venue is counterparty
                if (booking.organizer?.userId) {
                    participantIds.push(booking.organizer.userId);
                } else if (booking.venue?.userId) {
                    participantIds.push(booking.venue.userId);
                }

                // Deduplicate: a single user could theoretically be both
                // the artist and the organizer (e.g. self-booking in dev/test).
                participantIds = Array.from(new Set(participantIds));

                subject = `Negotiation: ${booking.artist?.name || 'Artist'}`;
            }

            // -----------------------------------------------------------
            // Step 3: Prepare workflow state (negotiation only)
            // -----------------------------------------------------------
            // Non-negotiation conversations get no workflow instance (null).
            const initialWorkflowState = (conversationType === 'negotiation') ? {
                workflowKey: 'booking_negotiation_v1',
                currentNodeKey: 'WAITING_FIRST_MOVE',  // Initial state node
                round: 0,                               // No rounds completed
                maxRounds: 3,                            // Platform-enforced limit
                locked: false,                           // Workflow is active
                context: {}                              // Extensible context bag
            } : null;

            // -----------------------------------------------------------
            // Step 4: Transactional insert — conversation + participants
            //         + workflow instance in a single atomic operation.
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

                // 4b. Insert participant rows (already deduplicated above)
                for (const uid of participantIds) {
                    await tx.insert(conversationParticipants).values({
                        conversationId: newConvo.id,
                        userId: uid
                    });
                }

                // 4c. Insert workflow instance for negotiation conversations.
                //     `awaitingUserId` is set to the artist — the artist is
                //     expected to make the first move (accept / counter / decline).
                if (initialWorkflowState) {
                    await tx.insert(conversationWorkflowInstances).values({
                        conversationId: newConvo.id,
                        ...initialWorkflowState,
                        awaitingUserId: artistUserId,
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
 * Workflow action gate — dispatches a named action (e.g. ACCEPT, DECLINE,
 * PROPOSE_CHANGE) to the workflow service for the given conversation.
 *
 * The workflow service (`server/services/workflow.ts`) handles:
 *   - Turn-taking enforcement (is it this user's turn?)
 *   - Round counting and max-round limits
 *   - State transitions and booking status updates
 *   - Persisting an action message in the conversation
 *
 * @param id - Conversation ID (integer path param).
 * @body  { clientMsgId?: string, actionKey: string, inputs?: object }
 *        - clientMsgId: Optional client-generated dedup ID.
 *        - actionKey:   The workflow action name (e.g. "ACCEPT").
 *        - inputs:      Action-specific payload (e.g. { offerAmount: 5000 }).
 * @returns {Message} The action message created by the workflow service.
 * @throws  400 for workflow logic errors (wrong turn, locked, max rounds).
 */
router.post("/conversations/:id/actions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = parseInt(req.params.id);
    const { clientMsgId, actionKey, inputs } = req.body;

    try {
        const msg = await workflow.handleAction(conversationId, user.id, actionKey, inputs, clientMsgId);
        res.json(msg);
    } catch (error: any) {
        console.error("Action error:", error);
        // Workflow errors (wrong turn, locked, validation) are client-facing 400s.
        // Permission errors could be 403 but the workflow service currently
        // throws generic errors — a future improvement could differentiate.
        res.status(400).json({ message: error.message || "Action failed" });
    }
});


/**
 * POST /conversations/:id/messages
 *
 * Sends a free-text message in a conversation. This endpoint is blocked
 * for negotiation-type conversations, which are strictly action-driven
 * (users must use the /actions endpoint instead).
 *
 * For non-negotiation conversations (e.g. general chat, support), the
 * message is inserted and `lastMessageAt` is bumped on the conversation.
 *
 * @param id - Conversation ID (integer path param).
 * @body  { body: string, clientMsgId?: string }
 *        - body:        The message text content.
 *        - clientMsgId: Optional client-generated dedup ID.
 * @returns {Message} The newly created message.
 * @throws  400 if the conversation is a negotiation (free text not allowed).
 */
router.post("/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = parseInt(req.params.id);
    const { body, clientMsgId } = req.body;

    try {
        // Check conversation type — negotiation conversations are
        // flowchart-driven and reject free-text messages.
        const convo = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId)
        });

        if (convo?.conversationType === 'negotiation') {
            return res.status(400).json({ message: "Free text not allowed in this mode. Use actions." });
        }

        // Insert the text message
        const [msg] = await db.insert(messages).values({
            conversationId,
            senderId: user.id,
            body,
            messageType: 'text',
            clientMsgId
        }).returning();

        // Bump the conversation's lastMessageAt for sort ordering
        await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

        res.json(msg);
    } catch (error) {
        console.error("Message error:", error);
        res.status(500).json({ message: "Failed to send message" });
    }
});

export default router;
