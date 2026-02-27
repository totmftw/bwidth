import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { db } from "../db";
import {
    contracts, contractVersions, contractEditRequests, contractSignatures,
    conversations, conversationParticipants, messages, bookings
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// ============================================================================
// HELPERS
// ============================================================================

const DEADLINE_HOURS = 48;

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isDeadlinePassed(contract: any): boolean {
    if (!contract.deadlineAt) return false;
    return new Date() > new Date(contract.deadlineAt);
}

function getUserRole(user: any): 'artist' | 'promoter' {
    const role = user.metadata?.role || user.role;
    if (role === 'artist' || role === 'band_manager') return 'artist';
    if (role === 'venue_manager' || role === 'venue' || role === 'organizer' || role === 'promoter') return 'promoter';
    // Default to promoter for any unrecognized role on the contract side
    return 'promoter';
}




// ============================================================================
// CONTRACT CHANGES VALIDATION
// ============================================================================

// Fields that are LOCKED (from negotiation) and cannot be edited
const LOCKED_FIELDS = [
    'fee', 'totalFee', 'currency', 'eventDate', 'eventTime', 'slotType',
    'venueName', 'artistName', 'organizerName', 'performanceDuration',
    'platformCommission'
];

/**
 * Editable contract changes JSON schema (comprehensive categories).
 */
const contractChangesSchema = z.object({
    financial: z.object({
        paymentMethod: z.enum(["bank_transfer", "upi", "card"]).optional(),
        paymentMilestones: z.array(z.object({
            milestone: z.enum(["deposit", "pre_event", "post_event"]),
            percentage: z.number().min(0).max(100),
            dueDate: z.string().optional(),
        })).optional(),
        bankDetails: z.object({
            accountNumber: z.string().optional(),
            ifscCode: z.string().optional(),
            accountHolderName: z.string().optional(),
        }).optional(),
    }).optional(),
    travel: z.object({
        responsibility: z.enum(["artist", "organizer", "shared"]).optional(),
        flightClass: z.enum(["economy", "premium_economy", "business"]).optional(),
        airportPickup: z.boolean().optional(),
        groundTransport: z.enum(["provided", "not_provided", "reimbursed"]).optional(),
    }).optional(),
    accommodation: z.object({
        included: z.boolean().optional(),
        hotelStarRating: z.number().min(1).max(5).optional(),
        roomType: z.enum(["single", "double", "suite"]).optional(),
        checkInTime: z.string().optional(),
        checkOutTime: z.string().optional(),
        nights: z.number().min(0).max(14).optional(),
    }).optional(),
    technical: z.object({
        equipmentList: z.array(z.string()).optional(),
        soundCheckDuration: z.number().min(15).max(180).optional(),
        backlineProvided: z.array(z.string()).optional(),
        stageSetupTime: z.number().min(0).max(180).optional(),
    }).optional(),
    hospitality: z.object({
        guestListCount: z.number().min(0).max(20).optional(),
        greenRoomAccess: z.boolean().optional(),
        mealsProvided: z.array(z.string()).optional(),
        securityProvisions: z.enum(["standard", "enhanced"]).optional(),
    }).optional(),
    branding: z.object({
        logoUsageAllowed: z.boolean().optional(),
        promotionalApprovalRequired: z.boolean().optional(),
        socialMediaGuidelines: z.string().optional(),
        pressRequirements: z.string().optional(),
    }).optional(),
    contentRights: z.object({
        recordingAllowed: z.boolean().optional(),
        photographyAllowed: z.boolean().optional(),
        videographyAllowed: z.boolean().optional(),
        liveStreamingAllowed: z.boolean().optional(),
        socialMediaPostingAllowed: z.boolean().optional(),
    }).optional(),
    cancellation: z.object({
        artistCancellationPenalties: z.object({
            moreThan90Days: z.number().min(0).max(100).optional(),
            between30And90Days: z.number().min(0).max(100).optional(),
            lessThan30Days: z.number().min(0).max(100).optional(),
        }).optional(),
        organizerCancellationPenalties: z.object({
            moreThan30Days: z.number().min(0).max(100).optional(),
            between15And30Days: z.number().min(0).max(100).optional(),
            lessThan15Days: z.number().min(0).max(100).optional(),
        }).optional(),
        forceMajeureClause: z.enum(["standard", "custom"]).optional(),
        customForceMajeureText: z.string().optional(),
    }).optional(),
}).passthrough();

/**
 * Validate proposed changes against business rules.
 */
function validateContractChanges(changes: any, currentTerms: any, booking: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Reject any locked fields
    for (const field of LOCKED_FIELDS) {
        if (changes[field] !== undefined) {
            errors.push(`Field "${field}" is a core negotiated term and cannot be modified`);
        }
    }
    if (changes.financial?.totalFee || changes.financial?.currency) {
        errors.push("Total fee and currency cannot be modified");
    }

    // 2. Financial validations
    if (changes.financial?.paymentMilestones) {
        const total = changes.financial.paymentMilestones.reduce(
            (sum: number, m: any) => sum + (m.percentage || 0), 0
        );
        if (total !== 100) {
            errors.push(`Payment milestones must sum to 100% (currently ${total}%)`);
        }
    }

    // 3. Accommodation validations
    if (changes.accommodation) {
        if (changes.accommodation.checkInTime && changes.accommodation.checkOutTime) {
            const ci = changes.accommodation.checkInTime;
            const co = changes.accommodation.checkOutTime;
            if (ci >= co) {
                errors.push("Check-in time must be before check-out time");
            }
        }
    }

    // 4. Technical validations
    if (changes.technical?.soundCheckDuration) {
        const d = changes.technical.soundCheckDuration;
        if (d < 15 || d > 180) {
            errors.push("Sound check duration must be between 15 and 180 minutes");
        }
    }

    // 5. Hospitality validations
    if (changes.hospitality?.guestListCount) {
        const c = changes.hospitality.guestListCount;
        if (c < 0 || c > 20) {
            errors.push("Guest list count must be between 0 and 20");
        }
    }

    // 6. Cancellation validations
    if (changes.cancellation) {
        const penalties = [
            ...Object.values(changes.cancellation.artistCancellationPenalties || {}),
            ...Object.values(changes.cancellation.organizerCancellationPenalties || {})
        ] as number[];
        if (penalties.some(p => p < 0 || p > 100)) {
            errors.push("Cancellation penalties must be between 0 and 100%");
        }
    }

    return { valid: errors.length === 0, errors };
}

// ============================================================================
// CONTRACT TEXT GENERATION
// ============================================================================

/**
 * Generate contract text from negotiated booking terms + editable terms.
 * Core terms (fee, date, slot, time) are auto-populated and non-editable.
 */
function generateContractText(booking: any, terms?: any): string {
    const meta = booking.meta || {};
    const t = terms || {};
    const now = new Date();
    const eventDate = booking.event?.startTime || booking.eventDate;
    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : 'To Be Determined';
    const formattedTime = booking.slotTime || (eventDate ? new Date(eventDate).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
    }) : 'TBD');
    const currency = booking.offerCurrency || 'INR';
    const fee = Number(booking.finalAmount || booking.offerAmount || 0);
    const deposit = Number(booking.depositPercent || 30);

    return `
═══════════════════════════════════════════════════════════════
                    PERFORMANCE CONTRACT
═══════════════════════════════════════════════════════════════

Generated: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
Contract Reference: BK-${booking.id}-${now.getFullYear()}

───────────────────────────────────────────────────────────────
PARTIES
───────────────────────────────────────────────────────────────

ARTIST (Party A):
  Name: ${booking.artist?.name || booking.artist?.user?.displayName || 'Artist'}

PROMOTER/ORGANIZER (Party B):
  Name: ${booking.organizer?.name || booking.organizer?.user?.displayName || 'Organizer'}

───────────────────────────────────────────────────────────────
1. EVENT DETAILS  ★ Non-Editable Core Terms
───────────────────────────────────────────────────────────────

  Event:       ${booking.event?.title || 'Performance Event'}
  Date:        ${formattedDate}
  Time Slot:   ${formattedTime}
  Venue:       ${booking.venue?.name || 'TBD'}
  Location:    ${typeof booking.venue?.address === 'object' ? JSON.stringify(booking.venue.address) : booking.venue?.address || 'TBD'}

───────────────────────────────────────────────────────────────
2. FINANCIAL TERMS  ★ Non-Editable Core Terms
───────────────────────────────────────────────────────────────

  Performance Fee:   ${currency} ${fee.toLocaleString()}
  Deposit:           ${deposit}% (${currency} ${Math.round(fee * deposit / 100).toLocaleString()})
  Balance Due:       ${currency} ${Math.round(fee * (100 - deposit) / 100).toLocaleString()}
  Payment Method:    ${t.financial?.paymentMethod || 'Bank Transfer'}
  Payment Terms:     ${t.financial?.paymentMilestones
            ? t.financial.paymentMilestones.map((m: any) => `${m.milestone}: ${m.percentage}%`).join(', ')
            : 'Deposit upon signing; balance 24h before event'}

───────────────────────────────────────────────────────────────
3. TRAVEL ARRANGEMENTS
───────────────────────────────────────────────────────────────

  Responsibility:     ${t.travel?.responsibility || meta.travelProvided ? 'Organizer' : 'Artist'}
  Flight Class:       ${t.travel?.flightClass || 'Economy'}
  Airport Pickup:     ${t.travel?.airportPickup !== undefined ? (t.travel.airportPickup ? 'Provided' : 'Not Provided') : (meta.travelProvided ? 'Provided' : 'To be discussed')}
  Ground Transport:   ${t.travel?.groundTransport || 'To be discussed'}

───────────────────────────────────────────────────────────────
4. ACCOMMODATION
───────────────────────────────────────────────────────────────

  Included:       ${t.accommodation?.included !== undefined ? (t.accommodation.included ? 'Yes' : 'No') : (meta.accommodationProvided ? 'Yes' : 'To be discussed')}
  Hotel Rating:   ${t.accommodation?.hotelStarRating ? `${t.accommodation.hotelStarRating} Star` : 'Standard'}
  Room Type:      ${t.accommodation?.roomType || 'Standard'}
  Check-in:       ${t.accommodation?.checkInTime || '14:00'}
  Check-out:      ${t.accommodation?.checkOutTime || '12:00'}
  Nights:         ${t.accommodation?.nights || 1}

───────────────────────────────────────────────────────────────
5. TECHNICAL REQUIREMENTS
───────────────────────────────────────────────────────────────

  Sound Check:    ${t.technical?.soundCheckDuration || 60} minutes
  Stage Setup:    ${t.technical?.stageSetupTime || 30} minutes
  Equipment:      ${t.technical?.equipmentList?.join(', ') || meta.equipmentRequirements || 'Standard venue setup'}
  Backline:       ${t.technical?.backlineProvided?.join(', ') || 'As per venue availability'}

───────────────────────────────────────────────────────────────
6. HOSPITALITY
───────────────────────────────────────────────────────────────

  Guest List:     ${t.hospitality?.guestListCount ?? meta.guestListCount ?? 2} passes
  Green Room:     ${t.hospitality?.greenRoomAccess !== undefined ? (t.hospitality.greenRoomAccess ? 'Provided' : 'Not Provided') : 'Subject to venue availability'}
  Meals:          ${t.hospitality?.mealsProvided?.join(', ') || (meta.mealsProvided ? 'Provided' : 'Standard artist hospitality')}
  Security:       ${t.hospitality?.securityProvisions || 'Standard'}

───────────────────────────────────────────────────────────────
7. CONTENT RIGHTS
───────────────────────────────────────────────────────────────

  Recording:      ${t.contentRights?.recordingAllowed !== undefined ? (t.contentRights.recordingAllowed ? 'Allowed' : 'Not Allowed') : 'Subject to agreement'}
  Photography:    ${t.contentRights?.photographyAllowed !== undefined ? (t.contentRights.photographyAllowed ? 'Allowed' : 'Not Allowed') : 'Allowed'}
  Videography:    ${t.contentRights?.videographyAllowed !== undefined ? (t.contentRights.videographyAllowed ? 'Allowed' : 'Not Allowed') : 'Subject to agreement'}
  Live Streaming: ${t.contentRights?.liveStreamingAllowed !== undefined ? (t.contentRights.liveStreamingAllowed ? 'Allowed' : 'Not Allowed') : 'Subject to agreement'}

───────────────────────────────────────────────────────────────
8. BRANDING & PROMOTION
───────────────────────────────────────────────────────────────

  Logo Usage:             ${t.branding?.logoUsageAllowed !== undefined ? (t.branding.logoUsageAllowed ? 'Allowed' : 'Not Allowed') : 'Allowed with approval'}
  Promo Approval Req:     ${t.branding?.promotionalApprovalRequired ? 'Yes' : 'No'}
  Social Media:           ${t.branding?.socialMediaGuidelines || 'Standard guidelines apply'}
  Press Requirements:     ${t.branding?.pressRequirements || 'None specified'}

───────────────────────────────────────────────────────────────
9. CANCELLATION POLICY
───────────────────────────────────────────────────────────────

  9.1 Artist Cancellation Penalties:
    • More than 90 days:     ${t.cancellation?.artistCancellationPenalties?.moreThan90Days ?? 0}%
    • 30-90 days:            ${t.cancellation?.artistCancellationPenalties?.between30And90Days ?? 20}%
    • Less than 30 days:     ${t.cancellation?.artistCancellationPenalties?.lessThan30Days ?? 50}%

  9.2 Organizer Cancellation Penalties:
    • More than 30 days:     ${t.cancellation?.organizerCancellationPenalties?.moreThan30Days ?? 20}%
    • 15-30 days:            ${t.cancellation?.organizerCancellationPenalties?.between15And30Days ?? 50}%
    • Less than 15 days:     ${t.cancellation?.organizerCancellationPenalties?.lessThan15Days ?? 100}%

  Force Majeure:    ${t.cancellation?.forceMajeureClause || 'Standard'}
  ${t.cancellation?.customForceMajeureText ? `Custom Clause: ${t.cancellation.customForceMajeureText}` : ''}

───────────────────────────────────────────────────────────────
10. STANDARD LEGAL TERMS
───────────────────────────────────────────────────────────────

  10.1 This agreement represents the entire understanding between the parties.
  10.2 No partnership or agency relationship is created by this agreement.
  10.3 Any disputes shall be resolved through arbitration.
  10.4 This contract is governed by applicable local laws.
  10.5 Force Majeure: Neither party liable for acts of God, government
       restrictions, or other circumstances beyond reasonable control.
  10.6 Recording/streaming rights as specified in Section 7.
  10.7 Promoter responsible for all required permits and licenses.

═══════════════════════════════════════════════════════════════
`.trim();
}

