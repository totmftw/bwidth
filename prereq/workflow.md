<aside>
📊

**Purpose:** This document contains extremely detailed workflow logic flowcharts for every major process in the music artist management platform. Each flowchart includes decision points, validation checks, error handling, and system actions.

</aside>

---

## 1️⃣ Artist Registration & Onboarding Flow

```
[START: Artist Registration]
    |
    v
[User lands on platform] → [Clicks "Sign Up as Artist"]
    |
    v
[Enter basic details]
├─ Email
├─ Phone number
├─ Artist name
└─ Password
    |
    v
{Email already exists?}
    ├─ YES → [Show error] → [Offer login] → [END]
    └─ NO → Continue
        |
        v
[Send verification email/SMS]
    |
    v
[User verifies account]
    |
    v
{Verification successful?}
    ├─ NO → [Resend option] → [Max 3 attempts] → [Manual review] → [END]
    └─ YES → Continue
        |
        v
[Profile Setup - Step 1: Basic Info]
├─ Upload profile photo
├─ Write bio (max 500 words)
├─ Select primary genre
├─ Select secondary genres (up to 3)
├─ Years of experience
└─ Location/city
    |
    v
{All required fields completed?}
    ├─ NO → [Show validation errors] → [Return to form]
    └─ YES → Continue
        |
        v
[Profile Setup - Step 2: Budget & Pricing]
├─ Minimum booking fee
├─ Standard booking fee
├─ Premium booking fee
└─ Currency preference
    |
    v
{Budget range validation}
    ├─ Out of market range? → [Show warning] → [Confirm or adjust]
    └─ Valid → Continue
        |
        v
[Profile Setup - Step 3: Portfolio]
├─ Upload past performance photos (3-10)
├─ Add SoundCloud link
├─ Add MixCloud link
├─ Add Instagram handle
├─ Add other social links
└─ List major achievements (optional)
    |
    v
[Profile Setup - Step 4: Technical Requirements]
├─ Upload technical rider (PDF/DOC)
├─ Equipment requirements checklist
├─ Special requests
└─ Performance duration preferences
    |
    v
[Profile Setup - Step 5: Legal Documents]
├─ Upload PAN card
├─ Upload Aadhar card
├─ Bank account details
├─ IFSC code
├─ Account holder name
└─ GST number (if applicable)
    |
    v
{Document validation}
    ├─ Documents missing/invalid? → [Show errors] → [Request reupload]
    └─ All valid → Continue
        |
        v
[Submit for Admin Review]
    |
    v
[System creates profile with "Pending Review" status]
    |
    v
[Send confirmation email]
    |
    v
[Admin Review Queue]
    |
    v
{Manual review by admin}
    ├─ REJECT → [Email artist with reasons] → [Allow resubmission] → [Return to Step 5]
    └─ APPROVE → Continue
        |
        v
[Profile status = "Active"]
    |
    v
[Initialize Trust Score = 50/100]
    |
    v
[Send welcome email with platform guide]
    |
    v
[Artist Dashboard Access Granted]
    |
    v
[END: Artist Onboarded]
```

---

## 2️⃣ Artist Gig Discovery & Application Flow

```
[START: Artist logs into dashboard]
    |
    v
[Dashboard displays]
├─ Current bookings count
├─ Total earnings this month
├─ Calendar view
├─ Pending requests
└─ Trust score
    |
    v
[Artist clicks "Find Gigs"]
    |
    v
[System loads available opportunities]
    |
    v
[Apply filters automatically based on artist profile]
├─ Artist's budget range (e.g., ₹10,000-₹20,000)
├─ Artist's primary genre
├─ Artist's location (within 500km initially)
└─ Dates when artist is available
    |
    v
{Any matching opportunities?}
    ├─ NO → [Display "No gigs available in your range"]
    │        |
    │        v
    │   [Suggest]
    │   ├─ Adjust budget expectations
    │   ├─ Expand genre preferences
    │   └─ Check back later
    │        |
    │        v
    │   [END]
    │
    └─ YES → Continue
        |
        v
[Display list of opportunities]
For each opportunity show:
├─ Venue name (or "Premium Venue")
├─ Date
├─ Budget range
├─ Slot type (opening/mid/closing)
├─ Genre match %
└─ "Apply Now" button
    |
    v
[Artist selects opportunity]
    |
    v
[Display full opportunity details]
├─ Venue location
├─ Capacity
├─ Event type
├─ Performance duration required
├─ Budget offered
├─ Slot timing
└─ Special requirements
    |
    v
{Artist wants to apply?}
    ├─ NO → [Return to list]
    └─ YES → Continue
        |
        v
{Check artist application limits}
[Based on trust score and experience level]
    |
    v
{Has artist reached application limit?}
[New artist (score <60): Max 5 pending applications]
[Regular (score 60-80): Max 10 pending]
[Trusted (score >80): Max 20 pending]
    |
    ├─ YES → [Show error message]
    │        |
    │        v
    │   ["You've reached your application limit"]
    │   ["Wait for responses or withdraw applications"]
    │        |
    │        v
    │   [END]
    │
    └─ NO → Continue
        |
        v
[Show application form]
├─ Confirm availability for this date
├─ Proposed fee (pre-filled from profile)
├─ Willing to negotiate? (Yes/No)
├─ Add personalized message (max 200 chars)
└─ Confirm slot time preference
    |
    v
{Artist submits application}
    |
    v
[System validations]
├─ Check date conflict with existing bookings
├─ Verify budget alignment
├─ Check artist's past cancellation rate
└─ Verify artist documents are current
    |
    v
{Any validation failures?}
    ├─ YES → [Show specific errors] → [Allow correction] → [Resubmit]
    └─ NO → Continue
        |
        v
[Create application record]
├─ Status = "Pending Review"
├─ Timestamp
├─ Application ID
└─ Link to opportunity
    |
    v
[Notify organizer/venue]
├─ Email notification
├─ In-app notification
└─ SMS (if enabled)
    |
    v
[Update artist's pending applications count]
    |
    v
[Show confirmation to artist]
"Application submitted successfully!"
"You'll hear back within 48 hours"
    |
    v
[START TIMEOUT TIMER: 48 hours]
    |
    v
[Artist returns to dashboard]
    |
    v
[Application appears in "Pending" section]
    |
    v
<<Wait for organizer response>>
    |
    v
{Response received OR timeout?}
    |
    ├─ TIMEOUT (48 hours) → [Auto-decline application]
    │                        |
    │                        v
    │                  [Notify artist]
    │                  [Free up application slot]
    │                        |
    │                        v
    │                  [END]
    │
    ├─ DECLINED → [Notify artist with reason (if provided)]
    │             |
    │             v
    │        [Free up application slot]
    │        [Update artist's application history]
    │             |
    │             v
    │        [END]
    │
    └─ ACCEPTED/COUNTER-OFFER → [Go to NEGOTIATION FLOW]
        |
        v
[CONTINUE TO SECTION 3: Negotiation Flow]
```

---

## 3️⃣ Booking Negotiation Flow

