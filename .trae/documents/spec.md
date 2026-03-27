# Contract UX & Signature Auto-Population Specification

## 1. Technical Scope
This specification defines the implementation of a mobile-first, full-page contract management experience. It includes auto-populating legal signature blocks from the database (with strict validation), rendering inline edit buttons within a raw text contract document, displaying a consolidated single-line progress tracker, and precisely formatting the financial breakdown.

## 2. Backend Implementation
### 2.1. Signature Data Validation (`server/services/contract.service.ts`)
- **Validation Check**: Before generating a contract in `generateContractFromSnapshot`, the system must assert that both the `artist` and `organizer` profiles have the following fields populated:
  - `legalName` (fallback to `name` if appropriate, though strict legal name is preferred)
  - `panNumber`
  - `permanentAddress`
- **Error Handling**: If any required field is missing, throw an error: `"DB Error: Missing required legal profile information (Legal Name, PAN, or Address). Please update your profile."`

### 2.2. Contract Text Generation (`server/contract-utils.ts`)
- **Pre-filling**: In `generateContractText`, dynamically inject the `Name:` and `Title:` fields using the validated database details.
- **Placeholders**: Replace the static `_________` lines for `Digital Signature`, `Date`, and `IP Address / Timestamp` with unique tokens:
  - `[[ARTIST_SIGNATURE]]`, `[[ARTIST_DATE]]`, `[[ARTIST_IP]]`
  - `[[PROMOTER_SIGNATURE]]`, `[[PROMOTER_DATE]]`, `[[PROMOTER_IP]]`

### 2.3. Signature Execution (`server/routes/contracts.ts`)
- **String Replacement**: In `POST /api/contracts/:id/sign`, after validating the signature, run a `.replace()` on the current `contract.contractText`.
- **Values**:
  - `[[..._SIGNATURE]]` -> The user's typed/drawn signature data.
  - `[[..._DATE]]` -> The current timestamp formatted as a readable date.
  - `[[..._IP]]` -> The user's IP address.
- **Persistence**: Save the modified `contractText` back to the database.

## 3. Frontend Implementation
### 3.1. Single-Line Status Tracker (`client/src/pages/contract/ContractPage.tsx`)
- Remove the existing grid of `PartyStatusCard` components.
- Implement a horizontal scrolling container (`overflow-x-auto whitespace-nowrap scrollbar-hide`).
- Render a unified string format:
  ```
  Artist (You) • Reviewed [Icon] • Edit Used [Icon] • Accepted [Icon] • Signed [Icon]  │  Promoter • Reviewed [Icon] • Edit Used [Icon] • Accepted [Icon] • Signed [Icon]
  ```
- Use conditional rendering for icons (e.g., green `CheckCircle` for complete, gray `Clock` or blank for pending).

### 3.2. Financial Breakdown Formatting
- Redesign the financial box to strictly match:
  ```
  Financial Breakdown
  Gross Booking Value        ₹0
  Platform Fee (%)          -₹0
  Net Payout                 ₹0
  ```
- The `Platform Fee (%)` label must dynamically include the actual percentage from `commissionBreakdown.artistCommissionPct` or `organizerCommissionPct`.
- The math must exactly match the values calculated and stored in the negotiation phase.

### 3.3. Full-Page Document with Inline Edits
- **Layout**: Remove the `max-h-[300px]` from the contract text viewer so it flows naturally down the page.
- **Parsing**: Create a React utility function that splits `contract.contractText` by the regex `/(?=\n\d+\.\s+[A-Z])/` to isolate clauses (e.g., "1. EVENT DETAILS", "2. TRAVEL").
- **Inline Buttons**: As the clauses are mapped to the UI, if a clause header matches an editable category (like "2. TRAVEL"), render a floating `Edit` button in the top-right corner of that specific text block.
- **Edit UI**: Clicking an inline edit button opens a mobile-friendly `Sheet` (Drawer) at the bottom of the screen containing *only* the inputs for that specific category, replacing the bulky, multi-accordion form.

### 3.4. Mobile UX Best Practices
- **Sticky Actions**: Move the "Accept", "Sign", and "Walk Away" buttons to a fixed bar at the bottom of the screen (`sticky bottom-0 bg-background/95 backdrop-blur border-t p-4`).
- **Touch Targets**: Ensure all buttons and inputs have a minimum height of `48px`.
- **Typography**: Ensure the contract font is legible on small screens (e.g., `text-sm` or `text-base` instead of `text-xs`).