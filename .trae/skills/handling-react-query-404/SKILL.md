---
name: "handling-react-query-404"
description: "Checks React Query implementations for expected 404s to prevent wrapper-induced fatal errors. Trigger when writing frontend data fetching logic where a 404 is an expected state."
---

# Handling React Query 404

## When to Use

- When writing frontend data fetching logic using `@tanstack/react-query`.
- When interacting with endpoints where `404 Not Found` is a valid expected state.

## How to Execute

- Inspect the data fetching wrapper (e.g., `apiRequest`).
- Refactor specific call to use `fetch` directly if wrapper might throw expected `404`.
- Ensure `res.status === 404` condition is handled gracefully in component/hook logic.

## What to Output

- Confirmation that `useQuery`/`useMutation` correctly anticipates missing resources without crashing.