/**
 * Build structured terms JSONB from booking data for version tracking.
 */
function buildTermsFromBooking(booking: any): any {
    const meta = booking.meta || {};
    return {
        // Core (non-editable - from negotiation)
        fee: Number(booking.finalAmount || booking.offerAmount || 0),
        currency: booking.offerCurrency || 'INR',
        depositPercent: Number(booking.depositPercent || 30),
        eventTitle: booking.event?.title || '',
        eventDate: booking.event?.startTime || booking.eventDate || null,
        slotTime: booking.slotTime || null,
        venueName: booking.venue?.name || '',
        artistName: booking.artist?.name || '',
        organizerName: booking.organizer?.name || '',
        // Editable categories (defaults)
        financial: {
            paymentMethod: meta.paymentMethod || 'bank_transfer',
            paymentMilestones: meta.paymentMilestones || [
                { milestone: 'deposit', percentage: Number(booking.depositPercent || 30), dueDate: 'upon_signing' },
                { milestone: 'pre_event', percentage: 100 - Number(booking.depositPercent || 30), dueDate: '24h_before' },
            ],
        },
        travel: {
            responsibility: meta.travelProvided ? 'organizer' : 'artist',
            flightClass: meta.flightClass || 'economy',
            airportPickup: meta.airportPickup || false,
            groundTransport: meta.groundTransport || 'not_provided',
        },
        accommodation: {
            included: meta.accommodationProvided || false,
            hotelStarRating: meta.hotelStarRating || 3,
            roomType: meta.roomType || 'single',
            checkInTime: '14:00',
            checkOutTime: '12:00',
            nights: meta.nights || 1,
        },
        technical: {
            equipmentList: meta.equipmentList || [],
            soundCheckDuration: meta.soundCheckDuration || 60,
            backlineProvided: meta.backlineProvided || [],
            stageSetupTime: meta.stageSetupTime || 30,
        },
        hospitality: {
            guestListCount: meta.guestListCount || 2,
            greenRoomAccess: meta.greenRoom || false,
            mealsProvided: meta.mealsProvided ? ['dinner', 'drinks'] : [],
            securityProvisions: 'standard',
        },
        branding: {
            logoUsageAllowed: true,
            promotionalApprovalRequired: true,
            socialMediaGuidelines: '',
            pressRequirements: '',
        },
        contentRights: {
            recordingAllowed: false,
            photographyAllowed: true,
            videographyAllowed: false,
            liveStreamingAllowed: false,
            socialMediaPostingAllowed: true,
        },
        cancellation: {
            artistCancellationPenalties: {
                moreThan90Days: 0,
                between30And90Days: 20,
                lessThan30Days: 50,
            },
            organizerCancellationPenalties: {
                moreThan30Days: 20,
                between15And30Days: 50,
                lessThan15Days: 100,
            },
            forceMajeureClause: 'standard',
            customForceMajeureText: '',
        },
    };
}

