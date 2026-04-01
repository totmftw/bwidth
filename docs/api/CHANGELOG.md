# API Changelog

## [1.0.1] - 2026-04-01
### Changed
- Migrated Admin APIs from `/admin/*` to `/api/admin/*` to remove frontend route collisions on `/admin`.
- Updated admin user management endpoints to `/api/admin/users`, `/api/admin/users/:id/status`, and `/api/admin/users/:id/role`.
- Updated admin contract endpoints to `/api/admin/contracts/pending` and `/api/admin/contracts/:id/review`.
- Updated admin conversation endpoints to `/api/admin/conversations` and `/api/admin/conversations/:id/messages`.
- Updated admin settings endpoints to `/api/admin/settings`.

## [1.0.0]
### Added
- Created comprehensive API footprint mapping Artists, Promoters, Events, and Bookings.
- Defined base endpoints for authentication (`/api/login`, `/api/register`, `/api/user`, `/api/logout`).
- Implemented `/admin` tier for universal oversight.
- Implemented state-managed workflow execution steps mapped to `/api/bookings/:id/negotiate`.
- Established `/organizer` dashboard data routes.
- Initial API release.
