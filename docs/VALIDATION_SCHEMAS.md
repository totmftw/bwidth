# Validation Schemas Documentation

## Overview

This document describes the Zod validation schemas used throughout the BANDWIDTH platform for request/response validation. All schemas are defined in `shared/routes.ts` and shared between client and server to ensure consistent validation across the entire application.

## Architecture

### Schema Organization

Validation schemas follow a hierarchical structure:

1. **Reusable Components** — Small, focused schemas for common data structures
2. **Feature Schemas** — Composed from reusable components for specific API endpoints
3. **Route Contracts** — Complete API definitions including method, path, input, and response schemas

This architecture promotes:
- **Code reuse** — Common patterns defined once
- **Consistency** — Same validation rules everywhere
- **Maintainability** — Changes propagate automatically
- **Type safety** — TypeScript types inferred from schemas

---

## Reusable Schema Components

### `contactPersonSchema`

Validates contact person details for organizer profiles.

**Structure:**
```typescript
{
  name: string,      // Min 2 characters
  email: string,     // Valid email format
  phone: string      // Min 10 characters
}
```

**Validation Rules:**
- `name`: Minimum 2 characters, error: "Name must be at least 2 characters"
- `email`: Must be valid email format, error: "Invalid email address"
- `phone`: Minimum 10 characters, error: "Phone number must be at least 10 characters"

**Used By:**
- `organizerOnboardingSchema` (required field)
- `organizerProfileUpdateSchema` (optional field)

**Example:**
```typescript
const validContact = {
  name: "Rahul Kumar",
  email: "rahul@sunrise.events",
  phone: "+919876543210"
};

contactPersonSchema.parse(validContact); // ✓ passes
```

---

### `socialLinksSchema`

Validates social media handles for organizer profiles.

**Structure:**
```typescript
{
  instagram?: string,  // Format: @username or username
  twitter?: string,    // Format: @handle or handle
  linkedin?: string    // Non-empty profile identifier
}
```

**Validation Rules:**
- `instagram`: Optional, regex `/^@?[\w.]+$/`, error: "Invalid Instagram handle"
- `twitter`: Optional, regex `/^@?[\w]+$/`, error: "Invalid Twitter handle"
- `linkedin`: Optional, min 1 character, error: "LinkedIn profile cannot be empty"

**Used By:**
- `organizerProfileUpdateSchema` (optional field)

**Example:**
```typescript
const validSocials = {
  instagram: "@sunriseevents",
  twitter: "sunrise_events",
  linkedin: "sunrise-events-pvt-ltd"
};

socialLinksSchema.parse(validSocials); // ✓ passes
```

**Notes:**
- All fields are optional — you can provide any combination
- Instagram and Twitter handles accept both `@username` and `username` formats
- LinkedIn accepts any non-empty string (company page slug, profile URL, etc.)

---

### `eventStageSchema`

Validates event stage configuration for multi-stage events.

**Structure:**
```typescript
{
  name: string,           // Required stage name
  startTime?: string,     // ISO 8601 datetime
  endTime?: string,       // ISO 8601 datetime
  capacity?: number       // Positive integer
}
```

**Validation Rules:**
- `name`: Required, min 1 character, error: "Stage name is required"
- `startTime`: Optional, must be ISO 8601 datetime format
- `endTime`: Optional, must be ISO 8601 datetime format
- `capacity`: Optional, must be positive integer

**Used By:**
- `createEventSchema` (optional array field)

**Example:**
```typescript
const validStage = {
  name: "Main Stage",
  startTime: "2026-04-15T22:00:00Z",
  endTime: "2026-04-16T04:00:00Z",
  capacity: 600
};

eventStageSchema.parse(validStage); // ✓ passes
```

**Notes:**
- Only `name` is required — time and capacity are optional
- Used in arrays for multi-stage event configurations
- Stage times can differ from overall event times

---

## Organizer Feature Schemas

### `organizerOnboardingSchema`

Validates the onboarding wizard submission for new organizers.

**Purpose:** Complete initial profile setup and unlock full platform access.

**Structure:**
```typescript
{
  organizationName: string,           // 2-200 chars
  description: string,                // 10-2000 chars
  contactPerson: contactPersonSchema, // Required contact details
  website?: string,                   // Optional URL
  pastEventReferences?: string[]      // Optional event links/descriptions
}
```

**Validation Rules:**
- `organizationName`: Min 2, max 200 characters
- `description`: Min 10, max 2000 characters
- `contactPerson`: Must satisfy `contactPersonSchema` (see above)
- `website`: Optional, must be valid URL
- `pastEventReferences`: Optional array, each item min 1 character

**API Endpoint:** `POST /api/organizer/profile/complete`

**Side Effects:**
- Sets `metadata.profileComplete = true`
- Initializes `metadata.trustScore = 50`
- Stores `organizationName` → `promoters.name`
- Stores `description` → `promoters.description`
- Stores `contactPerson` → `promoters.contact_person` (JSONB)
- Stores `website` and `pastEventReferences` → `promoters.metadata` (JSONB)