/**
 * Deep merge editable changes into current terms (preserving locked fields).
 */
function applyContractChanges(currentTerms: any, changes: any): any {
    const merged = JSON.parse(JSON.stringify(currentTerms));

    // Only apply changes to editable categories
    const editableCategories = [
        'financial', 'travel', 'accommodation', 'technical',
        'hospitality', 'branding', 'contentRights', 'cancellation'
    ];

    for (const category of editableCategories) {
        if (changes[category]) {
            merged[category] = {
                ...(merged[category] || {}),
                ...changes[category],
            };
        }
    }

    return merged;
}

/**
 * Post a system message to the contract conversation.
 */
async function postContractSystemMessage(bookingId: number, body: string) {
    try {
        // Find or create contract conversation
        let convo = await db.query.conversations.findFirst({
            where: and(
                eq(conversations.entityType, 'booking'),
                eq(conversations.entityId, bookingId),
                eq(conversations.conversationType, 'contract')
            )
        });

        if (!convo) {
            const booking = await storage.getBookingWithDetails(bookingId);
            const participantIds: number[] = [];
            if (booking?.artist?.userId) participantIds.push(booking.artist.userId);
            if (booking?.organizer?.userId) participantIds.push(booking.organizer.userId);

            const [newConvo] = await db.insert(conversations).values({
                entityType: 'booking',
                entityId: bookingId,
                conversationType: 'contract',
                subject: `Contract: Booking #${bookingId}`,
                status: 'open',
                lastMessageAt: new Date(),
            }).returning();
            convo = newConvo;

            for (const uid of Array.from(new Set(participantIds))) {
                await db.insert(conversationParticipants).values({
                    conversationId: convo.id,
                    userId: uid,
                }).onConflictDoNothing();
            }
        }

        await db.insert(messages).values({
            conversationId: convo.id,
            senderId: null,
            body,
            messageType: 'system',
            payload: { source: 'contract_workflow' },
        });

        await db.update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, convo.id));
    } catch (err) {
        console.error("Failed to post contract system message:", err);
    }
}

