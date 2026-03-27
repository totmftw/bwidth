# Implementation Checklist

## Backend

* [ ] Add strict validation for legal profile fields in `generateContractFromSnapshot`.

* [ ] Update `generateContractText` signature blocks to use dynamic `[[TOKEN]]` format.

* [ ] Implement token string replacement in `POST /api/contracts/:id/sign`.

## Frontend

* [ ] Remove `PartyStatusCard` from `ContractPage.tsx`.

* [ ] Implement single-line, horizontally scrolling status tracker.

* [ ] Format the Financial Breakdown strictly as requested.

* [ ] Remove height constraints on contract document view.

* [ ] Implement regex-based section parser for contract text.

* [ ] Render floating "Edit" buttons on editable text sections.

* [ ] Wire floating "Edit" buttons to open category-specific Sheets.

* [ ] Ensure all action buttons are large (touch-friendly) and sticky at the bottom.

## Quality & Validation

* [ ] Run `Code Quality Analyzer`

* [ ] Run `Data Flow Validation`

* [ ] Run `Auto Documentation Generator`

* [ ] Run `ts-api-doc-sync`

* [ ] Run `sync-master-docs`

