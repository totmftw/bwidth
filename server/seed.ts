import { db } from "./db";
import { currencies, events, promoters, roles, userRoles, users, venues, notificationTypes, notificationChannels } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}.${buf.toString("hex")}`;
}

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

    // Ensure roles exist (admin + platform_admin + staff)
    await db.insert(roles).values([
        { name: "admin", description: "Platform administrator" },
        { name: "platform_admin", description: "Super admin with all privileges" },
        { name: "staff", description: "Platform staff member" },
    ]).onConflictDoNothing();

    // App Admin (SuperUser) - kept for backwards compat
    const superUserPasswordHash = await hashPassword("music app");
    const [superUser] = await db.insert(users).values({
        username: "musicapp",
        displayName: "App Admin",
        email: "admin@musicapp.com",
        passwordHash: superUserPasswordHash,
        status: "active",
        metadata: { role: "platform_admin" },
    }).onConflictDoUpdate({
        target: users.username,
        set: {
            displayName: "App Admin",
            email: "admin@musicapp.com",
            passwordHash: superUserPasswordHash,
            status: "active",
            metadata: { role: "platform_admin" },
        },
    }).returning();

    if (superUser) {
        const [platformAdminRole] = await db.select().from(roles).where(sql`name = 'platform_admin'`).limit(1);
        if (platformAdminRole) {
            await db.insert(userRoles).values({
                userId: superUser.id,
                roleId: platformAdminRole.id,
            }).onConflictDoNothing();
        }
    }

    console.log(`✅ Created/updated superuser 'musicapp'`);

    // Primary Admin User
    await db.insert(roles).values([
        { name: "admin", description: "Platform administrator" },
    ]).onConflictDoNothing();

    const adminPasswordHash = await hashPassword("581321");
    const [adminUser] = await db.insert(users).values({
        username: "admin",
        displayName: "BANDWIDTH Admin",
        email: "admin@bandwidth.in",
        passwordHash: adminPasswordHash,
        status: "active",
        metadata: { role: "admin" },
    }).onConflictDoUpdate({
        target: users.username,
        set: {
            displayName: "BANDWIDTH Admin",
            email: "admin@bandwidth.in",
            passwordHash: adminPasswordHash,
            status: "active",
            metadata: { role: "admin" },
        },
    }).returning();

    if (adminUser) {
        const [adminRole] = await db.select().from(roles).where(sql`name = 'admin'`).limit(1);
        if (adminRole) {
            await db.insert(userRoles).values({
                userId: adminUser.id,
                roleId: adminRole.id,
            }).onConflictDoNothing();
        }
    }

    console.log(`✅ Created/updated admin user 'admin' (password: 581321)`);

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

    // ========================================================================
    // NOTIFICATION CHANNELS & TYPES
    // ========================================================================

    const existingChannels = await db.select().from(notificationChannels);
    if (existingChannels.length === 0) {
        await db.insert(notificationChannels).values([
            { channel: "in_app", enabled: true, config: { soundEnabled: true } },
            { channel: "email", enabled: false, config: {} },
            { channel: "sms", enabled: false, config: {} },
            { channel: "push", enabled: false, config: {} },
        ]);
        console.log("✅ Seeded notification channels");
    } else {
        console.log("⏭️ Notification channels already exist");
    }

    const existingTypes = await db.select().from(notificationTypes);
    if (existingTypes.length === 0) {
        const defaultTypes = [
            // Booking events
            { key: "booking.application_received", category: "booking", label: "Artist Application Received", description: "Sent to the organizer when an artist applies to their event", titleTemplate: "New application from {{artistName}}", bodyTemplate: "{{artistName}} has applied to perform at {{eventTitle}}. Review their proposal.", targetRoles: ["organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "booking.offer_sent", category: "booking", label: "Booking Offer Sent", description: "Sent to the artist when an organizer sends them an offer", titleTemplate: "New offer for {{eventTitle}}", bodyTemplate: "You've received an offer to perform at {{eventTitle}}. Review the details.", targetRoles: ["artist"], channels: ["in_app"], priority: "normal" as const },
            { key: "booking.status_changed", category: "booking", label: "Booking Status Changed", description: "Sent when a booking status transitions", titleTemplate: "Booking updated: {{eventTitle}}", bodyTemplate: "Your booking for {{eventTitle}} has been updated to {{newStatus}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "booking.confirmed", category: "booking", label: "Booking Confirmed", description: "Sent when a booking is confirmed", titleTemplate: "Booking confirmed: {{eventTitle}}", bodyTemplate: "The booking for {{eventTitle}} has been confirmed. Contract will be generated shortly.", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "urgent" as const },
            { key: "booking.cancelled", category: "booking", label: "Booking Cancelled", description: "Sent when a booking is cancelled or expired", titleTemplate: "Booking cancelled: {{eventTitle}}", bodyTemplate: "The booking for {{eventTitle}} has been cancelled. Reason: {{reason}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "booking.deadline_approaching", category: "booking", label: "Booking Deadline Approaching", description: "Sent when a booking flow deadline is approaching", titleTemplate: "Action needed: {{eventTitle}}", bodyTemplate: "The deadline for responding to {{eventTitle}} is approaching. Please take action.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },

            // Negotiation events
            { key: "negotiation.proposal_received", category: "negotiation", label: "New Proposal Received", description: "Sent when the other party submits a counter-proposal", titleTemplate: "New proposal for {{eventTitle}}", bodyTemplate: "{{actorName}} has submitted a proposal for {{eventTitle}}. It's your turn to respond.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "negotiation.accepted", category: "negotiation", label: "Negotiation Accepted", description: "Sent when the other party accepts the proposal", titleTemplate: "Proposal accepted: {{eventTitle}}", bodyTemplate: "{{actorName}} has accepted the proposal for {{eventTitle}}. Moving to contracting.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "negotiation.declined", category: "negotiation", label: "Negotiation Declined", description: "Sent when a party walks away from negotiation", titleTemplate: "Negotiation ended: {{eventTitle}}", bodyTemplate: "{{actorName}} has walked away from the negotiation for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "negotiation.deadline_warning", category: "negotiation", label: "Negotiation Deadline Warning", description: "Sent when negotiation deadline is approaching", titleTemplate: "Respond soon: {{eventTitle}}", bodyTemplate: "The negotiation for {{eventTitle}} needs your response before the deadline.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },

            // Contract events
            { key: "contract.generated", category: "contract", label: "Contract Generated", description: "Sent to organizer when contract is auto-generated", titleTemplate: "Contract ready: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} has been generated and is ready for your review.", targetRoles: ["organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "contract.edit_submitted", category: "contract", label: "Contract Edit Submitted", description: "Sent when the other party submits contract edits", titleTemplate: "Contract edited: {{eventTitle}}", bodyTemplate: "{{actorName}} has submitted edits to the contract for {{eventTitle}}. Please review.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "contract.ready_to_sign", category: "contract", label: "Contract Ready to Sign", description: "Sent when contract edits are complete and ready for signing", titleTemplate: "Sign contract: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} is ready for your signature.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "contract.signed", category: "contract", label: "Contract Signed", description: "Sent when one party signs the contract", titleTemplate: "Contract signed: {{eventTitle}}", bodyTemplate: "{{actorName}} has signed the contract for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "contract.fully_signed", category: "contract", label: "Contract Fully Signed", description: "Sent to admin when both parties have signed", titleTemplate: "Contract awaiting review: {{eventTitle}}", bodyTemplate: "Both parties have signed the contract for {{eventTitle}}. Admin review required.", targetRoles: ["admin"], channels: ["in_app"], priority: "urgent" as const },
            { key: "contract.admin_approved", category: "contract", label: "Contract Approved by Admin", description: "Sent when admin approves the contract", titleTemplate: "Contract approved: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} has been approved. The booking is now official!", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "contract.voided", category: "contract", label: "Contract Voided", description: "Sent when a contract is voided", titleTemplate: "Contract voided: {{eventTitle}}", bodyTemplate: "The contract for {{eventTitle}} has been voided. Reason: {{reason}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "urgent" as const },

            // Payment events
            { key: "payment.received", category: "payment", label: "Payment Received", description: "Sent when a payment is received", titleTemplate: "Payment received: {{amount}}", bodyTemplate: "A payment of {{amount}} has been received for {{eventTitle}}.", targetRoles: ["artist", "organizer"], channels: ["in_app"], priority: "normal" as const },
            { key: "payment.deposit_due", category: "payment", label: "Deposit Due", description: "Sent when a deposit payment is due", titleTemplate: "Deposit due: {{eventTitle}}", bodyTemplate: "A deposit payment is due for {{eventTitle}}. Please process the payment.", targetRoles: ["organizer"], channels: ["in_app"], priority: "urgent" as const },
            { key: "payout.processed", category: "payment", label: "Payout Processed", description: "Sent when an artist payout is processed", titleTemplate: "Payout processed: {{amount}}", bodyTemplate: "Your payout of {{amount}} for {{eventTitle}} has been processed.", targetRoles: ["artist"], channels: ["in_app"], priority: "normal" as const },

            // System events
            { key: "system.announcement", category: "system", label: "Platform Announcement", description: "Admin broadcast to all users or specific roles", titleTemplate: "{{title}}", bodyTemplate: "{{message}}", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "normal" as const },
            { key: "profile.reminder", category: "system", label: "Profile Completion Reminder", description: "Sent to users with incomplete profiles", titleTemplate: "Complete your profile", bodyTemplate: "Your profile is incomplete. Complete it to start discovering opportunities.", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "normal" as const },
            { key: "system.welcome", category: "system", label: "Welcome Notification", description: "Sent to new users after registration", titleTemplate: "Welcome to BANDWIDTH!", bodyTemplate: "Welcome to BANDWIDTH! Complete your profile to get started.", targetRoles: ["artist", "organizer", "venue_manager"], channels: ["in_app"], priority: "normal" as const },
        ];

        await db.insert(notificationTypes).values(defaultTypes);
        console.log(`✅ Seeded ${defaultTypes.length} notification types`);
    } else {
        console.log("⏭️ Notification types already exist");
    }

    console.log("✨ Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
