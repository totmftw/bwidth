# Frontend Master Documentation

## Overview
This document maps the React.js client architecture (within the `client` folder). The client communicates directly with the Node.js backend to present an immersive interface across diverse user roles.

## Architectural Segments
### Pages & Roles
The application encompasses unique dashboards specific to roles, enforcing customized UI views per persona. This primarily spans:
- Organizer Dashboards (Event creation, discovery tools)
- Artist Dashboards (Tracking bookings, managing profiles, responding to negotiations)
- General Views (Explore, login, register logic)

### Components
React components are categorized generally around features or atomic UI parts:
- **BookingModal.tsx**: Example of a core operational component where artists interact against an event directly for queries and negotiations.
- **Workflow & Chat Interfaces**: Implements UI state syncs with the `conversation_workflow_instances` to actively constrain forms representing inputs like 'offerAmount' and 'duration' safely.
- **ContractViewer**: Display structures for rendering contract PDFs and version tracking.

### Contexts & Hooks
The frontend relies heavily on customized hooks pulling queries (frequently relying on standard react-query implementations or similar) for fetching user statuses and resolving asynchronous operations seamlessly. Role evaluation takes place per page loading (ensured by protected routes and API interceptors).

## Implementation Details
React Router manages all structural navigation across the app's components. The layout extensively employs highly-styled interactive designs intended for mobile-responsive, modern application behaviors. The navigation heavily ties into role-based conditionals hiding inapplicable links for unauthorized entities.
