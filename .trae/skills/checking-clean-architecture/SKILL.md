---
name: "checking-clean-architecture"
description: "Ensures business logic remains in services and no inline SQL is used. Trigger when creating or modifying backend routes, controllers, or database interaction layers."
---

# Checking Clean Architecture

## When to Use

- When creating or modifying backend routes, controllers, or database interaction layers.

## How to Execute

- Validate flow follows: `controllers` -> `services` -> `repositories/storage` -> `db`.
- Ensure no business logic lives inside route handlers or controllers.
- Verify no inline SQL is used (all DB queries through Drizzle ORM).
- Check that all inputs are validated before passing to the service layer.

## What to Output

- Confirmation of clean architecture compliance or actionable suggestions to extract logic.