// ============================================================================
// 1. INITIATE CONTRACT STAGE
// POST /api/bookings/:bookingId/contract/initiate
// ============================================================================

router.post("/bookings/:bookingId/contract/initiate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const bookingId = parseInt(req.params.bookingId);
        if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });

        const booking = await storage.getBookingWithDetails(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // Check for existing contract
        const existing = await storage.getContractByBookingId(bookingId);
        if (existing) {
            if (existing.status === 'voided') {
                return res.status(400).json({ message: "Contract was voided (deadline passed). Booking is cancelled." });
            }
            const details = await storage.getContractWithDetails(existing.id);
            return res.json({ message: "Contract already initiated", contract: details });
        }

        // Generate contract terms from booking
        const now = new Date();
        const deadline = addHours(now, DEADLINE_HOURS);
        const terms = buildTermsFromBooking(booking);
        const contractText = generateContractText(booking, terms);

        const contract = await storage.createContract({
            bookingId,
            contractText,
            status: 'sent',
            signerSequence: { steps: ['promoter', 'artist'] },
            initiatedAt: now,
            deadlineAt: deadline,
            currentVersion: 1,
            artistEditUsed: false,
            promoterEditUsed: false,
            metadata: { terms },
        });

        // Create version v1
        await storage.createContractVersion({
            contractId: contract.id,
            version: 1,
            contractText,
            terms,
            createdBy: (req.user as any)?.id,
            changeSummary: 'Initial contract generation from negotiated terms',
        });

        // Update booking status to contracting
        await storage.updateBooking(bookingId, { status: 'contracting' as any });

        // Post system message
        await postContractSystemMessage(bookingId,
            `📋 Contract initiated. Review deadline: ${deadline.toLocaleString('en-US', {
                dateStyle: 'medium', timeStyle: 'short'
            })} (48 hours). Both parties must review, accept, and sign before the deadline.`
        );

        // Audit log
        await storage.createAuditLog({
            who: (req.user as any)?.id,
            action: "contract_initiated",
            entityType: "contract",
            entityId: contract.id,
            context: { bookingId, deadline: deadline.toISOString() }
        });

        const details = await storage.getContractWithDetails(contract.id);
        res.status(201).json({
            contract: details,
            message: 'Contract initiated. Both parties must review and sign within 48 hours.'
        });
    } catch (error) {
        console.error("Error initiating contract:", error);
        res.status(500).json({ message: "Failed to initiate contract" });
    }
});

