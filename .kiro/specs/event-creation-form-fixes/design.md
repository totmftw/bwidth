# Event Creation Form Fixes - Bugfix Design

## Overview

The event creation form at `/organizer/events/create` has multiple usability and validation issues that prevent organizers from successfully creating events. The primary issues are: (1) "Invalid datetime" validation errors caused by datetime-local input format mismatches with Zod's ISO 8601 datetime validation, (2) poor mobile UX with datetime-local inputs, (3) unnecessary Door Time field, (4) lack of support for temporary venue creation, and (5) missing India-specific date/time formats.

The fix approach involves:
- Splitting datetime inputs into separate date and time fields with proper format conversion
- Removing the Door Time field from the form and schema
- Adding temporary venue creation capability with a new database table
- Implementing India-friendly date format (DD-MM-YYYY) and 24-hour time input (HH:MM)
- Applying the same improvements to stage datetime inputs

## Glossary

- **Bug_Condition (C)**: The condition that triggers validation failures - when datetime-local input format doesn't match Zod's ISO 8601 datetime validation, or when mobile users struggle with datetime-local inputs, or when organizers need to add unlisted venues
- **Property (P)**: The desired behavior - datetime inputs should validate correctly, be mobile-friendly, use India formats, support temporary venues, and exclude Door Time
- **Preservation**: Existing event creation flow, venue selection, stage management, and data storage that must remain unchanged
- **datetime-local**: HTML5 input type that combines date and time in a single field (format: YYYY-MM-DDTHH:mm)
- **ISO 8601**: International datetime format required by Zod (format: YYYY-MM-DDTHH:mm:ss.sssZ)
- **createEventSchema**: Zod validation schema in `shared/routes.ts` that validates event creation payloads
- **OrganizerEventCreate**: React component at `client/src/pages/organizer/OrganizerEventCreate.tsx` that renders the event creation form
- **Temporary Venue**: A venue not registered on the platform, created inline during event creation with basic details

## Bug Details

### Bug Condition

The bug manifests when organizers attempt to create events using the current form. The issues are:

1. **Datetime Validation Mismatch**: The form uses `<input type="datetime-local">` which produces values like "2024-01-15T20:00" (no timezone), but the code converts this to ISO 8601 with `new Date(data.startTime).toISOString()`. If the browser or form state produces an invalid intermediate format, Zod's `.datetime()` validation fails with "Invalid datetime" errors.

2. **Mobile UX Issues**: The datetime-local input is difficult to use on mobile devices, requiring multiple taps and scrolls through date/time pickers that vary by browser.

3. **Unnecessary Door Time**: The form includes a Door Time field that is rarely used and adds complexity.

4. **No Temporary Venue Support**: Organizers cannot create events at unlisted venues - they must select from registered venues only.

5. **Non-India Formats**: The form doesn't use DD-MM-YYYY date format or 24-hour time format preferred in India.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type EventCreationFormInput
  OUTPUT: boolean
  
  RETURN (input.startTime IS datetime-local format 
          AND NOT validISO8601(input.startTime))
         OR (input.deviceType == "mobile" 
          AND input.inputType == "datetime-local")
         OR (input.doorTime IS present)
         OR (input.venueId IS null 
          AND NOT canCreateTemporaryVenue())
         OR (input.dateFormat != "DD-MM-YYYY" 
          OR input.timeFormat != "24-hour")
