import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  checkOneTimeEdit,
  checkPendingEditBlocks,
  applyContractChanges,
  computeEditApproval,
  computeEditRejection,
  validateLockedFields,
  validateContractChanges,
  buildTermsFromBooking,
  LOCKED_FIELDS,
  type ContractReviewState,
  type EditRequest,
  type BookingForContract,
} from '../../server/contract-utils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const idArb = fc.integer({ min: 1, max: 100000 });
const roleArb = fc.constantFrom('artist', 'promoter') as fc.Arbitrary<'artist' | 'promoter'>;
const versionArb = fc.integer({ min: 1, max: 50 });

/** A contract review state with configurable edit-used flags */
const contractStateArb = (opts?: {
  artistEditUsed?: boolean;
  promoterEditUsed?: boolean;
}): fc.Arbitrary<ContractReviewState> =>
  fc.record({
    artistEditUsed: fc.constant(opts?.artistEditUsed ?? false),
    promoterEditUsed: fc.constant(opts?.promoterEditUsed ?? false),
    artistReviewDoneAt: fc.option(fc.date(), { nil: null }),
    promoterReviewDoneAt: fc.option(fc.date(), { nil: null }),
    artistAcceptedAt: fc.option(fc.date(), { nil: null }),
    promoterAcceptedAt: fc.option(fc.date(), { nil: null }),
    signedByArtist: fc.boolean(),
    signedByPromoter: fc.boolean(),
    status: fc.constantFrom('sent', 'signed', 'admin_review'),
    currentVersion: versionArb,
  });

/** A pending edit request */
const pendingEditArb: fc.Arbitrary<EditRequest> = fc.record({
  id: idArb,
  contractId: idArb,
  status: fc.constant('pending' as const),
  requestedByRole: roleArb,
  changes: fc.constant({ accommodation: { included: true } }),
});

/** A resolved (non-pending) edit request */
const resolvedEditArb: fc.Arbitrary<EditRequest> = fc.record({
  id: idArb,
  contractId: idArb,
  status: fc.constantFrom('approved', 'rejected') as fc.Arbitrary<'approved' | 'rejected'>,
  requestedByRole: roleArb,
  changes: fc.constant({ accommodation: { included: true } }),
});

/** Valid editable changes (no locked fields) */
const validEditableChangesArb: fc.Arbitrary<Record<string, any>> = fc.oneof(
  fc.record({
    accommodation: fc.record({
      included: fc.boolean(),
      hotelStarRating: fc.integer({ min: 1, max: 5 }),
      roomType: fc.constantFrom('single', 'double', 'suite'),
      checkInTime: fc.constant('14:00'),
      checkOutTime: fc.constant('18:00'),
    }),
  }),
  fc.record({
    travel: fc.record({
      responsibility: fc.constantFrom('artist', 'organizer', 'shared'),
      flightClass: fc.constantFrom('economy', 'premium_economy', 'business'),
    }),
  }),
  fc.record({
    hospitality: fc.record({
      guestListCount: fc.integer({ min: 0, max: 20 }),
      greenRoomAccess: fc.boolean(),
    }),
  }),
  fc.record({
    branding: fc.record({
      logoUsageAllowed: fc.boolean(),
      promotionalApprovalRequired: fc.boolean(),
    }),
  }),
  fc.record({
    contentRights: fc.record({
      recordingAllowed: fc.boolean(),
      photographyAllowed: fc.boolean(),
    }),
  }),
);

/** Payment milestones that sum to 100% */
const validMilestonesArb = fc.integer({ min: 10, max: 90 }).map((deposit) => ({
  financial: {
    paymentMilestones: [
      { milestone: 'deposit', percentage: deposit, dueDate: 'upon_signing' },
      { milestone: 'pre_event', percentage: 100 - deposit, dueDate: '24h_before' },
    ],
  },
}));

