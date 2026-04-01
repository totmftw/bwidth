# Contract Generation Modifications Plan

## Summary
The goal of this task is to update the contract generation logic to reflect the platform as a broker, correctly display exact commissions, fix the 85% platform fee calculation bug, enhance event details with time slot and duration, use the app's bank details instead of the artist's, and improve the technical rider fallback logic.

## Current State Analysis
1. **Commission Calculation Bug**: `commissionPolicy.service.ts` uses `artistPct` (e.g., 85%) directly as the commission amount deducted, instead of the payout percentage. This results in an 85% platform fee for the artist.
2. **Parties**: The contract only lists 2 parties (Organizer and Artist). The platform is not explicitly mentioned as a broker/middleman.
3. **Event Details**: Time slot is missing from the main Event Details section. The duration is hardcoded to '60 to 90-minute' instead of being calculated dynamically from `startsAt` and `endsAt`.
4. **Bank Details**: The contract currently pulls the artist's personal bank details (`booking.artist.user.bankAccountNumber`) for the deposit/balance payments.
5. **Technical Rider**: The contract pulls from the negotiation snapshot but does not properly fall back to the artist's profile `technicalRider` (stored in `artist.metadata`) if the negotiation rider is empty.

## Proposed Changes

### 1. Fix Commission Calculation Logic
**File:** `server/services/commissionPolicy.service.ts`
- **What**: Fix the math where `artistPct` is treated as the platform deduction.
- **How**: 
  - Change `const artistCommissionAmount = agreedFee * artistPct;` to `const artistCommissionRate = 1 - artistPct; const artistCommissionAmount = agreedFee * artistCommissionRate;`
  - Update the returned `artistCommissionPct` to be `artistCommissionRate * 100`.
- **Why**: `artistPct` in the database (e.g., 85.00) represents the percentage the artist keeps. The platform fee is the remainder (15%).

### 2. Fetch App Settings for Bank Details & Name
**File:** `server/services/contract.service.ts`
- **What**: Query `appSettings` to get the platform's bank details and app name.
- **How**: 
  - Add a query to fetch `app_name` and `platform_bank_details` from the `appSettings` table.
  - Inject `appSettings` and `commissionBreakdown` into the `bookingForContract` payload passed to `generateContractText`.
- **Why**: Required to redirect payments to the platform's escrow account instead of directly to the artist.

### 3. Update Contract Text Generation
**File:** `server/contract-utils.ts`
- **What**: Modify the `BookingForContract` interface and update the `generateContractText` template.
- **How**:
  - **Interface**: Add `appSettings`, `commissionBreakdown`, and `artist.metadata` to `BookingForContract`.
  - **Time Slot & Duration**: Update `buildTermsFromBooking` to calculate `performanceDuration` in minutes if `startsAt` and `endsAt` exist in `negotiationSnapshot.schedule`. Update `generateContractText` to display the derived time slot and calculated duration.
  - **Parties**: Add a third party to the contract template: `[App Name], acting as the "Broker/Middleman"...`.
  - **Event Details & Commissions**: Explicitly list the Broker Commissions (Organizer Platform Fee and Artist Commission) with exact amounts derived from the injected `commissionBreakdown`.
  - **Payment Terms**: Replace the artist's bank variables with the injected `appSettings.bankDetails`. Adjust the payment amounts to reflect the total amount payable by the organizer (Agreed Fee + Organizer Fee).
  - **Technical Rider**: If `t.technical.backlineProvided` is empty, fallback to `booking.artist?.metadata?.technicalRider` or `equipmentRequirements`.
- **Why**: This aligns the legal contract with the platform's double-sided monetization model, escrow requirements, and precise negotiation data.

## Verification Steps
1. Run a test booking flow to verify that the contract generated includes 3 parties.
2. Check that the commission amounts displayed in the contract correctly show ~15% for the artist and the expected amount for the organizer.
3. Verify that the bank details section outputs the platform's escrow bank details.
4. Verify that the performance duration calculates correctly (e.g., "90 Minutes") if `startsAt` and `endsAt` are provided in the negotiation snapshot.
5. Verify that the tech rider section properly falls back to the artist's profile text if not explicitly negotiated.