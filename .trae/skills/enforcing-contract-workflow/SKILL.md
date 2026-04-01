---
name: "enforcing-contract-workflow"
description: "Validates contract logic against strict sequential edits, walk-away mechanics, and Indian Contract Act compliance. Trigger when modifying contract generation, signing, or negotiation code."
---

# Enforcing Contract Workflow

## When to Use

- When modifying or adding code related to contract generation, signing, or negotiation.
- When adjusting workflow states of a booking/contract.

## How to Execute

- Ensure strict sequential one-edit-per-party workflow is maintained.
- Validate "Walk Away" mechanic voids contract and cancels booking.
- Confirm contract structures include mandatory Indian Contract Act fields (PAN, GSTIN, Bank details).
- Verify contracts are snapshotted and immutable after both sign.
- Ensure text parsing logic for inline editing works without breaking backend schema.

## What to Output

- Report on adherence to domain rules.
- Warnings if state transitions bypass required steps or omit legal fields.
