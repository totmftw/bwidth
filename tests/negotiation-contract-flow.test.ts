/**
 * Integration-style tests for the full negotiation-to-contract flow.
 *
 * These tests exercise NegotiationService.handleNegotiationAction through all
 * step transitions (2-step happy path, 4-step happy path, walk away, wrong
 * turn rejection, deadline expiry, and contract auto-generation) by mocking
 * the database layer, storage, and downstream services.
 *
 * Run: npx vitest run tests/negotiation-contract-flow.test.ts
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { NegotiationSnapshot } from "@shared/routes";

// ---------------------------------------------------------------------------
// vi.hoisted — variables that vi.mock factories need (hoisted alongside mocks)
// ---------------------------------------------------------------------------

const {
  mockStorage,
  mockBookingService,
  mockContractService,
  createMockTx,
} = vi.hoisted(() => {
  const _mockStorage = {
    getBooking: vi.fn(),
    getBookingWithDetails: vi.fn(),
    getBookingProposals: vi.fn(),
    getContractByBookingId: vi.fn(),
    updateContract: vi.fn(),
    getEvent: vi.fn(),
  };

  const _mockBookingService = {
    expireBookingFlow: vi.fn().mockResolvedValue(true),
    confirmBookingAndSnapshot: vi.fn().mockResolvedValue(undefined),
  };

  const _mockContractService = {
    generateContractFromSnapshot: vi.fn().mockResolvedValue(undefined),
  };

  function _createMockTx() {
    return {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 100, round: 1 }]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
  }

  return {
    mockStorage: _mockStorage,
    mockBookingService: _mockBookingService,
    mockContractService: _mockContractService,
    createMockTx: _createMockTx,
  };
});

// ---------------------------------------------------------------------------
// Module mocks — hoisted to the top by vitest
// ---------------------------------------------------------------------------

vi.mock("../server/db", () => {
  const mockTx = createMockTx();
  return {
    db: {
      transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockTx);
      }),
      query: {
        bookingProposals: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        conversations: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    },
  };
});

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ _tag: "eq", args })),
  and: vi.fn((...args: any[]) => ({ _tag: "and", args })),
  desc: vi.fn((...args: any[]) => ({ _tag: "desc", args })),
}));

vi.mock("@shared/schema", () => ({
  bookings: { id: "bookings.id" },
  bookingProposals: {
    bookingId: "bookingProposals.bookingId",
    round: "bookingProposals.round",
  },
  conversations: {
    entityType: "c.entityType",
    entityId: "c.entityId",
    conversationType: "c.conversationType",
  },
  conversationParticipants: {},
}));

vi.mock("../server/storage", () => ({
  storage: mockStorage,
}));

vi.mock("../server/services/booking.service", () => ({
  bookingService: mockBookingService,
}));

vi.mock("../server/services/contract.service", () => ({
  contractService: mockContractService,
}));

vi.mock("../server/services/event-bus", () => ({
  emitDomainEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import the service under test (AFTER all mocks are registered)
// ---------------------------------------------------------------------------

import { NegotiationService } from "../server/services/negotiation.service";

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const ORGANIZER_USER_ID = 20;
const ARTIST_USER_ID = 10;

const SAMPLE_SNAPSHOT: NegotiationSnapshot = {
  financial: {
    offerAmount: 50000,
    currency: "INR",
    depositPercent: 30,
  },
  schedule: {
    stageId: 1,
    stageName: "Main Stage",
    slotLabel: "Headliner",
    startsAt: "2026-06-15T21:00:00.000Z",
    endsAt: "2026-06-15T22:30:00.000Z",
    soundCheckLabel: "Sound Check",
    soundCheckAt: "2026-06-15T18:00:00.000Z",
  },
  techRider: {
    artistRequirements: [
      { item: "CDJ 3000", quantity: 2, status: "pending" },
    ],
    artistBrings: [{ item: "Laptop", quantity: 1 }],
    organizerCommitments: [],
    organizerConfirmedAt: null,
    organizerConfirmedBy: null,
  },
  logistics: null,
  notes: { artist: null, organizer: null },
};

const COUNTER_SNAPSHOT: NegotiationSnapshot = {
  ...SAMPLE_SNAPSHOT,
  financial: {
    offerAmount: 60000,
    currency: "INR",
    depositPercent: 50,
  },
  notes: { artist: "Need higher fee for travel costs", organizer: null },
};

const SECOND_COUNTER_SNAPSHOT: NegotiationSnapshot = {
  ...SAMPLE_SNAPSHOT,
  financial: {
    offerAmount: 55000,
    currency: "INR",
    depositPercent: 40,
  },
  notes: { artist: null, organizer: "Meet in the middle" },
};

function createNegotiationMeta(overrides: Record<string, any> = {}) {
  return {
    currentStep: 0,
    stepState: "applied",
    stepDeadlineAt: null,
    stepHistory: [],
    lockedTerms: null,
    latestProposalVersion: 0,
    currentProposalSnapshot: null,
    status: "draft",
    activity: [],
    acceptance: {
      artistAcceptedVersion: null,
      organizerAcceptedVersion: null,
      artistAcceptedAt: null,
      organizerAcceptedAt: null,
    },
    riderConfirmation: {
      isConfirmed: false,
      confirmedAt: null,
      confirmedBy: null,
      unresolvedItemCount: 0,
    },
    ...overrides,
  };
}

function createMockBooking(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    status: "negotiating",
    artistId: 5,
    organizerId: 3,
    eventId: 10,
    stageId: null,
    contractId: null,
    offerAmount: null,
    offerCurrency: "INR",
    finalAmount: null,
    flowDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    flowExpiredAt: null,
    flowExpiredReason: null,
    meta: {
      negotiation: createNegotiationMeta(),
    },
    ...overrides,
  };
}

function createBookingDetails(booking: any) {
  return {
    ...booking,
    artist: { id: 5, userId: ARTIST_USER_ID, name: "Test Artist" },
    organizer: { id: 3, userId: ORGANIZER_USER_ID, name: "Test Organizer" },
    event: { id: 10, title: "Test Festival" },
  };
}

/**
 * Configures all storage mocks for a booking at the given negotiation state.
 * Also configures db.query.bookingProposals.findMany with the provided proposals.
 */
