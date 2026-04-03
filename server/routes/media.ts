import { Router } from "express";
import multer from "multer";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// ---------------------------------------------------------------------------
// Multer config: memory storage, 20 MB limit per file
// ---------------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ALLOWED_IMAGE_MIMETYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const ENTITY_IMAGE_LIMITS: Record<string, number> = {
  user_avatar: 1,
  artist_profile: 1,
  artist_portfolio: 20,
  venue_cover: 1,
  venue_gallery: 20,
  organizer_logo: 1,
  event_cover: 3,
};

const DEFAULT_IMAGE_LIMIT = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip the `data` field from a media record and replace it with a
 * serveable URL. This avoids sending potentially megabytes of base64 to
 * the client in list/create responses.
 */
function toPublicRecord(record: any): any {
  const { data, ...rest } = record;
  return { ...rest, url: `/api/media/${record.id}/file` };
}

// ---------------------------------------------------------------------------
// POST /api/media/upload — Upload images from device (multipart form-data)
// ---------------------------------------------------------------------------
router.post(
  "/media/upload",
  upload.array("images", 20),
  async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const user = req.user as any;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files provided" });
      }

      const entityType: string | undefined = req.body.entityType;
      const entityId: number | undefined = req.body.entityId
        ? Number(req.body.entityId)
        : undefined;
      const altText: string | undefined = req.body.altText;

      // Validate every file is an allowed image mimetype
      for (const file of files) {
        if (!ALLOWED_IMAGE_MIMETYPES.has(file.mimetype)) {
          return res.status(400).json({
            message: `File "${file.originalname}" has unsupported type "${file.mimetype}". Allowed: ${Array.from(ALLOWED_IMAGE_MIMETYPES).join(", ")}`,
          });
        }
      }

      // Enforce per-entity limits when entityType + entityId are provided
      if (entityType && entityId) {
        const maxAllowed =
          ENTITY_IMAGE_LIMITS[entityType] ?? DEFAULT_IMAGE_LIMIT;
        const existingCount = await storage.getMediaCountByEntity(
          entityType,
          entityId,
        );
        if (existingCount + files.length > maxAllowed) {
          return res.status(400).json({
            message: `Entity "${entityType}" allows a maximum of ${maxAllowed} image(s). Currently ${existingCount} exist; cannot add ${files.length} more.`,
          });
        }
      }

      const created: any[] = [];

      for (const file of files) {
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

        const record = await storage.createMedia({
          ownerUserId: user.id,
          entityType: entityType ?? null,
          entityId: entityId ?? null,
          mediaType: "image",
          filename: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          data: base64,
          altText: altText ?? null,
          metadata: {},
        });

        created.push(toPublicRecord(record));
      }

      res.status(201).json(created);
    } catch (error) {
      console.error("Error uploading media:", error);
      res.status(500).json({ message: "Failed to upload media" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/media/url — Upload image from URL
// ---------------------------------------------------------------------------
const urlUploadSchema = z.object({
  url: z.string().url(),
  entityType: z.string(),
  entityId: z.number(),
  altText: z.string().optional(),
});

router.post("/media/url", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);

  try {
    const user = req.user as any;
    const parsed = urlUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.errors,
      });
    }

    const { url, entityType, entityId, altText } = parsed.data;

    // Enforce per-entity limits
    const maxAllowed =
      ENTITY_IMAGE_LIMITS[entityType] ?? DEFAULT_IMAGE_LIMIT;
    const existingCount = await storage.getMediaCountByEntity(
      entityType,
      entityId,
    );
    if (existingCount + 1 > maxAllowed) {
      return res.status(400).json({
        message: `Entity "${entityType}" allows a maximum of ${maxAllowed} image(s). Currently ${existingCount} exist; cannot add another.`,
      });
    }

    // Attempt to fetch the image with a 10-second timeout and 20 MB cap
    let fetchedBuffer: Buffer | null = null;
    let fetchedMimeType: string | null = null;
    let isImageResponse = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "BANDWIDTH-Media-Fetcher/1.0" },
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type") ?? "";
      const contentLength = response.headers.get("content-length");

      // Reject if content-length exceeds 20 MB
      if (contentLength && Number(contentLength) > 20 * 1024 * 1024) {
        throw new Error("Response too large");
      }

      if (contentType.startsWith("image/")) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 20 * 1024 * 1024) {
          throw new Error("Response too large");
        }
        fetchedBuffer = Buffer.from(arrayBuffer);
        fetchedMimeType = contentType.split(";")[0].trim();
        isImageResponse = true;
      }
    } catch {
      // Fetch failed or not an image — fall through to URL-only storage
    }

    if (isImageResponse && fetchedBuffer && fetchedMimeType) {
      // Store image data as base64
      const base64 = `data:${fetchedMimeType};base64,${fetchedBuffer.toString("base64")}`;
      const filename = url.split("/").pop()?.split("?")[0] || "image";

      const record = await storage.createMedia({
        ownerUserId: user.id,
        entityType,
        entityId,
        mediaType: "image",
        filename,
        mimeType: fetchedMimeType,
        fileSize: fetchedBuffer.length,
        data: base64,
        sourceUrl: url,
        altText: altText ?? null,
        metadata: {},
      });

      return res.status(201).json(toPublicRecord(record));
    }

    // URL-only fallback: store the URL without fetching image data
    const record = await storage.createMedia({
      ownerUserId: user.id,
      entityType,
      entityId,
      mediaType: "image",
      filename: url.split("/").pop()?.split("?")[0] || "image",
      mimeType: null,
      fileSize: null,
      data: url,
      sourceUrl: url,
      altText: altText ?? null,
      metadata: { urlOnly: true },
    });

    return res.status(201).json(toPublicRecord(record));
  } catch (error) {
    console.error("Error uploading media from URL:", error);
    res.status(500).json({ message: "Failed to upload media from URL" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/media/:id/file — Serve image binary (or redirect for external URL)
// ---------------------------------------------------------------------------
router.get("/media/:id/file", async (req, res) => {
  try {
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const record = await storage.getMediaById(id);
    if (!record || !record.data) {
      return res.status(404).json({ message: "Media not found" });
    }

    // Base64 data URL
    if (record.data.startsWith("data:")) {
      const match = record.data.match(
        /^data:([^;]+);base64,([\s\S]+)$/,
      );
      if (!match) {
        return res.status(500).json({ message: "Corrupt media data" });
      }

      const mimeType = match[1];
      const base64Payload = match[2];
      const buffer = Buffer.from(base64Payload, "base64");

      res.set("Content-Type", mimeType);
      res.set("Content-Length", String(buffer.length));
      res.set("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    }

    // External URL — redirect
    return res.redirect(302, record.data);
  } catch (error) {
    console.error("Error serving media file:", error);
    res.status(500).json({ message: "Failed to serve media file" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/media/entity/:entityType/:entityId — List images for an entity
// ---------------------------------------------------------------------------
router.get("/media/entity/:entityType/:entityId", async (req, res) => {
  try {
    const entityType = Array.isArray(req.params.entityType)
      ? req.params.entityType[0]
      : req.params.entityType;
    const entityIdParam = Array.isArray(req.params.entityId)
      ? req.params.entityId[0]
      : req.params.entityId;
    const entityId = parseInt(entityIdParam);

    if (isNaN(entityId)) {
      return res.status(400).json({ message: "Invalid entity ID format" });
    }

    const records = await storage.getMediaByEntity(entityType, entityId);
    const publicRecords = records.map(toPublicRecord);

    res.json(publicRecords);
  } catch (error) {
    console.error("Error listing media for entity:", error);
    res.status(500).json({ message: "Failed to list media" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/media/:id — Delete a media record (owner or admin only)
// ---------------------------------------------------------------------------
router.delete("/media/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);

  try {
    const user = req.user as any;
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const record = await storage.getMediaById(id);
    if (!record) {
      return res.status(404).json({ message: "Media not found" });
    }

    const userRole = user.role || (user.metadata as any)?.role;
    const isAdmin =
      userRole === "admin" || userRole === "platform_admin";

    if (record.ownerUserId !== user.id && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this media" });
    }

    await storage.deleteMedia(id);
    res.status(200).json({ message: "Media deleted" });
  } catch (error) {
    console.error("Error deleting media:", error);
    res.status(500).json({ message: "Failed to delete media" });
  }
});

export default router;
