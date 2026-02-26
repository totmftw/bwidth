import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateContractText,
  buildTermsFromBooking,
  calculateDeadline,
  buildVersion1,
  prepareContractInitiation,
  shouldReturnExisting,
  DEADLINE_HOURS,
  type BookingForContract,
} from '../../server/contract-utils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const idArb = fc.integer({ min: 1, max: 100000 });

const feeArb = fc.double({ min: 100, max: 10_000_000, noNaN: true, noDefaultInfinity: true });

const currencyArb = fc.constantFrom('INR', 'USD', 'EUR', 'GBP');

const artistNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const venueNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const organizerNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const eventTitleArb = fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0);

/** A future date for events — use integer timestamps to avoid invalid date issues */
const futureDateArb = fc.integer({
  min: new Date('2025-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(ts => new Date(ts));

/** A booking with all fields populated for contract generation */
const bookingArb: fc.Arbitrary<BookingForContract> = fc.record({
  id: idArb,
  offerAmount: feeArb.map(f => f.toString()),
  finalAmount: fc.option(feeArb.map(f => f.toString()), { nil: null }),
  offerCurrency: currencyArb,
  depositPercent: fc.integer({ min: 10, max: 50 }).map(n => n.toString()),
  slotTime: fc.constantFrom('20:00', '21:00', '22:00', null),
  eventDate: fc.option(futureDateArb.map(d => d.toISOString()), { nil: null }),
  meta: fc.constant({}),
  artist: fc.record({
    name: artistNameArb,
    user: fc.record({ displayName: artistNameArb }),
  }),
  organizer: fc.record({
    name: organizerNameArb,
    user: fc.record({ displayName: organizerNameArb }),
  }),
  venue: fc.record({
    name: venueNameArb,
    address: fc.constantFrom('123 Main St', 'Bangalore, India'),
  }),
  event: fc.record({
    title: eventTitleArb,
    startTime: futureDateArb.map(d => d.toISOString()),
  }),
});

const initiatedAtArb = fc.integer({
  min: new Date('2025-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(ts => new Date(ts));

// ---------------------------------------------------------------------------
// Property 22: Contract text contains core terms from booking
// Validates: Requirements 7.2
//
// For any contract initiated from a booking, the generated contract text
// should contain the fee amount, event date, venue name, and artist name
// from the booking and event records.
// ---------------------------------------------------------------------------
describe('Property 22: Contract text contains core terms from booking', () => {
  it('contract text contains the artist name', () => {
    /** Validates: Requirements 7.2 */
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const terms = buildTermsFromBooking(booking);
        const text = generateContractText(booking, terms);
        const artistName = booking.artist?.name || '';
        expect(text).toContain(artistName);
      }),
      { numRuns: 100 },
    );
  });

  it('contract text contains the venue name', () => {
    /** Validates: Requirements 7.2 */
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const terms = buildTermsFromBooking(booking);
        const text = generateContractText(booking, terms);
        const venueName = booking.venue?.name || '';
        expect(text).toContain(venueName);
      }),
      { numRuns: 100 },
    );
  });

  it('contract text contains the fee amount', () => {
    /** Validates: Requirements 7.2 */
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const terms = buildTermsFromBooking(booking);
        const text = generateContractText(booking, terms);
        const fee = Number(booking.finalAmount || booking.offerAmount || 0);
        // The fee is formatted with toLocaleString(), so check the raw number is present
        expect(text).toContain(fee.toLocaleString());
      }),
      { numRuns: 100 },
    );
  });

  it('contract text contains the organizer name', () => {
    /** Validates: Requirements 7.2 */
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const terms = buildTermsFromBooking(booking);
        const text = generateContractText(booking, terms);
        const organizerName = booking.organizer?.name || '';
        expect(text).toContain(organizerName);
      }),
      { numRuns: 100 },
    );
  });

  it('contract text contains the event date', () => {
    /** Validates: Requirements 7.2 */
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const terms = buildTermsFromBooking(booking);
        const text = generateContractText(booking, terms);
        // The event date is formatted via toLocaleDateString, so check the venue name
        // as a proxy that the event section is populated. The date is always present
        // in the text since we always provide event.startTime in our arbitrary.
        const eventDate = booking.event?.startTime;
        if (eventDate) {
          const formatted = new Date(eventDate as string).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          });
          expect(text).toContain(formatted);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('buildTermsFromBooking captures fee, venue, artist, and event title', () => {
    /** Validates: Requirements 7.2 */
    fc.assert(
      fc.property(bookingArb, (booking) => {
        const terms = buildTermsFromBooking(booking) as any;
        const expectedFee = Number(booking.finalAmount || booking.offerAmount || 0);
        expect(terms.fee).toBe(expectedFee);
        expect(terms.venueName).toBe(booking.venue?.name || '');
        expect(terms.artistName).toBe(booking.artist?.name || '');
        expect(terms.eventTitle).toBe(booking.event?.title || '');
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: Contract initiation sets 48-hour deadline
// Validates: Requirements 7.3
//
// For any newly initiated contract, the deadlineAt field should be exactly
// 48 hours after initiatedAt.
// ---------------------------------------------------------------------------
describe('Property 23: Contract initiation sets 48-hour deadline', () => {
  it('deadline is exactly 48 hours after initiatedAt', () => {
    /** Validates: Requirements 7.3 */
    fc.assert(
      fc.property(initiatedAtArb, (initiatedAt) => {
        const deadline = calculateDeadline(initiatedAt);
        const diffMs = deadline.getTime() - initiatedAt.getTime();
        const expectedMs = DEADLINE_HOURS * 60 * 60 * 1000;
        expect(diffMs).toBe(expectedMs);
      }),
      { numRuns: 100 },
    );
  });

  it('prepareContractInitiation sets deadlineAt = initiatedAt + 48h', () => {
    /** Validates: Requirements 7.3 */
    fc.assert(
      fc.property(bookingArb, initiatedAtArb, (booking, initiatedAt) => {
        const result = prepareContractInitiation(booking, initiatedAt);
        const diffMs = result.contract.deadlineAt.getTime() - result.contract.initiatedAt.getTime();
        const expectedMs = DEADLINE_HOURS * 60 * 60 * 1000;
        expect(diffMs).toBe(expectedMs);
      }),
      { numRuns: 100 },
    );
  });

  it('deadline is always in the future relative to initiatedAt', () => {
    /** Validates: Requirements 7.3 */
    fc.assert(
      fc.property(initiatedAtArb, (initiatedAt) => {
        const deadline = calculateDeadline(initiatedAt);
        expect(deadline.getTime()).toBeGreaterThan(initiatedAt.getTime());
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 24: Contract initiation creates version 1
// Validates: Requirements 7.4
//
// For any newly initiated contract, a contractVersions record should exist
// with version: 1, containing the generated text and structured terms.
// ---------------------------------------------------------------------------
describe('Property 24: Contract initiation creates version 1', () => {
  it('prepareContractInitiation creates a version with version=1', () => {
    /** Validates: Requirements 7.4 */
    fc.assert(
      fc.property(bookingArb, initiatedAtArb, (booking, initiatedAt) => {
        const result = prepareContractInitiation(booking, initiatedAt);
        expect(result.version.version).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('version 1 text matches the contract text', () => {
    /** Validates: Requirements 7.4 */
    fc.assert(
      fc.property(bookingArb, initiatedAtArb, (booking, initiatedAt) => {
        const result = prepareContractInitiation(booking, initiatedAt);
        expect(result.version.contractText).toBe(result.contractText);
        expect(result.contract.contractText).toBe(result.contractText);
      }),
      { numRuns: 100 },
    );
  });

  it('version 1 terms match the contract metadata terms', () => {
    /** Validates: Requirements 7.4 */
    fc.assert(
      fc.property(bookingArb, initiatedAtArb, (booking, initiatedAt) => {
        const result = prepareContractInitiation(booking, initiatedAt);
        expect(result.version.terms).toEqual(result.terms);
        expect(result.contract.metadata.terms).toEqual(result.terms);
      }),
      { numRuns: 100 },
    );
  });

  it('contract currentVersion is set to 1', () => {
    /** Validates: Requirements 7.4 */
    fc.assert(
      fc.property(bookingArb, initiatedAtArb, (booking, initiatedAt) => {
        const result = prepareContractInitiation(booking, initiatedAt);
        expect(result.contract.currentVersion).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('buildVersion1 produces correct version record', () => {
    /** Validates: Requirements 7.4 */
    fc.assert(
      fc.property(
        idArb,
        fc.string({ minLength: 1 }),
        idArb,
        (contractId, text, createdBy) => {
          const terms = { fee: 1000 };
          const version = buildVersion1(contractId, text, terms, createdBy);
          expect(version.contractId).toBe(contractId);
          expect(version.version).toBe(1);
          expect(version.contractText).toBe(text);
          expect(version.terms).toEqual(terms);
          expect(version.changeSummary).toContain('Initial contract generation');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 25: Contract initiation is idempotent
// Validates: Requirements 7.5
//
// For any booking that already has a contract, calling the initiate endpoint
// again should return the existing contract without creating a duplicate.
// ---------------------------------------------------------------------------
describe('Property 25: Contract initiation is idempotent', () => {
  it('shouldReturnExisting returns "return_existing" for non-voided contracts', () => {
    /** Validates: Requirements 7.5 */
    fc.assert(
      fc.property(
        fc.constantFrom('sent', 'signed', 'admin_review'),
        (status) => {
          const result = shouldReturnExisting({ status });
          expect(result).toBe('return_existing');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('shouldReturnExisting returns "voided" for voided contracts', () => {
    /** Validates: Requirements 7.5 */
    fc.assert(
      fc.property(
        fc.constant('voided'),
        (status) => {
          const result = shouldReturnExisting({ status });
          expect(result).toBe('voided');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('shouldReturnExisting returns "none" when no contract exists', () => {
    /** Validates: Requirements 7.5 */
    const result = shouldReturnExisting(null);
    expect(result).toBe('none');
  });

  it('idempotency: same booking always gets same decision from shouldReturnExisting', () => {
    /** Validates: Requirements 7.5 */
    fc.assert(
      fc.property(
        fc.constantFrom('sent', 'signed', 'admin_review', 'voided'),
        (status) => {
          const first = shouldReturnExisting({ status });
          const second = shouldReturnExisting({ status });
          expect(first).toBe(second);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('prepareContractInitiation is deterministic for same inputs', () => {
    /** Validates: Requirements 7.5 */
    fc.assert(
      fc.property(bookingArb, initiatedAtArb, (booking, initiatedAt) => {
        const result1 = prepareContractInitiation(booking, initiatedAt);
        const result2 = prepareContractInitiation(booking, initiatedAt);
        // Same booking + same initiatedAt → same terms and deadline
        expect(result1.terms).toEqual(result2.terms);
        expect(result1.contract.deadlineAt.getTime()).toBe(result2.contract.deadlineAt.getTime());
        expect(result1.contract.currentVersion).toBe(result2.contract.currentVersion);
        expect(result1.version.version).toBe(result2.version.version);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Imports for Properties 32-35
// ---------------------------------------------------------------------------
import {
  checkReviewBeforeAccept,
  checkAcceptBeforeSign,
  validateSignatureData,
  checkDualSignature,
  checkDeadlineExpired,
  type ContractLifecycleState,
  type SignatureData,
} from '../../server/contract-utils';

// ---------------------------------------------------------------------------
// Arbitraries for Properties 32-35
// ---------------------------------------------------------------------------

const roleArb = fc.constantFrom('artist', 'promoter') as fc.Arbitrary<'artist' | 'promoter'>;

const pastDateArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2024-12-31').getTime(),
}).map(ts => new Date(ts));

const signatureTypeArb = fc.constantFrom('drawn', 'typed', 'uploaded') as fc.Arbitrary<'drawn' | 'typed' | 'uploaded'>;

const ipAddressArb = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

const userAgentArb = fc.constantFrom(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'Mozilla/5.0 (X11; Linux x86_64)',
);

const validSignatureArb: fc.Arbitrary<SignatureData> = fc.record({
  signatureData: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  signatureType: signatureTypeArb,
  ipAddress: ipAddressArb,
  userAgent: userAgentArb,
});

/** Contract lifecycle state with configurable review/accept/sign flags */
const lifecycleStateArb = (opts?: {
  artistReviewed?: boolean;
  promoterReviewed?: boolean;
  artistAccepted?: boolean;
  promoterAccepted?: boolean;
  artistSigned?: boolean;
  promoterSigned?: boolean;
  deadlineAt?: Date | null;
}): fc.Arbitrary<ContractLifecycleState> =>
  fc.record({
    artistReviewDoneAt: fc.constant(opts?.artistReviewed ? new Date('2025-01-15') : null),
    promoterReviewDoneAt: fc.constant(opts?.promoterReviewed ? new Date('2025-01-15') : null),
    artistAcceptedAt: fc.constant(opts?.artistAccepted ? new Date('2025-01-16') : null),
    promoterAcceptedAt: fc.constant(opts?.promoterAccepted ? new Date('2025-01-16') : null),
    signedByArtist: fc.constant(opts?.artistSigned ?? false),
    signedByPromoter: fc.constant(opts?.promoterSigned ?? false),
    signedAt: fc.constant(null),
    deadlineAt: fc.constant(opts?.deadlineAt !== undefined ? opts.deadlineAt : new Date('2025-02-01')),
    status: fc.constant('sent'),
  });

// ---------------------------------------------------------------------------
// Property 32: Contract lifecycle ordering enforcement
// Validates: Requirements 9.1, 9.2
//
// For any party attempting to accept a contract, the system should require
// that the party has completed their review first. For any party attempting
// to sign, the system should require that the party has accepted first.
// ---------------------------------------------------------------------------
describe('Property 32: Contract lifecycle ordering enforcement', () => {
  it('accept is rejected when review is not done', () => {
    /** Validates: Requirements 9.1 */
    fc.assert(
      fc.property(roleArb, (role) => {
        const contract = role === 'artist'
          ? { artistReviewDoneAt: null, promoterReviewDoneAt: new Date(), artistAcceptedAt: null, promoterAcceptedAt: null, signedByArtist: false, signedByPromoter: false, signedAt: null, deadlineAt: new Date('2025-02-01'), status: 'sent' } as ContractLifecycleState
          : { artistReviewDoneAt: new Date(), promoterReviewDoneAt: null, artistAcceptedAt: null, promoterAcceptedAt: null, signedByArtist: false, signedByPromoter: false, signedAt: null, deadlineAt: new Date('2025-02-01'), status: 'sent' } as ContractLifecycleState;
        const error = checkReviewBeforeAccept(contract, role);
        expect(error).not.toBeNull();
        expect(error).toContain('review');
      }),
      { numRuns: 100 },
    );
  });

  it('accept is allowed when review is done', () => {
    /** Validates: Requirements 9.1 */
    fc.assert(
      fc.property(roleArb, (role) => {
        const state = lifecycleStateArb({
          artistReviewed: true,
          promoterReviewed: true,
        });
        return fc.assert(
          fc.property(state, (contract) => {
            const error = checkReviewBeforeAccept(contract, role);
            expect(error).toBeNull();
          }),
          { numRuns: 1 },
        );
      }),
      { numRuns: 100 },
    );
  });

  it('sign is rejected when accept is not done', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(roleArb, (role) => {
        const contract = role === 'artist'
          ? { artistReviewDoneAt: new Date(), promoterReviewDoneAt: new Date(), artistAcceptedAt: null, promoterAcceptedAt: new Date(), signedByArtist: false, signedByPromoter: false, signedAt: null, deadlineAt: new Date('2025-02-01'), status: 'sent' } as ContractLifecycleState
          : { artistReviewDoneAt: new Date(), promoterReviewDoneAt: new Date(), artistAcceptedAt: new Date(), promoterAcceptedAt: null, signedByArtist: false, signedByPromoter: false, signedAt: null, deadlineAt: new Date('2025-02-01'), status: 'sent' } as ContractLifecycleState;
        const error = checkAcceptBeforeSign(contract, role);
        expect(error).not.toBeNull();
        expect(error).toContain('accept');
      }),
      { numRuns: 100 },
    );
  });

  it('sign is allowed when accept is done', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(roleArb, (role) => {
        const state = lifecycleStateArb({
          artistReviewed: true,
          promoterReviewed: true,
          artistAccepted: true,
          promoterAccepted: true,
        });
        return fc.assert(
          fc.property(state, (contract) => {
            const error = checkAcceptBeforeSign(contract, role);
            expect(error).toBeNull();
          }),
          { numRuns: 1 },
        );
      }),
      { numRuns: 100 },
    );
  });

  it('lifecycle ordering is enforced per-party independently', () => {
    /** Validates: Requirements 9.1, 9.2 */
    fc.assert(
      fc.property(
        lifecycleStateArb({
          artistReviewed: true,
          promoterReviewed: false,
          artistAccepted: true,
          promoterAccepted: false,
        }),
        (contract) => {
          // Artist has reviewed and accepted — can proceed
          expect(checkReviewBeforeAccept(contract, 'artist')).toBeNull();
          expect(checkAcceptBeforeSign(contract, 'artist')).toBeNull();
          // Promoter has not reviewed — blocked at accept
          expect(checkReviewBeforeAccept(contract, 'promoter')).not.toBeNull();
          // Promoter has not accepted — blocked at sign
          expect(checkAcceptBeforeSign(contract, 'promoter')).not.toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 33: Signature data completeness
// Validates: Requirements 9.3
//
// For any contract signature, the record should contain the signature data,
// signature type (drawn/typed/uploaded), IP address, and user agent.
// ---------------------------------------------------------------------------
describe('Property 33: Signature data completeness', () => {
  it('valid signature data passes validation', () => {
    /** Validates: Requirements 9.3 */
    fc.assert(
      fc.property(validSignatureArb, (sig) => {
        const result = validateSignatureData(sig);
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('missing signatureData is rejected', () => {
    /** Validates: Requirements 9.3 */
    fc.assert(
      fc.property(validSignatureArb, (sig) => {
        const invalid: SignatureData = { ...sig, signatureData: null };
        const result = validateSignatureData(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Signature data'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('invalid signatureType is rejected', () => {
    /** Validates: Requirements 9.3 */
    fc.assert(
      fc.property(validSignatureArb, (sig) => {
        const invalid: SignatureData = { ...sig, signatureType: 'invalid_type' };
        const result = validateSignatureData(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Signature type'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('missing ipAddress is rejected', () => {
    /** Validates: Requirements 9.3 */
    fc.assert(
      fc.property(validSignatureArb, (sig) => {
        const invalid: SignatureData = { ...sig, ipAddress: null };
        const result = validateSignatureData(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('IP address'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('missing userAgent is rejected', () => {
    /** Validates: Requirements 9.3 */
    fc.assert(
      fc.property(validSignatureArb, (sig) => {
        const invalid: SignatureData = { ...sig, userAgent: null };
        const result = validateSignatureData(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('User agent'))).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('multiple missing fields produce multiple errors', () => {
    /** Validates: Requirements 9.3 */
    fc.assert(
      fc.property(fc.constant(null), () => {
        const empty: SignatureData = {
          signatureData: null,
          signatureType: null,
          ipAddress: null,
          userAgent: null,
        };
        const result = validateSignatureData(empty);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(4);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 34: Dual signature triggers admin_review and sets signedAt
// Validates: Requirements 9.4, 9.5
//
// For any contract where both parties have signed, the contract status
// should be set to "admin_review" and signedAt should be set to the
// current timestamp.
// ---------------------------------------------------------------------------
describe('Property 34: Dual signature triggers admin_review and sets signedAt', () => {
  it('when other party already signed, signing triggers admin_review', () => {
    /** Validates: Requirements 9.4, 9.5 */
    fc.assert(
      fc.property(roleArb, (signingRole) => {
        const contract = lifecycleStateArb({
          artistReviewed: true,
          promoterReviewed: true,
          artistAccepted: true,
          promoterAccepted: true,
          artistSigned: signingRole === 'promoter',
          promoterSigned: signingRole === 'artist',
        });
        return fc.assert(
          fc.property(contract, (c) => {
            const result = checkDualSignature(c, signingRole);
            expect(result.fullyExecuted).toBe(true);
            expect(result.newStatus).toBe('admin_review');
            expect(result.shouldSetSignedAt).toBe(true);
          }),
          { numRuns: 1 },
        );
      }),
      { numRuns: 100 },
    );
  });

  it('when other party has NOT signed, signing does not trigger admin_review', () => {
    /** Validates: Requirements 9.4, 9.5 */
    fc.assert(
      fc.property(roleArb, (signingRole) => {
        const contract = lifecycleStateArb({
          artistReviewed: true,
          promoterReviewed: true,
          artistAccepted: true,
          promoterAccepted: true,
          artistSigned: false,
          promoterSigned: false,
        });
        return fc.assert(
          fc.property(contract, (c) => {
            const result = checkDualSignature(c, signingRole);
            expect(result.fullyExecuted).toBe(false);
            expect(result.newStatus).toBeNull();
            expect(result.shouldSetSignedAt).toBe(false);
          }),
          { numRuns: 1 },
        );
      }),
      { numRuns: 100 },
    );
  });

  it('artist signing when promoter already signed triggers full execution', () => {
    /** Validates: Requirements 9.4, 9.5 */
    fc.assert(
      fc.property(
        lifecycleStateArb({
          artistReviewed: true,
          promoterReviewed: true,
          artistAccepted: true,
          promoterAccepted: true,
          artistSigned: false,
          promoterSigned: true,
        }),
        (contract) => {
          const result = checkDualSignature(contract, 'artist');
          expect(result.fullyExecuted).toBe(true);
          expect(result.newStatus).toBe('admin_review');
          expect(result.shouldSetSignedAt).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('promoter signing when artist already signed triggers full execution', () => {
    /** Validates: Requirements 9.4, 9.5 */
    fc.assert(
      fc.property(
        lifecycleStateArb({
          artistReviewed: true,
          promoterReviewed: true,
          artistAccepted: true,
          promoterAccepted: true,
          artistSigned: true,
          promoterSigned: false,
        }),
        (contract) => {
          const result = checkDualSignature(contract, 'promoter');
          expect(result.fullyExecuted).toBe(true);
          expect(result.newStatus).toBe('admin_review');
          expect(result.shouldSetSignedAt).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 35: Expired deadline rejects all contract actions
// Validates: Requirements 9.6
//
// For any contract whose deadlineAt is in the past, all review, accept,
// and sign actions should be rejected with a "deadline passed" error.
// ---------------------------------------------------------------------------
describe('Property 35: Expired deadline rejects all contract actions', () => {
  it('expired deadline returns an error', () => {
    /** Validates: Requirements 9.6 */
    fc.assert(
      fc.property(pastDateArb, (deadline) => {
        const now = new Date(); // now is always after pastDateArb range (2020-2024)
        const error = checkDeadlineExpired(deadline, now);
        expect(error).not.toBeNull();
        expect(error).toContain('deadline');
      }),
      { numRuns: 100 },
    );
  });

  it('future deadline returns no error', () => {
    /** Validates: Requirements 9.6 */
    fc.assert(
      fc.property(futureDateArb, (deadline) => {
        const now = new Date('2024-06-01'); // now is always before futureDateArb range (2025-2030)
        const error = checkDeadlineExpired(deadline, now);
        expect(error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('null deadline returns no error (no deadline set)', () => {
    /** Validates: Requirements 9.6 */
    const error = checkDeadlineExpired(null);
    expect(error).toBeNull();
  });

  it('deadline exactly at now is not expired (boundary)', () => {
    /** Validates: Requirements 9.6 */
    fc.assert(
      fc.property(futureDateArb, (date) => {
        // When now === deadline, now > deadline is false, so not expired
        const error = checkDeadlineExpired(date, date);
        expect(error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('expired deadline blocks all lifecycle actions uniformly', () => {
    /** Validates: Requirements 9.6 */
    fc.assert(
      fc.property(pastDateArb, roleArb, (deadline, role) => {
        const now = new Date();
        // Deadline check is independent of role — same error for any party
        const error = checkDeadlineExpired(deadline, now);
        expect(error).not.toBeNull();
        expect(error).toContain('deadline');
      }),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Imports for Properties 36-37
// ---------------------------------------------------------------------------
import {
  computeDeadlineEnforcement,
  checkVoidedContract,
  type DeadlineEnforcementInput,
} from '../../server/contract-utils';

// ---------------------------------------------------------------------------
// Arbitraries for Properties 36-37
// ---------------------------------------------------------------------------

const contractIdArb = fc.integer({ min: 1, max: 100000 });
const bookingIdArb = fc.integer({ min: 1, max: 100000 });

/** A "sent" contract with a past deadline — should be voided */
const expiredSentContractArb: fc.Arbitrary<DeadlineEnforcementInput> = fc.record({
  id: contractIdArb,
  bookingId: bookingIdArb,
  status: fc.constant('sent'),
  deadlineAt: pastDateArb,
});

/** A "sent" contract with a future deadline — should NOT be voided */
const activeSentContractArb: fc.Arbitrary<DeadlineEnforcementInput> = fc.record({
  id: contractIdArb,
  bookingId: bookingIdArb,
  status: fc.constant('sent'),
  deadlineAt: futureDateArb,
});

/** A non-"sent" contract with a past deadline — should NOT be voided */
const nonSentExpiredContractArb: fc.Arbitrary<DeadlineEnforcementInput> = fc.record({
  id: contractIdArb,
  bookingId: bookingIdArb,
  status: fc.constantFrom('signed', 'admin_review', 'voided', 'active'),
  deadlineAt: pastDateArb,
});

/** Any contract status used in the system */
const contractStatusArb = fc.constantFrom(
  'draft', 'sent', 'signed', 'admin_review', 'active', 'voided', 'cancelled',
);

/** Actions that should be rejected on voided contracts */
const contractActionArb = fc.constantFrom('review', 'accept', 'sign', 'edit');

// ---------------------------------------------------------------------------
// Property 36: Deadline enforcement voids contracts and cancels bookings
// Validates: Requirements 10.1, 10.2
//
// For any contract with status "sent" whose deadlineAt is in the past,
// the deadline check should set the contract status to "voided" and the
// associated booking status to "cancelled" with meta indicating
// "contract_deadline_expired".
// ---------------------------------------------------------------------------
describe('Property 36: Deadline enforcement voids contracts and cancels bookings', () => {
  it('expired "sent" contracts are voided with cancelled booking', () => {
    /** Validates: Requirements 10.1, 10.2 */
    fc.assert(
      fc.property(expiredSentContractArb, (contract) => {
        const now = new Date(); // now is always after pastDateArb range (2020-2024)
        const result = computeDeadlineEnforcement(contract, now);
        expect(result.shouldVoid).toBe(true);
        expect(result.newContractStatus).toBe('voided');
        expect(result.newBookingStatus).toBe('cancelled');
        expect(result.cancelReason).toBe('contract_deadline_expired');
        expect(result.contractId).toBe(contract.id);
        expect(result.bookingId).toBe(contract.bookingId);
      }),
      { numRuns: 100 },
    );
  });

  it('"sent" contracts with future deadline are NOT voided', () => {
    /** Validates: Requirements 10.1 */
    fc.assert(
      fc.property(activeSentContractArb, (contract) => {
        const now = new Date('2024-06-01'); // now is always before futureDateArb range (2025-2030)
        const result = computeDeadlineEnforcement(contract, now);
        expect(result.shouldVoid).toBe(false);
        expect(result.newContractStatus).toBeNull();
        expect(result.newBookingStatus).toBeNull();
        expect(result.cancelReason).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('non-"sent" contracts with past deadline are NOT voided', () => {
    /** Validates: Requirements 10.1 */
    fc.assert(
      fc.property(nonSentExpiredContractArb, (contract) => {
        const now = new Date();
        const result = computeDeadlineEnforcement(contract, now);
        expect(result.shouldVoid).toBe(false);
        expect(result.newContractStatus).toBeNull();
        expect(result.newBookingStatus).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('contracts with null deadline are never voided', () => {
    /** Validates: Requirements 10.1 */
    fc.assert(
      fc.property(contractIdArb, bookingIdArb, contractStatusArb, (id, bookingId, status) => {
        const contract: DeadlineEnforcementInput = { id, bookingId, status, deadlineAt: null };
        const result = computeDeadlineEnforcement(contract, new Date());
        expect(result.shouldVoid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('voided contract always carries the correct cancel reason', () => {
    /** Validates: Requirements 10.2 */
    fc.assert(
      fc.property(expiredSentContractArb, (contract) => {
        const now = new Date();
        const result = computeDeadlineEnforcement(contract, now);
        if (result.shouldVoid) {
          expect(result.cancelReason).toBe('contract_deadline_expired');
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 37: Voided contracts reject further actions
// Validates: Requirements 10.4
//
// For any contract with status "voided", all review, accept, sign, and
// edit actions should be rejected.
// ---------------------------------------------------------------------------
describe('Property 37: Voided contracts reject further actions', () => {
  it('voided status rejects all actions', () => {
    /** Validates: Requirements 10.4 */
    fc.assert(
      fc.property(contractActionArb, (_action) => {
        const error = checkVoidedContract('voided');
        expect(error).not.toBeNull();
        expect(error).toContain('voided');
      }),
      { numRuns: 100 },
    );
  });

  it('non-voided statuses allow actions', () => {
    /** Validates: Requirements 10.4 */
    const nonVoidedStatusArb = fc.constantFrom('draft', 'sent', 'signed', 'admin_review', 'active');
    fc.assert(
      fc.property(nonVoidedStatusArb, (status) => {
        const error = checkVoidedContract(status);
        expect(error).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('voided contract rejection is consistent across all action types', () => {
    /** Validates: Requirements 10.4 */
    fc.assert(
      fc.property(contractActionArb, contractActionArb, (action1, action2) => {
        const error1 = checkVoidedContract('voided');
        const error2 = checkVoidedContract('voided');
        // Both actions get the same rejection — voided is a terminal state
        expect(error1).toBe(error2);
        expect(error1).not.toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('deadline enforcement followed by voided check produces consistent rejection', () => {
    /** Validates: Requirements 10.1, 10.4 */
    fc.assert(
      fc.property(expiredSentContractArb, (contract) => {
        const now = new Date();
        const enforcement = computeDeadlineEnforcement(contract, now);
        // After enforcement voids the contract...
        if (enforcement.shouldVoid && enforcement.newContractStatus === 'voided') {
          // ...the voided check should reject all further actions
          const error = checkVoidedContract(enforcement.newContractStatus);
          expect(error).not.toBeNull();
          expect(error).toContain('voided');
        }
      }),
      { numRuns: 100 },
    );
  });
});
