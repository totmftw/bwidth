import { db } from "../server/db";
import {
    currencies,
    locales,
    timezones,
    countries,
    states,
    cities,
    roles,
    genres,
    users,
    userRoles,
    systemSettings,
    notificationTypes,
    notificationChannels,
} from "../shared/schema";
import { sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}.${buf.toString("hex")}`;
}

async function seed() {
    console.log("🌱 Starting database seed...\n");

    try {
        // Enable UUID extension (legacy support, optional)
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        console.log("✓ UUID extension enabled");

        // ========================================================================
        // SEED CURRENCIES
        // ========================================================================
        console.log("\n📊 Seeding currencies...");
        await db.insert(currencies).values([
            { currencyCode: "INR", name: "Indian Rupee", symbol: "₹", precision: 2 },
            { currencyCode: "USD", name: "US Dollar", symbol: "$", precision: 2 },
            { currencyCode: "EUR", name: "Euro", symbol: "€", precision: 2 },
            { currencyCode: "GBP", name: "British Pound", symbol: "£", precision: 2 },
            { currencyCode: "AUD", name: "Australian Dollar", symbol: "A$", precision: 2 },
        ]).onConflictDoNothing();
        console.log("✓ Currencies seeded");

        // ========================================================================
        // SEED LOCALES
        // ========================================================================
        console.log("\n🌍 Seeding locales...");
        await db.insert(locales).values([
            { localeCode: "en-IN", displayName: "English (India)" },
            { localeCode: "hi-IN", displayName: "Hindi (India)" },
            { localeCode: "en-US", displayName: "English (United States)" },
            { localeCode: "en-GB", displayName: "English (United Kingdom)" },
        ]).onConflictDoNothing();
        console.log("✓ Locales seeded");

        // ========================================================================
        // SEED TIMEZONES
        // ========================================================================
        console.log("\n🕐 Seeding timezones...");
        await db.insert(timezones).values([
            { tzName: "Asia/Kolkata" },
            { tzName: "America/New_York" },
            { tzName: "Europe/London" },
            { tzName: "Australia/Sydney" },
            { tzName: "Asia/Dubai" },
        ]).onConflictDoNothing();
        console.log("✓ Timezones seeded");

        // ========================================================================
        // SEED GEOGRAPHY
        // ========================================================================
        console.log("\n🌏 Seeding geography data...");

        // Countries
        const [india] = await db.insert(countries).values([
            { name: "India", iso2: "IN", iso3: "IND", currencyCode: "INR" },
        ]).returning().onConflictDoNothing();

        if (india) {
            // States
            const [karnataka] = await db.insert(states).values([
                { countryId: india.countryId, name: "Karnataka" },
            ]).returning().onConflictDoNothing();

            const [maharashtra] = await db.insert(states).values([
                { countryId: india.countryId, name: "Maharashtra" },
            ]).returning().onConflictDoNothing();

            const [delhi] = await db.insert(states).values([
                { countryId: india.countryId, name: "Delhi" },
            ]).returning().onConflictDoNothing();

            // Cities
            if (karnataka) {
                await db.insert(cities).values([
                    { stateId: karnataka.stateId, name: "Bangalore", lat: "12.9716", lon: "77.5946" },
                    { stateId: karnataka.stateId, name: "Mysore", lat: "12.2958", lon: "76.6394" },
                ]).onConflictDoNothing();
            }

            if (maharashtra) {
                await db.insert(cities).values([
                    { stateId: maharashtra.stateId, name: "Mumbai", lat: "19.0760", lon: "72.8777" },
                    { stateId: maharashtra.stateId, name: "Pune", lat: "18.5204", lon: "73.8567" },
                ]).onConflictDoNothing();
            }

            if (delhi) {
                await db.insert(cities).values([
                    { stateId: delhi.stateId, name: "New Delhi", lat: "28.6139", lon: "77.2090" },
                ]).onConflictDoNothing();
            }
        }
        console.log("✓ Geography data seeded");

        // ========================================================================
        // SEED ROLES
        // ========================================================================
        console.log("\n👥 Seeding roles...");
        await db.insert(roles).values([
            { name: "artist", description: "Artist or DJ performing at events" },
            { name: "band_manager", description: "Manager representing artists/bands" },
            { name: "promoter", description: "Event promoter" },
            { name: "organizer", description: "Event organizer" },
            { name: "venue_manager", description: "Venue or club manager" },
            { name: "admin", description: "Platform administrator" },
            { name: "platform_admin", description: "Super admin with all privileges" },
            { name: "staff", description: "Platform staff member" },
        ]).onConflictDoNothing();
        console.log("✓ Roles seeded");

        // ========================================================================
        // SEED GENRES
        // ========================================================================
        console.log("\n🎵 Seeding music genres...");
        await db.insert(genres).values([
            { name: "Techno", slug: "techno" },
            { name: "House", slug: "house" },
            { name: "Trance", slug: "trance" },
            { name: "Progressive House", slug: "progressive-house" },
            { name: "Deep House", slug: "deep-house" },
            { name: "Tech House", slug: "tech-house" },
            { name: "Dubstep", slug: "dubstep" },
            { name: "Drum & Bass", slug: "drum-and-bass" },
            { name: "Electronica", slug: "electronica" },
            { name: "Ambient", slug: "ambient" },
            { name: "Hip Hop", slug: "hip-hop" },
            { name: "Rock", slug: "rock" },
            { name: "Indie", slug: "indie" },
            { name: "Jazz", slug: "jazz" },
            { name: "Blues", slug: "blues" },
        ]).onConflictDoNothing();
        console.log("✓ Genres seeded");

        // ========================================================================
        // SEED ADMIN USER
        // ========================================================================
        console.log("\n🔐 Creating admin user...");
        const adminPassword = await hashPassword("581321");

        const [adminUser] = await db.insert(users).values({
            username: "admin",
            email: "admin@bandwidth.in",
            passwordHash: adminPassword,
            displayName: "BANDWIDTH Admin",
            firstName: "Admin",
            lastName: "User",
            status: "active",
            currency: "INR",
            locale: "en-IN",
            timezone: "Asia/Kolkata",
            metadata: { role: "admin" },
        }).onConflictDoUpdate({
            target: users.username,
            set: {
                passwordHash: adminPassword,
                email: "admin@bandwidth.in",
                displayName: "BANDWIDTH Admin",
                metadata: { role: "admin" },
            }
        }).returning();

        if (adminUser) {
            // Get admin role
            const adminRoleResult = await db.select().from(roles).where(sql`name = 'admin'`).limit(1);
            if (adminRoleResult.length > 0) {
                await db.insert(userRoles).values({
                    userId: adminUser.id,
                    roleId: adminRoleResult[0].id,
                }).onConflictDoNothing();
                console.log("✓ Admin user created (admin / 581321)");
            }
        }

        // ========================================================================
        // SEED PLATFORM SUPERUSER
        // ========================================================================
        console.log("\n🔐 Creating platform superuser...");
        const platformAdminPassword = await hashPassword("music app");

        const [platformAdminUser] = await db.insert(users).values({
            username: "musicapp",
            email: "admin@musicapp.com",
            passwordHash: platformAdminPassword,
            displayName: "App Admin",
            firstName: "App",
            lastName: "Admin",
            status: "active",
            currency: "INR",
            locale: "en-IN",
            timezone: "Asia/Kolkata",
            metadata: { role: "platform_admin" },
        }).onConflictDoUpdate({
            target: users.username,
            set: {
                passwordHash: platformAdminPassword,
                email: "admin@musicapp.com",
                displayName: "App Admin",
                metadata: { role: "platform_admin" },
            }
        }).returning();

        if (platformAdminUser) {
            const platformAdminRoleResult = await db.select().from(roles).where(sql`name = 'platform_admin'`).limit(1);
            if (platformAdminRoleResult.length > 0) {
                await db.insert(userRoles).values({
                    userId: platformAdminUser.id,
                    roleId: platformAdminRoleResult[0].id,
                }).onConflictDoNothing();
                console.log("✓ Platform superuser created (musicapp / music app)");
            }
        }

        // ========================================================================
        // SEED TEST USERS
        // ========================================================================
        console.log("\n🧪 Creating test users...");
        const testPassword = await hashPassword("password123");

        // 1. Test Artist
        const [testArtistUser] = await db.insert(users).values({
            username: "testartist",
            email: "artist@test.com",
            passwordHash: testPassword,
            displayName: "Test Artist",
            firstName: "Test",
            lastName: "Artist",
            status: "active",
            metadata: { role: "artist" }
        }).onConflictDoUpdate({
            target: users.username,
            set: { passwordHash: testPassword }
        }).returning();

        if (testArtistUser) {
            const artistRole = await db.select().from(roles).where(sql`name = 'artist'`).limit(1);
            if (artistRole.length > 0) {
                await db.insert(userRoles).values({ userId: testArtistUser.id, roleId: artistRole[0].id }).onConflictDoNothing();
            }

            // Create Artist Profile
            const { artists } = await import("../shared/schema");
            await db.insert(artists).values({
                userId: testArtistUser.id,
                name: "Test Artist",
                bio: "A versatile electronic music producer and DJ.",
                priceFrom: "50000",
                priceTo: "150000",
                currency: "INR",
                metadata: {
                    primaryGenre: "Techno",
                    secondaryGenres: ["House", "Electronica"],
                    profileComplete: true
                }
            });
            console.log("✓ Test artist created (testartist / password123)");
        }

        // 2. Test Organizer
        const [testOrganizerUser] = await db.insert(users).values({
            username: "testorganizer",
            email: "organizer@test.com",
            passwordHash: testPassword,
            displayName: "Test Organizer",
            firstName: "Test",
            lastName: "Organizer",
            status: "active",
            metadata: { role: "organizer" }
        }).onConflictDoUpdate({
            target: users.username,
            set: { passwordHash: testPassword }
        }).returning();

        if (testOrganizerUser) {
            const organizerRole = await db.select().from(roles).where(sql`name = 'organizer'`).limit(1);
            if (organizerRole.length > 0) {
                await db.insert(userRoles).values({ userId: testOrganizerUser.id, roleId: organizerRole[0].id }).onConflictDoNothing();
            }

            // Create Promoter Profile
            const { promoters } = await import("../shared/schema");
            await db.insert(promoters).values({
                userId: testOrganizerUser.id,
                name: "Test Events Co.",
                description: "Organizing the best underground parties.",
                contactPerson: { name: "Test Organizer", email: "organizer@test.com" }
            });
            console.log("✓ Test organizer created (testorganizer / password123)");
        }

        // ========================================================================
        // SEED SYSTEM SETTINGS
        // ========================================================================
        console.log("\n⚙️  Seeding system settings...");
        await db.insert(systemSettings).values([
            {
                key: "platform.commission_rate",
                value: { default: 0.05, min: 0.02, max: 0.05 },
                description: "Platform commission rate (2-5%)",
            },
            {
                key: "booking.max_negotiation_rounds",
                value: { value: 3 },
                description: "Maximum negotiation rounds allowed",
            },
            {
                key: "booking.negotiation_response_hours",
                value: { value: 48 },
                description: "Hours allowed for negotiation response",
            },
            {
                key: "contract.signing_deadline_hours",
                value: { value: 48 },
                description: "Hours allowed for contract signing",
            },
            {
                key: "payment.default_deposit_percent",
                value: { value: 30 },
                description: "Default deposit percentage",
            },
            {
                key: "trust_score.initial",
                value: { value: 50 },
                description: "Initial trust score for new users",
            },
        ]).onConflictDoNothing();
        console.log("✓ System settings seeded");

        console.log("\n✅ Database seeding completed successfully!\n");

    // ========================================================================
    // NOTIFICATION CHANNELS & TYPES
    // ========================================================================
    console.log("\n📣 Seeding notification channels & types...");

    const existingChannels = await db.select().from(notificationChannels);
    if (existingChannels.length === 0) {
        await db.insert(notificationChannels).values([
            { channel: "in_app", enabled: true, config: { soundEnabled: true } },
            { channel: "email", enabled: false, config: {} },
            { channel: "sms", enabled: false, config: {} },
            { channel: "push", enabled: false, config: {} },
        ]);
        console.log("✓ Notification channels seeded");
    } else {
        console.log("⏭️  Notification channels already exist");
    }

    const existingTypes = await db.select().from(notificationTypes);
    if (existingTypes.length === 0) {
        const defaultTypes = [
            { key: "booking.application_received", category: "booking", label: "Artist Application Received", description: "Sent to organizer when an artist applies", titleTemplate: "New application from {{artistName}}", bodyTemplate: "{{artistName}} has applied to perform at {{eventTitle}}.", targetRoles: ["organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "booking.offer_sent", category: "booking", label: "Booking Offer Sent", description: "Sent to artist when organizer sends an offer", titleTemplate: "New offer for {{eventTitle}}", bodyTemplate: "You've received an offer to perform at {{eventTitle}}.", targetRoles: ["artist"], channels: ["in_app"], priority: "normal" as const },
            { key: "booking.status_changed", category: "booking", label: "Booking Status Changed", description: "Sent when booking status transitions", titleTemplate: "Booking updated: {{eventTitle}}", bodyTemplate: "Your booking for {{eventTitle}} has been updated to {{newStatus}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "booking.confirmed", category: "booking", label: "Booking Confirmed", description: "Sent when a booking is confirmed", titleTemplate: "Booking confirmed: {{eventTitle}}", bodyTemplate: "The booking for {{eventTitle}} has been confirmed.", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "urgent" as const },
            { key: "booking.cancelled", category: "booking", label: "Booking Cancelled", description: "Sent when a booking is cancelled", titleTemplate: "Booking cancelled: {{eventTitle}}", bodyTemplate: "The booking for {{eventTitle}} has been cancelled.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "booking.deadline_approaching", category: "booking", label: "Deadline Approaching", description: "Sent when booking deadline nears", titleTemplate: "Action needed: {{eventTitle}}", bodyTemplate: "The deadline for {{eventTitle}} is approaching.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "negotiation.proposal_received", category: "negotiation", label: "Proposal Received", description: "Sent when other party submits proposal", titleTemplate: "New proposal for {{eventTitle}}", bodyTemplate: "{{actorName}} has submitted a proposal for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "negotiation.accepted", category: "negotiation", label: "Negotiation Accepted", description: "Sent when proposal is accepted", titleTemplate: "Proposal accepted: {{eventTitle}}", bodyTemplate: "{{actorName}} accepted the proposal for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "negotiation.declined", category: "negotiation", label: "Negotiation Declined", description: "Sent when a party walks away", titleTemplate: "Negotiation ended: {{eventTitle}}", bodyTemplate: "{{actorName}} walked away from negotiation for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "negotiation.deadline_warning", category: "negotiation", label: "Negotiation Deadline Warning", description: "Sent when negotiation deadline nears", titleTemplate: "Respond soon: {{eventTitle}}", bodyTemplate: "The negotiation for {{eventTitle}} needs your response.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "contract.generated", category: "contract", label: "Contract Generated", description: "Sent when contract is auto-generated", titleTemplate: "Contract ready: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} is ready for review.", targetRoles: ["organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "contract.edit_submitted", category: "contract", label: "Contract Edit Submitted", description: "Sent when other party submits edits", titleTemplate: "Contract edited: {{eventTitle}}", bodyTemplate: "{{actorName}} submitted edits to the contract for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "contract.ready_to_sign", category: "contract", label: "Contract Ready to Sign", description: "Sent when contract is ready for signing", titleTemplate: "Sign contract: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} is ready for your signature.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "contract.signed", category: "contract", label: "Contract Signed", description: "Sent when one party signs", titleTemplate: "Contract signed: {{eventTitle}}", bodyTemplate: "{{actorName}} has signed the contract for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "contract.fully_signed", category: "contract", label: "Contract Fully Signed", description: "Sent to admin when both parties sign", titleTemplate: "Contract awaiting review: {{eventTitle}}", bodyTemplate: "Both parties signed the contract for {{eventTitle}}. Admin review required.", targetRoles: ["admin"], channels: ["in_app"], priority: "urgent" as const },
            { key: "contract.admin_approved", category: "contract", label: "Contract Approved", description: "Sent when admin approves contract", titleTemplate: "Contract approved: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} has been approved!", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "contract.voided", category: "contract", label: "Contract Voided", description: "Sent when contract is voided", titleTemplate: "Contract voided: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} has been voided.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "payment.received", category: "payment", label: "Payment Received", description: "Sent when payment is received", titleTemplate: "Payment received: {{amount}}", bodyTemplate: "A payment of {{amount}} received for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "payment.deposit_due", category: "payment", label: "Deposit Due", description: "Sent when deposit is due", titleTemplate: "Deposit due: {{eventTitle}}", bodyTemplate: "A deposit payment is due for {{eventTitle}}.", targetRoles: ["organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "payout.processed", category: "payment", label: "Payout Processed", description: "Sent when payout is processed", titleTemplate: "Payout processed: {{amount}}", bodyTemplate: "Your payout of {{amount}} for {{eventTitle}} has been processed.", targetRoles: ["artist"], channels: ["in_app"], priority: "normal" as const },
            { key: "system.announcement", category: "system", label: "Platform Announcement", description: "Admin broadcast to users", titleTemplate: "{{title}}", bodyTemplate: "{{message}}", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "normal" as const },
            { key: "profile.reminder", category: "system", label: "Profile Reminder", description: "Incomplete profile reminder", titleTemplate: "Complete your profile", bodyTemplate: "Your profile is incomplete. Complete it to discover opportunities.", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "normal" as const },
            { key: "system.welcome", category: "system", label: "Welcome", description: "Sent to new users", titleTemplate: "Welcome to BANDWIDTH!", bodyTemplate: "Welcome to BANDWIDTH! Complete your profile to get started.", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "normal" as const },
        ];
        await db.insert(notificationTypes).values(defaultTypes);
        console.log(`✓ ${defaultTypes.length} notification types seeded`);
    } else {
        console.log("⏭️  Notification types already exist");
    }

    } catch (error) {
        console.error("\n❌ Error seeding database:", error);
        throw error;
    }
}

// Run seed
seed()
    .then(() => {
        console.log("Exiting...");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    });

export default seed;
