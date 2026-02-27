import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: organizer-role, Property 14: Event creation persists stages
// Feature: organizer-role, Property 17: Event edit restrictions with confirmed bookings

// ---------------------------------------------------------------------------
// Shared types mirroring the storage layer shapes
// ---------------------------------------------------------------------------

interface MockStage {
  id: number;
  eventId: number;
  name: string;
  startTime: Date | null;
  endTime: Date | null;
  capacity: number | null;
  orderIndex: number;
}

interface MockEvent {
  id: number;
  organizerId: number;
  title: string;
  startTime: Date;
  venueId: number | null;
  status: string;
}

interface MockBooking {
  id: number;
  eventId: number;
  status: string;
}

interface CreateEventInput {
  title: string;
  organizerId: number;
  startTime: Date;
  venueId: number | null;
  stages?: Array<{
    name: string;
    startTime?: Date;
    endTime?: Date;
    capacity?: number;
  }>;
}

interface UpdateEventInput {
  title?: string;
  startTime?: Date;
  venueId?: number;
  description?: string;
  capacityTotal?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIRMED_BOOKING_STATUSES = [
  'confirmed',
  'paid_deposit',
  'scheduled',
  'completed',
] as const;

const ALL_BOOKING_STATUSES = [
  'inquiry',
  'offered',
  'negotiating',
  'contracting',
  'confirmed',
  'paid_deposit',
  'scheduled',
  'completed',
  'cancelled',
  'disputed',
  'refunded',
] as const;

const EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'] as const;

const LOCKED_FIELDS_WITH_CONFIRMED_BOOKINGS = ['startTime', 'venueId'] as const;

// ---------------------------------------------------------------------------
// Pure computation functions
// ---------------------------------------------------------------------------

/**
 * Simulates event creation with stages.
 * Returns the created event and its stages.
 */
function createEventWithStages(
  input: CreateEventInput,
  eventIdCounter: number,
  stageIdCounter: number,
): { event: MockEvent; stages: MockStage[] } {
  const event: MockEvent = {
    id: eventIdCounter,
    organizerId: input.organizerId,
    title: input.title,
    startTime: input.startTime,
    venueId: input.venueId,
    status: 'draft',
  };

  const stages: MockStage[] = (input.stages || []).map((stageInput, index) => ({
    id: stageIdCounter + index,
    eventId: event.id,
    name: stageInput.name,
    startTime: stageInput.startTime || null,
    endTime: stageInput.endTime || null,
    capacity: stageInput.capacity || null,
    orderIndex: index,
  }));

  return { event, stages };
}

/**
 * Checks if an event has any confirmed bookings.
 */
function hasConfirmedBookings(eventId: number, bookings: MockBooking[]): boolean {
  return bookings.some(
    b =>
      b.eventId === eventId &&
      CONFIRMED_BOOKING_STATUSES.includes(b.status as any),
  );
}

/**
 * Validates if an event update is allowed based on confirmed bookings.
 * Returns { allowed: boolean, rejectedFields: string[] }
 */
function validateEventUpdate(
  eventId: number,
  updateInput: UpdateEventInput,
  bookings: MockBooking[],
): { allowed: boolean; rejectedFields: string[] } {
  const hasConfirmed = hasConfirmedBookings(eventId, bookings);

  if (!hasConfirmed) {
    // No confirmed bookings - all updates allowed
    return { allowed: true, rejectedFields: [] };
  }

  // Check if any locked fields are being updated
  const rejectedFields: string[] = [];
  const updateKeys = Object.keys(updateInput) as Array<keyof UpdateEventInput>;

  for (const key of updateKeys) {
    if (LOCKED_FIELDS_WITH_CONFIRMED_BOOKINGS.includes(key as any)) {
      rejectedFields.push(key);
    }
  }

  return {
    allowed: rejectedFields.length === 0,
    rejectedFields,
  };
}

/**
 * Applies an event update if allowed.
 * Returns the updated event or null if update is rejected.
 */
function applyEventUpdate(
  event: MockEvent,
  updateInput: UpdateEventInput,
  bookings: MockBooking[],
): MockEvent | null {
  const validation = validateEventUpdate(event.id, updateInput, bookings);

  if (!validation.allowed) {
    return null; // Update rejected
  }

  return {
    ...event,
    title: updateInput.title !== undefined ? updateInput.title : event.title,
    startTime: updateInput.startTime !== undefined ? updateInput.startTime : event.startTime,
    venueId: updateInput.venueId !== undefined ? updateInput.venueId : event.venueId,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const stageNameArb = fc.oneof(
  fc.constantFrom('Main Stage', 'Side Stage', 'Acoustic Stage', 'DJ Booth', 'Lounge'),
  fc.string({ minLength: 3, maxLength: 30 }),
);

const stageInputArb: fc.Arbitrary<{
  name: string;
  startTime?: Date;
  endTime?: Date;
  capacity?: number;
}> = fc.record({
  name: stageNameArb,
  startTime: fc.option(
    fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
    { nil: undefined },
  ),
  endTime: fc.option(
    fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
    { nil: undefined },
  ),
  capacity: fc.option(fc.integer({ min: 50, max: 5000 }), { nil: undefined }),
});

const createEventInputArb: fc.Arbitrary<CreateEventInput> = fc.record({
  title: fc.string({ minLength: 3, maxLength: 100 }),
  organizerId: fc.integer({ min: 1, max: 100 }),
  startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
  venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  stages: fc.option(fc.array(stageInputArb, { minLength: 0, maxLength: 5 }), {
    nil: undefined,
  }),
});

const mockBookingArb = (eventIds: number[]): fc.Arbitrary<MockBooking> =>
  eventIds.length === 0
    ? fc.constant({ id: 1, eventId: -1, status: 'inquiry' })
    : fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        eventId: fc.constantFrom(...eventIds),
        status: fc.constantFrom(...ALL_BOOKING_STATUSES),
      });

const updateEventInputArb: fc.Arbitrary<UpdateEventInput> = fc.record(
  {
    title: fc.option(fc.string({ minLength: 3, maxLength: 100 }), { nil: undefined }),
    startTime: fc.option(
      fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
      { nil: undefined },
    ),
    venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    capacityTotal: fc.option(fc.integer({ min: 50, max: 10000 }), { nil: undefined }),
  },
  { requiredKeys: [] },
);

// ---------------------------------------------------------------------------
// Property 14: Event creation persists stages
// Validates: Requirements 5.2
// ---------------------------------------------------------------------------

describe('Property 14: Event creation persists stages', () => {
  it('created event has exactly the same number of stages as input', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(createEventInputArb, (input) => {
        const { event, stages } = createEventWithStages(input, 1, 1);

        const expectedStageCount = input.stages?.length || 0;
        expect(stages.length).toBe(expectedStageCount);
      }),
      { numRuns: 100 },
    );
  });

