# BANDWIDTH Calendar Management System — Production Masterplan
**Version 1.0** | **Created April 2026** | **Status: Ready for Implementation**

---

## Executive Summary

This document outlines the complete calendar management system for BANDWIDTH, the curator-led music booking platform. The calendar system is the operational nerve center for Artists, Organizers, and Venue Managers—enabling visibility into availability, bookings, deadlines, and earning potential.

**Strategic Objectives:**
- Eliminate scheduling chaos currently handled via WhatsApp and email
- Provide real-time, role-specific visibility into gig opportunities and commitments
- Enable data-driven insights on earning potential and booking patterns
- Create friction-free mobile experiences for on-the-go professionals
- Drive user engagement through gamification and trust-building features

**Target Launch:** Q2 2026 (Phase 1: MVP) | **Estimated Effort:** 320 person-hours across 4 phases

---

# PART 1: PRODUCT VISION

## 1.1 Vision Statement

**"BANDWIDTH Calendar is the single source of truth for music industry professionals—replacing WhatsApp chaos with professional workflows, data-driven insights, and frictionless booking management."**

The calendar system serves as the operational hub where:
- **Artists** see gig opportunities, plan availability, and maximize earning potential
- **Organizers** plan events with artist assignments, track deadlines, and manage logistics
- **Venue Managers** visualize bookings, optimize revenue, and prevent double-bookings
- **Admins** monitor system health, resolve disputes, and ensure contract compliance

## 1.2 Core Principles

1. **Trust & Transparency**: All parties see agreed-upon commitments. No surprise changes.
2. **Data Visibility**: Contextual insights drive better decisions (empty days missed, earning potential, booking patterns).
3. **Role-Centric Design**: Each role sees only relevant information; features adapt to workflows.
4. **Mobile-First Operations**: Professionals work on mobile; calendar must support quick decisions.
5. **Zero Ambiguity**: Timestamps, locations, and deadlines are never vague.

## 1.3 User Value Propositions

### For Artists
- **Availability Control**: Explicitly mark when you're available, traveling, or unavailable
- **Gig Discovery with Calendar Context**: See opportunities that fit your schedule
- **Earning Potential Insights**: "You left 12 slots empty last month—potential ₹45K missed"
- **Booking Timeline Clarity**: Clear deadlines for acceptance, negotiation, contract signing
- **Travel Planning**: Mark multi-city tours; system tracks logistics
- **Genre Filtering**: Filter gigs by style; calendar shows only relevant opportunities

### For Organizers
- **Event Planning Dashboard**: Multi-event view with artist assignments
- **Deadline Automation**: System reminds about negotiation and contract deadlines
- **Conflict Detection**: Alerts if proposed artist or venue conflicts with existing bookings
- **Contract Execution Timeline**: Clear visual of where deals stand (negotiation → contract → signed)
- **Venue Coordination**: See venue availability; prevent double-bookings
- **Financial Visibility**: Track committed spend vs. budget across events

### For Venue Managers
- **Booking Calendar**: See all confirmed events, revenue impact by date
- **Available Slots View**: Quick visual of open dates for programming
- **Revenue Analytics**: "This month: ₹2.4L from 6 shows" + trend analysis
- **Conflict Prevention**: Double-booking alerts
- **Event Optimization**: Suggests optimal scheduling based on capacity and audience patterns

### For Admins
- **System Oversight**: View any user's calendar with full audit trail
- **Dispute Context**: Quick access to booking timeline and all negotiation history
- **Compliance Monitoring**: Contracts missing signatures, overdue approvals
- **Intervention Tools**: Can manually adjust dates, deadlines, or booking status

## 1.4 Gamification & Engagement Strategy

### Artist Engagement Mechanics

**1. Earning Potential Insights**
- Weekly email: "You had 6 open slots last week. If booked at your typical rate, that's ₹28K in potential earnings"
- Dashboard metric: "Bookings vs. Available Slots" (show utilization %)
- Visualization: Empty days highlighted in red; prompt: "Fill this slot?"

**2. Streak Rewards**
- "5 gigs completed on time" → unlock badge + 5% fee discount on next booking
- "30-day zero cancellations" → promoted in organizer's search results
- Displayed on artist profile; contributes to trust score

**3. Booking Completion Badges**
- First booking: "Debut Performer"
- 10 bookings: "Venue Veteran"
- 50 bookings: "Industry Regular"
- Zero cancellations in 6 months: "Reliable Partner"
- Shown on profile; searched/filtered by organizers

**4. Location Unlock Mechanics**
- Once artist performs in a city, that city is marked "unlocked"
- Unlocked cities show "You've played here before" badge
- Goal: Build location diversity; motivate artists to tour

### Organizer/Venue Engagement Mechanics

**1. Booking Completion Metrics**
- Dashboard shows: "% of negotiations that ended in signed contracts"
- Benchmark: "60% platform average—you're at 78%, great job!"
- Trend chart: Success rate over time

**2. Trust Score Visibility**
- Organizer sees artist trust scores; 3-5 stars + breakdown (punctuality, communication, quality)
- Venue sees organizer reputation (payment reliability, contract adherence)
- Transparency builds trust; good actors incentivized to maintain high scores

**3. Seasonal Insights**
- "Q1 is your peak season: 12 events booked, ₹8.2L revenue"
- "January had 30% higher bookings than average—recommend similar programming"

### Push Notification as Gamification Lever
- Timely deadline reminders create FOMO ("2 hours left to respond to artist's counter-offer")
- Celebration notifications ("Congratulations! Contract signed and entered production phase")
- Comparative insights ("3 other venues in Bangalore booked artists this week")

## 1.5 Competitive Differentiation

| Feature | BANDWIDTH | Typical Ticketing Platform | WhatsApp Chain |
|---------|-----------|---------------------------|-----------------|
| **Booking Management** | Proposal → Negotiation → Contract → Payment | Not applicable | Unstructured |
| **Availability Visibility** | Real-time calendar with override rules | No artist availability | Text-based |
| **Deadline Enforcement** | Automated 72-hour windows, escalations | No deadlines | Manual follow-up |
| **Contract Automation** | Generated, sequentially editable, digitally signed | No contracts | Verbal agreements |
| **Trust Transparency** | Scores visible; history auditable | No reputation system | Gossip-based |
| **Data Insights** | Earning potential, booking patterns, location diversity | No analytics | Intuition |
| **Mobile Experience** | Touch-optimized, gesture-driven | Responsive but ticketing-focused | Ad hoc |
| **Dispute Resolution** | Audit trail, admin intervention, escrow | Limited | Lawyers |

---

# PART 2: FEATURE SPECIFICATION

## 2.1 Calendar Views & Navigation

### 2.1.1 Month View (Desktop/Tablet)

**Layout:**
- 7-column grid (Sunday–Saturday) with week rows
- Current month in focus; mini-calendar in left sidebar for quick navigation
- Today highlighted with blue circle; selected date with blue background

**Interactions:**
- **Click date**: Open day detail sheet (agenda view) for that date
- **Drag event**: Move booking to different date (if editable) → confirm in modal
- **Hover event**: Show tooltip with event name, time, artist/organizer, and status badge
- **Double-click date**: Open new event creation dialog (for organizers/venues only)

**Visual Indicators:**
- Confirmed bookings: solid color (green for completed, blue for scheduled)
- Negotiating bookings: striped pattern with yellow background
- Contracts pending signature: orange border + "⚠ Action needed" label
- Overdue actions (missed deadlines): red background with bell icon
- Empty available slots (for artists): light gray with "+" icon

**Mobile Variant:**
- Single-column layout; swipe left/right to move between months
- Touch targets minimum 48px × 48px
- Date text larger (18px); event summaries 1 line max with "…" truncation
- Swipe up from date to open agenda view

### 2.1.2 Week View (Planning Mode)

**Use Case:** Organizers planning multi-week programming; artists viewing weekly commitments

**Layout:**
- Horizontal timeline: Monday–Sunday across top
- Time slots vertically (08:00–23:00, 30-minute intervals)
- Current week highlighted; "Previous/Next week" buttons above

**Interactions:**
- **Click time slot**: Create new booking/event in that slot
- **Drag event across slots**: Reschedule (with conflict detection)
- **Hover time slot**: Show "Available" or highlight conflicts
- **Pinch to zoom (mobile)**: Adjust time granularity (1hr vs 30min intervals)

**Visual Indicators:**
- Booked slots: event card with artist/venue name
- Available slots: faint grid; tap to create
- Conflicted slots: red border + "Double-booking risk" alert
- Deadlines approach: gold/amber background

**Mobile Variant:**
- Scroll horizontally to see full week
- Days in large tabs at top; collapse/expand time ranges
- Support "3-day view" (Thursday–Saturday) for event-centric planning

### 2.1.3 Day / Agenda View (Mobile-First)

**Use Case:** Quick view of today/selected day; notifications and action items

**Layout:**
- Date header (large, 24px font)
- "Today", "Tomorrow", "This Week" filter buttons
- Sortable list: time-sorted upcoming bookings, deadlines, actions
- Bottom action card for next most-urgent task

**Interactions:**
- **Swipe date header left/right**: Navigate to previous/next day
- **Tap booking card**: Open full details + available actions
- **Tap "Mark Done"**: Quick close of accepted gig, signed contract, etc.
- **Pull to refresh**: Reload real-time data from server

**Visual Indicators:**
- Time: HH:MM with AM/PM
- Booking type icon: gig, contract, deadline, payment
- Status badge: "Awaiting Your Response", "Confirmed", "Complete"
- Urgency: Red (overdue), Orange (today/tomorrow), Green (future)

**Mobile Variant (Primary):**
- Full-screen immersive experience
- Large touch targets (56px minimum for buttons)
- Collapse/expand for detail vs. summary
- Haptic feedback on action completion

### 2.1.4 View Switching Patterns

**Navigation:**
- Top tabs: "Month | Week | Agenda"
- Remember user's preference (localStorage or profile setting)
- On mobile, default to Agenda; link to Month view via icon
- Desktop default: Month view with Week view in sidebar toggle

**State Persistence:**
- Keep selected date/week when switching views
- Preserve filters and time ranges
- Return to same view after navigation (e.g., clicking artist profile and returning)

**Responsive Breakpoints:**
| Breakpoint | Default View | Available Views |
|-----------|-------------|-----------------|
| < 480px (mobile) | Agenda | Agenda, Month (calendar icon) |
| 480–768px (tablet) | Week | Month, Week, Agenda |
| > 768px (desktop) | Month | Month, Week, Agenda (all in top nav) |

### 2.1.5 Touch-Friendly Interactions

**Gesture Support:**
- **Single tap**: Select/open
- **Long press** (1s): Open context menu (edit, delete, share)
- **Double tap**: Create event (for empty slots)
- **Swipe left/right**: Navigate between time periods
- **Pinch zoom**: Adjust time granularity (week view)
- **Pull to refresh**: Force reload from server
- **Two-finger swipe up**: Jump to today

**Haptic Feedback (iOS/Android):**
- Light tap on booking selection
- Strong tap on action completion
- Medium pulse when deadline approaching

**Button Sizing:**
- Minimum 48px × 48px (WCAG standard)
- 56px × 56px preferred for primary actions
- 44px × 44px minimum for dense screens (tablets)

---

## 2.2 Artist Features

### 2.2.1 Availability Calendar with Time Slot Management

**Purpose:** Artists explicitly declare when they're available for gigs, traveling, or unavailable.

**Data Model:**
```typescript
// New table: artist_availability_slots
{
  id: UUID,
  artistId: UUID,
  date: DATE,
  startTime: TIME,
  endTime: TIME,
  status: 'available' | 'unavailable' | 'tentative',
  reason?: 'other_gig' | 'travel' | 'personal' | null,
  isRecurring: boolean,
  recurringRule?: 'weekly' | 'biweekly' | null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
}
```

**UI Components:**

1. **Availability Bulk Editor**
   - Calendar picker with month/week selector
   - Quick-fill buttons: "Mark entire month available", "Bulk unavailable (vacation)"
   - Time slot editor: start/end time dropdowns (15-min intervals)
   - Reason dropdown: "Other booking", "Travel", "Personal/Rest", "No reason"
   - Recurring toggle: repeat weekly/biweekly

