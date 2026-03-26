# Database Schema Documentation

## Core Enums
- `user_status`, `role_name`, `booking_status`, `contract_status`, `dispute_status`, `payment_status`, `payout_status`, `proposal_status`

## User Management
- **users**: `id`, `username`, `email`, `passwordHash`, `phone`, `status`, `locale`, `createdAt`
- **roles**: `id`, `name`, `description`
- **user_roles**: `userId`, `roleId`

## Profiles & Organizations
- **organizations**: `id`, `name`, `slug`
- **artists**: `id`, `userId`, `name`, `bio`, `baseLocation`, `priceFrom`, `priceTo`
- **promoters**: `id`, `userId`, `name`, `contactPerson`
- **venues**: `id`, `userId`, `name`, `address`, `capacity`

## Events
- **events**: `id`, `organizerId`, `venueId`, `title`, `startTime`, `endTime`, `status`, `visibility`
- **temporary_venues**: custom locations for events.
- **event_stages**: multiple stages tied to an event.

## Bookings & Contracts
- **bookings**: `id`, `eventId`, `artistId`, `status`, `offerAmount`, `finalAmount`
- **contracts**: `id`, `bookingId`, `version`, `status`, `contractPdf`, `signatures`, `finalizedAt`
- **contract_versions**: Historical tracking of `contractText` and `terms`.
- **contract_edit_requests**: `contractId`, `requestedBy`, `changes`
- **contract_signatures**: `userId`, `role`, `signatureData`, `ipAddress`
- **booking_proposals**: `bookingId`, `proposedTerms`, `round`

## Messaging & Workflow
- **conversations**: `id`, `subject`, `entityType`, `entityId`, `status`
- **conversation_workflow_instances**: `conversationId`, `workflowKey`, `currentNodeKey`, `round`, `context`, `locked`
- **messages**: `id`, `conversationId`, `senderId`, `body`, `messageType`, `payload`

## Analytics & Tracking
- **audit_logs**: tracks all system changes (`diff`, `action`).
- **payments**: transaction gateways.
- **payouts**: out-going payouts.
