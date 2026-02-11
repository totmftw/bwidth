import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// POST /api/opportunities
router.post("/opportunities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const user = req.user as any;
        if (user.role !== 'venue' && user.role !== 'venue_manager' && user.role !== 'organizer') {
            return res.status(403).json({ message: "Not authorized to create events" });
        }

        let venueId: number | null = null;
        let organizerId: number | null = null;

        if (user.role === 'venue' || user.role === 'venue_manager') {
            const venue = await storage.getVenueByUserId(user.id);
            if (!venue) return res.status(400).json({ message: "Venue profile not found" });
            venueId = venue.id;
        } else if (user.role === 'organizer') {
            const organizer = await storage.getOrganizerByUserId(user.id);
            if (!organizer) return res.status(400).json({ message: "Organizer profile not found" });
            organizerId = organizer.id;
        }

        const eventSchema = z.object({
            title: z.string().min(1),
            description: z.string().optional(),
            startTime: z.string().datetime(),
            endTime: z.string().datetime().optional(),
            capacityTotal: z.coerce.number().optional(),
            visibility: z.enum(['public', 'private']).default('private'),
            stages: z.array(z.object({
                name: z.string(),
                startTime: z.string().datetime().optional(),
                endTime: z.string().datetime().optional(),
                capacity: z.number().optional(),
            })).optional(),
            metadata: z.record(z.any()).optional(),
        });

        const data = eventSchema.parse(req.body);

        const event = await storage.createEvent({
            ...data,
            startTime: new Date(data.startTime),
            endTime: data.endTime ? new Date(data.endTime) : undefined,
            venueId,
            organizerId,
            status: 'published',
            slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
            visibility: data.visibility,
            stages: data.stages ? data.stages.map(s => ({
                ...s,
                startTime: s.startTime ? new Date(s.startTime) : undefined,
                endTime: s.endTime ? new Date(s.endTime) : undefined,
            })) : undefined,
        });

        await storage.createAuditLog({
            who: user.id,
            action: "event_created",
            entityType: "event",
            entityId: event.id,
            context: { title: event.title }
        });

        res.status(201).json(event);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation error", errors: error.errors });
        }
        console.error("Error creating event:", error);
        res.status(500).json({ message: "Failed to create event" });
    }
});

// GET /api/opportunities
router.get("/opportunities", async (req, res) => {
    try {
        const filters = {
            genre: req.query.genre as string,
            minBudget: req.query.minBudget ? Number(req.query.minBudget) : undefined,
            maxBudget: req.query.maxBudget ? Number(req.query.maxBudget) : undefined,
            location: req.query.location as string,
        };

        const opportunities = await storage.getOpportunities(filters);
        res.json(opportunities);
    } catch (error) {
        console.error("Error fetching opportunities:", error);
        res.status(500).json({ message: "Failed to fetch opportunities" });
    }
});

// GET /api/opportunities/:id
router.get("/opportunities/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        const opportunity = await storage.getEvent(id);
        if (!opportunity) {
            return res.status(404).json({ message: "Opportunity not found" });
        }
        res.json(opportunity);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch opportunity" });
    }
});

export default router;
