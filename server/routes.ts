import type { Express } from "express";
import adminRouter from "./routes/admin";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Booking } from "@shared/schema";
import opportunitiesRouter from "./routes/opportunities";
import contractsRouter from "./routes/contracts";
import conversationsRouter from "./routes/conversations";
import { isSameDay } from "date-fns";
import { artistProfileCompleteSchema } from "./artist-profile-utils";

const venueProfileCompleteSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10).max(1000),
  address: z.string().min(5),
  city: z.string().min(2),
  capacity: z.coerce.number().min(1),
  capacitySeated: z.coerce.number().optional(),
  capacityStanding: z.coerce.number().optional(),
  amenities: z.array(z.string()).optional(),
  website: z.string().optional(),
  instagramHandle: z.string().optional(),
  bookingEmail: z.string().email().optional().or(z.literal("")),
  bookingPhone: z.string().optional(),
  // Extended metadata from 7-step onboarding
  metadata: z.object({
    state: z.string().optional(),
    pincode: z.string().optional(),
    spaceDimensions: z.object({
      stageWidth: z.number().optional(),
      stageDepth: z.number().optional(),
      ceilingHeight: z.number().optional(),
    }).optional(),
    musicPolicy: z.object({
      preferredGenres: z.array(z.string()).optional(),
      targetAudience: z.string().optional(),
      eventFrequency: z.string().optional(),
      bookingMode: z.string().optional(),
    }).optional(),
    equipment: z.array(z.string()).optional(),
    photos: z.object({
      coverImageUrl: z.string().optional(),
      galleryUrls: z.array(z.string()).optional(),
      virtualTourUrl: z.string().optional(),
    }).optional(),
    bookingPreferences: z.object({
      monthlyBudgetMin: z.number().optional(),
      monthlyBudgetMax: z.number().optional(),
      operatingDays: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  setupAuth(app);

  // === API ROUTES ===
  app.use("/api", opportunitiesRouter);
  app.use("/api", contractsRouter);
  app.use("/api", conversationsRouter);
  app.use(adminRouter); // Admin routes defined as /admin/...


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

      const metadata = {
        yearsOfExperience: profileData.yearsOfExperience,
        primaryGenre: profileData.primaryGenre,
        secondaryGenres: profileData.secondaryGenres || [],
        performanceDurations: profileData.performanceDurations || [],
        soundcloud: profileData.soundcloudUrl,
        mixcloud: profileData.mixcloudUrl,
        instagram: profileData.instagramHandle,
        website: profileData.websiteUrl,
        achievements: profileData.achievements,
        technicalRider: profileData.technicalRider,
        equipmentRequirements: profileData.equipmentRequirements,
        travelPreferences: profileData.travelPreferences,
        profileComplete: true,
        trustScore: 50,
        updatedAt: new Date().toISOString(),
      };

      let artist = await storage.getArtistByUserId(user.id);

      if (artist) {
        artist = await storage.updateArtist(artist.id, {
          name: profileData.stageName,
          bio: profileData.bio,
          priceFrom: String(profileData.feeMin),
          priceTo: String(profileData.feeMax),
          currency: profileData.currency,
          baseLocation: { name: profileData.location },
          metadata: { ...(artist.metadata as any || {}), ...metadata },
        });

        await storage.createAuditLog({
          who: user.id,
          action: "artist_profile_update",
          entityType: "artist",
          entityId: artist.id,
          context: { stageName: profileData.stageName }
        });
      } else {
        artist = await storage.createArtist({
          userId: user.id,
          name: profileData.stageName,
          bio: profileData.bio,
          priceFrom: String(profileData.feeMin),
          priceTo: String(profileData.feeMax),
          currency: profileData.currency,
          baseLocation: { name: profileData.location },
          metadata: metadata as any,
        });

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
      console.error("CRITICAL ERROR completing profile:", err);
      res.status(500).json({
        message: "Failed to complete profile",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  app.get("/api/artists/profile/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const artist = await storage.getArtistByUserId(user.id);
      const isComplete = (artist?.metadata as any)?.profileComplete === true;
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

      // Prepare booking data
      const bookingData = {
        eventId: eventId || null, // Should be set now if date was provided
        artistId,
        status: "offered" as const, // Default for new offers
        offerAmount: offerAmount ? String(offerAmount) : null,
        offerCurrency: currency || "INR",
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

  // Negotiation Logic
  const handleNegotiation = async (req: any, res: any, action: 'negotiate' | 'accept' | 'decline') => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const booking = await storage.getBooking(id);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      const user = req.user as any;
      const userRole = user.role || (user.metadata as any)?.role || 'artist';
      const isArtist = userRole === 'artist';

      // Verify authorization (Artist owns booking, Organizer owns event)
      // Simplifying check for now since we need `event` fetched to check organizer.
      // Ideally we check `booking.artistId` vs `user.id` (if artist)

      const meta = booking.meta as any || { negotiationRound: 0, history: [] };
      const history = meta.history || [];
      const round = meta.negotiationRound || 1;

      if (action === 'negotiate') {
        const MAX_ROUNDS = 3;
        if (round >= MAX_ROUNDS) {
          return res.status(400).json({ message: "Max negotiation rounds reached. You must Accept or Decline." });
        }

        const { offerAmount, counterOffer, message, slotTime } = req.body;
        const newAmount = counterOffer || offerAmount;

        const newMeta = {
          ...meta,
          negotiationRound: round + (newAmount ? 1 : 0),
          lastOfferBy: userRole,
          slotTime: slotTime || meta.slotTime, // Update slot time if provided
          history: [...history, {
            action: 'negotiate',
            by: userRole,
            offerAmount: newAmount,
            message: message,
            slotTime: slotTime,
            at: new Date().toISOString()
          }]
        };

        const updateData: any = {
          status: 'negotiating',
          meta: newMeta
        };

        if (newAmount) {
          updateData.offerAmount = String(newAmount);
        }

        const updated = await storage.updateBooking(id, updateData);

        await storage.createAuditLog({
          who: user.id,
          action: "negotiation_update",
          entityType: "booking",
          entityId: id,
          context: { amount: newAmount, hasMessage: !!message }
        });

        return res.json(updated);

      } else if (action === 'accept') {
        const newMeta = {
          ...meta,
          history: [...history, { action: 'accepted', by: userRole, at: new Date().toISOString() }]
        };
        const updated = await storage.updateBooking(id, {
          status: 'contracting' as any, // Move to contract stage, not directly to confirmed
          finalAmount: booking.offerAmount, // The last offer amount is final
          meta: newMeta
        });

        await storage.createAuditLog({
          who: user.id,
          action: "negotiation_accepted",
          entityType: "booking",
          entityId: id,
          context: { finalAmount: updated.finalAmount }
        });

        // Auto-initiate contract stage
        try {
          const bookingDetails = await storage.getBookingWithDetails(id);
          const now = new Date();
          const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

          // Check if contract already exists
          const existingContract = await storage.getContractByBookingId(id);
          if (!existingContract) {
            // We'll let the contract routes handle the detailed generation
            // via the ContractViewer component calling /initiate
            console.log(`[Negotiation] Booking ${id} accepted, moved to contracting stage. Contract will be initiated by /initiate endpoint.`);
          }
        } catch (contractErr) {
          console.error("Warning: Failed to prepare contract stage:", contractErr);
        }

        return res.json(updated);

      } else if (action === 'decline') {
        const newMeta = {
          ...meta,
          history: [...history, { action: 'declined', by: userRole, at: new Date().toISOString() }]
        };
        const updated = await storage.updateBooking(id, {
          status: 'cancelled',
          meta: newMeta
        });

        await storage.createAuditLog({
          who: user.id,
          action: "negotiation_declined",
          entityType: "booking",
          entityId: id
        });

        return res.json(updated);
      }
    } catch (error) {
      console.error("Negotiation error:", error);
      res.status(500).json({ message: "Negotiation update failed" });
    }
  };

  app.post("/api/bookings/:id/negotiate", (req, res) => handleNegotiation(req, res, 'negotiate'));
  app.post("/api/bookings/:id/accept", (req, res) => handleNegotiation(req, res, 'accept'));
  app.post("/api/bookings/:id/decline", (req, res) => handleNegotiation(req, res, 'decline'));


  // Artist Apply to Event
  app.post("/api/bookings/apply", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user as any;
      const userRole = user.role || (user.metadata as any)?.role || 'artist';
      if (userRole !== 'artist') {
        return res.status(403).json({ message: "Only artists can apply to events" });
      }

      const { eventId, offerAmount, currency, stageId } = req.body;
      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

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

      // Create booking Inquiry
      const booking = await storage.createBooking({
        eventId,
        artistId: artist.id,
        stageId: stageId || null,
        status: 'inquiry',
        offerAmount: offerAmount ? String(offerAmount) : undefined,
        offerCurrency: currency || 'INR',
        depositPercent: '30.00', // Default
        meta: {
          appliedAt: new Date().toISOString(),
          negotiationRound: 1,
          history: [{
            action: 'applied',
            by: 'artist',
            at: new Date().toISOString(),
            offerAmount: offerAmount,
            stageId: stageId
          }]
        }
      });

      await storage.createAuditLog({
        who: user.id,
        action: "gig_applied",
        entityType: "booking",
        entityId: booking.id,
        context: { eventId, amount: offerAmount }
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error("Error applying to event:", error);
      res.status(500).json({ message: "Failed to apply to event" });
    }
  });

  return httpServer;
}