2. **Drag-Drop Slot Creation**
   - Click a date → open time picker modal
   - Select start/end time
   - Save → slot appears on calendar immediately
   - Delete via right-click context menu

3. **Conflict Detection**
   - If artist creates availability slot that overlaps a confirmed booking, show warning:
     "You have a gig scheduled on June 15 10:00–22:00. This availability overlaps."
   - Option to cancel new slot or mark conflicting booking as overbooked

**API Endpoints:**
```typescript
POST   /api/artists/availability           // Create slot
PUT    /api/artists/availability/:slotId   // Edit slot
DELETE /api/artists/availability/:slotId   // Delete slot
GET    /api/artists/availability           // List all slots for logged-in artist
```

**Business Logic:**
- Artists can override availability with confirmed bookings (shows conflict marker)
- Organizers see "Artist marked unavailable" when browsing; can still propose, but artist will reject
- Availability data feeds gig discovery algorithm (only show opportunities in available slots)

### 2.2.2 Gig Discovery with Calendar Integration

**Purpose:** Show Artists gigs that fit their schedule and interests.

**Existing Integration:**
- Gigs are already discoverable via `/artist/find-gigs`
- Extend: Add "Available on these dates" filter

**New Calendar Feature:**
- Gig card shows: event date, time, venue, artist fee, status
- Clicking gig opens side sheet with:
  - Event details (venue, capacity, genre, expected crowd)
  - Artist tech rider form (if organizer specified equipment)
  - Apply button (creates booking in `inquiry` status)
  - On mobile: full-screen overlay

**Filtered View:**
- Calendar on left; gigs list on right (desktop)
- Show gigs only for dates artist marked as available
- Filter by: genre, city, fee range, distance from artist location

**Mobile Variant:**
- Swipeable gig cards; swipe right to apply, left to skip
- Overlay current gig's date on calendar background
- "Apply" button floating at bottom with haptic feedback

### 2.2.3 Booking Timeline Visualization

**Purpose:** Show artist the entire lifecycle of a negotiation → contract → payment

**Timeline Component:**
```
[Applied] → [Organizer Reviews] → [Offer] → [Negotiating] → 
[Contract] → [Signatures] → [Confirmed] → [Payment] → [Completed]
```

**Interactions:**
- Tap each step to see: what happened, current status, action items
- Show timestamps: "Applied June 10 at 14:32" → "Organizer replied June 11 at 09:15"
- Color coding:
  - Blue (completed): Applied, Organizer Reviewed
  - Orange (in progress): Offer, Negotiating, Contract
  - Green (future): Signatures, Payment, Completed
  - Red (overdue): If deadline exceeded

**Key Information Displayed:**
- Negotiation deadline: "⏱ 2 hours remaining to respond"
- Contract signature deadline: "⏱ 72 hours for signatures"
- Payment status: "Advance paid June 20; final due June 30"
- All deadlines in user's timezone (with GMT offset shown)

### 2.2.4 Empty Slot Monetization (Insights)

**Purpose:** Drive artist engagement through earning potential awareness

**Dashboard Card:**
```
"You Left Money on the Table Last Month"

📅 Available Slots: 24
🎤 Booked Slots: 8
📊 Utilization: 33%

💰 Potential Missed: ₹45,000
(Based on your average fee: ₹1,875/gig)

💡 Insight: Venues in Bangalore are booking 60% of their available slots this month.
   Consider being more flexible on weekday bookings?

[See Similar Opportunities This Week] [Improve Availability]
```

**Calculation Logic:**
- Count artist's available slots (from availability_slots table, status='available')
- Count confirmed bookings that fall in available windows
- Utilization % = Bookings ÷ Slots
- Missed revenue = (Slots − Bookings) × Artist's average fee (from past 12 completed bookings)
- Industry benchmark comparison: Compare utilization to other artists in same genre/city

**Notification Trigger:**
- Calculate weekly on Monday morning
- Push if utilization < 40% AND artist has > 5 available slots
- Email digest every Sunday with insights

### 2.2.5 Travel/Vacation Marking

**Purpose:** Organizers know artist is unavailable; system prevents gig proposals

**UI:**
- Calendar: "Mark as traveling" button
- Modal: Date range selector + cities (multi-input autocomplete)
- Can mark multiple cities in a tour

**Data Model:**
```typescript
{
  artistId: UUID,
  startDate: DATE,
  endDate: DATE,
  cities: STRING[], // JSON array
  reason: 'tour' | 'personal_travel' | 'rest_period',
  notes?: string,
}
```

**Behavior:**
- Organizers see artist as unavailable during this period
- Cannot create new gigs; can only view artist profile (read-only)
- Artist can still accept existing offers if needed (override)
- Travel marked on artist profile (public badge: "Traveling to Mumbai & Pune, June 15-20")

### 2.2.6 Genre-Based Calendar Filtering

**Purpose:** Artists see only gigs matching their genres

**Filter Controls:**
- Checkboxes for all genres artist has on profile
- Tap to select/deselect
- Calendar & gig list update in real time

**Visual Implementation:**
- Genre chips with color coding (e.g., "Jazz" = purple, "Electronic" = teal)
- Calendar events show as colored dots matching artist's preferred genres
- Desktop: sidebar filter; mobile: collapsible modal

**API Enhancement:**
```typescript
GET /api/artists/find-gigs?genres[]=jazz&genres[]=soul&availableOnly=true
```

### 2.2.7 Acceptance/Rejection Workflows

**Current State (from schema):**
- Booking status: `inquiry → offered → negotiating → contracting → confirmed → …`

**Calendar Integration:**
- Action card on day view: "Gig Proposed: [Venue] [Fee]"
- Two buttons: [Accept] [Decline]
- Accept → booking moves to `offered` status; calendar updates to show tentative booking
- Decline → booking moves to `cancelled`; calendar removes slot
- Show reason modal on decline (optional): "Not interested", "Fee too low", "Too far to travel", "Already booked"

---

## 2.3 Organizer Features

### 2.3.1 Event Calendar with Artist Assignments

**Purpose:** Organizers see all their events and which artists are booked

**Layout:**
- Month view default (like artist calendar)
- Each event card shows: date, time, venue, booked artist, booking status
- Color coding by status:
  - Green: Confirmed (contract signed)
  - Blue: Scheduled (contract signed, awaiting payment)
  - Orange: Negotiating (still in negotiation phase)
  - Yellow: Inquiry (artist applied, waiting for organizer review)
  - Red: Cancelled or disputed

**Interactions:**
- Click event: Open event detail sheet
  - Show artist name (clickable → profile modal)
  - Show negotiation status, contract status, payment status
  - Show timeline (as in artist view)
  - Action buttons: Continue Negotiation, View Contract, Mark as Completed, Cancel Event

**New Event Creation:**
- Double-click date on calendar → Event creation form
- Fields: event name, date, time, venue, expected audience, budget range
- On save: Event created in DB (status: `draft`); calendar updates
- Next step: Organizer posts opportunity for artists to apply (or directly invite)

### 2.3.2 Booking Deadline Tracking

**Purpose:** Never miss a negotiation or signature deadline

**Deadline System:**
```
Negotiation Deadline: NOW + 72 hours (from when offer made)
Contract Signature Deadline: When both parties accept proposal → NOW + 72 hours
Payment Deadline: Contract signed → agreed payment schedule
```

**Calendar Visualization:**
- Red "⏱" icon on dates with approaching deadlines (< 24 hrs)
- Amber "⏱" for 24–72 hours
- Dashboard card: "Urgent Deadlines" listing all deadlines in next 7 days
  - Sorted by time (soonest first)
  - Show action item: "Waiting for Artist Response: [Fee] [Slot]"

**Notifications:**
- 24 hours before: Email + push notification
- 6 hours before: Push notification only
- 1 hour before: In-app popup + email (escalation)
- After deadline: "Deadline passed" alert; allow organizer to extend or walk away

**API:**
```typescript
GET /api/organizers/deadlines  // Returns array of upcoming deadlines with action items
POST /api/organizers/deadlines/:bookingId/extend  // Extend deadline by 24 hours (limit 2x)
```

### 2.3.3 Venue Availability Management

**Purpose:** Prevent double-bookings; coordinate with venue managers

**Data Model:**
```typescript
// New table: venue_availability_windows
{
  id: UUID,
  venueId: UUID,
  startDate: DATE,
  endDate: DATE,
  startTime: TIME,
  endTime: TIME,
  status: 'available' | 'blocked_for_event' | 'maintenance' | 'private_event',
  eventId?: UUID,  // If blocked_for_event
  notes?: string,
}
```

**UI:**
- Organizer creates event
- Modal: Select venue + proposed dates
- System shows: "Venue available June 15, 18:00–23:00" or "Venue booked June 16 (another event)"
- Organizer chooses from available windows
- On saving event: Venue marked as "blocked_for_event" for that date/time

**Conflict Detection:**
- If organizer tries to book same venue twice in same window, show error:
  "Venue already booked June 20 19:00–23:00. Choose a different date or venue."

**Coordination with Venue Manager:**
- Venue manager sees: "Organizer [Name] proposing event June 20, 19:00. Awaiting your confirmation."
- Venue manager can: Approve (confirm), Suggest alternative date, Decline
- If declined: Organizer notified; must choose different venue or date

### 2.3.4 Multi-Event Planning View

**Purpose:** See all events for a season/quarter at once

**View Options:**
1. **Grid View**: Month calendar with all events color-coded by status
2. **Timeline View**: Horizontal Gantt-style chart showing events across weeks/months
3. **List View**: Table with event name, date, artist, fee, status, actions

**Interactions:**
- Drag event to new date (triggers conflict check)
- Bulk edit: Select multiple events, change season/status
- Export: "Download PDF schedule for Q1 2026"
- Print: Print-optimized calendar

**Mobile Variant:**
- Swappable view toggle (Grid ↔ Timeline ↔ List)
- Timeline view shows 2-week window (scroll horizontally)

### 2.3.5 Conflict Detection

**Scenarios:**
1. **Double-booking same venue**: Organizer tries to book Venue A twice on same date → error
2. **Artist double-booking**: Organizer proposes gig to Artist; artist already has confirmed booking → warning (allow override with artist consent)
3. **Contract signature conflicts**: Artist cannot sign 2 contracts for overlapping dates → system prevents

**Implementation:**
```typescript
// service: booking.service.ts, new method: detectConflicts()
async function detectConflicts(
  organizerId: UUID,
  venueId: UUID,
  artistId: UUID,
  startDate: DATE,
  endTime: TIME
): Promise<Conflict[]> {
  // Check venue bookings, artist bookings, contract timelines
  // Return: [] if clear, or [{ type, message, severity }]
}
```

**UI Response:**
- Green checkmark if clear
- Orange alert if warning (allow override)
- Red error if conflict prevents booking (must resolve)

### 2.3.6 Timeline for Contract Execution

**Integrated in Booking Timeline (see Section 2.2.3):**
- Visual show each contract milestone
- "Organizer edits: June 15 14:32 → June 15 15:47"
- "Artist edits: June 15 16:00 → (awaiting organizer acceptance)"
- "Both signed: June 16 10:15"
- "Admin approval pending: (24 hours waiting)"
- "PDF generated: June 16 11:30" (shows watermark preview)

---

## 2.4 Venue Manager Features

### 2.4.1 Booking Calendar View

**Purpose:** Venue managers see all confirmed events at their venue

**Layout:**
- Month view with confirmed events only (excluding inquiries/negotiations)
- Each event card: date, time, organizer name, artist name, capacity used %
- Status badge: "Confirmed" (green), "Completed" (gray), "Cancelled" (red)

**Interactions:**
- Tap event: Show organizer contact, artist profile, start/end time, setup time
- Swipe left: Quick-delete (with confirm modal)

**Mobile:**
- Full-screen calendar view
- Bottom drawer with event list for selected day

### 2.4.2 Revenue Tracking by Date

