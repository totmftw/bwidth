/**
 * Pure utility functions extracted from the contract routes
 * for testability. These functions contain no DB or I/O dependencies.
 *
 * Used by: server/routes/contracts.ts
 * Tested by: tests/properties/contract-lifecycle.prop.ts
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEADLINE_HOURS = 48;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingForContract {
  id: number;
  offerAmount: number | string | null;
  finalAmount?: number | string | null;
  offerCurrency?: string;
  depositPercent?: number | string | null;
  slotTime?: string | null;
  eventDate?: string | null;
  meta?: Record<string, unknown>;
  artist?: {
    name?: string;
    user?: { displayName?: string };
  } | null;
  organizer?: {
    name?: string;
    user?: { displayName?: string };
  } | null;
  venue?: {
    name?: string;
    address?: string | object;
  } | null;
  event?: {
    title?: string;
    startTime?: string | Date | null;
  } | null;
}

export interface ContractRecord {
  id: number;
  bookingId: number;
  status: string;
  contractText: string;
  initiatedAt: Date;
  deadlineAt: Date;
  currentVersion: number;
  metadata: { terms: Record<string, unknown> };
}

export interface ContractVersionRecord {
  contractId: number;
  version: number;
  contractText: string;
  terms: Record<string, unknown>;
  changeSummary: string;
}

export interface ContractInitiationResult {
  contract: Omit<ContractRecord, 'id'>;
  version: ContractVersionRecord;
  terms: Record<string, unknown>;
  contractText: string;
}

// ---------------------------------------------------------------------------
// Pure Functions
// ---------------------------------------------------------------------------

/**
 * Calculate the deadline date from an initiation timestamp.
 * Returns initiatedAt + DEADLINE_HOURS (48 hours).
 */
