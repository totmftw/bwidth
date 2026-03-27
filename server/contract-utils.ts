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
    user?: { 
      displayName?: string;
      legalName?: string;
      permanentAddress?: string;
      panNumber?: string;
      gstin?: string;
      bankAccountHolderName?: string;
      bankName?: string;
      bankBranch?: string;
      bankAccountNumber?: string;
      bankIfsc?: string;
    };
  } | null;
  organizer?: {
    name?: string;
    user?: { 
      displayName?: string;
      legalName?: string;
      permanentAddress?: string;
      panNumber?: string;
      gstin?: string;
    };
  } | null;
  venue?: {
    name?: string;
    address?: string | object;
    city?: string;
  } | null;
  event?: {
    title?: string;
    startTime?: string | Date | null;
    endTime?: string | Date | null;
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
  const customTerms = meta.terms || {};
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
    // Editable categories (defaults merged with negotiated terms)
    financial: {
      paymentMethod: meta.paymentMethod || 'bank_transfer',
      paymentMilestones: meta.paymentMilestones || [
        { milestone: 'deposit', percentage: Number(booking.depositPercent || 30), dueDate: 'upon_signing' },
        { milestone: 'pre_event', percentage: 100 - Number(booking.depositPercent || 30), dueDate: '24h_before' },
      ],
      ...customTerms.financial
    },
    travel: {
      responsibility: meta.travelProvided ? 'organizer' : 'artist',
      flightClass: meta.flightClass || 'economy',
      airportPickup: meta.airportPickup || false,
      groundTransport: meta.groundTransport || 'not_provided',
      ...customTerms.travel
    },
    accommodation: {
      included: meta.accommodationProvided || false,
      hotelStarRating: meta.hotelStarRating || 3,
      roomType: meta.roomType || 'single',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      nights: meta.nights || 1,
      ...customTerms.accommodation
    },
    technical: {
      equipmentList: meta.equipmentList || [],
      soundCheckDuration: meta.soundCheckDuration || 60,
      backlineProvided: meta.backlineProvided || [],
      stageSetupTime: meta.stageSetupTime || 30,
      ...customTerms.technical
    },
    hospitality: {
      guestListCount: meta.guestListCount || 2,
      greenRoomAccess: meta.greenRoom || false,
      mealsProvided: meta.mealsProvided ? ['dinner', 'drinks'] : [],
      securityProvisions: 'standard',
      ...customTerms.hospitality
    },
    branding: {
      logoUsageAllowed: true,
      promotionalApprovalRequired: true,
      socialMediaGuidelines: '',
      pressRequirements: '',
      ...customTerms.branding
    },
    contentRights: {
      recordingAllowed: false,
      photographyAllowed: true,
      videographyAllowed: false,
      liveStreamingAllowed: false,
      socialMediaPostingAllowed: true,
      ...customTerms.contentRights
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
      ...customTerms.cancellation
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
  
  const startEventDate = booking.event?.startTime || booking.eventDate;
  const endEventDate = booking.event?.endTime || startEventDate;
  
  const formattedStartDate = startEventDate ? new Date(startEventDate as string).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) : '[Date TBD]';
  
  const formattedEndDate = endEventDate ? new Date(endEventDate as string).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) : '[Date TBD]';

  const formattedTime = booking.slotTime || (startEventDate ? new Date(startEventDate as string).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  }) : '[Time TBD]');
  
  const currency = booking.offerCurrency || 'INR';
  const fee = Number(booking.finalAmount || booking.offerAmount || 0);
  const deposit = Number(booking.depositPercent || 30);
  const depositAmount = Math.round(fee * deposit / 100);
  const balanceAmount = fee - depositAmount;

  // Legal details extraction
  const orgName = booking.organizer?.user?.legalName || booking.organizer?.name || '[Organizer Legal Name]';
  const orgAddress = booking.organizer?.user?.permanentAddress || '[Organizer Permanent Address]';
  const orgPAN = booking.organizer?.user?.panNumber || '[Organizer PAN]';
  const orgGSTIN = booking.organizer?.user?.gstin || '[Organizer GSTIN, if applicable]';

  const artLegalName = booking.artist?.user?.legalName || booking.artist?.name || '[Artist Legal Name]';
  const artStageName = booking.artist?.name || '[Artist Stage Name]';
  const artAddress = booking.artist?.user?.permanentAddress || '[Artist Permanent Address]';
  const artPAN = booking.artist?.user?.panNumber || '[Artist PAN]';
  const artGSTIN = booking.artist?.user?.gstin || '[Artist GSTIN, if applicable]';

  const bankHolder = booking.artist?.user?.bankAccountHolderName || '[Name]';
  const bankName = booking.artist?.user?.bankName || '[Bank Name]';
  const bankBranch = booking.artist?.user?.bankBranch || '[Branch Name]';
  const bankAcc = booking.artist?.user?.bankAccountNumber || '[Account Number]';
  const bankIfsc = booking.artist?.user?.bankIfsc || '[IFSC/SWIFT]';

  const city = booking.venue?.city || '[City]';
  const duration = meta.performanceDuration || '60 to 90-minute';

  return `
PERFORMANCE AND BOOKING AGREEMENT

This Booking Agreement ("Agreement") is made and entered into on this ${now.getDate()} of ${now.toLocaleString('default', { month: 'long' })}, ${now.getFullYear()} ("Effective Date"), under the provisions of the Indian Contract Act, 1872, by and between:

PARTIES:

1. ${orgName}, a company/entity incorporated under the laws of India, having its registered office at ${orgAddress}, holding PAN ${orgPAN} and GSTIN ${orgGSTIN} (hereinafter referred to as the "Booking Agent" or "Promoter", which expression shall, unless repugnant to the context or meaning thereof, be deemed to mean and include its successors and permitted assigns) of the FIRST PART;

AND

2. ${artLegalName} professionally known as ${artStageName}, residing at ${artAddress}, holding PAN ${artPAN} and GSTIN ${artGSTIN} (hereinafter referred to as the "Artist", which expression shall, unless repugnant to the context or meaning thereof, be deemed to mean and include their heirs, executors, and permitted assigns) of the SECOND PART.

(The Booking Agent and the Artist are hereinafter collectively referred to as the "Parties" and individually as a "Party".)

WHEREAS:
A. The Booking Agent is engaged in the business of organizing and promoting live entertainment events.
B. The Artist is a recognized performing artist.
C. The Booking Agent desires to engage the Artist to perform at the Event(s) detailed below, and the Artist has agreed to such engagement subject to the terms and conditions contained herein.

NOW, THEREFORE, IN CONSIDERATION OF THE MUTUAL PROMISES CONTAINED HEREIN, THE PARTIES AGREE AS FOLLOWS:

1. EVENT DETAILS & ARTIST FEE
1.1. Tour/Event Dates: ${formattedStartDate} to ${formattedEndDate}
1.2. Cities/Venues: ${city}, India
1.3. Performance Duration: ${duration} set per event
1.4. Total Fee: ${currency} ${fee.toLocaleString()} for 1 event(s).
1.5. The Fee includes the Artist's appearance and performance only. Any additional services will require a separate written agreement.

2. TRAVEL & ACCOMMODATION
2.1. Flights: All international and domestic flights (${t.travel?.flightClass || 'economy'}) must be ${t.travel?.flightPreference || 'approved airlines only'}.
2.2. Routing: ${t.travel?.routing || 'Direct flights preferred'}.
2.3. All flights and itineraries must be pre-approved in writing by the Artist before booking.
2.4. Accommodation: Minimum ${t.accommodation?.hotelStarRating || 3}-star hotel accommodation (${t.accommodation?.roomType || 'one private room'} for the Artist) featuring:
     - Early check-in and late checkout
     - 24-hour room service
     - High-speed Wi-Fi
     The hotel must be approved in writing by the Artist before being booked.
2.5. Per Diem/Food & Beverage: A ${currency} ${t.hospitality?.perDiem || 0} per day allowance for the Artist (via room voucher or cash).
2.6. Ground Transportation: All ground transportation between the airport, hotel, and venue must be provided and pre-approved by the Booking Agent. The driver must carry a visible sign with the Artist’s name. If airport pickup is delayed by more than 30 minutes, the Promoter covers the cost of a hotel at the airport.

3. PAYMENT TERMS & TAXES
3.1. Deposit: ${deposit}% (${currency} ${depositAmount.toLocaleString()}) due before the public announcement of the Artist.
3.2. Balance: Remaining ${currency} ${balanceAmount.toLocaleString()} due one week before the first event date.
3.3. Net Payments: All payments must be net of all fees, including but not limited to bank fees, currency conversion charges, and local taxes/levies.
3.4. GST and Withholding Tax (TDS): Any Goods and Services Tax (GST) applicable under the Central Goods and Services Tax Act, 2017, and Tax Deducted at Source (TDS) under the Income Tax Act, 1961, shall be borne and complied with by the Booking Agent. The Booking Agent shall provide the necessary TDS certificates to the Artist within the statutory timelines.
3.5. Bank Details: All payments must be made via bank wire transfer to:
     - Account Holder: ${bankHolder}
     - Bank Name: ${bankName}
     - Branch: ${bankBranch}
     - Account Number: ${bankAcc}
     - IFSC/SWIFT Code: ${bankIfsc}
     - PAN: ${artPAN}

4. BILLING & PROMOTION
4.1. The Artist must be billed as the headliner and placed at the top of all promotional material.
4.2. Artist logos and artwork must be used strictly as officially provided.
4.3. All marketing materials (print and digital) must include the Booking Agent's logo on the top left corner.
4.4. All artwork must be approved in writing by the Booking Agent/Artist before distribution.

5. HOSPITALITY & SECURITY
5.1. The Artist is entitled to ${t.hospitality?.guestListCount || 2} guest list passes per event.
5.2. Drinks and refreshments must be provided in the green room and during the performance.
5.3. Press passes may be requested and must be arranged in advance.
5.4. A secure, restricted, and lockable backstage area (Green Room) must be provided for the Artist and their belongings.
5.5. The Promoter must provide adequate professional security personnel during the performance and transit.

6. EQUIPMENT & TECHNICAL REQUIREMENTS
6.1. A detailed Technical Rider and equipment needs list will be provided separately and forms an integral part of this Agreement.
6.2. The Promoter is required to meet all technical specifications fully and promptly. Failure to do so gives the Artist the right to refuse performance without penalty or refund of the fee.

7. INTELLECTUAL PROPERTY, REPRODUCTION & BROADCAST RIGHTS
7.1. No part of the Artist’s performance may be recorded, filmed, broadcasted, live-streamed, or reproduced in any format without prior written consent from the Artist.
7.2. Any unauthorized recordings will be considered a material breach of contract and a violation of the Artist's copyright and performers' rights under the Copyright Act, 1957.

8. CANCELLATION & FORCE MAJEURE
8.1. Promoter Cancellation: If the Promoter/Booking Agent cancels the event, all payments made to the Artist are non-refundable, and any outstanding balance becomes immediately due.
8.2. Artist Cancellation: If the Artist cancels (excluding Force Majeure), payments received shall be fully refunded to the Promoter. The Artist reserves the right to cancel up to 90 days prior without penalty.
8.3. Force Majeure: Neither Party shall be liable for any failure to perform its obligations where such failure is as a result of Acts of Nature (including fire, flood, earthquake, storm, hurricane, or other natural disaster), war, invasion, act of foreign enemies, hostilities, civil war, rebellion, revolution, insurrection, military or usurped power or confiscation, terrorist activities, nationalization, government sanction, blockage, embargo, labor dispute, strike, lockout, pandemic, epidemic, or failure of electricity/venue licensing issues.

9. DISPUTE RESOLUTION & GOVERNING LAW
9.1. This Agreement shall be governed by and construed in accordance with the laws of India.
9.2. Any dispute, controversy, or claim arising out of or relating to this Agreement, or the breach, termination, or invalidity thereof, shall be settled by arbitration in accordance with the Arbitration and Conciliation Act, 1996. The arbitral tribunal shall consist of a sole arbitrator mutually appointed by the Parties.
9.3. The seat and venue of arbitration shall be ${city}, India. The language of the arbitration shall be English.
9.4. Subject to the arbitration clause, the courts at ${city} shall have exclusive jurisdiction over any matters arising out of this Agreement.

10. FINAL TERMS
10.1. Confidentiality: The Artist fee and the terms of this Agreement are strictly confidential.
10.2. Amendments: No amendments or modifications to this Agreement shall be valid unless made in writing and signed by both Parties.
10.3. Liability: The Artist is not liable for any fines, damages, or legal issues resulting from the Promoter's misconduct, lack of necessary venue licenses, or illegal promotion.
10.4. Relationship of Parties: This Agreement does not create a partnership, joint venture, or employer-employee relationship between the Parties. The Artist acts as an independent contractor.

IN WITNESS WHEREOF, the Parties hereto have executed this Agreement digitally under the provisions of the Information Technology Act, 2000 as of the Effective Date.

For ${orgName} (Booking Agent / Promoter)
Name: ${orgName}
Title: Promoter / Organizer
Digital Signature: [[PROMOTER_SIGNATURE]]
Date: [[PROMOTER_DATE]]
IP Address / Timestamp: [[PROMOTER_IP]]

For ${artLegalName} (Artist)
Name: ${artLegalName}
Title: Performing Artist
Digital Signature: [[ARTIST_SIGNATURE]]
Date: [[ARTIST_DATE]]
IP Address / Timestamp: [[ARTIST_IP]]
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
  'fee', 'totalFee', 'currency', 'slotType',
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
    'eventDate', 'slotTime'
  ];

  for (const category of editableCategories) {
    if (changes[category] !== undefined) {
      if (typeof changes[category] === 'object' && changes[category] !== null && !Array.isArray(changes[category])) {
        merged[category] = {
          ...(merged[category] || {}),
          ...changes[category],
        };
      } else {
        merged[category] = changes[category];
      }
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

