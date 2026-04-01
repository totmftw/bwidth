---
name: "organizing-root-files"
description: "Keeps repo root clean by relocating new root files and updating references. Trigger when a new file is created in the repository root."
---

# Organizing Root Files

## When to Use

- When a new file is created in the repository root.
- When the root accumulates scripts/docs/tests that should live elsewhere.

## How to Execute

- Classify the file (docs, tests, deployment script, config, misc).
- Move it into an appropriate folder (`docs/`, `tests/`, etc.).
- Search for and update references (imports, scripts, links) to the new path.
- Ensure essential files remain in root (`README.md`, `package.json`, etc.).

## What to Output

- Clean root directory with no broken imports or script references.
