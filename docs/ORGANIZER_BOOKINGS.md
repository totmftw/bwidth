# Organizer Bookings — Technical & User Documentation

## Overview

The Organizer Bookings page (`client/src/pages/organizer/OrganizerBookings.tsx`) is the central hub where organizers manage their artist bookings across the full lifecycle — from initial inquiry through negotiation, contracting, payment, and post-event completion.

The component was refactored from a single monolithic component into a modular architecture with five focused sub-components, each handling a distinct phase of the booking lifecycle.

## Component Architecture

```
OrganizerBookings (list view + tab filtering)
  └─ BookingDetail (single booking deep-dive, fetched by ID)
       ├─ NegotiationDisplay   — round tracker, offer comparison, history
       ├─ ContractSection      — contract status + sign/view CTA
       ├─ PaymentTimeline      — milestone-based payment breakdown
       └─ CompletionConfirmation — post-event rating + confirm form
```

Shared components reused from `client/src/components/booking/`:
- `ContractViewer` — full contract text with signing UI
- `NegotiationFlow` — interactive negotiation interface (accept/counter/decline)
- `OfferComparison` — side-by-side original vs current offer table

## Booking Status Lifecycle

Bookings progress through these statuses:

```
inquiry → offered → negotiating → contracting → confirmed → paid_deposit → scheduled → completed
                                                                                    ↘ cancelled
```

Each status maps to a visual Badge with a distinct color variant and Lucide icon, configured in `STATUS_CONFIG`.

## Data Layer

### Hooks (from `client/src/hooks/use-organizer-bookings.ts`)

| Hook | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| `useOrganizerBookings(status?)` | GET | `/api/organizer/bookings` | List bookings with optional status filter |
| `useOrganizerBooking(id)` | GET | `/api/organizer/bookings/:id` | Single booking with full enriched data |
| `useCompleteBooking()` | POST | `/api/organizer/bookings/:id/complete` | Submit completion confirmation |

All hooks use TanStack Query. The completion mutation automatically invalidates the bookings list query on success and shows a toast notification.

### API Response Shape

Bookings are returned enriched with related data:
- `booking.artist` — artist profile with `stageName`, nested `user.name`
- `booking.event` — event with `title`, `startTime`, `endTime`
- `booking.meta` — JSONB metadata containing negotiation history, completion feedback
- `booking.offerAmount`, `booking.finalAmount`, `booking.offerCurrency`

---

## Sub-Component Details

### 1. NegotiationDisplay

Renders the negotiation state for bookings in `inquiry`, `offered`, or `negotiating` status.

Key behaviors:
- Shows current round out of max 3 (platform limit)
- Renders `OfferComparison` when history has more than one entry (original vs latest)
- Displays chronological history timeline with action, message, amount, and timestamp
- "Open Negotiation" button enabled only when `round < 3` and status is negotiable
- Warning banner when max rounds exhausted — organizer must Accept or Decline

Data source: `booking.meta.history[]` array and `booking.meta.negotiationRound`.

### 2. ContractSection

Renders for bookings at `contracting` status or beyond.

Two states:
- **Pending signatures** (`contracting`) — shows 48-hour signing deadline notice and "Review & Sign Contract" button
- **Active** (post-signing) — shows "View Contract" button

Delegates to the shared `ContractViewer` component for the actual contract display and signing UI.

### 3. PaymentTimeline

Renders for bookings at `confirmed` status or beyond (contract signed).

Payment structure follows platform business rules:
- **Deposit**: configurable % (default 30%), due on contract signing
- **Pre-Event**: 40% of total, due 7 days before event start
- **Final Payment**: remainder, due after event completion
- **Platform Commission**: 2-5% (default 3%), shown as informational line item

Milestone status derivation:
- Status cascades forward based on booking status (e.g., `paid_deposit` → deposit is completed)
- Overdue detection uses `date-fns/isPast` against calculated due dates
- Visual indicators: green for completed, red for overdue, neutral for pending

### 4. CompletionConfirmation

Appears only after the event's end time has passed and the booking is in a confirmable status (`confirmed`, `paid_deposit`, `scheduled`).

Three render states:
1. **Hidden** — event hasn't ended or booking status doesn't qualify
2. **Already confirmed** — read-only summary showing the organizer's rating and timestamp, plus a note about waiting for artist confirmation
3. **Confirmation form**:
   - Checkbox: "I confirm the artist performed as per the contract terms"
   - 1-5 star rating (required)
   - Optional private note (max 1000 chars, internal only — not public)
   - Auto-confirm deadline notice (48 hours after event end)

On submit, calls `POST /api/organizer/bookings/:id/complete`. When both organizer and artist confirm, the booking transitions to `completed` and the final payment milestone is triggered.

---

## User Guide

### Viewing Bookings

The main view shows all bookings in a tabbed interface:
- **All** — every booking regardless of status
- **Inquiries** — artist applications awaiting response
- **Negotiating** — active negotiations in progress
- **Contracting** — contracts generated, awaiting signatures
- **Confirmed** — fully signed, event upcoming
- **Completed** — past events with confirmed completion

Each tab shows a count. Click any booking card to open the detail view.

### Responding to Artist Inquiries

When an artist applies to perform at your event, the booking appears with "Inquiry" status. In the detail view:
- Read the artist's message and proposed fee
- Click **Accept** to move to contracting
- Click **Counter-Offer** to open the negotiation flow
- Click **Decline** to reject the application

### Negotiating Terms

The negotiation section shows:
- Current round number (max 3 rounds allowed)
- Side-by-side comparison of original vs current offer
- Full history of all negotiation actions

Click "Open Negotiation" to submit a counter-offer with adjusted amount, slot time, and message. After 3 rounds, you must Accept or Decline.

### Signing Contracts

Once terms are agreed, a contract is auto-generated. The contract section shows:
- Current signature status
- 48-hour signing deadline

Click "Review & Sign Contract" to view the full contract text and sign digitally.

### Tracking Payments

After contract signing, the payment timeline shows three milestones:
- Deposit (on signing)
- Pre-event payment (7 days before)
- Final payment (after completion)

Overdue payments are highlighted in red. Platform commission is shown as a separate line item.

### Confirming Event Completion

After the event ends, a completion form appears:
1. Check the confirmation box
2. Rate the artist's performance (1-5 stars)
3. Optionally add a private note
4. Click "Confirm Completion"

If you don't confirm within 48 hours, the platform auto-confirms. Once both parties confirm, the booking moves to "completed" and the final payment is released.

---

## Related Documentation

- [Organizer API Documentation](./ORGANIZER_API.md) — API endpoint details
- [Organizer Onboarding](./ORGANIZER_ONBOARDING.md) — Setup wizard documentation
- [Code Architecture](./CODE_ARCHITECTURE.md) — Architectural patterns
