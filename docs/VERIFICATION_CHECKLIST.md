# BANDWIDTH -- Manual E2E Verification Checklist

**Purpose**: Browser-based manual QA for the negotiation 4-step lock system and the contract 2-step sequential edit/signing system.

**Prerequisites**:
- Dev server running (`npm run dev`)
- At least one **artist** account, one **organizer** account, and one **admin** account (`musicapp`)
- An event created by the organizer with at least one stage defined
- Two separate browser sessions (or incognito) to simulate both parties

---

## 1. Negotiation Flow -- Happy Path (2-Step Agreement)

This tests the shortest negotiation: organizer proposes, artist accepts immediately.

- [ ] **Organizer creates event**: Log in as organizer, navigate to "Create Event", fill all required fields (title, date, venue, at least one stage), and submit. **Expected**: Event appears in organizer's event list with status "draft" or "published".
- [ ] **Artist applies to the event**: Log in as artist, navigate to "Find Gigs", locate the event, and click "Apply". Fill the application form (proposed fee, schedule preference, tech rider items). **Expected**: Application submitted toast appears; booking created with status "inquiry".
- [ ] **Organizer sees the application**: In organizer dashboard/bookings list, the new booking appears. Open the negotiation workspace for this booking. **Expected**: Step progress indicator shows step 0/4. The `stepState` badge reads "APPLIED". The action panel shows "Submit Initial Proposal" button (only `edit` action available).
- [ ] **Organizer submits initial proposal**: Click "Submit Initial Proposal". Fill in offer amount (INR), select a stage/time slot, and optionally add tech rider commitments. Add a note and submit. **Expected**: Toast "Proposal sent". Step indicator advances to step 1/4. Badge changes to "AWAITING ART". The terms board shows the proposed financial amount, schedule, and rider items.
- [ ] **Artist sees "Step 1 -- Your Turn"**: Switch to artist browser session. Open the negotiation workspace for this booking. **Expected**: Step progress indicator shows step 1/4. Badge reads "AWAITING ART". The action panel shows three buttons: "Accept Terms", "Propose Changes", and "Walk Away". The terms board displays the organizer's proposed amount, schedule, and rider items.
- [ ] **Artist clicks "Accept Terms"**: Click "Accept Terms". **Expected**: Toast "Terms accepted". Step state changes to "LOCKED". Badge reads "LOCKED". A green banner reads "Negotiation Complete -- Terms Locked". The "Proceed to Contract" button appears. Booking status is now "contracting".
- [ ] **Contract auto-generated**: Verify that a contract record was created by clicking "Proceed to Contract" or navigating to the contract page. **Expected**: Contract exists with status "sent", `editPhase` is "organizer_review", and a 48-hour deadline is set. Contract text contains the agreed fee, schedule, and rider terms.
- [ ] **Both parties see agreed terms**: Both organizer and artist sessions show the "Agreed Terms" panel with the locked snapshot (financial, schedule, tech rider). No action buttons remain except "Proceed to Contract".

---

## 2. Negotiation Flow -- Full 4-Step Exchange

This tests the maximum negotiation depth before the system forces a final decision.

