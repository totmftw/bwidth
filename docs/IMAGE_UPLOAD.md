# Image Upload Module

## Overview

BANDWIDTH provides a reusable image upload system with drag-and-drop, URL input, and multi-image support. Images are stored as base64 data URLs in the PostgreSQL `media` table, eliminating the need for external file storage services during development.

The module consists of:

- **Server**: `server/routes/media.ts` -- five REST endpoints for upload, fetch, list, and delete
- **Client**: `client/src/components/ImageUpload.tsx` -- upload component with drag-drop and URL input
- **Client**: `client/src/components/ImageGallery.tsx` -- display component with lightbox

---

## Server API

All media endpoints are mounted under `/api/media` and registered via `server/routes.ts`.

### POST /api/media/upload

Upload one or more images from a device via multipart form data.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `images` | File[] | Yes | One or more image files (max 20 files per request) |
| `entityType` | string | No | Entity type for association (e.g. `artist_profile`, `venue_gallery`) |
| `entityId` | number | No | Entity ID for association |
| `altText` | string | No | Alt text for accessibility |

**Validation**:
- Each file must have a MIME type in the allowed list (see below)
- Each file must be under 20 MB
- If `entityType` and `entityId` are provided, the per-entity image limit is enforced

**Response** (201):
```json
[
  {
    "id": 42,
    "ownerUserId": 1,
    "entityType": "artist_portfolio",
    "entityId": 5,
    "mediaType": "image",
    "filename": "photo.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245000,
    "url": "/api/media/42/file",
    "altText": null,
    "metadata": {},
    "uploadedAt": "2026-04-01T10:00:00.000Z"
  }
]
```

Note: The `data` field (base64 content) is stripped from responses and replaced with a `url` field pointing to the serve endpoint.

### POST /api/media/url

Upload an image by providing its URL. The server fetches the image, converts it to base64, and stores it.

**Authentication**: Required

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "url": "https://example.com/photo.jpg",
  "entityType": "venue_gallery",
  "entityId": 12,
  "altText": "Venue exterior"
}
```

**Validation** (Zod schema):
- `url`: Valid URL string (required)
- `entityType`: String (required)
- `entityId`: Number (required)
- `altText`: String (optional)

**Behavior**:
1. Server fetches the URL with a 10-second timeout and `BANDWIDTH-Media-Fetcher/1.0` user agent
2. If the response is an image (`content-type` starts with `image/`) and under 20 MB, it is stored as base64
3. If the fetch fails or the response is not an image, only the URL string is stored in the `data` column (fallback mode with `metadata.urlOnly: true`)

**Response** (201): Same shape as the upload endpoint, single object (not array).

### GET /api/media/:id/file

Serve the image binary for display in `<img>` tags.

**Authentication**: Not required (public endpoint for image serving)

**Behavior**:
- If the stored `data` is a base64 data URL (`data:image/...;base64,...`), the server decodes it and sends raw binary with the correct `Content-Type` header
- If the stored `data` is an external URL, the server redirects with `302`
- Response includes `Cache-Control: public, max-age=86400` (24-hour cache)

**Response**: Raw image binary or 302 redirect.

### GET /api/media/entity/:entityType/:entityId

List all images associated with an entity.

**Authentication**: Not required

**Path Parameters**:
- `entityType`: The entity type string (e.g. `artist_portfolio`, `venue_gallery`)
- `entityId`: The entity ID (integer)

**Response** (200):
```json
[
  {
    "id": 42,
    "ownerUserId": 1,
    "entityType": "artist_portfolio",
    "entityId": 5,
    "mediaType": "image",
    "filename": "photo.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245000,
    "url": "/api/media/42/file",
    "altText": null,
    "metadata": {},
    "uploadedAt": "2026-04-01T10:00:00.000Z"
  }
]
```

### DELETE /api/media/:id

Delete a media record.

**Authentication**: Required

**Authorization**: Only the owner (`ownerUserId`) or an admin/platform_admin may delete.

**Response** (200):
```json
{ "message": "Media deleted" }
```

---

## Per-Entity Limits

The server enforces maximum image counts per entity type. These limits are checked on both `POST /api/media/upload` and `POST /api/media/url`.

| Entity Type | Max Images | Typical Use |
|-------------|------------|-------------|
| `user_avatar` | 1 | User profile photo |
| `artist_profile` | 1 | Artist profile photo |
| `artist_portfolio` | 20 | Artist portfolio gallery |
| `venue_cover` | 1 | Venue hero/cover image |
| `venue_gallery` | 20 | Venue photo gallery |
| `organizer_logo` | 1 | Organizer/promoter logo |
| `event_cover` | 3 | Event promotional images |
| Any other type | 10 | Default fallback limit |

When the limit would be exceeded, the server returns a `400` response with a descriptive message including the current count and maximum allowed.

---

## Allowed Image Types

| MIME Type | Extension |
|-----------|-----------|
| `image/jpeg` | .jpg, .jpeg |
| `image/png` | .png |
| `image/gif` | .gif |
| `image/webp` | .webp |
| `image/svg+xml` | .svg |

Maximum file size: **20 MB** per file.

---

## Client Components

### ImageUpload

**File**: `client/src/components/ImageUpload.tsx`

A reusable upload component that supports drag-and-drop, file browsing, and URL input. It has two layout modes: full (multi-image with grid preview) and compact (single avatar/logo).

#### Props

```typescript
interface ImageUploadProps {
  entityType: string;       // Entity type for server association
  entityId: number;         // Entity ID for server association
  maxImages?: number;       // Maximum number of images allowed (default: 10)
  existingImages?: UploadedImage[];  // Pre-loaded images
  onImagesChange?: (images: UploadedImage[]) => void;  // Callback when images change
  label?: string;           // Label text above the component
  description?: string;     // Helper text below the label
  className?: string;       // Additional CSS classes
  compact?: boolean;        // Use compact single-image layout (default: false)
}