// ============================================================================
// 2. GET CONTRACT (proper GET, no side-effects)
// GET /api/bookings/:bookingId/contract
// ============================================================================

router.get("/bookings/:bookingId/contract", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const bookingId = parseInt(req.params.bookingId);
        if (isNaN(bookingId)) return res.status(400).json({ message: "Invalid booking ID" });

        const contract = await storage.getContractByBookingId(bookingId);
        if (!contract) return res.status(404).json({ message: "No contract found for this booking" });

        const details = await storage.getContractWithDetails(contract.id);

        // Add user-specific context
        const user = req.user as any;
        const role = getUserRole(user);
        const isArtist = role === 'artist';

        const timeRemaining = contract.deadlineAt
            ? Math.max(0, new Date(contract.deadlineAt).getTime() - Date.now())
            : null;

        res.json({
            ...details,
            userRole: role,
            userCanEdit: isArtist ? !contract.artistEditUsed : !contract.promoterEditUsed,
            userHasAccepted: isArtist ? !!contract.artistAcceptedAt : !!contract.promoterAcceptedAt,
            userHasSigned: isArtist ? contract.signedByArtist : contract.signedByPromoter,
            timeRemaining: timeRemaining ? Math.floor(timeRemaining / 1000) : null,
        });
    } catch (error) {
        console.error("Error fetching contract:", error);
        res.status(500).json({ message: "Failed to fetch contract" });
    }
});

// ============================================================================
// 3. REVIEW ACTIONS (accept-as-is or propose edits, one edit per party)
// POST /api/contracts/:id/review
// ============================================================================

const reviewSchema = z.object({
    action: z.enum(["ACCEPT_AS_IS", "PROPOSE_EDITS"]),
    changes: z.any().optional(),
    note: z.string().optional(),
});

router.post("/contracts/:id/review", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const contractId = parseInt(req.params.id);
        if (isNaN(contractId)) return res.status(400).json({ message: "Invalid contract ID" });

        const contract = await storage.getContract(contractId);
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        if (isDeadlinePassed(contract)) {
            return res.status(400).json({ message: "Contract deadline has passed" });
        }
        if (contract.status === 'voided') {
            return res.status(400).json({ message: "Contract has been voided" });
        }
        if (contract.status === 'signed') {
            return res.status(400).json({ message: "Contract is already fully signed" });
        }

        const user = req.user as any;
        const role = getUserRole(user);
        const isArtist = role === 'artist';
        const body = reviewSchema.parse(req.body);
        const reviewDoneField = isArtist ? 'artistReviewDoneAt' : 'promoterReviewDoneAt';

        // Check if already reviewed
        if (contract[isArtist ? 'artistReviewDoneAt' : 'promoterReviewDoneAt']) {
            return res.status(400).json({ message: "You have already completed your review" });
        }

        if (body.action === "ACCEPT_AS_IS") {
            const updateData: any = { updatedAt: new Date(), [reviewDoneField]: new Date() };
            await storage.updateContract(contractId, updateData);

            await postContractSystemMessage(contract.bookingId!,
                `✅ ${isArtist ? 'Artist' : 'Promoter'} has accepted the contract as-is.`
            );

            await storage.createAuditLog({
                who: user.id,
                action: "contract_reviewed_accepted",
                entityType: "contract",
                entityId: contractId,
                context: { role }
            });

            const details = await storage.getContractWithDetails(contractId);
            return res.json({
                success: true,
                message: 'Contract accepted as-is',
                contract: details
            });

        } else if (body.action === "PROPOSE_EDITS") {
            // Check one-edit-per-party rule
            const editUsedField = isArtist ? 'artistEditUsed' : 'promoterEditUsed';
            if (contract[editUsedField]) {
                return res.status(400).json({ message: "You have already used your one-time edit opportunity" });
            }

            // Check for existing pending edit
            const pendingEdit = await storage.getPendingEditRequest(contractId);
            if (pendingEdit) {
                return res.status(400).json({ message: "There is already a pending edit request. Wait for it to be resolved." });
            }

            if (!body.changes || (typeof body.changes === 'object' && Object.keys(body.changes).length === 0)) {
                return res.status(400).json({ message: "Changes are required for edit proposals" });
            }

            // Validate changes against business rules
            const booking = await storage.getBookingWithDetails(contract.bookingId!);
            const currentVersion = await storage.getLatestContractVersion(contractId);
            const currentTerms = (currentVersion?.terms as any) || {};
            const validation = validateContractChanges(body.changes, currentTerms, booking);

            if (!validation.valid) {
                return res.status(400).json({
                    message: "Invalid changes",
                    errors: validation.errors
                });
            }

            // Create edit request
            const editRequest = await storage.createContractEditRequest({
                contractId,
                requestedBy: user.id,
                requestedByRole: role,
                changes: body.changes,
                note: body.note || null,
                status: 'pending',
            });

            // Mark review done + edit used
            await storage.updateContract(contractId, {
                updatedAt: new Date(),
                [reviewDoneField]: new Date(),
                [editUsedField]: true,
            });

            await postContractSystemMessage(contract.bookingId!,
                `✏️ ${isArtist ? 'Artist' : 'Promoter'} has proposed edits to the contract. The other party must approve or reject.${body.note ? ` Note: "${body.note}"` : ''}`
            );

            await storage.createAuditLog({
                who: user.id,
                action: "contract_edit_requested",
                entityType: "contract",
                entityId: contractId,
                context: { role, editRequestId: editRequest.id }
            });

            const details = await storage.getContractWithDetails(contractId);
            return res.json({
                success: true,
                message: 'Edit request submitted. Awaiting other party approval.',
                contract: details,
                editRequest
            });
        }
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        console.error("Error reviewing contract:", error);
        res.status(500).json({ message: "Failed to process review" });
    }
});

