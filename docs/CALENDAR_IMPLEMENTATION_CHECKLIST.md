# BANDWIDTH Calendar Management — Implementation Checklist & Quick Reference

**Document Date:** April 4, 2026 | **Status:** Ready for Sprint Planning | **Prepared by:** Claude Code

---

## Executive Summary for Stakeholders

The Calendar Management System transforms BANDWIDTH from a WhatsApp-based booking workflow into a professional, data-driven platform. This checklist bridges the 3003-line masterplan to actionable sprints.

**Quick Facts:**
- **Total Effort:** 320 person-hours (MVP Phase 1 = 110 hours)
- **MVP Timeline:** 8 weeks (Phase 1)
- **Team Needed:** 2 full-stack engineers + 1 designer + 1 QA
- **Launch Target:** Q2 2026
- **Key Win:** Single source of truth replaces WhatsApp chaos

---

## Phase 1: MVP (Weeks 1–8) — 110 Hours

### Week 1–2: Database & API Foundation (30h)

#### Database Schema
- [ ] Create `availability_slots` table (artist hour-by-hour slots, time zones)
- [ ] Create `venue_hours` table (venue operating hours + rules)
- [ ] Create `travel_marks` table (artist travel/vacation periods)
- [ ] Create `calendar_preferences` table (user view settings, visibility, timezone)
- [ ] Create `notification_triggers` table (calendar event → notification mapping)
- [ ] Add `location_metadata` to users table (city, country, lat/lng cache, updatedAt)
- [ ] Add `booking.calendarMetadata` JSONB field (slot, start_time, end_time, duration, timezone)
- [ ] Backfill existing bookings with calendar metadata

**Database Checklist:**
```sql
-- Verify schema
SELECT * FROM information_schema.tables WHERE table_name LIKE '%calendar%' OR table_name LIKE '%availability%';
-- Test timezone conversions
SELECT * FROM availability_slots LIMIT 5;
-- Verify location fields
SELECT id, city, country FROM users WHERE city IS NOT NULL LIMIT 10;
```

#### API Routes (Server)
- [ ] `GET /api/calendar/artist/:id/availability` — fetch artist's availability slots
- [ ] `POST /api/calendar/artist/availability` — create/update availability
- [ ] `DELETE /api/calendar/artist/availability/:slotId` — remove slot
- [ ] `GET /api/calendar/artist/:id/bookings` — fetch bookings with calendar metadata
- [ ] `GET /api/calendar/organizer/:id/events` — fetch organizer events
- [ ] `GET /api/calendar/venue/:id/bookings` — fetch venue bookings
- [ ] `POST /api/calendar/travel-mark` — mark travel/vacation period
- [ ] `DELETE /api/calendar/travel-mark/:id` — remove travel mark
- [ ] `PATCH /api/calendar/preferences` — update calendar visibility/timezone

**Implementation Notes:**
- Use `shared/routes.ts` for all endpoint definitions (follow BANDWIDTH pattern)
- Validate timezone input using `moment-timezone` or similar
- Implement `isAuthenticated` + role-based middleware
- Add comprehensive error handling (invalid timezones, overlapping slots, etc.)

---

### Week 3–4: Frontend Calendar Components (35h)

#### Calendar Library Decision
**Recommendation:** `react-big-calendar` (7.3K stars)
- Battle-tested, supports month/week/day views
- Mobile-responsive with custom styling
- Works well with Tailwind CSS via shadcn wrapper
- Good TypeScript support
- Alternative: Mobiscroll (professional, $$), FullCalendar (comprehensive, $$)

#### Components to Build
- [ ] `<CalendarView />` — main calendar container (month/week/agenda modes)
- [ ] `<MonthView />` — month grid display (desktop + mobile variants)
- [ ] `<WeekView />` — week timeline with hourly slots
- [ ] `<AgendaView />` — chronological list of upcoming events (mobile-first)
- [ ] `<AvailabilitySelector />` — time slot picker for setting availability
- [ ] `<EventDetailPanel />` — right-side panel showing booking/event details
- [ ] `<LocationBadge />` — city display with privacy controls
- [ ] `<EmptyState />` — context-aware empty messages
- [ ] `<NavigationBar />` — month/week/agenda selector + date navigation

**Touch-Friendly Specifications:**
- Minimum 48px touch targets for all interactive elements
- Swipe left/right for date navigation on mobile
- Long-press to open event details (no right-click)
- Haptic feedback on event selection (iOS + Android)
- Overflow indicators ("+3 more events") instead of cluttering cells

#### Responsive Breakpoints
```
- Desktop (1024px+): Month + Week side-by-side
- Tablet (768px–1023px): Month + Day stacked
- Mobile (<768px): Compressed month + Agenda list (primary)
```

---

### Week 5: Artist Features (25h)