**Example:**
```typescript
const onboardingData = {
  organizationName: "Sunrise Events",
  description: "Bangalore-based event management company specializing in electronic music festivals and club nights.",
  contactPerson: {
    name: "Rahul Kumar",
    email: "rahul@sunrise.events",
    phone: "+919876543210"
  },
  website: "https://sunrise.events",
  pastEventReferences: [
    "https://instagram.com/p/sunrisefest2025",
    "Organized Bangalore Electronic Music Festival 2024"
  ]
};

organizerOnboardingSchema.parse(onboardingData); // ✓ passes
```

---

### `organizerProfileUpdateSchema`

Validates partial profile updates for existing organizers.

**Purpose:** Allow organizers to update their profile information after onboarding.

**Structure:**
```typescript
{
  name?: string,                      // 2-200 chars
  description?: string,               // Max 2000 chars
  contactPerson?: contactPersonSchema,
  website?: string,                   // Valid URL
  socialLinks?: socialLinksSchema
}
```

**Validation Rules:**
- All fields are optional (partial update)
- `name`: Min 2, max 200 characters
- `description`: Max 2000 characters
- `contactPerson`: Must satisfy `contactPersonSchema` if provided
- `website`: Must be valid URL if provided
- `socialLinks`: Must satisfy `socialLinksSchema` if provided

**API Endpoint:** `PUT /api/organizer/profile`

**Example:**
```typescript
const profileUpdate = {
  description: "Updated company description with new focus areas",
  socialLinks: {
    instagram: "@sunriseevents",
    twitter: "sunrise_events"
  }
};

organizerProfileUpdateSchema.parse(profileUpdate); // ✓ passes
```

**Notes:**
- Only provided fields are updated — omitted fields remain unchanged
- Can update individual fields without affecting others
- Useful for incremental profile improvements

---

### `createEventSchema`

Validates event creation input from organizers.

**Purpose:** Create new events in "draft" status for artist booking.

**Structure:**
```typescript
{
  title: string,                  // 3-200 chars
  description?: string,
  startTime: string,              // ISO 8601 datetime
  endTime?: string,               // ISO 8601 datetime
  doorTime?: string,              // ISO 8601 datetime
  venueId?: number,               // FK to venues table
  capacityTotal?: number,         // Positive integer
  currency: string,               // ISO 4217, default "INR"
  visibility: "public" | "private", // Default "private"
  stages?: eventStageSchema[]     // Optional multi-stage setup
}
```

**Validation Rules:**
- `title`: Min 3, max 200 characters
- `description`: Optional, no length limit
- `startTime`: Required, ISO 8601 datetime format
- `endTime`: Optional, ISO 8601 datetime format
- `doorTime`: Optional, ISO 8601 datetime format
- `venueId`: Optional, positive integer
- `capacityTotal`: Optional, positive integer
- `currency`: Exactly 3 characters (ISO 4217 code), defaults to "INR"
- `visibility`: Must be "public" or "private", defaults to "private"
- `stages`: Optional array of `eventStageSchema` objects

**API Endpoint:** `POST /api/organizer/events`

**Side Effects:**
- Sets `events.organizer_id` = authenticated organizer's promoter ID
- Sets `events.status` = "draft"
- Creates stage records if `stages` array provided

**Example:**
```typescript
const newEvent = {
  title: "Friday Night Techno",
  description: "Weekly techno night featuring local and international DJs",
  startTime: "2026-04-15T22:00:00Z",
  endTime: "2026-04-16T04:00:00Z",
  doorTime: "2026-04-15T21:00:00Z",
  venueId: 42,
  capacityTotal: 800,
  currency: "INR",
  visibility: "public",
  stages: [
    {
      name: "Main Stage",
      startTime: "2026-04-15T22:00:00Z",
      endTime: "2026-04-16T04:00:00Z",
      capacity: 600
    },
    {
      name: "Terrace",
      startTime: "2026-04-15T23:00:00Z",
      endTime: "2026-04-16T03:00:00Z",
      capacity: 200
    }
  ]
};

createEventSchema.parse(newEvent); // ✓ passes
```

**Notes:**
- Events start in "draft" status — must be explicitly published
- Public events appear in artist "Find Gigs" discovery feed
- Private events are invite-only
- Multi-stage setup allows different time windows and capacities per stage

---

### `completionConfirmSchema`

Validates event completion confirmation submitted by organizers.

**Purpose:** Record feedback after an event ends and trigger payment release.

**Structure:**
```typescript
{
  confirmed: boolean,   // Whether artist performed as per contract
  rating: number,       // 1-5 stars (internal, not public)
  note?: string         // Optional private note, max 1000 chars
}
```

**Validation Rules:**
- `confirmed`: Required boolean
- `rating`: Required integer, min 1, max 5
- `note`: Optional string, max 1000 characters

**API Endpoint:** `POST /api/organizer/bookings/:id/complete`