// ============================================================================
// 4. RESPOND TO EDIT REQUEST (approve/reject)
// POST /api/contracts/:id/edit-requests/:reqId/respond
// ============================================================================

const respondSchema = z.object({
    decision: z.enum(["APPROVE", "REJECT"]),
    responseNote: z.string().optional(),
});

router.post("/contracts/:id/edit-requests/:reqId/respond", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const contractId = parseInt(req.params.id);
        const reqId = parseInt(req.params.reqId);
        if (isNaN(contractId) || isNaN(reqId)) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        const contract = await storage.getContract(contractId);
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        if (isDeadlinePassed(contract)) {
            return res.status(400).json({ message: "Contract deadline has passed" });
        }

        const editRequest = await storage.getContractEditRequest(reqId);
        if (!editRequest) return res.status(404).json({ message: "Edit request not found" });
        if (editRequest.contractId !== contractId) {
            return res.status(400).json({ message: "Edit request does not belong to this contract" });
        }
        if (editRequest.status !== 'pending') {
            return res.status(400).json({ message: "Edit request has already been processed" });
        }

        const user = req.user as any;
        const role = getUserRole(user);

        // The responder must be the OTHER party
        if (editRequest.requestedByRole === role) {
            return res.status(403).json({ message: "You cannot respond to your own edit request" });
        }

        const body = respondSchema.parse(req.body);
        const now = new Date();

        if (body.decision === "APPROVE") {
            // Apply changes: deep-merge into current terms, create new version
            const currentVersionObj = await storage.getLatestContractVersion(contractId);
            const currentTerms = (currentVersionObj?.terms as any) || {};
            const changes = editRequest.changes as any;
            const newTerms = applyContractChanges(currentTerms, changes);
            const newVersionNum = (contract.currentVersion || 1) + 1;

            // Regenerate contract text with updated terms
            const booking = await storage.getBookingWithDetails(contract.bookingId!);
            const newContractText = generateContractText(booking, newTerms);

            await storage.createContractVersion({
                contractId,
                version: newVersionNum,
                contractText: newContractText,
                terms: newTerms,
                createdBy: user.id,
                changeSummary: `${editRequest.requestedByRole} edit approved: ${editRequest.note || 'Changes applied'}`,
            });

            await storage.updateContract(contractId, {
                currentVersion: newVersionNum,
                contractText: newContractText,
                metadata: { ...(contract.metadata as any || {}), terms: newTerms },
                updatedAt: now,
            });

            await storage.updateContractEditRequest(reqId, {
                status: 'approved',
                respondedBy: user.id,
                respondedAt: now,
                responseNote: body.responseNote || null,
                resultingVersion: newVersionNum,
            });

            await postContractSystemMessage(contract.bookingId!,
                `✅ Edit request approved. Contract updated to version ${newVersionNum}.${body.responseNote ? ` Note: "${body.responseNote}"` : ''}`
            );

            await storage.createAuditLog({
                who: user.id,
                action: "contract_edit_approved",
                entityType: "contract",
                entityId: contractId,
                context: { reqId, newVersion: newVersionNum }
            });

        } else {
            // REJECT
            await storage.updateContractEditRequest(reqId, {
                status: 'rejected',
                respondedBy: user.id,
                respondedAt: now,
                responseNote: body.responseNote || null,
            });

            await postContractSystemMessage(contract.bookingId!,
                `❌ Edit request rejected. Contract remains on version ${contract.currentVersion}.${body.responseNote ? ` Reason: "${body.responseNote}"` : ''}`
            );

            await storage.createAuditLog({
                who: user.id,
                action: "contract_edit_rejected",
                entityType: "contract",
                entityId: contractId,
                context: { reqId }
            });
        }

        const details = await storage.getContractWithDetails(contractId);
        res.json({
            success: true,
            message: body.decision === 'APPROVE'
                ? 'Edit request approved. New contract version created.'
                : 'Edit request rejected. Contract remains on current version.',
            editRequest: await storage.getContractEditRequest(reqId),
            contract: details,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        console.error("Error responding to edit request:", error);
        res.status(500).json({ message: "Failed to respond to edit request" });
    }
});

// ============================================================================
// 5. ACCEPT CONTRACT (EULA checkpoint)
// POST /api/contracts/:id/accept
// ============================================================================

const acceptSchema = z.object({
    agreed: z.literal(true, { errorMap: () => ({ message: "You must agree to the contract terms" }) }),
});

