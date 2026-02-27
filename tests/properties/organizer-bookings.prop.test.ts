import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { completionConfirmSchema } from '../../shared/routes';

// Feature: organizer-role
// Property 19: Booking offer creates correct record
// Property 22: Acceptance transitions to contracting
// Property 23: Counter-offer increments negotiation round
// Property 24: Max negotiation rounds enforced
// Property 25: Contract auto-generation on contracting
// Property 37: Completion confirmation records feedback
// Validates: Requirements 6.2, 6.7, 7.1, 7.2, 7.6, 8.1, 12.2, 12.3

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const SLOT_TIMES = ['opening', 'mid', 'closing'] as const;

const NEGOTIABLE_STATUSES = ['offered', 'inquiry', 'negotiating'] as const;

const ACCEPTANCE_ELIGIBLE_STATUSES = ['offered', 'inquiry', 'negotiating'] as const;

// ---------------------------------------------------------------------------
// Pure business logic functions (extracted from route handlers)
// ---------------------------------------------------------------------------

/**
 * Simulates booking offer creation from POST /api/bookings.
 * Creates a booking record with status "offered" and initial history entry.
 */
function applyBookingOffer(input: {
  artistId: number;
  eventId: number;
  offerAmount: number;
  offerCurrency: string;
  slotTime?: string;
  note?: string;
}, organizerId: number): {
  artistId: number;
  eventId: number;
  organizerId: number;
  offerAmount: number;
  offerCurrency: string;
  status: string;
  meta: {
    negotiationRound: number;
    slotTime?: string;
    history: Array<{
      action: string;
      by: string;
      at: string;
      amount: number;
      message?: string;
    }>;
  };
} {
  return {
    artistId: input.artistId,
    eventId: input.eventId,
    organizerId,
    offerAmount: input.offerAmount,
    offerCurrency: input.offerCurrency,
    status: 'offered',
    meta: {
      negotiationRound: 0,
      slotTime: input.slotTime,
      history: [{
        action: 'offered',
        by: 'organizer',
        at: new Date().toISOString(),
        amount: input.offerAmount,
        message: input.note,
      }],
    },
  };
}

/**
 * Simulates acceptance logic from booking negotiation.
 * When either party accepts, booking transitions to "contracting" with finalAmount set.
 */
function applyAcceptance(
  booking: { status: string; offerAmount: number; meta: { history: any[]; negotiationRound: number } },
): { success: boolean; newStatus?: string; finalAmount?: number; error?: string } {
  if (!(ACCEPTANCE_ELIGIBLE_STATUSES as readonly string[]).includes(booking.status)) {
    return { success: false, error: 'Booking is not in an acceptable status' };
  }

  // finalAmount is the last offer amount from history, or the original offerAmount
  const lastOffer = [...booking.meta.history].reverse().find(h => h.amount !== undefined);
  const finalAmount = lastOffer?.amount ?? booking.offerAmount;

  return {
    success: true,
    newStatus: 'contracting',
    finalAmount,
  };
}

/**
 * Simulates counter-offer logic from negotiation workflow.
 * Increments negotiation round, appends to history, sets status to "negotiating".
 */
function applyCounterOffer(
  booking: {
    status: string;
    offerCurrency: string;
    meta: { negotiationRound: number; history: any[] };
  },
  counterOffer: { amount: number; slotTime?: string; message: string },
  by: 'organizer' | 'artist',
): {
  success: boolean;
  newRound?: number;
  newStatus?: string;
  historyLength?: number;
  error?: string;
} {
  if (booking.meta.negotiationRound >= 3) {
    return { success: false, error: 'Max negotiation rounds reached. You must Accept or Decline.' };
  }

  if (!(NEGOTIABLE_STATUSES as readonly string[]).includes(booking.status as any)) {
    return { success: false, error: 'Booking is not in a negotiable status' };
  }

  const newRound = booking.meta.negotiationRound + 1;
  const newHistory = [
    ...booking.meta.history,
    {
      action: 'counter_offer',
      by,
      at: new Date().toISOString(),
      amount: counterOffer.amount,
      slotTime: counterOffer.slotTime,
      message: counterOffer.message,
    },
  ];

  return {
    success: true,
    newRound,
    newStatus: 'negotiating',
    historyLength: newHistory.length,
  };
}

