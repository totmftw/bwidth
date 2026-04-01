---
name: "generating-auto-docs"
description: "Creates or updates documentation for changed code. Trigger when new features ship, a new module is added, or user-visible behavior changes, requiring documentation to stay current."
---

# Generating Auto Docs

## When to Use

- When adding a feature, a new module, or changing user-visible behavior.
- When maintaining `docs/` accuracy with minimal drift.

## How to Execute

- Update or create docs under `docs/` describing: Functional behavior, Technical behavior, and API details when relevant.
- Prefer updating existing docs over creating many small files.
- Only add inline code comments when explicitly requested or required for maintainability.

## What to Output

- Documentation matching the current code without speculative claims.