  it('all created stages have matching names from input', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(createEventInputArb, (input) => {
        if (!input.stages || input.stages.length === 0) {
          return true; // Skip if no stages
        }

        const { event, stages } = createEventWithStages(input, 1, 1);

        const inputNames = input.stages.map(s => s.name);
        const createdNames = stages.map(s => s.name);

        expect(createdNames).toEqual(inputNames);
      }),
      { numRuns: 100 },
    );
  });

  it('all created stages have matching times from input', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(createEventInputArb, (input) => {
        if (!input.stages || input.stages.length === 0) {
          return true; // Skip if no stages
        }

        const { event, stages } = createEventWithStages(input, 1, 1);

        for (let i = 0; i < input.stages.length; i++) {
          const inputStage = input.stages[i];
          const createdStage = stages[i];

          if (inputStage.startTime) {
            expect(createdStage.startTime?.getTime()).toBe(inputStage.startTime.getTime());
          } else {
            expect(createdStage.startTime).toBeNull();
          }

          if (inputStage.endTime) {
            expect(createdStage.endTime?.getTime()).toBe(inputStage.endTime.getTime());
          } else {
            expect(createdStage.endTime).toBeNull();
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('all created stages have matching capacity from input', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(createEventInputArb, (input) => {
        if (!input.stages || input.stages.length === 0) {
          return true; // Skip if no stages
        }

        const { event, stages } = createEventWithStages(input, 1, 1);

        for (let i = 0; i < input.stages.length; i++) {
          const inputStage = input.stages[i];
          const createdStage = stages[i];

          if (inputStage.capacity !== undefined) {
            expect(createdStage.capacity).toBe(inputStage.capacity);
          } else {
            expect(createdStage.capacity).toBeNull();
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('all created stages are linked to the created event', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(createEventInputArb, (input) => {
        if (!input.stages || input.stages.length === 0) {
          return true; // Skip if no stages
        }

        const { event, stages } = createEventWithStages(input, 1, 1);

        for (const stage of stages) {
          expect(stage.eventId).toBe(event.id);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('stages have sequential orderIndex starting from 0', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(createEventInputArb, (input) => {
        if (!input.stages || input.stages.length === 0) {
          return true; // Skip if no stages
        }

        const { event, stages } = createEventWithStages(input, 1, 1);

        for (let i = 0; i < stages.length; i++) {
          expect(stages[i].orderIndex).toBe(i);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('event creation with empty stages array creates no stages', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          stages: fc.constant([]),
        }),
        (input) => {
          const { event, stages } = createEventWithStages(input, 1, 1);
          expect(stages).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('event creation without stages field creates no stages', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
        }),
        (input) => {
          const { event, stages } = createEventWithStages(input, 1, 1);
          expect(stages).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: Event edit restrictions with confirmed bookings
// Validates: Requirements 5.6
// ---------------------------------------------------------------------------

describe('Property 17: Event edit restrictions with confirmed bookings', () => {
  it('events with no confirmed bookings allow all field updates', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        updateEventInputArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            eventId: fc.integer({ min: 101, max: 200 }), // Different event IDs
            status: fc.constantFrom(...ALL_BOOKING_STATUSES),
          }),
          { maxLength: 10 },
        ),
        (event, updateInput, bookings) => {
          // Ensure bookings are for different events
          const bookingsForOtherEvents = bookings.map(b => ({
            ...b,
            eventId: event.id + 100,
          }));

          const validation = validateEventUpdate(
            event.id,
            updateInput,
            bookingsForOtherEvents,
          );

          expect(validation.allowed).toBe(true);
          expect(validation.rejectedFields).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with confirmed bookings reject startTime updates', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
        (event, newStartTime) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'confirmed' },
          ];

          const updateInput: UpdateEventInput = { startTime: newStartTime };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          expect(validation.allowed).toBe(false);
          expect(validation.rejectedFields).toContain('startTime');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with confirmed bookings reject venueId updates', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.integer({ min: 1, max: 100 }),
        (event, newVenueId) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'paid_deposit' },
          ];

          const updateInput: UpdateEventInput = { venueId: newVenueId };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          expect(validation.allowed).toBe(false);
          expect(validation.rejectedFields).toContain('venueId');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with confirmed bookings allow title updates', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.string({ minLength: 3, maxLength: 100 }),
        (event, newTitle) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'confirmed' },
          ];

          const updateInput: UpdateEventInput = { title: newTitle };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          expect(validation.allowed).toBe(true);
          expect(validation.rejectedFields).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with confirmed bookings allow description updates', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.string({ maxLength: 500 }),
        (event, newDescription) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'scheduled' },
          ];

          const updateInput: UpdateEventInput = { description: newDescription };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          expect(validation.allowed).toBe(true);
          expect(validation.rejectedFields).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with confirmed bookings allow capacity updates', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.integer({ min: 50, max: 10000 }),
        (event, newCapacity) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'confirmed' },
          ];

          const updateInput: UpdateEventInput = { capacityTotal: newCapacity };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          expect(validation.allowed).toBe(true);
          expect(validation.rejectedFields).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('events with confirmed bookings reject updates containing both locked and unlocked fields', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.string({ minLength: 3, maxLength: 100 }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
        (event, newTitle, newStartTime) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'confirmed' },
          ];

          const updateInput: UpdateEventInput = {
            title: newTitle,
            startTime: newStartTime,
          };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          expect(validation.allowed).toBe(false);
          expect(validation.rejectedFields).toContain('startTime');
          expect(validation.rejectedFields).not.toContain('title');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('applyEventUpdate returns null when update is rejected', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
        (event, newStartTime) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'confirmed' },
          ];

          const updateInput: UpdateEventInput = { startTime: newStartTime };
          const result = applyEventUpdate(event, updateInput, bookings);

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('applyEventUpdate applies allowed updates correctly', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.string({ minLength: 3, maxLength: 100 }),
        (event, newTitle) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: 'confirmed' },
          ];

          const updateInput: UpdateEventInput = { title: newTitle };
          const result = applyEventUpdate(event, updateInput, bookings);

          expect(result).not.toBeNull();
          expect(result?.title).toBe(newTitle);
          expect(result?.startTime).toEqual(event.startTime);
          expect(result?.venueId).toBe(event.venueId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('only confirmed booking statuses trigger edit restrictions', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.constantFrom(
          'inquiry',
          'offered',
          'negotiating',
          'contracting',
          'cancelled',
          'disputed',
          'refunded',
        ),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
        (event, nonConfirmedStatus, newStartTime) => {
          const bookings: MockBooking[] = [
            { id: 1, eventId: event.id, status: nonConfirmedStatus },
          ];

          const updateInput: UpdateEventInput = { startTime: newStartTime };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          // Non-confirmed bookings should not block updates
          expect(validation.allowed).toBe(true);
          expect(validation.rejectedFields).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('multiple confirmed bookings still enforce restrictions', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer({ min: 1, max: 100 }),
          organizerId: fc.integer({ min: 1, max: 100 }),
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startTime: fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
          venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
          status: fc.constantFrom('draft', 'published'),
        }),
        fc.integer({ min: 2, max: 10 }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2026-12-31') }),
        (event, numBookings, newStartTime) => {
          const bookings: MockBooking[] = Array.from({ length: numBookings }, (_, i) => ({
            id: i + 1,
            eventId: event.id,
            status: 'confirmed',
          }));

          const updateInput: UpdateEventInput = { startTime: newStartTime };
          const validation = validateEventUpdate(event.id, updateInput, bookings);

          expect(validation.allowed).toBe(false);
          expect(validation.rejectedFields).toContain('startTime');
        },
      ),
      { numRuns: 100 },
    );
  });
});
