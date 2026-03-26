# Entity Relationship Definitions

## Core Entities
1. **Users**
    - One-to-Many with **roles** via **user_roles**
    - One-to-One with **artists** (if artist user)
    - One-to-One with **promoters** / **organizers** (if organizer)
    - One-to-Many with **messages**, **notifications**

2. **Events**
    - Belong to **venues** (or **temporary_venues**)
    - Organized by **promoters**
    - Contain multiple **event_stages**
    - One-to-Many with **bookings**

3. **Bookings (The Nexus)**
    - Bridges an **event** and an **artist**.
    - Serves as the `entityId` for **conversations** resolving the negotiation details.
    - Resolves into a 1:1 relationship with **contracts**.
    - Drives the **booking_proposals** history line during negotiation locks.

4. **Contracts**
    - Owned by a **booking**.
    - Maintains Many-to-One relationships with **contract_versions**, tracking live edits.
    - Contains **contract_signatures** bridging back to the specific **users** (Promoter/Artist).

5. **Conversations**
    - Contains many **messages** and **conversation_participants**.
    - Mapped 1:1 with **conversation_workflow_instances** during explicit negotiation locking flows. 
    - Messages track **message_reads** joining to a user.