#### Features to Implement
- [ ] Artist Availability Calendar (set work hours, vacation, travel)
- [ ] Availability Bulk Upload (CSV: date_start, date_end, hours, notes)
- [ ] Gig Discovery with Calendar Filter (show only events that fit availability)
- [ ] Booking Timeline View (inquiry → offered → negotiating → confirmed)
- [ ] Manual Slot Refresh (re-sync availability if changed elsewhere)
- [ ] Genre-Based Calendar Filter (hide events outside preferred genres)

#### Artist-Specific UX
- Empty State: "No gigs this week. Your availability is set. Check back daily for new opportunities."
- Successful Booking: Celebration animation + location context ("Bangalore, 30km from you")
- Conflict Warning: "This event overlaps with an existing booking on [date]"

#### Integration Points
- Link from `/find-gigs` → Calendar view of discovered events
- Link from calendar → NegotiationFlow for in-progress bookings
- Calendar events sync with booking status in real-time (WebSocket)

---

### Week 6: Organizer/Venue Calendar (20h)

#### Organizer Features
- [ ] Event Calendar (create event → auto-populate on calendar)
- [ ] Deadline Timeline (negotiation, contract signing, payment milestones)
- [ ] Artist Assignment Tracker (who applied, who's accepted, who's confirmed)
- [ ] Conflict Detection (auto-warn if assigning same artist to overlapping events)

#### Venue Manager Features
- [ ] Booking Calendar (view confirmed bookings by date)
- [ ] Availability Slots (mark operating hours; system prevents double-bookings)
- [ ] Revenue by Date (sum of artist fees for each date; "₹87K revenue this month")
- [ ] Optimization Suggestion (unused slots on high-demand days)

**Integration Points:**
- Link from `/organizer/events` → Event details open in calendar panel
- Drag-drop to reschedule event (move to different date)
- Double-click date to create new event

---

### Week 7–8: Notifications + Testing (15h)

