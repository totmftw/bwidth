---
name: "syncing-master-docs"
description: "Maintains consolidated docs in `docs/master/`. Trigger when making meaningful edits to modules that change behavior, flows, or architecture."
---

# Syncing Master Docs

## When to Use

- When making meaningful edits to modules that change behavior, flows, or architecture.

## How to Execute

- Determine which master doc is affected (frontend/backend/api/middleware/database).
- Update only the relevant section(s) to reflect current behavior.
- Preserve unrelated sections unchanged.
- Create `docs/master/` if it does not exist.

## What to Output

- Master docs describing behavior (what) and implementation (how) accurately.
