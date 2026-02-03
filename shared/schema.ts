import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["artist", "organizer", "venue", "admin"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "offered", "accepted", "rejected", "contracted", "completed", "cancelled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artists = pgTable("artists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  bio: text("bio"),
  genre: text("genre"),
  secondaryGenres: text("secondary_genres").array(),
  feeMin: integer("fee_min"),
  feeMax: integer("fee_max"),
  instagram: text("instagram"),
  soundcloud: text("soundcloud"),
  verified: boolean("verified").default(false),
  trustScore: integer("trust_score").default(50),
});

export const organizers = pgTable("organizers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  organizationName: text("organization_name"),
  website: text("website"),
  trustScore: integer("trust_score").default(50),
});

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  capacity: integer("capacity"),
  musicPolicy: text("music_policy"),
  trustScore: integer("trust_score").default(50),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  organizerId: integer("organizer_id").references(() => organizers.id).notNull(),
  artistId: integer("artist_id").references(() => artists.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id),
  eventDate: timestamp("event_date").notNull(),
  status: bookingStatusEnum("status").default("pending"),
  offerAmount: integer("offer_amount"),
  currency: text("currency").default("USD"),
  slotTime: text("slot_time"), // e.g., "22:00 - 00:00"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  artist: one(artists, {
    fields: [users.id],
    references: [artists.userId],
  }),
  organizer: one(organizers, {
    fields: [users.id],
    references: [organizers.userId],
  }),
  venue: one(venues, {
    fields: [users.id],
    references: [venues.userId],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  artist: one(artists, {
    fields: [bookings.artistId],
    references: [artists.id],
  }),
  organizer: one(organizers, {
    fields: [bookings.organizerId],
    references: [organizers.id],
  }),
  venue: one(venues, {
    fields: [bookings.venueId],
    references: [venues.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertArtistSchema = createInsertSchema(artists).omit({ id: true, userId: true, verified: true, trustScore: true });
export const insertOrganizerSchema = createInsertSchema(organizers).omit({ id: true, userId: true, trustScore: true });
export const insertVenueSchema = createInsertSchema(venues).omit({ id: true, userId: true, trustScore: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true });

export type User = typeof users.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type Organizer = typeof organizers.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