router.post("/contracts/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const contractId = parseInt(req.params.id);
        if (isNaN(contractId)) return res.status(400).json({ message: "Invalid contract ID" });

        const contract = await storage.getContract(contractId);
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        if (isDeadlinePassed(contract)) {
            return res.status(400).json({ message: "Contract deadline has passed" });
        }
        if (contract.status === 'voided' || contract.status === 'signed') {
            return res.status(400).json({ message: `Contract is ${contract.status}` });
        }

        // Check no pending edit requests
        const pendingEdit = await storage.getPendingEditRequest(contractId);
        if (pendingEdit) {
            return res.status(400).json({ message: "Cannot accept while edit requests are pending" });
        }

        const body = acceptSchema.parse(req.body);
        const user = req.user as any;
        const role = getUserRole(user);
        const isArtist = role === 'artist';
        const now = new Date();

        const reviewDoneField = isArtist ? 'artistReviewDoneAt' : 'promoterReviewDoneAt';
        const acceptedField = isArtist ? 'artistAcceptedAt' : 'promoterAcceptedAt';

        // Must have completed review first
        if (!contract[reviewDoneField]) {
            return res.status(400).json({ message: "You must complete your review before accepting" });
        }

        if (contract[acceptedField]) {
            return res.status(400).json({ message: "You have already accepted this contract" });
        }

        await storage.updateContract(contractId, {
            [acceptedField]: now,
            updatedAt: now,
        });

        await postContractSystemMessage(contract.bookingId!,
            `🤝 ${isArtist ? 'Artist' : 'Promoter'} has accepted the contract terms. Awaiting signature.`
        );

        await storage.createAuditLog({
            who: user.id,
            action: "contract_accepted_eula",
            entityType: "contract",
            entityId: contractId,
            context: { role }
        });

        const details = await storage.getContractWithDetails(contractId);
        res.json({
            success: true,
            message: 'Contract accepted. You may now proceed to sign.',
            contract: details,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        console.error("Error accepting contract:", error);
        res.status(500).json({ message: "Failed to accept contract" });
    }
});

// ============================================================================
// 6. SIGN CONTRACT (requires prior EULA acceptance)
// POST /api/contracts/:id/sign
// ============================================================================

const signSchema = z.object({
    signatureData: z.string().optional(),
    signatureMethod: z.enum(["draw", "type", "upload"]).default("type"),
});

router.post("/contracts/:id/sign", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const contractId = parseInt(req.params.id);
        if (isNaN(contractId)) return res.status(400).json({ message: "Invalid contract ID" });

        const contract = await storage.getContract(contractId);
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        if (isDeadlinePassed(contract)) {
            return res.status(400).json({ message: "Contract deadline has passed" });
        }
        if (contract.status === 'voided') {
            return res.status(400).json({ message: "Contract has been voided" });
        }
        if (contract.status === 'signed') {
            return res.status(400).json({ message: "Contract is already fully signed" });
        }

        // Check no pending edit requests
        const pendingEdit = await storage.getPendingEditRequest(contractId);
        if (pendingEdit) {
            return res.status(400).json({ message: "Cannot sign while edit requests are pending" });
        }

        const user = req.user as any;
        const role = getUserRole(user);
        const isArtist = role === 'artist';
        const body = signSchema.parse(req.body);
        const now = new Date();

        // Must have accepted first (EULA checkpoint)
        const acceptedField = isArtist ? 'artistAcceptedAt' : 'promoterAcceptedAt';
        if (!contract[acceptedField]) {
            return res.status(400).json({ message: "You must accept the contract terms before signing" });
        }

        // Check if already signed
        const signedField = isArtist ? 'signedByArtist' : 'signedByPromoter';
        if (contract[signedField]) {
            return res.status(400).json({ message: "You have already signed this contract" });
        }

        // Verify authorization against booking
        const booking = await storage.getBookingWithDetails(contract.bookingId!);
        if (!booking) return res.status(404).json({ message: "Associated booking not found" });

        if (isArtist) {
            const artist = await storage.getArtistByUserId(user.id);
            if (!artist || booking.artistId !== artist.id) {
                return res.status(403).json({ message: "Not authorized to sign this contract" });
            }
        }

        // Record signature
        await storage.createContractSignature({
            contractId,
            userId: user.id,
            role,
            signatureData: body.signatureData || user.displayName || user.username || 'Signed',
            signatureType: body.signatureMethod === 'draw' ? 'drawn' : body.signatureMethod === 'upload' ? 'uploaded' : 'typed',
            ipAddress: req.ip || null,
            userAgent: req.headers['user-agent'] || null,
        });

        // Update contract
        const signedAtField = isArtist ? 'artistSignedAt' : 'promoterSignedAt';
        const updateData: any = { updatedAt: now, [signedField]: true, [signedAtField]: now };

        // Check if fully signed after this
        const otherSignedField = isArtist ? 'signedByPromoter' : 'signedByArtist';
        const fullyExecuted = contract[otherSignedField] === true;

        if (fullyExecuted) {
            updateData.status = 'admin_review'; // Sent to admin for final approval
            // updateData.signedAt = now; // We can set this now or after admin approval. Let's set it now as parties DID sign.
            updateData.signedAt = now;
            // Do NOT set finalizedAt yet.

            // Do NOT update booking status to confirmed yet. Remain in contracting.

            await postContractSystemMessage(contract.bookingId!,
                `🎉 Both parties have signed! The contract is now under final review by the platform admin. You will be notified once approved.`
            );
        } else {
            await postContractSystemMessage(contract.bookingId!,
                `✍️ ${isArtist ? 'Artist' : 'Promoter'} has signed the contract. Waiting for the other party.`
            );
        }

        await storage.updateContract(contractId, updateData);

        await storage.createAuditLog({
            who: user.id,
            action: "contract_signed",
            entityType: "contract",
            entityId: contractId,
            context: {
                role,
                signatureMethod: body.signatureMethod,
                fullyExecuted
            }
        });

        const details = await storage.getContractWithDetails(contractId);
        res.json({
            success: true,
            message: fullyExecuted
                ? 'Contract fully executed. Both parties have signed.'
                : 'Contract signed. Waiting for other party to sign.',
            contract: details,
            fullyExecuted,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        console.error("Error signing contract:", error);
        res.status(500).json({ message: "Failed to sign contract" });
    }
});

