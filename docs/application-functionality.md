# Platform Functionality Documentation

## 1. Overview
The platform serves as an end-to-end booking, negotiation, and contracting system for Artists, Organizers, and Venues. It is overseen by a powerful App Admin role capable of intervening in any workflow and toggling global approval requirements.

## 2. User Roles
- **Artist**: Can discover gigs, negotiate terms, request specific tech gear, and sign performance contracts.
- **Organizer**: Can book artists, specify provided event equipment, initiate contracts, and manage event lifecycles.
- **Venue**: Can list spaces for events and interact with organizers.
- **App Admin / SuperUser**: Has full systemic control, oversight over all entities, and can toggle workflow approvals on or off.

## 3. Negotiation Flow & Tech Rider
Before a contract is generated, the Artist and Organizer enter a negotiation phase.
- **Financials & Scheduling**: Parties negotiate the booking fee and time slot.
- **Tech Rider Integration**: The chat UI allows the Organizer to explicitly list the equipment they will provide for the event. The Artist can counter or request additional gear they need, or clarify what they will bring themselves.
- **Finalization**: Once both parties click "Accept", the agreed-upon fee, slot, and tech rider are snapshotted into the booking.

## 4. Contract Edit Workflow
The platform employs a strict, sequential editing policy to prevent endless revisions:
1. **Full-Page Viewer**: Contracts are viewed in a dedicated, full-screen UI for readability.
2. **Organizer's Turn**: The Organizer is given the first opportunity to review the generated contract. They can make **one** set of edits to specific unlocked fields:
   - Date of the event
   - Time slot
   - Accommodations & Transportation
   - Hospitality (e.g., complementary beers/drinks)
3. **Artist's Turn**: The Artist receives the contract. They can either accept the Organizer's version or make their own **one-time** edit to those same fields.
4. **Final Resolution**: If the Artist made an edit, it goes back to the Organizer. The Organizer now has only two choices:
   - **Accept**: Agree to the Artist's final changes.
   - **Walk Away**: Decline the changes, voiding the contract and cancelling the booking entirely. No further negotiations are permitted.

## 5. Legal Signing Process
Once the contract text is finalized and accepted by both parties, the signing phase begins:
1. **Confirmation Checkpoint**: When a user clicks "Sign Contract", a popup dialog appears.
2. **Legally Binding Agreement**: The user must check a box stating they agree to abide by the contract and acknowledge it is legally binding.
3. **Digital Signature**: The user confirms their signature, which captures their IP address and timestamp.
4. **Admin Review**: After both parties sign, the contract is routed to the App Admin for final approval.
5. **PDF Generation**: Upon Admin approval, a PDF is generated featuring a distinct "Digitally Signed" watermark beneath the Artist and Organizer information, cementing its legal status.

## 6. App Admin Control Panel
The SuperUser (`musicapp`) operates from a dedicated dashboard (`/admin`):
- **Global Transparency**: The Admin can view the status of all events, negotiations, user profiles, and active contracts.
- **Intervention**: The Admin has the authority to manually approve, reject, or modify ongoing workflows.
- **Approval Toggles**: A dedicated control panel allows the Admin to turn mandatory approval steps on or off (e.g., bypassing the Admin Review step for contract signing if desired).