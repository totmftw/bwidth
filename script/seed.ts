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
        const adminPassword = await hashPassword("admin123");

        const [adminUser] = await db.insert(users).values({
            username: "admin",
            email: "admin@musicplatform.com",
            passwordHash: adminPassword,
            displayName: "Platform Admin",
            firstName: "Admin",
            lastName: "User",
            status: "active",
            currency: "INR",
            locale: "en-IN",
            timezone: "Asia/Kolkata",
        }).onConflictDoUpdate({
            target: users.username,
            set: { passwordHash: adminPassword }
        }).returning();

        if (adminUser) {
            // Get admin role
            const adminRoleResult = await db.select().from(roles).where(sql`name = 'admin'`).limit(1);
            if (adminRoleResult.length > 0) {
                await db.insert(userRoles).values({
                    userId: adminUser.id,
                    roleId: adminRoleResult[0].id,
                }).onConflictDoNothing();
                console.log("✓ Admin user created");
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
