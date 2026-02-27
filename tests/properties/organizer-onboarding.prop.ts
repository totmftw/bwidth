import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { organizerOnboardingSchema } from '../../shared/routes';

// Feature: organizer-role, Property 3: Onboarding validation rejects incomplete input

// ---------------------------------------------------------------------------
// Arbitraries — use constrained generators (no .filter()) for speed
// ---------------------------------------------------------------------------

/** Generates a simple email like "abc@def.com" that Zod's .email() accepts. */
const zodEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{1,10}$/),
    fc.stringMatching(/^[a-z]{1,8}$/),
    fc.constantFrom('com', 'org', 'net', 'io'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Digit string for phone numbers. */
const phoneArb = fc.stringMatching(/^[0-9]{10,15}$/);

/** Generates a valid contactPerson sub-object. */
const validContactPersonArb = fc.record({
  name: fc.stringMatching(/^[a-z]{2,50}$/),
  email: zodEmailArb,
  phone: phoneArb,
});

/** Generates a fully valid onboarding input that the schema must accept. */
const validOnboardingArb = fc.record({
  organizationName: fc.stringMatching(/^[a-z]{2,50}$/),
  description: fc.stringMatching(/^[a-z]{10,100}$/),
  contactPerson: validContactPersonArb,
  website: fc.option(fc.webUrl(), { nil: undefined }),
  pastEventReferences: fc.option(
    fc.array(fc.stringMatching(/^[a-z]{1,50}$/), { minLength: 1, maxLength: 3 }),
    { nil: undefined },
  ),
});

// ---------------------------------------------------------------------------
// Property 3: Onboarding validation rejects incomplete input
// Validates: Requirements 1.3
//
// For any onboarding input missing a required field (organization name,
// description, or contact person with name/email/phone), the onboarding
// schema validation should reject the input. For any input with all required
// fields present and valid, the schema should accept it.
// ---------------------------------------------------------------------------
describe('Property 3: Onboarding validation rejects incomplete input', () => {
  it('accepts any valid onboarding input with all required fields', () => {
    /** Validates: Requirements 1.3 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const result = organizerOnboardingSchema.safeParse(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input missing organizationName', () => {
    /** Validates: Requirements 1.3 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const { organizationName, ...rest } = input;
        const result = organizerOnboardingSchema.safeParse(rest);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input missing description', () => {
    /** Validates: Requirements 1.3 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const { description, ...rest } = input;
        const result = organizerOnboardingSchema.safeParse(rest);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input missing contactPerson entirely', () => {
    /** Validates: Requirements 1.3 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const { contactPerson, ...rest } = input;
        const result = organizerOnboardingSchema.safeParse(rest);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input where contactPerson is missing name', () => {
    /** Validates: Requirements 1.3 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const { name, ...partialContact } = input.contactPerson;
        const invalid = { ...input, contactPerson: partialContact };
        const result = organizerOnboardingSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input where contactPerson is missing email', () => {
    /** Validates: Requirements 1.3 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const { email, ...partialContact } = input.contactPerson;
        const invalid = { ...input, contactPerson: partialContact };
        const result = organizerOnboardingSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input where contactPerson is missing phone', () => {
    /** Validates: Requirements 1.3 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const { phone, ...partialContact } = input.contactPerson;
        const invalid = { ...input, contactPerson: partialContact };
        const result = organizerOnboardingSchema.safeParse(invalid);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input missing a random required top-level field', () => {
    /** Validates: Requirements 1.3 */
    const requiredFields = ['organizationName', 'description', 'contactPerson'] as const;

    fc.assert(
      fc.property(
        validOnboardingArb,
        fc.constantFrom(...requiredFields),
        (input, field) => {
          const invalid = { ...input };
          delete (invalid as any)[field];
          const result = organizerOnboardingSchema.safeParse(invalid);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects input missing a random required contactPerson sub-field', () => {
    /** Validates: Requirements 1.3 */
    const contactFields = ['name', 'email', 'phone'] as const;

    fc.assert(
      fc.property(
        validOnboardingArb,
        fc.constantFrom(...contactFields),
        (input, field) => {
          const partialContact = { ...input.contactPerson };
          delete (partialContact as any)[field];
          const invalid = { ...input, contactPerson: partialContact };
          const result = organizerOnboardingSchema.safeParse(invalid);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
