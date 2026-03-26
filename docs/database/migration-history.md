# Database Migration History

## Overview
This file serves to track major structural modifications via Drizzle ORM pushing to the platform schema.

---

### [Initial Version] - Groundwork
**Date**: Initial Release Setup
**Description**: Established core PostgreSQL schema covering User profiles, Artists, Promoters, Venues, Events, Bookings, Contracts, Messaging workflows, and Auditing.

**Key Changes**:
- Enums setup for standard fields.
- Base tables with UUID / Increment IDs.
- Core relationship indexing mapping.
- Implemented `conversation_workflow_instances` for negotiation tracking.

*(Add future migrations natively utilizing `drizzle-kit generate` inside the backend directory)* 