**Purpose:** Understand financial impact of events

**Dashboard Card:**
```
Revenue This Month: ₹2,84,500 (7 events)

📊 Breakdown by Week:
   Week 1: ₹48,200 (2 events)
   Week 2: ₹64,100 (2 events)
   Week 3: ₹89,700 (2 events)
   Week 4: ₹82,500 (1 event)

📈 Best Days: Friday (avg ₹38K), Saturday (avg ₹41K)
📉 Slowest Days: Tuesday (avg ₹22K), Wednesday (avg ₹20K)

💡 Recommendation: More 2-event weekend programming
```

**Calculation:**
- Sum of `booking.grossBookingValue` for confirmed bookings with completed or scheduled status
- Grouped by week or day of week
- Exclude cancelled/disputed bookings

**Alerts:**
- If venue has no bookings in next 7 days: "Your calendar is empty. Post opportunity?"
- If revenue < threshold (e.g., < 50% of monthly average): "Low booking period. Consider promotions?"

### 2.4.3 Venue Availability Slots

**Purpose:** Organizers see when venue is available for events

**UI:** (From organizer's side, venue manager sets up)
- Venue manager marks available windows: "Every Friday 18:00–23:00" or "June 20, 19:00–22:00"
- Data stored in `venue_availability_windows` table
- Organizers see green "Available" badges on those slots

**Venue Manager Controls:**
- Modal: Date range + time range + recurring rule (weekly, specific days)
- Quick buttons: "Always available", "Weekends only", "Closed for 2 weeks (maintenance)"
- Edit/delete individual windows

**API:**
```typescript
POST   /api/venues/availability          // Create window
PUT    /api/venues/availability/:id      // Edit
DELETE /api/venues/availability/:id      // Delete
GET    /api/venues/availability          // List
```

### 2.4.4 Double-Booking Prevention

**Validation:**
- System checks: Is this date/time already booked for another event?
- If yes: Organizer gets error: "Venue already booked on June 20. Choose a different date."

**Venue Manager Override:**
- Can mark venue as "Available for multiple simultaneous events"? (e.g., festival with multiple stages)
- Toggle in venue profile: "Allow simultaneous events: YES/NO"

### 2.4.5 Event Schedule Optimization

**Purpose:** Data-driven suggestions for programming

**Analysis:**
- Historical revenue by day of week and time slot
- Crowd size patterns by genre and time
- Correlation between artist type and attendance

**Insights Card:**
```
📊 Optimization Suggestions

1. Your Saturday 20:00 slot has highest revenue (avg ₹52K, 5 events)
   Current bookings: 3 | Available: 2 of 4 Saturdays

2. Jazz events on Thursdays underperform (avg 45 attendees)
   Try pop/electronic or move to Friday

3. You've booked 8 artists from Bangalore, 0 from other cities
   Consider 1–2 touring acts next quarter to diversify audience

[View Analytics Dashboard] [See Detailed Breakdown]
```

---

## 2.5 Admin Features

### 2.5.1 View Any User's Calendar (Override)

**Purpose:** Admins resolve disputes, investigate issues

**Route:**
```
GET /api/admin/users/:userId/calendar
```

**Returns:**
- Full calendar view (all bookings, all statuses, all negotiations)
- Includes private/blocked slots normally hidden
- Shows artist's availability slots, travel marks, etc.

**UI:**
- Same calendar layout as user's own view
- Red banner at top: "You are viewing [User]'s calendar"
- Cannot edit; can only view (or use intervention tools below)

**Permissions:**
- Only platform_admin role (`musicapp`)
- Logged in audit trail: "Admin viewed User calendar"

### 2.5.2 Audit Trail of Calendar Changes

**Purpose:** Detect anomalies, enforce compliance

**Tracked Events:**
- Availability slot created/deleted
- Booking created/status changed
- Travel mark added/removed
- Contract milestone reached
- Signature timestamp

**Data Model:**
```typescript
// Enhanced auditLogs table
{
  id: UUID,
  userId: UUID,
  action: 'calendar_availability_created' | 'booking_status_changed' | 'contract_signed' | ...,
  entityType: 'calendar_availability' | 'booking' | 'contract' | ...,
  entityId: UUID,
  changes: {
    before?: any,
    after?: any,
    timestamp: TIMESTAMP,
    ipAddress: INET,
    userAgent?: string,
  },
  createdAt: TIMESTAMP,
}
```

**Admin View:**
- Access at `/admin/audit-logs`
- Filters: User, Date range, Action type, Entity type
- Export as CSV for compliance

### 2.5.3 System-Wide Event Monitoring

**Purpose:** Alert admins to anomalies (fraud, systemic issues)

**Alerts Triggered By:**
1. Artist with 5+ cancelled bookings in 30 days → Flag for trust score review
2. Organizer negotiating fee > 3x venue's average rate → Potential error or special act
3. Contract changes > 5 times → Possible dispute brewing
4. Multiple events booked for same venue at same time (after venue manager oversight fails)
5. Booking deadline exceeded > 24 hours with no action → Automatic escalation

**Admin Dashboard Alert Panel:**
```
🚨 System Alerts (7 Active)

1. [High] Artist cancelation spike: rajesh_dj (5 cancellations in 7 days)
   Action: [Review] [Suspend] [Ignore]

2. [Medium] Venue double-booking: Space Mumbai (June 20, 2 simultaneous events)
   Action: [Resolve] [Contact Manager] [Ignore]

3. [Low] Contract renegotiation (6 rounds): Gig [Event], [Artist], [Organizer]
   Action: [Monitor] [Intervene] [Ignore]

4. [High] Overdue signature deadline: [Event] (72 hours exceeded)
   Action: [Extend] [Cancel Booking] [Escalate]
```

**Intervention Tools:**
- Extend deadline by 24 hours
- Force booking status change (with reason logged)
- Suspend user (temporary or permanent)
- Send templated message to user

### 2.5.4 Dispute Resolution Context

**Route:**
```
GET /api/admin/disputes/:disputeId/context
```

**Returns Complete Timeline:**
- All booking status changes with timestamps
- Full negotiation transcript (proposals, counter-offers, messages)
- Contract versions and signature timestamps
- Payment history (deposits, balances, refunds)
- All messages in conversation thread
- Audit log of changes to booking/contract

**UI:**
- Full-screen view with timeline on left, details on right
- Sticky header with dispute status and resolution options
- Color-coded events: green (compliant), orange (warning), red (violation)

---

## 2.6 Location Features

### 2.6.1 City-Level Display (Not Precise)

**Purpose:** Protect privacy while enabling discovery

**Implementation:**
- All location data stored at city level (or higher) in public views
- Address stored in user profile but not exposed in gig listings
- Artists see: "Event in Bangalore" (not exact venue address)
- Organizers/venue managers see: "Artist based in Mumbai" (not street address)

**API Response Example:**
```typescript
// Artist gig discovery response
{
  id: UUID,
  eventName: string,
  city: 'Bangalore',  // Public
  startDate: DATE,
  endTime: TIME,
  artistFee: INR,
  addressLine?: null,  // Not exposed in public view
}
```

### 2.6.2 Location Visibility Toggles (Public/Private/Role-Based)

**Purpose:** Granular control over who sees what

**User Settings (Profile > Privacy):**

| Setting | Public | Promoters | Venues | Admins |
|---------|--------|-----------|--------|--------|
| **Show City** | ✓ | ✓ | ✓ | ✓ |
| **Show Address** | Toggle | Toggle | Toggle | Always |
| **Show Travel History** | ✗ | ✓ | ✓ | ✓ |
| **Show Availability** | Toggle | Toggle | Toggle | ✓ |

**Data Model:**
```typescript
// Users table, privacy_settings JSONB column
{
  showCity: boolean,
  showAddress: boolean,
  showTravelHistory: boolean,
  showAvailability: boolean,
  // Role-specific overrides:
  visibleToRoles: ('artist' | 'organizer' | 'venue_manager' | 'curator')[],
}
```

### 2.6.3 Location-Based Confirmation (Booking Location)

**Purpose:** Ensure artist and organizer agree on exact venue location

**Workflow:**
1. Organizer creates event at Venue A (address: "123 MG Road, Bangalore")
2. Artist sees gig in "Bangalore" (city view)
3. After applying/being offered: Full venue details revealed (address, maps link)
4. Artist confirms: "Yes, this venue location works for me"
5. Confirmation recorded: booking.meta.locationConfirmedAt = NOW

**API:**
```typescript
PATCH /api/bookings/:bookingId/confirm-location
Body: { confirmedLatitude?, confirmedLongitude?, confirmed: true }
```

**Conflict Detection:**
- If artist located in Mumbai, gig in Bangalore + no confirmed travel mark → suggest rescheduling

### 2.6.4 Optional Location Tracking

**Purpose:** For disputes/fraud; artist attendance verification

**Feature (Admin-only):**
- During event day, admin can request artist GPS location
- Artist receives notification: "Are you at [Venue]?" + "Share Location" button
- Artist taps → location captured (sent to server, compared to venue coordinates)
- If > 5km away: Flag for dispute team
- Location data deleted after 30 days

**Privacy:**
- Opt-in; artists can decline (no penalty)
- Only active during event day/time
- Admins only (not visible to organizers)
- Logged in audit trail

### 2.6.5 Location Caching Strategy

**Purpose:** Minimize API calls, support offline mode

**Strategy:**
- Cache venue addresses in browser localStorage (with 7-day TTL)
- On app start: Invalidate cache if > 7 days old
- When artist clicks "View Full Details": Fetch fresh address from server
- Background sync: Refresh cached locations every 12 hours

**Implementation:**
```typescript
// client/src/lib/location-cache.ts
const cache = {
  get: (venueId: UUID) => localStorage.getItem(`venue_${venueId}`),
  set: (venueId: UUID, address: string) => {
    const withTTL = { data: address, expiresAt: Date.now() + 7*24*60*60*1000 };
    localStorage.setItem(`venue_${venueId}`, JSON.stringify(withTTL));
  },
  isExpired: (venueId: UUID) => {
    const item = localStorage.getItem(`venue_${venueId}`);
    return !item || JSON.parse(item).expiresAt < Date.now();
  },
};
```

---

# PART 3: TECHNICAL ARCHITECTURE

## 3.1 Database Schema Additions

### 3.1.1 Calendar Events & Availability Tables

```sql
-- Artist availability slots
CREATE TABLE artist_availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status availability_status_enum NOT NULL DEFAULT 'available',
    -- ENUM: 'available' | 'unavailable' | 'tentative'
  reason availability_reason_enum,
    -- ENUM: 'other_gig' | 'travel' | 'personal' | NULL
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_rule recurring_rule_enum,
    -- ENUM: 'weekly' | 'biweekly' | NULL
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT time_order CHECK (start_time < end_time),
  CONSTRAINT future_date CHECK (date >= CURRENT_DATE),
  INDEX (artist_id, date),
  INDEX (artist_id, status),
);

-- Venue availability windows
CREATE TABLE venue_availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status venue_availability_status_enum NOT NULL DEFAULT 'available',
    -- ENUM: 'available' | 'blocked_for_event' | 'maintenance' | 'private_event'
  event_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT date_order CHECK (start_date <= end_date),
  CONSTRAINT time_order CHECK (start_time < end_time),
  INDEX (venue_id, start_date),
  INDEX (venue_id, status),
);

-- Artist travel/unavailability periods
CREATE TABLE artist_travel_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason travel_reason_enum NOT NULL,
    -- ENUM: 'tour' | 'personal_travel' | 'rest_period'
  cities TEXT[] NOT NULL,  -- Array of city names
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT date_order CHECK (start_date <= end_date),
  INDEX (artist_id, start_date),
  INDEX (artist_id, end_date),
);

-- Calendar preferences & settings (per-user)
CREATE TABLE calendar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  default_view calendar_view_enum NOT NULL DEFAULT 'month',
    -- ENUM: 'month' | 'week' | 'agenda'
  time_format time_format_enum NOT NULL DEFAULT '24h',
    -- ENUM: '24h' | '12h'
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  week_starts_on day_of_week_enum NOT NULL DEFAULT 'sunday',
    -- ENUM: 'sunday' | 'monday'
  notifications_enabled BOOLEAN DEFAULT TRUE,
  reminder_minutes INTEGER[] DEFAULT ARRAY[1440, 60],  -- 24hrs, 1hr
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
);

-- Notification triggers for calendar events (when to notify user)
CREATE TABLE calendar_notification_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type calendar_trigger_type_enum NOT NULL,
    -- ENUM: 'booking_deadline_1day' | 'booking_deadline_1hr'
    --       'contract_signature_3day' | 'contract_signature_1day'
    --       'payment_due_7day' | 'payment_due_1day'
    --       'event_day_reminder'
  event_key VARCHAR(255) NOT NULL,  -- Foreign key-like: booking:123, contract:456
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  channel notification_channel_enum NOT NULL,
    -- ENUM: 'in_app' | 'email' | 'sms' | 'push'
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (user_id, trigger_type),
  INDEX (scheduled_at),
  INDEX (sent_at),
  CONSTRAINT unique_trigger UNIQUE (user_id, event_key, trigger_type),
);

-- ENUMS to add to schema.ts
export const availabilityStatusEnum = pgEnum("availability_status", ["available", "unavailable", "tentative"]);
export const availabilityReasonEnum = pgEnum("availability_reason", ["other_gig", "travel", "personal", null]);
export const recurringRuleEnum = pgEnum("recurring_rule", ["weekly", "biweekly"]);
export const venueAvailabilityStatusEnum = pgEnum("venue_availability_status", ["available", "blocked_for_event", "maintenance", "private_event"]);
export const travelReasonEnum = pgEnum("travel_reason", ["tour", "personal_travel", "rest_period"]);
export const calendarViewEnum = pgEnum("calendar_view", ["month", "week", "agenda"]);
export const timeFormatEnum = pgEnum("time_format", ["24h", "12h"]);
export const dayOfWeekEnum = pgEnum("day_of_week", ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);
export const calendarTriggerTypeEnum = pgEnum("calendar_trigger_type", [
  "booking_deadline_1day",
  "booking_deadline_1hr",
  "contract_signature_3day",
  "contract_signature_1day",
  "payment_due_7day",
  "payment_due_1day",
  "event_day_reminder",
]);
```

### 3.1.2 Schema Updates to Existing Tables

```sql
-- bookings table: add calendar-related fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS
  location_confirmed_at TIMESTAMP,
  
  event_start_location_city VARCHAR(128),
  event_start_location_address TEXT,
  event_start_location_lat NUMERIC(10, 8),
  event_start_location_lng NUMERIC(11, 8),
  
  actual_artist_location_lat NUMERIC(10, 8),
  actual_artist_location_lng NUMERIC(11, 8),
  actual_artist_location_verified_at TIMESTAMP;

-- users table: add privacy settings (JSONB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  privacy_settings JSONB DEFAULT '{}',
  calendar_timezone VARCHAR(64) DEFAULT 'UTC';

-- venues table: enhanced
ALTER TABLE venues ADD COLUMN IF NOT EXISTS
  allow_simultaneous_events BOOLEAN DEFAULT FALSE,
  primary_contact_phone VARCHAR(20),
  primary_contact_email VARCHAR(255);
```

---

## 3.2 Frontend Architecture

### 3.2.1 Calendar Component Selection

**Recommendation: Use `react-big-calendar` with custom styling**

**Rationale:**
- Mature, widely-adopted calendar library
- Supports multiple view modes (month, week, day, agenda)
- Excellent React integration with TypeScript support
- Customizable styling (easy Tailwind integration)
- Good mobile gesture support with plugins
- Active maintenance and large community

**Installation:**
```bash
npm install react-big-calendar date-fns
npm install --save-dev @types/react-big-calendar
```

**Alternative (if `react-big-calendar` insufficient):**
- `@dnd-kit/core` for drag-drop event rescheduling
- `geist-ui/calendar` for lightweight alternative (newer, less battle-tested)

### 3.2.2 State Management for Real-Time Updates

**Pattern: TanStack Query + WebSocket**

**Query Keys Structure:**
```typescript
// client/src/hooks/use-calendar-queries.ts
export const calendarKeys = {
  all: ['calendar'] as const,
  artist: {
    all: [...calendarKeys.all, 'artist'] as const,
    availability: (artistId: UUID) => [...calendarKeys.artist.all, 'availability', artistId] as const,
    bookings: (artistId: UUID) => [...calendarKeys.artist.all, 'bookings', artistId] as const,
    travelMarks: (artistId: UUID) => [...calendarKeys.artist.all, 'travel', artistId] as const,
  },
  organizer: {
    all: [...calendarKeys.all, 'organizer'] as const,
    events: (organizerId: UUID) => [...calendarKeys.organizer.all, 'events', organizerId] as const,
    deadlines: (organizerId: UUID) => [...calendarKeys.organizer.all, 'deadlines', organizerId] as const,
  },
  venue: {
    all: [...calendarKeys.all, 'venue'] as const,
    bookings: (venueId: UUID) => [...calendarKeys.venue.all, 'bookings', venueId] as const,
    availability: (venueId: UUID) => [...calendarKeys.venue.all, 'availability', venueId] as const,
  },
};
```

**WebSocket Integration (Existing `ws.ts`):**
- Extend current WebSocket handler to emit calendar events
- Events: `booking:status:changed`, `contract:signed`, `deadline:approaching`, `availability:updated`
- On receive: Call `queryClient.invalidateQueries({ queryKey: calendarKeys.artist.bookings(artistId) })`

**Optimistic Updates:**
```typescript
// Example: Artist marks availability
const addAvailabilityMutation = useMutation({
  mutationFn: async (slot: AvailabilitySlot) => {
    return fetch('/api/artists/availability', { method: 'POST', body: JSON.stringify(slot) }).then(r => r.json());
  },
  onMutate: async (newSlot) => {
    // Optimistically update UI
    await queryClient.cancelQueries({ queryKey: calendarKeys.artist.availability(currentArtistId) });
    const prevData = queryClient.getQueryData(calendarKeys.artist.availability(currentArtistId));
    queryClient.setQueryData(calendarKeys.artist.availability(currentArtistId), (old: any[]) => [...old, newSlot]);
    return { prevData };
  },
  onError: (error, newSlot, context) => {
    if (context?.prevData) {
      queryClient.setQueryData(calendarKeys.artist.availability(currentArtistId), context.prevData);
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: calendarKeys.artist.availability(currentArtistId) });
  },
});
```

### 3.2.3 Mobile Responsiveness Strategy

**Breakpoint Approach:**

```typescript
// client/src/lib/responsive.ts
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export const useResponsive = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = debounce(() => setWidth(window.innerWidth), 100);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  
  return {
    isMobile: width < BREAKPOINTS.tablet,
    isTablet: width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop,
    isDesktop: width >= BREAKPOINTS.desktop,
  };
};
```

**View Mode Selection by Device:**
```typescript
// Default view based on device size
export const CalendarPage = () => {
  const { isMobile, isTablet } = useResponsive();
  const [view, setView] = useState(() => {
    if (isMobile) return 'agenda';
    if (isTablet) return 'week';
    return 'month';
  });
  
  return <Calendar view={view} onViewChange={setView} />;
};
```

**CSS Grid for Responsive Layouts:**
```css
/* Month view responsive */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .calendar-grid {
    grid-template-columns: 1fr;
  }
  
  .event-card {
    padding: 0.75rem;
    font-size: 0.875rem;
  }
}
```

### 3.2.4 Offline Support

**Strategy: Service Worker + LocalStorage Cache**

**Offline Actions (allowed without network):**
- View cached calendar data (bookings, availability)
- Mark availability slot as draft (stored in localStorage)
- View event details (cached)

**Sync on Reconnect:**
- Service worker detects connection restored
- Flush all draft changes to server
- Refresh calendar data

**Implementation:**
```typescript
// client/src/lib/offline-cache.ts
export class OfflineCalendarCache {
  private dbName = 'BANDWIDTH_Calendar';
  private dbVersion = 1;
  
  async saveBookings(bookings: Booking[]) {
    const db = await this.openDB();
    const tx = db.transaction('bookings', 'readwrite');
    bookings.forEach(b => tx.store.put(b));
    await tx.done;
  }
  
  async getBookings(): Promise<Booking[]> {
    const db = await this.openDB();
    return db.getAll('bookings');
  }
  
  async queuePendingChange(change: PendingChange) {
    const db = await this.openDB();
    await db.add('pending', change);
  }
  
  async flushPending() {
    const db = await this.openDB();
    const pending = await db.getAll('pending');
    for (const change of pending) {
      try {
        await this.syncChange(change);
        await db.delete('pending', change.id);
      } catch (err) {
        console.error('Sync failed, will retry:', err);
      }
    }
  }
}
```

---

## 3.3 Backend Services

### 3.3.1 Calendar Services Architecture

**New service file: `server/services/calendar.service.ts`**

```typescript
/**
 * Calendar Service — orchestrates all calendar-related operations
 */

class CalendarService {
  /**
   * Artist availability management
   */
  async createAvailabilitySlot(
    artistId: UUID,
    slot: { date: DATE, startTime: TIME, endTime: TIME, reason?: string }
  ): Promise<AvailabilitySlot> {
    // Validate: no overlap with confirmed bookings
    const conflicts = await this.checkAvailabilityConflicts(artistId, slot.date, slot.startTime, slot.endTime);
    if (conflicts.length > 0) {
      throw new ConflictError(`Overlaps with booking: ${conflicts[0].bookingId}`);
    }
    
    // Create slot
    const created = await storage.createAvailabilitySlot(artistId, slot);
    
    // Emit event for WebSocket broadcast
    eventBus.emit('artist:availability:created', {
      artistId,
      slotId: created.id,
      timestamp: new Date(),
    });
    
    return created;
  }
  
  async deleteAvailabilitySlot(artistId: UUID, slotId: UUID): Promise<void> {
    const slot = await storage.getAvailabilitySlot(slotId);
    if (slot.artistId !== artistId) throw new UnauthorizedError();
    
    await storage.deleteAvailabilitySlot(slotId);
    eventBus.emit('artist:availability:deleted', { artistId, slotId });
  }
  
  async getArtistCalendar(
    artistId: UUID,
    startDate: DATE,
    endDate: DATE
  ): Promise<CalendarData> {
    const [availability, bookings, travels] = await Promise.all([
      storage.getAvailabilitySlots(artistId, startDate, endDate),
      storage.getArtistBookings(artistId, startDate, endDate),
      storage.getArtistTravelMarks(artistId, startDate, endDate),
    ]);
    
    return {
      availability,
      bookings: bookings.map(transformBookingToCalendarEvent),
      travels: travels.map(transformTravelToCalendarEvent),
      insights: this.calculateArtistInsights(artistId, availability, bookings),
    };
  }
  
  /**
   * Organizer event management
   */
  async createEvent(
    organizerId: UUID,
    eventData: { name: string, date: DATE, startTime: TIME, endTime: TIME, venueId: UUID }
  ): Promise<Event> {
    // Validate venue availability
    const isAvailable = await storage.isVenueAvailable(
      eventData.venueId,
      eventData.date,
      eventData.startTime,
      eventData.endTime
    );
    if (!isAvailable) {
      throw new ConflictError('Venue not available at this time');
    }
    
    // Create event
    const event = await storage.createEvent(organizerId, eventData);
    
    // Mark venue as blocked for this event
    await storage.createVenueAvailabilityWindow({
      venueId: eventData.venueId,
      startDate: eventData.date,
      endDate: eventData.date,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      status: 'blocked_for_event',
      eventId: event.id,
    });
    
    return event;
  }
  
  /**
   * Deadline management
   */
  async getUpcomingDeadlines(
    organizerId: UUID,
    days: number = 7
  ): Promise<Deadline[]> {
    const bookings = await storage.getOrganizerBookings(organizerId);
    const deadlines: Deadline[] = [];
    
    for (const booking of bookings) {
      const deadlineDate = booking.flowDeadlineAt;
      if (!deadlineDate) continue;
      
      const daysUntil = Math.floor((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil <= days) {
        deadlines.push({
          bookingId: booking.id,
          type: booking.status === 'offered' ? 'negotiation' : 'signature',
          dueAt: deadlineDate,
          daysRemaining: daysUntil,
          actionItem: this.getActionItem(booking),
        });
      }
    }
    
    return deadlines.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  }
  
  /**
   * Conflict detection
   */
  async detectConflicts(
    organizerId: UUID,
    venueId: UUID,
    artistId: UUID,
    eventDate: DATE,
    startTime: TIME,
    endTime: TIME
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    // Check venue double-booking
    const venueBooked = await storage.isVenueAvailable(venueId, eventDate, startTime, endTime);
    if (!venueBooked) {
      conflicts.push({
        type: 'venue_double_booking',
        severity: 'error',
        message: 'Venue already booked at this time',
      });
    }
    
    // Check artist double-booking
    const artistBooked = await storage.getArtistBookings(artistId, eventDate, eventDate);
    if (artistBooked.length > 0) {
      conflicts.push({
        type: 'artist_double_booking',
        severity: 'warning',
        message: 'Artist has another confirmed booking at this time',
        relatedBooking: artistBooked[0].id,
      });
    }
    
    // Check artist availability
    const artistAvailable = await storage.hasArtistAvailability(artistId, eventDate, startTime, endTime);
    if (!artistAvailable) {
      conflicts.push({
        type: 'artist_unavailable',
        severity: 'warning',
        message: 'Artist marked as unavailable during this period',
      });
    }
    
    return conflicts;
  }
  
  /**
   * Insights calculation
   */
  private calculateArtistInsights(
    artistId: UUID,
    availability: AvailabilitySlot[],
    bookings: Booking[]
  ): ArtistInsights {
    const totalSlots = availability.filter(a => a.status === 'available').length;
    const bookedSlots = bookings.filter(b => b.status === 'confirmed' || b.status === 'scheduled').length;
    const utilization = totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;
    
    // Calculate average fee from past 12 completed bookings
    const pastBookings = bookings.filter(b => b.status === 'completed').slice(-12);
    const avgFee = pastBookings.length > 0
      ? pastBookings.reduce((sum, b) => sum + Number(b.artistFee), 0) / pastBookings.length
      : 0;
    
    const missedRevenue = (totalSlots - bookedSlots) * avgFee;
    
    return {
      totalSlots,
      bookedSlots,
      utilization,
      averageFee: avgFee,
      missedRevenue,
      benchmark: 60,  // Platform average 60%
    };
  }
}

export const calendarService = new CalendarService();
```

### 3.3.2 Real-Time Sync (WebSocket Integration)

**Extend existing `server/ws-server.ts`:**

```typescript
// New event types for calendar
export type CalendarEvent = 
  | { type: 'availability:created', artistId: UUID, slotId: UUID }
  | { type: 'availability:deleted', artistId: UUID, slotId: UUID }
  | { type: 'booking:status:changed', bookingId: UUID, newStatus: BookingStatus }
  | { type: 'contract:signed', contractId: UUID, signer: 'artist' | 'organizer' }
  | { type: 'deadline:approaching', bookingId: UUID, hoursRemaining: number }
  | { type: 'location:confirmed', bookingId: UUID };

// Broadcast to specific users
export function broadcastCalendarEvent(userIds: UUID[], event: CalendarEvent) {
  for (const userId of userIds) {
    const client = clients.get(userId);
    if (client?.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'calendar', payload: event }));
    }
  }
}

// Subscribe to event bus, broadcast to affected users
eventBus.on('availability:created', (event) => {
  broadcastCalendarEvent([event.artistId], {
    type: 'availability:created',
    artistId: event.artistId,
    slotId: event.slotId,
  });
});
```

### 3.3.3 Timezone Handling

**Pattern: Store UTC, convert on display**

```typescript
// Utility functions: server/utils/timezone.ts

export function getUserTimezone(user: User): string {
  return user.calendar_timezone || 'UTC';
}

export function convertToUserTimezone(
  utcDate: Date,
  timezone: string
): { date: string, time: string, offset: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const [month, day, year, hour, minute, second] = formatter.formatToParts(utcDate)
    .map(({ value }) => value);
  
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    .resolvedOptions()
    .timeZone; // Returns IANA timezone
  
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
    offset,
  };
}

// API responses include timezone info
export const BookingResponseSchema = z.object({
  id: z.string().uuid(),
  eventDate: z.date(),
  eventTime: z.string(),  // HH:MM in user's timezone
  eventTimezone: z.string(),  // User's configured timezone
  eventDatetimeUTC: z.date(),  // ISO 8601 UTC for storage
});
```

**Client-side (display in user's timezone):**
```typescript
// Hook: useTimezoneDisplay
export const useTimezoneDisplay = (utcDate: Date) => {
  const { user } = useAuth();
  const timezone = user?.calendar_timezone || 'UTC';
  
  return {
    formatted: new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(utcDate),
    timezone,
  };
};
```

### 3.3.4 Location Service Integration

**Pattern: BigDataCloud for reverse geocoding (optional)**

```typescript
// server/services/location.service.ts

import axios from 'axios';

class LocationService {
  private apiKey = process.env.BIG_DATA_CLOUD_API_KEY;
  
  /**
   * Get city name from latitude/longitude
   * Used for location-based confirmation
   */
  async getCityFromCoordinates(lat: number, lng: number): Promise<string> {
    const response = await axios.get(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { headers: { 'x-apikey': this.apiKey } }
    );
    
    return response.data.city || response.data.locality || 'Unknown';
  }
  
  /**
   * Verify artist is within acceptable distance of venue
   * (Optional fraud detection)
   */
  async verifyLocationProximity(
    artistLat: number,
    artistLng: number,
    venueLat: number,
    venueLng: number,
    maxDistanceKm: number = 50
  ): Promise<boolean> {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (venueLat - artistLat) * Math.PI / 180;
    const dLng = (venueLng - artistLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(artistLat * Math.PI / 180) * Math.cos(venueLat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance <= maxDistanceKm;
  }
}

export const locationService = new LocationService();
```

---

## 3.4 External Integrations

### 3.4.1 Google Calendar Export (iCal Standard)

**Feature:** Artists/Organizers export their BANDWIDTH calendar to Google Calendar

**Implementation:**
```typescript
// API endpoint: GET /api/calendar/export/ical
export async function getCalendarICS(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  
  const bookings = await storage.getCalendarEvents(userId, /* startDate */, /* endDate */);
  const user = await storage.getUser(userId);
  const timezone = user?.calendar_timezone || 'UTC';
  
  // Generate iCalendar format
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BANDWIDTH//Music Booking//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:BANDWIDTH Bookings
X-WR-TIMEZONE:${timezone}
X-WR-CALDESC:My gigs and contracts
${bookings.map(event => `
BEGIN:VEVENT
UID:bandwidth-${event.id}@bandwidth.app
DTSTAMP:${event.createdAt.toISOString()}
DTSTART:${formatICSDate(event.startDate, event.startTime, timezone)}
DTEND:${formatICSDate(event.endDate, event.endTime, timezone)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.venue || ''}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
`).join('')}
END:VCALENDAR`;
  
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', 'attachment; filename="bandwidth-calendar.ics"');
  res.send(ics);
}
```

**Client-side (download button):**
```typescript
export const CalendarExportButton = () => {
  const downloadICS = () => {
    window.location.href = '/api/calendar/export/ical';
  };
  
  return (
    <button onClick={downloadICS} className="btn btn-secondary">
      📥 Export to Google Calendar
    </button>
  );
};
```

### 3.4.2 Push Notification Service

**Integrate with existing notification system (Section 7):**

- For calendar deadlines, use same notification infrastructure
- Event key: `booking:deadline` → Notification Service triggers
- Channels: in_app, email, SMS, push (browser)

**Example:**
```typescript
// When 24 hours before deadline
eventBus.emit('booking:deadline_approaching', {
  bookingId: '123',
  userId: '456',
  hoursRemaining: 24,
  type: 'negotiation',  // or 'signature'
});

// NotificationService picks it up and sends via all enabled channels
```

---

# PART 4: IMPLEMENTATION ROADMAP

## Phase 1: MVP (8 weeks) — Q2 2026 Launch
**Priority: P0 (Must-have)**

### Week 1–2: Database & Backend Infrastructure
- [ ] Create database schema (availability slots, travel marks, venue windows)
- [ ] Write migration script and test data seeding
- [ ] Implement CalendarService core methods
- [ ] Add API routes: `/api/artists/availability`, `/api/organizers/events`, `/api/venues/availability`
- [ ] Extend storage.ts with new query methods

**Effort:** 40 hours | **Risk:** Schema conflicts with existing bookings logic

### Week 3–4: Frontend Calendar Component
- [ ] Install `react-big-calendar` and configure
- [ ] Build Month view (desktop + mobile)
- [ ] Build Agenda view (mobile-first)
- [ ] Implement view switching and state management

**Effort:** 45 hours | **Risk:** Mobile responsiveness gaps; gesture support

### Week 5–6: Artist Calendar Features
- [ ] Availability slot CRUD UI
- [ ] Gig discovery filter integration ("show only available dates")
- [ ] Booking timeline visualization component
- [ ] Travel/vacation marking UI
- [ ] WebSocket integration for real-time updates

**Effort:** 50 hours | **Risk:** Timezone handling complexity

### Week 7: Organizer Calendar Features
- [ ] Event creation & assignment
- [ ] Deadline tracking (simple version: list upcoming deadlines)
- [ ] Venue availability integration

**Effort:** 35 hours | **Risk:** Conflict detection edge cases

### Week 8: Testing & Polish
- [ ] Integration tests for calendar API
- [ ] E2E tests (basic flows)
- [ ] Mobile testing and bug fixes
- [ ] Performance optimization

**Effort:** 30 hours | **Risk:** Late-breaking mobile issues

**Total Phase 1: ~200 hours** | **Team Size:** 2–3 engineers

**Success Criteria:**
- Artists can view/manage availability
- Organizers can create events and see deadlines
- Real-time updates via WebSocket
- Works on mobile (48px touch targets minimum)
- No regression in existing booking flows

---

## Phase 2: Enhance (6 weeks) — Q3 2026
**Priority: P1 (High-value)**

### Week 1–2: Location Features
- [ ] Location-based confirmation workflow
- [ ] Privacy toggles (show city/address/availability)
- [ ] Admin location override + audit trail
- [ ] BigDataCloud reverse geocoding integration (optional)

**Effort:** 30 hours

### Week 3–4: Venue Manager Calendar
- [ ] Venue booking calendar view
- [ ] Revenue tracking by date
- [ ] Double-booking prevention (hard enforcement)
- [ ] Event schedule optimization insights

**Effort:** 35 hours

### Week 5: Admin Tools
- [ ] Calendar override (view any user's calendar)
- [ ] Audit trail search and export
- [ ] System-wide alert panel (anomalies)
- [ ] Dispute resolution context page

**Effort:** 25 hours

### Week 6: Mobile Polish
- [ ] Swipe gestures (navigate dates, dismiss events)
- [ ] Haptic feedback on actions
- [ ] Offline cache support (Service Worker)
- [ ] Performance audits (Lighthouse)

**Effort:** 20 hours

**Total Phase 2: ~110 hours** | **Team Size:** 2 engineers

**Success Criteria:**
- Location privacy fully implemented
- Venue managers see accurate revenue
- Admins can resolve disputes faster
- Mobile app feels responsive and smooth
- Offline mode works for cached data

---

## Phase 3: Gamification & Insights (4 weeks) — Q3 2026
**Priority: P2 (Engagement)**

### Week 1–2: Artist Insights
- [ ] "Empty days missed" earnings calculation
- [ ] Utilization dashboard
- [ ] Earning potential predictions
- [ ] Booking streak tracking

**Effort:** 25 hours

### Week 2: Gamification
- [ ] Badge system (Debut Performer, Reliable Partner, etc.)
- [ ] Location unlock tracking (mark cities as "played")
- [ ] Streak rewards UI component
- [ ] Leaderboard (optional: organizer success rates)

**Effort:** 20 hours

### Week 3: Notifications
- [ ] Calendar deadline push notifications
- [ ] "Fill your empty slot" suggestions
- [ ] Celebration notifications (contract signed, etc.)
- [ ] Notification preference controls

**Effort:** 20 hours

### Week 4: Analytics & Reporting
- [ ] Calendar usage analytics (in admin dashboard)
- [ ] Artist booking patterns report
- [ ] Venue programming recommendations

**Effort:** 15 hours

**Total Phase 3: ~80 hours** | **Team Size:** 1–2 engineers

**Success Criteria:**
- Artists see earning potential metrics
- Gamification drives week-on-week engagement
- Organizers get smarter recommendations
- Admin dashboard tracks feature adoption

---

## Phase 4: Integrations & Polish (4 weeks) — Q4 2026
**Priority: P3 (Nice-to-have)**

### Week 1–2: Google Calendar & iCal Export
- [ ] iCal file generation endpoint
- [ ] "Export to Google Calendar" button
- [ ] Sync back to BANDWIDTH (stretch goal)

**Effort:** 15 hours

### Week 2: Timezone Handling & Localization
- [ ] Multi-timezone support in UI
- [ ] Date/time formatting based on user locale
- [ ] Test across major Indian timezones

**Effort:** 10 hours

### Week 3–4: Performance & Scale
- [ ] Query optimization (index calendar queries)
- [ ] Caching strategy for large calendars
- [ ] Load testing (1000 concurrent users)
- [ ] CDN/static file delivery

**Effort:** 20 hours

**Total Phase 4: ~45 hours** | **Team Size:** 1 engineer

**Success Criteria:**
- Export/import works seamlessly
- Calendar fast even with 2+ years of history
- Zero performance regression
- < 2s page load on 4G

---

## Effort & Cost Summary

| Phase | Effort | Duration | Team | Estimated Cost* |
|-------|--------|----------|------|-----------------|
| Phase 1 (MVP) | 200 hrs | 8 weeks | 2–3 | ₹8–12L |
| Phase 2 (Enhance) | 110 hrs | 6 weeks | 2 | ₹4.4–6.6L |
| Phase 3 (Gamification) | 80 hrs | 4 weeks | 1–2 | ₹3.2–4.8L |
| Phase 4 (Polish) | 45 hrs | 4 weeks | 1 | ₹1.8–2.7L |
| **TOTAL** | **435 hrs** | **22 weeks** | **2–3 avg** | **₹17.4–26.1L** |

*Cost assumes ₹400–500/hour for India-based dev team. Adjust for actual team composition.

---

# PART 5: GAMIFICATION & ENGAGEMENT STRATEGY

## 5.1 Artist Engagement Framework

### Tier 1: Utilization Insights (Low Friction)
- **Weekly metric**: "You filled X% of your available slots"
- **Benchmark**: "Platform average is 60%"
- **Action**: "Mark more dates available" or "Lower your minimum fee"
- **Frequency**: Every Monday morning email
- **Impact**: Drives availability creation, increases gig supply

### Tier 2: Streak Rewards (Behavioral)
- **Trigger**: 5+ gigs completed on-time, 0 cancellations in 30 days
- **Reward**: Badge on profile + 5% fee discount next booking
- **Display**: Shown in organizer search results ("Reliable Partner badge")
- **Psychology**: Sunk cost (don't cancel and lose streak) + status (badge visible)
- **Reset**: Broken by single cancellation (harsh to enforce commitment)

### Tier 3: Location Unlock (Achievement)
- **Unlock**: First booking in new city → city marked "You've played here"
- **Visual**: Map on profile showing "Unlocked cities" vs. "Available cities"
- **Goal**: Encourage touring; build geographic diversity
- **Progression**: 5 cities → "Touring Artist" badge
- **Display**: On profile, in recommendations (organizers see touring acts)

### Tier 4: Earning Potential Gamification
- **Narrative**: "Empty slots = wasted money"
- **Calculation**: 
  ```
  Last month utilization: 45%
  Available slots: 20
  Missed bookings: 11
  Your average fee: ₹1,875
  Potential missed: ₹20,625
  ```
- **Visualized**: Bar chart; "if you got to 75% utilization..."
- **Action CTA**: "Improve availability" (auto-fill next 2 weeks)
- **Timing**: Show after organizer declines without reason (nudge to improve)

---

## 5.2 Organizer/Venue Engagement Framework

### Booking Success Rate
- **Metric**: "% of negotiations that ended in signed contracts"
- **Benchmark**: "60% platform average—you're at 78%"
- **Drivers**: Good communication, fair terms, follow deadline
- **Badging**: 70%+ = "Booking Master" badge; 85%+ = "Elite Booker"
- **Visibility**: Shown on organizer profile (artists trust good bookers)

### Contract Execution Timeline Tracking
- **Metric**: "Average days from offer to signed contract"
- **Benchmark**: "Platform average is 6.2 days"
- **Drivers**: Quicker responses, reasonable terms
- **Reward**: 5 days or less → "Fast Closer" badge

### Seasonal Planning Insights
- **Recommendation**: "January historically your peak (12 events, ₹8.2L). Plan accordingly."
- **Tool**: "Clone last year's January programming"
- **Action**: Draft 2–3 events for same month next year
- **Nudge**: "Only 3 events booked for March vs. 8 last March"

---

## 5.3 Notification Engagement Strategy

### Deadline Pressure (FOMO)
- **24 hours before deadline**: "You have 1 day to respond to artist's counter-offer"
- **6 hours before**: "⏰ 6 hours left—respond now" (push notification)
- **1 hour before**: "⚠ URGENT: Deadline in 1 hour. Action required." (loud + email)
- **After deadline**: "Deadline passed. Extend by 24 hours?"
- **Psychology**: Time scarcity drives quick decisions

### Celebration Notifications
- **Contract signed**: "🎉 Contract signed! Artist is excited. Mark date in calendar!"
- **Payment received**: "✓ Advance payment received. Event confirmed!"
- **Event completed**: "🎵 Event completed! Rate & review?"
- **Psychology**: Positive reinforcement; invite user back to platform

### Comparative Insights
- **"3 other venues in Bangalore booked artists this week"** (FOMO)
- **"Artists from your city are booking 2x more often than last quarter"** (trend)
- **Psychology**: Social proof; competitive positioning

### User Preference Controls
- Dashboard: "Notification Preferences"
  - Toggle deadline reminders ON/OFF
  - Select channels: In-app, Email, SMS, Push
  - Quiet hours (e.g., 22:00–08:00, no notifications)
  - Frequency: Daily digest vs. immediate
- **Retention**: Letting users customize prevents unsubscribe

---

## 5.4 Gamification Metrics & Analytics

**Track on admin dashboard:**

```
Artist Engagement
├─ Utilization rate (avg: 58%, trending up)
├─ New availability slots created (weekly)
├─ Travel marks set (per artist)
└─ Badge holders (200 "Reliable Partner", 45 "Touring Artist", 10 "Location Unlock")

Organizer Engagement
├─ Event creation rate (weekly)
├─ Negotiation success % (avg: 65%)
├─ Contract execution speed (avg: 5.8 days)
└─ Booking Master badges (35 holders)

Overall Health
├─ Weekly active users (by role)
├─ Booking completion rate
├─ Feature adoption (% using calendar)
└─ Churn rate (30-day rolling)
```

---

# PART 6: MOBILE UX/UI GUIDELINES

## 6.1 Touch Target Sizing

**Standard (WCAG AAA):**
- Primary buttons: 56px × 56px
- Secondary buttons: 48px × 48px
- Input fields: 48px min height
- Checkboxes/toggles: 44px × 44px
- Links: 44px min height

**Spacing:** 16px between touch targets (prevent accidental taps)

**Example Implementation:**
```tsx
<button className="h-12 w-12 rounded-lg flex items-center justify-center hover:bg-gray-100">
  {/* Icon 20–24px inside 12 = 48px total */}
  <Icon size={24} />
</button>
```

## 6.2 Swipe Gestures

| Gesture | Action | Direction |
|---------|--------|-----------|
| Swipe left | Next day/week/month | ← |
| Swipe right | Previous day/week/month | → |
| Swipe up | Open agenda/detail sheet | ↑ |
| Swipe down | Close detail sheet | ↓ |
| Long press (1s) | Context menu (edit, delete, share) | — |
| Pinch in/out | Zoom time granularity (week view) | ∨ ∧ |
| Two-finger swipe up | Jump to today | ↑ |

**Implementation (using `react-use-gesture`):**
```typescript
import { useSwipe } from '@uidotdev/use-hooks';

export const CalendarMonth = () => {
  const [month, setMonth] = useState(new Date());
  
  const { ref } = useSwipe({
    onSwipeLeft: () => setMonth(addMonths(month, 1)),
    onSwipeRight: () => setMonth(addMonths(month, -1)),
  });
  
  return <div ref={ref}>/* Calendar grid */</div>;
};
```

## 6.3 Gesture Feedback (Haptics)

**Mobile (iOS + Android):**
```typescript
// Using Capacitor Haptics API
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const ConfirmAction = async () => {
  await Haptics.impact({ style: ImpactStyle.Heavy });
  // Complete action
};

// Light tap on selection
export const SelectEvent = async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
};

