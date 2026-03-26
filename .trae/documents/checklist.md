# Implementation Checklist

## 1. Schema & Database
- [ ] Enums for `artist_category` and `artist_category_source` created.
- [ ] `artists` table extended with all required category and commission fields.
- [ ] `artist_category_history` table created.
- [ ] `commission_policies` table created.
- [ ] `bookings` table extended with snapshot fields and double-sided monetization fields.
- [ ] `contracts` table extended with snapshot, JSON, and signature requirement fields.
- [ ] Migrations generated and successfully applied.
- [ ] Existing artists backfilled with a default category.

## 2. Backend Services
- [ ] `artistCategory.service.ts` correctly auto-suggests categories.
- [ ] `artistCategory.service.ts` tracks history when categories change.
- [ ] `commissionPolicy.service.ts` accurately calculates organizer payable, artist receivable, and platform spread.
- [ ] `booking.service.ts` properly freezes/snapshots financial math upon confirmation.
- [ ] `contract.service.ts` uses booking snapshots (not live data) to generate contracts.
- [ ] `contract.service.ts` correctly varies contract clauses based on category and trust tier.

## 3. User Interfaces
- [ ] Artist UI displays category/trust badges and accurate financial estimates.
- [ ] Organizer UI clearly explains categories and shows transparent booking cost breakdowns.
- [ ] Admin UI allows viewing, approving, and overriding artist categories.
- [ ] Contract progress (Artist signs -> Organizer signs) is clear in all dashboards.

## 4. Quality Assurance
- [ ] Unit tests written and passing for commission math.
- [ ] Unit tests written and passing for category assignment logic.
- [ ] Integration tests verify that updating an artist's profile does not affect existing finalized bookings/contracts.
- [ ] UI tested on all roles (Artist, Organizer, Admin) for correctness and clarity.
