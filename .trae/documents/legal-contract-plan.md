# Legal Contract Generation System Plan

## 1. Overview
The goal is to implement a comprehensive legal contract generation system that automatically creates legally binding artist-organizer agreements compliant with Indian contract law (Indian Contract Act 1872, Copyright Act 1957, Arbitration and Conciliation Act 1996, GST/TDS provisions, and IT Act 2000).

## 2. Database Schema Updates (`shared/schema.ts`)
*   **Audit existing profiles:** Check `users`, `artists`, and `promoters` tables.
*   **Add Legal & Financial Fields:**
    *   **Legal Identity:** `legalName` (if different from displayName), `permanentAddress`, `emergencyContact`.
    *   **Taxation:** `panNumber`, `gstin`.
    *   **Banking (for artists primarily):** `bankAccountNumber`, `bankIfsc`, `bankBranch`, `bankAccountHolderName`.
    *   **Contract Extensions:** Ensure `contracts` and `contractSignatures` tables properly store IP addresses and timestamps for IT Act 2000 compliance (they currently have `ipAddress` and `signedAt`, verify completeness).

## 3. Backend Services & API Endpoints
*   **Contract Generation API:**
    *   Update `server/contract-utils.ts` and `server/services/contract.service.ts` to map the exact plaintext legal template structure provided (10 sections: Event Details, Travel, Payment Terms, Billing, Hospitality, Equipment, Rights, Cancellation, Dispute Resolution, Final Terms).
*   **PDF Generation API:**
    *   Implement an endpoint (e.g., `POST /api/contracts/:id/generate-pdf`) using a library like `pdfmake` or `puppeteer` to convert the plaintext/markdown contract into a formatted PDF.
    *   Include watermarks (e.g., "Draft" or "Fully Executed").
    *   Append a signature certificate page logging the IP address, timestamp, and digital signature hashes for both parties.
*   **Signature Workflow:**
    *   Update the signature endpoint to ensure it captures and securely logs the user's IP address (from the request) and precise timestamp.

## 4. UI Components (Negotiation & Profile)
*   **Profile Setup:**
    *   Update Artist and Organizer profile forms to mandate input for PAN, GSTIN, Legal Name, and Bank Details.
*   **Negotiation Flow (`client/src/components/booking/NegotiationFlow.tsx`):**
    *   Integrate forms/modals to negotiate and capture specific contract variables:
        *   **Travel & Accommodation:** Transportation mode, class (e.g., Business Class), routing, hotel star rating, room type.
        *   **Hospitality & Security:** Guest list count, green room requirements, food & beverage allowance.
        *   **Technical Rider:** File upload/link for technical specifications.
        *   **Promotional Obligations:** Branding requirements.
    *   **Validation:** Implement real-time validation to ensure all these prerequisites are agreed upon and filled out before the booking can transition to the "contracting" phase.

## 5. Testing Strategy
*   **Unit Tests:** Verify the PDF generation mapping logic. Ensure all variables from the booking snapshot map to the correct clauses in the contract.
*   **Validation Tests:** Ensure the negotiation flow cannot proceed to contract generation if mandatory legal fields (PAN, Bank details, Travel routing) are missing.
*   **Compliance Tests:** Verify the signature API correctly logs the IP address and generates an IT Act 2000 compliant audit trail.

## 6. Execution Steps
1.  Update `shared/schema.ts` and run migrations.
2.  Update backend validation schemas for the new fields.
3.  Update the Contract Template generator (`server/contract-utils.ts`) with the new legal text.
4.  Build the PDF Generation Service.
5.  Update Frontend Profile pages to collect legal/bank info.
6.  Enhance the `NegotiationFlow` UI to capture travel, hospitality, and technical details.
7.  Write and execute test scenarios.