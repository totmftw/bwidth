import { db } from "./db";
import {
  users, artists, organizers, venues, bookings, events, promoters, contracts, auditLogs, eventStages, temporaryVenues, media,
  contractVersions, contractEditRequests, contractSignatures, messages, conversations, conversationParticipants,
  roles,
  userRoles,
  payments,
  bookingProposals,
  type User, type Artist, type Organizer, type Venue, type Booking, type Event, type Contract, type AuditLog, type TemporaryVenue,
  type InsertUser, type InsertArtist, type InsertOrganizer, type InsertVenue, type InsertBooking, type InsertContract, type InsertAuditLog, type InsertEvent, type InsertTemporaryVenue,
  type ContractVersion, type InsertContractVersion,
  type ContractEditRequest, type InsertContractEditRequest,
  type ContractSignature, type InsertContractSignature,
  type Message,
  type Payment,
  type BookingProposal, type InsertBookingProposal
} from "@shared/schema";

export interface OrganizerDashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  activeBookings: number;
  pendingNegotiations: number;
  totalSpent: number;
  trustScore: number;
}

export interface BookingSummary {
  totalBookings: number;
  completedBookings: number;
  cancellationRate: number;
  averageBookingValue: number;
}
import { eq, sql, or, and, desc, asc, gt, isNull, inArray, gte } from "drizzle-orm";

export interface IStorage {
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Profiles
  getArtistByUserId(userId: number): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  updateArtist(id: number, artist: Partial<InsertArtist>): Promise<Artist | undefined>;
  getArtists(): Promise<(Artist & { user: User, [key: string]: any })[]>;
  getArtist(id: number): Promise<(Artist & { user: User, [key: string]: any }) | undefined>;

  getOrganizerByUserId(userId: number): Promise<Organizer | undefined>;
  createOrganizer(organizer: InsertOrganizer): Promise<Organizer>;
  updateOrganizer(id: number, data: Partial<InsertOrganizer>): Promise<Organizer>;
  getOrganizer(id: number): Promise<(Organizer & { user: User, [key: string]: any }) | undefined>;