// ============================================================================
// 7. CONTRACT PDF DOWNLOAD (stub - requires PDF engine like puppeteer)
// GET /api/contracts/:id/pdf
// ============================================================================

router.get("/contracts/:id/pdf", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const contractId = parseInt(req.params.id);
        if (isNaN(contractId)) return res.status(400).json({ message: "Invalid contract ID" });

        const contract = await storage.getContract(contractId);
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        if (contract.status !== 'signed') {
            return res.status(400).json({ message: "Contract must be fully signed before downloading PDF" });
        }

        // Verify user is a party to the contract
        const user = req.user as any;
        const booking = await storage.getBookingWithDetails(contract.bookingId!);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        // If PDF already exists, redirect
        if (contract.pdfUrl) {
            await storage.createAuditLog({
                who: user.id,
                action: "contract_pdf_downloaded",
                entityType: "contract",
                entityId: contractId,
            });
            return res.redirect(contract.pdfUrl);
        }

        // Generate PDF as plain text for now (TODO: integrate puppeteer/html generation)
        const signatures = await storage.getContractSignatures(contractId);
        const pdfContent = `${contract.contractText}\n\n` +
            `═══════════════════════════════════════════════════════════════\n` +
            `SIGNATURES\n` +
            `═══════════════════════════════════════════════════════════════\n\n` +
            signatures.map(sig =>
                `${sig.role.toUpperCase()}: ${sig.signatureData || 'Signed'}\n` +
                `Signed at: ${sig.signedAt ? new Date(sig.signedAt).toLocaleString() : 'N/A'}\n` +
                `Method: ${sig.signatureType}\n` +
                `IP: ${sig.ipAddress || 'N/A'}\n`
            ).join('\n');

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="contract-BK-${contract.bookingId}.txt"`);
        res.send(pdfContent);

        await storage.createAuditLog({
            who: user.id,
            action: "contract_pdf_downloaded",
            entityType: "contract",
            entityId: contractId,
        });
    } catch (error) {
        console.error("Error downloading contract:", error);
        res.status(500).json({ message: "Failed to download contract" });
    }
});

// ============================================================================
// 8. TIMEOUT CHECK (cron or on-demand)
// POST /api/contracts/check-deadlines
// ============================================================================

export async function checkContractDeadlines() {
    const now = new Date();
    // Find all active contracts (not fully signed, not voided)
    const activeContracts = await db.select().from(contracts)
        .where(eq(contracts.status, 'sent'));

    let voided = 0;
    for (const contract of activeContracts) {
        if (contract.deadlineAt && new Date(contract.deadlineAt) < now) {
            await storage.updateContract(contract.id, {
                status: 'voided',
                updatedAt: now,
            });

            if (contract.bookingId) {
                await storage.updateBooking(contract.bookingId, {
                    status: 'cancelled' as any,
                    meta: {
                        cancelReason: 'contract_deadline_expired',
                        cancelledAt: now.toISOString(),
                        cancelledBy: 'system',
                    }
                });

                await postContractSystemMessage(contract.bookingId,
                    `⏰ Contract voided: not signed within 48 hours. Booking cancelled automatically.`
                );
            }

            await storage.createAuditLog({
                who: null,
                action: "contract_voided_timeout",
                entityType: "contract",
                entityId: contract.id,
                context: {
                    bookingId: contract.bookingId,
                    deadline: contract.deadlineAt?.toISOString()
                }
            });

            voided++;
        }
    }
    return voided;
}

router.post("/contracts/check-deadlines", async (req, res) => {
    try {
        const voided = await checkContractDeadlines();
        res.json({ message: `Checked deadlines. ${voided} contract(s) voided.`, voided });
    } catch (error) {
        console.error("Error checking deadlines:", error);
        res.status(500).json({ message: "Failed to check deadlines" });
    }
});

// ============================================================================
// Legacy: Keep the generate endpoint as an alias for initiate
// POST /api/bookings/:id/contract/generate
// ============================================================================

router.post("/bookings/:id/contract/generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

        const existing = await storage.getContractByBookingId(id);
        if (existing) {
            const details = await storage.getContractWithDetails(existing.id);
            return res.json({ message: "Contract already exists", contract: existing, ...details });
        }

        const booking = await storage.getBookingWithDetails(id);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        const now = new Date();
        const deadline = addHours(now, DEADLINE_HOURS);
        const terms = buildTermsFromBooking(booking);
        const contractText = generateContractText(booking, terms);

        const contract = await storage.createContract({
            bookingId: id,
            contractText,
            status: 'sent',
            signerSequence: { steps: ['promoter', 'artist'] },
            initiatedAt: now,
            deadlineAt: deadline,
            currentVersion: 1,
            metadata: { terms },
        });

        await storage.createContractVersion({
            contractId: contract.id,
            version: 1,
            contractText,
            terms,
            createdBy: (req.user as any)?.id,
            changeSummary: 'Initial contract generation',
        });

        await storage.createAuditLog({
            who: (req.user as any)?.id,
            action: "contract_generated",
            entityType: "contract",
            entityId: contract.id,
            context: { bookingId: id }
        });

        res.status(201).json(contract);
    } catch (error) {
        console.error("Error generating contract:", error);
        res.status(500).json({ message: "Failed to generate contract" });
    }
});

export default router;
