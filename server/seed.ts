import { db } from "./db";
import { users, promoters, venues, events, currencies } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
    console.log("🌱 Seeding comprehensive data...");

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

    // 2. Create a system user if none exists
    let systemUser = (await db.select().from(users).where(eq(users.username, "system_admin")))[0];
    if (!systemUser) {
        [systemUser] = await db.insert(users).values({
            username: "system_admin",
            email: "admin@bharat-erp.com",
            displayName: "System Administrator",
            status: "active",
            metadata: { role: "admin" },
        }).returning();
    }

    // 3. Create Promoters
    const promoterData = [
        { name: "Only Much Louder (OML)", description: "India's premier artist management and event agency responsible for NH7 Weekender." },
        { name: "Percept Live", description: "The live entertainment wing of Percept, creators of Sunburn Festival." },
        { name: "BookMyShow Live", description: "Live events division of India's biggest ticketing platform." }
    ];

    const dbPromoters = [];
    for (const p of promoterData) {
        let existing = (await db.select().from(promoters).where(eq(promoters.name, p.name)))[0];
        if (!existing) {
            [existing] = await db.insert(promoters).values({
                userId: systemUser.id,
                name: p.name,
                description: p.description,
            }).returning();
        }
        dbPromoters.push(existing);
    }

    // 4. Create Venues
    const venueData = [
        { name: "Alsisar Mahal", description: "A 17th-century palace in the heart of Rajasthan, home to Magnetic Fields.", capacity: 5000 },
        { name: "Embassy International Riding School", description: "Bangalore's premium outdoor event space, host to Echoes of Earth.", capacity: 10000 },
        { name: "Mahalaxmi Race Course", description: "Iconic Mumbai venue for massive city-wide concerts.", capacity: 30000 },
        { name: "Vagator Beach Arena", description: "The heartbeat of Goa's music scene.", capacity: 40000 }
    ];

    const dbVenues = [];
    for (const v of venueData) {
        let existing = (await db.select().from(venues).where(eq(venues.name, v.name)))[0];
        if (!existing) {
            [existing] = await db.insert(venues).values({
                userId: systemUser.id,
                name: v.name,
                description: v.description,
                capacity: v.capacity,
                timezone: "Asia/Kolkata",
            }).returning();
        }
        dbVenues.push(existing);
    }

    // 5. Create Events
    const eventData = [
        {
            title: "Magnetic Fields Festival 2026",
            description: "A magical musical carnival in the desert. Expect the best in underground electronic and indie music.",
            organizerId: dbPromoters[0].id, // OML
            venueId: dbVenues[0].id, // Alsisar Mahal
            startTime: new Date("2026-12-11T16:00:00Z"),
            endTime: new Date("2026-12-13T23:59:59Z"),
            status: "published",
            capacityTotal: 5000,
            metadata: { genre: "Electronic, Indie", tags: ["Castle", "Boutique", "Desert"] }
        },
        {
            title: "Echoes of the Earth",
            description: "India's first ecologically crafted music festival. Celebrating art, culture, and nature.",
            organizerId: dbPromoters[1].id, // Percept
            venueId: dbVenues[1].id, // Bangalore Riding School
            startTime: new Date("2026-11-21T11:00:00Z"),
            endTime: new Date("2026-11-22T22:00:00Z"),
            status: "published",
            capacityTotal: 10000,
            metadata: { genre: "Global Fusion, Rock", tags: ["Sustainable", "Nature", "Bangalore"] }
        },
        {
            title: "Sunburn Festival Goa 2026",
            description: "The ultimate EDM extravaganza on the shores of Vagator. Asia's biggest music festival is back.",
            organizerId: dbPromoters[1].id, // Percept
            venueId: dbVenues[3].id, // Vagator
            startTime: new Date("2026-12-28T14:00:00Z"),
            endTime: new Date("2026-12-30T23:59:59Z"),
            status: "published",
            capacityTotal: 40000,
            metadata: { genre: "EDM, House, Techno", tags: ["Beach", "EDM", "Party"] }
        },
        {
            title: "Lollapalooza India 2026",
            description: "The Indian edition of the legendary global festival. Multi-genre madness in the heart of Mumbai.",
            organizerId: dbPromoters[2].id, // BookMyShow
            venueId: dbVenues[2].id, // Mahalaxmi Race Course
            startTime: new Date("2026-01-24T12:00:00Z"),
            endTime: new Date("2026-01-25T23:00:00Z"),
            status: "published",
            capacityTotal: 30000,
            metadata: { genre: "Pop, Rock, HipHop", tags: ["Mumbai", "Global", "Multi-genre"] }
        }
    ];

    for (const e of eventData) {
        const existing = (await db.select().from(events).where(eq(events.title, e.title)))[0];
        if (!existing) {
            await db.insert(events).values(e);
            console.log(`✅ Seeded event: ${e.title}`);
        } else {
            console.log(`⏭️ Event already exists: ${e.title}`);
        }
    }

    console.log("✨ Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