```
[START: Organizer responds to application]
    |
    v
{Organizer response type?}
    |
    ├─ DIRECT ACCEPT (no changes)
    │   |
    │   v
    │   [Skip negotiation]
    │   [Go directly to CONTRACT GENERATION]
    │   |
    │   v
    │   [END - Continue to Section 4]
    │
    └─ COUNTER-OFFER (changes requested)
        |
        v
[Create negotiation thread]
├─ Negotiation ID
├─ Round counter = 1
├─ Max rounds = 3
└─ Timeout per round = 24 hours
    |
    v
[Organizer counter-offer details]
├─ Adjusted budget (if different)
├─ Adjusted slot time (if different)
├─ Adjusted date (rarely allowed)
├─ Performance duration change
└─ Message/reason for changes
    |
    v
[Notify artist of counter-offer]
├─ Email notification
├─ Push notification
└─ SMS alert
    |
    v
[START TIMEOUT: 24 hours for artist response]
    |
    v
[Artist views counter-offer]
    |
    v
[Display comparison table]
┌────────────────┬──────────────┬────────────────┐
│ Parameter      │ Your Offer   │ Counter-Offer  │
├────────────────┼──────────────┼────────────────┤
│ Fee            │ ₹X           │ ₹Y             │
│ Date           │ DD/MM        │ DD/MM          │
│ Slot           │ Opening      │ Mid            │
│ Duration       │ 90 min       │ 60 min         │
└────────────────┴──────────────┴────────────────┘
    |
    v
[Artist has 3 options]
    |
    ├─── [1. ACCEPT COUNTER-OFFER]
    │       |
    │       v
    │   {Validate acceptance}
    │       |
    │       v
    │   [Close negotiation]
    │   [Status = "Accepted"]
    │       |
    │       v
    │   [Go to CONTRACT GENERATION]
    │       |
    │       v
    │   [END - Continue to Section 4]
    │
    ├─── [2. DECLINE & WITHDRAW]
    │       |
    │       v
    │   [Optional: Add reason]
    │       |
    │       v
    │   [Close negotiation]
    │   [Status = "Declined by Artist"]
    │       |
    │       v
    │   [Notify organizer]
    │   [Free up artist's application slot]
    │   [Update statistics]
    │       |
    │       v
    │   [END]
    │
    └─── [3. MAKE COUNTER-COUNTER-OFFER]
            |
            v
        {Check negotiation round}
        [Current round counter]
            |
            v
        {Round >= 3?}
            |
            ├─ YES → ["Maximum negotiation rounds reached"]
            │        ["You must either Accept or Decline"]
            │        |
            │        v
            │   [Force choice: Accept or Decline]
            │        |
            │        v
            │   [Go to option 1 or 2 above]
            │
            └─ NO → Continue
                |
                v
            [Increment round counter]
            [Round = Round + 1]
                |
                v
            [Artist fills counter-counter-offer form]
            ├─ Adjusted fee (with reason)
            ├─ Adjusted slot (if applicable)
            └─ Message explaining position
                |
                v
            {Validate artist's counter}
            ├─ Check if changes are within negotiable parameters
            ├─ Fee change: ±20% max from original
            ├─ Date change: Not allowed (hard rule)
            └─ Slot change: Only adjacent slots
                |
                v
            {Validation passed?}
                |
                ├─ NO → [Show errors]
                │       ["Changes exceed platform limits"]
                │       |
                │       v
                │   [Return to form]
                │
                └─ YES → Continue
                    |
                    v
                [Save counter-counter-offer]
                [Status = "Pending Organizer Response"]
                    |
                    v
                [Notify organizer]
                    |
                    v
                [START TIMEOUT: 24 hours for organizer]
                    |
                    v
                [Organizer views counter-counter-offer]
                    |
                    v
                {Organizer decision?}
                    |
                    ├─ ACCEPT → [Go to CONTRACT GENERATION]
                    │           |
                    │           v
                    │       [END - Continue to Section 4]
                    │
                    ├─ DECLINE → [Close negotiation]
                    │           [Status = "Failed"]
                    │           |
                    │           v
                    │       [Notify both parties]
                    │       [Free slots]
                    │           |
                    │           v
                    │       [END]
                    │
                    ├─ COUNTER AGAIN → [Loop back to counter-offer]
                    │                  [But check round limit]
                    │
                    └─ TIMEOUT → [Auto-decline]
                                [Notify both parties]
                                [Close negotiation]
                                |
                                v
                            [END]
```

---

## 4️⃣ Contract Generation & Signing Flow

```
[START: Negotiation completed successfully]
[Terms agreed between artist and organizer]
    |
    v
[System initiates contract generation]
    |
    v
[Determine contract type]
{Based on multiple factors}
    |
    v
[Check artist trust score]
    |
    ├─ Score < 50 → [Type A: Strict terms, 50% advance]
    ├─ Score 50-75 → [Type B: Standard terms, 30% advance]
    ├─ Score 76-90 → [Type C: Good terms, 20% advance]
    └─ Score > 90 → [Type D: Premium terms, 20% advance, flexible]
        |
        v
[Check organizer trust score]
    |
    ├─ Score < 50 → [Require 100% advance payment]
    ├─ Score 50-75 → [Standard payment schedule]
    └─ Score > 75 → [Flexible payment options]
        |
        v
[Check booking type]
    |
    ├─ Local gig (same city) → [Template 1: Local booking]
    ├─ Interstate gig → [Template 2: Travel included]
    ├─ International → [Template 3: International terms]
    └─ Multi-day event → [Template 4: Extended booking]
        |
        v
[Load appropriate contract template]
[Template = 90% pre-filled generic terms]
    |
    v
[Populate contract with agreed terms]
    |
    v
[SECTION 1: Party Details]
├─ Artist legal name (from profile)
├─ Artist PAN number
├─ Organizer/Venue name
├─ Organizer registration details
├─ Platform as facilitator
└─ Contract date and ID
    |
    v
[SECTION 2: Performance Details]
├─ Event name
├─ Event date (from negotiation)
├─ Performance start time (from negotiation)
├─ Performance duration (from negotiation)
├─ Slot type: Opening/Mid/Closing (from negotiation)
├─ Venue name and address
└─ Expected audience size
    |
    v
[SECTION 3: Financial Terms]
├─ Total artist fee (from negotiation)
├─ Currency
├─ Payment breakdown:
│   ├─ Deposit: X% on signing
│   ├─ Second payment: Y% on [milestone]
│   └─ Final payment: Z% on [milestone]
├─ Payment method: Bank transfer via platform
├─ Bank account details (from artist profile)
└─ Tax handling (TDS if applicable)
    |
    v
[SECTION 4: Travel & Accommodation] (if applicable)
{If booking type includes travel}
    |
    ├─ Travel NOT included → [Skip this section]
    │
    └─ Travel INCLUDED → [Add clauses]
        ├─ Flight booking responsibility
        ├─ Flight class and preferences
        ├─ Airport pickup details
        ├─ Hotel specifications
        ├─ Check-in/out times
        └─ Ground transportation
        |
        v
[SECTION 5: Technical Requirements]
├─ Link to artist's technical rider
├─ Equipment to be provided by venue
├─ Sound check time allocation
├─ Backline requirements
└─ Stage setup needs
    |
    v
[SECTION 6: Hospitality Terms]
├─ Guest list passes (default: 5)
├─ Green room access
├─ Drinks/refreshments
├─ Meal arrangements
└─ Security provisions
    |
    v
[SECTION 7: Branding & Promotion]
├─ Artist name spelling
├─ Billing position (headliner/support)
├─ Logo usage rights
├─ Promotional material approval process
├─ Social media guidelines
└─ Press requirements
    |
    v
[SECTION 8: Content Rights]
├─ Recording permissions (default: not allowed)
├─ Photography rules
├─ Videography rules
├─ Live streaming rights
└─ Social media posting rules
    |
    v
[SECTION 9: Slot Time Protection Clause]
{CRITICAL SECTION}
├─ Committed time slot is LOCKED
├─ Change penalties:
│   ├─ If organizer changes:
│   │   ├─ Artist gets choice to accept/reject
│   │   ├─ If rejected: 50% to artist, 30% refund to organizer, 20% to platform
│   └─ Compensation structure defined
└─ Force majeure exceptions only
    |
    v
[SECTION 10: Cancellation Policy]
├─ By organizer:
│   ├─ >30 days before: 20% penalty
│   ├─ 15-30 days before: 50% penalty
│   ├─ <15 days before: 100% penalty (no refund)
│   └─ Payments made are non-refundable to artist
├─ By artist:
│   ├─ >90 days before: No penalty
│   ├─ 30-90 days before: Forfeit deposit
│   ├─ <30 days before: Legal action possible
│   └─ Trust score severely impacted
└─ Force majeure clauses
    |
    v
[SECTION 11: Standard Legal Terms]
├─ Confidentiality clause
├─ No partnership creation
├─ Liability limitations
├─ Dispute resolution process
├─ Jurisdiction (Bangalore courts)
├─ Amendment process
└─ Entire agreement clause
    |
    v
[SECTION 12: Platform Terms]
├─ Platform commission (2-5%)
├─ Payment processing via platform
├─ Trust score impact disclosure
├─ Feedback obligations
└─ Platform liability limitations
    |
    v
[Generate PDF contract]
├─ Professional formatting
├─ Platform branding
├─ Unique contract ID
├─ QR code for verification
└─ Digital signature fields
    |
    v
[Store contract in system]
├─ Database record created
├─ Status = "Pending Signatures"
├─ Both parties linked
└─ Timestamp recorded
    |
    v
[Send contract to both parties]
    |
    ├─ To Artist:
    │   ├─ Email with PDF attachment
    │   ├─ In-app notification
    │   └─ "Sign Contract" button in dashboard
    │
    └─ To Organizer:
        ├─ Email with PDF attachment
        ├─ In-app notification
        └─ "Sign Contract" button in dashboard
    |
    v
[START CONTRACT SIGNING WINDOW: 48 hours]
    |
    v
[Both parties review contract]
    |
    v
{Artist signs first}
    |
    v
[Artist clicks "Sign Contract"]
    |
    v
[Display contract terms]
[Checkbox: "I have read and agree to all terms"]
    |
    v
{Checkbox checked?}
    ├─ NO → [Cannot proceed] → [Must check to continue]
    └─ YES → Continue
        |
        v
[Verify artist identity]
├─ Re-enter password
├─ Or OTP to registered mobile
└─ Or biometric (if on mobile app)
    |
    v
{Identity verified?}
    ├─ NO → [Show error] → [Retry] → [Max 3 attempts]
    └─ YES → Continue
        |
        v
[Capture digital signature]
├─ Draw signature OR
├─ Type name (generates signature) OR
└─ Upload signature image
    |
    v
[Add signature to contract PDF]
    |
    v
[Timestamp signature]
[Artist signature timestamp: DD/MM/YYYY HH:MM:SS]
    |
    v
[Update contract status]
[Status = "Signed by Artist, Pending Organizer"]
    |
    v
[Notify organizer]
"Artist has signed the contract"
"Please review and sign within 24 hours"
    |
    v
[Wait for organizer signature]
    |
    v
{Organizer signs} (Same process as artist)
    |
    v
[Capture organizer signature]
    |
    v
[Timestamp signature]
[Organizer signature timestamp: DD/MM/YYYY HH:MM:SS]
    |
    v
[Update contract status]
[Status = "FULLY EXECUTED"]
    |
    v
[Generate final signed PDF]
├─ Both signatures visible
├─ Both timestamps
├─ Platform seal
└─ Blockchain hash (optional)
    |
    v
[Store final contract]
├─ Immutable record
├─ Backed up to cloud
└─ Audit trail maintained
    |
    v
[Send copies to both parties]
├─ Email with final PDF
└─ Available in dashboard downloads
    |
    v
[Create booking record]
├─ Status = "Confirmed"
├─ Link to contract
├─ Add to both calendars
└─ Initialize payment schedule
    |
    v
[Trigger payment workflow]
[Go to PAYMENT FLOW]
    |
    v
[Trigger checklist workflow]
[Go to EXECUTION CHECKLIST FLOW]
    |
    v
[END: Contract executed, booking confirmed]

---

[TIMEOUT SCENARIOS]
    |
    v
{48 hours elapsed without both signatures?}
    |
    ├─ Artist signed, organizer didn't:
    │   |
    │   v
    │   [Send reminder to organizer at 24h]
    │   [Send final reminder at 40h]
    │   |
    │   v
    │   {Still no signature at 48h?}
    │   |
    │   └─ YES → [Auto-cancel booking]
    │           [Status = "Cancelled - Contract Not Signed"]
    │           |
    │           v
    │       [Notify both parties]
    │       [Free up calendar slots]
    │       [Negative impact on organizer trust score]
    │       |
    │       v
    │       [END]
    │
    ├─ Organizer signed, artist didn't:
    │   |
    │   v
    │   [Same reminder process]
    │   |
    │   v
    │   {Still no signature at 48h?}
    │   |
    │   └─ YES → [Auto-cancel booking]
    │           [Negative impact on artist trust score]
    │           [Organizer freed to book another artist]
    │           |
    │           v
    │       [END]
    │
    └─ Neither party signed:
        |
        v
        [Auto-cancel at 48h]
        [Minor negative impact on both trust scores]
        [Opportunity reopened for others]
        |
        v
        [END]
```

