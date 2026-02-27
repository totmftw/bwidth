import { Router, type Request, type Response, type NextFunction } from "express";
import { organizerOnboardingSchema, organizerProfileUpdateSchema, createEventSchema, completionConfirmSchema } from "@shared/routes";
import { storage } from "../storage";

const router = Router();

// Middleware: require authenticated session
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Middleware: require organizer or promoter role
function isOrganizer(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  const role = user.role || user.metadata?.role;
  if (role !== "organizer" && role !== "promoter") {
    return res.status(403).json({ message: "Organizer or promoter role required" });
  }
  next();
}

// Apply middleware to all routes in this router
router.use(isAuthenticated);
router.use(isOrganizer);

// GET /organizer/profile — return organizer profile with user data
router.get("/organizer/profile", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }
    const fullOrganizer = await storage.getOrganizer(organizer.id);
    if (!fullOrganizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }
    return res.json(fullOrganizer);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch organizer profile" });
  }
});

// PUT /organizer/profile — validate with organizerProfileUpdateSchema, call updateOrganizer
router.put("/organizer/profile", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const parsed = organizerProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const updateData: Record<string, any> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.contactPerson !== undefined) updateData.contactPerson = parsed.data.contactPerson;
    if (parsed.data.website !== undefined || parsed.data.socialLinks !== undefined) {
      const existingMetadata = (organizer.metadata as Record<string, any>) || {};
      updateData.metadata = {
        ...existingMetadata,
        ...(parsed.data.website !== undefined ? { website: parsed.data.website } : {}),
        ...(parsed.data.socialLinks !== undefined ? { socialLinks: parsed.data.socialLinks } : {}),
      };
    }

    const updated = await storage.updateOrganizer(organizer.id, updateData);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update organizer profile" });
  }
});

// POST /organizer/profile/complete — validate with organizerOnboardingSchema, complete onboarding
router.post("/organizer/profile/complete", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const parsed = organizerOnboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const { organizationName, description, contactPerson, website, pastEventReferences } = parsed.data;
    const existingMetadata = (organizer.metadata as Record<string, any>) || {};

    const updated = await storage.updateOrganizer(organizer.id, {
      name: organizationName,
      description,
      contactPerson,
      metadata: {
        ...existingMetadata,
        profileComplete: true,
        trustScore: 50,
        ...(website !== undefined ? { website } : {}),
        ...(pastEventReferences !== undefined ? { pastEventReferences } : {}),
      },
    });

    return res.json({ message: "Onboarding complete", organizer: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to complete onboarding" });
  }
});

// GET /organizer/profile/status — return { isComplete: boolean } from metadata.profileComplete
router.get("/organizer/profile/status", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }
    const metadata = (organizer.metadata as Record<string, any>) || {};
    return res.json({ isComplete: metadata.profileComplete === true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile status" });
  }
});

// GET /organizer/dashboard — return organizer dashboard stats
router.get("/organizer/dashboard", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }
    const stats = await storage.getOrganizerDashboardStats(organizer.id);
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

// GET /organizer/activity — return recent activity feed
router.get("/organizer/activity", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const activity = await storage.getRecentActivity(user.id, limit);
    return res.json(activity);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch recent activity" });
  }
});

// GET /organizer/events — list organizer's events with optional status filter
router.get("/organizer/events", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }
    const status = req.query.status as string | undefined;
    const events = await storage.getEventsByOrganizer(organizer.id, status);
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch events" });
  }
});

// POST /organizer/events — create a new event
router.post("/organizer/events", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const { stages, ...eventData } = parsed.data;
    const event = await storage.createEvent({
      ...eventData,
      startTime: new Date(eventData.startTime),
      endTime: eventData.endTime ? new Date(eventData.endTime) : undefined,
      doorTime: eventData.doorTime ? new Date(eventData.doorTime) : undefined,
      organizerId: organizer.id,
      status: "draft",
      stages: stages?.map((s) => ({
        ...s,
        startTime: s.startTime ? new Date(s.startTime) : undefined,
        endTime: s.endTime ? new Date(s.endTime) : undefined,
      })),
    });

    return res.status(201).json(event);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create event" });
  }
});

