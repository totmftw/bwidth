---
name: "analyzing-code-quality"
description: "Reviews edited files for smells, maintainability, and performance. Trigger after code edits to improve code quality safely or when suspecting duplication and unclear logic."
---

# Analyzing Code Quality

## When to Use

- When a file has been edited and a targeted quality pass is desired.
- When suspecting duplication, unclear logic, or performance issues.

## How to Execute

- Review for code smells, best practices (React/Node/TypeScript), maintainability, and performance issues.
- Propose changes that improve readability first.
- Prefer refactors that reduce risk and preserve behavior.
- Do not introduce new files unless necessary.

## What to Output

- Concrete, patch-ready improvements with rationale.
- A short list of non-critical followups if intentionally deferred.