/** Payment milestones that do NOT sum to 100% */
const invalidMilestonesArb = fc
  .tuple(
    fc.integer({ min: 1, max: 90 }),
    fc.integer({ min: 1, max: 90 }),
  )
  .filter(([a, b]) => a + b !== 100)
  .map(([a, b]) => ({
    financial: {
      paymentMilestones: [
        { milestone: 'deposit', percentage: a, dueDate: 'upon_signing' },
        { milestone: 'pre_event', percentage: b, dueDate: '24h_before' },
      ],
    },
  }));

/** A base terms object from a booking */
const baseTermsArb: fc.Arbitrary<Record<string, any>> = fc.constant({
  fee: 50000,
  currency: 'INR',
  depositPercent: 30,
  eventTitle: 'Test Event',
  eventDate: '2025-06-15',
  slotTime: '20:00',
  venueName: 'Test Venue',
  artistName: 'Test Artist',
  organizerName: 'Test Organizer',
  financial: {
    paymentMethod: 'bank_transfer',
    paymentMilestones: [
      { milestone: 'deposit', percentage: 30, dueDate: 'upon_signing' },
      { milestone: 'pre_event', percentage: 70, dueDate: '24h_before' },
    ],
  },
  travel: { responsibility: 'artist', flightClass: 'economy', airportPickup: false, groundTransport: 'not_provided' },
  accommodation: { included: false, hotelStarRating: 3, roomType: 'single', checkInTime: '14:00', checkOutTime: '12:00', nights: 1 },
  technical: { equipmentList: [], soundCheckDuration: 60, backlineProvided: [], stageSetupTime: 30 },
  hospitality: { guestListCount: 2, greenRoomAccess: false, mealsProvided: [], securityProvisions: 'standard' },
  branding: { logoUsageAllowed: true, promotionalApprovalRequired: true, socialMediaGuidelines: '', pressRequirements: '' },
  contentRights: { recordingAllowed: false, photographyAllowed: true, videographyAllowed: false, liveStreamingAllowed: false, socialMediaPostingAllowed: true },
  cancellation: {
    artistCancellationPenalties: { moreThan90Days: 0, between30And90Days: 20, lessThan30Days: 50 },
    organizerCancellationPenalties: { moreThan30Days: 20, between15And30Days: 50, lessThan15Days: 100 },
    forceMajeureClause: 'standard',
    customForceMajeureText: '',
  },
});


