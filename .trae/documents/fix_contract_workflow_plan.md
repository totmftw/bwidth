# Plan: Fix Contract Workflow Starting Issue

## Root Cause Analysis
The contract workflow is currently failing to start for both artists and organizers because of a misconfiguration in how the "contracting" status is handled across the frontend components and how the negotiation sheet navigates upon acceptance:

1. **Incorrect Navigation in Negotiation**: When a negotiation is accepted, the `NegotiationFlow` component displays a "Start Contract" button. This button is hardcoded to navigate to `/contract-setup`—a placeholder route—instead of switching the current sheet view to the functional `ContractViewer` component.
2. **Artist Workflow Issue**: In `ArtistBookings.tsx`, the `contracting` status is not accounted for in the action buttons. When a booking reaches this status, it defaults to the "View Chat" button, which opens the negotiation flow again, trapping the user in a loop.
3. **Organizer Workflow Issue**: In `OrganizerBookings.tsx`, the "Start Contract" button correctly appears for the `contracting` status, but it incorrectly triggers `onOpen("negotiate")` instead of `onOpen("contract")`, again trapping the user.

## Implementation Steps

### Step 1: Update `NegotiationFlow.tsx`
**File:** `client/src/components/booking/NegotiationFlow.tsx`
*   Extend the `NegotiationFlowProps` interface to include an optional callback: `onStartContract?: () => void`.
*   Locate the terminal state banner (where `wf.currentNodeKey === "ACCEPTED"`).
*   Update the "Start Contract" button's `onClick` handler:
    ```typescript
    onClick={() => {
      if (onStartContract) {
        onStartContract();
      } else {
        navigate("/contract-setup");
      }
    }}
    ```

### Step 2: Fix Artist Bookings Workflow
**File:** `client/src/pages/artist/ArtistBookings.tsx`
*   In the `BookingCard` component, define the `contracting` status check: `const isContracting = status === "contracting";`.
*   Add a new CTA button block for the `contracting` state that triggers `onOpen("contract")`.
*   Update the fallback "View Chat" condition to ensure it doesn't overlap: `{!isPending && !isContracting && !isConfirmed && ...}`.
*   In the parent `ArtistBookings` component where `<NegotiationFlow />` is rendered inside the `Sheet`, pass the new prop: `onStartContract={() => setSheetView("contract")}`.

### Step 3: Fix Organizer Bookings Workflow
**File:** `client/src/pages/organizer/OrganizerBookings.tsx`
*   In the `BookingCard` component, locate the `isContracting` check.
*   Change the button's click handler from `onClick={() => onOpen("negotiate")}` to `onClick={() => onOpen("contract")}`.
*   In the parent `OrganizerBookings` component where `<NegotiationFlow />` is rendered, pass the new prop: `onStartContract={() => setSheetView("contract")}`.

### Step 4: Fix Venue Bookings Workflow (for consistency)
**File:** `client/src/pages/venue/VenueBookings.tsx`
*   Locate where `<NegotiationFlow />` is rendered inside the `Sheet`.
*   Pass the new prop to handle the transition smoothly: `onStartContract={() => { setShowNegotiation(false); setShowContract(true); }}`.

These steps will connect the negotiation acceptance state seamlessly to the contract viewer and ensure that the "Start Contract" buttons correctly initialize the contract API flow.