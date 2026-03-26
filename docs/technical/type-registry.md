# TypeScript Type Registry

## Shared Entities (Drizzle Zod / Exported from `schema.ts`)

These types are fundamentally shared natively between the Node Backend and React Frontend.

### Users
- `User`: Standard read type.
- `InsertUser`: Mutable creation type.

### Profiles
- `Artist` / `InsertArtist`: Fields such as `baseLocation` and `name`.
- `Promoter` / `InsertPromoter`: Organizer configurations.
- `Venue` / `InsertVenue`: Contains `capacity` / `address` objects.

### Bookings / Events
- `Event` / `InsertEvent`
- `Booking` / `InsertBooking`
- `Contract` / `InsertContract`
- `ContractVersion` / `InsertContractVersion`
- `ContractEditRequest` / `InsertContractEditRequest`
- `ContractSignature` / `InsertContractSignature`

### Communication
- `Conversation` / `InsertConversation`: Links subjects uniquely with entity data.
- `ConversationWorkflowInstance` / `InsertConversationWorkflowInstance`: Dictates active state machines tracking lockouts during negotiations.
- `Message` / `InsertMessage`: Chat structure wrapping payloads.
- `BookingProposal` / `InsertBookingProposal`: Stores `proposedTerms` historically.

## Formatting Standards
Files and contexts across the project strongly adhere to PascalCase formatting to unify type casting throughout hooks (e.g., `useBookings` returning `Booking[]`). Validating endpoints heavily consume these mapped `insert` schemas parsed natively by Drizzle-Zod plugins.