END FUNCTION
```

### Examples

- **Datetime Validation Error**: Organizer fills in "15-01-2024 20:00" → Form shows "Invalid datetime" because Zod expects ISO 8601 format
- **Mobile UX Issue**: Organizer on mobile taps datetime-local input → Gets browser-specific picker that's hard to navigate → Takes 30+ seconds to input a simple date/time
- **Door Time Confusion**: Organizer sees Door Time field → Doesn't know if it's required → Leaves it blank or fills it unnecessarily
- **Unlisted Venue**: Organizer wants to create event at "The Underground Club" (not registered) → Cannot proceed because venue isn't in dropdown → Must contact venue to register first or abandon event creation
- **Stage Datetime Issues**: Organizer adds stage with datetime-local inputs → Encounters same validation and UX issues as main event times
- **Date Format Confusion**: Indian organizer sees MM-DD-YYYY format → Enters 05-03-2024 meaning March 5th → System interprets as May 3rd

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Event creation flow must continue to work with all existing fields (title, description, capacity, currency, visibility)
- Venue selection from registered venues must continue to work exactly as before
- Stage management (add, remove, configure) must continue to work
- Form submission must continue to convert local datetime to ISO 8601 for storage
- Events must continue to be created with status "draft" by default
- Pre-filled venue from discovery page must continue to work
- Cancel button must continue to navigate back to events list
- All optional fields must continue to be optional

**Scope:**
All inputs and behaviors that do NOT involve datetime inputs, Door Time field, or venue selection should be completely unaffected by this fix. This includes:
- Text inputs (title, description)
- Number inputs (capacity)
- Select inputs (currency, visibility)
- Stage name and capacity inputs
- Form validation for non-datetime fields
- Navigation and routing
- API payload structure (except datetime fields and temporary venue data)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Format Conversion Gap**: The datetime-local input produces a string like "2024-01-15T20:00" (no timezone, no seconds), but `new Date(value).toISOString()` may fail or produce unexpected results if the value is malformed or if there's a timezone interpretation issue. Zod's `.datetime()` validator expects strict ISO 8601 format.

2. **Browser Inconsistency**: Different browsers handle datetime-local differently, and mobile browsers often have poor UX for this input type.

3. **Schema Mismatch**: The form uses datetime-local (local time) but the schema expects ISO 8601 (UTC time with timezone), creating a conversion challenge.

4. **Unnecessary Field**: Door Time was included in the original schema but is rarely used in practice for most events.

5. **Limited Venue Model**: The current implementation assumes all venues are registered users, but real-world events often happen at unlisted locations.

6. **Default Browser Formats**: HTML5 date/time inputs use browser locale defaults, which may not match India preferences (DD-MM-YYYY, 24-hour time).

## Correctness Properties

Property 1: Bug Condition - Datetime Validation and Mobile UX

_For any_ event creation form submission where date and time are provided as separate inputs (date in DD-MM-YYYY format, time in HH:MM 24-hour format), the fixed form SHALL correctly combine and convert these to ISO 8601 format, pass Zod validation, and provide a mobile-friendly input experience without "Invalid datetime" errors.

**Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7**

Property 2: Bug Condition - Temporary Venue Creation

_For any_ event creation where the organizer selects "Add Temporary Venue" option, the fixed form SHALL allow input of venue name, location, maps link, directions, landmark, and contact details, store this in a separate temporary_venues table, and link the event to the temporary venue.

**Validates: Requirements 2.5, 2.8**

Property 3: Bug Condition - Door Time Removal

_For any_ event creation form submission, the fixed form SHALL NOT include or require a Door Time field, and SHALL NOT send doorTime in the API payload.

**Validates: Requirements 2.4**

Property 4: Preservation - Existing Event Creation Flow

_For any_ event creation that uses registered venues and provides valid non-datetime inputs, the fixed form SHALL produce exactly the same result as the original form, preserving all existing functionality for title, description, capacity, currency, visibility, stages, and venue selection.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `client/src/pages/organizer/OrganizerEventCreate.tsx`

**Changes**:
1. **Split Datetime Inputs**: Replace single datetime-local inputs with separate date and time inputs
   - Add date input with type="date" and pattern for DD-MM-YYYY display
   - Add time input with type="time" and step="60" for HH:MM format
   - Apply to: startTime, endTime (remove doorTime)
   - Apply same pattern to stage startTime and endTime

2. **Remove Door Time Field**: Delete the doorTime input field and related form registration

3. **Add Temporary Venue Option**: Add radio buttons or toggle to switch between "Select Registered Venue" and "Add Temporary Venue"
   - When "Add Temporary Venue" is selected, show additional fields:
     - Venue Name (required)
     - Location/Address (required)
     - Maps Link (optional, URL validation)
     - Directions (optional, textarea)
     - Landmark (optional)
     - Contact Name (optional)
     - Contact Phone (optional)

4. **Update Form Submission Logic**: Modify `onSubmit` to:
   - Combine separate date and time inputs into ISO 8601 format
   - Handle DD-MM-YYYY to YYYY-MM-DD conversion
   - Include temporary venue data in payload if provided
   - Remove doorTime from payload

5. **Update Form State**: Modify `defaultValues` to use separate date/time fields and remove doorTime

**File 2**: `shared/routes.ts`

**Changes**:
1. **Update createEventSchema**: 
   - Make doorTime field optional or remove it entirely (prefer removal)
   - Add optional temporaryVenue object with fields: name, location, mapsLink, directions, landmark, contactName, contactPhone
   - Keep venueId optional (either venueId OR temporaryVenue should be provided, but not both)

**File 3**: `shared/schema.ts`

**Changes**:
1. **Create temporaryVenues Table**: Add new table definition
   ```typescript
   export const temporaryVenues = pgTable("temporary_venues", {
     id: serial("id").primaryKey(),
     eventId: integer("event_id").references(() => events.id, { onDelete: "cascade" }),
     name: text("name").notNull(),
     location: text("location").notNull(),
     mapsLink: text("maps_link"),
     directions: text("directions"),
     landmark: text("landmark"),
     contactName: text("contact_name"),
     contactPhone: text("contact_phone"),
     createdAt: timestamp("created_at").defaultNow(),
     metadata: jsonb("metadata").default({}),
   });
   ```

2. **Update events Table**: Ensure venueId remains optional (already is)

**File 4**: `server/routes/organizer.ts`

**Changes**:
1. **Update Event Creation Handler**: Modify POST /api/organizer/events to:
   - Accept temporaryVenue data in request body
   - If temporaryVenue is provided, insert into temporary_venues table first
   - Link event to temporary venue via metadata or separate relation
   - Validate that either venueId OR temporaryVenue is provided (not both, not neither)

2. **Remove doorTime Handling**: Remove any doorTime processing from the handler

**File 5**: `server/storage.ts`

**Changes**:
1. **Add createTemporaryVenue Function**: Add data access method for inserting temporary venues
2. **Update createEvent Function**: Modify to handle temporary venue creation and linking

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write tests that simulate form submissions with various datetime formats, mobile device contexts, and venue scenarios. Run these tests on the UNFIXED code to observe failures and understand the root causes.

**Test Cases**:
1. **Datetime Validation Test**: Submit form with datetime-local value "2024-01-15T20:00" → Expect "Invalid datetime" error on unfixed code
2. **Mobile UX Test**: Simulate mobile device with datetime-local input → Observe poor UX (manual testing required)
3. **Door Time Presence Test**: Check form for doorTime field → Confirm it exists on unfixed code
4. **Temporary Venue Test**: Attempt to create event without selecting registered venue → Expect validation error on unfixed code
5. **Stage Datetime Test**: Add stage with datetime-local inputs → Expect same validation issues as main event times
6. **Date Format Test**: Check if form uses DD-MM-YYYY format → Confirm it doesn't on unfixed code

**Expected Counterexamples**:
- Zod validation fails with "Invalid datetime" for datetime-local formatted strings
- Mobile users struggle with datetime-local picker (qualitative observation)
- Door Time field is present but unnecessary
- No option to add temporary venue details
- Date format is MM-DD-YYYY or YYYY-MM-DD, not DD-MM-YYYY

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleEventCreation_fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Test Cases**:
1. **Split Datetime Validation**: Submit form with separate date (DD-MM-YYYY) and time (HH:MM) inputs → Assert successful validation and correct ISO 8601 conversion
2. **Mobile-Friendly Inputs**: Test on mobile device with separate date/time inputs → Assert improved UX
3. **Door Time Removed**: Check form structure → Assert doorTime field is not present
4. **Temporary Venue Creation**: Submit form with temporary venue details → Assert venue is created in temporary_venues table and linked to event
5. **Stage Datetime Fix**: Add stage with separate date/time inputs → Assert successful validation
6. **India Format Support**: Use DD-MM-YYYY date and 24-hour time → Assert correct interpretation and storage

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleEventCreation_original(input) = handleEventCreation_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-datetime fields and registered venue selection, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Title and Description Preservation**: Submit events with various titles and descriptions → Assert same storage behavior
2. **Capacity and Currency Preservation**: Submit events with various capacity and currency values → Assert same storage behavior
3. **Visibility Preservation**: Submit events with public/private visibility → Assert same storage behavior
4. **Registered Venue Selection Preservation**: Select registered venue from dropdown → Assert same venueId linking behavior
5. **Stage Management Preservation**: Add/remove stages with names and capacities → Assert same stage storage behavior
6. **Pre-filled Venue Preservation**: Navigate from discovery page with venueId → Assert same pre-fill behavior
7. **Cancel Navigation Preservation**: Click cancel button → Assert same navigation behavior
8. **Draft Status Preservation**: Create event → Assert status is still "draft" by default

### Unit Tests

- Test date format conversion (DD-MM-YYYY → YYYY-MM-DD)
- Test time format handling (HH:MM → ISO 8601 time component)
- Test datetime combination logic (date + time → ISO 8601)
- Test temporary venue validation (required fields, optional fields)
- Test venue selection logic (registered vs temporary)
- Test doorTime field removal from payload
- Test stage datetime conversion with new format
- Test edge cases (missing time, missing date, invalid formats)

### Property-Based Tests

- Generate random valid dates in DD-MM-YYYY format and verify correct conversion to ISO 8601
- Generate random valid times in HH:MM format and verify correct conversion
- Generate random event data with registered venues and verify preservation of existing behavior
- Generate random temporary venue data and verify correct storage
- Generate random stage configurations and verify datetime handling
- Test that all non-datetime fields continue to work across many random inputs

### Integration Tests

- Test full event creation flow with split datetime inputs
- Test event creation with temporary venue from form submission to database storage
- Test event creation with registered venue to ensure no regression
- Test stage addition with new datetime format
- Test form validation errors display correctly for new input structure
- Test mobile device interaction with new date/time inputs (manual or automated with device emulation)
- Test pre-filled venue flow still works with new form structure
- Test cancel and navigation flows remain unchanged
