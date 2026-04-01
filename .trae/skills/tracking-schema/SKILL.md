---
name: "tracking-schema"
description: "Keeps `docs/database/` in sync with migrations/models. Trigger when editing or adding migration files, SQL, or any code changing the database schema."
---

# Tracking Schema

## When to Use

- When editing or adding migration files (SQL) or code that changes the DB schema.

## How to Execute

- Identify schema delta (tables/columns/indexes/constraints/enums/relationships).
- Update `docs/database/current-schema.md` to reflect current schema.
- Append succinct entry to `docs/database/migration-history.md`.
- Sanity-check naming conventions (`snake_case` tables/columns, `<table_name>_id` foreign keys).
- Suggest indexes for join/filter columns.

## What to Output

- Clear before vs after summary of schema changes.
- Updated documentation with consistent formatting.