// ---------------------------------------------------------------------------
// Property 26: One-time edit enforcement
// Validates: Requirements 8.3
//
// For any party that has already used their edit (artistEditUsed or
// promoterEditUsed is true), a subsequent PROPOSE_EDITS review action
// should be rejected with a 400 error.
// ---------------------------------------------------------------------------
describe('Property 26: One-time edit enforcement', () => {
  it('artist with editUsed=true is rejected', () => {
    /** Validates: Requirements 8.3 */
    fc.assert(
      fc.property(contractStateArb({ artistEditUsed: true }), (contract) => {
        const error = checkOneTimeEdit(contract, 'artist');
        expect(error).not.toBeNull();
        expect(error).toContain('one-time edit');
      }),
      { numRuns: 100 },
    );
  });

  it('promoter with editUsed=true is rejected', () => {
    /** Validates: Requirements 8.3 */
    fc.assert(
      fc.property(contractStateArb({ promoterEditUsed: true }), (contract) => {
        const error = checkOneTimeEdit(contract, 'promoter');
        expect(error).not.toBeNull();
        expect(error).toContain('one-time edit');
      }),
      { numRuns: 100 },
    );
  });

  it('artist with editUsed=false is allowed', () => {
    /** Validates: Requirements 8.3 */
    fc.assert(
      fc.property(contractStateArb({ artistEditUsed: false }), (contract) => {
        const error = checkOneTimeEdit(contract, 'artist');
        expect(error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('promoter with editUsed=false is allowed', () => {
    /** Validates: Requirements 8.3 */
    fc.assert(
      fc.property(contractStateArb({ promoterEditUsed: false }), (contract) => {
        const error = checkOneTimeEdit(contract, 'promoter');
        expect(error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('each party edit flag is independent', () => {
    /** Validates: Requirements 8.3 */
    fc.assert(
      fc.property(
        contractStateArb({ artistEditUsed: true, promoterEditUsed: false }),
        (contract) => {
          expect(checkOneTimeEdit(contract, 'artist')).not.toBeNull();
          expect(checkOneTimeEdit(contract, 'promoter')).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 27: Pending edits block accept and sign
// Validates: Requirements 8.4
//
// For any contract with a pending edit request (status "pending"), accept
// and sign actions by either party should be rejected.
// ---------------------------------------------------------------------------
describe('Property 27: Pending edits block accept and sign', () => {
  it('pending edit request blocks actions', () => {
    /** Validates: Requirements 8.4 */
    fc.assert(
      fc.property(pendingEditArb, (editReq) => {
        const error = checkPendingEditBlocks(editReq);
        expect(error).not.toBeNull();
        expect(error).toContain('pending');
      }),
      { numRuns: 100 },
    );
  });

  it('resolved (approved/rejected) edit request does not block', () => {
    /** Validates: Requirements 8.4 */
    fc.assert(
      fc.property(resolvedEditArb, (editReq) => {
        const error = checkPendingEditBlocks(editReq);
        expect(error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('null edit request does not block', () => {
    /** Validates: Requirements 8.4 */
    const error = checkPendingEditBlocks(null);
    expect(error).toBeNull();
  });

  it('pending edit blocks regardless of requesting role', () => {
    /** Validates: Requirements 8.4 */
    fc.assert(
      fc.property(roleArb, idArb, (role, contractId) => {
        const editReq: EditRequest = {
          id: 1,
          contractId,
          status: 'pending',
          requestedByRole: role,
          changes: { travel: { responsibility: 'organizer' } },
        };
        const error = checkPendingEditBlocks(editReq);
        expect(error).not.toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 28: Edit approval creates new version with merged terms
// Validates: Requirements 8.5
//
// For any approved edit request, a new contract version should be created
// with the changes deep-merged into the current terms, and the contract's
// currentVersion should increment.
// ---------------------------------------------------------------------------
describe('Property 28: Edit approval creates new version with merged terms', () => {
  it('new version number is currentVersion + 1', () => {
    /** Validates: Requirements 8.5 */
    fc.assert(
      fc.property(versionArb, baseTermsArb, validEditableChangesArb, (version, terms, changes) => {
        const result = computeEditApproval(version, terms, changes);
        expect(result.newVersion).toBe(version + 1);
      }),
      { numRuns: 100 },
    );
  });

  it('merged terms contain the applied changes', () => {
    /** Validates: Requirements 8.5 */
    fc.assert(
      fc.property(baseTermsArb, (terms) => {
        const changes = { accommodation: { included: true, hotelStarRating: 5 } };
        const result = computeEditApproval(1, terms, changes);
        expect(result.mergedTerms.accommodation.included).toBe(true);
        expect(result.mergedTerms.accommodation.hotelStarRating).toBe(5);
      }),
      { numRuns: 100 },
    );
  });

  it('locked fields in terms are preserved after merge', () => {
    /** Validates: Requirements 8.5 */
    fc.assert(
      fc.property(baseTermsArb, validEditableChangesArb, (terms, changes) => {
        const result = computeEditApproval(1, terms, changes);
        // Core locked fields should remain unchanged
        expect(result.mergedTerms.fee).toBe(terms.fee);
        expect(result.mergedTerms.currency).toBe(terms.currency);
        expect(result.mergedTerms.venueName).toBe(terms.venueName);
        expect(result.mergedTerms.artistName).toBe(terms.artistName);
        expect(result.mergedTerms.organizerName).toBe(terms.organizerName);
      }),
      { numRuns: 100 },
    );
  });

  it('applyContractChanges deep-merges editable categories', () => {
    /** Validates: Requirements 8.5 */
    fc.assert(
      fc.property(baseTermsArb, (terms) => {
        const changes = {
          travel: { flightClass: 'business' },
          hospitality: { guestListCount: 10 },
        };
        const merged = applyContractChanges(terms, changes);
        // Changed fields updated
        expect(merged.travel.flightClass).toBe('business');
        expect(merged.hospitality.guestListCount).toBe(10);
        // Unchanged fields in same category preserved
        expect(merged.travel.responsibility).toBe(terms.travel.responsibility);
        expect(merged.hospitality.greenRoomAccess).toBe(terms.hospitality.greenRoomAccess);
      }),
      { numRuns: 100 },
    );
  });

  it('applyContractChanges does not mutate the original terms', () => {
    /** Validates: Requirements 8.5 */
    fc.assert(
      fc.property(baseTermsArb, validEditableChangesArb, (terms, changes) => {
        const originalJson = JSON.stringify(terms);
        applyContractChanges(terms, changes);
        expect(JSON.stringify(terms)).toBe(originalJson);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 29: Edit rejection preserves current version
// Validates: Requirements 8.6
//
// For any rejected edit request, the contract's currentVersion should
// remain unchanged and no new version record should be created.
// ---------------------------------------------------------------------------
describe('Property 29: Edit rejection preserves current version', () => {
  it('rejection returns the same currentVersion', () => {
    /** Validates: Requirements 8.6 */
    fc.assert(
      fc.property(versionArb, (version) => {
        const result = computeEditRejection(version);
        expect(result.currentVersion).toBe(version);
      }),
      { numRuns: 100 },
    );
  });

  it('rejection is idempotent — calling multiple times gives same result', () => {
    /** Validates: Requirements 8.6 */
    fc.assert(
      fc.property(versionArb, (version) => {
        const r1 = computeEditRejection(version);
        const r2 = computeEditRejection(version);
        expect(r1.currentVersion).toBe(r2.currentVersion);
      }),
      { numRuns: 100 },
    );
  });

  it('rejection version differs from what approval would produce', () => {
    /** Validates: Requirements 8.6 */
    fc.assert(
      fc.property(versionArb, baseTermsArb, (version, terms) => {
        const rejResult = computeEditRejection(version);
        const appResult = computeEditApproval(version, terms, { travel: { flightClass: 'business' } });
        expect(rejResult.currentVersion).toBe(version);
        expect(appResult.newVersion).toBe(version + 1);
        expect(rejResult.currentVersion).not.toBe(appResult.newVersion);
      }),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 30: Locked fields cannot be modified
// Validates: Requirements 8.7
//
// For any proposed contract changes that include any locked field (fee,
// totalFee, currency, eventDate, eventTime, slotType, venueName, artistName,
// organizerName, performanceDuration, platformCommission), the validation
// should reject the changes.
// ---------------------------------------------------------------------------
describe('Property 30: Locked fields cannot be modified', () => {
  it('any top-level locked field with a defined value produces an error', () => {
    /** Validates: Requirements 8.7 */
    fc.assert(
      fc.property(
        fc.constantFrom(...LOCKED_FIELDS),
        fc.oneof(fc.integer(), fc.string(), fc.boolean(), fc.constant(null)),
        (field, value) => {
          const changes = { [field]: value };
          const errors = validateLockedFields(changes);
          expect(errors.length).toBeGreaterThan(0);
          expect(errors.some((e) => e.includes(field))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('changes without locked fields produce no locked-field errors', () => {
    /** Validates: Requirements 8.7 */
    fc.assert(
      fc.property(validEditableChangesArb, (changes) => {
        const errors = validateLockedFields(changes);
        expect(errors.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('multiple locked fields produce multiple errors', () => {
    /** Validates: Requirements 8.7 */
    fc.assert(
      fc.property(
        fc.subarray(LOCKED_FIELDS, { minLength: 2, maxLength: 5 }),
        (fields) => {
          const changes: Record<string, any> = {};
          for (const f of fields) {
            changes[f] = 'hacked';
          }
          const errors = validateLockedFields(changes);
          expect(errors.length).toBeGreaterThanOrEqual(fields.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('validateContractChanges also catches locked fields', () => {
    /** Validates: Requirements 8.7 */
    fc.assert(
      fc.property(
        fc.constantFrom(...LOCKED_FIELDS),
        (field) => {
          const changes = { [field]: 999 };
          const result = validateContractChanges(changes);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes(field))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 31: Contract edit validation rules
// Validates: Requirements 8.8
//
// For any proposed contract changes:
// - Payment milestone percentages must sum to 100%
// - Cancellation penalties must be between 0-100%
// - Check-in time must be before check-out time
// Violations should produce specific error messages.
// ---------------------------------------------------------------------------
describe('Property 31: Contract edit validation rules', () => {
  it('valid milestones summing to 100% pass validation', () => {
    /** Validates: Requirements 8.8 */
    fc.assert(
      fc.property(validMilestonesArb, (changes) => {
        const result = validateContractChanges(changes);
        // Should have no milestone-related errors
        const milestoneErrors = result.errors.filter((e) => e.includes('milestones'));
        expect(milestoneErrors.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('milestones not summing to 100% produce an error', () => {
    /** Validates: Requirements 8.8 */
    fc.assert(
      fc.property(invalidMilestonesArb, (changes) => {
        const result = validateContractChanges(changes);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('milestones must sum to 100%'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('cancellation penalties within 0-100% pass validation', () => {
    /** Validates: Requirements 8.8 */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (a, b, c) => {
          const changes = {
            cancellation: {
              artistCancellationPenalties: {
                moreThan90Days: a,
                between30And90Days: b,
                lessThan30Days: c,
              },
            },
          };
          const result = validateContractChanges(changes);
          const penaltyErrors = result.errors.filter((e) => e.includes('penalties'));
          expect(penaltyErrors.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cancellation penalties outside 0-100% produce an error', () => {
    /** Validates: Requirements 8.8 */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -1000, max: -1 }),
          fc.integer({ min: 101, max: 1000 }),
        ),
        (badPenalty) => {
          const changes = {
            cancellation: {
              artistCancellationPenalties: {
                moreThan90Days: badPenalty,
              },
            },
          };
          const result = validateContractChanges(changes);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('penalties') && e.includes('0 and 100'))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('check-in before check-out passes validation', () => {
    /** Validates: Requirements 8.8 */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 22 }),
        (hour) => {
          const checkIn = `${String(hour).padStart(2, '0')}:00`;
          const checkOut = `${String(hour + 1).padStart(2, '0')}:00`;
          const changes = { accommodation: { checkInTime: checkIn, checkOutTime: checkOut } };
          const result = validateContractChanges(changes);
          const timeErrors = result.errors.filter((e) => e.includes('Check-in'));
          expect(timeErrors.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('check-in equal to or after check-out produces an error', () => {
    /** Validates: Requirements 8.8 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 23 }),
        (hour) => {
          const time = `${String(hour).padStart(2, '0')}:00`;
          // Same time
          const changes1 = { accommodation: { checkInTime: time, checkOutTime: time } };
          const result1 = validateContractChanges(changes1);
          expect(result1.errors.some((e) => e.includes('Check-in time must be before check-out'))).toBe(true);

          // Check-in after check-out
          const earlier = `${String(hour - 1).padStart(2, '0')}:00`;
          const changes2 = { accommodation: { checkInTime: time, checkOutTime: earlier } };
          const result2 = validateContractChanges(changes2);
          expect(result2.errors.some((e) => e.includes('Check-in time must be before check-out'))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('valid editable changes with no rule violations pass', () => {
    /** Validates: Requirements 8.8 */
    fc.assert(
      fc.property(validEditableChangesArb, (changes) => {
        const result = validateContractChanges(changes);
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});
