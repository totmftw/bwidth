import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { db } from "../db";
import {
    contracts, contractVersions, contractEditRequests, contractSignatures,
    conversations, conversationParticipants, messages, bookings, appSettings
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { generateContractText, buildTermsFromBooking } from "../contract-utils";
import { bookingService } from "../services/booking.service";
import { emitDomainEvent } from "../services/event-bus";
import PDFDocument from "pdfkit";

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

async function checkBookingFlowDeadline(bookingId: number, req: any, res: any): Promise<boolean> {
    const booking = await storage.getBooking(bookingId);
    if (booking && booking.flowDeadlineAt && new Date() > new Date(booking.flowDeadlineAt)) {
        await bookingService.expireBookingFlow(bookingId, "Booking flow 72-hour deadline has passed", req.user?.id);
        res.status(400).json({ message: "Booking flow 72-hour deadline has passed. Booking is cancelled." });
        return true; // Indicates deadline passed
    }
    return false;
}





// ============================================================================
// CONTRACT CHANGES VALIDATION
// ============================================================================

// Fields that are LOCKED (from negotiation) and cannot be edited
const LOCKED_FIELDS = [
    'fee', 'totalFee', 'currency', 'slotType',
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
    eventDate: z.string().optional(),
    slotTime: z.string().optional(),
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
// CONTRACT TEXT GENERATION & CHANGES
// ============================================================================

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

        if (booking.flowDeadlineAt && new Date() > new Date(booking.flowDeadlineAt)) {
            await bookingService.expireBookingFlow(bookingId, "Booking flow 72-hour deadline has passed", (req.user as any)?.id);
            return res.status(400).json({ message: "Booking flow 72-hour deadline has passed. Booking is cancelled." });
        }

        // Idempotency: if contract already exists, return it
        const existing = await storage.getContractByBookingId(bookingId);
        if (existing) {
            if (existing.status === 'voided') {
                return res.status(400).json({ message: "Contract was voided (deadline passed). Booking is cancelled." });
            }
            const details = await storage.getContractWithDetails(existing.id);
            return res.json({ message: "Contract already initiated", contract: details });
        }

        // Only allow contract generation when booking is in "contracting" status
        // or when negotiation is agreed (booking about to transition to contracting)
        const meta = (booking.meta as any) || {};
        const negotiationStatus = meta.negotiation?.status;
        const bookingStatus = booking.status;

        if (bookingStatus === 'contracting') {
            // Already in contracting but no contract yet — proceed to generate
        } else if (negotiationStatus === 'agreed') {
            // Negotiation agreed, ready to transition to contracting
        } else {
            return res.status(400).json({
                message: "Contract initiation blocked. Booking must be in 'contracting' status or negotiation must be fully agreed.",
                currentStatus: bookingStatus,
                negotiationStatus: negotiationStatus || null,
            });
        }

        const { contractService } = await import("../services/contract.service");
        const contract = await contractService.generateContractFromSnapshot(bookingId);

        // Update contract status to sent and set sequence
        const now = new Date();
        const deadline = addHours(now, DEADLINE_HOURS);
        
        await storage.updateContract(contract.id, {
            status: 'sent',
            signerSequence: { steps: ['promoter', 'artist'] },
            initiatedAt: now,
            deadlineAt: deadline,
            currentVersion: 1,
            artistEditUsed: false,
            promoterEditUsed: false,
        });

        // Create version v1
        await storage.createContractVersion({
            contractId: contract.id,
            version: 1,
            contractText: contract.contractText!,
            terms: contract.negotiatedTermsJson as any || {},
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
    } catch (error: any) {
        console.error("Error initiating contract:", error);
        res.status(500).json({ message: error.message || "Failed to initiate contract" });
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
    action: z.enum(["ACCEPT_AS_IS", "PROPOSE_EDITS", "WALKAWAY"]),
    changes: z.any().optional(),
    note: z.string().optional(),
    reason: z.string().optional(),
});

router.post("/contracts/:id/review", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
        const contractId = parseInt(req.params.id);
        if (isNaN(contractId)) return res.status(400).json({ message: "Invalid contract ID" });

        const contract = await storage.getContract(contractId);
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        if (await checkBookingFlowDeadline(contract.bookingId!, req, res)) return;

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
        // Check sequential rule: Organizer first, Artist last.
            if (isArtist && !contract.promoterReviewDoneAt) {
                return res.status(400).json({ message: "Organizer must review the contract first." });
            }

            const reviewDoneField = isArtist ? 'artistReviewDoneAt' : 'promoterReviewDoneAt';

        // Check if already reviewed
        if (contract[isArtist ? 'artistReviewDoneAt' : 'promoterReviewDoneAt']) {
            return res.status(400).json({ message: "You have already completed your review" });
        }

        if (body.action === "ACCEPT_AS_IS") {
            const nextEditPhase = isArtist ? 'ready_to_sign' : 'artist_review';
            const updateData: any = { updatedAt: new Date(), [reviewDoneField]: new Date(), editPhase: nextEditPhase };
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
            // Check sequential rule: Organizer first, Artist last.
            if (isArtist && !contract.promoterReviewDoneAt) {
                return res.status(400).json({ message: "Organizer must review and edit the contract first." });
            }

            // Check one-edit-per-party rule
            const editUsedField = isArtist ? 'artistEditUsed' : 'promoterEditUsed';
            if (contract[editUsedField]) {
                return res.status(400).json({ message: "You have already used your one-time edit opportunity" });
            }

            if (!body.changes || (typeof body.changes === 'object' && Object.keys(body.changes).length === 0)) {
                return res.status(400).json({ message: "Changes are required for edit proposals" });
            }

            // Validate changes against business rules
            const booking = await storage.getBookingWithDetails(contract.bookingId!);
            const currentVersionObj = await storage.getLatestContractVersion(contractId);
            const currentTerms = (currentVersionObj?.terms as any) || {};
            const validation = validateContractChanges(body.changes, currentTerms, booking);

            if (!validation.valid) {
                return res.status(400).json({
                    message: "Invalid changes",
                    errors: validation.errors
                });
            }

            // Directly apply changes (no pending approval needed)
            const newTerms = applyContractChanges(currentTerms, body.changes);
            const newVersionNum = (contract.currentVersion || 1) + 1;
            const newContractText = generateContractText(booking, newTerms);

            // Create new contract version with merged terms
            await storage.createContractVersion({
                contractId,
                version: newVersionNum,
                contractText: newContractText,
                terms: newTerms,
                createdBy: user.id,
                changeSummary: `${role} edits applied directly: ${body.note || 'Changes applied'}`,
            });

            // Determine the next editPhase
            const nextEditPhase = isArtist ? 'ready_to_sign' : 'artist_review';

            // Mark review done + edit used, update version and editPhase
            await storage.updateContract(contractId, {
                updatedAt: new Date(),
                [reviewDoneField]: new Date(),
                [editUsedField]: true,
                currentVersion: newVersionNum,
                contractText: newContractText,
                editPhase: nextEditPhase,
                metadata: { ...(contract.metadata as any || {}), terms: newTerms },
            });

            // Create edit request record with status "applied" for audit trail
            const editRequest = await storage.createContractEditRequest({
                contractId,
                requestedBy: user.id,
                requestedByRole: role,
                changes: body.changes,
                note: body.note || null,
                status: 'applied',
            });

            await postContractSystemMessage(contract.bookingId!,
                `✏️ ${isArtist ? 'Artist' : 'Promoter'} has made edits to the contract (v${newVersionNum}). Changes applied immediately.${body.note ? ` Note: "${body.note}"` : ''}`
            );

            await storage.createAuditLog({
                who: user.id,
                action: "contract_edit_applied",
                entityType: "contract",
                entityId: contractId,
                context: { role, editRequestId: editRequest.id, newVersion: newVersionNum, editPhase: nextEditPhase }
            });

            const details = await storage.getContractWithDetails(contractId);
            return res.json({
                success: true,
                message: `Edits applied. Contract updated to version ${newVersionNum}.`,
                contract: details,
                editRequest
            });

        } else if (body.action === "WALKAWAY") {
            // Void the contract
            await storage.updateContract(contractId, {
                status: 'voided',
                updatedAt: new Date(),
            });

            // Cancel the booking
            await storage.updateBooking(contract.bookingId!, {
                status: 'cancelled' as any,
                meta: {
                    cancelReason: body.reason || 'Contract walk-away',
                    cancelledAt: new Date().toISOString(),
                    cancelledBy: user.id,
                }
            });

            // Post system message
            const roleLabel = isArtist ? 'Artist' : 'Promoter';
            const reasonText = body.reason ? ` Reason: "${body.reason}"` : '';
            await postContractSystemMessage(contract.bookingId!,
                `🚪 ${roleLabel} has walked away from the contract. The booking is cancelled.${reasonText}`
            );

            // Audit log
            await storage.createAuditLog({
                who: user.id,
                action: "contract_walkaway",
                entityType: "contract",
                entityId: contractId,
                context: { role, reason: body.reason || 'Contract walk-away', bookingId: contract.bookingId }
            });

            return res.json({
                success: true,
                message: 'Contract voided. Booking cancelled.',
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

        if (await checkBookingFlowDeadline(contract.bookingId!, req, res)) return;

        if (isDeadlinePassed(contract)) {
            return res.status(400).json({ message: "Contract deadline has passed" });
        }

        const editRequest = await storage.getContractEditRequest(reqId);
        if (!editRequest) return res.status(404).json({ message: "Edit request not found" });
        if (editRequest.contractId !== contractId) {
            return res.status(400).json({ message: "Edit request does not belong to this contract" });
        }

        // New contracts use direct-apply flow (status = "applied"), so this endpoint
        // is only functional for legacy edit requests that are still "pending".
        if (editRequest.status !== 'pending') {
            if (editRequest.status === 'applied') {
                return res.status(410).json({
                    message: "This edit was applied directly. The respond endpoint is deprecated for new contracts. Edits are now applied immediately during review."
                });
            }
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

        // --- Walk Away logic for Organizer ---
        if (body.decision === 'REJECT' && body.responseNote === 'WALKAWAY') {
            await storage.updateContractEditRequest(reqId, {
                status: 'rejected',
                responseNote: 'Organizer walked away. Contract voided.',
                respondedAt: new Date(),
            });

            await storage.updateContract(contractId, {
                status: 'voided',
                updatedAt: new Date()
            });

            await storage.updateBooking(contract.bookingId!, {
                status: 'cancelled' as any,
                meta: {
                    cancelReason: 'organizer_walkaway',
                    cancelledAt: new Date().toISOString(),
                    cancelledBy: user.id,
                }
            });

            await postContractSystemMessage(contract.bookingId!,
                `🚪 Organizer rejected the Artist's final edits and chose to walk away. The booking is cancelled.`
            );

            return res.json({
                success: true,
                message: 'You have walked away. The booking is cancelled.',
                contract: await storage.getContractWithDetails(contractId),
            });
        }

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

        if (await checkBookingFlowDeadline(contract.bookingId!, req, res)) return;

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

        if (await checkBookingFlowDeadline(contract.bookingId!, req, res)) return;

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
        const signatureText = body.signatureData || user.displayName || user.username || 'Signed';
        const ipAddress = req.ip || 'Unknown';
        
        await storage.createContractSignature({
            contractId,
            userId: user.id,
            role,
            signatureData: signatureText,
            signatureType: body.signatureMethod === 'draw' ? 'drawn' : body.signatureMethod === 'upload' ? 'uploaded' : 'typed',
            ipAddress: req.ip || null,
            userAgent: req.headers['user-agent'] || null,
        });

        // Update contract text with signature details
        let updatedContractText: string = contract.contractText || "";
        const formattedDate = now.toLocaleString();
        
        if (isArtist) {
            updatedContractText = updatedContractText
                .replace('[[ARTIST_SIGNATURE]]', signatureText)
                .replace('[[ARTIST_DATE]]', formattedDate)
                .replace('[[ARTIST_IP]]', ipAddress);
        } else {
            updatedContractText = updatedContractText
                .replace('[[PROMOTER_SIGNATURE]]', signatureText)
                .replace('[[PROMOTER_DATE]]', formattedDate)
                .replace('[[PROMOTER_IP]]', ipAddress);
        }

        // Update contract
        const signedAtField = isArtist ? 'artistSignedAt' : 'promoterSignedAt';
        const ipField = isArtist ? 'artistSignatureIp' : 'promoterSignatureIp';
        const updateData: any = { 
            updatedAt: now, 
            contractText: updatedContractText,
            [signedField]: true, 
            [signedAtField]: now,
            [ipField]: ipAddress
        };

        // Check if fully signed after this
        const otherSignedField = isArtist ? 'signedByPromoter' : 'signedByArtist';
        const fullyExecuted = contract[otherSignedField] === true;

        if (fullyExecuted) {
            // Check App Settings for admin approval requirement
            const settingsList = await db.select().from(appSettings).where(eq(appSettings.key, 'require_contract_admin_approval'));
            const requireAdmin = settingsList.length > 0 ? settingsList[0].value : true; // Default to true if not set

            if (requireAdmin) {
                updateData.status = 'admin_review'; // Sent to admin for final approval
                updateData.signedAt = now;

                await postContractSystemMessage(contract.bookingId!,
                    `🎉 Both parties have signed! The contract is now under final review by the platform admin. You will be notified once approved.`
                );
            } else {
                updateData.status = 'signed';
                updateData.signedAt = now;
                updateData.finalizedAt = now;

                await storage.updateBooking(contract.bookingId!, {
                    status: 'confirmed',
                    updatedAt: now
                });

                await postContractSystemMessage(contract.bookingId!,
                    `🎉 Both parties have signed! The contract is now fully executed and the booking is confirmed.`
                );
            }
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

        // Emit notifications
        const signBookingDetails = await storage.getBookingWithDetails(contract.bookingId!);
        const signEventTitle = signBookingDetails?.event?.title || "Event";

        emitDomainEvent("contract.signed", {
          bookingId: contract.bookingId,
          contractId,
          entityType: "contract",
          entityId: contractId,
          eventTitle: signEventTitle,
          actorName: isArtist ? "Artist" : "Organizer",
          actionUrl: `/contract/${contractId}`,
        }, user.id);

        if (fullyExecuted) {
          emitDomainEvent("contract.fully_signed", {
            bookingId: contract.bookingId,
            contractId,
            entityType: "contract",
            entityId: contractId,
            eventTitle: signEventTitle,
            actionUrl: `/contract/${contractId}`,
          }, null);
        }

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

            // Notify both parties about voided contract
            emitDomainEvent("contract.voided", {
              bookingId: contract.bookingId,
              contractId: contract.id,
              entityType: "contract",
              entityId: contract.id,
              eventTitle: "Event",
              reason: "Contract not signed within 48-hour deadline",
              actionUrl: `/contract/${contract.id}`,
            }, null);

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

/**
 * GET /contracts/:id/pdf
 * Generate PDF document for a contract.
 */
router.get("/:id/pdf", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
        const contractId = parseInt(req.params.id);
        const contract = await storage.getContractWithDetails(contractId);
        if (!contract) return res.status(404).json({ message: "Contract not found" });

        // Security check
        const user = req.user as any;
        const role = getUserRole(user);
        // Additional auth checks can be added here if needed

        const doc = new PDFDocument({ margin: 50 });
        const filename = `Contract_BK-${contract.bookingId}_v${contract.currentVersion}.pdf`;

        res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-type", "application/pdf");

        doc.pipe(res);

        if (contract.status === 'signed' || contract.status === 'fully_executed') {
            doc.save();
            doc.rotate(-30, { origin: [150, 400] });
            doc.fillColor("green")
                .opacity(0.15)
                .fontSize(80)
                .text("DIGITALLY SIGNED", 100, 400);
            doc.restore();
            // Reset for main text
            doc.fillColor("black").opacity(1).fontSize(11);
        } else if (contract.status !== 'fully_executed') {
            doc.save();
            doc.rotate(-45, { origin: [150, 300] });
            doc.fillColor("#e0e0e0")
                .opacity(0.3)
                .fontSize(60)
                .text("DRAFT", 150, 300);
            doc.restore();
            // Reset for main text
            doc.fillColor("black").opacity(1).fontSize(11);
        }

        // Add contract text
        const textLines = (contract.contractText || "").split("\n");
        for (const line of textLines) {
            if (line.startsWith("════") || line.startsWith("────")) {
                doc.moveDown(0.5);
                doc.lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                doc.moveDown(0.5);
            } else if (line.trim() === "PERFORMANCE AND BOOKING AGREEMENT" || line.includes("★ Non-Editable Core Terms")) {
                doc.fontSize(14).font('Helvetica-Bold').text(line, { align: 'center' });
                doc.fontSize(11).font('Helvetica');
            } else if (line.match(/^[0-9]+\./)) {
                doc.moveDown(0.5);
                doc.font('Helvetica-Bold').text(line);
                doc.font('Helvetica');
            } else {
                doc.text(line);
            }
        }

        // Add IT Act 2000 Compliance Logging for Signatures
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text("SIGNATURE CERTIFICATE", { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica');

        doc.text(`Contract ID: ${contract.id}`);
        doc.text(`Booking Reference: BK-${contract.bookingId}`);
        doc.text(`Version: ${contract.currentVersion}`);
        doc.moveDown();

        if (contract.signedByPromoter) {
            doc.font('Helvetica-Bold').text("Promoter / Booking Agent Signature");
            doc.font('Helvetica').text(`Signed At: ${contract.promoterSignedAt ? new Date(contract.promoterSignedAt).toISOString() : 'N/A'}`);
            doc.text(`IP Address: ${contract.promoterSignatureIp || 'N/A'}`);
            doc.text("Status: Verified under IT Act 2000");
        } else {
            doc.font('Helvetica-Bold').text("Promoter / Booking Agent Signature");
            doc.font('Helvetica').text("Status: PENDING");
        }

        doc.moveDown(2);

        if (contract.signedByArtist) {
            doc.font('Helvetica-Bold').text("Artist Signature");
            doc.font('Helvetica').text(`Signed At: ${contract.artistSignedAt ? new Date(contract.artistSignedAt).toISOString() : 'N/A'}`);
            doc.text(`IP Address: ${contract.artistSignatureIp || 'N/A'}`);
            doc.text("Status: Verified under IT Act 2000");
        } else {
            doc.font('Helvetica-Bold').text("Artist Signature");
            doc.font('Helvetica').text("Status: PENDING");
        }

        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ message: "Failed to generate PDF" });
    }
});

export default router;
