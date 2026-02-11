import { db } from "./db";
import { users, venues, artists, events, bookings, promoters, currencies } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedVenueDashboard() {
    console.log("🌱 Seeding Venue Dashboard data...");

    // 1. Ensure Currencies
    const existingINR = await db.select().from(currencies).where(eq(currencies.currencyCode, "INR"));
    if (existingINR.length === 0) {
        await db.insert(currencies).values({
            currencyCode: "INR",
            name: "Indian Rupee",
            symbol: "₹",
            precision: 2,
        });
    }

    // 2. Create Venue Manager
    let venueManager = (await db.select().from(users).where(eq(users.username, "venue_manager")))[0];
    if (!venueManager) {
        [venueManager] = await db.insert(users).values({
            username: "venue_manager",
            email: "manager@bluefrog.com",
            displayName: "Venue Manager",
            status: "active",
            metadata: { role: "venue_manager" },
        }).returning();
    }

    // 3. Create Venue
    let venue = (await db.select().from(venues).where(eq(venues.name, "Blue Frog Mumbai")))[0];
    if (!venue) {
        [venue] = await db.insert(venues).values({
            userId: venueManager.id,
            name: "Blue Frog Mumbai",
            description: "Iconic live music venue and club.",
            capacity: 500,
            address: { street: "Mathuradas Mills", city: "Mumbai" },
            timezone: "Asia/Kolkata",
        }).returning();
    }

    // 4. Create Organizer (Promoter)
    let promoter = (await db.select().from(promoters).where(eq(promoters.name, "Blue Frog Productions")))[0];
    if (!promoter) {
        [promoter] = await db.insert(promoters).values({
            userId: venueManager.id,
            name: "Blue Frog Productions",
            description: "In-house programming team.",
        }).returning();
    }

    // 5. Create Artists
    const artistNames = ["DJ Shadow", "The Electric Duo", "Ambient Collective"];
    const dbArtists = [];
    for (const name of artistNames) {
        let artistUser = (await db.select().from(users).where(eq(users.username, name.toLowerCase().replace(/ /g, "_"))))[0];
        if (!artistUser) {
            [artistUser] = await db.insert(users).values({
                username: name.toLowerCase().replace(/ /g, "_"),
                email: `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
                displayName: name,
                status: "active",
                metadata: { role: "artist" },
            }).returning();
        }

        let artist = (await db.select().from(artists).where(eq(artists.userId, artistUser.id)))[0];
        if (!artist) {
            [artist] = await db.insert(artists).values({
                userId: artistUser.id,
                name: name,
                bio: `Bio for ${name}`,
            }).returning();
        }
        dbArtists.push(artist);
    }

    // 6. Create Events & Bookings
    const eventTemplates = [
        {
            title: "Friday Night Sessions",
            artist: dbArtists[0], // DJ Shadow
            date: new Date(new Date().setDate(new Date().getDate() + 3)),
            slot: "9PM - 12AM",
            status: "confirmed"
        },
        {
            title: "Weekend Vibes",
            artist: dbArtists[1], // The Electric Duo
            date: new Date(new Date().setDate(new Date().getDate() + 5)),
            slot: "10PM - 2AM",
            status: "pending"
        },
        {
            title: "Sunday Chill",
            artist: dbArtists[2], // Ambient Collective
            date: new Date(new Date().setDate(new Date().getDate() + 7)),
            slot: "6PM - 10PM",
            status: "confirmed"
        }
    ];

    for (const template of eventTemplates) {
        let event = (await db.select().from(events).where(eq(events.title, template.title)))[0];
        if (!event) {
            const startTime = new Date(template.date);
            // Simplified time handling for seed
            startTime.setHours(21, 0, 0, 0);

            const endTime = new Date(startTime);
            endTime.setHours(startTime.getHours() + 3);

            [event] = await db.insert(events).values({
                organizerId: promoter.id,
                venueId: venue.id,
                title: template.title,
                description: `Experience ${template.title} at ${venue.name}`,
                startTime: startTime,
                endTime: endTime,
                status: "published",
            }).returning();

            await db.insert(bookings).values({
                eventId: event.id,
                artistId: template.artist.id,
                status: template.status === 'confirmed' ? 'confirmed' : 'negotiating',
                offerAmount: "15000.00",
                offerCurrency: "INR",
                meta: { slot: template.slot }
            });

            console.log(`✅ Seeded event and booking for: ${template.title}`);
        } else {
            console.log(`⏭️ Event already exists: ${template.title}`);
        }
    }

    console.log("✨ Seeding complete!");
    process.exit(0);
}

seedVenueDashboard().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
