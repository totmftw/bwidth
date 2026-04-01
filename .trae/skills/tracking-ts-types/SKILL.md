---
name: "tracking-ts-types"
description: "Tracks exported TypeScript types, interfaces, and enums in docs. Trigger when modifying TypeScript type definition files to ensure frontend/backend consistency."
---

# Tracking TS Types

## When to Use

- When modifying TypeScript type definition files (`*types.ts`, `interfaces.ts`, `types/` folders).

## How to Execute

- Extract exported type, interface, and enum definitions from edited files.
- Update `docs/technical/type-registry.md`.
- Check naming conventions (`PascalCase` for types, `camelCase` for values).
- Search for duplicates across frontend/backend and recommend consolidation.

## What to Output

- Short list of types added/changed/removed.
- Callout for breaking changes when shared type shapes change.
