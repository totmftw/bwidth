import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertArtistSchema, insertOrganizerSchema, insertVenueSchema } from "@shared/schema";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}.${hash.toString("hex")}`;
}

async function seedDatabase() {
  const existingUsers = await storage.getUserByUsername("admin");
  if (!existingUsers) {
    const password = await hashPassword("password123");
    
    // Create Organizer
    const organizerUser = await storage.createUser({
      username: "organizer",
      password,
      role: "organizer",
      name: "Event Pro",
      email: "organizer@example.com",
      phone: "1234567890"
    });
    await storage.createOrganizer({
      userId: organizerUser.id,
      organizationName: "Global Events Inc",
      website: "https://globalevents.com"
    });

    // Create Artist 1
    const artistUser1 = await storage.createUser({
      username: "artist1",
      password,
      role: "artist",
      name: "DJ Pulse",
      email: "pulse@example.com",
      phone: "0987654321"
    });
    const artist1 = await storage.createArtist({
      userId: artistUser1.id,
      bio: "Electronic music producer and DJ.",
      genre: "Techno",
      secondaryGenres: ["House", "Ambient"],
      feeMin: 500,
      feeMax: 2000,
      verified: true,
      trustScore: 85
    });

    // Create Artist 2
    const artistUser2 = await storage.createUser({
      username: "artist2",
      password,
      role: "artist",
      name: "The Band",
      email: "band@example.com",
      phone: "1122334455"
    });
    await storage.createArtist({
      userId: artistUser2.id,
      bio: "Indie rock band from Austin.",
      genre: "Rock",
      feeMin: 1000,
      feeMax: 5000,
      verified: false,
      trustScore: 60
    });

    // Create Venue
    const venueUser = await storage.createUser({
      username: "venue",
      password,
      role: "venue",
      name: "Club Neon",
      email: "venue@example.com",
      phone: "5556667777"
    });
    const venue = await storage.createVenue({
      userId: venueUser.id,
      name: "Club Neon",
      address: "123 Party St, Downtown",
      capacity: 500,
      musicPolicy: "Electronic, House, Techno",
      trustScore: 90
    });

    // Create Booking
    await storage.createBooking({
      organizerId: 1, // Assuming IDs start at 1
      artistId: 1,
      venueId: 1,
      eventDate: new Date(Date.now() + 86400000 * 7), // 1 week from now
      status: "offered",
      offerAmount: 1500,
      currency: "USD",
      slotTime: "23:00 - 01:00",
      notes: "Main stage headline slot"
    });

    console.log("Database seeded successfully!");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  setupAuth(app);

  // Seed DB
  seedDatabase().catch(console.error);

  // === API ROUTES ===

  // Artists
  app.get(api.artists.list.path, async (req, res) => {
    const artists = await storage.getArtists();
    res.json(artists);
  });

  app.get(api.artists.get.path, async (req, res) => {
    const artist = await storage.getArtist(Number(req.params.id));
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }
    res.json(artist);
  });

  app.put(api.artists.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // TODO: Verify ownership
    const updated = await storage.updateArtist(Number(req.params.id), req.body);
    res.json(updated);
  });

  // Venues
  app.get(api.venues.list.path, async (req, res) => {
    const venues = await storage.getVenues();
    res.json(venues);
  });

  app.get(api.venues.get.path, async (req, res) => {
    const venue = await storage.getVenue(Number(req.params.id));
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }
    res.json(venue);
  });

  // Bookings
  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    
    let bookings = [];
    if (user.role === 'artist') {
      const artist = await storage.getArtistByUserId(user.id);
      if (artist) bookings = await storage.getBookingsByArtist(artist.id);
    } else if (user.role === 'organizer') {
      const organizer = await storage.getOrganizerByUserId(user.id);
      if (organizer) bookings = await storage.getBookingsByOrganizer(organizer.id);
    }
    // Venue role view of bookings could be added here

    res.json(bookings);
  });

  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.bookings.create.input.parse(req.body);
      const booking = await storage.createBooking(input);
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.bookings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const updated = await storage.updateBooking(Number(req.params.id), req.body);
    res.json(updated);
  });

  return httpServer;
}
