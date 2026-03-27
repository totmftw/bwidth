# Implementation Tasks

## Phase 1: Backend Signature Auto-Population
- [ ] **Task 1.1**: Open `server/services/contract.service.ts`.
- [ ] **Task 1.2**: In `generateContractFromSnapshot`, add validation for `legalName` (or `name`), `panNumber`, and `permanentAddress` for both Artist and Organizer.
- [ ] **Task 1.3**: Throw an explicit DB Error if validation fails.
- [ ] **Task 1.4**: Open `server/contract-utils.ts`.
- [ ] **Task 1.5**: In `generateContractText`, update the signature blocks to use `[[ARTIST_SIGNATURE]]`, `[[ARTIST_DATE]]`, `[[ARTIST_IP]]` and equivalent Promoter tokens instead of underscores.
- [ ] **Task 1.6**: Open `server/routes/contracts.ts`.
- [ ] **Task 1.7**: In the `/contracts/:id/sign` route, implement string replacement on `contract.contractText` using the captured signature data, current date, and IP address. Save the updated text.

## Phase 2: Frontend Single-Line Tracker & Financials
- [ ] **Task 2.1**: Open `client/src/pages/contract/ContractPage.tsx`.
- [ ] **Task 2.2**: Remove `PartyStatusCard` component calls.
- [ ] **Task 2.3**: Build a horizontally scrolling single-line tracker formatted as: `Artist (You) • Reviewed ✓ ... │ Promoter • Reviewed ✓ ...`.
- [ ] **Task 2.4**: Update the "Financial Breakdown" block to precisely match the requested format (`Gross Booking Value`, `Platform Fee (%)`, `Net Payout`).

## Phase 3: Frontend Full-Page Document & Inline Edits
- [ ] **Task 3.1**: In `ContractPage.tsx`, remove the `max-h-[300px]` from the contract document container.
- [ ] **Task 3.2**: Create a text parser that splits `contract.contractText` into sections using `/(?=\n\d+\.\s+[A-Z])/`.
- [ ] **Task 3.3**: Map over the parsed sections to render them.
- [ ] **Task 3.4**: For editable sections (Schedule, Travel, Accommodation, Technical, Hospitality), render an inline "Edit" button floated to the top right of the section.
- [ ] **Task 3.5**: Wire the inline "Edit" buttons to open a mobile-friendly Sheet/Dialog containing only the relevant form inputs. Remove the old multi-accordion edit form.

## Phase 4: Mobile UX Enhancements
- [ ] **Task 4.1**: In `ContractPage.tsx`, ensure the main action buttons (Accept, Sign, Walk Away) are moved to a `sticky bottom-0` fixed action bar.
- [ ] **Task 4.2**: Verify all buttons and inputs have large touch targets (min-height 48px).
- [ ] **Task 4.3**: Increase contract document typography size to `text-sm` for better readability on small screens.

## Phase 5: Code Quality & Documentation
- [ ] **Task 5.1**: Run Global Skill: `Code Quality Analyzer`.
- [ ] **Task 5.2**: Run Global Skill: `Data Flow Validation`.
- [ ] **Task 5.3**: Run Global Skill: `Auto Documentation Generator`.
- [ ] **Task 5.4**: Run Global Skill: `ts-api-doc-sync`.
- [ ] **Task 5.5**: Run Global Skill: `sync-master-docs`.