**Side Effects:**
- Records feedback in `booking.meta.completionFeedback.organizer`
- If both organizer and artist confirm, booking transitions to "completed"
- Triggers final payment milestone when both parties confirm
- Updates trust scores based on feedback

**Example:**
```typescript
const completion = {
  confirmed: true,
  rating: 4,
  note: "Great set, crowd loved it. Minor delay at start but overall excellent performance."
};

completionConfirmSchema.parse(completion); // ✓ passes
```

**Notes:**
- Rating is internal only — not visible to artists or public
- Auto-confirm: If organizer doesn't confirm within 48 hours, platform auto-confirms
- Both parties must confirm before final payment is released

---

## Error Schemas

### `errorSchemas.validation`

Returned for validation failures (400 Bad Request).

**Structure:**
```typescript
{
  message: string,
  field?: string  // Optional field name that failed validation
}
```

**Example:**
```json
{
  "message": "Validation failed",
  "field": "email"
}
```

---

### `errorSchemas.notFound`

Returned when a resource is not found (404 Not Found).

**Structure:**
```typescript
{
  message: string
}
```

**Example:**
```json
{
  "message": "Organizer profile not found"
}
```

---

### `errorSchemas.unauthorized`

Returned for authentication failures (401 Unauthorized).

**Structure:**
```typescript
{
  message: string
}
```

**Example:**
```json
{
  "message": "Authentication required"
}
```

---

### `errorSchemas.conflict`

Returned for business logic conflicts (409 Conflict).

**Structure:**
```typescript
{
  message: string
}
```

**Example:**
```json
{
  "message": "Cannot delete event with active bookings"
}
```

---

## Usage Patterns

### Client-Side Validation

Use schemas for form validation with React Hook Form:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { organizerOnboardingSchema } from "@shared/routes";

function OnboardingForm() {
  const form = useForm({
    resolver: zodResolver(organizerOnboardingSchema),
    defaultValues: {
      organizationName: "",
      description: "",
      contactPerson: { name: "", email: "", phone: "" },
    },
  });

  // Form renders with automatic validation
}
```

### Server-Side Validation

Use schemas in route handlers:

```typescript
import { organizerOnboardingSchema } from "@shared/routes";

router.post("/organizer/profile/complete", async (req, res) => {
  const parsed = organizerOnboardingSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors,
    });
  }

  // Use parsed.data (type-safe)
  const { organizationName, description, contactPerson } = parsed.data;
  // ...
});
```

### Type Inference

Extract TypeScript types from schemas:

```typescript
import { z } from "zod";
import { organizerOnboardingSchema } from "@shared/routes";

type OnboardingInput = z.infer<typeof organizerOnboardingSchema>;

// Type is automatically:
// {
//   organizationName: string;
//   description: string;
//   contactPerson: { name: string; email: string; phone: string };
//   website?: string | undefined;
//   pastEventReferences?: string[] | undefined;
// }
```

---

## Best Practices

### 1. Always Use `.safeParse()` on the Server

```typescript
// ✓ Good — handles errors gracefully
const parsed = schema.safeParse(input);
if (!parsed.success) {
  return res.status(400).json({ message: "Validation failed" });
}

// ✗ Bad — throws exceptions
const data = schema.parse(input); // Can crash the server
```

### 2. Reuse Components for Consistency

```typescript
// ✓ Good — reuses contactPersonSchema
const mySchema = z.object({
  contact: contactPersonSchema,
  // ...
});

// ✗ Bad — duplicates validation logic
const mySchema = z.object({
  contact: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
  }),
  // ...
});
```

### 3. Use Partial Updates for PATCH/PUT

```typescript
// ✓ Good — allows partial updates
const updateSchema = baseSchema.partial();

// ✗ Bad — requires all fields
const updateSchema = baseSchema;
```

### 4. Provide Clear Error Messages

```typescript
// ✓ Good — user-friendly message
z.string().min(2, "Name must be at least 2 characters")

// ✗ Bad — generic message
z.string().min(2)
```

---

## Testing

### Property-Based Testing

Schemas are tested with fast-check for universal correctness:

```typescript
import * as fc from 'fast-check';
import { organizerOnboardingSchema } from '@shared/routes';

it('accepts any valid onboarding input', () => {
  fc.assert(
    fc.property(validOnboardingArb, (input) => {
      const result = organizerOnboardingSchema.safeParse(input);
      expect(result.success).toBe(true);
    })
  );
});
```

See `tests/properties/organizer-onboarding.prop.ts` for complete examples.

---

## Schema Evolution

When modifying schemas:

1. **Add optional fields** — maintains backward compatibility
2. **Never remove required fields** — breaks existing clients
3. **Use schema versioning** — for breaking changes
4. **Update documentation** — keep this file in sync
5. **Run property tests** — ensure universal correctness

---

## Related Documentation

- [Organizer API Documentation](./ORGANIZER_API.md) — API endpoints using these schemas
- [Database Schema](../shared/schema.ts) — Drizzle ORM table definitions
- [Route Contracts](../shared/routes.ts) — Complete API route definitions
