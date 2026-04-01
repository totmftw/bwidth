---
name: "scanning-security-quality"
description: "Scans for secrets, insecure configs, and common vulnerabilities. Trigger before deployments, after adding auth/payments/uploads/CORS changes, or when suspecting leaked secrets."
---

# Scanning Security Quality

## When to Use

- Before deployment/release.
- After adding auth, payments, file uploads, or CORS changes.
- When suspecting leaked secrets or insecure patterns.

## How to Execute

- Search for hardcoded credentials, overly permissive CORS, missing input validation, SQL injection vectors, and unsafe logging.
- Run lint/format tooling checks if applicable.

## What to Output

- Findings including file locations and risk explanation.
- Fixes avoiding logging or committing any secret values.