---

## 5️⃣ Payment Milestone Flow

```
[START: Contract executed successfully]
    |
    v
[System initializes payment schedule]
[Based on contract terms and trust scores]
    |
    v
[Determine payment structure]
{Based on party trust scores and booking value}
    |
    v
{Artist trust score < 50 OR Organizer trust score < 50?}
    |
    ├─ YES → [HIGH RISK PAYMENT STRUCTURE]
    │        |
    │        ├─ 50% on contract signing
    │        ├─ 30% on 7 days before event
    │        └─ 20% on event completion
    │
    └─ NO → [STANDARD PAYMENT STRUCTURE]
             |
             ├─ 20-30% on contract signing
             ├─ 30-40% on milestone (7-14 days before)
             └─ 30-40% on event completion
    |
    v
[Create payment milestones]
    |
    v
═══════════════════════════════════════════════
 MILESTONE 1: DEPOSIT (Contract Signing)
═══════════════════════════════════════════════
    |
    v
[Calculate deposit amount]
[Deposit = Total Fee × Deposit %]
    |
    v
[Add platform commission]
[Total due from organizer = Deposit + Commission]
    |
    v
[Create payment request]
├─ Amount: [Calculated total]
├─ Due date: Within 24 hours of contract signing
├─ Payment ID: Unique identifier
├─ Invoice generated
└─ Status: "Pending"
    |
    v
[Send payment request to organizer]
├─ Email with invoice
├─ In-app payment portal link
├─ Multiple payment options:
│   ├─ Bank transfer
│   ├─ UPI
│   ├─ Card payment
│   └─ Net banking
└─ Payment instructions
    |
    v
[START PAYMENT TIMER: 24 hours]
    |
    v
{Organizer makes payment}
    |
    v
[Payment gateway processing]
    |
    v
{Payment successful?}
    |
    ├─ NO → [Retry payment]
    │       |
    │       v
    │   {Max retries reached OR timeout?}
    │       |
    │       └─ YES → [Cancel booking]
    │               [Refund any partial payment]
    │               [Severe trust score penalty]
    │               [Notify both parties]
    │               |
    │               v
    │           [END: Booking cancelled]
    │
    └─ YES → Continue
        |
        v
[Payment received confirmation]
    |
    v
[Update payment status]
[Milestone 1 Status = "Paid"]
    |
    v
[Split payment]
    |
    ├─ Platform commission: 2-5% → [Platform account]
    ├─ Artist deposit: Calculated amount → [Platform escrow]
    └─ Transaction fee: Varies → [Payment gateway]
    |
    v
[Hold artist payment in escrow]
[Will release after event completion]
    |
    v
[Update booking status]
[Status = "Deposit Paid - Confirmed"]
    |
    v
[Notify both parties]
├─ Artist: "Deposit received! Your booking is secured."
└─ Organizer: "Payment successful. Booking confirmed."
    |
    v
[Generate receipt]
├─ For organizer (full amount paid)
└─ For artist (acknowledgment of escrow)
    |
    v
[Schedule next milestone reminder]
    |
    v
═══════════════════════════════════════════════
 MILESTONE 2: PRE-EVENT PAYMENT
═══════════════════════════════════════════════
    |
    v
{Date = [X days before event]}
[X = 7 or 14 days based on booking terms]
    |
    v
[System automatically triggers reminder]
[T-minus 10 days: First reminder]
    |
    v
[Send reminder to organizer]
"Upcoming payment due in [X] days"
├─ Amount due
├─ Due date
├─ Payment link
└─ Invoice attached
    |
    v
{Travel arrangements required?}
    |
    ├─ YES → [Check if travel documents uploaded]
    │        |
    │        v
    │   {Travel documents uploaded?}
    │        |
    │        ├─ NO → [Block payment milestone]
    │        │       ["Cannot proceed to payment"]
    │        │       ["Artist must upload travel bookings"]
    │        │       |
    │        │       v
    │        │   [Notify artist to upload documents]
    │        │   [Wait for upload]
    │        │       |
    │        │       v
    │        │   {Documents uploaded?}
    │        │       |
    │        │       ├─ NO → [Escalate to admin]
    │        │       │       [Manual intervention]
    │        │       │
    │        │       └─ YES → [Unblock milestone]
    │        │
    │        └─ YES → [Verify documents]
    │                |
    │                v
    │           {Documents valid?}
    │                |
    │                ├─ NO → [Request reupload]
    │                └─ YES → Continue
    │
    └─ NO → Continue
        |
        v
[At T-minus 7 days (or specified days)]
    |
    v
[Payment becomes DUE]
    |
    v
[Send payment due notice]
    |
    v
[Organizer makes payment] (Same process as Milestone 1)
    |
    v
{Payment successful?}
    |
    ├─ NO → [Grace period: 24 hours]
    │       |
    │       v
    │   {Payment made within grace period?}
    │       |
    │       ├─ NO → [Check contract terms]
    │       │       |
    │       │       v
    │       │   [Apply penalty as per contract]
    │       │   [Organizer pays: Original amount + Penalty]
    │       │       |
    │       │       v
    │       │   {Payment with penalty made?}
    │       │       |
    │       │       ├─ YES → Continue
    │       │       │
    │       │       └─ NO → [CRITICAL FAILURE]
    │       │               |
    │       │               v
    │       │           [Organizer in breach of contract]
    │       │           [Artist has option to cancel]
    │       │               |
    │       │               v
    │       │           {Artist chooses?}
    │       │               |
    │       │               ├─ Cancel → [Booking cancelled]
    │       │               │           [Artist gets full payment from escrow + deposit]
    │       │               │           [Organizer trust score: -50 points]
    │       │               │           [Organizer may face legal action]
    │       │               │           |
    │       │               │           v
    │       │               │       [END]
    │       │               │
    │       │               └─ Proceed → [Artist accepts risk]
    │       │                           [Continue with booking]
    │       │                           [Red flag on organizer]
    │       │                           |
    │       │                           v
    │       │                       [Continue]
    │       │
    │       └─ YES → Continue
    │
    └─ YES → Continue
        |
        v
[Milestone 2 payment received]
    |
    v
[Add to escrow account]
[Escrow now holds: Milestone 1 + Milestone 2 payments]
    |
    v
[Update status]
[Booking Status = "Pre-Event Payment Received"]
    |
    v
[Notify both parties]
    |
    v
[Trigger execution checklist]
[Go to EXECUTION CHECKLIST FLOW]
    |
    v
═══════════════════════════════════════════════
 MILESTONE 3: FINAL PAYMENT (Post-Event)
═══════════════════════════════════════════════
    |
    v
{Event day arrives}
    |
    v
[Artist performs]
    |
    v
[Event completion]
    |
    v
{Next day morning}
    |
    v
[System sends completion confirmation request]
    |
    v
[Both parties must confirm event happened successfully]
    |
    v
{Artist confirms completion?}
    ├─ Checkbox: "I performed as per contract"
    └─ Upload proof (optional): Set recording, photos, etc.
    |
    v
{Organizer confirms completion?}
    ├─ Checkbox: "Artist performed as per contract"
    └─ Rate performance (internal, not public)
    |
    v
{BOTH confirmed?}
    |
    ├─ NO → [Waiting for confirmations]
    │       |
    │       v
    │   {48 hours without confirmation?}
    │       |
    │       └─ YES → [Escalate to admin]
    │               [Manual review required]
    │               [Check evidence]
    │               [Admin makes decision]
    │               |
    │               v
    │           [Admin resolves]
    │               |
    │               v
    │           [Either proceed to payment OR investigate dispute]
    │
    └─ YES → Continue
        |
        v
[Create final payment request]
    |
    v
[Calculate final payment]
[Final Payment = Total Fee - (Milestone 1 + Milestone 2)]
    |
    v
[Send payment request to organizer]
    |
    v
[START PAYMENT TIMER: 7 days]
    |
    v
{Organizer makes final payment}
    |
    v
{Payment successful?}
    |
    ├─ NO → [Follow up reminders]
    │       |
    │       v
    │   {7 days elapsed?}
    │       |
    │       └─ YES → [Payment overdue]
    │               [Apply late payment penalty: 2% per day]
    │               [Legal notice sent]
    │               [Artist can claim full amount from escrow]
    │               [Platform pursues organizer for balance]
    │               |
    │               v
    │           [Trust score: Severe penalty]
    │           [Organizer may be suspended/banned]
    │               |
    │               v
    │           [END with dispute]
    │
    └─ YES → Continue
        |
        v
[Final payment received]
    |
    v
[Add to escrow]
[Escrow now holds: Full payment amount]
    |
    v
[Verify all contract obligations met]
├─ Performance completed ✓
├─ All payments received ✓
├─ No disputes filed ✓
└─ Both parties confirmed ✓
    |
    v
{All obligations met?}
    |
    ├─ NO → [Hold payment]
    │       [Resolve outstanding issues]
    │       |
    │       v
    │   [Admin review]
    │       |
    │       v
    │   [Resolution]
    │       |
    │       v
    │   [Then proceed to release]
    │
    └─ YES → Continue
        |
        v
[RELEASE PAYMENT TO ARTIST]
    |
    v
[Calculate artist payout]
[Artist Payout = Total Escrow - Platform Commission]
    |
    v
[Initiate bank transfer to artist]
├─ To account: [Artist bank details from profile]
├─ Amount: [Calculated payout]
├─ Reference: [Booking ID + Event Date]
└─ Payment mode: NEFT/RTGS/IMPS
    |
    v
{Transfer successful?}
    |
    ├─ NO → [Retry transfer]
    │       |
    │       v
    │   {Max retries failed?}
    │       |
    │       └─ YES → [Flag for manual intervention]
    │               [Finance team investigates]
    │               [Resolve bank issue]
    │               [Complete transfer manually]
    │
    └─ YES → Continue
        |
        v
[Payment successful notification]
    |
    v
[Update booking status]
[Status = "Completed - Payment Released"]
    |
    v
[Notify artist]
"Payment of ₹[Amount] has been transferred to your account"
[Show payment breakdown]
    |
    v
[Generate final settlement report]
├─ Total booking value
├─ Platform commission
├─ Net payment to artist
├─ Payment dates
├─ Tax deductions (if any)
└─ Complete transaction history
    |
    v
[Send settlement report to both parties]
    |
    v
[Update financial records]
├─ Artist earnings updated
├─ Platform revenue recorded
├─ Tax reports generated
└─ Accounting entries made
    |
    v
[Trigger feedback collection]
[Go to FEEDBACK FLOW]
    |
    v
[Update trust scores]
[Go to TRUST SCORE UPDATE FLOW]
    |
    v
[END: Payment flow completed successfully]
```

