---
name: "guarding-dashboard-state"
description: "Verifies frontend dashboards handle intermediate booking states across views. Trigger when introducing or modifying a booking state, or updating dashboard components."
---

# Guarding Dashboard State

## When to Use

- When introducing or modifying a booking state.
- When updating dashboard components (Artist/Organizer/Venue bookings).

## How to Execute

- Trace the new/modified state through the multi-step workflow.
- Ensure all relevant frontend components have explicit, distinct conditional checks for the new state.
- Ensure buttons/calls-to-action correctly reflect the intermediate state.
- Confirm dynamic workflow toggles are properly respected in the UI.

## What to Output

- Checklist of roles and how the new state is presented to each, ensuring no blind spots.
