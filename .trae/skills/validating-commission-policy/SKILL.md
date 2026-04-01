---
name: "validating-commission-policy"
description: "Ensures commission logic handles dual-sided fees, artist categories, and trust scores correctly. Trigger when writing or editing logic calculating platform fees, payouts, or deals."
---

# Validating Commission Policy

## When to Use

- When writing or editing logic that calculates platform fees, payouts, or deals with artist categories/trust scores.

## How to Execute

- Verify double-sided monetization (Platform Revenue = Artist + Organizer Commission).
- Check base commission derives accurately from Artist Category.
- Ensure Trust Score Tier modifies payment flexibility correctly.
- Critically check all financial math is snapshotted at booking creation and never recalculated.

## What to Output

- Audit of financial logic confirming snapshotting rule is respected and modifiers apply correctly.