---

## 6️⃣ Venue Programming Mode Flow (3-6 Month Calendar)

```
[START: Venue/Club requests programming package]
    |
    v
{Venue logged in}
    |
    v
[Venue dashboard] → [Click "Programming Packages"]
    |
    v
[Display package options]
    |
    ├─ 3-month programming package
    ├─ 6-month programming package
    └─ Custom programming (enterprise)
    |
    v
[Venue selects package]
[Example: 3-month package]
    |
    v
[Package details shown]
├─ Duration: 3 months
├─ Frequency options:
│   ├─ Weekly (12 events)
│   ├─ Bi-weekly (6 events)
│   └─ Monthly (3 events)
├─ Price: Fixed monthly retainer
├─ Benefits:
│   ├─ Curator-led selections
│   ├─ Guaranteed artist availability
│   ├─ Genre diversity
│   ├─ Consistent quality
│   ├─ Crowd analytics
│   └─ Flexible adjustments
└─ Contract terms
    |
    v
{Venue wants to proceed?}
    ├─ NO → [Return to dashboard] → [END]
    └─ YES → Continue
        |
        v
[Venue intake form - Step 1: Venue Profile]
    |
    v
{Is venue profile complete?}
    |
    ├─ NO → [Must complete venue profile first]
    │       |
    │       v
    │   [Redirect to venue profile setup]
    │   ├─ Venue name and address
    │   ├─ Capacity (standing/seated)
    │   ├─ Operating hours
    │   ├─ Upload venue photos (10-20)
    │   ├─ Technical specifications
    │   ├─ Sound system details
    │   ├─ Licensing information
    │   └─ Past event history
    │       |
    │       v
    │   [Submit for verification]
    │       |
    │       v
    │   [Admin verifies venue]
    │       |
    │       v
    │   {Verification approved?}
    │       |
    │       ├─ NO → [Request corrections] → [Resubmit]
    │       └─ YES → [Profile Complete] → [Return to intake]
    │
    └─ YES → Continue
        |
        v
[Venue intake form - Step 2: Budget & Schedule]
    |
    v
[Define monthly budget]
├─ Total monthly budget for artists
├─ Budget per event
├─ Additional budget for special events
└─ Payment terms preference
    |
    v
[Select programming frequency]
├─ Which days of week? (e.g., Fridays & Saturdays)
├─ Start date of programming
├─ Any blackout dates?
└─ Special event dates (if known)
    |
    v
[Venue intake form - Step 3: Audience Definition]
    |
    v
[Describe target audience]
├─ Age group (18-25, 25-35, 35+)
├─ Demographics (students, professionals, mixed)
├─ Current typical crowd size
├─ Desired crowd size
└─ Crowd behavior preferences
    |
    v
[Define music policy]
├─ Primary genre preference
├─ Secondary genres
├─ Genres to avoid
├─ Energy level preference (chill/high energy)
├─ Commercial vs Underground
└─ Any specific artist types
    |
    v
[Upload reference materials (optional)]
├─ Past successful events
├─ Competitor venues to match/avoid
├─ Brand positioning documents
└─ Any specific requirements
    |
    v
[Venue intake form - Step 4: Logistics & Operations]
    |
    v
[Define operational parameters]
├─ Artist arrival time guidelines
├─ Sound check duration available
├─ Green room availability
├─ Hospitality provisions
├─ Security arrangements
├─ Technical support on-site
└─ Parking for artists
    |
    v
[Venue intake form - Step 5: Special Requirements]
    |
    v
[Any special requirements?]
├─ Themed nights?
├─ Collaborations with brands?
├─ Food/beverage partnerships?
├─ Media coverage needed?
└─ Social media promotion expectations
    |
    v
{All fields completed?}
    |
    ├─ NO → [Show validation errors] → [Return to form]
    └─ YES → Continue
        |
        v
[Review and confirm]
[Display summary of all inputs]
    |
    v
{Venue confirms all details?}
    ├─ NO → [Edit responses] → [Return to relevant step]
    └─ YES → Continue
        |
        v
[Submit programming request]
    |
    v
[System creates programming request record]
├─ Request ID
├─ Status: "Pending Curator Review"
├─ Timestamp
└─ Link to venue profile
    |
    v
[Assign to curator team]
    |
    v
[Notify curator team]
"New programming request from [Venue Name]"
    |
    v
[Curator team reviews request]
    |
    v
{Curator assessment}
    |
    ├─ Budget insufficient for requirements
    │   |
    │   v
    │   [Contact venue]
    │   [Negotiate budget adjustment OR scope reduction]
    │   |
    │   v
    │   {Agreement reached?}
    │       |
    │       ├─ NO → [Decline request] → [Suggest alternatives] → [END]
    │       └─ YES → [Update request] → Continue
    │
    └─ Budget and requirements are aligned → Continue
        |
        v
[Curator creates programming strategy]
    |
    v
[Strategy document includes]
├─ Overall vision for 3/6 months
├─ Genre rotation plan
├─ Mix of established vs emerging artists
├─ Budget allocation per event
├─ Special event recommendations
├─ Growth trajectory plan
└─ Risk mitigation strategy
    |
    v
[Generate calendar structure]
    |
    v
[FOR each event date in the programming period]
    |
    v
    [Define event parameters]
    ├─ Date and time
    ├─ Genre for this event
    ├─ Artist budget for this event
    ├─ Slot structure (opening/mid/closing)
    ├─ Expected crowd type
    └─ Theme/concept (if any)
        |
        v
    [Search artist database for suitable artists]
        |
        v
    [Apply filters based on]
    ├─ Genre match
    ├─ Budget range
    ├─ Trust score (>70 preferred for programming)
    ├─ Availability on that date
    ├─ Past performance at similar venues
    ├─ Crowd pulling ability
    └─ Diversity (don't repeat same artists too often)
        |
        v
    {Found suitable artist candidates?}
        |
        ├─ NO → [Adjust parameters] OR [Flag for manual sourcing]
        │
        └─ YES → [Shortlist 3-5 artists per slot]
            |
            v
        [Rank artists by fit score]
        ├─ Algorithm considers:
        │   ├─ Genre match %
        │   ├─ Budget alignment
        │   ├─ Trust score
        │   ├─ Past success metrics
        │   ├─ Audience overlap
        │   └─ Strategic fit
        └─ Top ranked artist = Primary choice
            |
            v
        [Add to programming proposal]
            |
            v
    [NEXT event date]
        |
        v
[LOOP until all dates covered]
    |
    v
[Programming proposal complete]
    |
    v
[Curator reviews full calendar]
├─ Check for good variety
├─ Check for genre balance
├─ Check for budget distribution
├─ Check for artist diversity
├─ Check for growth arc across months
└─ Make adjustments if needed
    |
    v
[Generate programming proposal document]
├─ Executive summary
├─ Month-by-month breakdown
├─ Artist profiles for each event
├─ Budget breakdown
├─ Expected outcomes
├─ Success metrics
└─ T&C for programming package
    |
    v
[Send proposal to venue]
├─ Email with PDF attachment
├─ In-app notification
└─ Schedule presentation call (if requested)
    |
    v
[Venue reviews proposal]
    |
    v
{Venue decision?}
    |
    ├─ REJECT → [Collect feedback]
    │           [Curator makes revisions]
    │           [Resubmit proposal]
    │           |
    │           v
    │       [Max 2 revisions allowed]
    │       |
    │       v
    │       {Still rejected after revisions?}
    │           |
    │           └─ YES → [Programming request declined]
    │                   [Venue can reapply later]
    │                   |
    │                   v
    │               [END]
    │
    ├─ REQUEST CHANGES → [Venue specifies changes needed]
    │                    |
    │                    v
    │                [Common change requests]
    │                ├─ Swap specific artist
    │                ├─ Change genre for certain dates
    │                ├─ Adjust budget allocation
    │                └─ Modify schedule dates
    │                    |
    │                    v
    │                [Curator evaluates feasibility]
    │                    |
    │                    v
    │                {Changes feasible?}
    │                    |
    │                    ├─ NO → [Explain constraints] → [Offer alternatives]
    │                    └─ YES → [Make adjustments] → [Resubmit]
    │
    └─ ACCEPT → Continue
        |
        v
[Generate programming master contract]
    |
    v
[Master contract includes]
├─ Programming period (start/end dates)
├─ All event dates and artists
├─ Monthly retainer amount
├─ Payment schedule (monthly in advance)
├─ Individual artist fees (breakdown)
├─ Platform commission structure
├─ Cancellation/modification policy
├─ Venue obligations
├─ Platform obligations
├─ Curator obligations
├─ Force majeure clauses
└─ Dispute resolution
    |
    v
[Venue signs master contract] (Similar to booking contract flow)
    |
    v
[Platform/curator signs master contract]
    |
    v
[Master contract executed]
    |
    v
[Create individual booking records for each event]
    |
    v
[FOR each event in the programming calendar]
    |
    v
    [Reach out to selected artist]
        |
        v
    [Send booking invitation]
    ├─ Event details
    ├─ Fee offered
    ├─ Venue information
    ├─ Part of programming package
    └─ Acceptance deadline (7 days)
        |
        v
    {Artist accepts?}
        |
        ├─ NO → [Move to backup artist]
        │       [Repeat invitation process]
        │       |
        │       v
        │   {All backups decline?}
        │       |
        │       └─ YES → [Curator manually sources artist]
        │               [Emergency booking process]
        │
        └─ YES → Continue
            |
            v
        [Generate individual contract for this event]
        (Follow standard contract flow from Section 4)
            |
            v
        [Artist signs contract]
            |
            v
        [Event booking confirmed]
        [Add to calendars]
            |
            v
    [NEXT event]
        |
        v
[LOOP until all events have confirmed artists]
    |
    v
[Programming calendar fully populated]
    |
    v
[Initialize monthly payment schedule]
    |
    v
[Each month]
    |
    v
    [Beginning of month]
        |
        v
    [Send monthly invoice to venue]
    ├─ Monthly retainer
    ├─ Breakdown of events for this month
    ├─ Artist fees included
    ├─ Platform commission
    └─ Total amount due
        |
        v
    [Venue pays monthly retainer]
        |
        v
    {Payment received?}
        |
        ├─ NO → [Follow up reminders]
        │       |
        │       v
        │   {Payment overdue by 7 days?}
        │       |
        │       └─ YES → [Suspend upcoming events]
        │               [Send legal notice]
        │               [Notify artists of potential cancellation]
        │               [Contract breach process]
        │
        └─ YES → Continue
            |
            v
        [Allocate payments to individual artist bookings]
        [Hold in escrow until each event completion]
            |
            v
        [Events happen throughout the month]
        [Each event follows standard execution flow]
            |
            v
        [After each event]
        ├─ Collect feedback
        ├─ Release payment to artist
        └─ Update performance metrics
            |
            v
    [End of month reporting]
    ├─ Venue receives monthly report
    │   ├─ Events completed
    │   ├─ Attendance data
    │   ├─ Audience feedback summary
    │   ├─ Artist performance ratings
    │   └─ Recommendations for next month
    └─ Curator reviews performance
        ├─ Analyze crowd response
        ├─ Evaluate artist choices
        ├─ Adjust strategy if needed
        └─ Plan refinements for upcoming months
            |
            v
[LOOP for next month]
    |
    v
[Continue until programming period ends]
    |
    v
[End of 3/6 month period]
    |
    v
[Generate final programming report]
├─ Complete event summary
├─ Attendance trends
├─ Budget utilization
├─ Artist performance summary
├─ ROI analysis
├─ Audience growth metrics
└─ Recommendations for future
    |
    v
[Send report to venue]
    |
    v
[Offer contract renewal]
"Continue programming for next 3/6 months?"
    |
    v
{Venue wants to renew?}
    |
    ├─ YES → [Start renewal process]
    │        [Review and adjust strategy]
    │        [Create new programming proposal]
    │        [Return to programming flow]
    │
    └─ NO → [Thank venue for partnership]
            [Maintain venue in database]
            [Open for individual bookings]
            |
            v
        [END: Programming package completed]
```

