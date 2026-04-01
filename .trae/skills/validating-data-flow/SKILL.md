---
name: "validating-data-flow"
description: "Validates frontend-backend-DB flow for new features. Trigger when adding functionality that touches persistence or APIs, or when suspecting schema mismatches."
---

# Validating Data Flow

## When to Use

- When adding or modifying functionality spanning UI, API, services, and persistence.
- When suspecting schema mismatches or missing indexes.

## How to Execute

- Trace the data flow end-to-end: UI inputs, API request/response, Controller, Service, Repository, DB tables.
- Validate that inputs are typed, API contracts match consumers, and schema supports operations.
- Propose a migration with clear rationale if schema gaps exist, and update schema docs.

## What to Output

- A clear map of the data path and validation points.
- A precise schema diff when DB changes are needed.
