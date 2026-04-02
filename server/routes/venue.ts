import { Router, type Request, type Response, type NextFunction } from "express";
import { storage } from "../storage";

const router = Router();

// Middleware: require authenticated session
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

// Middleware: require venue_manager or venue role
function isVenueManager(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  const role = user.role || user.metadata?.role;
  if (role !== "venue_manager" && role !== "venue") {
    return res.status(403).json({ message: "Venue manager role required" });
  }
  next();
}

// Apply middleware to all venue application routes
router.use("/venue/applications", isAuthenticated, isVenueManager);

// GET /venue/applications — list all artist applications to this venue's events
router.get("/venue/applications", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const venue = await storage.getVenueByUserId(user.id);
    if (!venue) {
      return res.status(404).json({ message: "Venue profile not found" });
    }
    const bookings = await storage.getBookingsByVenueWithDetails(venue.id);
    return res.json(bookings);
  } catch (error) {
    console.error("Error fetching venue applications:", error);
    return res.status(500).json({ message: "Failed to fetch applications" });
  }
});

// POST /venue/applications/:id/accept — accept an artist application
router.post("/venue/applications/:id/accept", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const bookingId = parseInt(req.params.id as string);
    if (isNaN(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const venue = await storage.getVenueByUserId(user.id);
    if (!venue) {
      return res.status(404).json({ message: "Venue profile not found" });
    }

    // Verify this booking belongs to the venue's event
    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.event?.venueId !== venue.id) {
      return res.status(403).json({ message: "Not authorized to modify this booking" });
    }

    const updated = await storage.updateBooking(bookingId, { status: "confirmed" });

    await storage.createAuditLog({
      who: user.id,
      action: "venue_application_accepted",
      entityType: "booking",
      entityId: bookingId,
      context: { venueId: venue.id, previousStatus: booking.status },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Error accepting application:", error);
    return res.status(500).json({ message: "Failed to accept application" });
  }
});

// POST /venue/applications/:id/decline — decline an artist application
router.post("/venue/applications/:id/decline", async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const bookingId = parseInt(req.params.id as string);
    if (isNaN(bookingId)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const venue = await storage.getVenueByUserId(user.id);
    if (!venue) {
      return res.status(404).json({ message: "Venue profile not found" });
    }

    const booking = await storage.getBookingWithDetails(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.event?.venueId !== venue.id) {
      return res.status(403).json({ message: "Not authorized to modify this booking" });
    }

    const updated = await storage.updateBooking(bookingId, { status: "cancelled" });

    await storage.createAuditLog({
      who: user.id,
      action: "venue_application_declined",
      entityType: "booking",
      entityId: bookingId,
      context: { venueId: venue.id, previousStatus: booking.status, reason: req.body.reason },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Error declining application:", error);
    return res.status(500).json({ message: "Failed to decline application" });
  }
});

export default router;
