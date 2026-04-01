---
name: "generating-api-docs"
description: "Generates and updates endpoint documentation under `docs/api/`. Trigger when backend route or controller files are edited, or when HTTP endpoints are added, removed, or changed."
---

# Generating API Docs

## When to Use

- When backend route or controller files are edited.
- When adding, removing, or modifying an HTTP endpoint.

## How to Execute

- Enumerate endpoints in the changed code: Method (`GET|POST|PUT|PATCH|DELETE`), Path, Auth requirements, Request params (path/query/body), Response shape, and status codes.
- Create or update a markdown doc in `docs/api/` for the affected area.
- Include Curl examples, Validation rules, and Error responses.
- Append a concise entry to `docs/api/CHANGELOG.md`.

## What to Output

- Documentation that matches the code (no invented endpoints).
- Copy-pastable examples consistent with existing doc style.
