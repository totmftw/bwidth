# Code Architecture Documentation

## Overview

This document describes the architectural patterns, design decisions, and code organization principles used in the BANDWIDTH music booking platform. Understanding these patterns is essential for maintaining consistency and extending the codebase.

---

## Table of Contents

1. [Validation Schema Architecture](#validation-schema-architecture)
2. [Route Contract Pattern](#route-contract-pattern)
3. [Data Access Layer](#data-access-layer)
4. [Client State Management](#client-state-management)
5. [Type Safety Strategy](#type-safety-strategy)
6. [Error Handling Patterns](#error-handling-patterns)
7. [Testing Strategy](#testing-strategy)

---

## Validation Schema Architecture

### Design Philosophy

The validation schema architecture follows these principles:

1. **Single Source of Truth** — Schemas defined once in `shared/routes.ts`
2. **Composition Over Duplication** — Reusable components composed into feature schemas
3. **Client-Server Consistency** — Same validation rules on both sides
4. **Type Inference** — TypeScript types automatically derived from schemas

### Schema Hierarchy

```
Reusable Components (contactPersonSchema, socialLinksSchema, eventStageSchema)
         ↓
Feature Schemas (organizerOnboardingSchema, createEventSchema, etc.)
         ↓
Route Contracts (api.organizer.profile.complete, api.organizer.events.create, etc.)
         ↓
API Endpoints (POST /api/organizer/profile/complete, POST /api/organizer/events, etc.)
```

### Reusable Component Pattern

**Problem:** Validation logic for common data structures (contact info, social links, etc.) was duplicated across multiple schemas.

**Solution:** Extract common patterns into reusable schema components.

**Example:**

```typescript
// ✓ Good — Reusable component
const contactPersonSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
});

// Used in multiple places
const organizerOnboardingSchema = z.object({
  organizationName: z.string().min(2).max(200),
  contactPerson: contactPersonSchema, // ← Reused
  // ...
});

const organizerProfileUpdateSchema = z.object({
  contactPerson: contactPersonSchema.optional(), // ← Reused with .optional()
  // ...
});
```

**Benefits:**
- **Consistency** — Contact validation rules identical everywhere
- **Maintainability** — Change once, updates everywhere
- **Readability** — Intent clear from component name
- **Testability** — Test component once, confidence everywhere

### Schema Composition Patterns

#### 1. Required in One Schema, Optional in Another

```typescript
// Onboarding: contactPerson is required
const organizerOnboardingSchema = z.object({
  contactPerson: contactPersonSchema, // Required
  // ...
});

// Profile update: contactPerson is optional
const organizerProfileUpdateSchema = z.object({
  contactPerson: contactPersonSchema.optional(), // Optional
  // ...
});
```

#### 2. Array of Components

```typescript
// Event can have multiple stages
const createEventSchema = z.object({
  stages: z.array(eventStageSchema).optional(),
  // ...
});
```

#### 3. Nested Components

```typescript
// Social links nested in metadata
const organizerProfileUpdateSchema = z.object({
  socialLinks: socialLinksSchema.optional(),
  // ...
});
```

### When to Create a Reusable Component

Create a reusable component when:

1. **Used in 2+ schemas** — Avoid duplication
2. **Represents a domain concept** — Contact person, address, social links, etc.
3. **Has complex validation** — Regex patterns, custom refinements
4. **Likely to change together** — Business rules that evolve as a unit

Don't create a component for:

1. **One-off fields** — Simple strings/numbers used once
2. **Highly context-specific** — Validation rules that vary by use case
3. **Trivial validation** — `z.string()` or `z.number()` with no constraints

---

## Route Contract Pattern

### Design Philosophy

Route contracts define the complete API surface in a type-safe, declarative way:

```typescript
export const api = {
  organizer: {
    profile: {
      complete: {
        method: 'POST' as const,
        path: '/api/organizer/profile/complete',
        input: organizerOnboardingSchema,
        responses: {
          200: z.object({ message: z.string(), organizer: z.custom<...>() }),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        },
      },
    },
  },
};
```

### Benefits

1. **Type Safety** — Client and server share exact types
2. **Documentation** — API surface self-documenting
3. **Validation** — Input/output schemas enforce contracts
4. **Discoverability** — IDE autocomplete for all endpoints

### Usage Pattern

**Client:**
```typescript
import { api } from "@shared/routes";

// Type-safe fetch
const res = await fetch(api.organizer.profile.complete.path, {
  method: api.organizer.profile.complete.method,
  body: JSON.stringify(data),
});

// Type-safe response
type Response = z.infer<typeof api.organizer.profile.complete.responses[200]>;
```

**Server:**
```typescript
import { api } from "@shared/routes";

router.post(api.organizer.profile.complete.path, async (req, res) => {
  const parsed = api.organizer.profile.complete.input.safeParse(req.body);
  // ...
});
```

---

## Data Access Layer

### Storage Pattern

All database queries go through `server/storage.ts`:

```typescript
interface IStorage {
  // Organizer methods
  getOrganizerByUserId(userId: number): Promise<Organizer | undefined>;
  updateOrganizer(id: number, data: Partial<InsertOrganizer>): Promise<Organizer>;
  getOrganizerDashboardStats(organizerId: number): Promise<OrganizerDashboardStats>;
  // ...
}
```

### Benefits

1. **Abstraction** — Routes don't know about database details
2. **Testability** — Mock storage layer in tests
3. **Consistency** — Query patterns standardized
4. **Performance** — Optimize queries in one place

### Query Organization

Methods are grouped by domain:

```typescript
// Organizer profile
getOrganizer(id)
getOrganizerByUserId(userId)
updateOrganizer(id, data)

// Organizer events
getEventsByOrganizer(organizerId, status?)
hasActiveBookings(eventId)
deleteEvent(eventId)

// Organizer dashboard
getOrganizerDashboardStats(organizerId)
getRecentActivity(userId, limit)
```

---

## Client State Management

### TanStack Query Pattern

All server state managed with TanStack Query:

```typescript
// Custom hook wraps query
export function useOrganizerProfile() {
  return useQuery({
    queryKey: [api.organizer.profile.get.path],
    queryFn: async () => {
      const res = await fetch(api.organizer.profile.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organizer profile");
      return await res.json() as OrganizerProfile;
    },
  });
}

// Usage in component
function ProfilePage() {
  const { data, isLoading, error } = useOrganizerProfile();
  // ...
}
```

### Mutation Pattern

```typescript
export function useUpdateOrganizerProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateOrganizerInput) => {
      const res = await fetch(api.organizer.profile.update.path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: [api.organizer.profile.get.path] });
      toast({ title: "Profile Updated", description: "Your organizer profile has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
}
```

### Cache Invalidation Strategy

```typescript
// After mutation, invalidate related queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: [api.organizer.profile.get.path] });
  queryClient.invalidateQueries({ queryKey: [api.organizer.profile.status.path] });
}
```

---

## Type Safety Strategy

### Type Inference from Schemas

```typescript
import { z } from "zod";
import { organizerOnboardingSchema } from "@shared/routes";

// Infer input type
type OnboardingInput = z.infer<typeof organizerOnboardingSchema>;

// Infer output type (after .parse() or .safeParse())
type OnboardingOutput = z.output<typeof organizerOnboardingSchema>;
```

### Database Types

```typescript
import { promoters } from "@shared/schema";

// Insert type (before DB)
type InsertOrganizer = typeof promoters.$inferInsert;

// Select type (from DB)
type Organizer = typeof promoters.$inferSelect;
```

### API Response Types

```typescript
import { api } from "@shared/routes";

// Response type for 200 status
type ProfileResponse = z.infer<typeof api.organizer.profile.get.responses[200]>;

// Error type for 400 status
type ValidationError = z.infer<typeof api.organizer.profile.get.responses[400]>;
```

---

## Error Handling Patterns

### Server-Side Error Handling

```typescript
router.post("/organizer/profile/complete", async (req, res) => {
  try {
    // 1. Validate input
    const parsed = organizerOnboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.errors,
      });
    }

    // 2. Check authorization
    const organizer = await storage.getOrganizerByUserId(user.id);
    if (!organizer) {
      return res.status(404).json({ message: "Organizer profile not found" });
    }

    // 3. Business logic
    const updated = await storage.updateOrganizer(organizer.id, {
      // ...
    });

    // 4. Success response
    return res.json({ message: "Onboarding complete", organizer: updated });
  } catch (error) {
    // 5. Unexpected errors
    return res.status(500).json({ message: "Failed to complete onboarding" });
  }
});
```

### Client-Side Error Handling

```typescript
export function useCompleteOnboarding() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: OnboardingInput) => {
      const res = await fetch(api.organizer.profile.complete.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to complete onboarding");
      }
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Onboarding Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

---

## Testing Strategy

### Property-Based Testing

Universal correctness properties tested with fast-check:

```typescript
import * as fc from 'fast-check';
import { organizerOnboardingSchema } from '@shared/routes';

describe('Property 3: Onboarding validation rejects incomplete input', () => {
  it('accepts any valid onboarding input with all required fields', () => {
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const result = organizerOnboardingSchema.safeParse(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects input missing organizationName', () => {
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const { organizationName, ...rest } = input;
        const result = organizerOnboardingSchema.safeParse(rest);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
```

### Unit Testing

Specific examples and edge cases:

```typescript
describe('organizerOnboardingSchema', () => {
  it('accepts valid input with all required fields', () => {
    const input = {
      organizationName: "Sunrise Events",
      description: "Bangalore-based event management company",
      contactPerson: {
        name: "Rahul Kumar",
        email: "rahul@sunrise.events",
        phone: "+919876543210"
      }
    };
    const result = organizerOnboardingSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects input with short organization name', () => {
    const input = {
      organizationName: "A", // Too short
      description: "Valid description",
      contactPerson: { /* valid */ }
    };
    const result = organizerOnboardingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
```

### Integration Testing

End-to-end API tests:

```typescript
describe('POST /api/organizer/profile/complete', () => {
  it('completes onboarding and sets profileComplete flag', async () => {
    const res = await request(app)
      .post('/api/organizer/profile/complete')
      .send(validOnboardingData)
      .expect(200);

    expect(res.body.organizer.metadata.profileComplete).toBe(true);
    expect(res.body.organizer.metadata.trustScore).toBe(50);
  });
});
```

---

## Design Patterns Summary

### 1. Reusable Schema Components

**When:** Common data structures used in multiple schemas  
**How:** Extract into standalone schema, compose with `.optional()`, `.array()`, etc.  
**Example:** `contactPersonSchema`, `socialLinksSchema`, `eventStageSchema`

### 2. Route Contracts

**When:** Defining API endpoints  
**How:** Declare method, path, input schema, response schemas in `shared/routes.ts`  
**Example:** `api.organizer.profile.complete`

### 3. Storage Layer Abstraction

**When:** Database queries  
**How:** All queries through `IStorage` interface in `server/storage.ts`  
**Example:** `getOrganizerDashboardStats(organizerId)`

### 4. Custom React Hooks

**When:** Server state management  
**How:** Wrap TanStack Query in custom hooks  
**Example:** `useOrganizerProfile()`, `useUpdateOrganizerProfile()`

### 5. Type Inference

**When:** Deriving TypeScript types  
**How:** Use `z.infer<typeof schema>` and Drizzle's `$inferSelect`  
**Example:** `type OnboardingInput = z.infer<typeof organizerOnboardingSchema>`

### 6. Property-Based Testing

**When:** Testing universal correctness properties  
**How:** Use fast-check arbitraries to generate test cases  
**Example:** "For any valid input, schema accepts it"

---

## Code Organization Principles

### 1. Colocation

Related code lives together:
- Validation schemas → `shared/routes.ts`
- Database queries → `server/storage.ts`
- API routes → `server/routes/organizer.ts`
- React hooks → `client/src/hooks/use-organizer.ts`

### 2. Single Responsibility

Each module has one clear purpose:
- `shared/routes.ts` — API contracts and validation
- `server/storage.ts` — Data access
- `server/routes/organizer.ts` — HTTP request handling
- `client/src/hooks/use-organizer.ts` — Server state management

### 3. Dependency Direction

```
Client → Shared ← Server
```

- Client and Server both depend on Shared
- Shared has no dependencies on Client or Server
- Enables code reuse and type safety

### 4. Explicit Over Implicit

```typescript
// ✓ Good — explicit schema composition
const organizerOnboardingSchema = z.object({
  contactPerson: contactPersonSchema,
  // ...
});

// ✗ Bad — implicit inline schema
const organizerOnboardingSchema = z.object({
  contactPerson: z.object({ /* ... */ }),
  // ...
});
```

---

## Related Documentation

- [Validation Schemas](./VALIDATION_SCHEMAS.md) — Complete schema reference
- [Organizer API](./ORGANIZER_API.md) — API endpoint documentation
- [Project Structure](../.kiro/steering/structure.md) — File organization
- [Tech Stack](../.kiro/steering/tech.md) — Technology choices