export function calculateDeadline(initiatedAt: Date, hours: number = DEADLINE_HOURS): Date {
  return new Date(initiatedAt.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Build structured terms from booking data for version tracking.
 * Pure function — no DB or I/O.
 */
export function buildTermsFromBooking(booking: BookingForContract): Record<string, unknown> {
  const meta = (booking.meta || {}) as Record<string, any>;
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
 * Generate contract text from booking data and terms.
 * Pure function — no DB or I/O.
 */
export function generateContractText(booking: BookingForContract, terms?: Record<string, any>): string {
  const meta = (booking.meta || {}) as Record<string, any>;
  const t = terms || {};
  const now = new Date();
  const eventDate = booking.event?.startTime || booking.eventDate;
  const formattedDate = eventDate ? new Date(eventDate as string).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) : 'To Be Determined';
  const formattedTime = booking.slotTime || (eventDate ? new Date(eventDate as string).toLocaleTimeString('en-US', {
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
VENUE: ${booking.venue?.name || 'TBD'}
───────────────────────────────────────────────────────────────
`.trim();
}

/**
 * Build a version 1 record for a newly initiated contract.
 * Pure function — no DB or I/O.
 */
export function buildVersion1(
  contractId: number,
  contractText: string,
  terms: Record<string, unknown>,
  createdBy: number | null,
): ContractVersionRecord {
  return {
    contractId,
    version: 1,
    contractText,
    terms,
    changeSummary: 'Initial contract generation from negotiated terms',
  };
}

/**
 * Prepare the full contract initiation result from a booking.
 * Pure function — no DB or I/O.
 *
 * Returns the contract record data, version record data, terms, and text.
 */
export function prepareContractInitiation(
  booking: BookingForContract,
  initiatedAt: Date,
): ContractInitiationResult {
  const deadline = calculateDeadline(initiatedAt);
  const terms = buildTermsFromBooking(booking);
  const contractText = generateContractText(booking, terms);

  const contract: Omit<ContractRecord, 'id'> = {
    bookingId: booking.id,
    contractText,
    status: 'sent',
    initiatedAt,
    deadlineAt: deadline,
    currentVersion: 1,
    metadata: { terms },
  };

  const version: ContractVersionRecord = {
    contractId: 0, // placeholder — set after DB insert
    version: 1,
    contractText,
    terms,
    changeSummary: 'Initial contract generation from negotiated terms',
  };

  return { contract, version, terms, contractText };
}

/**
 * Check if a contract already exists (idempotency).
 * Returns true if existingContract is non-null and not voided.
 * Pure function — no DB or I/O.
 */
export function shouldReturnExisting(existingContract: { status: string } | null): 'return_existing' | 'voided' | 'none' {
  if (!existingContract) return 'none';
  if (existingContract.status === 'voided') return 'voided';
  return 'return_existing';
}


// ---------------------------------------------------------------------------
// Contract Review & Edit Types
// ---------------------------------------------------------------------------

export interface ContractReviewState {
  artistEditUsed: boolean;
  promoterEditUsed: boolean;
  artistReviewDoneAt: Date | null;
  promoterReviewDoneAt: Date | null;
  artistAcceptedAt: Date | null;
  promoterAcceptedAt: Date | null;
  signedByArtist: boolean;
  signedByPromoter: boolean;
  status: string;
  currentVersion: number;
}

export interface EditRequest {
  id: number;
  contractId: number;
  status: 'pending' | 'approved' | 'rejected';
  requestedByRole: 'artist' | 'promoter';
  changes: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Locked Fields
// ---------------------------------------------------------------------------

export const LOCKED_FIELDS = [
  'fee', 'totalFee', 'currency', 'eventDate', 'eventTime', 'slotType',
  'venueName', 'artistName', 'organizerName', 'performanceDuration',
  'platformCommission',
];

// ---------------------------------------------------------------------------
// Pure Functions: Contract Review & Edit
// ---------------------------------------------------------------------------

/**
 * Check if a party has already used their one-time edit.
 * Returns an error message if the edit has been used, null otherwise.
 */
export function checkOneTimeEdit(
  contract: ContractReviewState,
  role: 'artist' | 'promoter',
): string | null {
  const editUsed = role === 'artist' ? contract.artistEditUsed : contract.promoterEditUsed;
  if (editUsed) {
    return 'You have already used your one-time edit opportunity';
  }
  return null;
}

/**
 * Check if a pending edit request blocks accept/sign actions.
 * Returns an error message if there's a pending edit, null otherwise.
 */
export function checkPendingEditBlocks(
  pendingEdit: EditRequest | null,
): string | null {
  if (pendingEdit && pendingEdit.status === 'pending') {
    return 'Cannot proceed while edit requests are pending';
  }
  return null;
}

/**
 * Deep merge editable changes into current terms (preserving locked fields).
 * Returns the merged terms object.
 */
export function applyContractChanges(
  currentTerms: Record<string, any>,
  changes: Record<string, any>,
): Record<string, any> {
  const merged = JSON.parse(JSON.stringify(currentTerms));

  const editableCategories = [
    'financial', 'travel', 'accommodation', 'technical',
    'hospitality', 'branding', 'contentRights', 'cancellation',
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
 * Validate that proposed changes do not include any locked fields.
 * Returns an array of error messages for any locked field violations.
 */
export function validateLockedFields(changes: Record<string, any>): string[] {
  const errors: string[] = [];
  for (const field of LOCKED_FIELDS) {
    if (changes[field] !== undefined) {
      errors.push(`Field "${field}" is a core negotiated term and cannot be modified`);
    }
  }
  if (changes.financial?.totalFee || changes.financial?.currency) {
    errors.push('Total fee and currency cannot be modified');
  }
  return errors;
}

/**
 * Validate contract edit changes against business rules.
 * Checks: milestone sums, penalty ranges, time ordering, locked fields.
 * Returns { valid, errors }.
 */
export function validateContractChanges(
  changes: Record<string, any>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Locked fields
  errors.push(...validateLockedFields(changes));

  // 2. Payment milestone percentages must sum to 100%
  if (changes.financial?.paymentMilestones) {
    const total = changes.financial.paymentMilestones.reduce(
      (sum: number, m: any) => sum + (m.percentage || 0),
      0,
    );
    if (total !== 100) {
      errors.push(`Payment milestones must sum to 100% (currently ${total}%)`);
    }
  }

  // 3. Cancellation penalties must be 0-100%
  if (changes.cancellation) {
    const penalties = [
      ...Object.values(changes.cancellation.artistCancellationPenalties || {}),
      ...Object.values(changes.cancellation.organizerCancellationPenalties || {}),
    ] as number[];
    if (penalties.some((p) => p < 0 || p > 100)) {
      errors.push('Cancellation penalties must be between 0 and 100%');
    }
  }

  // 4. Check-in time must be before check-out time
  if (changes.accommodation) {
    if (changes.accommodation.checkInTime && changes.accommodation.checkOutTime) {
      const ci = changes.accommodation.checkInTime;
      const co = changes.accommodation.checkOutTime;
      if (ci >= co) {
        errors.push('Check-in time must be before check-out time');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Compute the result of an edit approval: new version number and merged terms.
 * Pure function — no DB or I/O.
 */
export function computeEditApproval(
  currentVersion: number,
  currentTerms: Record<string, any>,
  changes: Record<string, any>,
): { newVersion: number; mergedTerms: Record<string, any> } {
  const mergedTerms = applyContractChanges(currentTerms, changes);
  return {
    newVersion: currentVersion + 1,
    mergedTerms,
  };
}

/**
 * Compute the result of an edit rejection: version stays the same.
 * Pure function — no DB or I/O.
 */
export function computeEditRejection(
  currentVersion: number,
): { currentVersion: number } {
  return { currentVersion };
}

// ---------------------------------------------------------------------------
// Contract Acceptance & Signing Types
// ---------------------------------------------------------------------------

export interface SignatureData {
  signatureData: string | null | undefined;
  signatureType: 'drawn' | 'typed' | 'uploaded' | string | null | undefined;
  ipAddress: string | null | undefined;
  userAgent: string | null | undefined;
}

export interface ContractLifecycleState {
  artistReviewDoneAt: Date | null;
  promoterReviewDoneAt: Date | null;
  artistAcceptedAt: Date | null;
  promoterAcceptedAt: Date | null;
  signedByArtist: boolean;
  signedByPromoter: boolean;
  signedAt: Date | null;
  deadlineAt: Date | null;
  status: string;
}

// ---------------------------------------------------------------------------
// Pure Functions: Contract Acceptance & Signing
// ---------------------------------------------------------------------------

/**
 * Check lifecycle ordering: a party must complete review before accepting.
 * Returns an error message if the ordering is violated, null otherwise.
 */
export function checkReviewBeforeAccept(
  contract: ContractLifecycleState,
  role: 'artist' | 'promoter',
): string | null {
  const reviewDone = role === 'artist'
    ? contract.artistReviewDoneAt
    : contract.promoterReviewDoneAt;
  if (!reviewDone) {
    return 'You must complete your review before accepting';
  }
  return null;
}

/**
 * Check lifecycle ordering: a party must accept before signing.
 * Returns an error message if the ordering is violated, null otherwise.
 */
export function checkAcceptBeforeSign(
  contract: ContractLifecycleState,
  role: 'artist' | 'promoter',
): string | null {
  const accepted = role === 'artist'
    ? contract.artistAcceptedAt
    : contract.promoterAcceptedAt;
  if (!accepted) {
    return 'You must accept the contract terms before signing';
  }
  return null;
}

/**
 * Validate that signature data contains all required fields:
 * signatureData, signatureType (drawn/typed/uploaded), ipAddress, userAgent.
 * Returns { valid, errors }.
 */
export function validateSignatureData(
  sig: SignatureData,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!sig.signatureData) {
    errors.push('Signature data is required');
  }
  const validTypes = ['drawn', 'typed', 'uploaded'];
  if (!sig.signatureType || !validTypes.includes(sig.signatureType)) {
    errors.push('Signature type must be one of: drawn, typed, uploaded');
  }
  if (!sig.ipAddress) {
    errors.push('IP address is required');
  }
  if (!sig.userAgent) {
    errors.push('User agent is required');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Check if both parties have signed. If so, returns the new status
 * ("admin_review") and indicates signedAt should be set.
 * Returns { fullyExecuted, newStatus, shouldSetSignedAt }.
 */
export function checkDualSignature(
  contract: ContractLifecycleState,
  signingRole: 'artist' | 'promoter',
): { fullyExecuted: boolean; newStatus: string | null; shouldSetSignedAt: boolean } {
  const otherSigned = signingRole === 'artist'
    ? contract.signedByPromoter
    : contract.signedByArtist;

  if (otherSigned) {
    return { fullyExecuted: true, newStatus: 'admin_review', shouldSetSignedAt: true };
  }
  return { fullyExecuted: false, newStatus: null, shouldSetSignedAt: false };
}

/**
 * Check if the contract deadline has passed.
 * Returns an error message if expired, null otherwise.
 */
export function checkDeadlineExpired(
  deadlineAt: Date | null,
  now: Date = new Date(),
): string | null {
  if (!deadlineAt) return null;
  if (now > deadlineAt) {
    return 'Contract deadline has passed';
  }
  return null;
}


// ---------------------------------------------------------------------------
// Deadline Enforcement Types & Functions
// ---------------------------------------------------------------------------

export interface DeadlineEnforcementInput {
  id: number;
  bookingId: number;
  status: string;
  deadlineAt: Date | null;
}

export interface DeadlineEnforcementResult {
  shouldVoid: boolean;
  contractId: number;
  bookingId: number;
  newContractStatus: 'voided' | null;
  newBookingStatus: 'cancelled' | null;
  cancelReason: string | null;
}

/**
 * Compute whether a contract should be voided due to deadline expiry.
 * A contract is voided when its status is "sent" and deadlineAt is in the past.
 * Returns the void/cancel decisions.
 * Pure function — no DB or I/O.
 */
export function computeDeadlineEnforcement(
  contract: DeadlineEnforcementInput,
  now: Date = new Date(),
): DeadlineEnforcementResult {
  const shouldVoid =
    contract.status === 'sent' &&
    contract.deadlineAt !== null &&
    now > contract.deadlineAt;

  if (shouldVoid) {
    return {
      shouldVoid: true,
      contractId: contract.id,
      bookingId: contract.bookingId,
      newContractStatus: 'voided',
      newBookingStatus: 'cancelled',
      cancelReason: 'contract_deadline_expired',
    };
  }

  return {
    shouldVoid: false,
    contractId: contract.id,
    bookingId: contract.bookingId,
    newContractStatus: null,
    newBookingStatus: null,
    cancelReason: null,
  };
}

/**
 * Check if a contract is voided. If so, reject all further actions.
 * Returns an error message if voided, null otherwise.
 * Pure function — no DB or I/O.
 */
export function checkVoidedContract(status: string): string | null {
  if (status === 'voided') {
    return 'Contract has been voided — no further actions are allowed';
  }
  return null;
}