---

## 7️⃣ Trust Score Calculation & Update Flow

```
[START: Trust score system]
    |
    v
[Every user (Artist/Organizer/Venue) has trust score]
[Initial score = 50/100 for new users]
    |
    v
[Trust score updated after each transaction/interaction]
    |
    v
═══════════════════════════════════════════════
 TRUST SCORE FACTORS
═══════════════════════════════════════════════
    |
    v
[POSITIVE FACTORS (Add points)]
    |
    ├─ Successful booking completion: +5 points
    ├─ On-time payment: +3 points
    ├─ On-time performance: +3 points
    ├─ 5-star internal rating: +5 points
    ├─ Documents submitted early: +2 points
    ├─ Professional communication: +2 points
    ├─ Flexible cooperation: +3 points
    ├─ Completed profile: +5 points (one-time)
    ├─ Verified documents: +5 points (one-time)
    └─ Long tenure on platform: +1 per month
    |
    v
[NEGATIVE FACTORS (Deduct points)]
    |
    ├─ Late payment: -5 to -15 (based on days late)
    ├─ Missed payment: -30 points
    ├─ Last-minute cancellation (<7 days): -20 points
    ├─ No-show: -50 points
    ├─ Contract violation: -15 to -30 points
    ├─ Poor performance rating (1-2 stars): -10 points
    ├─ Late document submission: -3 points
    ├─ Unprofessional communication: -5 points
    ├─ Slot time change request: -10 points
    └─ Dispute filed against user: -10 to -30 points
    |
    v
[Trust Score Calculation Logic]
    |
    v
{Trigger event occurs}
[Example: Booking completed successfully]
    |
    v
[Identify applicable factors]
    |
    v
[FOR Artist]
    |
    v
    [Check]
    ├─ Did artist perform on time? → +3
    ├─ Was performance quality good? (organizer rating) → +5 (if 5 stars)
    ├─ Were documents submitted on time? → +2
    ├─ Any contract violations? → 0 or negative
    └─ Booking completed → +5
        |
        v
    [Calculate total adjustment]
    [Example: +3 +5 +2 +5 = +15 points]
        |
        v
    [Apply to current score]
    [Current score: 65]
    [New score: 65 + 15 = 80]
        |
        v
    {Check boundaries}
    ├─ Score < 0? → Set to 0
    └─ Score > 100? → Set to 100
        |
        v
    [Update artist's trust score: 80]
        |
        v
    [Record in score history]
    ├─ Timestamp
    ├─ Previous score: 65
    ├─ New score: 80
    ├─ Reason: "Booking ABC123 completed"
    └─ Point breakdown
        |
        v
[FOR Organizer]
    |
    v
    [Check]
    ├─ Did organizer pay on time? → +3
    ├─ All milestones paid promptly? → +5
    ├─ Venue conditions as described? → +3
    ├─ Professional management? → +2
    ├─ Any slot time changes? → -10 or 0
    └─ Booking completed → +5
        |
        v
    [Calculate total adjustment]
        |
        v
    [Apply to current score]
        |
        v
    [Update organizer's trust score]
        |
        v
    [Record in score history]
        |
        v
═══════════════════════════════════════════════
 TRUST SCORE TIERS & IMPLICATIONS
═══════════════════════════════════════════════
    |
    v
[Score 0-30: CRITICAL RISK]
├─ Severe restrictions
├─ 100% advance payment required (if artist)
├─ Cannot book last-minute (<30 days)
├─ Limited to 2 pending applications
├─ Mandatory admin approval for each booking
├─ High platform commission (5%)
├─ No access to premium artists/venues
└─ Account may be suspended
    |
    v
[Score 31-50: HIGH RISK]
├─ Significant restrictions
├─ 50% advance payment required
├─ Limited to 5 pending applications
├─ Cannot book premium tier
├─ Higher platform commission (4%)
├─ Some features restricted
└─ Close monitoring
    |
    v
[Score 51-70: STANDARD]
├─ Normal platform access
├─ 30% advance payment
├─ Up to 10 pending applications
├─ Standard platform commission (3%)
├─ Full feature access
└─ Regular user status
    |
    v
[Score 71-85: TRUSTED]
├─ Enhanced privileges
├─ 20% advance payment
├─ Up to 20 pending applications
├─ Reduced platform commission (2.5%)
├─ Priority in searches
├─ Access to premium features
└─ "Trusted" badge displayed
    |
    v
[Score 86-100: PREMIUM]
├─ Maximum privileges
├─ 20% advance payment (flexible terms)
├─ Unlimited pending applications
├─ Lowest platform commission (2%)
├─ Top priority in searches
├─ All premium features
├─ Personal account manager
├─ "Premium" badge displayed
└─ Exclusive opportunities
    |
    v
[Trust Score Display]
    |
    v
[To user themselves]
├─ Full score visible
├─ Score history graph
├─ Point breakdown
├─ Suggestions to improve
└─ Current tier and next tier
    |
    v
[To other users]
├─ Badge/tier visible (not exact score)
├─ "Trusted", "Premium", etc.
├─ Number of completed bookings
├─ Years on platform
└─ General reliability indicator
    |
    v
[Score improvement tips]
    |
    v
{Score < 70?}
    |
    └─ YES → [Show improvement suggestions]
            |
            ├─ "Complete more bookings successfully"
            ├─ "Always pay on time"
            ├─ "Avoid cancellations"
            ├─ "Upload documents early"
            ├─ "Maintain professional communication"
            └─ "Honor all contract terms"
            |
            v
        [Link to "How to improve trust score" guide]
            |
            v
        [END]
```

