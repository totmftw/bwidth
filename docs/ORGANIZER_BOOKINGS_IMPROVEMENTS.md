# OrganizerBookings.tsx — Improvement Backlog

Identified during the Task 11 refactoring from monolithic to modular sub-component architecture.

## 1. Replace `any` types with a shared Booking interface

**Files**: `OrganizerBookings.tsx`, `use-organizer-bookings.ts`

Every sub-component (`NegotiationDisplay`, `ContractSection`, `PaymentTimeline`, `CompletionConfirmation`, `BookingDetail`) accepts `booking: any`. The API response shape is well-defined — create a `BookingWithDetails` type in `shared/` or co-located in the hooks file and use it throughout.

```ts
// shared/types.ts or use-organizer-bookings.ts
interface BookingWithDetails {
  id: number;
  status: BookingStatus;
  offerAmount: string;
  finalAmount?: string;
  offerCurrency: string;
  depositPercent?: number;
  updatedAt?: string;
  artist?: { stageName?: string; user?: { name: string } };
  event?: { title?: string; startTime?: string; endTime?: string };
  meta?: {
    negotiationRound?: number;
    slotTime?: string;
    message?: string;
    history?: NegotiationHistoryEntry[];
    completionFeedback?: Record<string, any>;
  };
}
```

Also fix `STATUS_CONFIG` — `variant` should be typed to the Badge variant union, `icon` to `LucideIcon`.

## 2. Empty Card wrappers when sub-components return null

**File**: `OrganizerBookings.tsx` — `BookingDetail` component (~line 600-680)

`ContractSection`, `PaymentTimeline`, and `CompletionConfirmation` each have internal `return null` guards, but the parent always renders `<Card className="p-6">` around them. This produces empty styled cards in the DOM.

**Fix**: Move the status guards to the parent, or wrap each section conditionally:

```tsx
{/* Only render card if contract section is relevant */}
{["contracting", "confirmed", "paid_deposit", "scheduled", "completed"].includes(status) && (
  <Card className="p-6">
    <ContractSection booking={booking} onViewContract={() => setViewMode("contract")} />
  </Card>
)}
```

## 3. Extract magic numbers to named constants

**File**: `OrganizerBookings.tsx` — `PaymentTimeline` component

| Value | Meaning | Suggested constant |
|-------|---------|-------------------|
| `30` | Default deposit percentage | `DEFAULT_DEPOSIT_PERCENT` |
| `0.4` | Pre-event payment ratio | `PRE_EVENT_PAYMENT_RATIO` |
| `0.03` | Platform commission rate | `DEFAULT_COMMISSION_RATE` |
| `48 * 60 * 60 * 1000` | 48-hour deadline in ms | `DEADLINE_MS` |
| `7 * 24 * 60 * 60 * 1000` | 7-day pre-event window in ms | `PRE_EVENT_WINDOW_MS` |

These constants are also used in the backend (`server/routes/organizer.ts`) and property tests. Consider placing them in `shared/constants.ts` for single-source-of-truth.

## 4. Extract reusable StarRating component

**File**: `OrganizerBookings.tsx` — `CompletionConfirmation` component

The star rendering pattern appears twice: once as interactive input, once as read-only display. Extract to:

```tsx
// client/src/components/ui/star-rating.tsx
function StarRating({ value, onChange, readonly, size }: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) { ... }
```

This would also be reusable in the artist-side completion confirmation and any future review UI.

## 5. Memoize groupedBookings in main component

**File**: `OrganizerBookings.tsx` — `OrganizerBookings` default export

```ts
// Current: recalculates every render
const groupedBookings = bookings.reduce(...)

// Better:
const groupedBookings = useMemo(() =>
  bookings.reduce((acc, booking) => {
    const status = (booking.status || "inquiry") as BookingStatus;
    if (!acc[status]) acc[status] = [];
    acc[status].push(booking);
    return acc;
  }, {} as Record<BookingStatus, any[]>),
  [bookings]
);
```

## 6. Remove unused `"initiated"` from PaymentMilestone status union

**File**: `OrganizerBookings.tsx` — `PaymentMilestone` interface

The `status` field includes `"initiated"` but it's never assigned anywhere in the milestone construction logic. Remove it or implement the state if it's planned.

```ts
// Current
status: "pending" | "initiated" | "completed" | "overdue";

// Should be
status: "pending" | "completed" | "overdue";
```