interface UploadedImage {
  id: number;
  url: string;
  filename?: string;
}
```

#### Features

- **Drag and drop**: Drop zone accepts image files with visual feedback
- **File browser**: Click the drop zone or use the hidden file input
- **URL input**: Toggle "Add from URL" to enter an image URL directly
- **Upload progress**: Progress bar shown during upload
- **Image preview grid**: Uploaded images displayed in a responsive 2-4 column grid
- **Delete on hover**: Hover over an image to reveal a delete button
- **Compact mode**: When `compact={true}`, renders as a 24x24 avatar button for single-image slots (avatars, logos)
- **Client-side validation**: Checks MIME type, file size (20 MB), duplicate filenames, and max image count before uploading
- **Error display**: Animated error messages with per-file detail

#### Usage Examples

**Full layout (portfolio)**:
```tsx
<ImageUpload
  entityType="artist_portfolio"
  entityId={artist.id}
  maxImages={20}
  existingImages={currentImages}
  onImagesChange={(images) => setPortfolioImages(images)}
  label="Portfolio Images"
  description="Upload photos of your performances"
/>
```

**Compact layout (avatar)**:
```tsx
<ImageUpload
  entityType="user_avatar"
  entityId={user.id}
  maxImages={1}
  existingImages={avatarImage ? [avatarImage] : []}
  onImagesChange={(images) => setAvatar(images[0] || null)}
  label="Profile Photo"
  compact
/>
```

### ImageGallery

**File**: `client/src/components/ImageGallery.tsx`

A read-only gallery component with responsive grid layout and lightbox viewer.

#### Props

```typescript
interface ImageGalleryProps {
  images: GalleryImage[];   // Array of images to display
  className?: string;       // Additional CSS classes
  columns?: 2 | 3 | 4;     // Number of grid columns (default: 3)
}

interface GalleryImage {
  id: number;
  url: string;
  filename?: string;
  altText?: string;
}
```

#### Features

- **Responsive grid**: Configurable 2, 3, or 4 columns with responsive breakpoints
- **Lightbox**: Click any image to open a full-screen dialog viewer
- **Keyboard navigation**: Arrow keys to navigate, Escape to close
- **Image counter**: Shows position indicator (e.g. "3 / 12") in lightbox
- **Empty state**: Displays a placeholder when no images are available
- **Lazy loading**: Images use `loading="lazy"` for performance

#### Usage Example

```tsx
<ImageGallery
  images={portfolioImages.map(img => ({
    id: img.id,
    url: img.url,
    filename: img.filename,
    altText: img.altText,
  }))}
  columns={3}
/>
```

---

## Integration Points

The ImageUpload component is used across the following pages:

| Page | Entity Type | Mode | Purpose |
|------|-------------|------|---------|
| `pages/Profile.tsx` | `user_avatar` | Compact | User profile photo |
| `pages/artist/ProfileSetup.tsx` | `artist_profile`, `artist_portfolio` | Compact + Full | Artist photo and portfolio |
| `pages/organizer/OrganizerSetup.tsx` | `organizer_logo` | Compact | Organizer logo |
| `pages/venue/VenueProfileSetup.tsx` | `venue_cover`, `venue_gallery` | Compact + Full | Venue cover and gallery |
| `pages/venue/VenueProfile.tsx` | `venue_cover`, `venue_gallery` | Compact + Full | Venue photo management |

---

## Storage Architecture

### How Images Are Stored

1. Client sends image data to `POST /api/media/upload` (multipart) or `POST /api/media/url` (JSON)
2. Server converts the file buffer to a base64 data URL: `data:<mimeType>;base64,<encoded>`
3. The full data URL string is stored in the `media.data` text column
4. List endpoints strip the `data` field and return a `url` field: `/api/media/:id/file`
5. The serve endpoint (`GET /api/media/:id/file`) decodes the base64 and sends raw binary

### Design Tradeoffs

**Advantages**:
- Zero external dependencies (no S3, Cloudinary, etc.)
- Simple deployment -- just a database
- Atomic with other data (transactions include media)

**Limitations**:
- Database size grows with media uploads
- Not suitable for very large files or high-volume image hosting
- No CDN or edge caching (24-hour `Cache-Control` only)

**Future considerations**: For production at scale, migrate the `data` column to external object storage (S3/Cloudinary) and store only the URL reference.

---

**Last Updated**: April 3, 2026
