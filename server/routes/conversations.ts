import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
    insertConversationSchema,
    insertMessageSchema,
    proposalStatusEnum
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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
import { workflow } from "../services/workflow";

const router = Router();

// ===================================
// Conversation Management
// ===================================

// GET /conversations (List my conversations)
router.get("/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    try {
        // Join conversations with participants to find ones where user is a participant
        // This is a bit complex with pure Drizzle without relations in query builder sometimes, 
        // but we can use storage method or raw query. 
        // Let's assume storage or simple query.
        // For now, let's implement a storage method or use db directly if storage is not enough.
        // I'll use direct DB access here for flexibility with the new schema.

        const myConvos = await db.select({
            conversation: conversations,
            lastMessage: messages
        })
            .from(conversations)
            .innerJoin(conversationParticipants, eq(conversations.id, conversationParticipants.conversationId))
            .leftJoin(messages, eq(messages.conversationId, conversations.id))
            // This join for last message is tricky in a list. Usually we rely on `lastMessageAt` and fetch msg separately or use a lateral join.
            // For simplicity, let's just get the conversations and sorting by lastMessageAt.
            .where(eq(conversationParticipants.userId, user.id))
            .orderBy(desc(conversations.lastMessageAt));

        // Deduping if multiple rows returned per convo (due to joins) - actually innerJoin on participants should be unique per convo if we filter by userId.
        // But leftJoin on messages would explode it. remove message join.

        const plainConvos = await db.select()
            .from(conversations)
            .innerJoin(conversationParticipants, eq(conversations.id, conversationParticipants.conversationId))
            .where(eq(conversationParticipants.userId, user.id))
            .orderBy(desc(conversations.lastMessageAt));

        // TODO: formatting and fetching last message text content if needed for preview.
        const formatted = plainConvos.map(({ conversations }) => conversations);

        res.json(formatted);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
    }
});

// GET /conversations/:id (Get details + workflow context)
router.get("/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) return res.status(400).json({ message: "Invalid ID" });

    try {
        // Check participation
        const participant = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, user.id)
            )
        });

        if (!participant) return res.status(403).json({ message: "Not a participant" });

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

// GET /conversations/:id/messages (History with cursor)
router.get("/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = parseInt(req.params.id);
    const cursor = req.query.cursor as string; // timestamp or id

    try {
        // Check participation permissions
        const participant = await db.query.conversationParticipants.findFirst({
            where: and(
                eq(conversationParticipants.conversationId, conversationId),
                eq(conversationParticipants.userId, user.id)
            )
        });
        if (!participant) return res.status(403).json({ message: "Not a participant" });

        // Fetch messages
        // Simple pagination: Limit 50, order desc created_at
        const msgs = await db.query.messages.findMany({
            where: eq(messages.conversationId, conversationId),
            orderBy: desc(messages.createdAt),
            limit: 50,
            with: {
                sender: true
            }
        });

        res.json(msgs.reverse()); // Return in chronological order
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});

// POST /entities/:entityType/:entityId/conversation/:conversationType/open
// Idempotent creation/retrieval of entity-bound conversation
router.post("/entities/:entityType/:entityId/conversation/:conversationType/open", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { entityType, conversationType } = req.params;
    const entityId = parseInt(req.params.entityId);

    try {
        // 1. Check if conversation exists
        let convo = await db.query.conversations.findFirst({
            where: and(
                eq(conversations.entityType, entityType),
                eq(conversations.entityId, entityId),
                eq(conversations.conversationType, conversationType)
            )
        });

        if (!convo) {
            // 2. Create if not exists
            // Logic depends on entity type to determine initial participants
            let participantIds: number[] = [];
            let subject = "Conversation";

            if (entityType === "booking" && conversationType === "negotiation") {
                const booking = await storage.getBooking(entityId);
                if (!booking) return res.status(404).json({ message: "Booking not found" });

                // Participants: Booking Artist Key User, Organizer Key User
                if (!booking.artistId) return res.status(400).json({ message: "Booking has no artist" });
                const artist = await storage.getArtist(booking.artistId);
                // We need to resolve userId for artist and organizer
                // Assuming artist.userId and organizer (from event) userId

                if (artist && artist.userId) participantIds.push(artist.userId);

                // Fetch event to get organizer
                const event = booking.eventId ? await storage.getEvent(booking.eventId) : null;
                if (event && event.organizerId) {
                    const organizer = await storage.getPromoter(event.organizerId); // Promoter is organizer
                    if (organizer && organizer.userId) participantIds.push(organizer.userId);
                } else {
                    // If no event org, maybe direct specific logic.
                    // For now assume we have these.
                    // If creator of booking is not one of them (e.g. venue manager), add them too?
                }

                // Ensure current user is added if they have rights (for safety)
                if (!participantIds.includes(user.id)) participantIds.push(user.id);

                subject = `Negotiation: ${artist?.name || 'Artist'}`;
            }

            // Initial Workflow State for Negotiation
            const initialWorkflowState = (conversationType === 'negotiation') ? {
                workflowKey: 'booking_negotiation_v1',
                currentNodeKey: 'WAITING_FIRST_MOVE', // or 'AWAITING_ARTIST' depending on who started, usually 'SHOW_CURRENT_TERMS' logic
                round: 0,
                maxRounds: 3,
                locked: false,
                context: {}
            } : null;

            // Transactional Create
            convo = await db.transaction(async (tx) => {
                const [newConvo] = await tx.insert(conversations).values({
                    entityType,
                    entityId,
                    conversationType,
                    subject,
                    status: 'open',
                    lastMessageAt: new Date()
                }).returning();

                // Add participants
                const uniqueParticipants = Array.from(new Set(participantIds));
                for (const uid of uniqueParticipants) {
                    await tx.insert(conversationParticipants).values({
                        conversationId: newConvo.id,
                        userId: uid
                    });
                }

                // Add workflow instance
                if (initialWorkflowState) {
                    await tx.insert(conversationWorkflowInstances).values({
                        conversationId: newConvo.id,
                        ...initialWorkflowState,
                        awaitingUserId: null, // Logic needs to determine who is awaiting
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

// POST /conversations/:id/actions (Workflow Gate)
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
        // Determine status code based on error message or type (e.g. 400 for validation, 403 for permission)
        // Defaulting to 400 for logic errors
        res.status(400).json({ message: error.message || "Action failed" });
    }
});


// POST /conversations/:id/messages (Free text)
router.post("/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const conversationId = parseInt(req.params.id);
    const { body, clientMsgId } = req.body;

    try {
        // Validation: Is this conversation 'restricted'?
        const convo = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId)
        });

        if (convo?.conversationType === 'negotiation') {
            // Negotiation is strict flowchart only? Or hybrid?
            // User says "flowchart-driven... users don't type freely".
            // So we might REJECT generic messages or only allow them if embedded in an action?
            // "only pick allowed actions... every action is persisted as typed event".
            return res.status(400).json({ message: "Free text not allowed in this mode. Use actions." });
        }

        const [msg] = await db.insert(messages).values({
            conversationId,
            senderId: user.id,
            body, // Text body
            messageType: 'text',
            clientMsgId
        }).returning();

        // Update last_message_at
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