- [ ] **Step 0 -- Artist applies**: Artist applies to an organizer's event. **Expected**: Booking created. Negotiation workspace shows step 0/4, badge "APPLIED", organizer's turn.
- [ ] **Step 1 -- Organizer submits proposal**: Organizer opens negotiation workspace and clicks "Submit Initial Proposal". Enters fee of INR 50,000, selects a stage, submits. **Expected**: Step advances to 1/4. Badge "AWAITING ART". Artist's turn.
- [ ] **Step 2 -- Artist proposes changes**: Artist opens negotiation workspace. Clicks "Propose Changes". Modifies fee to INR 65,000. Optionally adjusts schedule or rider items. Adds a note explaining the change. Submits. **Expected**: Toast "Proposal sent". Step advances to 2/4. Badge "AWAITING ORG". Organizer's turn. The offer history section shows both proposals with amounts (INR 50,000 then INR 65,000, the latter tagged "current").
- [ ] **Step 3 -- Organizer makes final edit**: Organizer opens negotiation workspace. The terms board shows the artist's counter of INR 65,000. Organizer clicks "Propose Changes". Adjusts fee to INR 58,000. Submits. **Expected**: Step advances to 3/4. Badge "AWAITING ART". Artist's turn. Offer history shows all three proposals.
- [ ] **Step 4 -- Artist sees "Final Decision" with no edit button**: Artist opens negotiation workspace. **Expected**: Step indicator shows 3/4 (step 3 completed, awaiting step 4 action). The action panel shows **only** "Accept Terms" and "Walk Away" buttons. The "Propose Changes" button is **not present** (server returns `availableActions: ["accept", "walkaway"]` at step >= 3 for artist). The terms board shows the organizer's final offer of INR 58,000.
- [ ] **Artist accepts at step 4**: Artist clicks "Accept Terms". **Expected**: Negotiation locks. Badge "LOCKED". Green banner "Negotiation Complete -- Terms Locked". Contract auto-generated. Booking status transitions to "contracting".
- [ ] **Offer history preserved**: Both parties can see the full offer history in the terms board: step 1 (organizer INR 50,000), step 2 (artist INR 65,000), step 3 (organizer INR 58,000), step 4 (accepted at INR 58,000).

---

## 3. Walk Away