async function setupBookingState(
  metaOverrides: Record<string, any> = {},
  proposals: any[] = [],
) {
  const negotiationMeta = createNegotiationMeta(metaOverrides);
  const booking = createMockBooking({
    meta: { negotiation: negotiationMeta },
  });
  const details = createBookingDetails(booking);

  mockStorage.getBooking.mockResolvedValue(booking);
  mockStorage.getBookingWithDetails.mockResolvedValue(details);
  mockStorage.getContractByBookingId.mockResolvedValue(null);
  mockStorage.getEvent.mockResolvedValue({
    title: "Test Festival",
    startTime: new Date("2026-06-15T10:00:00.000Z"),
    endTime: new Date("2026-06-15T23:00:00.000Z"),
    stages: [],
  });

  const { db } = await import("../server/db");
  (db.query.bookingProposals.findMany as Mock).mockResolvedValue(proposals);

  return { booking, details };
}

function makeProposal(overrides: Record<string, any> = {}) {
  return {
    id: 100,
    bookingId: 1,
    createdBy: ORGANIZER_USER_ID,
    round: 1,
    proposedTerms: SAMPLE_SNAPSHOT,
    status: "active",
    submittedByRole: "organizer",
    stepNumber: 1,
    responseAction: "edit",
    note: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Negotiation to Contract Flow", () => {
  let service: NegotiationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NegotiationService();
  });

  // =========================================================================
  // 2-step happy path: organizer proposes, artist accepts
  // =========================================================================
  describe("2-step happy path", () => {
    it("organizer submits proposal then artist accepts -- booking moves to contracting", async () => {
      const { db } = await import("../server/db");

      // --- STEP 1: Organizer submits initial proposal ---
      await setupBookingState(
        { currentStep: 0, stepState: "applied" },
        [], // no proposals yet
      );

      await service.handleNegotiationAction(
        1,
        ORGANIZER_USER_ID,
        { action: "edit", snapshot: SAMPLE_SNAPSHOT },
      );

      // Verify a transaction was executed (proposal insert + booking update)
      expect(db.transaction).toHaveBeenCalledTimes(1);

      // --- STEP 2: Artist accepts ---
      // Re-configure mocks to reflect post-step-1 state
      await setupBookingState(
        {
          currentStep: 1,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 1,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "negotiating",
        },
        [makeProposal()],
      );

      await service.handleNegotiationAction(
        1,
        ARTIST_USER_ID,
        { action: "accept" },
      );

      // Transaction called a second time for the accept
      expect(db.transaction).toHaveBeenCalledTimes(2);

      // Contract generation chain triggered
      expect(mockBookingService.confirmBookingAndSnapshot).toHaveBeenCalledWith(1);
      expect(mockContractService.generateContractFromSnapshot).toHaveBeenCalledWith(1);
    });
  });

  // =========================================================================
  // 4-step happy path: org proposes -> artist edits -> org edits -> artist accepts
  // =========================================================================
  describe("4-step happy path", () => {
    it("walks through all 4 negotiation steps with alternating edits then accept", async () => {
      const { db } = await import("../server/db");

      // --- STEP 1: Organizer submits initial proposal (step 0 -> 1) ---
      await setupBookingState(
        { currentStep: 0, stepState: "applied" },
        [],
      );

      await service.handleNegotiationAction(
        1, ORGANIZER_USER_ID,
        { action: "edit", snapshot: SAMPLE_SNAPSHOT },
      );
      expect(db.transaction).toHaveBeenCalledTimes(1);

      // --- STEP 2: Artist counter-proposes (step 1 -> 2) ---
      await setupBookingState(
        {
          currentStep: 1,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 1,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "negotiating",
        },
        [makeProposal()],
      );

      await service.handleNegotiationAction(
        1, ARTIST_USER_ID,
        { action: "edit", snapshot: COUNTER_SNAPSHOT, note: "Need higher fee" },
      );
      expect(db.transaction).toHaveBeenCalledTimes(2);

      // --- STEP 3: Organizer counter-proposes (step 2 -> 3) ---
      await setupBookingState(
        {
          currentStep: 2,
          stepState: "awaiting_org",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 2,
          currentProposalSnapshot: COUNTER_SNAPSHOT,
          status: "negotiating",
        },
        [
          makeProposal({ id: 101, createdBy: ARTIST_USER_ID, round: 2, proposedTerms: COUNTER_SNAPSHOT, submittedByRole: "artist", stepNumber: 2, note: "Need higher fee" }),
          makeProposal(),
        ],
      );

      await service.handleNegotiationAction(
        1, ORGANIZER_USER_ID,
        { action: "edit", snapshot: SECOND_COUNTER_SNAPSHOT, note: "Meet in the middle" },
      );
      expect(db.transaction).toHaveBeenCalledTimes(3);

      // --- STEP 4: Artist accepts (cannot edit at step 3, only accept/walkaway) ---
      await setupBookingState(
        {
          currentStep: 3,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 3,
          currentProposalSnapshot: SECOND_COUNTER_SNAPSHOT,
          status: "negotiating",
        },
        [
          makeProposal({ id: 102, createdBy: ORGANIZER_USER_ID, round: 3, proposedTerms: SECOND_COUNTER_SNAPSHOT, stepNumber: 3, note: "Meet in the middle" }),
          makeProposal({ id: 101, createdBy: ARTIST_USER_ID, round: 2, proposedTerms: COUNTER_SNAPSHOT, submittedByRole: "artist", stepNumber: 2 }),
          makeProposal(),
        ],
      );

      await service.handleNegotiationAction(
        1, ARTIST_USER_ID,
        { action: "accept" },
      );
      expect(db.transaction).toHaveBeenCalledTimes(4);

      // Contract generation triggered on final accept
      expect(mockBookingService.confirmBookingAndSnapshot).toHaveBeenCalledWith(1);
      expect(mockContractService.generateContractFromSnapshot).toHaveBeenCalledWith(1);
    });
  });

  // =========================================================================
  // Walk away at step 2
  // =========================================================================
  describe("walk away at step 2", () => {
    it("artist walks away after organizer proposal -- booking is cancelled", async () => {
      const { db } = await import("../server/db");

      // --- STEP 1: Organizer submits proposal ---
      await setupBookingState(
        { currentStep: 0, stepState: "applied" },
        [],
      );

      await service.handleNegotiationAction(
        1, ORGANIZER_USER_ID,
        { action: "edit", snapshot: SAMPLE_SNAPSHOT },
      );

      // --- STEP 2: Artist walks away ---
      await setupBookingState(
        {
          currentStep: 1,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 1,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "negotiating",
        },
        [makeProposal()],
      );

      await service.handleNegotiationAction(
        1, ARTIST_USER_ID,
        { action: "walkaway", reason: "Fee too low for this event" },
      );

      // Transaction called for both the edit and the walkaway
      expect(db.transaction).toHaveBeenCalledTimes(2);

      // Contract generation should NOT be triggered on walkaway
      expect(mockBookingService.confirmBookingAndSnapshot).not.toHaveBeenCalled();
      expect(mockContractService.generateContractFromSnapshot).not.toHaveBeenCalled();

      // Verify walkaway transaction wrote correct status.
      // Re-run the walkaway transaction callback against an inspection tx.
      const walkawayTxCallback = (db.transaction as Mock).mock.calls[1][0];
      const capturedSets: any[] = [];
      const inspectionTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 101 }]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockImplementation((setArg: any) => {
            capturedSets.push(setArg);
            return { where: vi.fn().mockResolvedValue(undefined) };
          }),
        }),
      };
      await walkawayTxCallback(inspectionTx);

      const bookingUpdate = capturedSets.find(
        (s) => s.status === "cancelled",
      );
      expect(bookingUpdate).toBeDefined();
      expect(bookingUpdate.status).toBe("cancelled");
      expect(bookingUpdate.meta.negotiation.stepState).toBe("walked_away");
      expect(bookingUpdate.meta.negotiation.status).toBe("walked_away");
    });
  });

  // =========================================================================
  // Wrong turn rejection
  // =========================================================================
  describe("wrong turn rejection", () => {
    it("rejects organizer acting on artist turn", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        {
          currentStep: 1,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 1,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "negotiating",
        },
        [makeProposal()],
      );

      // Organizer tries to accept on artist's turn
      await expect(
        service.handleNegotiationAction(1, ORGANIZER_USER_ID, { action: "accept" }),
      ).rejects.toThrow("It is the artist's turn to respond");

      // Organizer tries to edit on artist's turn
      await expect(
        service.handleNegotiationAction(1, ORGANIZER_USER_ID, { action: "edit", snapshot: COUNTER_SNAPSHOT }),
      ).rejects.toThrow("It is the artist's turn to respond");

      // No transaction should have been called
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("rejects artist acting on organizer turn", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        {
          currentStep: 2,
          stepState: "awaiting_org",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 2,
          currentProposalSnapshot: COUNTER_SNAPSHOT,
          status: "negotiating",
        },
        [
          makeProposal({ id: 101, createdBy: ARTIST_USER_ID, round: 2, proposedTerms: COUNTER_SNAPSHOT, submittedByRole: "artist", stepNumber: 2 }),
        ],
      );

      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "accept" }),
      ).rejects.toThrow("It is the organizer's turn to respond");

      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "edit", snapshot: SAMPLE_SNAPSHOT }),
      ).rejects.toThrow("It is the organizer's turn to respond");

      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("rejects artist trying to submit the first proposal", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        { currentStep: 0, stepState: "applied" },
        [],
      );

      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "edit", snapshot: SAMPLE_SNAPSHOT }),
      ).rejects.toThrow("Organizer must submit the first proposal");

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Deadline expiry
  // =========================================================================
  describe("deadline expiry", () => {
    it("rejects action when the global flow deadline has passed", async () => {
      const { db } = await import("../server/db");

      // Booking with flowDeadlineAt in the past
      const expiredBooking = createMockBooking({
        flowDeadlineAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        meta: {
          negotiation: createNegotiationMeta({
            currentStep: 1,
            stepState: "awaiting_art",
            latestProposalVersion: 1,
            currentProposalSnapshot: SAMPLE_SNAPSHOT,
            status: "negotiating",
          }),
        },
      });
      mockStorage.getBooking.mockResolvedValue(expiredBooking);
      mockStorage.getBookingWithDetails.mockResolvedValue(
        createBookingDetails(expiredBooking),
      );

      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "accept" }),
      ).rejects.toThrow("Booking flow 72-hour deadline has passed");

      // Verify expireBookingFlow was called
      expect(mockBookingService.expireBookingFlow).toHaveBeenCalledWith(
        1,
        "negotiation_expired",
      );

      // No negotiation transaction should have been called
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it("rejects action when the step deadline has passed", async () => {
      const { db } = await import("../server/db");

      const pastStepDeadline = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      await setupBookingState(
        {
          currentStep: 1,
          stepState: "awaiting_art",
          stepDeadlineAt: pastStepDeadline,
          latestProposalVersion: 1,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "negotiating",
        },
        [makeProposal()],
      );

      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "accept" }),
      ).rejects.toThrow("Step deadline has expired");

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Contract auto-generation on acceptance
  // =========================================================================
  describe("contract auto-generation", () => {
    it("generates contract and sets it to sent status when negotiation reaches agreement", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        {
          currentStep: 1,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 1,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "negotiating",
        },
        [makeProposal()],
      );

      // Mock contract generation returns a contract object
      const mockContract = { id: 50, bookingId: 1, status: "draft" };
      mockStorage.getContractByBookingId.mockResolvedValue(mockContract);
      mockStorage.updateContract.mockResolvedValue({ ...mockContract, status: "sent" });

      await service.handleNegotiationAction(
        1, ARTIST_USER_ID,
        { action: "accept", note: "Looks good, let us proceed" },
      );

      // Verify the full contract generation chain
      expect(mockBookingService.confirmBookingAndSnapshot).toHaveBeenCalledWith(1);
      expect(mockContractService.generateContractFromSnapshot).toHaveBeenCalledWith(1);

      // Verify contract was updated to "sent" with proper edit workflow fields
      expect(mockStorage.updateContract).toHaveBeenCalledWith(
        50,
        expect.objectContaining({
          status: "sent",
          currentVersion: 1,
          artistEditUsed: false,
          promoterEditUsed: false,
          editPhase: "organizer_review",
        }),
      );
    });

    it("does not fail the accept action if contract generation throws", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        {
          currentStep: 1,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 1,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "negotiating",
        },
        [makeProposal()],
      );

      // Make contract generation fail
      mockContractService.generateContractFromSnapshot.mockRejectedValueOnce(
        new Error("PDF generation failed"),
      );

      // The accept action should still succeed (contract generation is in try/catch)
      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "accept" }),
      ).resolves.toBeDefined();

      // Transaction for the accept should have still completed
      expect(db.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Terminal state rejection
  // =========================================================================
  describe("terminal state rejection", () => {
    it("rejects all actions when negotiation is already locked", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        {
          currentStep: 2,
          stepState: "locked",
          lockedTerms: SAMPLE_SNAPSHOT,
          latestProposalVersion: 2,
          currentProposalSnapshot: SAMPLE_SNAPSHOT,
          status: "agreed",
        },
        [
          makeProposal({
            id: 101,
            createdBy: ARTIST_USER_ID,
            round: 2,
            status: "accepted",
            submittedByRole: "artist",
            stepNumber: 2,
            responseAction: "accept",
          }),
        ],
      );

      await expect(
        service.handleNegotiationAction(1, ORGANIZER_USER_ID, { action: "edit", snapshot: COUNTER_SNAPSHOT }),
      ).rejects.toThrow("Negotiation is finalized, no further actions allowed");

      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "accept" }),
      ).rejects.toThrow("Negotiation is finalized, no further actions allowed");

      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "walkaway" }),
      ).rejects.toThrow("Negotiation is finalized, no further actions allowed");

      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Step limit enforcement
  // =========================================================================
  describe("step limit enforcement", () => {
    it("prevents artist from editing at step 3 but allows accept", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        {
          currentStep: 3,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 3,
          currentProposalSnapshot: SECOND_COUNTER_SNAPSHOT,
          status: "negotiating",
        },
        [
          makeProposal({ id: 102, round: 3, proposedTerms: SECOND_COUNTER_SNAPSHOT, stepNumber: 3 }),
        ],
      );

      // Artist cannot edit at step 3
      await expect(
        service.handleNegotiationAction(1, ARTIST_USER_ID, { action: "edit", snapshot: COUNTER_SNAPSHOT }),
      ).rejects.toThrow("Maximum negotiation steps reached. You can only accept or walk away.");

      // But artist CAN still accept
      await service.handleNegotiationAction(
        1, ARTIST_USER_ID,
        { action: "accept" },
      );
      expect(db.transaction).toHaveBeenCalledTimes(1);
    });

    it("prevents artist from editing at step 3 but allows walkaway", async () => {
      const { db } = await import("../server/db");

      await setupBookingState(
        {
          currentStep: 3,
          stepState: "awaiting_art",
          stepDeadlineAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          latestProposalVersion: 3,
          currentProposalSnapshot: SECOND_COUNTER_SNAPSHOT,
          status: "negotiating",
        },
        [
          makeProposal({ id: 102, round: 3, proposedTerms: SECOND_COUNTER_SNAPSHOT, stepNumber: 3 }),
        ],
      );

      // Artist can walk away at step 3
      await service.handleNegotiationAction(
        1, ARTIST_USER_ID,
        { action: "walkaway", reason: "Cannot agree on terms" },
      );
      expect(db.transaction).toHaveBeenCalledTimes(1);

      // No contract generation on walkaway
      expect(mockContractService.generateContractFromSnapshot).not.toHaveBeenCalled();
    });
  });
});
