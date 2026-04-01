---
name: "checking-naming-conventions"
description: "Checks naming consistency across the stack. Trigger when introducing new variables, types, components, tables, columns, endpoints, or when refactoring names."
---

# Checking Naming Conventions

## When to Use

- When introducing new identifiers (variables, types, components, tables, endpoints).
- When refactoring names across layers.

## How to Execute

- Verify conventions: variables/functions (`camelCase`), components/types/classes (`PascalCase`), DB tables/columns (`snake_case`), APIs (`kebab-case`).
- Flag mismatches causing cross-layer drift.
- Suggest renames minimizing churn.

## What to Output

- Focused list of inconsistencies with suggested corrections.
