---
name: "syncing-ts-api-docs"
description: "Keeps `docs/api/` synchronized with TypeScript API changes. Trigger when changing TypeScript that defines API contracts, DTOs, or endpoint wiring."
---

# Syncing TS API Docs

## When to Use

- When changing TypeScript that defines API contracts, request/response DTOs, or endpoint wiring.

## How to Execute

- Identify what changed (new endpoints, params added/removed, response format changes).
- Update corresponding markdown file(s) under `docs/api/`.
- Preserve existing doc style and headings.

## What to Output

- Diff-style summary of contract changes.
- Updated docs that stay consistent with the code.
