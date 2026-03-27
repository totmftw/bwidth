# Comprehensive Implementation Plan: Tech Rider, Contract Workflow, Admin Controls, & Signing Process

This document outlines a robust, step-by-step plan to implement the requested features across the database, backend services, and frontend UI.

## Phase 1: Database Schema & Seeding Updates
1. **App Settings Table**: Create a new `app_settings` table in `shared/schema.ts` to hold global configuration toggles.
   - Fields: `id`, `settingKey` (string, unique), `settingValue` (boolean/JSON), `updatedAt`, `updatedBy`.
   - Keys to include: `require_contract_admin_approval`, `require_event_approval`, `require_user_approval`.
2. **Tech Rider Schema**: Extend the `bookings` and `booking_proposals` tables (via `meta` JSONB or explicit columns) to capture:
   - `organizerProvidedEquipment` (List/Text)
   - `artistRequestedEquipment` (List/Text)
3. **SuperUser Seeding**: Create or update the database seed script (`server/seed.ts`) to programmatically insert a user with:
   - Username: `musicapp`
   - Password: `music app`
   - Role: `platform_admin`
4. **Migrations**: Generate and document the Drizzle ORM migrations for these schema changes.

## Phase 2: Negotiation Chat & Tech Rider Integration
1. **Workflow Service Update**: Update `server/services/workflow.ts` to support new action types or payload fields for the Tech Rider.
2. **UI Enhancements (`NegotiationFlow.tsx`)**:
   - Add a specific step/form in the negotiation UI for "Equipment & Gear".
   - Allow the Artist to input requested gear.
   - Allow the Organizer to list provided equipment.
3. **Chat Bubbles**: Create visual chat bubbles in the negotiation history specifically formatted for "Tech Rider Proposals" so both parties can clearly read the equipment agreements.
4. **Contract Sync**: Ensure the finalized equipment lists from the negotiation phase are accurately passed into the `generateContractFromSnapshot` utility.

## Phase 3: Full-Page Contract View
1. **Routing**: Add a new route in `App.tsx`: `<Route path="/contract/:id"><ContractPage /></Route>`.
2. **Component Migration**: 
   - Move the existing logic from `ContractViewer.tsx` (which is designed for a Sheet/Sidebar) into a new, spacious `ContractPage.tsx`.
   - Enhance the layout for readability, dividing it into distinct sections: Terms, Tech Rider, Financials, and Actions.
3. **Navigation Updates**: Change the "Start Contract" buttons in `ArtistBookings.tsx`, `OrganizerBookings.tsx`, and `VenueBookings.tsx` to use `navigate("/contract/${booking.id}")` instead of opening the side sheet.

## Phase 4: Strict Contract Edit Workflow
1. **Rule Engine Modification (`contract-utils.ts`)**:
   - Adjust the `LOCKED_FIELDS` to explicitly allow edits to: `eventDate`, `slotTime`, `accommodations`, `transportation`, and `hospitality` (beers/drinks).
2. **Sequential Turn Enforcement (`routes/contracts.ts`)**:
   - Hardcode the edit sequence: **Organizer First -> Artist Last**.
   - Ensure the database tracks `organizerEditUsed` and `artistEditUsed`.
3. **Walk-Away Logic**:
   - If the Organizer receives the Artist's modified contract, limit their UI options to **"Accept Changes"** or **"Walk Away"**.
   - If "Walk Away" is clicked, update the contract status to `voided` and booking status to `cancelled` with a clear system message.

## Phase 5: Legal Signing Process & PDF Generation
1. **Confirmation Dialog (`ContractPage.tsx`)**:
   - Intercept the "Sign Contract" button click with a `Dialog` popup.
   - Add a mandatory checkbox: *"I agree to abide by the terms of this contract and acknowledge that it is legally binding."*
   - Only enable the final "Confirm Signature" button when checked.
2. **PDF Watermarking (`routes/contracts.ts` or PDF Service)**:
   - Enhance the PDF generation logic.
   - At the bottom of the PDF, dynamically inject a visual **"Digitally Signed"** watermark/stamp under both the Artist and Organizer signature blocks.
   - Include the timestamp, IP address, and platform verified ID in the stamp.
3. **Admin Routing**: Ensure that upon the second signature, the contract status strictly transitions to `admin_review`.

## Phase 6: Admin Dashboard & Control Panel
1. **Admin Login**: Ensure `/admin` route is protected and accessible by the `musicapp` user.
2. **Global Control Panel (`AdminSettings.tsx`)**:
   - Build a UI tab in the Admin portal to toggle the values in the `app_settings` table.
   - Implement toggles for: "Require Admin Approval for Contracts", "Require Approval for Events", etc.
3. **Backend Toggle Logic**: Wrap the contract completion logic in `routes/contracts.ts`. If `require_contract_admin_approval` is toggled *off*, bypass `admin_review` and set the contract directly to `signed`/`confirmed`.
4. **Intervention Capabilities**: Ensure Admin tables (Users, Contracts, Bookings) have action dropdowns allowing the admin to override statuses (e.g., Force Approve, Force Cancel, Edit Details).

## Phase 7: Verification & Documentation
1. **Validation**: Test the entire flow from initial tech rider negotiation to admin PDF verification.
2. **Documentation**: Write down all new schema relationships, workflow states, and API endpoints in the `docs/` folder (or via automated skills).