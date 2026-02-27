# Code Review Recommendations

## File: `shared/routes.ts`
**Last Updated**: 2026-02-26

---

## ✅ Critical Issues - RESOLVED

### 1. Schema Duplication (FIXED) ✅
**Status**: ✅ Fully Implemented

Successfully extracted reusable schemas to eliminate duplication:
- `contactPersonSchema` - Used in onboarding and profile updates
- `socialLinksSchema` - Used in profile updates with validation
- `eventStageSchema` - Used in event creation

**Implementation Details**:
- All three schemas are now defined as reusable components at the top of the file
- Comprehensive JSDoc documentation added with examples and validation rules
- Schemas properly composed using Zod's `.optional()` modifier where needed
- `pastEventReferences` validation fixed: changed from `.min(1).optional()` to `.array(z.string().min(1)).optional()`

**Benefits**:
- Single source of truth for validation rules ✅
- Easier maintenance and updates ✅
- Consistent error messages across endpoints ✅
- Improved code readability and documentation ✅

**Files Updated**:
- `shared/routes.ts` - Added reusable schema components with full documentation
- `tests/properties/organizer-routes.prop.test.ts` - Fixed TypeScript type issues in tests

---

## 📋 Non-Critical Recommendations

### 1. Enhanced Phone Number Validation
**Priority**: Medium  
**Effort**: Low

**Current Implementation**:
```typescript
phone: z.string().min(10, "Phone number must be at least 10 characters")
```

**Recommended Enhancement**:
```typescript
phone: z.string()
  .min(10, "Phone number must be at least 10 characters")
  .regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format")
```

**Rationale**: 
- Current validation only checks length
- International numbers vary in format
- Regex ensures valid E.164 format (optional + prefix, 10-15 digits)

**Impact**: Better data quality, prevents invalid phone numbers

---

### 2. Currency Code Validation
**Priority**: Low  
**Effort**: Low

**Current Implementation**:
```typescript
currency: z.string().length(3).default("INR")
```

**Recommended Enhancement**:
```typescript
const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;

currency: z.enum(SUPPORTED_CURRENCIES).default("INR")
```

**Rationale**:
- Prevents invalid currency codes
- Documents supported currencies
- Easier to extend for international expansion

**Impact**: Type safety, better error messages

---

### 3. Event Time Validation
**Priority**: Medium  
**Effort**: Medium

**Current Implementation**:
```typescript
startTime: z.string().datetime(),
endTime: z.string().datetime().optional(),
doorTime: z.string().datetime().optional(),
```

**Recommended Enhancement**:
```typescript
export const createEventSchema = z.object({
  // ... other fields
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  doorTime: z.string().datetime().optional(),
}).refine(
  (data) => !data.endTime || new Date(data.endTime) > new Date(data.startTime),
  { message: "End time must be after start time", path: ["endTime"] }
).refine(
  (data) => !data.doorTime || new Date(data.doorTime) <= new Date(data.startTime),
  { message: "Door time must be before or equal to start time", path: ["doorTime"] }
);
```

**Rationale**:
- Prevents logical errors (end before start)
- Catches data entry mistakes early
- Better UX with clear error messages

**Impact**: Data integrity, reduced backend validation logic

---

### 4. Description Length Validation
**Priority**: Low  
**Effort**: Low

**Current Implementation**:
```typescript
description: z.string().min(10).max(2000)
```

**Recommended Enhancement**:
```typescript
description: z.string()
  .min(10, "Description must be at least 10 characters")
  .max(2000, "Description cannot exceed 2000 characters")
  .trim()
```

**Rationale**:
- `.trim()` removes accidental whitespace
- Prevents "10 spaces" from passing validation
- Cleaner data storage

**Impact**: Better data quality

---

### 5. Stage Capacity Validation
**Priority**: Low  
**Effort**: Low

**Current Implementation**:
```typescript
capacityTotal: z.number().int().positive().optional(),
// in stages:
capacity: z.number().int().positive().optional(),
```

**Recommended Enhancement**:
```typescript
export const createEventSchema = z.object({
  // ... other fields
  capacityTotal: z.number().int().positive().optional(),
  stages: z.array(eventStageSchema).optional(),
}).refine(
  (data) => {
    if (!data.capacityTotal || !data.stages) return true;
    const totalStageCapacity = data.stages.reduce((sum, s) => sum + (s.capacity || 0), 0);
    return totalStageCapacity <= data.capacityTotal;
  },
  { message: "Total stage capacity cannot exceed event capacity", path: ["stages"] }
);
```

**Rationale**:
- Ensures stage capacities don't exceed venue capacity
- Prevents overbooking scenarios
- Business logic validation at schema level

**Impact**: Data integrity, prevents booking conflicts

---

### 6. Social Links URL Validation
**Priority**: Low  
**Effort**: Low

**Current Implementation**:
```typescript
instagram: z.string().regex(/^@?[\w.]+$/, "Invalid Instagram handle").optional(),
```

**Recommended Enhancement**:
```typescript
const socialLinksSchema = z.object({
  instagram: z.string()
    .regex(/^@?[\w.]+$/, "Invalid Instagram handle")
    .transform(val => val.startsWith('@') ? val : `@${val}`)
    .optional(),
  twitter: z.string()
    .regex(/^@?[\w]+$/, "Invalid Twitter handle")
    .transform(val => val.startsWith('@') ? val : `@${val}`)
    .optional(),
  linkedin: z.string()
    .url("LinkedIn must be a valid URL")
    .regex(/linkedin\.com/, "Must be a LinkedIn URL")
    .optional(),
});
```

**Rationale**:
- Normalizes social handles (adds @ if missing)
- LinkedIn should be full URL, not just username
- Consistent data format in database

**Impact**: Better data consistency, easier display logic

---

### 7. Rating Validation Enhancement
**Priority**: Low  
**Effort**: Low

**Current Implementation**:
```typescript
rating: z.number().int().min(1).max(5)
```

**Recommended Enhancement**:
```typescript
rating: z.number()
  .int("Rating must be a whole number")
  .min(1, "Rating must be at least 1")
  .max(5, "Rating cannot exceed 5")
```

**Rationale**:
- More descriptive error messages
- Better developer experience
- Clearer validation feedback

**Impact**: Better error messages for API consumers

---

## 🔄 Future Enhancements

### 1. Schema Versioning
Consider adding version metadata to schemas for API evolution:

```typescript
export const organizerOnboardingSchemaV1 = organizerOnboardingSchema;
export const organizerOnboardingSchema = organizerOnboardingSchemaV1; // current version
```

### 2. Custom Error Messages
Create a centralized error message configuration:

```typescript
const ERROR_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  // ... more messages
};
```

### 3. Schema Testing
Add unit tests for schema validation:

```typescript
describe('organizerOnboardingSchema', () => {
  it('should accept valid input', () => {
    const result = organizerOnboardingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
  
  it('should reject missing organizationName', () => {
    const result = organizerOnboardingSchema.safeParse({ ...validInput, organizationName: undefined });
    expect(result.success).toBe(false);
  });
});
```

---

## 📊 Summary

**Critical Issues**: 3 (All resolved ✅)
**Non-Critical Recommendations**: 7 (Pending)
**Future Enhancements**: 3 (Planned)

**Overall Assessment**: The code is production-ready with excellent documentation and type safety. The implemented improvements eliminate duplication and enhance maintainability. Non-critical recommendations are optional enhancements that can be implemented incrementally based on priority.
