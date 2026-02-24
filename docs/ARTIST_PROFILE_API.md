# Artist Profile API

Reference for the artist profile completion endpoints and the shared utility module that powers them.

## Overview

Artist profile completion is a one-time onboarding step (with update support) that collects an artist's stage name, bio, genre, fee range, social links, and optional metadata. The flow is:

1. Frontend wizard (`client/src/pages/artist/ProfileSetup.tsx`) collects form data.
2. `POST /api/artists/profile/complete` validates, creates or updates the artist record.
3. `GET /api/artists/profile/status` returns `{ isComplete: true | false }` to drive redirect logic.

## Endpoints

### POST /api/artists/profile/complete

Creates or updates the authenticated artist's profile. Uses upsert logic — if an artist record already exists for the user it is updated, otherwise a new one is created.

| Aspect | Detail |
|---|---|
| Auth | Session cookie required (`req.isAuthenticated()`) |
| Role gate | `user.role` or `user.metadata.role` must be `"artist"` |
| Success | `200` with `{ message, artist }` |
| Validation error | `400` with `{ message: "Validation failed", errors: ZodIssue[] }` |
| Wrong role | `403` |

#### Request body

| Field | Type | Required | Constraints |
|---|---|---|---|
| stageName | string | yes | min 2 chars |
| bio | string | yes | 50–500 chars |
| location | string | yes | min 2 chars |
| primaryGenre | string | yes | min 1 char |
| feeMin | number | yes | >= 100 |
| feeMax | number | yes | >= 100 |
| currency | string | no | defaults to `"INR"` |
| yearsOfExperience | number | no | 0–50 |
| secondaryGenres | string[] | no | max 3 items |
| performanceDurations | string[] | no | e.g. `["30min","60min"]` |
| soundcloudUrl | string | no | |
| mixcloudUrl | string | no | |
| instagramHandle | string | no | |
| websiteUrl | string | no | |
| achievements | string | no | |
| technicalRider | string | no | |
| equipmentRequirements | string | no | |
| travelPreferences | string | no | |

Numeric fields accept string values (coerced by Zod).

#### Response (200)

```json
{
  "message": "Profile completed successfully",
  "artist": {
    "id": 42,
    "userId": 7,
    "name": "DJ Example",
    "bio": "...",
    "priceFrom": "5000",
    "priceTo": "15000",
    "metadata": {
      "profileComplete": true,
      "primaryGenre": "Electronic",
      "trustScore": 50
    }
  }
}
```

#### Validation error (400)

```json
{
  "message": "Validation failed",
  "errors": [
    { "code": "too_small", "path": ["stageName"], "message": "String must contain at least 2 character(s)" }
  ]
}
```

### GET /api/artists/profile/status

Returns the profile completion flag for the authenticated user.

| Aspect | Detail |
|---|---|
| Auth | Session cookie required |
| Success | `200` with `{ isComplete: boolean }` |

`isComplete` is `true` only when `artist.metadata.profileComplete === true`.

## Utility module — `server/artist-profile-utils.ts`

Extracted from `server/routes.ts` so the schema and pure functions can be imported by both the route handler and property-based tests without coupling to Express.

### Exports

| Export | Kind | Purpose |
|---|---|---|
| `artistProfileCompleteSchema` | Zod object | Validates the request body |
| `ArtistProfileInput` | TypeScript type | Inferred type from the schema |
| `buildArtistMetadata(data, existing?)` | function | Builds the JSONB metadata for the `artists` row |
| `buildArtistRecord(data)` | function | Builds top-level column values (`name`, `bio`, `priceFrom`, etc.) |
| `validateArtistProfile(input)` | function | Safe-parses unknown input, returns success/failure union |

### buildArtistMetadata

```typescript
buildArtistMetadata(profileData: ArtistProfileInput, existingMetadata?: Record<string, any>)
```

- Always sets `profileComplete: true` and `trustScore: 50`.
- On update (when `existingMetadata` is provided), existing keys not in the profile form are preserved via spread.
- Stamps `updatedAt` with the current ISO timestamp.

### buildArtistRecord

```typescript
buildArtistRecord(profileData: ArtistProfileInput)
```

Maps frontend field names to DB column names:
- `stageName` → `name`
- `feeMin` / `feeMax` → `priceFrom` / `priceTo` (as strings)
- `location` → `baseLocation: { name }` (JSONB)

### validateArtistProfile

```typescript
validateArtistProfile(input: unknown):
  | { success: true; data: ArtistProfileInput }
  | { success: false; errors: z.ZodIssue[] }
```

Wraps `safeParse` and returns a discriminated union. The `errors` array contains Zod issues with `path` arrays suitable for mapping to form fields on the client.

## Property-based tests

Located at `tests/properties/artist-profile.prop.ts`. Three properties are tested:

| Property | What it checks |
|---|---|
| P3: Round-trip | Valid input always parses; metadata has `profileComplete: true`; DB record faithfully reflects input |
| P4: Upsert idempotence | Applying completion twice yields identical core fields; extra metadata keys survive merge |
| P5: Invalid data errors | Constraint violations produce field-level Zod issues for the offending path |