// Pattern: medium pulse when deadline approaching
export const DeadlineWarning = async () => {
  await Haptics.notification({ type: 'Warning' });
};
```

**Web (Vibration API as fallback):**
```typescript
if ('vibrate' in navigator) {
  navigator.vibrate(50); // 50ms vibration
}
```

## 6.4 View Mode Transitions

**Animation pattern: Smooth fade + slide**

```css
.calendar-view-enter {
  animation: fadeIn slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { transform: translateY(20px); }
  to { transform: translateY(0); }
}

/* Month → Agenda transition */
.month-view { }
.agenda-view {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

## 6.5 Thumb-Zone Optimization

**Mobile UI Layout (6-inch phone):**

```
┌───────────────────────────────┐
│ Status Bar (system)           │
├───────────────────────────────┤
│ [Date Header] [Share] [Menu]  │ ← Reachable
├───────────────────────────────┤
│                               │
│   [Calendar Grid]             │ ← Thumb zone (top)
│   (comfortable tap zone)      │
│                               │
│                               │ ← Mid zone (requires reach)
│                               │
├───────────────────────────────┤
│ [Event List / Cards]          │ ← Thumb zone (bottom)
│ (scroll, action buttons)      │
├───────────────────────────────┤
│ [BottomNav/FloatingAction]    │ ← Optimal zone
│ (primary actions)             │
└───────────────────────────────┘
```

**Principle:** Most-used actions in thumb zone; secondary actions at top (reachable).

**Example:**
```tsx
export const MobileCalendarLayout = () => {
  return (
    <div className="flex flex-col h-screen">
      {/* Header — top, reachable */}
      <header className="sticky top-0 bg-white p-4">
        <h1>June 2026</h1>
      </header>
      
      {/* Main calendar — scrollable middle zone */}
      <main className="flex-1 overflow-y-auto">
        {/* Calendar grid */}
      </main>
      
      {/* Floating action button — bottom, thumb zone */}
      <button className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
        +
      </button>
    </div>
  );
};
```

## 6.6 Empty State Messaging

**When no events:**
```
📅 No Events This Week

You don't have any gigs scheduled for this week.
Good time to take a break or look for opportunities!

[Browse Gigs] [Set Availability]
```

**When availability slot empty:**
```
✨ Let's Fill This Slot

June 20 is open. Mark it as available to get gigs!

[Mark Available] [Not Interested]
```

**When organizer has no deadlines:**
```
✓ All Caught Up!

No urgent deadlines. Your events are on track.

[Create New Event] [View Calendar]
```

---

# PART 7: NOTIFICATION INTEGRATION

## 7.1 Calendar Event-Triggered Alerts

**Integrate with existing notification system** (from `server/services/notification.service.ts`)

**New Event Types:**

| Event Type | Trigger | Recipients | Channels | Template |
|-----------|---------|-----------|----------|----------|
| `booking:deadline_24h` | 24h before deadline | organizer, artist | email, push | "⏰ Your deadline is tomorrow. [Booking name]" |
| `booking:deadline_1h` | 1h before deadline | organizer, artist | push, in_app | "⚠ URGENT: {{hours}} hours left to respond" |
| `contract:signature_3d` | Contract ready for signature | artist, organizer | email, in_app | "📋 Contract ready: [Booking]. Sign by {{date}}" |
| `location:confirm_reminder` | After gig accepted, no location confirmed | artist | in_app | "Confirm venue location: [Venue] in [City]" |
| `event:day_reminder` | Morning of event | artist, organizer | push, email | "Today's the day! [Booking] at [Venue] [Time]" |
| `event:completed` | Event marked completed | artist | in_app | "🎉 Gig completed! Rate & review?" |
| `earning:potential` | Weekly utilization insight | artist | email | "You had {{slots}} open last week. ₹{{potential}} missed." |

## 7.2 Booking Deadline Reminders (Timezone-Aware)

**Implementation:**

```typescript
// server/services/calendar.service.ts
async scheduleDeadlineReminders(bookingId: UUID) {
  const booking = await storage.getBooking(bookingId);
  const deadline = booking.flowDeadlineAt;
  
  // Schedule reminders at 24h, 6h, 1h before deadline (in user's timezone)
  const reminders = [
    { minutesBefore: 1440, type: 'soft' },      // 24h
    { minutesBefore: 360, type: 'medium' },     // 6h
    { minutesBefore: 60, type: 'urgent' },      // 1h
  ];
  
  for (const { minutesBefore, type } of reminders) {
    const scheduleAt = new Date(deadline.getTime() - minutesBefore * 60 * 1000);
    
    await storage.createNotificationTrigger({
      userId: booking.organizerId,
      triggerType: `booking_deadline_${minutesBefore}m`,
      eventKey: `booking:${bookingId}`,
      scheduleAt,
      channel: type === 'urgent' ? 'push' : 'email',
    });
  }
}
```

**Cron job (background task):**

```typescript
// server/jobs/notification-scheduler.ts (runs every 5 minutes)
import cron from 'node-cron';

cron.schedule('*/5 * * * *', async () => {
  const triggers = await storage.getNotificationTriggersDueNow();
  
  for (const trigger of triggers) {
    const [type, bookingId] = trigger.eventKey.split(':');
    const booking = await storage.getBooking(bookingId);
    const user = await storage.getUser(trigger.userId);
    
    // Get notification template
    const template = await notificationService.getTemplate(trigger.triggerType);
    const title = template.titleTemplate.replace('{{booking}}', booking.name);
    
    // Send via channels
    await notificationService.sendNotification({
      userId: user.id,
      title,
      channel: trigger.channel,
      data: { bookingId, deadline: booking.flowDeadlineAt },
    });
    
    // Mark as sent
    await storage.updateNotificationTrigger(trigger.id, { sent_at: new Date() });
  }
});
```

## 7.3 Status Change Notifications

**Automatic on booking status change:**

```typescript
// server/routes/bookings.ts
router.patch('/:bookingId/status', async (req, res) => {
  const { bookingId } = req.params;
  const { newStatus } = req.body;
  
  const booking = await storage.getBooking(bookingId);
  const oldStatus = booking.status;
  
  // Update
  await storage.updateBooking(bookingId, { status: newStatus });
  
  // Emit domain event → NotificationService picks up
  eventBus.emit('booking:status_changed', {
    bookingId,
    oldStatus,
    newStatus,
    artistId: booking.artistId,
    organizerId: booking.organizerId,
  });
  
  res.json({ message: 'Status updated', newStatus });
});

// In NotificationService
eventBus.on('booking:status_changed', async (event) => {
  const booking = await storage.getBooking(event.bookingId);
  const artist = await storage.getUser(event.artistId);
  const organizer = await storage.getUser(event.organizerId);
  
  const messages = {
    'inquiry→offered': {
      title: '📢 Organizer Sent You an Offer',
      body: `"${organizer.name}" is interested! Review the offer and proposed fee.`,
      recipient: artist,
    },
    'offered→negotiating': {
      title: '🗣 Negotiation Started',
      body: `"${artist.name}" countered your offer. Check the new proposal.`,
      recipient: organizer,
    },
    'contracting→confirmed': {
      title: '✓ Booking Confirmed',
      body: 'Both parties signed. Event is locked in!',
      recipient: [artist, organizer],
    },
  };
  
  const key = `${event.oldStatus}→${event.newStatus}`;
  const msg = messages[key];
  if (!msg) return;
  
  const recipients = Array.isArray(msg.recipient) ? msg.recipient : [msg.recipient];
  for (const user of recipients) {
    await storage.createNotification({
      userId: user.id,
      title: msg.title,
      body: msg.body,
      channel: 'in_app',
      actionUrl: `/bookings/${event.bookingId}`,
    });
  }
});
```

## 7.4 Integration with Existing Notification Engine

**Extend notification types:**

```typescript
// shared/schema.ts (update notificationTypes table)
export const DEFAULT_NOTIFICATION_TYPES: NotificationType[] = [
  // Existing types...
  
  // New calendar types
  {
    key: 'booking:deadline_24h',
    name: 'Booking Deadline (24 hours)',
    titleTemplate: 'Deadline Tomorrow: {{booking}}',
    bodyTemplate: 'You have 24 hours to respond to {{party}}\'s proposal.',
    channels: ['email', 'in_app'],
    enabled: true,
  },
  {
    key: 'booking:deadline_1h',
    name: 'Booking Deadline (1 hour)',
    titleTemplate: '⚠ URGENT: Deadline in 1 Hour',
    bodyTemplate: 'Last chance to respond to {{booking}} proposal.',
    channels: ['push', 'in_app'],
    enabled: true,
  },
  {
    key: 'event:day_reminder',
    name: 'Event Day Reminder',
    titleTemplate: '🎵 Your Event is Today!',
    bodyTemplate: '{{booking}} at {{venue}} starts at {{time}}. See you there!',
    channels: ['push', 'email'],
    enabled: true,
  },
];
```

## 7.5 User Preference Controls

**UI in Settings:**

```tsx
// client/src/pages/Settings.tsx
export const NotificationPreferences = () => {
  const [prefs, setPrefs] = useState({
    deadlineReminders: true,
    eventDayReminder: true,
    earningInsights: true,
    quietHours: { start: '22:00', end: '08:00' },
    channels: {
      inApp: true,
      email: true,
      sms: false,
      push: true,
    },
  });
  
  return (
    <div className="space-y-6">
      <div>
        <h3>Booking Deadlines</h3>
        <Toggle
          checked={prefs.deadlineReminders}
          onChange={(v) => setPrefs({ ...prefs, deadlineReminders: v })}
          label="Remind me when deadlines approach"
        />
      </div>
      
      <div>
        <h3>Event Day Reminders</h3>
        <Toggle
          checked={prefs.eventDayReminder}
          label="Notify me morning of event"
        />
      </div>
      
      <div>
        <h3>Earning Insights</h3>
        <Toggle
          checked={prefs.earningInsights}
          label="Weekly utilization & opportunity emails"
        />
      </div>
      
      <div>
        <h3>Quiet Hours</h3>
        <TimeInput label="From" value={prefs.quietHours.start} />
        <TimeInput label="To" value={prefs.quietHours.end} />
        <small>No notifications will be sent during quiet hours</small>
      </div>
      
      <div>
        <h3>Notification Channels</h3>
        <Checkbox label="In-App" checked={prefs.channels.inApp} />
        <Checkbox label="Email" checked={prefs.channels.email} />
        <Checkbox label="SMS" checked={prefs.channels.sms} />
        <Checkbox label="Push" checked={prefs.channels.push} />
      </div>
      
      <button onClick={() => savePreferences(prefs)} className="btn btn-primary">
        Save Preferences
      </button>
    </div>
  );
};
```

---

# PART 8: PRIVACY & COMPLIANCE

## 8.1 GDPR Compliance Checklist

| Requirement | Implementation | Status |
|------------|-----------------|--------|
| **Data Minimization** | Only collect necessary location data (city, not precise coordinates) | ✅ Designed |
| **Consent** | Explicit opt-in for location tracking, push notifications | ✅ Settings modal |
| **Access Rights** | User can download all calendar data (iCal export) | ✅ Export button |
| **Erasure Rights** | User can delete all availability slots, travel marks | ✅ Bulk delete UI |
| **Portability** | iCal export supports import to other systems | ✅ Standard format |
| **Data Retention** | Calendar data retained for 3 years (for dispute resolution); deleted after | ✅ Policy |
| **Privacy Policy** | Link in Settings; explains what's collected and why | ✅ Legal review needed |
| **DPO Contact** | Privacy@bandwidth.app | ✅ Email configured |

## 8.2 Location Data Minimization

**Strategy:**
- Public views show city only (e.g., "Bangalore", not street address)
- Address stored server-side but not exposed in API responses (except to admin/logged-in user)
- GPS coordinates (if captured) deleted after 30 days
- Organizers see artist as "based in [city]" only

**Schema:**
```sql
ALTER TABLE artists ADD COLUMN
  public_city VARCHAR(128) NOT NULL DEFAULT '',
  private_address TEXT,
  private_lat NUMERIC(10, 8),
  private_lng NUMERIC(11, 8);

-- API response only includes public_city
SELECT id, name, public_city FROM artists;
```

## 8.3 Data Retention Policies

**Calendar Data Retention:**

| Data Type | Retention Period | Reason | Action After |
|-----------|-----------------|--------|--------------|
| Availability slots | Until deleted or 3 years | For booking history, dispute resolution | Delete or anonymize |
| Bookings | 7 years | Tax, legal, payment reconciliation | Archive offline |
| Travel marks | 2 years | For understanding artist patterns | Delete |
| Venue availability | 1 year | For season planning | Delete or anonymize |
| Contract versions | 7 years | Legal compliance, dispute resolution | Archive |
| Notification logs | 6 months | For support, GDPR requests | Delete |
| Audit logs | 3 years | Fraud detection, compliance | Archive offline |
| Location data (GPS) | 30 days | Attendance verification | Delete immediately after |

**Implementation:**
```typescript
// server/jobs/data-retention.ts (runs daily)
cron.schedule('0 2 * * *', async () => {
  const threeyearsAgo = new Date(Date.now() - 3*365*24*60*60*1000);
  const oneYearAgo = new Date(Date.now() - 365*24*60*60*1000);
  const sixMonthsAgo = new Date(Date.now() - 6*30*24*60*60*1000);
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
  
  // Delete old location GPS data
  await db.update(bookings)
    .set({ actual_artist_location_lat: null, actual_artist_location_lng: null })
    .where(sql`actual_artist_location_verified_at < ${thirtyDaysAgo}`);
  
  // Archive old availability slots
  const oldSlots = await db.select()
    .from(artistAvailabilitySlots)
    .where(sql`updated_at < ${threeyearsAgo}`);
  
  for (const slot of oldSlots) {
    await db.insert(deletedData).values({
      originalTable: 'artist_availability_slots',
      originalData: JSON.stringify(slot),
      deletedAt: new Date(),
    });
    await db.delete(artistAvailabilitySlots).where(eq(artistAvailabilitySlots.id, slot.id));
  }
  
  console.log(`[DataRetention] Archived ${oldSlots.length} old availability slots`);
});
```

## 8.4 User Rights (Access, Deletion, Portability)

### 8.4.1 Right to Access
**User can request export of all their data:**

```typescript
// API endpoint: GET /api/user/export
export async function getUserDataExport(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  
  const [user, profile, bookings, calendar, messages] = await Promise.all([
    storage.getUser(userId),
    storage.getProfile(userId),
    storage.getUserBookings(userId),
    storage.getUserCalendarData(userId),
    storage.getUserMessages(userId),
  ]);
  
  const exportData = {
    user,
    profile,
    bookings,
    calendar,
    messages,
    exportedAt: new Date().toISOString(),
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="bandwidth-export.json"');
  res.json(exportData);
}
```

### 8.4.2 Right to Deletion
**User can request deletion of account and all data:**

```typescript
// API endpoint: DELETE /api/user/account
export async function deleteUserAccount(req: Request, res: Response) {
  const userId = req.user?.id;
  const { confirmPassword, reason } = req.body;
  
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  
  // Verify password
  const user = await storage.getUser(userId);
  const isValid = await verifyPassword(confirmPassword, user.passwordHash);
  if (!isValid) return res.status(403).json({ message: 'Incorrect password' });
  
  // Begin deletion (async, can take time)
  await storage.queueUserDeletion(userId, { reason, requestedAt: new Date() });
  
  // After 30 days, actually delete
  // (GDPR allows processing time; give user chance to cancel)
  
  res.json({ message: 'Deletion requested. You have 30 days to cancel.' });
}

// Cron job: actually delete 30 days later
cron.schedule('0 3 * * *', async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000);
  const usersToDelete = await storage.getUsersDeletionDueNow(thirtyDaysAgo);
  
  for (const user of usersToDelete) {
    // Cascade delete: all bookings, messages, calendar data
    await db.delete(bookings).where(eq(bookings.userId, user.id));
    await db.delete(artists).where(eq(artists.userId, user.id));
    // ... etc
    await db.delete(users).where(eq(users.id, user.id));
  }
});
```

### 8.4.3 Right to Portability
**User can export data in standard formats (iCal, JSON):**

Already implemented:
- iCal export: `GET /api/calendar/export/ical` (Section 3.4.1)
- JSON export: `GET /api/user/export` (above)

---

## 8.5 Admin Access Logging

**Every admin action is logged:**

```typescript
// server/middleware/audit-log.ts

export async function auditAdminAction(req: Request, res: Response, next: NextFunction) {
  // Only for /admin/* routes
  if (!req.path.startsWith('/admin')) return next();
  
  const user = req.user;
  if (!user?.role.includes('admin')) return next();
  
  const originalJson = res.json;
  res.json = function (data) {
    // After response sent, log the action
    storage.createAuditLog({
      adminId: user.id,
      action: req.method + ' ' + req.path,
      targetUserId: req.query.userId,
      targetEntityType: req.query.entityType,
      targetEntityId: req.query.entityId,
      changes: req.body || {},
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
    });
    
    return originalJson.call(this, data);
  };
  
  next();
}
```

**Admin audit view:**

```typescript
// API: GET /api/admin/audit-logs
// Query: ?adminId=xyz&action=view&dateFrom=2026-01-01&dateTo=2026-12-31

export async function getAuditLogs(req: Request, res: Response) {
  const filters = {
    adminId: req.query.adminId,
    action: req.query.action,
    dateFrom: new Date(req.query.dateFrom),
    dateTo: new Date(req.query.dateTo),
  };
  
  const logs = await storage.getAuditLogs(filters);
  res.json({ logs, count: logs.length });
}
```

---

# APPENDIX A: Terminology & Definitions

| Term | Definition | Example |
|------|-----------|---------|
| **Availability Slot** | Time window artist marks as available for gigs | June 15, 18:00–23:00 |
| **Travel Mark** | Date range artist is traveling (unavailable for gigs) | June 10–15 (Touring in Mumbai) |
| **Venue Window** | Date/time when venue is available for events | Every Friday 19:00–23:00 |
| **Booking Deadline** | 72-hour deadline to respond to proposal | Proposal made June 15 14:00 → Deadline June 18 14:00 |
| **Negotiation Snapshot** | Frozen version of proposed terms (fee, tech rider) | Fee: ₹5,000, Includes: PA System, 2 mics |
| **Location Confirmation** | Artist confirms they'll be at proposed venue location | Artist checks: "Yes, [Venue] in [City] works" |
| **Utilization Rate** | % of available slots that resulted in bookings | 8 booked / 24 available = 33% utilization |
| **Empty Days Missed** | Available slots that didn't result in bookings | 16 empty days × ₹1,875 avg = ₹30K missed revenue |

---

# APPENDIX B: API Contract Summary

## Calendar Endpoints (New)

```typescript
// Artist Availability
POST   /api/artists/availability              // Create slot
PUT    /api/artists/availability/:slotId      // Edit slot
DELETE /api/artists/availability/:slotId      // Delete slot
GET    /api/artists/availability              // List all (date range optional)

// Organizer Events
POST   /api/organizers/events                 // Create event
PUT    /api/organizers/events/:eventId        // Edit event
DELETE /api/organizers/events/:eventId        // Delete event
GET    /api/organizers/events                 // List all (for this organizer)
GET    /api/organizers/deadlines              // List upcoming deadlines

// Venue Availability
POST   /api/venues/availability               // Create window
PUT    /api/venues/availability/:id           // Edit window
DELETE /api/venues/availability/:id           // Delete window
GET    /api/venues/availability               // List all (for this venue)

// Calendar Data (unified)
GET    /api/calendar/:userId                  // Get full calendar (authenticated users)
GET    /api/calendar/:userId/export/ical      // Export as iCal
GET    /api/user/export                       // Full user data export

// Admin
GET    /api/admin/users/:userId/calendar      // View user's calendar (admin only)
GET    /api/admin/audit-logs                  // View audit trail

// Travel Marks
POST   /api/artists/travel                    // Mark travel period
DELETE /api/artists/travel/:travelId          // Unmark

// Location Confirmation
PATCH  /api/bookings/:bookingId/confirm-location // Confirm venue location

// Conflicts & Validation
POST   /api/conflicts/detect                  // Check for conflicts
```

---

# APPENDIX C: Risk Mitigation & Contingency Plans

## Risk 1: Timezone Handling Complexity
**Risk:** Users in different timezones see different deadlines, causing confusion

**Mitigation:**
- Always store UTC; convert on display
- Show user's timezone offset prominently ("Deadline 18:00 **IST** (GMT+5:30)")
- Test with India Standard Time (IST only), no daylight savings
- Use `date-fns` library for safe conversions

**Contingency:** If too complex, phase timezone support later (Q4). Phase 1: UTC only.

---

## Risk 2: Real-Time Sync Race Conditions
**Risk:** WebSocket updates arrive out-of-order; calendar shows stale state

**Mitigation:**
- Add version numbers to all calendar entities
- Client ignores updates with older version number
- Every 10 seconds, full refresh from server (background sync)
- Optimistic updates with rollback on server rejection

**Contingency:** Revert to polling (5-second interval) if WebSocket unreliable.

---

## Risk 3: Performance at Scale
**Risk:** Large calendars (2+ years of history) cause UI lag

**Mitigation:**
- Phase 1: Limit calendar view to 90-day window (current month ± 1 month)
- Pagination for historical data (lazy load)
- Database indexes on (userId, date), (venueId, date)
- Cache venue availability windows in Redis

**Contingency:** Implement virtual scrolling (only render visible events).

---

## Risk 4: Missed Deadlines (Business Logic)
**Risk:** Deadline passes but user still sees option to accept

**Mitigation:**
- Cron job runs every 5 minutes to check deadlines
- Automatic status change to `declined` if deadline exceeded
- Send escalation email 1 hour after deadline
- Admin can extend deadline once (with reason logged)

**Contingency:** Manual override by support team.

---

## Risk 5: Double-Booking Edge Cases
**Risk:** Venue marked available, then manually blocked; organizer already created event

**Mitigation:**
- Check venue availability at time of booking creation (not just reservation)
- If conflict detected, offer alternatives: different date, different venue
- Audit log shows who resolved conflict and how

**Contingency:** Admin overrides with explicit reason logged.

---

## Risk 6: Mobile Gesture Conflicts
**Risk:** Swipe to navigate calendar triggers browser back button; user loses progress

**Mitigation:**
- Use Capacitor/Cordova to handle navigation separately from browser swipes
- Disable browser back gesture in calendar view
- Confirm before closing calendar with unsaved changes

**Contingency:** Provide explicit "Back" button if gestures don't work.

---

# APPENDIX D: Success Metrics & KPIs

**Track on admin dashboard; review quarterly**

## Adoption Metrics
- % of artists with ≥1 availability slot marked
- % of organizers viewing events in calendar view
- % of gigs discovered via calendar (vs. manual search)

## Engagement Metrics
- Daily active users (calendar view)
- Avg time spent in calendar view
- Feature adoption (% using each view: month, week, agenda)

## Operational Metrics
- Booking completion rate (inquiry → confirmed)
- Avg time from offer to contract signature
- Deadline extension requests (should be < 10%)
- Conflict detection accuracy (false positives)

## Financial Metrics
- GMV (Gross Music Value) booked via calendar-aware gigs
- Booking quality (% of completed bookings from calendar vs. manual)
- Cost to operate (infrastructure, support)

## User Satisfaction
- NPS (Net Promoter Score) for calendar feature
- Support tickets related to calendar (should ↓ over time)
- Feature request volume

---

# APPENDIX E: Security Considerations

## SQL Injection Prevention
- Always use parameterized queries (Drizzle ORM enforces this)
- No raw SQL in calendar service

## XSS Prevention
- Sanitize user input (event names, venue names) before display
- Use React's built-in escaping for JSX

## Rate Limiting
- Limit calendar API requests: 1000 req/min per user
- Prevent DOS attacks on conflict detection endpoint

## Access Control
- Verify userId matches logged-in user (not just authenticated)
- Admin routes require `role='platform_admin'`
- Privacy settings enforced on data retrieval

## Audit Trail Immutability
- Audit logs written to immutable table (no updates/deletes, only inserts)
- Backed up daily to offline storage (S3, local archive)

---

# APPENDIX F: Glossary of Features

| Feature | Purpose | Phase |
|---------|---------|-------|
| Month View | Overview of full month bookings | 1 |
| Week View | Planning mode for 7-day window | 1 |
| Agenda View | Mobile: sorted list of upcoming events | 1 |
| Availability Slots | Artist marks when available | 1 |
| Travel Marks | Artist marks when unavailable (traveling) | 1 |
| Event Creation | Organizer posts event for artists | 1 |
| Deadline Tracking | Show upcoming action items | 1 |
| Venue Availability | Prevent double-bookings | 1 |
| Conflict Detection | Warn on double-bookings | 1 |
| Location Confirmation | Artist confirms venue location | 2 |
| Privacy Toggles | Control who sees what | 2 |
| Double-Booking Prevention | Hard block on venue conflicts | 2 |
| Revenue Tracking | Venue sees income by date | 2 |
| Admin Override | Admins view any user's calendar | 2 |
| Audit Trail | Log all calendar changes | 2 |
| System Alerts | Flag anomalies (cancellations, conflicts) | 2 |
| Earning Insights | Show missed revenue potential | 3 |
| Badges & Streaks | Gamification (Reliable Partner, Touring Artist) | 3 |
| iCal Export | Export to Google Calendar | 4 |
| Offline Mode | View cached calendar without network | 2 |

---

# FINAL CHECKLIST FOR STAKEHOLDER REVIEW

- [ ] Vision & value propositions align with BANDWIDTH strategy
- [ ] Feature set balances MVP scope with future extensibility
- [ ] Technical architecture is feasible within 8-week Phase 1 timeline
- [ ] Mobile UX guidelines meet accessibility standards (WCAG AAA)
- [ ] Privacy & compliance requirements documented and actionable
- [ ] Risk mitigation plans are realistic
- [ ] Success metrics are measurable and tied to business goals
- [ ] Resource allocation (team size, effort) is realistic
- [ ] Launch readiness: Q2 2026 (Phase 1) → Q3 (Phase 2) → Q3 (Phase 3) → Q4 (Phase 4)
- [ ] Budget estimate (₹17.4–26.1L) approved by finance
- [ ] Stakeholder sign-off: Product, Engineering, Design, Legal

---

**Document prepared for:** BANDWIDTH Platform Leadership  
**Status:** Ready for Implementation  
**Next Step:** Engineering kickoff meeting to assign tasks and confirm timeline