// PUT /organizer/events/:id — update an event with ownership and edit restriction checks
router.put("/organizer/events/:id", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const eventId = parseInt(idParam, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.organizerId !== organizer.id) {
      return res.status(403).json({ message: "Not authorized to update this event" });
    }

    const parsed = createEventSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    // Check edit restrictions: if confirmed bookings exist, lock startTime and venueId
    const hasActive = await storage.hasActiveBookings(eventId);
    if (hasActive) {
      const lockedFields: string[] = [];
      if (parsed.data.startTime !== undefined) lockedFields.push("startTime");
      if (parsed.data.venueId !== undefined) lockedFields.push("venueId");
      if (lockedFields.length > 0) {
        return res.status(400).json({
          message: `Cannot change ${lockedFields.join(", ")} because this event has confirmed bookings`,
        });
      }
    }

    const updateData: Record<string, any> = { ...parsed.data };
    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);
    if (updateData.doorTime) updateData.doorTime = new Date(updateData.doorTime);
    // Remove stages from update data — stages are managed separately
    delete updateData.stages;

    const updated = await storage.updateEvent(eventId, updateData);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update event" });
  }
});

// DELETE /organizer/events/:id — delete event if no active bookings
router.delete("/organizer/events/:id", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const eventId = parseInt(idParam, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.organizerId !== organizer.id) {
      return res.status(403).json({ message: "Not authorized to delete this event" });
    }

    const hasActive = await storage.hasActiveBookings(eventId);
    if (hasActive) {
      return res.status(409).json({ message: "Cannot delete event with active bookings" });
    }

    await storage.deleteEvent(eventId);
    return res.json({ message: "Event deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete event" });
  }
});

// PUT /organizer/events/:id/publish — publish a draft event
router.put("/organizer/events/:id/publish", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const eventId = parseInt(idParam, 10);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    if (event.organizerId !== organizer.id) {
      return res.status(403).json({ message: "Not authorized to publish this event" });
    }
    if (event.status !== "draft") {
      return res.status(400).json({ message: "Only draft events can be published" });
    }

    const updated = await storage.updateEvent(eventId, { status: "published" });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to publish event" });
  }
});

// GET /organizer/bookings — list organizer's bookings with optional status filter
router.get("/organizer/bookings", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }
    const allBookings = await storage.getBookingsByOrganizerWithDetails(organizer.id);
    const status = req.query.status as string | undefined;
    const result = status ? allBookings.filter((b: any) => b.status === status) : allBookings;
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// GET /organizer/bookings/:id — get booking detail with organizer ownership check
router.get("/organizer/bookings/:id", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const bookingId = parseInt(idParam, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify organizer ownership via the booking's event
    if (!booking.event || booking.event.organizerId !== organizer.id) {
      return res.status(403).json({ message: "Not authorized to view this booking" });
    }

    return res.json(booking);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch booking" });
  }
});

// POST /organizer/bookings/:id/complete — confirm event completion with feedback
router.post("/organizer/bookings/:id/complete", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const bookingId = parseInt(idParam, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const parsed = completionConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
    }

    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify organizer ownership via the booking's event
    if (!booking.event || booking.event.organizerId !== organizer.id) {
      return res.status(403).json({ message: "Not authorized to complete this booking" });
    }

    const existingMeta = (booking.meta as Record<string, any>) || {};
    const completionFeedback = existingMeta.completionFeedback || {};

    // Record organizer's confirmation
    completionFeedback.organizer = {
      confirmedBy: "organizer",
      rating: parsed.data.rating,
      note: parsed.data.note,
      confirmedAt: new Date().toISOString(),
    };

    const newMeta = {
      ...existingMeta,
      completionFeedback,
    };

    // If both organizer and artist have confirmed, update status to completed
    const bothConfirmed = completionFeedback.organizer && completionFeedback.artist;
    const updateData: Record<string, any> = { meta: newMeta };
    if (bothConfirmed) {
      updateData.status = "completed";
    }

    const updated = await storage.updateBooking(bookingId, updateData);
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to confirm completion" });
  }
});

export default router;
