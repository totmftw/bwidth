## Domain Model Rules

- Platform controls all contracts
- No direct artist-organizer contract exists

- Entities:
  - Artist
  - Organizer
  - Booking
  - Contract
  - Payment
  - TrustScore
  - Commission

- Every booking MUST:
  - Have a contract
  - Have commission snapshot
  - Have trust score snapshot

- Artist category:
  - budding
  - mid_scale
  - international

- Trust tiers:
  - critical
  - high_risk
  - standard
  - trusted
  - premium