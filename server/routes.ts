import type { Express } from "express";
import adminRouter from "./routes/admin";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Booking, auditLogs, bookingProposals, bookings } from "@shared/schema";
import opportunitiesRouter from "./routes/opportunities";
import contractsRouter from "./routes/contracts";
import conversationsRouter from "./routes/conversations";
import organizerRouter from "./routes/organizer";
import venueRouter from "./routes/venue";
import mediaRouter from "./routes/media";
import { isSameDay } from "date-fns";
import { artistProfileCompleteSchema, buildArtistMetadata, buildArtistRecord } from "./artist-profile-utils";
import { venueProfileCompleteSchema, buildVenueMetadata, buildVenueRecord } from "./venue-profile-utils";
import { db } from "./db";
import { normalizeApplicationProposalSnapshot } from "@shared/negotiation-application";
import { negotiationService } from "./services/negotiation.service";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  setupAuth(app);

  // Update User Profile (Legal & Financial details)
  app.patch("/api/users/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = req.user as any;
      
      // We only allow updating certain fields for security
      const updateSchema = z.object({
        legalName: z.string().optional(),
        permanentAddress: z.string().optional(),
        panNumber: z.string().optional(),
        gstin: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        bankIfsc: z.string().optional(),
        bankBranch: z.string().optional(),
        bankAccountHolderName: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(user.id, validatedData);
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error(`Error updating user profile:`, error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // === API ROUTES ===
  app.use("/api", opportunitiesRouter);
  app.use("/api", contractsRouter);
  app.use("/api", conversationsRouter);
  app.use("/api", organizerRouter);
  app.use("/api", venueRouter);
  app.use("/api", mediaRouter);
  app.use("/api/admin", adminRouter); // Admin routes mounted under /api/admin


  // Artists
  app.get(api.artists.list.path, async (req, res) => {
    try {
      const artists = await storage.getArtists();
      res.json(artists);
    } catch (error) {
      console.error("Error fetching artists:", error);
      res.status(500).json({ message: "Failed to fetch artists" });
    }
  });

  app.get(api.artists.get.path, async (req, res) => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idParam);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      console.log(`GET /api/artists/${id} requested`);
      const artist = await storage.getArtist(id);
      if (!artist) {
        return res.status(404).json({ message: "Artist not found" });
      }
      res.json(artist);
    } catch (error: any) {
      console.error(`FATAL ERROR fetching artist ${req.params.id}:`, error);
      res.status(500).json({
        message: "Failed to fetch artist",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  app.put(api.artists.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idParam);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const user = req.user as any;

      // Verify ownership
      const artist = await storage.getArtist(id);
      if (!artist || artist.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to update this profile" });
      }

      console.log(`Updating artist ${id} for user ${user.id}`);

      // Map incoming data to schema fields
      const schemaFields = ['name', 'isBand', 'members', 'bio', 'originCityId', 'baseLocation', 'priceFrom', 'priceTo', 'currency', 'metadata'];
      const updateData: any = {};

      // Explicit mapping for common frontend fields
      if (req.body.stageName) updateData.name = req.body.stageName;
      if (req.body.feeMin !== undefined) updateData.priceFrom = String(req.body.feeMin);
      if (req.body.feeMax !== undefined) updateData.priceTo = String(req.body.feeMax);
      if (req.body.location) updateData.baseLocation = { name: req.body.location };
      if (req.body.bio) updateData.bio = req.body.bio;

      // Handle metadata merging
      const currentMetadata = artist.metadata as any || {};
      let updatedMetadata = { ...currentMetadata };
      let metadataChanged = false;

      const topLevelFields = ['id', 'userId', 'stageName', 'feeMin', 'feeMax', 'location'];

      for (const [key, value] of Object.entries(req.body)) {
        if (schemaFields.includes(key)) {
          if (key !== 'metadata' && updateData[key] === undefined) {
            updateData[key] = value;
          }
        } else if (!topLevelFields.includes(key)) {
          updatedMetadata[key] = value;
          metadataChanged = true;
        }
      }

      if (req.body.metadata && typeof req.body.metadata === 'object') {
        updatedMetadata = { ...updatedMetadata, ...req.body.metadata };
        metadataChanged = true;
      }

      if (metadataChanged) {
        updateData.metadata = updatedMetadata;
      }

      const updated = await storage.updateArtist(id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("CRITICAL ERROR updating artist profile:", error);
      res.status(500).json({
        message: "Failed to update artist profile",
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Onboarding endpoint
  app.post("/api/artists/profile/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const user = req.user as any;

      // Resolve the user's role using a fallback chain:
      //   1. user.role       — set during login/deserialisation from metadata
      //   2. metadata.role   — the canonical source written at registration
      //   3. 'artist'        — safe default (most platform users are artists)
      // This guards against sessions where `user.role` was not hydrated
      // (e.g. older sessions serialised before the role-hydration patch).
      const userRole = user.role || (user.metadata as any)?.role || 'artist';

      if (userRole !== 'artist') {
        return res.status(403).json({ message: "Only artists can complete artist profiles" });
      }

      const profileData = artistProfileCompleteSchema.parse(req.body);
      const record = buildArtistRecord(profileData);

      let artist = await storage.getArtistByUserId(user.id);

      if (artist) {
        const existingArtistId = artist.id;
        const metadata = buildArtistMetadata(profileData, (artist.metadata as Record<string, any>) || {});
        const updated = await storage.updateArtist(existingArtistId, {
          ...record,
          metadata,
        });
        if (!updated) {
          throw new Error(`updateArtist returned undefined for artist id=${existingArtistId} (user ${user.id})`);
        }
        artist = updated;

        await storage.createAuditLog({
          who: user.id,
          action: "artist_profile_update",
          entityType: "artist",
          entityId: artist.id,
          context: { stageName: profileData.stageName }
        });
      } else {
        const metadata = buildArtistMetadata(profileData);
        artist = await storage.createArtist({
          userId: user.id,
          ...record,
          metadata: metadata as any,
        });
        if (!artist) {
          throw new Error(`createArtist returned undefined for user ${user.id}`);
        }

        await storage.createAuditLog({
          who: user.id,
          action: "artist_profile_complete",
          entityType: "artist",
          entityId: artist.id,
          context: { stageName: profileData.stageName }
        });
      }

      res.status(200).json({
        message: "Profile completed successfully",
        artist
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: err.errors
        });
      }
      console.error("CRITICAL ERROR completing artist profile:", err.stack || err);
      res.status(500).json({
        message: "Failed to complete profile",
        error: err.message,
      });
    }
  });

  app.get("/api/artists/profile/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const artist = await storage.getArtistByUserId(user.id);
      const meta = (artist?.metadata as any) ?? {};
      // Primary check: explicit flag set by the profile completion wizard.
      // Fallback: if key profile fields are populated the profile is effectively
      // complete even if the flag was never written (e.g. legacy / seeded data).
      const flagComplete = meta.profileComplete === true;
      const fieldsComplete = !!(
        artist &&
        artist.bio &&
        artist.priceFrom &&
        (meta.primaryGenre || artist.name)
      );
      const isComplete = flagComplete || fieldsComplete;
      res.json({ isComplete });
    } catch (error) {
      res.status(500).json({ message: "Failed to check profile status" });
    }
  });

  // Venues
  app.post("/api/venues/profile/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const user = req.user as any;
      const userRole = user.role || (user.metadata as any)?.role || 'artist';
      if (userRole !== 'venue_manager' && userRole !== 'venue' && userRole !== 'organizer') {
        return res.status(403).json({ message: "Only venue managers or organizers can complete venue profiles" });
      }

      const profileData = venueProfileCompleteSchema.parse(req.body);

      // Base metadata
      const baseMetadata = {
        profileComplete: true,
        website: profileData.website,
        instagram: profileData.instagramHandle,
        bookingEmail: profileData.bookingEmail,
        bookingPhone: profileData.bookingPhone,
        updatedAt: new Date().toISOString(),
      };

      // Merge with extended metadata from 7-step onboarding
      const extendedMetadata = profileData.metadata || {};
      const metadata = {
        ...baseMetadata,
        ...extendedMetadata,
      };

      let venue = await storage.getVenueByUserId(user.id);

      const venueData = {
        name: profileData.name,
        description: profileData.description,
        address: { street: profileData.address, city: profileData.city },
        capacity: profileData.capacity,
        capacitySeated: profileData.capacitySeated,
        capacityStanding: profileData.capacityStanding,
        amenities: profileData.amenities,
        metadata: { ...(venue?.metadata as any || {}), ...metadata },
      };

      if (venue) {
        venue = await storage.updateVenue(venue.id, venueData);
        await storage.createAuditLog({
          who: user.id,
          action: "venue_profile_update",
          entityType: "venue",
          entityId: venue.id,
          context: { name: profileData.name }
        });
      } else {
        venue = await storage.createVenue({
          userId: user.id,
          ...venueData,
        });
        await storage.createAuditLog({
          who: user.id,
          action: "venue_profile_complete",
          entityType: "venue",
          entityId: venue.id,
          context: { name: profileData.name }
        });
      }

      res.status(200).json({
        message: "Venue profile completed successfully",
        venue
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: err.errors
        });
      }
      console.error("CRITICAL ERROR completing venue profile:", err);
      res.status(500).json({
        message: "Failed to complete venue profile",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.get("/api/venues/profile/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const venue = await storage.getVenueByUserId(user.id);
      const isComplete = (venue?.metadata as any)?.profileComplete === true;
      res.json({ isComplete });
    } catch (error) {
      res.status(500).json({ message: "Failed to check venue profile status" });
    }
  });

  // GET venue profile for current user
  app.get("/api/venues/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const venue = await storage.getVenueByUserId(user.id);
      if (!venue) {
        return res.json({ venue: null });
      }
      res.json({ venue });
    } catch (error) {
      console.error("Error fetching venue profile:", error);
      res.status(500).json({ message: "Failed to fetch venue profile" });
    }
  });

  // PATCH venue profile
  app.patch("/api/venues/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const venue = await storage.getVenueByUserId(user.id);

      if (!venue) {
        return res.status(404).json({ message: "Venue not found" });
      }

      // Merge metadata
      const currentMetadata = venue.metadata as any || {};
      const incomingMetadata = req.body.metadata || {};
      const updatedMetadata = { ...currentMetadata, ...incomingMetadata };

      // Prepare update data
      const updateData: any = {};
      const allowedFields = ['name', 'description', 'address', 'capacity', 'capacitySeated', 'capacityStanding', 'amenities'];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // Always include updated metadata
      updateData.metadata = {
        ...updatedMetadata,
        updatedAt: new Date().toISOString(),
      };

      const updated = await storage.updateVenue(venue.id, updateData);

      await storage.createAuditLog({
        who: user.id,
        action: "venue_profile_patch",
        entityType: "venue",
        entityId: venue.id,
        context: { fields: Object.keys(updateData) }
      });

      res.json({ venue: updated });
    } catch (error) {
      console.error("Error updating venue profile:", error);
      res.status(500).json({ message: "Failed to update venue profile" });
    }
  });

  // GET venue dashboard stats
  app.get("/api/venues/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const venue = await storage.getVenueByUserId(user.id);

      if (!venue) {
        return res.json({
          totalShowsHosted: 0,
          upcomingShows: 0,
          artistsBooked: 0,
          budgetUtilization: 0,
          trustScore: 50,
          pendingRequests: 0,
        });
      }

      const stats = await storage.getVenueDashboardStats(venue.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching venue dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/venues/events/upcoming", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const venue = await storage.getVenueByUserId(user.id);
      if (!venue) return res.json([]);

      const events = await storage.getVenueUpcomingEvents(venue.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  app.get(api.venues.list.path, async (req, res) => {
    try {
      const venues = await storage.getVenues();
      res.json(venues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch venues" });
    }
  });

  app.get(api.venues.get.path, async (req, res) => {
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idParam);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const venue = await storage.getVenue(id);
      if (!venue) return res.status(404).json({ message: "Venue not found" });
      res.json(venue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch venue" });
    }
  });

  // Bookings
  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const userRole = user.role || (user.metadata as any)?.role || 'artist';
      let bookings = [];

      if (userRole === 'artist') {
        const artist = await storage.getArtistByUserId(user.id);
        if (artist) {
          bookings = await storage.getBookingsByArtistWithDetails(artist.id);
        }
      } else if (userRole === 'organizer') {
        const organizer = await storage.getOrganizerByUserId(user.id);
        if (organizer) {
          bookings = await storage.getBookingsByOrganizerWithDetails(organizer.id);
        }
      } else if (userRole === 'venue' || userRole === 'venue_manager') {
        const venue = await storage.getVenueByUserId(user.id);
        if (venue) {
          bookings = await storage.getBookingsByVenueWithDetails(venue.id);
        }
      }

      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const userRole = user.role || (user.metadata as any)?.role || 'artist';

      if (user.status === 'pending_verification' || user.status === 'suspended') {
        return res.status(403).json({
          message: "Your account is currently " + (user.status === 'suspended' ? "suspended" : "pending verification") + ". Please contact support or wait for admin approval."
        });
      }

      const { artistId, eventDate, offerAmount, currency, notes, slotTime } = req.body;
      let { eventId, organizerId } = req.body;

      // Validate inputs
      if (!artistId) return res.status(400).json({ message: "Artist ID is required" });

      // Determine Organizer/Venue context
      let contextName = "Organizer";

      // If organizerId is not provided, try to find it from user
      if (!organizerId) {
        const organizer = await storage.getOrganizerByUserId(user.id);
        if (organizer) organizerId = organizer.id;
      }

      let venueId: number | undefined;
      const venue = await storage.getVenueByUserId(user.id);
      if (venue) {
        venueId = venue.id;
        contextName = venue.name;
      }

      // Check for duplicate active bookings for this artist by this user/entity
      let existingBookings: any[] = [];
      if (organizerId) {
        existingBookings = await storage.getBookingsByOrganizerWithDetails(organizerId);
      } else if (venueId) {
        existingBookings = await storage.getBookingsByVenueWithDetails(venueId);
      }

      if (eventDate) {
        const targetDate = new Date(eventDate);
        const duplicate = existingBookings.find(b => {
          if (b.artistId !== artistId) return false;
          if (['cancelled', 'declined', 'completed', 'refunded'].includes(b.status)) return false;

          // Date Check
          const bDate = b.eventDate ? new Date(b.eventDate) : null;
          if (bDate && isSameDay(targetDate, bDate)) return true;

          return false;
        });

        if (duplicate) {
          return res.status(409).json({
            message: "A booking inquiry for this date already exists.",
            bookingId: duplicate.id
          });
        }
      }

      // If no eventId, create a placeholder event so the booking is visible/valid
      if (!eventId && eventDate) {
        const artist = await storage.getArtist(artistId);
        // If organizer name is available, use it, else generic.
        const title = `Booking: ${artist?.name || 'Artist'} at ${contextName}`;

        const newEvent = await storage.createEvent({
          title,
          startTime: new Date(eventDate),
          description: notes || "Direct Booking",
          status: "draft",
          organizerId: organizerId || null,
          venueId: venueId || null,
          capacityTotal: 0,
          currency: currency || "INR",
        });
        eventId = newEvent.id;
      }

      const now = new Date();
      const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      // Prepare booking data
      const bookingData = {
        eventId: eventId || null, // Should be set now if date was provided
        artistId,
        status: "offered" as const, // Default for new offers
        offerAmount: offerAmount ? String(offerAmount) : null,
        offerCurrency: currency || "INR",
        flowStartedAt: now,
        flowDeadlineAt: deadline,
        meta: {
          notes,
          slotTime,
          createdFrom: "direct_offer",
          history: [{
            action: "offered",
            by: userRole,
            at: new Date().toISOString(),
            amount: offerAmount
          }]
        }
      };

      const booking = await storage.createBooking(bookingData);

      await storage.createAuditLog({
        who: user.id,
        action: "booking_created",
        entityType: "booking",
        entityId: booking.id,
        context: { artistId, eventId }
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error("Booking creation error:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put(api.bookings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(idParam);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      const existing = await storage.getBooking(id);
      if (!existing) return res.status(404).json({ message: "Booking not found" });

      const updated = await storage.updateBooking(id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Failed to update booking" });
    }
  });

  // --- New Negotiation API Routes ---
  
  function getParamId(idParam: string | string[] | undefined): number {
    const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
    return parseInt(idStr || "0");
  }

  app.get(api.bookings.negotiationSummary.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const summary = await negotiationService.getSummary(getParamId(req.params.id));
      res.json(summary);
    } catch (err: any) {
      if (err.message === "Booking not found") return res.status(404).json({ message: err.message });
      res.status(500).json({ message: "Failed to get negotiation summary" });
    }
  });

  // --- 4-Step Negotiation Action (unified endpoint) ---
  app.post(api.bookings.negotiationAction.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const bookingId = getParamId(req.params.id);
      const payload = api.bookings.negotiationAction.input.parse(req.body);
      const summary = await negotiationService.handleNegotiationAction(
        bookingId,
        (req.user as any).id,
        payload
      );
      res.json({ success: true, summary });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      if (err.message.includes("not a participant") || err.message.includes("turn")) {
        return res.status(403).json({ message: err.message });
      }
      res.status(400).json({ message: err.message });
    }
  });

  // --- Legacy endpoints (deprecated, delegate to unified handler) ---

  app.post(api.bookings.submitProposal.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.setHeader('X-Deprecated', 'Use POST /api/bookings/:id/negotiation/action instead');
    try {
      const payload = api.bookings.submitProposal.input.parse(req.body);
      const summary = await negotiationService.handleNegotiationAction(
        getParamId(req.params.id),
        (req.user as any).id,
        { action: "edit", snapshot: payload.snapshot, note: payload.note || undefined }
      );
      res.json(summary);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: err.errors });
      res.status(400).json({ message: err.message });
    }
  });

  app.post(api.bookings.confirmRider.path, async (req, res) => {
    res.status(410).json({ message: "Rider confirmation is now part of the proposal snapshot. Use POST /api/bookings/:id/negotiation/action with action='edit' instead." });
  });

  app.post(api.bookings.finalAccept.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.setHeader('X-Deprecated', 'Use POST /api/bookings/:id/negotiation/action instead');
    try {
      const summary = await negotiationService.handleNegotiationAction(
        getParamId(req.params.id),
        (req.user as any).id,
        { action: "accept" }
      );
      res.json(summary);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post(api.bookings.walkAway.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.setHeader('X-Deprecated', 'Use POST /api/bookings/:id/negotiation/action instead');
    try {
      const payload = api.bookings.walkAway.input.parse(req.body);
      await negotiationService.handleNegotiationAction(
        getParamId(req.params.id),
        (req.user as any).id,
        { action: "walkaway", reason: payload.reason }
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Artist Apply to Event
  app.post("/api/bookings/apply", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const userRole = user.role || (user.metadata as any)?.role || 'artist';
      if (userRole !== 'artist') {
        return res.status(403).json({ message: "Only artists can apply to events" });
      }

      const applicationInput = api.bookings.apply.input.parse(req.body);
      const normalizedProposalSnapshot = normalizeApplicationProposalSnapshot(applicationInput.proposal);
      const eventId = applicationInput.eventId;
      const stageId = normalizedProposalSnapshot.schedule?.stageId ?? null;
      const offerAmount = normalizedProposalSnapshot.financial.offerAmount;
      const currency = normalizedProposalSnapshot.financial.currency;
      const artistMessage = applicationInput.message?.trim() || normalizedProposalSnapshot.notes?.artist || null;

      const artist = await storage.getArtistByUserId(user.id);
      if (!artist) {
        return res.status(404).json({ message: "Artist profile not found" });
      }

      // Check for existing booking
      const existingBookings = await storage.getBookingsByArtist(artist.id);
      const alreadyApplied = existingBookings.some(b => b.eventId === eventId);
      if (alreadyApplied) {
        return res.status(409).json({ message: "You have already applied to this event" });
      }

      // Verify event exists and is published
      const event = await storage.getEvent(eventId);
      if (!event || event.status !== 'published') {
        return res.status(404).json({ message: "Event not found or not accepting applications" });
      }

      const appliedAt = new Date();
      const appliedAtIso = appliedAt.toISOString();
      const riderRequirements = normalizedProposalSnapshot.techRider?.artistRequirements || [];
      const artistBrings = normalizedProposalSnapshot.techRider?.artistBrings || [];
      const riderConfirmation = {
        isConfirmed: riderRequirements.length === 0,
        confirmedAt: null,
        confirmedBy: null,
        unresolvedItemCount: riderRequirements.length,
      };
      const activity = [{
        id: `application-submitted-${appliedAt.getTime()}`,
        type: 'application_submitted' as const,
        proposalVersion: 1,
        actorUserId: user.id,
        actorRole: 'artist' as const,
        createdAt: appliedAtIso,
        messageId: null,
        metadata: {
          eventId,
          stageId,
          artistRequirementCount: riderRequirements.length,
          artistBringsCount: artistBrings.length,
        },
      }];

      const [booking, proposal] = await db.transaction(async (tx) => {
        const now = new Date();
        const deadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);

        const [createdBooking] = await tx.insert(bookings).values({
          eventId,
          artistId: artist.id,
          stageId,
          status: 'inquiry',
          offerAmount: String(offerAmount),
          offerCurrency: currency,
          depositPercent: String(normalizedProposalSnapshot.financial.depositPercent ?? 30),
          flowStartedAt: now,
          flowDeadlineAt: deadline,
          meta: {
            appliedAt: appliedAtIso,
            negotiationRound: 1,
            history: [{
              action: 'applied',
              by: 'artist',
              at: appliedAtIso,
              offerAmount,
              stageId,
              message: artistMessage,
            }],
            negotiation: {
              source: 'application',
              status: 'negotiating',
              currentStep: 0,
              stepState: 'applied',
              stepDeadlineAt: deadline.toISOString(),
              stepHistory: [],
              latestProposalVersion: 1,
              currentProposalSnapshot: normalizedProposalSnapshot,
              acceptance: {
                artistAcceptedVersion: null,
                organizerAcceptedVersion: null,
                artistAcceptedAt: null,
                organizerAcceptedAt: null,
              },
              riderConfirmation,
              agreement: null,
              activity,
            },
          },
        }).returning();

        const [createdProposal] = await tx.insert(bookingProposals).values({
          bookingId: createdBooking.id,
          createdBy: user.id,
          round: 1,
          proposedTerms: normalizedProposalSnapshot,
          note: artistMessage,
          status: 'active',
          submittedByRole: 'artist',
          stepNumber: 0,
          responseAction: 'edit',
        }).returning();

        await tx.insert(auditLogs).values({
          who: user.id,
          action: "gig_applied",
          entityType: "booking",
          entityId: createdBooking.id,
          context: {
            eventId,
            amount: offerAmount,
            proposalVersion: 1,
            artistRequirementCount: riderRequirements.length,
            artistBringsCount: artistBrings.length,
          },
        });

        return [createdBooking, createdProposal] as const;
      });

      const proposalResponse = {
        id: proposal.id,
        bookingId: booking.id,
        conversationId: null,
        version: 1,
        snapshot: normalizedProposalSnapshot,
        status: proposal.status,
        note: proposal.note,
        createdAt: proposal.createdAt ?? appliedAt,
        createdBy: proposal.createdBy,
        createdByRole: 'artist' as const,
      };

      res.status(201).json({
        booking,
        proposal: proposalResponse,
        summary: {
          booking: {
            id: booking.id,
            status: booking.status || 'inquiry',
            eventId: booking.eventId,
            artistId: booking.artistId,
            stageId: booking.stageId,
            contractId: booking.contractId ?? null,
          },
          conversation: null,
          status: 'negotiating',
          round: 1,
          currentProposal: proposalResponse,
          history: [proposalResponse],
          agreement: null,
          acceptance: {
            artistAcceptedVersion: null,
            organizerAcceptedVersion: null,
            artistAcceptedAt: null,
            organizerAcceptedAt: null,
          },
          riderConfirmation,
          activity,
          readyForContract: false,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }

      console.error("Error applying to event:", error);
      res.status(500).json({ message: "Failed to apply to event" });
    }
  });

  return httpServer;
}