- [ ] **Start a negotiation**: Follow steps 0 and 1 from section 2 so the organizer has submitted an initial proposal and it is the artist's turn.
- [ ] **Artist clicks "Walk Away"**: In the artist's negotiation workspace, click the "Walk Away" button (red text, bottom of action panel). **Expected**: A confirmation dialog appears with title "Walk away from this negotiation?" and description warning that this is permanent and irreversible.
- [ ] **Artist confirms walk-away**: Click "Walk Away" in the confirmation dialog. **Expected**: Toast "Walked away". The negotiation workspace closes (via `onClose` callback).
- [ ] **Both see "Walked Away" status**: Re-open the booking in both sessions. **Expected**: Badge reads "WALKED AWAY" (destructive variant). A red banner shows "Negotiation ended -- Artist walked away." The action panel has no buttons. No "Propose Changes" or "Accept" buttons visible.
- [ ] **Booking status is cancelled**: Check the booking record (via admin panel or booking list). **Expected**: Booking status is "cancelled". The `meta.negotiation.status` is "walked_away". Activity log contains a "walked_away" entry with the artist's role.
- [ ] **Organizer walk-away**: Repeat the test but this time have the organizer walk away at step 2 (after artist's counter-proposal). **Expected**: Same terminal state. Banner reads "Negotiation ended -- Organizer walked away."

---

## 4. Deadline Enforcement

- [ ] **72-hour countdown display**: Start a negotiation and have the organizer submit a proposal. Open the artist's negotiation workspace. **Expected**: A badge in the header area shows a countdown in the format "XXh XXm remaining" with a clock icon. The time is approximately 72 hours from the proposal submission.
- [ ] **Countdown updates**: Wait at least 1 minute (or verify the `setInterval` runs every 60 seconds). **Expected**: The countdown badge updates to reflect the elapsed minute.
- [ ] **No countdown in terminal states**: Lock a negotiation (accept terms). **Expected**: No countdown badge is visible. The `timeLeft` is empty for locked/walked_away/expired states.
- [ ] **Expired deadline blocks action (manual DB test)**: Use a database tool to set `bookings.flow_deadline_at` to a past timestamp for an active negotiation. Then attempt to submit a proposal from the appropriate party's session. **Expected**: Server returns error "Booking flow 72-hour deadline has passed". The booking is automatically moved to cancelled status via `bookingService.expireBookingFlow`.
- [ ] **Step deadline shown as "Expired"**: After setting the deadline to the past, reload the negotiation workspace. **Expected**: The countdown badge shows "Expired" in a destructive (red) variant. The `isExpiredLocal` flag triggers UI to show the expired state.
- [ ] **Server-side step deadline validation**: Attempt any action (edit/accept/walkaway) after the `stepDeadlineAt` has passed. **Expected**: Server responds with error "Step deadline has expired" from `validateStepTransition`.

---

## 5. Contract Review -- Organizer First

This tests the sequential review system where the organizer reviews the contract before the artist.

- [ ] **Navigate to contract after negotiation agreement**: Complete a negotiation (any path from sections 1 or 2). Click "Proceed to Contract" or navigate to `/contract/<id>`. **Expected**: Contract page loads. Contract status is "sent". The `editPhase` field is "organizer_review".
- [ ] **Organizer sees review phase indicator**: Log in as organizer and open the contract. **Expected**: The UI indicates the current phase is "Organizer Review". The organizer has available actions.
- [ ] **Artist sees "Waiting" message**: Log in as artist and open the same contract. **Expected**: The response includes `userCanEdit: false` (since organizer hasn't reviewed yet). The `promoterReviewDoneAt` is null. If the artist attempts to POST to `/api/contracts/:id/review`, the server returns 400 with message "Organizer must review the contract first."
- [ ] **Organizer accepts as-is**: Organizer clicks "Accept As-Is" (sends `POST /api/contracts/:id/review` with `{ action: "ACCEPT_AS_IS" }`). **Expected**: Server responds with success. `promoterReviewDoneAt` is set. `editPhase` advances to "artist_review". A system message "Promoter has accepted the contract as-is" appears in the contract conversation. Audit log entry created with action "contract_reviewed_accepted".
- [ ] **Organizer proposes edits (alternative path)**: Instead of accepting as-is, organizer clicks "Propose Edits" with changes to accommodation (e.g., `hotelStarRating: 4`, `roomType: "double"`) and hospitality (e.g., `guestListCount: 5`). **Expected**: Server validates changes, creates a new contract version (v2), applies changes directly, marks `promoterEditUsed: true`, sets `promoterReviewDoneAt`, advances `editPhase` to "artist_review". System message reads "Promoter has made edits to the contract (v2). Changes applied immediately."
- [ ] **Organizer cannot edit twice**: After the organizer has already used their edit, attempt another review action. **Expected**: Server returns 400 "You have already completed your review". The `promoterReviewDoneAt` is already set.
- [ ] **Locked fields rejected**: Organizer attempts to modify a locked field (e.g., includes `fee` or `currency` in changes). **Expected**: Server returns 400 with error 'Field "fee" is a core negotiated term and cannot be modified'.

---

## 6. Contract Review -- Artist Second

- [ ] **Artist sees editable contract**: After organizer completes their review, artist opens the contract. **Expected**: `editPhase` is "artist_review". The response includes `userCanEdit: true` (assuming artist hasn't edited yet). The artist can see the latest contract version including any organizer edits.
- [ ] **Locked fields shown as read-only**: Verify that the contract display clearly separates locked terms (fee, currency, artist name, organizer name, venue, performance duration, platform commission) from editable sections (accommodation, hospitality, travel, technical, branding, content rights, cancellation).
- [ ] **Artist proposes technical changes**: Artist submits edits to technical fields (e.g., `soundCheckDuration: 60`, `backlineProvided: ["guitar amp", "drum kit"]`). **Expected**: New contract version created (v3 if organizer also edited, v2 otherwise). `artistEditUsed: true`. `artistReviewDoneAt` set. `editPhase` advances to "ready_to_sign". System message confirms edits applied.
- [ ] **Artist accepts as-is (alternative)**: Artist clicks "Accept As-Is" instead of editing. **Expected**: `artistReviewDoneAt` set. `editPhase` advances to "ready_to_sign". No new version created. System message "Artist has accepted the contract as-is."
- [ ] **Both reviews complete -- signing UI appears**: After both parties have completed their review, the contract is in "ready_to_sign" phase. **Expected**: Both parties can now proceed to the accept/sign flow. The contract page shows signing controls (accept checkbox, signature input).

---

## 7. Contract Signing

The signing flow requires: review done, then accept (EULA), then sign.

- [ ] **Organizer accepts contract terms (EULA)**: Organizer sends `POST /api/contracts/:id/accept` with `{ agreed: true }`. **Expected**: `promoterAcceptedAt` is set. Server responds "Contract accepted. You may now proceed to sign." Audit log entry "contract_accepted_eula".
- [ ] **Organizer signs**: Organizer sends `POST /api/contracts/:id/sign` with `{ signatureData: "Jane Doe", signatureMethod: "type" }`. **Expected**: `signedByPromoter: true`. `promoterSignedAt` set. `promoterSignatureIp` recorded. Contract text updated with signature replacing `[[PROMOTER_SIGNATURE]]`, `[[PROMOTER_DATE]]`, `[[PROMOTER_IP]]` placeholders. A contract signature record created in `contractSignatures` table. System message "Promoter has signed the contract. Waiting for the other party."
- [ ] **Artist must accept before signing**: Artist attempts to sign without first accepting. **Expected**: Server returns 400 "You must accept the contract terms before signing".
- [ ] **Artist accepts then signs**: Artist accepts (`POST /accept` with `{ agreed: true }`), then signs (`POST /sign`). **Expected**: `signedByArtist: true`. `artistSignedAt` set. Contract fully executed.
- [ ] **Both signed -- admin review**: If `require_contract_admin_approval` setting is true (default), the contract status changes to "admin_review" after both parties sign. **Expected**: `contract.status === "admin_review"`. `signedAt` timestamp set. System message "Both parties have signed! The contract is now under final review by the platform admin."
- [ ] **Both signed -- direct finalization**: If `require_contract_admin_approval` is false, contract status changes to "signed" immediately. **Expected**: `contract.status === "signed"`. `finalizedAt` set. Booking status transitions to "confirmed". System message "Both parties have signed! The contract is now fully executed and the booking is confirmed."
- [ ] **PDF watermark**: Once the contract is fully signed and finalized, verify the generated PDF (if applicable) contains a "Digitally Signed" watermark.

---

## 8. Contract Walk Away

Walk-away during the contract phase is currently supported through the legacy edit-request respond endpoint (organizer rejects artist edits with `responseNote: "WALKAWAY"`). There is no standalone "walk away" button during the review phase itself -- walking away is implicit through letting the deadline expire or through the edit-request rejection flow.

- [ ] **Deadline expiry voids contract**: Set a contract's `deadline_at` to a past timestamp (manual DB edit). Trigger the deadline check (`POST /api/contracts/check-deadlines`). **Expected**: Contract status changes to "voided". Booking status changes to "cancelled" with `cancelReason: "contract_deadline_expired"`. System message "Contract voided: not signed within 48 hours. Booking cancelled automatically."
- [ ] **Organizer walks away via edit-request rejection (legacy flow)**: If an artist submitted an edit request in the legacy "pending" approval flow, the organizer can reject it with `responseNote: "WALKAWAY"`. **Expected**: Edit request status set to "rejected". Contract status set to "voided". Booking status set to "cancelled" with `cancelReason: "organizer_walkaway"`. System message "Organizer rejected the Artist's final edits and chose to walk away. The booking is cancelled."
- [ ] **Voided contract blocks further action**: After a contract is voided, attempt to review, accept, or sign it. **Expected**: All endpoints return 400 with message "Contract has been voided".
- [ ] **Booking reflects cancellation**: After contract void, verify the booking status is "cancelled" in both the admin panel and the party dashboards.

---

## 9. Edge Cases

### Turn Enforcement

- [ ] **Organizer tries to act on artist's turn (negotiation)**: During a negotiation where `stepState` is "awaiting_art", have the organizer attempt to submit a proposal (`POST /api/bookings/:id/negotiation/action` with `action: "edit"`). **Expected**: Server returns error "It is the artist's turn to respond".
- [ ] **Artist tries to act on organizer's turn (negotiation)**: During `stepState: "awaiting_org"`, artist attempts any action. **Expected**: Server returns error "It is the organizer's turn to respond".
- [ ] **Artist tries to act at step 0**: Before the organizer has submitted the first proposal, artist attempts an action. **Expected**: Server returns "Organizer must submit the first proposal".

### Step Limits

- [ ] **Artist cannot edit at final step**: At step 3 with `stepState: "awaiting_art"`, artist attempts `action: "edit"`. **Expected**: Server returns "Maximum negotiation steps reached. You can only accept or walk away." The UI should only show "Accept Terms" and "Walk Away" buttons (no "Propose Changes").
- [ ] **No action after lock**: After negotiation is locked, any party attempts an action. **Expected**: Server returns "Negotiation is finalized, no further actions allowed".
- [ ] **No action after walk-away**: After someone walks away, any party attempts an action. **Expected**: Same error as above.

### Contract Sequential Review

- [ ] **Artist tries to review before organizer**: Artist sends `POST /api/contracts/:id/review` before the organizer has completed their review. **Expected**: Server returns 400 "Organizer must review the contract first."
- [ ] **Party tries to edit twice (contract)**: Organizer (or artist) who has already used their one-time edit tries to submit another edit. **Expected**: Server returns 400 "You have already used your one-time edit opportunity".
- [ ] **Party tries to review twice (contract)**: A party who has already completed their review attempts another review. **Expected**: Server returns 400 "You have already completed your review".

### Signing Guards

- [ ] **Sign without accept**: Attempt to sign without first accepting. **Expected**: Server returns 400 "You must accept the contract terms before signing".
- [ ] **Sign twice**: A party who has already signed attempts to sign again. **Expected**: Server returns 400 "You have already signed this contract".
- [ ] **Accept or sign while edit pending (legacy)**: Attempt to accept or sign while a legacy edit request is in "pending" status. **Expected**: Server returns 400 "Cannot accept while edit requests are pending" or "Cannot sign while edit requests are pending".

### Concurrency and Idempotency

- [ ] **Double-click on action button (negotiation)**: Rapidly click "Accept Terms" or "Submit Proposal" twice. **Expected**: The `actionMutation.isPending` flag disables the button after the first click (`disabled={actionMutation.isPending}`). Only one proposal/acceptance is recorded. No duplicate entries in `bookingProposals`.
- [ ] **Refresh page mid-negotiation**: Submit a proposal, then immediately refresh the browser. **Expected**: The negotiation workspace reloads with the correct step, badge, and terms board. State is fully persisted in the database (`booking.meta.negotiation.*` and `bookingProposals` table). The 5-second auto-refetch (`refetchInterval: 5000`) also ensures fresh data.
- [ ] **Concurrent access from two browsers**: Open the same negotiation in two tabs for the same user. Submit a proposal from tab 1. Switch to tab 2 (which still shows the pre-submission state). Attempt to submit again from tab 2. **Expected**: The server validates step transitions and rejects the stale action because `currentStep` has already advanced. Error message indicates the step mismatch.
- [ ] **Contract initiation idempotency**: Call `POST /api/bookings/:bookingId/contract/initiate` twice for the same booking. **Expected**: The second call returns the existing contract with message "Contract already initiated" rather than creating a duplicate.

### Validation

- [ ] **Invalid contract changes rejected**: Submit contract edits with invalid data (e.g., `soundCheckDuration: 999`, `paymentMilestones` that don't sum to 100%). **Expected**: Server returns 400 with specific validation errors from `validateContractChanges`.
- [ ] **Empty changes rejected**: Submit `PROPOSE_EDITS` with an empty changes object `{}`. **Expected**: Server returns 400 "Changes are required for edit proposals".

---

## 10. Admin Verification

- [ ] **Admin views all bookings in negotiation**: Log in as admin (`musicapp`). Navigate to `/admin`. Open the bookings section. Filter or browse for bookings with status "negotiating". **Expected**: All active negotiations are listed with booking ID, artist name, event title, and current status.
- [ ] **Admin views contracts pending review**: Navigate to the admin contracts section. Check the "pending" contracts list (calls `GET /api/admin/contracts/pending`). **Expected**: Contracts with status "admin_review" appear in the list (these are contracts where both parties have signed and admin approval is required).
- [ ] **Admin approves a signed contract**: Select a contract in "admin_review" status. Click "Approve" (sends `POST /api/admin/contracts/:id/review` with `{ status: "approved" }`). **Expected**: Contract status changes to "signed". `finalizedAt` is set. Associated booking status transitions to "confirmed". Audit log entry "admin_contract_review" with `context.status: "approved"`. Both parties receive a notification via the "contract.admin_approved" domain event.
- [ ] **Admin rejects a signed contract**: Select a contract in "admin_review" status. Click "Reject" with a note. **Expected**: Contract status updated according to the `storage.reviewContract` logic. Audit log created. Both parties notified.
- [ ] **Admin views all contracts**: Navigate to `/admin` contracts list (calls `GET /api/admin/contracts`). Optionally filter by status. **Expected**: Full list of contracts with ID, booking reference, status, and signing deadline.
- [ ] **Admin views individual contract details**: Click on a contract (calls `GET /api/admin/contracts/:id`). **Expected**: Full contract details including text, versions, edit requests, signatures, and related booking information.
- [ ] **Admin updates contract fields**: Use the admin PATCH endpoint (`PATCH /api/admin/contracts/:id`). **Expected**: Fields updated successfully. Audit log entry "admin_contract_updated" with the modified field names.

---

## Quick Reference: Status Values

| System        | Field                        | Key Values                                                                                                 |
| ------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Negotiation   | `stepState`                  | `applied`, `awaiting_org`, `awaiting_art`, `locked`, `walked_away`, `expired`                              |
| Negotiation   | `availableActions`           | `["edit"]` (step 0), `["edit","accept","walkaway"]` (steps 1-3), `["accept","walkaway"]` (step 4, artist)  |
| Negotiation   | `whoseTurn`                  | `"artist"`, `"organizer"`, or `null` (terminal)                                                            |
| Booking       | `status`                     | `inquiry` > `offered` > `negotiating` > `contracting` > `confirmed` > ...                                  |
| Contract      | `status`                     | `draft` > `sent` > `admin_review` > `signed` > `completed` / `voided`                                     |
| Contract      | `editPhase`                  | `organizer_review` > `artist_review` > `ready_to_sign`                                                     |
| Review action | body `action`                | `"ACCEPT_AS_IS"` or `"PROPOSE_EDITS"`                                                                     |

## Quick Reference: Key API Endpoints

| Action                    | Method | Path                                                  |
| ------------------------- | ------ | ----------------------------------------------------- |
| Negotiation summary       | GET    | `/api/bookings/:id/negotiation/summary`               |
| Negotiation action        | POST   | `/api/bookings/:id/negotiation/action`                |
| Initiate contract         | POST   | `/api/bookings/:bookingId/contract/initiate`          |
| Get contract              | GET    | `/api/bookings/:bookingId/contract`                   |
| Review contract           | POST   | `/api/contracts/:id/review`                           |
| Accept contract (EULA)    | POST   | `/api/contracts/:id/accept`                           |
| Sign contract             | POST   | `/api/contracts/:id/sign`                             |
| Check deadlines           | POST   | `/api/contracts/check-deadlines`                      |
| Admin pending contracts   | GET    | `/api/admin/contracts/pending`                        |
| Admin review contract     | POST   | `/api/admin/contracts/:id/review`                     |