---

## 8️⃣ Cancellation & Refund Flow

```jsx
[START: User wants to cancel booking]
    |
    v
{Who is cancelling?}
    |
    ├─── [ARTIST CANCELLATION]
    │       |
    │       v
    │   [Artist navigates to booking]
    │   [Clicks "Request Cancellation"]
    │       |
    │       v
    │   [System checks contract status]
    │       |
    │       v
    │   {Contract signed?}
    │       |
    │       ├─ NO → [Can cancel freely]
    │       │       [No penalty]
    │       │       [Notify organizer]
    │       │       [Free up slots]
    │       │       |
    │       │       v
    │       │   [END]
    │       │
    │       └─ YES → Continue
    │           |
    │           v
    │       [Calculate days until event]
    │       [Days = Event Date - Today]
    │           |
    │           v
    │       {Days until event?}
    │           |
    │           ├─ Days > 90
    │           │   |
    │           │   v
    │           │   [Low penalty cancellation]
    │           │   ├─ Artist forfeits deposit (if paid)
    │           │   ├─ Trust score: -10 points
    │           │   └─ No further financial penalty
    │           │       |
    │           │       v
    │           │   [Artist must provide reason]
    │           │   [Text field: Max 500 characters]
    │           │       |
    │           │       v
    │           │   {Reason provided?}
    │           │       |
    │           │       ├─ NO → [Cannot proceed without reason]
    │           │       └─ YES → Continue
    │           │           |
    │           │           v
    │           │       [Submit cancellation request]
    │           │           |
    │           │           v
    │           │       [Admin reviews request]
    │           │           |
    │           │           v
    │           │       {Valid reason?}
    │           │       [Valid reasons: medical emergency, force majeure, etc.]
    │           │           |
    │           │           ├─ YES → [Approve cancellation]
    │           │           │       [Apply standard penalties]
    │           │           │       |
    │           │           │       v
    │           │           │   [Go to ARTIST CANCELLATION PROCESSING]
    │           │           │
    │           │           └─ NO → [Deny request]
    │           │                   [Artist must honor contract]
    │           │                   [Or face severe penalties]
    │           │                   |
    │           │                   v
    │           │               [END]
    │           │
    │           ├─ Days 30-90
    │           │   |
    │           │   v
    │           │   [Medium penalty cancellation]
    │           │   ├─ Artist forfeits all payments received
    │           │   ├─ Additional penalty: 20% of total fee
    │           │   ├─ Trust score: -20 points
    │           │   └─ May affect future bookings
    │           │       |
    │           │       v
    │           │   [Must provide reason]
    │           │   [Admin review required]
    │           │       |
    │           │       v
    │           │   {Approved?}
    │           │       |
    │           │       ├─ YES → [Go to ARTIST CANCELLATION PROCESSING]
    │           │       └─ NO → [Cancellation denied]
    │           │
    │           └─ Days < 30
    │               |
    │               v
    │           [SEVERE PENALTY - Last minute cancellation]
    │               |
    │               v
    │           [Show warning to artist]
    │           "⚠️ LAST MINUTE CANCELLATION"
    │           "This will have severe consequences:"
    │           ├─ Forfeit ALL payments received
    │           ├─ Pay penalty: 50% of total contract value
    │           ├─ Trust score: -50 points (likely drop to critical)
    │           ├─ May face legal action from organizer
    │           ├─ Suspension from platform possible
    │           └─ Permanent mark on record
    │               |
    │               v
    │           {Artist confirms understanding?}
    │               |
    │               ├─ NO → [Cancel the cancellation] → [END]
    │               │
    │               └─ YES → Continue
    │                   |
    │                   v
    │               [Mandatory reason required]
    │               [Must select from dropdown]
    │               ├─ Medical emergency (requires proof)
    │               ├─ Family emergency (requires proof)
    │               ├─ Force majeure (requires proof)
    │               └─ Other (explain in detail)
    │                   |
    │                   v
    │               [Upload supporting documents]
    │               [Required for claim validation]
    │                   |
    │                   v
    │               [Submit cancellation request]
    │                   |
    │                   v
    │               [URGENT ADMIN REVIEW]
    │               [Escalated to senior management]
    │                   |
    │                   v
    │               {Review outcome?}
    │                   |
    │                   ├─ APPROVED (with valid proof)
    │                   │   |
    │                   │   v
    │                   │   [Reduce penalties]
    │                   │   [Forfeit deposit only]
    │                   │   [Trust score: -25 points]
    │                   │   |
    │                   │   v
    │                   │   [Go to ARTIST CANCELLATION PROCESSING]
    │                   │
    │                   ├─ APPROVED (insufficient proof)
    │                   │   |
    │                   │   v
    │                   │   [Full penalties apply]
    │                   │   |
    │                   │   v
    │                   │   [Go to ARTIST CANCELLATION PROCESSING]
    │                   │
    │                   └─ DENIED
    │                       |
    │                       v
    │                   [Artist must perform]
    │                   [Or face breach of contract]
    │                   [Organizer can pursue legal action]
    │                       |
    │                       v
    │                   [END]
    │
    │   [ARTIST CANCELLATION PROCESSING]
    │       |
    │       v
    │   [Cancellation approved]
    │       |
    │       v
    │   [Calculate refunds/penalties]
    │       |
    │       v
    │   {Any payments made by organizer?}
    │       |
    │       ├─ YES → [Process refund to organizer]
    │       │        |
    │       │        v
    │       │    [Calculate refund amount]
    │       │    [Total paid - Penalties - Platform fees]
    │       │        |
    │       │        v
    │       │    [Initiate refund]
    │       │    [Timeline: 5-7 business days]
    │       │        |
    │       │        v
    │       │    [Notify organizer of refund]
    │       │
    │       └─ NO → [No refund needed]
    │           |
    │           v
    │   [Forfeit artist payments]
    │   [Payments returned to organizer]
    │       |
    │       v
    │   {Additional penalty owed by artist?}
    │       |
    │       ├─ YES → [Generate penalty invoice]
    │       │       [Send to artist]
    │       │       [Payment due: 7 days]
    │       │       |
    │       │       v
    │       │   {Penalty paid?}
    │       │       |
    │       │       ├─ YES → [Close case]
    │       │       └─ NO → [Legal action initiated]
    │       │               [Account suspended]
    │       │
    │       └─ NO → Continue
    │           |
    │           v
    │   [Update trust score]
    │   [Apply penalty points as determined]
    │       |
    │       v
    │   [Update booking status]
    │   [Status = "Cancelled by Artist"]
    │       |
    │       v
    │   [Free up calendars]
    │   ├─ Artist calendar freed
    │   └─ Organizer calendar freed
    │       |
    │       v
    │   [Notify organizer]
    │   "Unfortunately, artist has cancelled"
    │   "You will receive refund of ₹[Amount]"
    │   "Would you like help finding replacement artist?"
    │       |
    │       v
    │   {Organizer wants replacement?}
    │       |
    │       ├─ YES → [Priority search for replacement]
    │       │       [Curator assists]
    │       │       [Urgent booking process]
    │       │       [Same terms if possible]
    │       │
    │       └─ NO → [Booking permanently cancelled]
    │           |
    │           v
    │       [Send cancellation report]
    │       ├─ To artist
    │       ├─ To organizer
    │       └─ Platform records
    │           |
    │           v
    │       [END: Artist cancellation completed]
    │
    │
    └─── [ORGANIZER CANCELLATION]
            |
            v
        [Organizer navigates to booking]
        [Clicks "Cancel Booking"]
            |
            v
        [System checks contract status]
            |
            v
        {Contract signed?}
            |
            ├─ NO → [Can cancel freely]
            │       [Minimal penalty]
            │       [Notify artist]
            │       |
            │       v
            │   [END]
            │
            └─ YES → Continue
                |
                v
            [Calculate days until event]
            [Days = Event Date - Today]
                |
                v
            {Days until event?}
                |
                ├─ Days > 30
                │   |
                │   v
                │   [Low penalty cancellation]
                │   ├─ Organizer forfeits deposit (20%)
                │   ├─ Remaining 80% refunded (minus platform fee)
                │   ├─ Artist receives full deposit as compensation
                │   ├─ Trust score: -10 points
                │   └─ Can cancel with reason
                │       |
                │       v
                │   [Provide cancellation reason]
                │       |
                │       v
                │   [Submit cancellation request]
                │       |
                │       v
                │   [Admin reviews] (quick approval for >30 days)
                │       |
                │       v
                │   [Go to ORGANIZER CANCELLATION PROCESSING]
                │
                ├─ Days 15-30
                │   |
                │   v
                │   [Medium penalty cancellation]
                │   ├─ Organizer forfeits 50% of total booking value
                │   ├─ 50% refunded to organizer
                │   ├─ Artist receives 50% as compensation
                │   ├─ Platform keeps commission from forfeited amount
                │   ├─ Trust score: -20 points
                │   └─ Must provide valid reason
                │       |
                │       v
                │   [Provide cancellation reason]
                │   [Text field: Max 500 characters]
                │       |
                │       v
                │   {Reason provided?}
                │       |
                │       ├─ NO → [Cannot proceed without reason]
                │       └─ YES → Continue
                │           |
                │           v
                │       [Submit cancellation request]
                │           |
                │           v
                │       [Admin reviews request]
                │           |
                │           v
                │       {Valid reason?}
                │           |
                │           ├─ YES → [Approve cancellation]
                │           │       [Apply standard penalties]
                │           │       |
                │           │       v
                │           │   [Go to ORGANIZER CANCELLATION PROCESSING]
                │           │
                │           └─ NO → [Deny request]
                │                   [Organizer must honor contract]
                │                   [Or face severe penalties]
                │                   |
                │                   v
                │               [END]
                │
                └─ Days < 15
                    |
                    v
                    [SEVERE PENALTY - Last minute cancellation]
                    |
                    v
                    [Show warning to organizer]
                    "⚠️ LAST MINUTE CANCELLATION"
                    "This will have severe consequences:"
                    ├─ Forfeit 100% of all payments made
                    ├─ Artist receives 100% as compensation
                    ├─ Additional penalty: 50% of remaining contract value
                    ├─ Trust score: -50 points (likely drop to critical)
                    ├─ May face legal action from artist
                    ├─ Suspension/ban from platform possible
                    └─ Permanent mark on record
                        |
                        v
                    {Organizer confirms understanding?}
                        |
                        ├─ NO → [Cancel the cancellation] → [END]
                        │
                        └─ YES → Continue
                            |
                            v
                        [Mandatory reason required]
                        [Must select from dropdown]
                        ├─ Venue emergency (requires proof)
                        ├─ Force majeure (requires proof)
                        ├─ Government restrictions (requires proof)
                        └─ Other (explain in detail)
                            |
                            v
                        [Upload supporting documents]
                        [Required for claim validation]
                            |
                            v
                        [Submit cancellation request]
                            |
                            v
                        [URGENT ADMIN REVIEW]
                        [Escalated to senior management]
                            |
                            v
                        {Review outcome?}
                            |
                            ├─ APPROVED (with valid proof)
                            │   |
                            │   v
                            │   [Reduce penalties]
                            │   [Forfeit 70% instead of 100%]
                            │   [Trust score: -30 points]
                            │   |
                            │   v
                            │   [Go to ORGANIZER CANCELLATION PROCESSING]
                            │
                            ├─ APPROVED (insufficient proof)
                            │   |
                            │   v
                            │   [Full penalties apply]
                            │   |
                            │   v
                            │   [Go to ORGANIZER CANCELLATION PROCESSING]
                            │
                            └─ DENIED
                                |
                                v
                            [Organizer must honor contract]
                            [Or face breach of contract]
                            [Artist can pursue legal action]
                                |
                                v
                            [END]
    [ORGANIZER CANCELLATION PROCESSING]
        |
        v
    [Cancellation approved]
        |
        v
    [Calculate refunds/penalties]
        |
        v
    {Which penalty tier?}
        |
        ├─ >30 days before event
        │   |
        │   v
        │   [Refund calculation]
        │   ├─ Total paid by organizer: 100%
        │   ├─ Organizer forfeits: 20%
        │   ├─ Artist compensation: 20%
        │   ├─ Platform keeps: Commission only
        │   └─ Organizer refund: 80% (minus platform fee)
        │       |
        │       v
        │   [Process refund to organizer]
        │   [Timeline: 5-7 business days]
        │       |
        │       v
        │   [Transfer compensation to artist]
        │   [Artist receives full deposit amount]
        │
        ├─ 15-30 days before event
        │   |
        │   v
        │   [Refund calculation]
        │   ├─ Total paid by organizer: 100%
        │   ├─ Organizer forfeits: 50%
        │   ├─ Artist compensation: 50%
        │   ├─ Platform keeps: Commission from forfeited amount
        │   └─ Organizer refund: 50%
        │       |
        │       v
        │   [Process refund to organizer]
        │   [Timeline: 5-7 business days]
        │       |
        │       v
        │   [Transfer compensation to artist]
        │   [Artist receives 50% of total booking value]
        │
        └─ <15 days before event
            |
            v
            [Refund calculation]
            ├─ Total paid by organizer: 100%
            ├─ Organizer forfeits: 100%
            ├─ Artist compensation: 100%
            ├─ Platform keeps: Commission
            └─ Organizer refund: 0% (NO REFUND)
                |
                v
            {Additional penalty owed?}
                |
                ├─ YES → [Generate penalty invoice]
                │       [50% of remaining contract value]
                │       [Send to organizer]
                │       [Payment due: 7 days]
                │       |
                │       v
                │   {Penalty paid?}
                │       |
                │       ├─ YES → [Close case]
                │       └─ NO → [Legal action initiated]
                │               [Account suspended]
                │               [Debt collection process]
                │
                └─ NO → Continue
                    |
                    v
            [Transfer ALL payments to artist]
            [Artist receives 100% of booking value]
        |
        v
    [Update trust score]
    [Apply penalty points as determined]
        |
        v
    [Update booking status]
    [Status = "Cancelled by Organizer"]
        |
        v
    [Free up calendars]
    ├─ Artist calendar freed
    └─ Organizer calendar freed
        |
        v
    [Notify artist]
    "Organizer has cancelled the booking"
    "You will receive compensation of ₹[Amount]"
    "Your calendar has been freed for this date"
        |
        v
    {Artist wants to report issue?}
        |
        ├─ YES → [Open dispute resolution process]
        │       [Artist can file complaint]
        │       [Platform investigates]
        │       [May result in additional penalties for organizer]
        │
        └─ NO → Continue
            |
            v
        [Send cancellation report]
        ├─ To artist (with compensation breakdown)
        ├─ To organizer (with refund/penalty breakdown)
        └─ Platform records (full transaction log)
            |
            v
        [Update financial records]
        ├─ Process refund to organizer (if applicable)
        ├─ Process compensation to artist
        ├─ Record platform fees earned
        └─ Generate accounting entries
            |
            v
        [Record cancellation in analytics]
        ├─ Cancellation reason
        ├─ Time before event
        ├─ Financial impact
        └─ Pattern analysis for future prevention
            |
            v
        [END: Organizer cancellation completed]
═══════════════════════════════════════════════
 SPECIAL CASE: FORCE MAJEURE CANCELLATION
═══════════════════════════════════════════════
    |
    v
[Force majeure event occurs]
[Examples: Natural disaster, pandemic, government restrictions, war]
    |
    v
{Who initiates cancellation?}
    |
    ├─ Platform initiates (for safety/legal reasons)
    │   |
    │   v
    │   [Platform sends notice to both parties]
    │   "Due to [Force Majeure Event], this booking must be cancelled"
    │       |
    │       v
    │   [Automatic cancellation processing]
    │   ├─ No penalties for either party
    │   ├─ No trust score impact
    │   ├─ Full refund to organizer (minus small processing fee)
    │   ├─ Artist receives cancellation fee (10-20% of booking value)
    │   └─ Platform absorbs remaining costs
    │       |
    │       v
    │   [Process refunds within 48 hours]
    │       |
    │       v
    │   [Offer rescheduling options]
    │   "Would you like to reschedule this booking?"
    │   ├─ Same terms available
    │   └─ Priority booking for both parties
    │       |
    │       v
    │   {Parties agree to reschedule?}
    │       |
    │       ├─ YES → [Create new booking]
    │       │       [Same terms, new date]
    │       │       [Skip negotiation]
    │       │       [Go to CONTRACT GENERATION]
    │       │
    │       └─ NO → [Booking permanently cancelled]
    │               [Both parties thanked]
    │               [No negative consequences]
    │               |
    │               v
    │           [END: Force majeure cancellation]
    │
    ├─ Artist claims force majeure
    │   |
    │   v
    │   [Artist submits force majeure claim]
    │   ├─ Detailed explanation
    │   ├─ Supporting evidence (mandatory)
    │   ├─ Official documentation (government notices, medical certificates, etc.)
    │   └─ Alternative solution attempts (if any)
    │       |
    │       v
    │   [Admin urgent review (within 12 hours)]
    │       |
    │       v
    │   {Claim verified?}
    │       |
    │       ├─ YES → [Approved force majeure]
    │       │       ├─ No penalties for artist
    │       │       ├─ No trust score impact
    │       │       ├─ Organizer receives 90% refund
    │       │       ├─ Artist receives 10% cancellation fee
    │       │       └─ Platform absorbs costs
    │       │       |
    │       │       v
    │       │   [Process as force majeure cancellation]
    │       │   [Offer rescheduling options]
    │       │       |
    │       │       v
    │       │   [END: Force majeure confirmed]
    │       │
    │       └─ NO → [Claim rejected]
    │               [Process as regular cancellation]
    │               [Standard penalties apply]
    │               |
    │               v
    │           [Return to appropriate cancellation flow]
    │
    └─ Organizer claims force majeure
        |
        v
        [Organizer submits force majeure claim]
        ├─ Detailed explanation
        ├─ Supporting evidence (mandatory)
        ├─ Official documentation
        └─ Impact on event viability
            |
            v
        [Admin urgent review (within 12 hours)]
            |
            v
        {Claim verified?}
            |
            ├─ YES → [Approved force majeure]
            │       ├─ No penalties for organizer
            │       ├─ No trust score impact
            │       ├─ Organizer receives 90% refund
            │       ├─ Artist receives 10% cancellation fee
            │       └─ Platform absorbs costs
            │       |
            │       v
            │   [Process as force majeure cancellation]
            │   [Offer rescheduling options]
            │       |
            │       v
            │   [END: Force majeure confirmed]
            │
            └─ NO → [Claim rejected]
                    [Process as regular cancellation]
                    [Standard penalties apply]
                    |
                    v
                [Return to appropriate cancellation flow]
═══════════════════════════════════════════════
 SPECIAL CASE: MUTUAL AGREEMENT CANCELLATION
═══════════════════════════════════════════════
    |
    v
[Either party proposes mutual cancellation]
    |
    v
[Send request to other party]
"[Party Name] has requested to cancel this booking by mutual agreement"
├─ Reason provided
├─ Proposed terms (if any)
└─ Response deadline: 48 hours
    |
    v
{Other party responds?}
    |
    ├─ TIMEOUT (48 hours) → [Request expires]
    │                       [No cancellation]
    │                       [Booking continues]
    │                       |
    │                       v
    │                   [END]
    │
    ├─ DECLINE → [Mutual cancellation rejected]
    │           [Booking continues as planned]
    │           [Either party can still use standard cancellation]
    │           |
    │           v
    │       [END]
    │
    └─ ACCEPT → [Both parties agree to cancel]
        |
        v
        [Negotiate cancellation terms]
        |
        v
        {Custom terms agreed?}
            |
            ├─ YES → [Apply custom terms]
            │       [Example: Split forfeited amount differently]
            │       [Both parties confirm final terms]
            │       |
            │       v
            │   [Process cancellation with custom terms]
            │
            └─ NO → [Use default mutual cancellation terms]
                    |
                    v
                [Default mutual cancellation terms]
                ├─ Minimal penalties (5% processing fee)
                ├─ Split costs equally between parties
                ├─ Minor trust score impact (-5 points each)
                ├─ Organizer refund: 95% of payments made
                ├─ Artist compensation: 5% of booking value
                └─ Platform keeps processing fee only
                    |
                    v
                [Process refunds and compensations]
                    |
                    v
                [Update booking status]
                [Status = "Cancelled by Mutual Agreement"]
                    |
                    v
                [Free up calendars for both parties]
                    |
                    v
                [Send confirmation to both parties]
                "Booking cancelled by mutual agreement"
                ├─ Refund/compensation details
                ├─ Trust score impact (minimal)
                └─ Future collaboration encouraged
                    |
                    v
                [Record in analytics]
                [Tag as "amicable cancellation"]
                    |
                    v
                [END: Mutual cancellation completed]
═══════════════════════════════════════════════
 REFUND PROCESSING TIMELINE
═══════════════════════════════════════════════
[Cancellation approved]
    |
    v
[System initiates refund process]
    |
    v
[Determine refund method]
{Original payment method?}
    |
    ├─ Bank transfer → [NEFT/RTGS refund: 5-7 business days]
    ├─ UPI → [UPI refund: 2-3 business days]
    ├─ Card → [Card refund: 7-14 business days]
    └─ Net banking → [Bank refund: 5-7 business days]
        |
        v
[Process refund transaction]
    |
    v
{Refund successful?}
    |
    ├─ NO → [Retry refund]
    │       |
    │       v
    │   {Max retries failed?}
    │       |
    │       └─ YES → [Manual refund process]
    │               [Finance team intervention]
    │               [Contact user for alternative method]
    │               [Resolve within 48 hours]
    │
    └─ YES → Continue
        |
        v
[Send refund confirmation]
├─ Email notification
├─ In-app notification
├─ SMS alert
└─ Refund receipt with transaction ID
    |
    v
[Update financial records]
    |
    v
[Track refund in user account]
[Visible in transaction history]
    |
    v
[END: Refund processed successfully]
═══════════════════════════════════════════════
 DISPUTE ESCALATION (If Cancellation Rejected)
═══════════════════════════════════════════════
[Cancellation request denied]
    |
    v
{User disagrees with decision?}
    |
    └─ YES → [User files dispute]
        |
        v
        [Open dispute resolution ticket]
        ├─ Dispute ID generated
        ├─ Escalated to disputes team
        ├─ Both parties notified
        └─ Timeline: 7 days to resolve
            |
            v
        [Collect evidence from both parties]
        ├─ Original cancellation request
        ├─ Supporting documents
        ├─ Communication history
        ├─ Contract terms
        └─ Platform policies
            |
            v
        [Disputes team reviews case]
            |
            v
        {Resolution decision?}
            |
            ├─ Favor requester → [Override initial decision]
            │                   [Process cancellation with adjusted terms]
            │                   [Compensation for inconvenience]
            │                   |
            │                   v
            │               [END: Dispute resolved - Cancellation approved]
            │
            ├─ Favor other party → [Uphold initial decision]
            │                     [Booking must proceed]
            │                     [Explain reasoning]
            │                     |
            │                     v
            │                 [User can appeal (one time only)]
            │                     |
            │                     v
            │                 {User appeals?}
            │                     |
            │                     ├─ YES → [Senior management review]
            │                     │       [Final decision within 48 hours]
            │                     │       [Decision is binding]
            │                     │
            │                     └─ NO → [END: Dispute closed]
            │
            └─ Compromise solution → [Propose alternative resolution]
                                   [Example: Reschedule instead of cancel]
                                   [Partial compensation]
                                   [Modified terms]
                                   |
                                   v
                               {Both parties accept compromise?}
                                   |
                                   ├─ YES → [Implement compromise solution]
                                   │       [END: Dispute resolved]
                                   │
                                   └─ NO → [Further mediation required]
                                           [Senior management involvement]
                                           [Final binding decision]
                                           |
                                           v
                                       [END: Dispute resolved by arbitration]
```

---

[END OF CANCELLATION & REFUND FLOW]

```

```