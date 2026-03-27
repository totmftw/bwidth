import { db } from "../db";
import { artists, artistCategoryHistory, users } from "../../shared/schema";
import { eq } from "drizzle-orm";

export class ArtistCategoryService {
  /**
   * Evaluates the artist's profile and suggests a category.
   * budding: early-stage, low-fee, limited bookings
   * mid_scale: established local/regional talent
   * international: premium/high-value talent
   */
  async suggestCategory(artistId: number): Promise<string> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, artistId));
    if (!artist) throw new Error("Artist not found");

    const feeMin = Number(artist.priceFrom || 0);
    const feeMax = Number(artist.priceTo || 0);

    // Simple rule-based suggestion
    if (feeMax > 500000 || feeMin > 100000) {
      return "international";
    } else if (feeMax > 50000 || feeMin > 10000) {
      return "mid_scale";
    } else {
      return "budding";
    }
  }

  /**
   * Saves or overrides the category for an artist.
   */
  async saveCategory(
    artistId: number,
    newCategory: "budding" | "mid_scale" | "international" | "custom",
    source: "auto" | "manual" | "override",
    changedByUserId?: number,
    reason?: string,
    lockCategory: boolean = false
  ) {
    const [artist] = await db.select().from(artists).where(eq(artists.id, artistId));
    if (!artist) throw new Error("Artist not found");

    if (artist.artistCategoryLocked && source === "auto") {
      // Do not auto-update if locked
      return artist;
    }

    const oldCategory = artist.artistCategory;
    
    // Calculate valid dates
    const now = new Date();
    const validTo = new Date();
    validTo.setDate(now.getDate() + 90); // 90 days review cycle

    const [updatedArtist] = await db.update(artists)
      .set({
        artistCategory: newCategory,
        artistCategorySource: source,
        artistCategoryAssignedAt: now,
        artistCategoryAssignedBy: changedByUserId || null,
        artistCategoryLocked: lockCategory,
        artistCategoryNotes: reason,
        categoryValidFrom: now,
        categoryValidTo: validTo,
      })
      .where(eq(artists.id, artistId))
      .returning();

    // Log history
    if (oldCategory !== newCategory) {
      await db.insert(artistCategoryHistory).values({
        artistId,
        oldCategory,
        newCategory,
        reason: reason || `Changed via ${source}`,
        changedBy: changedByUserId || null,
        changedAt: now,
      });
    }

    return updatedArtist;
  }
}

export const artistCategoryService = new ArtistCategoryService();