  getVenueByUserId(userId: number): Promise<Venue | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: number, venue: Partial<InsertVenue>): Promise<Venue>;
  getVenues(): Promise<Venue[]>;
  getVenue(id: number): Promise<Venue | undefined>;

  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByArtist(artistId: number): Promise<Booking[]>;
  getBookingsByOrganizer(organizerId: number): Promise<Booking[]>;
  getBookingsByArtistWithDetails(artistId: number): Promise<any[]>;
  getBookingsByOrganizerWithDetails(organizerId: number): Promise<any[]>;
  getBookingsByVenueWithDetails(venueId: number): Promise<any[]>;
  getBookingWithDetails(id: number): Promise<any>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;

  // Booking Proposals
  getBookingProposals(bookingId: number): Promise<BookingProposal[]>;
  getLatestBookingProposal(bookingId: number): Promise<BookingProposal | undefined>;
  createBookingProposal(proposal: InsertBookingProposal): Promise<BookingProposal>;
  getBookingProposalByStep(bookingId: number, step: number): Promise<BookingProposal | undefined>;

  // Opportunities
  getOpportunities(filters?: { genre?: string; minBudget?: number; maxBudget?: number; location?: string }): Promise<Event[]>;
  createEvent(event: InsertEvent & { stages?: any[], temporaryVenue?: any }): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;

  // Contracts
  createContract(contract: InsertContract): Promise<Contract>;
  getContractByBookingId(bookingId: number): Promise<Contract | undefined>;
  getContract(id: number): Promise<Contract | undefined>;
  updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract>;
  getContractWithDetails(id: number): Promise<any>;

  // Contract Versions
  createContractVersion(version: InsertContractVersion): Promise<ContractVersion>;
  getContractVersions(contractId: number): Promise<ContractVersion[]>;
  getLatestContractVersion(contractId: number): Promise<ContractVersion | undefined>;

  // Contract Edit Requests
  createContractEditRequest(editRequest: InsertContractEditRequest): Promise<ContractEditRequest>;
  getContractEditRequests(contractId: number): Promise<ContractEditRequest[]>;
  getPendingEditRequest(contractId: number): Promise<ContractEditRequest | undefined>;
  getContractEditRequest(id: number): Promise<ContractEditRequest | undefined>;
  updateContractEditRequest(id: number, data: Partial<InsertContractEditRequest>): Promise<ContractEditRequest>;

  // Contract Signatures
  createContractSignature(signature: InsertContractSignature): Promise<ContractSignature>;
  getContractSignatures(contractId: number): Promise<ContractSignature[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getRecentActivity(userId: number, limit?: number): Promise<AuditLog[]>;

  // Venue Dashboard
  getVenueUpcomingEvents(venueId: number): Promise<any[]>;
  getVenueDashboardStats(venueId: number): Promise<any>;

  // Organizer Dashboard
  getOrganizerDashboardStats(promoterId: number): Promise<OrganizerDashboardStats>;

  // Organizer Bookings
  getOrganizerBookingSummary(organizerId: number): Promise<BookingSummary>;

  // Organizer Events
  getEventsByOrganizer(organizerId: number, status?: string): Promise<Event[]>;
  hasActiveBookings(eventId: number): Promise<boolean>;
  deleteEvent(eventId: number): Promise<void>;

  // Organizer Payments
  getPaymentsByBooking(bookingId: number): Promise<Payment[]>;
  getOrganizerPaymentTotal(organizerId: number): Promise<number>;

  // Admin Methods
  getAllUsers(): Promise<User[]>;
  updateUserStatus(id: number, status: string): Promise<User>;
  updateUserRole(id: number, role: string): Promise<User>;
  getAllConversations(limit?: number): Promise<any[]>;
  getConversationMessages(id: number): Promise<Message[]>;
  getContractsForAdminReview(): Promise<any[]>;
  reviewContract(contractId: number, adminId: number, status: 'approved' | 'rejected', note?: string): Promise<Contract>;

  // Admin Extended Methods
  getPlatformStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingVerification: number;
    totalArtists: number;
    totalOrganizers: number;
    totalVenues: number;
    totalEvents: number;
    totalBookings: number;
    activeBookings: number;
    pendingContracts: number;
  }>;
  getUserWithProfile(id: number): Promise<any>;
  createUserWithProfile(data: { user: any; role: string; profile?: any }): Promise<any>;
  adminUpdateUser(id: number, data: any): Promise<any>;
  getAdminArtistList(): Promise<any[]>;
  getAdminOrganizerList(): Promise<any[]>;
  getAdminVenueList(): Promise<any[]>;
  getAllEvents(filters?: { status?: string }): Promise<any[]>;
  adminUpdateEvent(id: number, data: any): Promise<any>;
  adminDeleteEvent(id: number): Promise<void>;
  getAllBookings(filters?: { status?: string }): Promise<any[]>;
  adminForceBookingStatus(id: number, status: string, reason: string, adminId: number): Promise<any>;
  getAllContracts(filters?: { status?: string }): Promise<any[]>;
  adminUpdateContract(id: number, data: any): Promise<any>;
  getAuditLogs(filters?: { limit?: number; offset?: number; userId?: number }): Promise<any[]>;

  // Media
  createMedia(data: any): Promise<any>;
  getMediaById(id: number): Promise<any>;
  getMediaByEntity(entityType: string, entityId: number): Promise<any[]>;
  getMediaCountByEntity(entityType: string, entityId: number): Promise<number>;
  deleteMedia(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(usernameOrEmail: string): Promise<User | undefined> {
    const lowerValue = usernameOrEmail.toLowerCase();
    const [user] = await db.select()
      .from(users)
      .where(
        or(
          eq(sql`lower(${users.username})`, lowerValue),
          eq(sql`lower(${users.email})`, lowerValue)
        )
      );
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async getArtistByUserId(userId: number): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.userId, userId));
    return artist;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [newArtist] = await db.insert(artists).values(artist).returning();
    return newArtist;
  }

  async updateArtist(id: number, artist: Partial<InsertArtist>): Promise<Artist | undefined> {
    const [updated] = await db.update(artists).set(artist).where(eq(artists.id, id)).returning();
    return updated;
  }

  async getArtists(): Promise<(Artist & { user: User, [key: string]: any })[]> {
    const result = await db.select({
      artist: artists,
      user: users
    }).from(artists).innerJoin(users, eq(artists.userId, users.id));

    return result.map(({ artist, user }) => {
      const metadata = artist.metadata as any || {};
      return {
        ...artist,
        user: {
          ...user,
          name: user.displayName || user.username || 'User'
        } as any,
        // Flattened fields for frontend compatibility
        genre: metadata.primaryGenre || "",
        secondaryGenres: metadata.secondaryGenres || [],
        feeMin: Number(artist.priceFrom) || 0,
        feeMax: Number(artist.priceTo) || 0,
        location: (artist.baseLocation as any)?.name || metadata.location || "",
        profileComplete: metadata.profileComplete || false,
      };
    });
  }

  async getArtist(id: number): Promise<(Artist & { user: User, [key: string]: any }) | undefined> {
    const [result] = await db.select({
      artist: artists,
      user: users
    }).from(artists).innerJoin(users, eq(artists.userId, users.id)).where(eq(artists.id, id));

    if (result) {
      const { artist, user } = result;
      const metadata = artist.metadata as any || {};
      return {
        ...artist,
        user: {
          ...user,
          name: user.displayName || user.username || 'User'
        } as any,
        // Flattened fields
        genre: metadata.primaryGenre || "",
        secondaryGenres: metadata.secondaryGenres || [],
        feeMin: Number(artist.priceFrom) || 0,
        feeMax: Number(artist.priceTo) || 0,
        location: (artist.baseLocation as any)?.name || metadata.location || "",
        profileComplete: metadata.profileComplete || false,
      };
    }
    return undefined;
  }

  async getOrganizerByUserId(userId: number): Promise<Organizer | undefined> {
    const [organizer] = await db.select().from(promoters).where(eq(promoters.userId, userId));
    return organizer;
  }

  async createOrganizer(organizer: InsertOrganizer): Promise<Organizer> {
    const [newOrganizer] = await db.insert(promoters).values(organizer).returning();
    return newOrganizer;
  }

  async updateOrganizer(id: number, data: Partial<InsertOrganizer>): Promise<Organizer> {
    const [updated] = await db.update(promoters).set({ ...data, updatedAt: new Date() }).where(eq(promoters.id, id)).returning();
    return updated;
  }

  async getOrganizer(id: number): Promise<(Organizer & { user: User, [key: string]: any }) | undefined> {
    const [result] = await db.select({
      promoter: promoters,
      user: users
    }).from(promoters).innerJoin(users, eq(promoters.userId, users.id)).where(eq(promoters.id, id));

    if (result) {
      const { promoter, user } = result;
      return {
        ...promoter,
        user: {
          ...user,
          name: user.displayName || user.username || 'User'
        } as any
      };
    }
    return undefined;
  }

  // Alias for getOrganizer
  async getPromoter(id: number): Promise<(Organizer & { user: User, [key: string]: any }) | undefined> {
    return this.getOrganizer(id);
  }

  async getVenueByUserId(userId: number): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.userId, userId));
    return venue;
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const [newVenue] = await db.insert(venues).values(venue).returning();
    return newVenue;
  }

  async updateVenue(id: number, venue: Partial<InsertVenue>): Promise<Venue> {
    const [updated] = await db.update(venues).set(venue).where(eq(venues.id, id)).returning();
    return updated;
  }

  async getVenues(): Promise<Venue[]> {
    return await db.select().from(venues);
  }

  async getVenue(id: number): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBookingsByArtist(artistId: number): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.artistId, artistId));
  }

  async getBookingsByOrganizer(organizerId: number): Promise<Booking[]> {
    const result = await db.select({ booking: bookings })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(events.organizerId, organizerId));
    return result.map(r => r.booking);
  }

  async getBookingsByArtistWithDetails(artistId: number): Promise<any[]> {
    const bookingsList = await db.select().from(bookings).where(eq(bookings.artistId, artistId));

    const enrichedBookings = await Promise.all(bookingsList.map(async (booking) => {
      let event = null;
      let organizer = null;
      let venue = null;

      if (booking.eventId) {
        const [eventResult] = await db.select().from(events).where(eq(events.id, booking.eventId));
        event = eventResult;

        if (event?.organizerId) {
          organizer = await this.getOrganizer(event.organizerId);
        }

        if (event?.venueId) {
          venue = await this.getVenue(event.venueId);
        }
      }

      const artist = booking.artistId ? await this.getArtist(booking.artistId) : null;

      return {
        ...booking,
        eventDate: event?.startTime || booking.createdAt,
        slotTime: event?.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
        notes: event?.description || null,
        artist: artist || null,
        organizer: organizer || {
          name: 'Organizer',
          organizationName: 'Unknown',
          user: { name: 'Organizer' }
        },
        venue: venue || { name: 'TBD', address: 'Location to be confirmed' },
        event,
      };
    }));

    return enrichedBookings;
  }

  async getBookingsByOrganizerWithDetails(organizerId: number): Promise<any[]> {
    const result = await db.select({ booking: bookings, event: events })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(events.organizerId, organizerId));

    const enrichedBookings = await Promise.all(result.map(async ({ booking, event }) => {
      const artist = booking.artistId ? await this.getArtist(booking.artistId) : null;
      const venue = event.venueId ? await this.getVenue(event.venueId) : null;
      const organizer = await this.getOrganizer(organizerId);

      return {
        ...booking,
        eventDate: event.startTime || booking.createdAt,
        slotTime: event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
        notes: event.description || null,
        artist: artist || { user: { name: 'Unknown Artist' } },
        organizer: organizer || null,
        venue: venue || null,
        event,
      };
    }));

    return enrichedBookings;
  }

  async getBookingsByVenueWithDetails(venueId: number): Promise<any[]> {
    const result = await db.select({ booking: bookings, event: events })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(events.venueId, venueId));

    const enrichedBookings = await Promise.all(result.map(async ({ booking, event }) => {
      const artist = booking.artistId ? await this.getArtist(booking.artistId) : null;
      const organizer = event.organizerId ? await this.getOrganizer(event.organizerId) : null;
      const venue = await this.getVenue(venueId);

      let slotTime = event.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;

      if (booking.stageId) {
        const [stage] = await db.select().from(eventStages).where(eq(eventStages.id, booking.stageId));
        if (stage && stage.startTime) {
          slotTime = `${new Date(stage.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${stage.endTime ? ' - ' + new Date(stage.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}`;
        }
      }

      return {
        ...booking,
        eventDate: event.startTime || booking.createdAt,
        slotTime: slotTime,
        notes: event.description || null,
        artist: artist || { user: { name: 'Unknown Artist' } },
        organizer: organizer || null,
        venue: venue || null,
        event,
      };
    }));

    return enrichedBookings;
  }

  async getBookingWithDetails(id: number): Promise<any> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) return undefined;

    let event = null;
    let organizer = null;
    let venue = null;

    if (booking.eventId) {
      const [eventResult] = await db.select().from(events).where(eq(events.id, booking.eventId));
      event = eventResult;

      if (event?.organizerId) {
        organizer = await this.getOrganizer(event.organizerId);
      }

      if (event?.venueId) {
        venue = await this.getVenue(event.venueId);
      }
    }

    const artist = booking.artistId ? await this.getArtist(booking.artistId) : null;

    return {
      ...booking,
      eventDate: event?.startTime || booking.createdAt,
      slotTime: event?.startTime ? new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
      notes: event?.description || null,
      artist,
      organizer,
      venue,
      event,
    };
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking> {
    const [updated] = await db.update(bookings).set(booking).where(eq(bookings.id, id)).returning();
    return updated;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  // Booking Proposals
  async getBookingProposals(bookingId: number): Promise<BookingProposal[]> {
    return db.query.bookingProposals.findMany({
      where: eq(bookingProposals.bookingId, bookingId),
      orderBy: [asc(bookingProposals.stepNumber), asc(bookingProposals.round)],
    });
  }

  async getLatestBookingProposal(bookingId: number): Promise<BookingProposal | undefined> {
    return db.query.bookingProposals.findFirst({
      where: eq(bookingProposals.bookingId, bookingId),
      orderBy: [desc(bookingProposals.round)],
    });
  }

  async createBookingProposal(proposal: InsertBookingProposal): Promise<BookingProposal> {
    const [created] = await db.insert(bookingProposals).values(proposal).returning();
    return created;
  }

  async getBookingProposalByStep(bookingId: number, step: number): Promise<BookingProposal | undefined> {
    return db.query.bookingProposals.findFirst({
      where: and(
        eq(bookingProposals.bookingId, bookingId),
        eq(bookingProposals.stepNumber, step),
      ),
    });
  }

  async getOpportunities(filters?: { genre?: string; minBudget?: number; maxBudget?: number; location?: string }): Promise<any[]> {
    // Start with base query for published events
    const results = await db
      .select({
        event: events,
        venue: venues,
        organizer: promoters,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(promoters, eq(events.organizerId, promoters.id))
      .where(
        and(
          or(
            eq(events.visibility, 'public'),
            eq(events.status, 'published')
          ),
          or(
            // Event has not yet ended
            gt(events.endTime, new Date()),
            // Or if no end time is specified, the event has not yet started
            and(
              isNull(events.endTime),
              gt(events.startTime, new Date())
            )
          )
        )
      );

    // Fetch stages, venue photos, and temporaryVenue for all events
    const resultsWithStages = await Promise.all(results.map(async (r) => {
      const stages = await db.select().from(eventStages).where(eq(eventStages.eventId, r.event.id));
      
      // Fetch venue photos from media table if a venue is linked
      let venuePhotos: any[] = [];
      if (r.venue?.id) {
        venuePhotos = await db
          .select()
          .from(media)
          .where(
            and(
              eq(media.entityType, 'venue'),
              eq(media.entityId, r.venue.id)
            )
          );
      }

      // Fetch temporaryVenue record if no registered venue
      let tempVenue = null;
      if (!r.event.venueId) {
        const [tv] = await db
          .select()
          .from(temporaryVenues)
          .where(eq(temporaryVenues.eventId, r.event.id));
        tempVenue = tv || null;
      }

      return {
        ...r.event,
        venue: r.venue ? { ...r.venue, photos: venuePhotos } : null,
        temporaryVenue: tempVenue,
        organizer: r.organizer,
        stages: stages || [],
      };
    }));

    return resultsWithStages;
  }

  async getEvent(id: number): Promise<any | undefined> {
    const [result] = await db
      .select({
        event: events,
        venue: venues,
        organizer: promoters,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .leftJoin(promoters, eq(events.organizerId, promoters.id))
      .where(eq(events.id, id));

    if (!result) return undefined;

    const stages = await db.select().from(eventStages).where(eq(eventStages.eventId, id));

    return {
      ...result.event,
      venue: result.venue,
      organizer: result.organizer,
      stages,
    };
  }

  async createEvent(event: InsertEvent & { stages?: any[], temporaryVenue?: any }): Promise<Event> {
    const { stages, temporaryVenue, ...eventData } = event;
    const [newEvent] = await db.insert(events).values(eventData).returning();

    if (stages && stages.length > 0) {
      const stagesWithEventId = stages.map(stage => ({
        ...stage,
        eventId: newEvent.id
      }));
      await db.insert(eventStages).values(stagesWithEventId);
    }
    
    if (temporaryVenue) {
      await db.insert(temporaryVenues).values({
        ...temporaryVenue,
        eventId: newEvent.id
      });
    }

    return newEvent;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event> {
    const [updated] = await db.update(events).set(event).where(eq(events.id, id)).returning();
    return updated;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async getContractByBookingId(bookingId: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.bookingId, bookingId));
    return contract;
  }

  async getContract(id: number): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async updateContract(id: number, contract: Partial<InsertContract>): Promise<Contract> {
    const [updated] = await db.update(contracts).set(contract).where(eq(contracts.id, id)).returning();
    return updated;
  }

  async getContractWithDetails(id: number): Promise<any> {
    const contract = await this.getContract(id);
    if (!contract) return undefined;

    const versions = await this.getContractVersions(id);
    const editRequests = await this.getContractEditRequests(id);
    const signatures = await this.getContractSignatures(id);
    const booking = contract.bookingId ? await this.getBookingWithDetails(contract.bookingId) : null;

    return {
      ...contract,
      versions,
      editRequests,
      signatures,
      booking,
    };
  }

  // Contract Versions
  async createContractVersion(version: InsertContractVersion): Promise<ContractVersion> {
    const [newVersion] = await db.insert(contractVersions).values(version).returning();
    return newVersion;
  }

  async getContractVersions(contractId: number): Promise<ContractVersion[]> {
    return await db.select().from(contractVersions)
      .where(eq(contractVersions.contractId, contractId))
      .orderBy(contractVersions.version);
  }

  async getLatestContractVersion(contractId: number): Promise<ContractVersion | undefined> {
    const [version] = await db.select().from(contractVersions)
      .where(eq(contractVersions.contractId, contractId))
      .orderBy(desc(contractVersions.version))
      .limit(1);
    return version;
  }

  // Contract Edit Requests
  async createContractEditRequest(editRequest: InsertContractEditRequest): Promise<ContractEditRequest> {
    const [newRequest] = await db.insert(contractEditRequests).values(editRequest).returning();
    return newRequest;
  }

  async getContractEditRequests(contractId: number): Promise<ContractEditRequest[]> {
    return await db.select().from(contractEditRequests)
      .where(eq(contractEditRequests.contractId, contractId))
      .orderBy(desc(contractEditRequests.createdAt));
  }

  async getPendingEditRequest(contractId: number): Promise<ContractEditRequest | undefined> {
    const [request] = await db.select().from(contractEditRequests)
      .where(and(
        eq(contractEditRequests.contractId, contractId),
        eq(contractEditRequests.status, 'pending')
      ));
    return request;
  }

  async getContractEditRequest(id: number): Promise<ContractEditRequest | undefined> {
    const [request] = await db.select().from(contractEditRequests).where(eq(contractEditRequests.id, id));
    return request;
  }

  async updateContractEditRequest(id: number, data: Partial<InsertContractEditRequest>): Promise<ContractEditRequest> {
    const [updated] = await db.update(contractEditRequests).set(data).where(eq(contractEditRequests.id, id)).returning();
    return updated;
  }

  // Contract Signatures
  async createContractSignature(signature: InsertContractSignature): Promise<ContractSignature> {
    const [newSig] = await db.insert(contractSignatures).values(signature).returning();
    return newSig;
  }

  async getContractSignatures(contractId: number): Promise<ContractSignature[]> {
    return await db.select().from(contractSignatures)
      .where(eq(contractSignatures.contractId, contractId));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getRecentActivity(userId: number, limit: number = 10): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.who, userId))
      .orderBy(desc(auditLogs.occurredAt))
      .limit(limit);
  }

  async getVenueUpcomingEvents(venueId: number): Promise<any[]> {
    const results = await db
      .select({
        event: events,
        booking: bookings,
        artist: artists,
      })
      .from(events)
      .leftJoin(bookings, eq(events.id, bookings.eventId))
      .leftJoin(artists, eq(bookings.artistId, artists.id))
      .where(eq(events.venueId, venueId))
      .orderBy(sql`${events.startTime} asc`);

    return results.map(r => ({
      id: r.event.id,
      title: r.event.title,
      artist: r.artist?.name || "TBA",
      date: r.event.startTime,
      slot: (r.booking?.meta as any)?.slot || "TBA",
      status: r.booking?.status === 'confirmed' ? 'confirmed' : 'pending',
    }));
  }

  async getVenueDashboardStats(venueId: number): Promise<any> {
    const now = new Date();

    const [allEvents] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.venueId, venueId));

    const [upcomingEventsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(sql`${events.venueId} = ${venueId} AND ${events.startTime} > ${now}`);

    const [artistsBookedCount] = await db
      .select({ count: sql<number>`count(distinct ${bookings.artistId})` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(events.venueId, venueId));

    const [pendingRequestsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(sql`${events.venueId} = ${venueId} AND ${bookings.status} = 'inquiry'`);

    return {
      totalShowsHosted: Number(allEvents?.count || 0),
      upcomingShows: Number(upcomingEventsCount?.count || 0),
      artistsBooked: Number(artistsBookedCount?.count || 0),
      budgetUtilization: await (async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [row] = await db
          .select({ total: sql<string>`COALESCE(SUM(${bookings.offerAmount}::numeric), 0)` })
          .from(bookings)
          .innerJoin(events, eq(bookings.eventId, events.id))
          .where(and(
            eq(events.venueId, venueId),
            inArray(bookings.status, ['confirmed', 'paid_deposit', 'completed'] as any[]),
            gte(bookings.createdAt, startOfMonth)
          ));
        return Number(row?.total ?? 0);
      })(),
      trustScore: await (async () => {
        const [venue] = await db.select().from(venues).where(eq(venues.id, venueId));
        return (venue?.metadata as any)?.trustScore ?? 50;
      })(),
      pendingRequests: Number(pendingRequestsCount?.count || 0),
    };
  }

  async getOrganizerDashboardStats(promoterId: number): Promise<OrganizerDashboardStats> {
    const now = new Date();

    // Count total events by organizer
    const [totalEventsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.organizerId, promoterId));

    // Count upcoming events (start_time > now)
    const [upcomingEventsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(sql`${events.organizerId} = ${promoterId} AND ${events.startTime} > ${now}`);

    // Count active bookings (non-terminal statuses: not cancelled, completed, refunded)
    const [activeBookingsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(
        sql`${events.organizerId} = ${promoterId} AND ${bookings.status} NOT IN ('cancelled', 'completed', 'refunded')`
      );

    // Count negotiating bookings
    const [negotiatingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(
        sql`${events.organizerId} = ${promoterId} AND ${bookings.status} = 'negotiating'`
      );

    // Sum completed payment amounts for organizer's bookings
    const [totalSpentResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(
        sql`${events.organizerId} = ${promoterId} AND ${payments.status} = 'captured'`
      );

    // Read trustScore from promoter metadata
    const [promoter] = await db
      .select({ metadata: promoters.metadata })
      .from(promoters)
      .where(eq(promoters.id, promoterId));

    const metadata = (promoter?.metadata as Record<string, any>) || {};
    const trustScore = typeof metadata.trustScore === 'number' ? metadata.trustScore : 0;

    return {
      totalEvents: Number(totalEventsResult?.count || 0),
      upcomingEvents: Number(upcomingEventsResult?.count || 0),
      activeBookings: Number(activeBookingsResult?.count || 0),
      pendingNegotiations: Number(negotiatingResult?.count || 0),
      totalSpent: parseFloat(totalSpentResult?.total || '0'),
      trustScore,
    };
  }

  async getEventsByOrganizer(organizerId: number, status?: string): Promise<Event[]> {
    const conditions = [eq(events.organizerId, organizerId)];
    if (status) {
      conditions.push(eq(events.status, status));
    }
    return await db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(asc(events.startTime));
  }

  async hasActiveBookings(eventId: number): Promise<boolean> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        sql`${bookings.eventId} = ${eventId} AND ${bookings.status} NOT IN ('cancelled', 'completed', 'refunded')`
      );
    return Number(result?.count || 0) > 0;
  }

  async deleteEvent(eventId: number): Promise<void> {
    await db.delete(events).where(eq(events.id, eventId));
  }

  async getOrganizerBookingSummary(organizerId: number): Promise<BookingSummary> {
    // Count total bookings for organizer's events
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(events.organizerId, organizerId));

    const totalBookings = Number(totalResult?.count || 0);

    // Count completed bookings
    const [completedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(
        sql`${events.organizerId} = ${organizerId} AND ${bookings.status} = 'completed'`
      );

    const completedBookings = Number(completedResult?.count || 0);

    // Count cancelled bookings
    const [cancelledResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(
        sql`${events.organizerId} = ${organizerId} AND ${bookings.status} = 'cancelled'`
      );

    const cancelledBookings = Number(cancelledResult?.count || 0);

    // Calculate cancellation rate (handle division by zero)
    const cancellationRate = totalBookings > 0
      ? (cancelledBookings / totalBookings) * 100
      : 0;

    // Calculate average booking value from completed bookings' finalAmount
    const [avgResult] = await db
      .select({ avg: sql<string>`COALESCE(AVG(${bookings.finalAmount}), 0)` })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(
        sql`${events.organizerId} = ${organizerId} AND ${bookings.status} = 'completed'`
      );

    const averageBookingValue = parseFloat(avgResult?.avg || '0');

    return {
      totalBookings,
      completedBookings,
      cancellationRate,
      averageBookingValue,
    };
  }

  // Organizer Payments
  async getPaymentsByBooking(bookingId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId));
  }

  async getOrganizerPaymentTotal(organizerId: number): Promise<number> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
      .from(payments)
      .innerJoin(bookings, eq(payments.bookingId, bookings.id))
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(
        sql`${events.organizerId} = ${organizerId} AND ${payments.status} = 'captured'`
      );
    return parseFloat(result?.total || '0');
  }

  // Admin Methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserStatus(userId: number, status: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    const [updated] = await db.update(users)
      .set({
        metadata: sql`jsonb_set(metadata, '{role}', '"${sql.raw(role)}"')`,
        // Note: We also need to update user_roles association if strictly followed,
        // but currently we rely on `user.role` accessor or metadata for simplicity in some parts.
        // Ideally we should update the roles table.
        // Let's assume schema has a role column or we use user_roles.
        // Checking schema: roles table and user_roles table exist. users table has NO role column.
        // Wait, getUserRole helper uses `user.metadata.role`?
        // Let's settle on updating metadata AND user_roles if possible.
      })
      .where(eq(users.id, id))
      .returning();

    // Also update the user_roles table
    // verify role exists first
    const [roleRecord] = await db.select().from(roles).where(eq(roles.name, role as any));
    if (roleRecord) {
      await db.delete(userRoles).where(eq(userRoles.userId, id));
      await db.insert(userRoles).values({ userId: id, roleId: roleRecord.id });
    }

    return updated;
  }

  async getAllConversations(limit: number = 50): Promise<any[]> {
    const results = await db.query.conversations.findMany({
      orderBy: desc(conversations.lastMessageAt),
      limit,
      with: {
        participants: {
          with: {
            user: true
          }
        },
        workflowInstance: true
      }
    });

    return results.map(c => ({
      ...c,
      participantNames: (c.participants as any[]).map(p => p.user.displayName || p.user.username).join(", ")
    }));
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: desc(messages.createdAt),
      with: {
        sender: true
      }
    });
  }

  async getContractsForAdminReview(): Promise<Contract[]> {
    const results = await db.select({
      contract: contracts,
      booking: bookings,
      artist: artists,
      artistUser: users,
    })
      .from(contracts)
      .innerJoin(bookings, eq(contracts.bookingId, bookings.id))
      .leftJoin(artists, eq(bookings.artistId, artists.id))
      .leftJoin(users, eq(artists.userId, users.id))
      .where(eq(contracts.status, 'admin_review'))
      .orderBy(desc(contracts.updatedAt));

    return results.map(r => ({
      ...r.contract,
      booking: r.booking,
      artistName: r.artistUser?.displayName || r.artistUser?.username || 'Unknown Artist'
    }));
  }

  async reviewContract(contractId: number, adminId: number, status: 'approved' | 'rejected', note?: string): Promise<Contract> {
    const now = new Date();
    const updateData: any = {
      adminReviewedBy: adminId,
      adminReviewedAt: now,
      adminReviewStatus: status,
      adminReviewNote: note,
      updatedAt: now
    };

    if (status === 'approved') {
      updateData.status = 'signed';
      updateData.finalizedAt = now;
    } else {
      updateData.status = 'voided'; // Or back to negotiation? For now, voided or specific rejected status
      // If rejected, maybe we want to allow re-negotiation, but schema supports voided mostly.
      // Let's keep it simple: if rejected by admin, it's failed.
    }

    const [updated] = await db
      .update(contracts)
      .set(updateData)
      .where(eq(contracts.id, contractId))
      .returning();

    return updated;
  }

  // -------------------------------------------------------------------------
  // Admin Extended Methods
  // -------------------------------------------------------------------------

  async getPlatformStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    pendingVerification: number;
    totalArtists: number;
    totalOrganizers: number;
    totalVenues: number;
    totalEvents: number;
    totalBookings: number;
    activeBookings: number;
    pendingContracts: number;
  }> {
    const [totalUsersRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [activeUsersRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.status, 'active'));

    const [pendingVerificationRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.status, 'pending_verification'));

    const [totalArtistsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(artists);

    const [totalOrganizersRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(promoters);

    const [totalVenuesRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(venues);

    const [totalEventsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events);

    const [totalBookingsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings);

    const [activeBookingsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(
        sql`${bookings.status} NOT IN ('cancelled', 'completed', 'refunded')`
      );

    const [pendingContractsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contracts)
      .where(eq(contracts.status, 'admin_review'));

    return {
      totalUsers: Number(totalUsersRow?.count || 0),
      activeUsers: Number(activeUsersRow?.count || 0),
      pendingVerification: Number(pendingVerificationRow?.count || 0),
      totalArtists: Number(totalArtistsRow?.count || 0),
      totalOrganizers: Number(totalOrganizersRow?.count || 0),
      totalVenues: Number(totalVenuesRow?.count || 0),
      totalEvents: Number(totalEventsRow?.count || 0),
      totalBookings: Number(totalBookingsRow?.count || 0),
      activeBookings: Number(activeBookingsRow?.count || 0),
      pendingContracts: Number(pendingContractsRow?.count || 0),
    };
  }

  async getUserWithProfile(id: number): Promise<any> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const metadata = (user.metadata as any) || {};
    const role = metadata.role as string | undefined;

    let profile: any = null;
    if (role === 'artist') {
      profile = await this.getArtistByUserId(id);
    } else if (role === 'organizer' || role === 'promoter') {
      profile = await this.getOrganizerByUserId(id);
    } else if (role === 'venue_manager') {
      profile = await this.getVenueByUserId(id);
    }

    return { ...user, profile, role };
  }

  async createUserWithProfile(data: { user: any; role: string; profile?: any }): Promise<any> {
    const { user: userData, role, profile } = data;

    const [newUser] = await db.insert(users).values({
      ...userData,
      metadata: { ...(userData.metadata || {}), role },
    }).returning();

    // Insert into user_roles table if the role record exists
    const [roleRecord] = await db.select().from(roles).where(eq(roles.name, role as any));
    if (roleRecord) {
      await db.insert(userRoles).values({ userId: newUser.id, roleId: roleRecord.id });
    }

    let profileRecord: any = null;
    if (role === 'artist') {
      const [newArtist] = await db.insert(artists).values({
        userId: newUser.id,
        name: newUser.displayName || newUser.username || 'Artist',
        ...(profile || {}),
      }).returning();
      profileRecord = newArtist;
    } else if (role === 'organizer' || role === 'promoter') {
      const [newPromoter] = await db.insert(promoters).values({
        userId: newUser.id,
        name: newUser.displayName || newUser.username || 'Organizer',
        ...(profile || {}),
      }).returning();
      profileRecord = newPromoter;
    } else if (role === 'venue_manager') {
      if (profile?.name) {
        const [newVenue] = await db.insert(venues).values({
          userId: newUser.id,
          name: profile.name,
          ...(profile || {}),
        }).returning();
        profileRecord = newVenue;
      }
    }

    return { user: newUser, profile: profileRecord };
  }

  async adminUpdateUser(id: number, data: any): Promise<any> {
    const { role, ...userFields } = data;

    const updatePayload: any = { ...userFields, updatedAt: new Date() };

    if (role) {
      const existingUser = await this.getUser(id);
      const existingMeta = (existingUser?.metadata as any) || {};
      updatePayload.metadata = { ...existingMeta, role };
    }

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, id))
      .returning();

    if (role) {
      const [roleRecord] = await db.select().from(roles).where(eq(roles.name, role as any));
      if (roleRecord) {
        await db.delete(userRoles).where(eq(userRoles.userId, id));
        await db.insert(userRoles).values({ userId: id, roleId: roleRecord.id });
      }
    }

    return updated;
  }

  async getAdminArtistList(): Promise<any[]> {
    const results = await db.select({
      artist: artists,
      user: users,
    })
      .from(artists)
      .innerJoin(users, eq(artists.userId, users.id))
      .orderBy(desc(artists.createdAt));

    return results.map(({ artist, user }) => {
      const meta = (artist.metadata as any) || {};
      return {
        id: artist.id,
        userId: artist.userId,
        name: artist.name,
        category: artist.artistCategory,
        priceFrom: artist.priceFrom,
        priceTo: artist.priceTo,
        ratingAvg: artist.ratingAvg,
        createdAt: artist.createdAt,
        metadata: meta,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          status: user.status,
        },
      };
    });
  }

  async getAdminOrganizerList(): Promise<any[]> {
    const results = await db.select({
      promoter: promoters,
      user: users,
    })
      .from(promoters)
      .innerJoin(users, eq(promoters.userId, users.id))
      .orderBy(desc(promoters.createdAt));

    return results.map(({ promoter, user }) => ({
      id: promoter.id,
      userId: promoter.userId,
      name: promoter.name,
      contactPerson: promoter.contactPerson,
      createdAt: promoter.createdAt,
      metadata: promoter.metadata,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
      },
    }));
  }

  async getAdminVenueList(): Promise<any[]> {
    const results = await db.select({
      venue: venues,
      user: users,
    })
      .from(venues)
      .leftJoin(users, eq(venues.userId, users.id))
      .orderBy(desc(venues.createdAt));

    return results.map(({ venue, user }) => ({
      id: venue.id,
      userId: venue.userId,
      name: venue.name,
      capacity: venue.capacity,
      cityId: venue.cityId,
      createdAt: venue.createdAt,
      metadata: venue.metadata,
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            status: user.status,
          }
        : null,
    }));
  }

  async getAllEvents(filters?: { status?: string }): Promise<any[]> {
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(eq(events.status, filters.status));
    }

    const results = await db.select({
      event: events,
      organizer: promoters,
      venue: venues,
    })
      .from(events)
      .leftJoin(promoters, eq(events.organizerId, promoters.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(events.startTime));

    return results.map(({ event, organizer, venue }) => ({
      ...event,
      organizer: organizer || null,
      venue: venue || null,
    }));
  }

  async adminUpdateEvent(id: number, data: any): Promise<any> {
    const [updated] = await db
      .update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updated;
  }

  async adminDeleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getAllBookings(filters?: { status?: string }): Promise<any[]> {
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(eq(bookings.status, filters.status as any));
    }

    const results = await db.select({
      booking: bookings,
      event: events,
      artist: artists,
      artistUser: users,
      organizer: promoters,
    })
      .from(bookings)
      .leftJoin(events, eq(bookings.eventId, events.id))
      .leftJoin(artists, eq(bookings.artistId, artists.id))
      .leftJoin(users, eq(artists.userId, users.id))
      .leftJoin(promoters, eq(events.organizerId, promoters.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bookings.createdAt));

    return results.map(({ booking, event, artist, artistUser, organizer }) => ({
      ...booking,
      event: event || null,
      artist: artist
        ? {
            ...artist,
            user: artistUser
              ? {
                  id: artistUser.id,
                  displayName: artistUser.displayName,
                  username: artistUser.username,
                }
              : null,
          }
        : null,
      organizer: organizer || null,
    }));
  }

  async adminForceBookingStatus(id: number, status: string, reason: string, adminId: number): Promise<any> {
    const [updated] = await db
      .update(bookings)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    await this.createAuditLog({
      who: adminId,
      action: 'admin_booking_status_forced',
      entityType: 'booking',
      entityId: id,
      context: { status, reason },
    });

    return updated;
  }

  async getAllContracts(filters?: { status?: string }): Promise<any[]> {
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(eq(contracts.status, filters.status as any));
    }

    const results = await db.select({
      contract: contracts,
      booking: bookings,
      artist: artists,
      artistUser: users,
    })
      .from(contracts)
      .leftJoin(bookings, eq(contracts.bookingId, bookings.id))
      .leftJoin(artists, eq(bookings.artistId, artists.id))
      .leftJoin(users, eq(artists.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(contracts.updatedAt));

    return results.map(({ contract, booking, artist, artistUser }) => ({
      ...contract,
      booking: booking || null,
      artist: artist
        ? {
            ...artist,
            user: artistUser
              ? {
                  id: artistUser.id,
                  displayName: artistUser.displayName,
                  username: artistUser.username,
                }
              : null,
          }
        : null,
    }));
  }

  async adminUpdateContract(id: number, data: any): Promise<any> {
    const [updated] = await db
      .update(contracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated;
  }

  async getAuditLogs(filters?: { limit?: number; offset?: number; userId?: number }): Promise<any[]> {
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const conditions: any[] = [];
    if (filters?.userId) {
      conditions.push(eq(auditLogs.who, filters.userId));
    }

    return await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.occurredAt))
      .limit(limit)
      .offset(offset);
  }

  // =========================================================================
  // Media
  // =========================================================================

  async createMedia(data: any): Promise<any> {
    const [record] = await db.insert(media).values(data).returning();
    return record;
  }

  async getMediaById(id: number): Promise<any> {
    const [record] = await db.select().from(media).where(eq(media.id, id));
    return record;
  }

  async getMediaByEntity(entityType: string, entityId: number): Promise<any[]> {
    return await db
      .select()
      .from(media)
      .where(and(eq(media.entityType, entityType), eq(media.entityId, entityId)))
      .orderBy(asc(media.uploadedAt));
  }

  async getMediaCountByEntity(entityType: string, entityId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(media)
      .where(and(eq(media.entityType, entityType), eq(media.entityId, entityId)));
    return Number(result.count);
  }

  async deleteMedia(id: number): Promise<void> {
    await db.delete(media).where(eq(media.id, id));
  }
}

export const storage = new DatabaseStorage();
