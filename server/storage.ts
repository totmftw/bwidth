import { db } from "./db";
import {
  users, artists, organizers, venues, bookings, events, promoters, contracts, auditLogs, eventStages,
  contractVersions, contractEditRequests, contractSignatures, messages, conversations, conversationParticipants,
  roles,
  userRoles,
  type User, type Artist, type Organizer, type Venue, type Booking, type Event, type Contract, type AuditLog,
  type InsertUser, type InsertArtist, type InsertOrganizer, type InsertVenue, type InsertBooking, type InsertContract, type InsertAuditLog, type InsertEvent,
  type ContractVersion, type InsertContractVersion,
  type ContractEditRequest, type InsertContractEditRequest,
  type ContractSignature, type InsertContractSignature,
  type Message
} from "@shared/schema";
import { eq, sql, or, and, desc } from "drizzle-orm";

export interface IStorage {
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Profiles
  getArtistByUserId(userId: number): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  updateArtist(id: number, artist: Partial<InsertArtist>): Promise<Artist>;
  getArtists(): Promise<(Artist & { user: User, [key: string]: any })[]>;
  getArtist(id: number): Promise<(Artist & { user: User, [key: string]: any }) | undefined>;

  getOrganizerByUserId(userId: number): Promise<Organizer | undefined>;
  createOrganizer(organizer: InsertOrganizer): Promise<Organizer>;
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

  // Opportunities
  getOpportunities(filters?: { genre?: string; minBudget?: number; maxBudget?: number; location?: string }): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
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

  // Venue Dashboard
  getVenueUpcomingEvents(venueId: number): Promise<any[]>;
  getVenueDashboardStats(venueId: number): Promise<any>;
  // Admin Methods
  getAllUsers(): Promise<User[]>;
  updateUserStatus(id: number, status: string): Promise<User>;
  updateUserRole(id: number, role: string): Promise<User>;
  getAllConversations(limit?: number): Promise<any[]>;
  getConversationMessages(id: number): Promise<Message[]>;
  getContractsForAdminReview(): Promise<any[]>;
  reviewContract(contractId: number, adminId: number, status: 'approved' | 'rejected', note?: string): Promise<Contract>;
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

  async getArtistByUserId(userId: number): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.userId, userId));
    return artist;
  }

  async createArtist(artist: InsertArtist): Promise<Artist> {
    const [newArtist] = await db.insert(artists).values(artist).returning();
    return newArtist;
  }

  async updateArtist(id: number, artist: Partial<InsertArtist>): Promise<Artist> {
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
        or(
          eq(events.visibility, 'public'),
          eq(events.status, 'published')
        )
      );

    // Fetch stages for all events
    const resultsWithStages = await Promise.all(results.map(async (r) => {
      const stages = await db.select().from(eventStages).where(eq(eventStages.eventId, r.event.id));
      return {
        ...r.event,
        venue: r.venue,
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

  async createEvent(event: InsertEvent & { stages?: any[] }): Promise<Event> {
    const { stages, ...eventData } = event;
    const [newEvent] = await db.insert(events).values(eventData).returning();

    if (stages && stages.length > 0) {
      const stagesWithEventId = stages.map(stage => ({
        ...stage,
        eventId: newEvent.id
      }));
      await db.insert(eventStages).values(stagesWithEventId);
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
      budgetUtilization: 45000, // Mock for now
      trustScore: 88, // Mock for now
      pendingRequests: Number(pendingRequestsCount?.count || 0),
    };
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
}

export const storage = new DatabaseStorage();