#### Notification Integration
- [ ] Calendar event-triggered alerts (booking deadline approaching)
- [ ] Timezone-aware scheduling (remind 24h before deadline in user's local time)
- [ ] WebSocket sync (real-time calendar updates when booking status changes)
- [ ] Job queue setup (Bull.js) for scheduled reminders

#### Testing Checklist
- [ ] Unit tests for timezone conversions (5 test cases)
- [ ] Integration tests for availability slot creation (3 test cases)
- [ ] E2E tests for artist gig discovery → booking workflow (2 test cases)
- [ ] Mobile viewport testing (iOS Safari, Chrome Mobile, Samsung)
- [ ] Accessibility audit (keyboard nav, screen reader, color contrast)
- [ ] Performance profiling (LCP <2.5s, FID <100ms, CLS <0.1)

---

## Phase 2: Enhanced Features (Weeks 9–14) — 95 Hours

### Location Features (15h)
- [ ] Geolocation permission request + city-level reverse geocoding
- [ ] Location visibility toggle ("Show to All", "Artists Only", "Hidden")
- [ ] Location-based booking confirmation ("Book confirmed in Bangalore")
- [ ] IP-based fallback if GPS disabled
- [ ] Location refresh button + 7-day cache TTL

### Venue Manager Enhancements (20h)
- [ ] Admin calendar access (override privacy; view any user's calendar)
- [ ] Calendar performance optimization (pagination for large date ranges)
- [ ] Bulk event import (iCal/CSV)

### Mobile Polish (25h)
- [ ] Swipe gestures (navigate months, dismiss events)
- [ ] Bottom sheet for event details (instead of side panel)
- [ ] Offline mode (cache last 30 days of calendar locally)
- [ ] App-specific optimizations (PWA install prompt)

### Admin Tools (20h)
- [ ] Admin calendar dashboard (system-wide event monitoring)
- [ ] Audit trail for calendar changes (who moved what, when)
- [ ] Dispute resolution context (calendar + booking history)

### Timezone Handling (15h)
- [ ] Timezone conversion library integration (moment-timezone or date-fns)
- [ ] Test suite: convert event times across all major timezones
- [ ] Settings page: update user timezone
- [ ] Daylight saving time handling

---

## Phase 3: Gamification & Engagement (Weeks 15–18) — 65 Hours

### Artist Insights Dashboard
- [ ] Utilization analytics ("You booked 15 days last month; 13 days available")
- [ ] Empty slot report ("Missed ₹45K on [dates]; artists averaged 1.5 gigs/week")
- [ ] Streak badges (5 consecutive confirmed bookings → "On Fire" badge)
- [ ] Geographic diversity badge (played in 5+ cities)

### Notification-Driven Engagement
- [ ] Celebration notifications ("Congratulations! Booking confirmed for [event]")
- [ ] Opportunity alerts ("5 new gigs match your availability this week")
- [ ] Deadline reminders with urgency ("Contract signing due in 12 hours")

### Location Unlock Mechanics
- [ ] Milestone: "Play in 3 new cities → unlock location insights"
- [ ] Location-based recommendations ("Artists in your city usually charge ₹X for [genre]")

---

## Phase 4: Integrations & Optimization (Weeks 19–22) — 50 Hours

### Google Calendar Export
- [ ] iCal (.ics) generation from artist/organizer calendar
- [ ] One-click "Subscribe to BANDWIDTH Calendar" in Google Calendar app
- [ ] Two-way sync (optional; artist updates Google Calendar → BANDWIDTH updates)

### Performance Optimization
- [ ] Calendar rendering benchmarks (month view <500ms initial render)
- [ ] Lazy-load events outside visible month range
- [ ] Compress calendar data payload (gzip, differential updates)

### Final Hardening
- [ ] Load testing (1000 concurrent users viewing calendar)
- [ ] Security audit (rate limiting, SQL injection, XSS)
- [ ] GDPR audit (data deletion, access logs, consent trails)

---

## Critical Path Summary

**Blockers to Identify Early:**
1. **Timezone library choice** — Test `moment-timezone` vs `date-fns` by Week 1
2. **WebSocket capacity** — Verify existing ws.ts can handle calendar updates by Week 4
3. **Calendar library integration** — Prototype with react-big-calendar by Week 3
4. **Location API selection** — Decide on BigDataCloud vs IP geolocation by Week 2

**Kill Switches (If Behind):**
- Drop Phase 4 integrations → launch Phase 3 without Google Calendar export
- Reduce admin features in Phase 2 → focus on artist/organizer core
- Skip offline mode → simplify mobile experience initially

---

## Success Metrics (MVP Launch)

- [ ] Artists set availability: 30%+ adoption within 2 weeks
- [ ] Gig discovery: 40% of discovery flow uses calendar filter
- [ ] Mobile usage: 60%+ of calendar interactions are on mobile
- [ ] Notification engagement: 70%+ calendar notifications opened
- [ ] Calendar load time: <2.5s on 4G network

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Timezone bugs cause wrong event times | High | Comprehensive test suite (all major TZs) + UAT with international users |
| Real-time sync (WebSocket) fails | High | Implement fallback to HTTP polling; test reconnect scenarios |
| Mobile performance issues (janky scrolling) | Medium | Profile with Chrome DevTools early; virtualize large lists |
| Location permission rate low | Medium | Make location optional; use IP-based fallback; clear UX |
| Admin calendar access abuse | High | Immutable audit logs; require 2FA for admin calendar access |

---

## File Structure (Frontend)

```
client/src/
├── pages/
│   ├── artist/
│   │   ├── ArtistCalendar.tsx (new)
│   │   ├── AvailabilityManager.tsx (new)
│   ├── organizer/
│   │   ├── OrganizerCalendar.tsx (new)
│   ├── venue/
│   │   ├── VenueCalendar.tsx (new)
│   ├── admin/
│   │   └── AdminCalendarDashboard.tsx (new)
├── components/
│   ├── calendar/
│   │   ├── CalendarView.tsx (main container)
│   │   ├── MonthView.tsx
│   │   ├── WeekView.tsx
│   │   ├── AgendaView.tsx
│   │   ├── AvailabilitySelector.tsx
│   │   ├── EventDetailPanel.tsx
│   │   ├── LocationBadge.tsx
│   │   └── EmptyState.tsx
├── hooks/
│   ├── use-calendar.ts (new)
│   ├── use-availability.ts (new)
│   ├── use-location.ts (new)
│   └── use-calendar-sync.ts (WebSocket + real-time)
├── lib/
│   ├── calendar-utils.ts (timezone, slot math)
│   └── location-utils.ts (city-level geocoding)
```

## File Structure (Backend)

```
server/
├── services/
│   ├── calendar.service.ts (new - availability, slots, sync)
│   ├── location.service.ts (new - geolocation, caching)
├── routes/
│   ├── calendar.ts (new - all calendar endpoints)
├── db/
│   └── migrations/
│       ├── add_availability_slots.ts (new)
│       ├── add_venue_hours.ts (new)
│       ├── add_travel_marks.ts (new)
│       └── add_location_metadata.ts (new)
```

---

## Sign-Off Checklist

- [ ] Product Owner: Vision & scope approved
- [ ] Engineering Lead: Timeline & effort estimates reviewed
- [ ] Design Lead: Mobile UX guidelines acknowledged
- [ ] Security Lead: Privacy & GDPR approach signed off
- [ ] QA Lead: Test strategy & coverage targets approved

---

## Next Steps

1. **Week 1 Kick-off:** Database schema design review + API contract finalization
2. **Week 1 End:** React-big-calendar POC complete + mobile responsive testing
3. **Week 2 Mid-point:** Availability slot CRUD working end-to-end
4. **Week 3 End:** Artist calendar view displayed with real data
5. **Weekly Demos:** Each Friday, show working features to stakeholders

---

**Document Owner:** Engineering Lead | **Last Updated:** April 4, 2026 | **Next Review:** Weekly Sprint Retro