/**
 * Simulates contract auto-generation when booking transitions to "contracting".
 */
function generateContract(
  booking: {
    id: number;
    finalAmount: number;
    offerCurrency: string;
    event?: { title?: string; startTime?: string };
  },
): {
  bookingId: number;
  status: string;
  contractText: string;
  deadlineAt: string;
} {
  const now = new Date();
  const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return {
    bookingId: booking.id,
    status: 'draft',
    contractText: `Performance Contract\nBooking #${booking.id}\nAmount: ${booking.offerCurrency} ${booking.finalAmount}\nEvent: ${booking.event?.title || 'TBD'}\nDate: ${booking.event?.startTime || 'TBD'}`,
    deadlineAt: deadline.toISOString(),
  };
}

/**
 * Simulates completion confirmation logic from POST /api/organizer/bookings/:id/complete.
 * Records feedback in meta.completionFeedback.
 */
function applyCompletionConfirmation(
  booking: {
    status: string;
    meta: Record<string, any>;
  },
  input: { confirmed: boolean; rating: number; note?: string },
  confirmedBy: 'organizer' | 'artist',
): {
  success: boolean;
  newStatus?: string;
  completionFeedback?: Record<string, any>;
  error?: string;
} {
  const existingFeedback = booking.meta.completionFeedback || {};

  const feedback = {
    ...existingFeedback,
    [confirmedBy]: {
      confirmedBy,
      rating: input.rating,
      note: input.note,
      confirmedAt: new Date().toISOString(),
    },
  };

  const bothConfirmed = feedback.organizer && feedback.artist;

  return {
    success: true,
    newStatus: bothConfirmed ? 'completed' : booking.status,
    completionFeedback: feedback,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const artistIdArb = fc.integer({ min: 1, max: 1000 });
const eventIdArb = fc.integer({ min: 1, max: 1000 });
const organizerIdArb = fc.integer({ min: 1, max: 1000 });
const bookingIdArb = fc.integer({ min: 1, max: 10000 });

const amountArb = fc.integer({ min: 1000, max: 1000000 });
const currencyArb = fc.constantFrom('INR', 'USD', 'EUR');
const slotTimeArb = fc.constantFrom(...SLOT_TIMES);
const messageArb = fc.stringMatching(/^[a-zA-Z ]{5,100}$/);

const validBookingOfferArb = fc.record({
  artistId: artistIdArb,
  eventId: eventIdArb,
  offerAmount: amountArb,
  offerCurrency: currencyArb,
  slotTime: fc.option(slotTimeArb, { nil: undefined }),
  note: fc.option(messageArb, { nil: undefined }),
});

const negotiableStatusArb = fc.constantFrom(...NEGOTIABLE_STATUSES);

const counterOfferArb = fc.record({
  amount: amountArb,
  slotTime: fc.option(slotTimeArb, { nil: undefined }),
  message: messageArb,
});

const counterPartyArb = fc.constantFrom('organizer' as const, 'artist' as const);

const ratingArb = fc.integer({ min: 1, max: 5 });

// ---------------------------------------------------------------------------
// Property 19: Booking offer creates correct record
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------

describe('Property 19: Booking offer creates correct record', () => {
  it('created booking has status "offered"', () => {
    fc.assert(
      fc.property(validBookingOfferArb, organizerIdArb, (input, orgId) => {
        const booking = applyBookingOffer(input, orgId);
        expect(booking.status).toBe('offered');
      }),
      { numRuns: 100 },
    );
  });

  it('created booking has correct artistId and eventId', () => {
    fc.assert(
      fc.property(validBookingOfferArb, organizerIdArb, (input, orgId) => {
        const booking = applyBookingOffer(input, orgId);
        expect(booking.artistId).toBe(input.artistId);
        expect(booking.eventId).toBe(input.eventId);
      }),
      { numRuns: 100 },
    );
  });

  it('created booking has offerAmount matching input', () => {
    fc.assert(
      fc.property(validBookingOfferArb, organizerIdArb, (input, orgId) => {
        const booking = applyBookingOffer(input, orgId);
        expect(booking.offerAmount).toBe(input.offerAmount);
      }),
      { numRuns: 100 },
    );
  });

  it('meta.history contains exactly one entry with action "offered"', () => {
    fc.assert(
      fc.property(validBookingOfferArb, organizerIdArb, (input, orgId) => {
        const booking = applyBookingOffer(input, orgId);
        expect(booking.meta.history).toHaveLength(1);
        expect(booking.meta.history[0].action).toBe('offered');
        expect(booking.meta.history[0].amount).toBe(input.offerAmount);
      }),
      { numRuns: 100 },
    );
  });

  it('meta.negotiationRound starts at 0', () => {
    fc.assert(
      fc.property(validBookingOfferArb, organizerIdArb, (input, orgId) => {
        const booking = applyBookingOffer(input, orgId);
        expect(booking.meta.negotiationRound).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 22: Acceptance transitions to contracting
// Validates: Requirements 6.7, 7.6
// ---------------------------------------------------------------------------

describe('Property 22: Acceptance transitions to contracting', () => {
  it('accepting from eligible status transitions to "contracting"', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACCEPTANCE_ELIGIBLE_STATUSES),
        amountArb,
        (status, amount) => {
          const booking = {
            status,
            offerAmount: amount,
            meta: {
              negotiationRound: 0,
              history: [{ action: 'offered', by: 'organizer', at: new Date().toISOString(), amount }],
            },
          };
          const result = applyAcceptance(booking);
          expect(result.success).toBe(true);
          expect(result.newStatus).toBe('contracting');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('finalAmount equals the last offer amount from history', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ACCEPTANCE_ELIGIBLE_STATUSES),
        amountArb,
        amountArb,
        (status, originalAmount, counterAmount) => {
          const booking = {
            status,
            offerAmount: originalAmount,
            meta: {
              negotiationRound: 1,
              history: [
                { action: 'offered', by: 'organizer', at: new Date().toISOString(), amount: originalAmount },
                { action: 'counter_offer', by: 'artist', at: new Date().toISOString(), amount: counterAmount },
              ],
            },
          };
          const result = applyAcceptance(booking);
          expect(result.success).toBe(true);
          expect(result.finalAmount).toBe(counterAmount);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('accepting from non-eligible status fails', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('contracting', 'confirmed', 'completed', 'cancelled'),
        amountArb,
        (status, amount) => {
          const booking = {
            status,
            offerAmount: amount,
            meta: { negotiationRound: 0, history: [] },
          };
          const result = applyAcceptance(booking);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: Counter-offer increments negotiation round
// Validates: Requirements 7.1
// ---------------------------------------------------------------------------

describe('Property 23: Counter-offer increments negotiation round', () => {
  it('counter-offer increments negotiationRound by 1', () => {
    fc.assert(
      fc.property(
        negotiableStatusArb,
        fc.integer({ min: 0, max: 2 }),
        counterOfferArb,
        counterPartyArb,
        (status, currentRound, counter, by) => {
          const booking = {
            status,
            offerCurrency: 'INR',
            meta: {
              negotiationRound: currentRound,
              history: [{ action: 'offered', by: 'organizer', at: new Date().toISOString(), amount: 10000 }],
            },
          };
          const result = applyCounterOffer(booking, counter, by);
          expect(result.success).toBe(true);
          expect(result.newRound).toBe(currentRound + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('counter-offer appends to history', () => {
    fc.assert(
      fc.property(
        negotiableStatusArb,
        fc.integer({ min: 0, max: 2 }),
        counterOfferArb,
        counterPartyArb,
        (status, currentRound, counter, by) => {
          const existingHistory = [{ action: 'offered', by: 'organizer', at: new Date().toISOString(), amount: 10000 }];
          const booking = {
            status,
            offerCurrency: 'INR',
            meta: { negotiationRound: currentRound, history: existingHistory },
          };
          const result = applyCounterOffer(booking, counter, by);
          expect(result.success).toBe(true);
          expect(result.historyLength).toBe(existingHistory.length + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('counter-offer sets status to "negotiating"', () => {
    fc.assert(
      fc.property(
        negotiableStatusArb,
        fc.integer({ min: 0, max: 2 }),
        counterOfferArb,
        counterPartyArb,
        (status, currentRound, counter, by) => {
          const booking = {
            status,
            offerCurrency: 'INR',
            meta: { negotiationRound: currentRound, history: [] },
          };
          const result = applyCounterOffer(booking, counter, by);
          expect(result.success).toBe(true);
          expect(result.newStatus).toBe('negotiating');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 24: Max negotiation rounds enforced
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------

describe('Property 24: Max negotiation rounds enforced', () => {
  it('counter-offer fails when negotiationRound >= 3', () => {
    fc.assert(
      fc.property(
        negotiableStatusArb,
        fc.integer({ min: 3, max: 10 }),
        counterOfferArb,
        counterPartyArb,
        (status, currentRound, counter, by) => {
          const booking = {
            status,
            offerCurrency: 'INR',
            meta: { negotiationRound: currentRound, history: [] },
          };
          const result = applyCounterOffer(booking, counter, by);
          expect(result.success).toBe(false);
          expect(result.error).toContain('Max negotiation rounds');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('counter-offer succeeds when negotiationRound < 3', () => {
    fc.assert(
      fc.property(
        negotiableStatusArb,
        fc.integer({ min: 0, max: 2 }),
        counterOfferArb,
        counterPartyArb,
        (status, currentRound, counter, by) => {
          const booking = {
            status,
            offerCurrency: 'INR',
            meta: { negotiationRound: currentRound, history: [] },
          };
          const result = applyCounterOffer(booking, counter, by);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('exactly round 3 is the boundary — round 2 succeeds, round 3 fails', () => {
    fc.assert(
      fc.property(negotiableStatusArb, counterOfferArb, counterPartyArb, (status, counter, by) => {
        const bookingRound2 = {
          status,
          offerCurrency: 'INR',
          meta: { negotiationRound: 2, history: [] },
        };
        const bookingRound3 = {
          status,
          offerCurrency: 'INR',
          meta: { negotiationRound: 3, history: [] },
        };
        expect(applyCounterOffer(bookingRound2, counter, by).success).toBe(true);
        expect(applyCounterOffer(bookingRound3, counter, by).success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: Contract auto-generation on contracting
// Validates: Requirements 8.1
// ---------------------------------------------------------------------------

describe('Property 25: Contract auto-generation on contracting', () => {
  it('generated contract has status "draft"', () => {
    fc.assert(
      fc.property(bookingIdArb, amountArb, currencyArb, (id, amount, currency) => {
        const contract = generateContract({ id, finalAmount: amount, offerCurrency: currency });
        expect(contract.status).toBe('draft');
      }),
      { numRuns: 100 },
    );
  });

  it('generated contract has correct bookingId', () => {
    fc.assert(
      fc.property(bookingIdArb, amountArb, currencyArb, (id, amount, currency) => {
        const contract = generateContract({ id, finalAmount: amount, offerCurrency: currency });
        expect(contract.bookingId).toBe(id);
      }),
      { numRuns: 100 },
    );
  });

  it('generated contract has non-empty contractText containing the amount', () => {
    fc.assert(
      fc.property(bookingIdArb, amountArb, currencyArb, (id, amount, currency) => {
        const contract = generateContract({ id, finalAmount: amount, offerCurrency: currency });
        expect(contract.contractText.length).toBeGreaterThan(0);
        expect(contract.contractText).toContain(String(amount));
      }),
      { numRuns: 100 },
    );
  });

  it('generated contract deadline is ~48 hours from now', () => {
    fc.assert(
      fc.property(bookingIdArb, amountArb, currencyArb, (id, amount, currency) => {
        const before = Date.now();
        const contract = generateContract({ id, finalAmount: amount, offerCurrency: currency });
        const after = Date.now();

        const deadlineMs = new Date(contract.deadlineAt).getTime();
        const expectedMin = before + 48 * 60 * 60 * 1000;
        const expectedMax = after + 48 * 60 * 60 * 1000;

        expect(deadlineMs).toBeGreaterThanOrEqual(expectedMin - 1000);
        expect(deadlineMs).toBeLessThanOrEqual(expectedMax + 1000);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 37: Completion confirmation records feedback
// Validates: Requirements 12.2, 12.3
// ---------------------------------------------------------------------------

describe('Property 37: Completion confirmation records feedback', () => {
  it('completion confirmation schema validates valid input', () => {
    fc.assert(
      fc.property(ratingArb, fc.option(messageArb, { nil: undefined }), (rating, note) => {
        const input = { confirmed: true, rating, note };
        const parsed = completionConfirmSchema.safeParse(input);
        expect(parsed.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('completion confirmation schema rejects invalid ratings', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: -100, max: 0 }), fc.integer({ min: 6, max: 100 })),
        (rating) => {
          const input = { confirmed: true, rating };
          const parsed = completionConfirmSchema.safeParse(input);
          expect(parsed.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('organizer confirmation records feedback with correct fields', () => {
    fc.assert(
      fc.property(ratingArb, fc.option(messageArb, { nil: undefined }), (rating, note) => {
        const booking = { status: 'confirmed', meta: {} };
        const result = applyCompletionConfirmation(booking, { confirmed: true, rating, note }, 'organizer');
        expect(result.success).toBe(true);
        expect(result.completionFeedback?.organizer).toBeDefined();
        expect(result.completionFeedback?.organizer.rating).toBe(rating);
        expect(result.completionFeedback?.organizer.confirmedBy).toBe('organizer');
      }),
      { numRuns: 100 },
    );
  });

  it('both-party confirmation transitions booking to "completed"', () => {
    fc.assert(
      fc.property(ratingArb, ratingArb, (orgRating, artistRating) => {
        // First: artist confirms
        const booking1 = { status: 'confirmed', meta: {} as Record<string, any> };
        const afterArtist = applyCompletionConfirmation(
          booking1,
          { confirmed: true, rating: artistRating },
          'artist',
        );
        expect(afterArtist.newStatus).toBe('confirmed'); // Not yet completed

        // Second: organizer confirms
        const booking2 = {
          status: 'confirmed',
          meta: { completionFeedback: afterArtist.completionFeedback },
        };
        const afterOrganizer = applyCompletionConfirmation(
          booking2,
          { confirmed: true, rating: orgRating },
          'organizer',
        );
        expect(afterOrganizer.newStatus).toBe('completed');
      }),
      { numRuns: 100 },
    );
  });

  it('single-party confirmation does not transition to "completed"', () => {
    fc.assert(
      fc.property(ratingArb, counterPartyArb, (rating, party) => {
        const booking = { status: 'confirmed', meta: {} };
        const result = applyCompletionConfirmation(booking, { confirmed: true, rating }, party);
        expect(result.success).toBe(true);
        expect(result.newStatus).toBe('confirmed'); // Still waiting for other party
      }),
      { numRuns: 100 },
    );
  });
});
