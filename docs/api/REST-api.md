# REST API Documentation

## Endpoints

### Authentication
- `POST /api/register`
  - Body: `{ email, username, password, role... }`
  - Response: Auth user details
- `POST /api/login`
  - Body: `{ username, password }`
  - Response: Session establishment
- `POST /api/logout`
  - Clears session.
- `GET /api/user`
  - Response: Active user data

### Users
- `GET /admin/users`
  - Role: Admin
- `PATCH /admin/users/:id/status`
- `PATCH /admin/users/:id/role`

### Profiles
- `GET /api/artists`
- `GET /api/artists/:id`
- `PUT /api/artists/:id`
- `POST /api/artists/profile/complete`
- `GET /api/artists/profile/status`

- `GET /api/venues`
- `GET /api/venues/:id`
- `POST /api/venues/profile/complete`
- `GET /api/venues/profile/status`
- `PATCH /api/venues/profile`
- `GET /api/venues/dashboard`
- `GET /api/venues/events/upcoming`

### Events
- `GET /organizer/events`
- `POST /organizer/events`
- `PUT /organizer/events/:id`
- `DELETE /organizer/events/:id`
- `PUT /organizer/events/:id/publish`

### Bookings and Negotiation
- `GET /api/bookings`
- `POST /api/bookings`
- `PUT /api/bookings/:id`
- `POST /api/bookings/apply`
- `POST /api/bookings/:id/negotiate`
  - Body: Workflow context step updates
- `POST /api/bookings/:id/accept`
- `POST /api/bookings/:id/decline`

- `GET /organizer/bookings`
- `GET /organizer/bookings/:id`
- `POST /organizer/bookings/:id/complete`

### Contracts
- `POST /bookings/:bookingId/contract/initiate`
- `GET /admin/contracts/pending`
- `POST /admin/contracts/:id/review`

### Messaging
- `GET /admin/conversations`
- `GET /admin/conversations/:id/messages`

## Examples
### Authentication
```bash
curl -X POST http://localhost:5000/api/login \\
     -H "Content-Type: application/json" \\
     -d '{"username": "testuser", "password": "securepassword"}'
```
### Fetch Artist Status
```bash
curl -X GET http://localhost:5000/api/artists/profile/status \\
     -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## Changelog Tracking
Refer to `CHANGELOG.md` for specific endpoint version updates.
